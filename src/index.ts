import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CybozuHandler } from "./cybozu-handler";
import { Props } from "./types";
import { registerTools } from "./tools";

export class MyMCP extends McpAgent<Env, {}, Props> {
  server = new McpServer({
    name: "kintone MCP Server",
    version: "1.0.0",
  });

  async init() {
    // Debug: Log subdomain and user info
    console.error("=== MCP Init Debug Info ===");
    console.error("Access Token:", this.props.accessToken);
    console.error("Subdomain:", this.props.subdomain);
    console.error("User Login:", this.props.login);
    console.error("User Name:", this.props.name);
    console.error("=========================");

    // Register all tools
    registerTools(this.server, this.props);
  }
}

export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: MyMCP.mount("/sse") as any,
  defaultHandler: CybozuHandler as any,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
