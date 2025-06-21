import { z } from "zod";
import { KintoneErrorResponse } from "../types";

// ツールスキーマ
export const getAppAclSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

export const getRecordAclSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

export const getFieldAclSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID")
});

// ツール実装
export const aclTools = {
  async getAppAcl(params: z.infer<typeof getAppAclSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/app/acl.json`;
    
    const body = {
      app: String(appId)
    };
    
    console.error("=== getAppAcl Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("==============================");
    
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

  async getRecordAcl(params: z.infer<typeof getRecordAclSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/record/acl.json`;
    
    const body = {
      app: String(appId)
    };
    
    console.error("=== getRecordAcl Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("=================================");
    
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

  async getFieldAcl(params: z.infer<typeof getFieldAclSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/field/acl.json`;
    
    const body = {
      app: String(appId)
    };
    
    console.error("=== getFieldAcl Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("================================");
    
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