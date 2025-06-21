// workers-oauth-utils.ts

import type { ClientInfo, AuthRequest } from "@cloudflare/workers-oauth-provider"; // 必要に応じてパスを調整

const COOKIE_NAME = "mcp-approved-clients";
const ONE_YEAR_IN_SECONDS = 31536000;

// --- ヘルパー関数 ---

/**
 * 任意のデータをURLセーフなbase64文字列にエンコードします。
 * @param data - エンコードするデータ（文字列化されます）
 * @returns URLセーフなbase64エンコード文字列
 */
function encodeState(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    // シンプルにするためbtoaを使用、Worker環境が十分にサポートしていることを前提
    // 複雑なバイナリデータの場合、Buffer/Uint8Arrayアプローチの方が良いかもしれません
    return btoa(jsonString);
  } catch (e) {
    console.error("Error encoding state:", e);
    throw new Error("Could not encode state");
  }
}

/**
 * URLセーフなbase64文字列を元のデータにデコードします。
 * @param encoded - URLセーフなbase64エンコード文字列
 * @returns 元のデータ
 */
function decodeState<T = any>(encoded: string): T {
  try {
    const jsonString = atob(encoded);
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Error decoding state:", e);
    throw new Error("Could not decode state");
  }
}

/**
 * HMAC-SHA256署名用の秘密鍵文字列をインポートします。
 * @param secret - 生の秘密鍵文字列
 * @returns CryptoKeyオブジェクトに解決されるPromise
 */
async function importKey(secret: string): Promise<CryptoKey> {
  if (!secret) {
    throw new Error("COOKIE_SECRET is not defined. A secret key is required for signing cookies.");
  }
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, // 抽出不可
    ["sign", "verify"], // 鍵の使用用途
  );
}

/**
 * HMAC-SHA256を使用してデータを署名します。
 * @param key - 署名用のCryptoKey
 * @param data - 署名する文字列データ
 * @returns 16進文字列としての署名に解決されるPromise
 */
