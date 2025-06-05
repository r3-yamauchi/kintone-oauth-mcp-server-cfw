import { z } from "zod";
import { KintoneErrorResponse } from "../types";

// Tool schemas
export const getAppSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

export const getAppFieldsSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

export const searchAppsSchema = z.object({
  name: z.string().describe("App name or partial name to search for"),
  limit: z.number().optional().describe("Maximum number of apps to return (default: 100, max: 100)"),
  offset: z.number().optional().describe("Number of apps to skip (default: 0)")
});

export const getAppSettingsSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  lang: z.string().optional().describe("Language for app name and description (ja, en, zh, user)")
});

export const getFormLayoutSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

export const getViewsSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  lang: z.string().optional().describe("Language for view names (ja, en, zh, user)")
});

export const getProcessManagementSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  lang: z.string().optional().describe("Language for status names (ja, en, zh, user)")
});

export const getAppReportsSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  lang: z.string().optional().describe("Language for graph names (ja, en, zh, user)")
});

export const getAppCustomizeSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

export const getAppActionsSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  lang: z.string().optional().describe("Language for action names (ja, en, zh, user)")
});

// Tool implementations
export const appTools = {
  async getApp(params: z.infer<typeof getAppSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app.json`;
    
    const body = {
      id: String(appId)
    };
    
    console.error("=== getApp Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("Authorization header present:", !!props.accessToken);
    console.error("Subdomain:", props.subdomain);
    console.error("===========================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async getAppFields(params: z.infer<typeof getAppFieldsSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/form/fields.json`;
    
    const body = {
      app: String(appId)
    };
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async searchApps(params: z.infer<typeof searchAppsSchema>, props: { subdomain: string; accessToken: string }) {
    const { name, limit = 100, offset = 0 } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/apps.json`;
    
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
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
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
      content: [{ type: "text" as const, text: JSON.stringify(formattedResponse, null, 2) }],
    };
  },

  async getAppSettings(params: z.infer<typeof getAppSettingsSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, lang } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/settings.json`;
    
    const body: any = {
      app: String(appId)
    };
    if (lang) body.lang = lang;
    
    console.error("=== getAppSettings Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("===================================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async getFormLayout(params: z.infer<typeof getFormLayoutSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/form/layout.json`;
    
    const body = {
      app: String(appId)
    };
    
    console.error("=== getFormLayout Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("==================================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async getViews(params: z.infer<typeof getViewsSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, lang } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/views.json`;
    
    const body: any = {
      app: String(appId)
    };
    if (lang) body.lang = lang;
    
    console.error("=== getViews Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("=============================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async getProcessManagement(params: z.infer<typeof getProcessManagementSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, lang } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/status.json`;
    
    const body: any = {
      app: String(appId)
    };
    if (lang) body.lang = lang;
    
    console.error("=== getProcessManagement Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("=========================================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async getAppReports(params: z.infer<typeof getAppReportsSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, lang } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/reports.json`;
    
    const body: any = {
      app: String(appId)
    };
    if (lang) body.lang = lang;
    
    console.error("=== getAppReports Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("==================================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async getAppCustomize(params: z.infer<typeof getAppCustomizeSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/customize.json`;
    
    const body = {
      app: String(appId)
    };
    
    console.error("=== getAppCustomize Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("====================================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async getAppActions(params: z.infer<typeof getAppActionsSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, lang } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/actions.json`;
    
    const body: any = {
      app: String(appId)
    };
    if (lang) body.lang = lang;
    
    console.error("=== getAppActions Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("==================================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
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
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  }
};