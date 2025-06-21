import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Props } from "../types";
import { 
  recordTools, 
  getRecordsSchema, 
  getRecordSchema,
  addRecordSchema, 
  addRecordsSchema,
  updateRecordSchema,
  getRecordCommentsSchema,
  addRecordCommentSchema,
  evaluateRecordsAclSchema
} from "./records";
import { 
  appTools, 
  getAppSchema, 
  getAppFieldsSchema, 
  searchAppsSchema,
  getAppSettingsSchema,
  getFormLayoutSchema,
  getViewsSchema,
  getProcessManagementSchema,
  getAppReportsSchema,
  getAppCustomizeSchema,
  getAppActionsSchema
} from "./apps";
import { fileTools, uploadFileSchema, downloadFileSchema } from "./files";
import { aclTools, getAppAclSchema, getRecordAclSchema, getFieldAclSchema } from "./acl";
import { 
  notificationTools, 
  getAppNotificationsGeneralSchema,
  getAppNotificationsPerRecordSchema,
  getAppNotificationsReminderSchema
} from "./notifications";
import { 
  deployTools, 
  updateAppCustomizeSchema,
  deployAppSchema
} from "./deploy";

export function registerTools(server: McpServer, props: Props) {
  // レコードツール
  server.tool(
    "getRecords",
    "Get records from a kintone app",
    getRecordsSchema.shape,
    async (params) => recordTools.getRecords(params, props)
  );

  server.tool(
    "getRecord",
    "Get a single record from a kintone app by ID",
    getRecordSchema.shape,
    async (params) => recordTools.getRecord(params, props)
  );

  server.tool(
    "addRecord",
    "Add a new record to a kintone app",
    addRecordSchema.shape,
    async (params) => recordTools.addRecord(params, props)
  );

  server.tool(
    "addRecords",
    "Add multiple records to a kintone app (max 100 records per request)",
    addRecordsSchema.shape,
    async (params) => recordTools.addRecords(params, props)
  );

  server.tool(
    "updateRecord",
    "Update an existing record in a kintone app",
    updateRecordSchema.shape,
    async (params) => recordTools.updateRecord(params, props)
  );

  server.tool(
    "getRecordComments",
    "Get comments from a kintone record",
    getRecordCommentsSchema.shape,
    async (params) => recordTools.getRecordComments(params, props)
  );

  server.tool(
    "addRecordComment",
    "Add a comment to a kintone record",
    addRecordCommentSchema.shape,
    async (params) => recordTools.addRecordComment(params, props)
  );

  server.tool(
    "evaluateRecordsAcl",
    "Evaluate current user's permissions for specified records",
    evaluateRecordsAclSchema.shape,
    async (params) => recordTools.evaluateRecordsAcl(params, props)
  );

  // アプリツール
  server.tool(
    "getApp",
    "Get kintone app general information (name, description, etc.)",
    getAppSchema.shape,
    async (params) => appTools.getApp(params, props)
  );

  server.tool(
    "getAppFields",
    "Get kintone app field list with their settings and properties",
    getAppFieldsSchema.shape,
    async (params) => appTools.getAppFields(params, props)
  );

  server.tool(
    "searchApps",
    "Search kintone apps by name or partial name match",
    searchAppsSchema.shape,
    async (params) => appTools.searchApps(params, props)
  );

  server.tool(
    "getAppSettings",
    "Get kintone app settings including name, description, icon, theme",
    getAppSettingsSchema.shape,
    async (params) => appTools.getAppSettings(params, props)
  );

  server.tool(
    "getFormLayout",
    "Get kintone app form layout configuration",
    getFormLayoutSchema.shape,
    async (params) => appTools.getFormLayout(params, props)
  );

  server.tool(
    "getViews",
    "Get kintone app view (list) configurations",
    getViewsSchema.shape,
    async (params) => appTools.getViews(params, props)
  );

  server.tool(
    "getProcessManagement",
    "Get kintone app process management (workflow) settings",
    getProcessManagementSchema.shape,
    async (params) => appTools.getProcessManagement(params, props)
  );

  server.tool(
    "getAppReports",
    "Get kintone app graph/report settings",
    getAppReportsSchema.shape,
    async (params) => appTools.getAppReports(params, props)
  );

  server.tool(
    "getAppCustomize",
    "Get JavaScript/CSS customization settings",
    getAppCustomizeSchema.shape,
    async (params) => appTools.getAppCustomize(params, props)
  );

  server.tool(
    "getAppActions",
    "Get kintone app action settings",
    getAppActionsSchema.shape,
    async (params) => appTools.getAppActions(params, props)
  );

  // ファイルツール
  server.tool(
    "uploadFile",
    "Upload a file to kintone (returns file key for use in record fields)",
    uploadFileSchema.shape,
    async (params) => fileTools.uploadFile(params, props)
  );

  server.tool(
    "downloadFile",
    "Download a file from kintone using file key",
    downloadFileSchema.shape,
    async (params) => fileTools.downloadFile(params, props)
  );

  // ACLツール
  server.tool(
    "getAppAcl",
    "Get app-level access permissions",
    getAppAclSchema.shape,
    async (params) => aclTools.getAppAcl(params, props)
  );

  server.tool(
    "getRecordAcl",
    "Get record-level access permissions settings",
    getRecordAclSchema.shape,
    async (params) => aclTools.getRecordAcl(params, props)
  );

  server.tool(
    "getFieldAcl",
    "Get field-level access permissions",
    getFieldAclSchema.shape,
    async (params) => aclTools.getFieldAcl(params, props)
  );

  // 通知ツール
  server.tool(
    "getAppNotificationsGeneral",
    "Get app condition notification settings",
    getAppNotificationsGeneralSchema.shape,
    async (params) => notificationTools.getAppNotificationsGeneral(params, props)
  );

  server.tool(
    "getAppNotificationsPerRecord",
    "Get per-record notification settings",
    getAppNotificationsPerRecordSchema.shape,
    async (params) => notificationTools.getAppNotificationsPerRecord(params, props)
  );

  server.tool(
    "getAppNotificationsReminder",
    "Get reminder notification settings",
    getAppNotificationsReminderSchema.shape,
    async (params) => notificationTools.getAppNotificationsReminder(params, props)
  );

  // デプロイツール
  server.tool(
    "updateAppCustomize",
    "Update JavaScript/CSS customization settings (preview)",
    updateAppCustomizeSchema.shape,
    async (params) => deployTools.updateAppCustomize(params, props)
  );

  server.tool(
    "deployApp",
    "Deploy app settings to production",
    deployAppSchema.shape,
    async (params) => deployTools.deployApp(params, props)
  );
}