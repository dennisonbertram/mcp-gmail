import { MCPServer } from 'mcp-framework';
(async () => {
  const server = new MCPServer();
  console.log('basePath', server.basePath);
  // @ts-ignore
  const has = await server.toolLoader.hasTools();
  console.log('hasTools', has);
})();
