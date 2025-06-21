// kintone APIエラーレスポンス型
export type KintoneErrorResponse = {
  code?: string;
  id?: string;
  message?: string;
};

// レコードフィールド値の型
export type FieldValue = {
  value: any;
};

// レコード型
export type KintoneRecord = {
  [fieldCode: string]: FieldValue;
};

// アプリ情報型
export type KintoneApp = {
  appId: string;
  code: string;
  name: string;
  description: string;
  spaceId: string | null;
  creator?: {
    name: string;
    code: string;
  };
};