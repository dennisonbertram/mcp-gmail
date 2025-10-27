import { MCPServer } from 'mcp-framework';
(async () => {
  const server = new MCPServer();
  console.log('BasePath', server.basePath);
  const tools = await server.toolLoader.loadTools();
  console.log('Loaded tools', tools.map(t=>t.name));
  const caps = await server.detectCapabilities();
  console.log('Capabilities after detect', caps);
})();
