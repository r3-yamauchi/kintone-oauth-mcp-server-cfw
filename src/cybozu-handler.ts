import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { fetchUpstreamAuthToken, getUpstreamAuthorizeUrl, Props } from "./utils";
import { env } from "cloudflare:workers";
import { clientIdAlreadyApproved, parseRedirectApproval, renderApprovalDialog } from "./workers-oauth-utils";

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

app.get("/authorize", async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
  console.error("=== Authorize Request Received ===");
  console.error("oauthReqInfo:", JSON.stringify(oauthReqInfo, null, 2));
  console.error("Request URL:", c.req.url);
  
  const { clientId } = oauthReqInfo;
  if (!clientId) {
    return c.text("Invalid request", 400);
  }
  
  // クライアント情報を取得してログ出力
  const client = await c.env.OAUTH_PROVIDER.lookupClient(clientId);
  console.error("Client Info:", JSON.stringify(client, null, 2));
  console.error("==================================");

  if (await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, env.COOKIE_ENCRYPTION_KEY)) {
    return redirectToCybozu(c.req.raw, oauthReqInfo);
  }

  return renderApprovalDialog(c.req.raw, {
    client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
    server: {
      name: "Cloudflare kintone MCP Server", // cSpell:ignore kintone
      logo: "https://cybozu.co.jp/img/icons/favicon.ico",
      description: "This is a MCP Remote Server using Cybozu/kintone for authentication.", // optional // cSpell:ignore kintone
    },
    state: { oauthReqInfo }, // arbitrary data that flows through the form submission below
  });
});

app.post("/authorize", async (c) => {
  // Validates form submission, extracts state, and generates Set-Cookie headers to skip approval dialog next time
  const { state, headers } = await parseRedirectApproval(c.req.raw, env.COOKIE_ENCRYPTION_KEY);
  if (!state.oauthReqInfo) {
    return c.text("Invalid request", 400);
  }

  return redirectToCybozu(c.req.raw, state.oauthReqInfo, headers);
});

async function redirectToCybozu(request: Request, oauthReqInfo: AuthRequest, headers: Record<string, string> = {}) {
  // Cybozu OAuth用のリダイレクトURIを環境に応じて設定（localhostでもHTTPS使用）
  const url = new URL(request.url);
  const cybozuRedirectUri = url.hostname === 'localhost' 
    ? `https://localhost:${url.port}/callback`
    : `https://${env.WORKER_URL}/callback`;
  
  console.error("=== Authorization Request Debug ===");
  console.error("Request URL:", request.url);
  console.error("MCP Client Redirect URI:", oauthReqInfo.redirectUri);
  console.error("Cybozu OAuth Redirect URI:", cybozuRedirectUri);
  console.error("Client ID:", env.CYBOZU_CLIENT_ID);
  console.error("Subdomain:", env.CYBOZU_SUBDOMAIN);
  console.error("==================================");
  
  return new Response(null, {
    status: 302,
    headers: {
      ...headers,
      location: getUpstreamAuthorizeUrl({
        upstream_url: `https://${env.CYBOZU_SUBDOMAIN}.cybozu.com/oauth2/authorization`,
        scope: "k:app_record:read k:app_record:write k:app_settings:read k:app_settings:write k:file:read k:file:write", // 半角スペース区切り
        client_id: env.CYBOZU_CLIENT_ID,
        redirect_uri: cybozuRedirectUri,
        state: btoa(JSON.stringify(oauthReqInfo)), // oauthReqInfoをそのまま保存（余計なフィールドを追加しない）
      }),
    },
  });
}

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Cybozu after user authentication.
 * It exchanges the temporary code for an access token, then stores some
 * user metadata & the auth token as part of the 'props' on the token passed
 * down to the client. It ends by redirecting the client back to _its_ callback URL
 */
