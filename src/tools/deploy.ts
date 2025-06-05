import { z } from "zod";
import { KintoneErrorResponse } from "../types";

// Tool schemas
export const updateAppCustomizeSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  desktop: z.object({
    js: z.array(z.object({
      type: z.enum(["URL", "FILE"]).describe("JavaScript resource type"),
      url: z.string().optional().describe("URL of JavaScript file (for URL type)"),
      file: z.object({
        fileKey: z.string().describe("File key from uploaded file")
      }).optional().describe("File info (for FILE type)")
    })).optional().describe("JavaScript files for desktop"),
    css: z.array(z.object({
      type: z.enum(["URL", "FILE"]).describe("CSS resource type"),
      url: z.string().optional().describe("URL of CSS file (for URL type)"),
      file: z.object({
        fileKey: z.string().describe("File key from uploaded file")
      }).optional().describe("File info (for FILE type)")
    })).optional().describe("CSS files for desktop")
  }).optional().describe("Desktop customization"),
  mobile: z.object({
    js: z.array(z.object({
      type: z.enum(["URL", "FILE"]).describe("JavaScript resource type"),
      url: z.string().optional().describe("URL of JavaScript file (for URL type)"),
      file: z.object({
        fileKey: z.string().describe("File key from uploaded file")
      }).optional().describe("File info (for FILE type)")
    })).optional().describe("JavaScript files for mobile"),
    css: z.array(z.object({
      type: z.enum(["URL", "FILE"]).describe("CSS resource type"),
      url: z.string().optional().describe("URL of CSS file (for URL type)"),
      file: z.object({
        fileKey: z.string().describe("File key from uploaded file")
      }).optional().describe("File info (for FILE type)")
    })).optional().describe("CSS files for mobile")
  }).optional().describe("Mobile customization"),
  scope: z.enum(["ALL", "ADMIN", "NONE"]).optional().describe("Scope of customization"),
  revision: z.number().optional().describe("Expected revision number")
});

export const deployAppSchema = z.object({
  apps: z.array(z.object({
    app: z.union([z.number(), z.string()]).describe("App ID to deploy"),
    revision: z.number().optional().describe("Expected revision number")
  })).describe("Apps to deploy"),
  revert: z.boolean().optional().describe("Revert to previous settings on error")
});

// Tool implementations
export const deployTools = {
  async updateAppCustomize(params: z.infer<typeof updateAppCustomizeSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, desktop, mobile, scope, revision } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/preview/app/customize.json`;
    
    const body: any = {
      app: String(appId)
    };
    if (desktop) body.desktop = desktop;
    if (mobile) body.mobile = mobile;
    if (scope) body.scope = scope;
    if (revision !== undefined) body.revision = revision;
    
    console.error("=== updateAppCustomize Request Debug ===");
    console.error("URL:", url);
    console.error("Method: PUT");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("======================================");
    
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
        "Content-Type": "application/json"
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async deployApp(params: z.infer<typeof deployAppSchema>, props: { subdomain: string; accessToken: string }) {
    const { apps, revert } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/preview/app/deploy.json`;
    
    const body: any = {
      apps: apps.map(app => ({
        app: String(app.app),
        ...(app.revision !== undefined && { revision: app.revision })
      }))
    };
    if (revert !== undefined) body.revert = revert;
    
    console.error("=== deployApp Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("==============================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
        "Content-Type": "application/json"
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
};