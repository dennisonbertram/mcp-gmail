import { MCPServer } from 'mcp-framework';

test('MCP server starts and stops', async () => {
  const server = new MCPServer();
  // Start the server in background
  const startPromise = server.start();
  // Give it a moment to initialize
  await new Promise((r) => setTimeout(r, 100));
  // Stop the server (this resolves the shutdown promise)
  await server.stop();
  // Await the original start promise to ensure clean shutdown
  await expect(startPromise).resolves.not.toThrow();
});