app.get("/callback", async (c) => {
  try {
    // Log callback parameters
    console.error("\n=== OAuth Callback Received ===");
    console.error("Query params:", Object.fromEntries(new URL(c.req.url).searchParams));
    
    // Check for OAuth errors
    const error = c.req.query("error");
    if (error) {
      const errorDescription = c.req.query("error_description");
      console.error("OAuth Error:", error, errorDescription);
      return c.html(`
        <h1>Authentication Error</h1>
        <p>Error: ${error}</p>
        <p>Description: ${errorDescription}</p>
        <p><a href="/">Try again</a></p>
      `, 400);
    }
    
    // Check for authorization code
    const code = c.req.query("code");
    if (!code) {
      console.error("Missing authorization code");
      return c.text("Missing authorization code", 400);
    }
    
    // Get the oathReqInfo out of KV
    const stateParam = c.req.query("state");
    if (!stateParam) {
      console.error("Missing state parameter");
      return c.text("Missing state parameter", 400);
    }
    
    console.error("State param:", stateParam);
    let oauthReqInfo: AuthRequest;
    try {
      oauthReqInfo = JSON.parse(atob(stateParam as string)) as AuthRequest;
    } catch (e) {
      console.error("Failed to parse state:", e);
      return c.text("Invalid state parameter", 400);
    }
    
    if (!oauthReqInfo.clientId) {
      console.error("Missing clientId in oauthReqInfo");
      return c.text("Invalid state", 400);
    }

    // Cybozu OAuth用のリダイレクトURIを環境に応じて設定
    const url = new URL(c.req.url);
    const cybozuRedirectUri = url.hostname === 'localhost' 
      ? `https://localhost:${url.port}/callback`
      : `https://${c.env.WORKER_URL}/callback`;
  
    // Exchange the code for an access token
    console.error("=== OAuth Token Exchange Debug ===");
    console.error("Token URL:", `https://${c.env.CYBOZU_SUBDOMAIN}.cybozu.com/oauth2/token`);
    console.error("Client ID:", c.env.CYBOZU_CLIENT_ID);
    console.error("Client Secret (masked):", c.env.CYBOZU_CLIENT_SECRET.substring(0, 10) + "...");
    console.error("Code:", code);
    console.error("Cybozu Redirect URI:", cybozuRedirectUri);
    console.error("MCP Client Redirect URI:", oauthReqInfo.redirectUri);
    console.error("================================");
    
    const [accessToken, errResponse] = await fetchUpstreamAuthToken({
      upstream_url: `https://${c.env.CYBOZU_SUBDOMAIN}.cybozu.com/oauth2/token`,
      client_id: c.env.CYBOZU_CLIENT_ID,
      client_secret: c.env.CYBOZU_CLIENT_SECRET,
      code: code,
      redirect_uri: cybozuRedirectUri,
    });
    
    console.error("=== Token Response Debug ===");
    console.error("Access Token:", accessToken);
    if (errResponse) {
      console.error("Error Response Status:", errResponse.status);
      console.error("Error Response Text:", await errResponse.clone().text());
    }
    console.error("===========================");
    
    if (errResponse) return errResponse;

    // Fetch the user info from Cybozu
    // Note: Cybozu OAuth doesn't provide user info endpoint by default
    // You might need to use kintone APIs to get user info if needed // cSpell:ignore kintone
    const userId = "Administrator"; // Placeholder - you'd implement actual user fetching
    const userName = "Administrator";
    const userEmail = "user@example.com";

    // Return back to the MCP client a new token
    console.error("=== CompleteAuthorization Debug ===");
    console.error("oauthReqInfo:", JSON.stringify(oauthReqInfo, null, 2));
    console.error("userId:", userId);
    console.error("accessToken length:", accessToken?.length);
    console.error("===================================");
    
    let redirectTo;
    try {
      const result = await c.env.OAUTH_PROVIDER.completeAuthorization({
        request: oauthReqInfo,
        userId: userId,
        metadata: {
          label: userName,
        },
        scope: oauthReqInfo.scope,
        // This will be available on this.props inside MyMCP
        props: {
          login: userId,
          name: userName,
          email: userEmail,
          accessToken,
          subdomain: c.env.CYBOZU_SUBDOMAIN,
        } as Props,
      });
      redirectTo = result.redirectTo;
      console.error("CompleteAuthorization successful, redirectTo:", redirectTo);
    } catch (completeError) {
      console.error("CompleteAuthorization failed:", completeError);
      console.error("Error details:", completeError instanceof Error ? completeError.message : completeError);
      throw completeError;
    }

    return Response.redirect(redirectTo);
  } catch (error) {
    console.error("=== Callback Error ===");
    console.error("Error:", error);
    console.error("Stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("====================");
    return c.text("Internal Server Error", 500);
  }
});

export { app as CybozuHandler };
