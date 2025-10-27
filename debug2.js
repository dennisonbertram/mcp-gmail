import { ToolLoader } from './node_modules/mcp-framework/dist/loaders/toolLoader.js';
import { join } from 'path';
(async () => {
  const basePath = join(process.cwd(), 'dist');
  const loader = new ToolLoader(basePath);
  console.log('basePath', basePath);
  const has = await loader.hasTools();
  console.log('hasTools', has);
})();
