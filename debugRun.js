import { MCPServer } from 'mcp-framework';
(async () => {
  const server = new MCPServer();
  console.log('BasePath', server.basePath);
  await server.start();
})();
