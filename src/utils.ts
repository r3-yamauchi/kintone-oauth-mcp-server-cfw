/**
 * Constructs an authorization URL for an upstream service.
 *
 * @param {Object} options
 * @param {string} options.upstream_url - The base URL of the upstream service.
 * @param {string} options.client_id - The client ID of the application.
 * @param {string} options.redirect_uri - The redirect URI of the application.
 * @param {string} [options.state] - The state parameter.
 *
 * @returns {string} The authorization URL.
 */
export function getUpstreamAuthorizeUrl({
  upstream_url,
  client_id,
  scope,
  redirect_uri,
  state,
}: {
  upstream_url: string;
  client_id: string;
  scope: string;
  redirect_uri: string;
  state?: string;
}) {
  const upstream = new URL(upstream_url);
  upstream.searchParams.set("client_id", client_id);
  upstream.searchParams.set("redirect_uri", redirect_uri);
  upstream.searchParams.set("scope", scope);
  if (state) upstream.searchParams.set("state", state);
  upstream.searchParams.set("response_type", "code");
  return upstream.href;
}

/**
 * Fetches an authorization token from an upstream service.
 *
 * @param {Object} options
 * @param {string} options.client_id - The client ID of the application.
 * @param {string} options.client_secret - The client secret of the application.
 * @param {string} options.code - The authorization code.
 * @param {string} options.redirect_uri - The redirect URI of the application.
 * @param {string} options.upstream_url - The token endpoint URL of the upstream service.
 *
 * @returns {Promise<[string, null] | [null, Response]>} A promise that resolves to an array containing the access token or an error response.
 */
export async function fetchUpstreamAuthToken({
  client_id,
  client_secret,
  code,
  redirect_uri,
  upstream_url,
}: {
  code: string | undefined;
  upstream_url: string;
  client_secret: string;
  redirect_uri: string;
  client_id: string;
}): Promise<[string, null] | [null, Response]> {
  if (!code) {
    return [null, new Response("Missing code", { status: 400 })];
  }

  console.error("\n=== Starting Token Exchange ===");
  console.error("Endpoint:", upstream_url);
  console.error("Client ID:", client_id);
  console.error("Redirect URI:", redirect_uri);
  
  // Method 1: Client credentials in request body (standard OAuth2)
  console.error("\n--- Attempt 1: Credentials in Body ---");
  // Log the actual request body for debugging
  const bodyParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri,
    client_id,
    client_secret,
  });
  
  console.error("Request body params:", bodyParams.toString());
  
  const resp1 = await fetch(upstream_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: bodyParams.toString(),
  });
  
  if (resp1.ok) {
    console.error("✓ Method 1 succeeded!");
    const body = await resp1.json() as { access_token?: string };
    if (body.access_token) {
      return [body.access_token, null];
    }
  }
  
  const error1 = await resp1.text();
  console.error("✗ Method 1 failed:", resp1.status, error1);
  
  // Method 2: Basic Authentication
  console.error("\n--- Attempt 2: Basic Authentication ---");
  const basicAuth = btoa(`${client_id}:${client_secret}`);
  const resp2 = await fetch(upstream_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
    }).toString(),
  });
  
  if (resp2.ok) {
    console.error("✓ Method 2 succeeded!");
    const body = await resp2.json() as { access_token?: string };
    if (body.access_token) {
      return [body.access_token, null];
    }
  }
  
  const error2 = await resp2.text();
  console.error("✗ Method 2 failed:", resp2.status, error2);
  
  // Both methods failed - detailed error report
  console.error("\n=== ALL TOKEN EXCHANGE METHODS FAILED ===");
  console.error("\nMethod 1 (Body Parameters):");
  console.error("- Status:", resp1.status);
  console.error("- Response:", error1);
  try {
    const parsed1 = JSON.parse(error1);
    console.error("- Parsed:", parsed1);
  } catch {}
  
  console.error("\nMethod 2 (Basic Auth):");
  console.error("- Status:", resp2.status);
  console.error("- Response:", error2);
  try {
    const parsed2 = JSON.parse(error2);
    console.error("- Parsed:", parsed2);
  } catch {}
  
  console.error("\n⚠️  Cybozu OAuth設定確認事項:");
  console.error("1. リダイレクトURIが完全一致: " + redirect_uri);
  console.error("2. client_idとclient_secretが正しい");
  console.error("3. OAuthアプリが有効化されている");
  console.error("=====================================\n");
  
  return [null, new Response(`Token exchange failed: HTTP ${resp1.status}`, { status: resp1.status })];
}

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
export type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
  subdomain: string;
};
