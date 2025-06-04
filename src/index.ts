import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CybozuHandler } from "./cybozu-handler";

// Context from the auth process, encrypted & stored in the auth token
// and provided to the DurableMCP as this.props
type Props = {
  login: string;
  name: string;
  email: string;
  accessToken: string;
  subdomain: string;
};

// kintone API error response type
type KintoneErrorResponse = {
  code?: string;
  id?: string;
  message?: string;
};

const ALLOWED_USERNAMES = new Set<string>([
  // Add GitHub usernames of users who should have access to the image generation tool
  // For example: 'yourusername', 'coworkerusername'
]);

export class MyMCP extends McpAgent<Env, {}, Props> {
  server = new McpServer({
    name: "kintone MCP Server",
    version: "1.0.0",
  });

  async init() {
    // Debug: Log access token and subdomain
    console.error("=== MCP Init Debug Info ===");
    console.error("Access Token:", this.props.accessToken);
    console.error("Subdomain:", this.props.subdomain);
    console.error("User Login:", this.props.login);
    console.error("=========================");
    
    // List records from a kintone app
    this.server.tool(
      "getRecords", 
      "Get records from a kintone app", 
      { 
        appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
        query: z.string().optional().describe("Query to filter records (optional)"),
        fields: z.array(z.string()).optional().describe("Fields to retrieve (optional)")
      }, 
      async ({ appId, query, fields }) => {
        const url = `https://${this.props.subdomain}.cybozu.com/k/v1/records.json`;
        
        // Build request body for POST
        const body: any = {
          app: String(appId)
        };
        if (query) body.query = query;
        if (fields && fields.length > 0) body.fields = fields;
        
        console.error("=== getRecords Request Debug ===");
        console.error("URL:", url);
        console.error("Method: POST with X-HTTP-Method-Override: GET");
        console.error("Body:", JSON.stringify(body, null, 2));
        console.error("Access Token:", this.props.accessToken);
        console.error("==============================");
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.props.accessToken}`,
            "Content-Type": "application/json",
            "X-HTTP-Method-Override": "GET"
          },
          body: JSON.stringify(body)
        });
        
        const data = await response.json() as KintoneErrorResponse | any;
        
        if (!response.ok) {
          console.error("=== API Error Response ===");
          console.error("Status:", response.status);
          console.error("Response:", JSON.stringify(data, null, 2));
          console.error("========================");
          
          // Provide more helpful error messages
          const errorData = data as KintoneErrorResponse;
          let errorMessage = `Error ${response.status}: ${errorData.message || 'Unknown error'}`;
          return {
            content: [{ type: "text", text: errorMessage }],
          };
        }
        
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }
    );

    // Add a record to a kintone app
    this.server.tool(
      "addRecord",
      "Add a new record to a kintone app",
      {
        appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
        record: z.record(z.string(), z.any()).describe("Record data as key-value pairs")
      },
      async ({ appId, record }) => {
        const url = `https://${this.props.subdomain}.cybozu.com/k/v1/record.json`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.props.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            app: String(appId),
            record: record
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error("=== API Error Response ===");
          console.error("Status:", response.status);
          console.error("Response:", JSON.stringify(data, null, 2));
          console.error("========================");
        }
        
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }
    );

    // Get app information
    this.server.tool(
      "getApp",
      "Get kintone app information including fields",
      {
        appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
      },
      async ({ appId }) => {
        const url = `https://${this.props.subdomain}.cybozu.com/k/v1/app/form/fields.json`;
        
        const body = {
          app: String(appId)
        };
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.props.accessToken}`,
            "Content-Type": "application/json",
            "X-HTTP-Method-Override": "GET"
          },
          body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          console.error("=== API Error Response ===");
          console.error("Status:", response.status);
          console.error("Response:", JSON.stringify(data, null, 2));
          console.error("========================");
        }
        
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }
    );

    // Search apps by name
    this.server.tool(
      "searchApps",
      "Search kintone apps by name or partial name match",
      {
        name: z.string().describe("App name or partial name to search for"),
        limit: z.number().optional().describe("Maximum number of apps to return (default: 100, max: 100)"),
        offset: z.number().optional().describe("Number of apps to skip (default: 0)")
      },
      async ({ name, limit = 100, offset = 0 }) => {
        const url = `https://${this.props.subdomain}.cybozu.com/k/v1/apps.json`;
        
        // Build request body
        const body: any = {
          name: name
        };
        if (limit) body.limit = Math.min(limit, 100);
        if (offset) body.offset = offset;
        
        console.error("=== searchApps Request Debug ===");
        console.error("URL:", url);
        console.error("Method: POST with X-HTTP-Method-Override: GET");
        console.error("Body:", JSON.stringify(body, null, 2));
        console.error("===============================");
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.props.accessToken}`,
            "Content-Type": "application/json",
            "X-HTTP-Method-Override": "GET"
          },
          body: JSON.stringify(body)
        });
        
        const data = await response.json() as KintoneErrorResponse | any;
        
        if (!response.ok) {
          console.error("=== API Error Response ===");
          console.error("Status:", response.status);
          console.error("Response:", JSON.stringify(data, null, 2));
          console.error("========================");
          
          const errorData = data as KintoneErrorResponse;
          let errorMessage = `Error ${response.status}: ${errorData.message || 'Unknown error'}`;
          return {
            content: [{ type: "text", text: errorMessage }],
          };
        }
        
        // Format the response for better readability
        const apps = data.apps || [];
        const formattedResponse = {
          totalCount: apps.length,
          apps: apps.map((app: any) => ({
            appId: app.appId,
            code: app.code,
            name: app.name,
            description: app.description,
            spaceId: app.spaceId,
            creator: app.creator?.name || app.creator?.code
          }))
        };
        
        return {
          content: [{ type: "text", text: JSON.stringify(formattedResponse, null, 2) }],
        };
      }
    );
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
