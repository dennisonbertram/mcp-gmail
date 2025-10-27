import { MCPServer } from 'mcp-framework';
const server = new MCPServer();
console.log('BasePath:', (server as any).basePath);
