import { z } from "zod";
import { KintoneErrorResponse } from "../types";

// Tool schemas
export const getAppNotificationsGeneralSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

export const getAppNotificationsPerRecordSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

export const getAppNotificationsReminderSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

// Tool implementations
export const notificationTools = {
  async getAppNotificationsGeneral(params: z.infer<typeof getAppNotificationsGeneralSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/notifications/general.json`;
    
    const body = {
      app: String(appId)
    };
    
    console.error("=== getAppNotificationsGeneral Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("===============================================");
    
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

  async getAppNotificationsPerRecord(params: z.infer<typeof getAppNotificationsPerRecordSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/notifications/perRecord.json`;
    
    const body = {
      app: String(appId)
    };
    
    console.error("=== getAppNotificationsPerRecord Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("=================================================");
    
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

  async getAppNotificationsReminder(params: z.infer<typeof getAppNotificationsReminderSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/notifications/reminder.json`;
    
    const body = {
      app: String(appId)
    };
    
    console.error("=== getAppNotificationsReminder Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("================================================");
    
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