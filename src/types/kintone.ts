// kintone API error response type
export type KintoneErrorResponse = {
  code?: string;
  id?: string;
  message?: string;
};

// Record field value types
export type FieldValue = {
  value: any;
};

// Record type
export type KintoneRecord = {
  [fieldCode: string]: FieldValue;
};

// App info type
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