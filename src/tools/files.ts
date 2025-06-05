import { z } from "zod";
import { KintoneErrorResponse } from "../types";

// Tool schemas
export const uploadFileSchema = z.object({
  file: z.object({
    name: z.string().describe("File name"),
    content: z.string().describe("Base64 encoded file content"),
    contentType: z.string().optional().describe("MIME type of the file")
  }).describe("File to upload")
});

export const downloadFileSchema = z.object({
  fileKey: z.string().describe("File key obtained from kintone record")
});

// Tool implementations
export const fileTools = {
  async uploadFile(params: z.infer<typeof uploadFileSchema>, props: { subdomain: string; accessToken: string }) {
    const { file } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/file.json`;
    
    // Decode base64 content to binary
    const binaryContent = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
    
    // Create FormData
    const formData = new FormData();
    const blob = new Blob([binaryContent], { type: file.contentType || 'application/octet-stream' });
    formData.append('file', blob, file.name);
    
    console.error("=== uploadFile Request Debug ===");
    console.error("URL:", url);
    console.error("Method: POST");
    console.error("File name:", file.name);
    console.error("Content type:", file.contentType || 'application/octet-stream');
    console.error("===============================");
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`
        // Note: Don't set Content-Type header when using FormData
      },
      body: formData
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
    
    // Return the file key for use in record fields
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async downloadFile(params: z.infer<typeof downloadFileSchema>, props: { subdomain: string; accessToken: string }) {
    const { fileKey } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/file.json`;
    
    // For file download, we need to use GET with query parameter
    const downloadUrl = `${url}?fileKey=${encodeURIComponent(fileKey)}`;
    
    console.error("=== downloadFile Request Debug ===");
    console.error("URL:", downloadUrl);
    console.error("Method: GET");
    console.error("File key:", fileKey);
    console.error("=================================");
    
    const response = await fetch(downloadUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${props.accessToken}`
      }
    });
    
    if (!response.ok) {
      console.error("=== API Error Response ===");
      console.error("Status:", response.status);
      console.error("========================");
      
      let errorMessage = `Error ${response.status}: Failed to download file`;
      return {
        content: [{ type: "text" as const, text: errorMessage }],
      };
    }
    
    // Get the file content as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Try to get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'download';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }
    
    // Get content type
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    
    // Return file info and base64 content
    const result = {
      filename: filename,
      contentType: contentType,
      size: arrayBuffer.byteLength,
      content: base64Content
    };
    
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
};