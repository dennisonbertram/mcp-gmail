// esbuild.config.js
// Configuration for bundling the Gmail MCP server into a single file

import esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to inline mcp-framework's package.json
const frameworkPackagePlugin = {
  name: 'framework-package',
  setup(build) {
    // Match the exact path used by mcp-framework
    build.onResolve({ filter: /package\.json$/ }, args => {
      if (args.path === '../../package.json' && args.importer.includes('mcp-framework')) {
        return {
          path: resolve(__dirname, 'node_modules/mcp-framework/package.json'),
          namespace: 'framework-pkg'
        };
      }
    });

    build.onLoad({ filter: /.*/, namespace: 'framework-pkg' }, (args) => {
      const pkg = JSON.parse(readFileSync(args.path, 'utf8'));
      return {
        contents: `module.exports = ${JSON.stringify({ name: pkg.name, version: pkg.version })};`,
        loader: 'js'
      };
    });
  }
};

esbuild.build({
  entryPoints: ['src/index.bundle.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/gmail-mcp.bundle.cjs',
  minify: true,
  sourcemap: false,
  banner: {
    js: '#!/usr/bin/env node\n'
  },
  external: [], // Bundle everything (no externals)
  treeShaking: true,
  legalComments: 'none',
  logLevel: 'info',
  inject: ['./cjs-shim.js'], // Inject CommonJS shims
  define: {
    'import.meta.url': 'import_meta_url',
  },
  plugins: [frameworkPackagePlugin],
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