async function signData(key: CryptoKey, data: string): Promise<string> {
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  // ArrayBufferを16進文字列に変換
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * HMAC-SHA256署名を検証します。
 * @param key - 検証用のCryptoKey
 * @param signatureHex - 検証する署名（16進文字列）
 * @param data - 署名された元のデータ
 * @returns 署名が有効な場合はtrue、そうでない場合はfalseに解決されるPromise
 */
async function verifySignature(key: CryptoKey, signatureHex: string, data: string): Promise<boolean> {
  const enc = new TextEncoder();
  try {
    // 16進署名をArrayBufferに戻す
    const signatureBytes = new Uint8Array(signatureHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    return await crypto.subtle.verify("HMAC", key, signatureBytes.buffer, enc.encode(data));
  } catch (e) {
    // 16進解析または検証中のエラーを処理
    console.error("Error verifying signature:", e);
    return false;
  }
}

/**
 * 署名されたクッキーを解析し、その整合性を検証します。
 * @param cookieHeader - リクエストからのCookieヘッダーの値
 * @param secret - 署名に使用される秘密鍵
 * @returns クッキーが有効な場合は承認されたクライアントIDのリスト、そうでない場合はnullに解決されるPromise
 */
async function getApprovedClientsFromCookie(cookieHeader: string | null, secret: string): Promise<string[] | null> {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const targetCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!targetCookie) return null;

  const cookieValue = targetCookie.substring(COOKIE_NAME.length + 1);
  const parts = cookieValue.split(".");

  if (parts.length !== 2) {
    console.warn("Invalid cookie format received.");
    return null; // 無効なフォーマット
  }

  const [signatureHex, base64Payload] = parts;
  const payload = atob(base64Payload); // ペイロードがbase64エンコードされたJSON文字列であることを前提

  const key = await importKey(secret);
  const isValid = await verifySignature(key, signatureHex, payload);

  if (!isValid) {
    console.warn("Cookie signature verification failed.");
    return null; // 署名が無効
  }

  try {
    const approvedClients = JSON.parse(payload);
    if (!Array.isArray(approvedClients)) {
      console.warn("Cookie payload is not an array.");
      return null; // ペイロードが配列ではない
    }
    // すべての要素が文字列であることを確認
    if (!approvedClients.every((item) => typeof item === "string")) {
      console.warn("Cookie payload contains non-string elements.");
      return null;
    }
    return approvedClients as string[];
  } catch (e) {
    console.error("Error parsing cookie payload:", e);
    return null; // JSON解析に失敗
  }
}

// --- エクスポートされた関数 ---

/**
 * 署名されたクッキーに基づいて、指定されたクライアントIDがすでにユーザーによって
 * 承認されているかどうかをチェックします。
 *
 * @param request - クッキーを読み取るための入力Requestオブジェクト
 * @param clientId - 承認をチェックするOAuthクライアントID
 * @param cookieSecret - 承認クッキーの署名/検証に使用される秘密鍵
 * @returns クライアントIDが有効なクッキーの承認されたクライアントのリストにある場合はtrue、そうでない場合はfalseに解決されるPromise
 */
export async function clientIdAlreadyApproved(request: Request, clientId: string, cookieSecret: string): Promise<boolean> {
  if (!clientId) return false;
  const cookieHeader = request.headers.get("Cookie");
  const approvedClients = await getApprovedClientsFromCookie(cookieHeader, cookieSecret);

  return approvedClients?.includes(clientId) ?? false;
}

/**
 * 承認ダイアログの設定
 */
export interface ApprovalDialogOptions {
  /**
   * 承認ダイアログに表示するクライアント情報
   */
  client: ClientInfo | null;
  /**
   * 承認ダイアログに表示するサーバー情報
   */
  server: {
    name: string;
    logo?: string;
    description?: string;
  };
  /**
   * 承認フローを通じて渡される任意の状態データ
   * フォームにエンコードされ、承認が完了したときに返されます
   */
  state: Record<string, any>;
  /**
   * 承認の保存に使用するクッキーの名前
   * @default "mcp_approved_clients"
   */
  cookieName?: string;
  /**
   * 検証用のクッキー署名に使用される秘密鍵
   * 文字列またはUint8Arrayを指定可能
   * @default ビルトインUint8Arrayキー
   */
  cookieSecret?: string | Uint8Array;
  /**
   * Cookieドメイン
   * @default 現在のドメイン
   */
  cookieDomain?: string;
  /**
   * Cookieパス
   * @default "/"
   */
  cookiePath?: string;
  /**
   * Cookieの最大年齢（秒単位）
   * @default 30日
   */
  cookieMaxAge?: number;
}

/**
 * OAuth認証用の承認ダイアログをレンダリングします
 * ダイアログはクライアントとサーバーの情報を表示し、
 * 承認を送信するためのフォームを含みます
 *
 * @param request - HTTPリクエスト
 * @param options - 承認ダイアログの設定
 * @returns HTML承認ダイアログを含むResponse
 */
export function renderApprovalDialog(request: Request, options: ApprovalDialogOptions): Response {
  const { client, server, state } = options;

  // フォーム送信用に状態をエンコード
  const encodedState = btoa(JSON.stringify(state));

  // 信頼できないコンテンツをサニタイズ
  const serverName = sanitizeHtml(server.name);
  const clientName = client?.clientName ? sanitizeHtml(client.clientName) : "Unknown MCP Client";
  const serverDescription = server.description ? sanitizeHtml(server.description) : "";

  // 安全なURL
  const logoUrl = server.logo ? sanitizeHtml(server.logo) : "";
  const clientUri = client?.clientUri ? sanitizeHtml(client.clientUri) : "";
  const policyUri = client?.policyUri ? sanitizeHtml(client.policyUri) : "";
  const tosUri = client?.tosUri ? sanitizeHtml(client.tosUri) : "";

  // クライアントの連絡先
  const contacts = client?.contacts && client.contacts.length > 0 ? sanitizeHtml(client.contacts.join(", ")) : "";

  // リダイレクトURIを取得
  const redirectUris = client?.redirectUris && client.redirectUris.length > 0 ? client.redirectUris.map((uri) => sanitizeHtml(uri)) : [];

  // 承認ダイアログ用のHTMLを生成
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${clientName} | Authorization Request</title>
        <style>
          /* システムフォントを使用したモダンでレスポンシブなスタイリング */
          :root {
            --primary-color: #0070f3;
            --error-color: #f44336;
            --border-color: #e5e7eb;
            --text-color: #333;
            --background-color: #fff;
            --card-shadow: 0 8px 36px 8px rgba(0, 0, 0, 0.1);
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
                         Helvetica, Arial, sans-serif, "Apple Color Emoji", 
                         "Segoe UI Emoji", "Segoe UI Symbol";
            line-height: 1.6;
            color: var(--text-color);
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
          }
          
          .container {
            max-width: 600px;
            margin: 2rem auto;
            padding: 1rem;
          }
          
          .precard {
            padding: 2rem;
            text-align: center;
          }
          
          .card {
            background-color: var(--background-color);
            border-radius: 8px;
            box-shadow: var(--card-shadow);
            padding: 2rem;
          }
          
          .header {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
          }
          
          .logo {
            width: 48px;
            height: 48px;
            margin-right: 1rem;
            border-radius: 8px;
            object-fit: contain;
          }
          
          .title {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 400;
          }
          
          .alert {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 400;
            margin: 1rem 0;
            text-align: center;
          }
          
          .description {
            color: #555;
          }
          
          .client-info {
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 1rem 1rem 0.5rem;
            margin-bottom: 1.5rem;
          }
          
          .client-name {
            font-weight: 600;
            font-size: 1.2rem;
            margin: 0 0 0.5rem 0;
          }
          
          .client-detail {
            display: flex;
            margin-bottom: 0.5rem;
            align-items: baseline;
          }
          
          .detail-label {
            font-weight: 500;
            min-width: 120px;
          }
          
          .detail-value {
            font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            word-break: break-all;
          }
          
          .detail-value a {
            color: inherit;
            text-decoration: underline;
          }
          
          .detail-value.small {
            font-size: 0.8em;
          }
          
          .external-link-icon {
            font-size: 0.75em;
            margin-left: 0.25rem;
            vertical-align: super;
          }
          
          .actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 2rem;
          }
          
          .button {
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            border: none;
            font-size: 1rem;
          }
          
          .button-primary {
            background-color: var(--primary-color);
            color: white;
          }
          
          .button-secondary {
            background-color: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-color);
          }
          
          /* レスポンシブ調整 */
          @media (max-width: 640px) {
            .container {
              margin: 1rem auto;
              padding: 0.5rem;
            }
            
            .card {
              padding: 1.5rem;
            }
            
            .client-detail {
              flex-direction: column;
            }
            
            .detail-label {
              min-width: unset;
              margin-bottom: 0.25rem;
            }
            
            .actions {
              flex-direction: column;
            }
            
            .button {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="precard">
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="${serverName} Logo" class="logo">` : ""}
            <h1 class="title"><strong>${serverName}</strong></h1>
            </div>
            
            ${serverDescription ? `<p class="description">${serverDescription}</p>` : ""}
          </div>
            
          <div class="card">
            
            <h2 class="alert"><strong>${clientName || "A new MCP Client"}</strong> is requesting access</h1>
            
            <div class="client-info">
              <div class="client-detail">
                <div class="detail-label">Name:</div>
                <div class="detail-value">
                  ${clientName}
                </div>
              </div>
              
              ${
                clientUri
                  ? `
                <div class="client-detail">
                  <div class="detail-label">Website:</div>
                  <div class="detail-value small">
                    <a href="${clientUri}" target="_blank" rel="noopener noreferrer">
                      ${clientUri}
                    </a>
                  </div>
                </div>
              `
                  : ""
              }
              
              ${
                policyUri
                  ? `
                <div class="client-detail">
                  <div class="detail-label">Privacy Policy:</div>
                  <div class="detail-value">
                    <a href="${policyUri}" target="_blank" rel="noopener noreferrer">
                      ${policyUri}
                    </a>
                  </div>
                </div>
              `
                  : ""
              }
              
              ${
                tosUri
                  ? `
                <div class="client-detail">
                  <div class="detail-label">Terms of Service:</div>
                  <div class="detail-value">
                    <a href="${tosUri}" target="_blank" rel="noopener noreferrer">
                      ${tosUri}
                    </a>
                  </div>
                </div>
              `
                  : ""
              }
              
              ${
                redirectUris.length > 0
                  ? `
                <div class="client-detail">
                  <div class="detail-label">Redirect URIs:</div>
                  <div class="detail-value small">
                    ${redirectUris.map((uri) => `<div>${uri}</div>`).join("")}
                  </div>
                </div>
              `
                  : ""
              }
              
              ${
                contacts
                  ? `
                <div class="client-detail">
                  <div class="detail-label">Contact:</div>
                  <div class="detail-value">${contacts}</div>
                </div>
              `
                  : ""
              }
            </div>
            
            <p>This MCP Client is requesting to be authorized on ${serverName}. If you approve, you will be redirected to complete authentication.</p>
            
            <form method="post" action="${new URL(request.url).pathname}">
              <input type="hidden" name="state" value="${encodedState}">
              
              <div class="actions">
                <button type="button" class="button button-secondary" onclick="window.history.back()">Cancel</button>
                <button type="submit" class="button button-primary">Approve</button>
              </div>
            </form>
          </div>
        </div>
      </body>
    </html>
  `;

  return new Response(htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

/**
 * 承認フォーム送信の解析結果。
 */
export interface ParsedApprovalResult {
  /** フォームを通じて渡された元の状態オブジェクト。 */
  state: any;
  /** Set-Cookieヘッダーを含む、リダイレクトレスポンスに設定するヘッダー。 */
  headers: Record<string, string>;
}

/**
 * 承認ダイアログからのフォーム送信を解析し、状態を抽出し、
 * クライアントを承認済みとしてマークするためのSet-Cookieヘッダーを生成します。
 *
 * @param request - フォームデータを含む入力POST Requestオブジェクト
 * @param cookieSecret - 承認クッキーの署名に使用される秘密鍵
 * @returns 解析された状態と必要なヘッダーを含むオブジェクトに解決されるPromise
 * @throws リクエストメソッドがPOSTでない、フォームデータが無効、または状態が欠落している場合
 */
export async function parseRedirectApproval(request: Request, cookieSecret: string): Promise<ParsedApprovalResult> {
  if (request.method !== "POST") {
    throw new Error("Invalid request method. Expected POST.");
  }

  let state: any;
  let clientId: string | undefined;

  try {
    const formData = await request.formData();
    const encodedState = formData.get("state");

    if (typeof encodedState !== "string" || !encodedState) {
      throw new Error("Missing or invalid 'state' in form data.");
    }

    state = decodeState<{ oauthReqInfo?: AuthRequest }>(encodedState); // 状態をデコード
    clientId = state?.oauthReqInfo?.clientId; // 状態内からclientIdを抽出

    if (!clientId) {
      throw new Error("Could not extract clientId from state object.");
    }
  } catch (e) {
    console.error("Error processing form submission:", e);
    // 適切に再スローまたは処理、特定のエラーレスポンスを返すことも可能
    throw new Error(`Failed to parse approval form: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 既存の承認されたクライアントを取得
  const cookieHeader = request.headers.get("Cookie");
  const existingApprovedClients = (await getApprovedClientsFromCookie(cookieHeader, cookieSecret)) || [];

  // 新しく承認されたクライアントIDを追加（重複を避ける）
  const updatedApprovedClients = Array.from(new Set([...existingApprovedClients, clientId]));

  // 更新されたリストを署名
  const payload = JSON.stringify(updatedApprovedClients);
  const key = await importKey(cookieSecret);
  const signature = await signData(key, payload);
  const newCookieValue = `${signature}.${btoa(payload)}`; // 署名.base64(ペイロード)

  // Set-Cookieヘッダーを生成
  const headers: Record<string, string> = {
    "Set-Cookie": `${COOKIE_NAME}=${newCookieValue}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${ONE_YEAR_IN_SECONDS}`,
  };

  return { state, headers };
}

/**
 * XSS攻撃を防ぐためにHTMLコンテンツをサニタイズします
 * @param unsafe - HTMLを含む可能性のある安全でない文字列
 * @returns HTML特殊文字がエスケープされた安全な文字列
 */
function sanitizeHtml(unsafe: string): string {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
