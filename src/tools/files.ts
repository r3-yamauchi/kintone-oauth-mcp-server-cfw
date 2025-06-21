import { z } from "zod";
import { KintoneErrorResponse } from "../types";

// ツールスキーマ
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

// ツール実装
export const fileTools = {
  async uploadFile(params: z.infer<typeof uploadFileSchema>, props: { subdomain: string; accessToken: string }) {
    const { file } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/file.json`;
    
    // base64コンテンツをバイナリにデコード
    const binaryContent = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
    
    // FormDataを作成
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
        // 注意: FormDataを使用する場合、Content-Typeヘッダーを設定しない
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
    
    // レコードフィールドで使用するためのファイルキーを返す
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  },

  async downloadFile(params: z.infer<typeof downloadFileSchema>, props: { subdomain: string; accessToken: string }) {
    const { fileKey } = params;
    const url = `https://${props.subdomain}.cybozu.com/k/v1/file.json`;
    
    // ファイルダウンロードの場合、クエリパラメータ付きのGETを使用する必要がある
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
    
    // ファイルコンテンツをArrayBufferとして取得
    const arrayBuffer = await response.arrayBuffer();
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Content-Dispositionヘッダーからファイル名を取得しようとする
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'download';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }
    
    // コンテンツタイプを取得
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    
    // ファイル情報とbase64コンテンツを返す
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