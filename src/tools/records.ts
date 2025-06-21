import { z } from "zod";
import { KintoneErrorResponse } from "../types";

// ツールスキーマ
export const getRecordsSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  query: z.string().optional().describe("Query to filter records (optional)"),
  fields: z.array(z.string()).optional().describe("Fields to retrieve (optional)")
});

export const getRecordSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  id: z.union([z.number(), z.string()]).describe("The record ID")
});

export const addRecordSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  record: z.record(z.string(), z.any()).describe("Record data as key-value pairs")
});

export const addRecordsSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  records: z.array(z.record(z.string(), z.any())).describe("Array of record data")
});

export const updateRecordSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  id: z.union([z.number(), z.string()]).describe("The record ID to update"),
  record: z.record(z.string(), z.any()).describe("Fields to update as key-value pairs"),
  revision: z.number().optional().describe("Expected revision number (optional)")
});

export const getRecordCommentsSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  recordId: z.union([z.number(), z.string()]).describe("The record ID"),
  order: z.enum(["asc", "desc"]).optional().describe("Comment order (asc or desc, default: desc)"),
  offset: z.number().optional().describe("Offset for pagination"),
  limit: z.number().optional().describe("Number of comments to retrieve (max 10)")
});

export const addRecordCommentSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  recordId: z.union([z.number(), z.string()]).describe("The record ID"),
  comment: z.object({
    text: z.string().describe("Comment text"),
    mentions: z.array(z.object({
      code: z.string().describe("User code or organization/group code"),
      type: z.enum(["USER", "ORGANIZATION", "GROUP"]).describe("Mention type")
    })).optional().describe("Users/organizations/groups to mention")
  }).describe("Comment details")
});

export const evaluateRecordsAclSchema = z.object({
  appId: z.union([z.number(), z.string()]).describe("The kintone app ID"),
  ids: z.array(z.union([z.number(), z.string()])).describe("Array of record IDs to evaluate")
});

// ツール実装
export const recordTools = {
  async getRecords(params: z.infer<typeof getRecordsSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, query, fields } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/records.json`;
    
    const body: any = {
      app: String(appId)
    };
    if (query) body.query = query;
    if (fields && fields.length > 0) body.fields = fields;
    
    console.error("=== getRecords Request Debug ===");
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

  async getRecord(params: z.infer<typeof getRecordSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, id } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/record.json`;
    
    const body = {
      app: String(appId),
      id: String(id)
    };
    
    console.error("=== getRecord Request Debug ===");
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

  async addRecord(params: z.infer<typeof addRecordSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, record } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/record.json`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        app: String(appId),
        record: record
      })
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

  async addRecords(params: z.infer<typeof addRecordsSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, records } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/records.json`;
    
    console.error("=== addRecords Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST");
    console.error("Records count:", records.length);
    console.error("===============================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        app: String(appId),
        records: records
      })
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

  async updateRecord(params: z.infer<typeof updateRecordSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, id, record, revision } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/record.json`;
    
    const body: any = {
      app: String(appId),
      id: String(id),
      record: record
    };
    if (revision !== undefined) {
      body.revision = revision;
    }
    
    console.error("=== updateRecord Request Debug ===");
    console.error("URL:", url);
    console.error("Method: PUT");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("================================");
    
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

  async getRecordComments(params: z.infer<typeof getRecordCommentsSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, recordId, order = "desc", offset, limit } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/record/comments.json`;
    
    const body: any = {
      app: String(appId),
      record: String(recordId),
      order: order
    };
    if (offset !== undefined) body.offset = offset;
    if (limit !== undefined) body.limit = Math.min(limit, 10);
    
    console.error("=== getRecordComments Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("======================================");
    
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

  async addRecordComment(params: z.infer<typeof addRecordCommentSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, recordId, comment } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/record/comment.json`;
    
    const body: any = {
      app: String(appId),
      record: String(recordId),
      comment: comment
    };
    
    console.error("=== addRecordComment Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("=====================================");
    
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
  },

  async evaluateRecordsAcl(params: z.infer<typeof evaluateRecordsAclSchema>, props: { subdomain: string; accessToken: string }) {
    const { appId, ids } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/records/acl/evaluate.json`;
    
    const body = {
      app: String(appId),
      ids: ids.map(id => String(id))
    };
    
    console.error("=== evaluateRecordsAcl Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST with X-HTTP-Method-Override: GET");
    console.error("Body:", JSON.stringify(body, null, 2));
    console.error("=======================================");
    
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