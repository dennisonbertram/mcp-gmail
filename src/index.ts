// src/index.ts
// Basic MCP server using the default stdio transport.

import { MCPServer } from "mcp-framework";

const server = new MCPServer();
await server.start();
