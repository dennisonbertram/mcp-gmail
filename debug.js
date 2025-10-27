import { ToolLoader } from './node_modules/mcp-framework/dist/loaders/toolLoader.js';
import { join } from 'path';
(async () => {
  const loader = new ToolLoader(process.cwd());
  console.log('basePath', process.cwd());
  const has = await loader.hasTools();
  console.log('hasTools', has);
})();
