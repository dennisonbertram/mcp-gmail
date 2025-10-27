import { MCPServer } from 'mcp-framework';
(async () => {
  const server = new MCPServer();
  // @ts-ignore
  const loader = (server as any).toolLoader;
  console.log('BasePath', (server as any).basePath);
  const has = await loader.hasTools();
  console.log('hasTools', has);
})();
