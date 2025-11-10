// src/index.bundle.ts
// Bundle entry point with manual tool registration
// This file is used for creating single-file commercial bundles

import { MCPServer } from "mcp-framework";

// Import all tools
import BatchModifyTool from "./tools/batch-modify.js";
import CreateDraftTool from "./tools/create-draft.js";
import CreateFilterTool from "./tools/create-filter.js";
import CreateLabelTool from "./tools/create-label.js";
import GetAttachmentTool from "./tools/get-attachment.js";
import GetSettingsTool from "./tools/get-settings.js";
import GetThreadTool from "./tools/get-thread.js";
import ListFiltersTool from "./tools/list-filters.js";
import ListLabelsTool from "./tools/list-labels.js";
import ListMessagesTool from "./tools/list-messages.js";
import ModifyMessageTool from "./tools/modify-message.js";
import ReadMessageTool from "./tools/read-message.js";
import SearchMessagesTool from "./tools/search-messages.js";
import SendDraftTool from "./tools/send-draft.js";
import SendEmailTool from "./tools/send-email.js";
import SetVacationTool from "./tools/set-vacation.js";
import UpdateSignatureTool from "./tools/update-signature.js";

// Import resources
import AuthStatusResource from "./resources/auth-status.js";

// Create all tool instances
const tools = [
  new BatchModifyTool(),
  new CreateDraftTool(),
  new CreateFilterTool(),
  new CreateLabelTool(),
  new GetAttachmentTool(),
  new GetSettingsTool(),
  new GetThreadTool(),
  new ListFiltersTool(),
  new ListLabelsTool(),
  new ListMessagesTool(),
  new ModifyMessageTool(),
  new ReadMessageTool(),
  new SearchMessagesTool(),
  new SendDraftTool(),
  new SendEmailTool(),
  new SetVacationTool(),
  new UpdateSignatureTool(),
];

// Create resource instances
const resources = [
  new AuthStatusResource(),
];

// Create MCP server
const server = new MCPServer({
  name: "mcp-gmail",
  version: "0.1.0",
});

// Access private fields to manually register tools and resources
// This is necessary for bundling since mcp-framework uses filesystem-based auto-discovery
const serverAny = server as any;

// Override the loadTools method to return our bundled tools instead of loading from filesystem
serverAny.toolLoader.loadTools = async () => {
  return tools;
};

// Override hasTools to return true since we have bundled tools
serverAny.toolLoader.hasTools = async () => {
  return tools.length > 0;
};

// Override the loadResources method to return our bundled resources
serverAny.resourceLoader.loadResources = async () => {
  return resources;
};

// Override hasResources to return true since we have bundled resources
serverAny.resourceLoader.hasResources = async () => {
  return resources.length > 0;
};

// Start the server (wrap in async IIFE for CommonJS compatibility)
(async () => {
  await server.start();
})().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
