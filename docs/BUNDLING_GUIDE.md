# MCP Server Bundling Guide

**Complete guide for creating a minified, obfuscated single-file bundle for commercial distribution of MCP servers.**

This guide documents the exact process used for the Gmail MCP server and can be replicated across any MCP server project.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [File Structure](#file-structure)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Build Process Explained](#build-process-explained)
6. [Testing the Bundle](#testing-the-bundle)
7. [Troubleshooting](#troubleshooting)
8. [Distribution](#distribution)

---

## Overview

### What This Creates

**Two parallel build outputs:**
1. **Development Build** (`npm run build`)
   - Multi-file output in `dist/`
   - Uses mcp-framework auto-discovery
   - Requires `node_modules/`
   - For development and npm distribution

2. **Production Bundle** (`npm run build:bundle`)
   - Single `.cjs` file (CommonJS)
   - All dependencies bundled (~10-20MB)
   - Manual tool registration (bypasses auto-discovery)
   - No `node_modules/` required
   - Minified by esbuild
   - Ready for commercial embedding

### Why CommonJS (not ESM)?

- **googleapis** and **@google-cloud** packages don't bundle properly as ESM
- esbuild falls back to CommonJS when bundling these packages
- CommonJS is more compatible for embedding in other projects
- Use `.cjs` extension to avoid conflicts with ESM package.json declaration

---

## Prerequisites

### Required Dependencies

Install these as dev dependencies:

```bash
npm install --save-dev esbuild javascript-obfuscator
```

**Why these tools:**
- **esbuild** - Fast bundler with tree-shaking and minification
- **javascript-obfuscator** - (Optional) For additional code obfuscation

### Project Requirements

Your MCP server should:
- Use `mcp-framework` for server creation
- Have tools in `src/tools/*.ts`
- Have resources in `src/resources/*.ts` (optional)
- Use TypeScript

---

## File Structure

After implementation, you'll have:

```
your-mcp-server/
├── src/
│   ├── index.ts              # Original entry (auto-discovery)
│   ├── index.bundle.ts       # NEW: Bundle entry (manual registration)
│   ├── tools/                # Your MCP tools
│   └── resources/            # Your MCP resources (optional)
├── scripts/
│   └── obfuscate.js          # NEW: Post-processing script
├── dist/
│   ├── index.js              # Dev build output
│   ├── tools/                # Dev build (auto-discovered)
│   └── your-server.bundle.cjs # NEW: Production bundle
├── cjs-shim.js               # NEW: CommonJS compatibility shims
├── esbuild.config.js         # NEW: Bundler configuration
└── package.json              # Updated with build scripts
```

---

## Step-by-Step Implementation

### Step 1: Create Bundle Entry Point

**File:** `src/index.bundle.ts`

This replaces mcp-framework's auto-discovery with manual tool registration.

```typescript
// src/index.bundle.ts
// Bundle entry point with manual tool/resource registration

import { MCPServer } from 'mcp-framework';

// Import ALL your tools explicitly
import Tool1 from './tools/tool1.js';
import Tool2 from './tools/tool2.js';
import Tool3 from './tools/tool3.js';
// ... import all tools

// Import ALL your resources explicitly (if you have any)
import Resource1 from './resources/resource1.js';
// ... import all resources

// Create server instance
const server = new MCPServer({
  name: 'your-mcp-server',
  version: '1.0.0',
});

// Instantiate all tools
const tools = [
  new Tool1(),
  new Tool2(),
  new Tool3(),
  // ... instantiate all tools
];

// Instantiate all resources (if you have any)
const resources = [
  new Resource1(),
  // ... instantiate all resources
];

// Type assertion to access internal loaders
const serverAny = server as any;

// CRITICAL FIX: Override the loaders to return bundled tools/resources
// This prevents mcp-framework from trying to load from filesystem
// and ensures capabilities are properly detected

// Override loadTools to return our bundled tools
serverAny.toolLoader.loadTools = async () => {
  return tools;
};

// Override hasTools to return true (enables tools capability)
serverAny.toolLoader.hasTools = async () => {
  return tools.length > 0;
};

// Override loadResources to return our bundled resources
serverAny.resourceLoader.loadResources = async () => {
  return resources;
};

// Override hasResources to return true (enables resources capability)
serverAny.resourceLoader.hasResources = async () => {
  return resources.length > 0;
};

// Start the server (wrap in async IIFE for CommonJS compatibility)
(async () => {
  await server.start();
})().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
```

**Important Notes:**
- Import **every single tool** your server has
- Import **every single resource** your server has
- The loader overrides are **CRITICAL** - without them, capabilities won't be detected when the bundle runs in isolation (without dist/ directory)
- The async IIFE wrapper is required for CommonJS top-level await compatibility
- Update the name and version to match your server

**Why the loader overrides are necessary:**
When bundled, the server no longer has access to the `dist/tools/` directory. The mcp-framework's `start()` method calls:
1. `toolLoader.loadTools()` - tries to load from filesystem
2. `toolLoader.hasTools()` - checks if tools directory exists
3. `detectCapabilities()` - determines server capabilities based on what was found

Without the overrides, these methods return empty arrays/false, causing the server to report no capabilities and fail with "Server does not support tools" errors.

### Step 2: Create CommonJS Shim

**File:** `cjs-shim.js` (project root)

Provides compatibility for ESM features in CommonJS bundles.

```javascript
// cjs-shim.js
// CommonJS compatibility shims for bundled code

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Polyfill for import.meta.url in CommonJS
export const import_meta_url = typeof document === 'undefined'
  ? new (require('url').URL)('file:' + __filename).href
  : (document.currentScript && document.currentScript.src || new URL('index.js', document.baseURI).href);

// Helper for __dirname in ESM-style code running as CommonJS
export const getFilename = () => __filename;
export const getDirname = () => __dirname;
```

**Why this is needed:**
- `import.meta.url` doesn't exist in CommonJS
- Some packages expect ESM-style path resolution
- This shim bridges the gap

### Step 3: Create esbuild Configuration

**File:** `esbuild.config.js` (project root)

```javascript
// esbuild.config.js
// Configuration for bundling your MCP server into a single file

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
  target: 'node18',                    // Adjust based on your Node.js target
  format: 'cjs',                       // CommonJS format (IMPORTANT!)
  outfile: 'dist/your-server.bundle.cjs', // Use .cjs extension
  minify: true,                        // Minification enabled
  sourcemap: false,                    // No source maps for production
  banner: {
    js: '#!/usr/bin/env node\n'       // Shebang for direct execution
  },
  external: [],                        // Bundle everything (no externals)
  treeShaking: true,                   // Remove unused code
  legalComments: 'none',               // Strip license comments
  logLevel: 'info',                    // Show build progress
  inject: ['./cjs-shim.js'],           // Inject CommonJS shims
  define: {
    'import.meta.url': 'import_meta_url', // Replace import.meta.url
  },
  plugins: [frameworkPackagePlugin],   // Handle framework package.json
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
```

**Configuration Explanation:**
- `entryPoints` - Your bundle entry point (not the regular index.ts!)
- `format: 'cjs'` - **MUST be CommonJS** (ESM doesn't bundle googleapis properly)
- `outfile` - Use `.cjs` extension to avoid ESM conflicts
- `minify: true` - Built-in minification by esbuild
- `sourcemap: false` - Don't include source maps in production
- `external: []` - Bundle all dependencies (no externals)
- `inject` - Add CommonJS shims for ESM compatibility
- `plugins` - Handle mcp-framework's internal package.json require

**Customize for your project:**
- Change `your-server.bundle.cjs` to your actual server name
- Adjust `target` if you need different Node.js compatibility
- Add additional `external` packages if some cause issues

### Step 4: Create Post-Processing Script

**File:** `scripts/obfuscate.js`

```javascript
// scripts/obfuscate.js
// Post-processing for bundled MCP server
// Note: Full obfuscation disabled for large bundles - esbuild minification is sufficient

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '..', 'dist', 'your-server.bundle.cjs'); // UPDATE THIS

console.log('Post-processing bundle:', inputFile);

// Read the bundle
let content = fs.readFileSync(inputFile, 'utf8');

// Patch any remaining dynamic requires for mcp-framework
// Replace require('../../package.json') with inline JSON
const frameworkPackage = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'node_modules', 'mcp-framework', 'package.json'),
    'utf8'
  )
);

// Create inline package object with just name and version
const inlinePackage = JSON.stringify({
  name: frameworkPackage.name,
  version: frameworkPackage.version
});

// Replace all occurrences of the require pattern
content = content.replace(
  /require\(['"]\.\.\/\.\.\/package\.json['"]\)/g,
  inlinePackage
);

// Write back
fs.writeFileSync(inputFile, content, 'utf8');

// Make the file executable
fs.chmodSync(inputFile, 0o755);

// Get file size
const stats = fs.statSync(inputFile);
const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('✅ Bundle ready for distribution!');
console.log('Output file:', inputFile);
console.log(`File size: ${fileSizeInMB} MB`);
console.log('');
console.log('The bundle is minified by esbuild.');
console.log('For very large bundles, aggressive obfuscation may cause memory issues.');
console.log('esbuild minification provides sufficient code protection for most use cases.');
```

**Why post-processing:**
- Patches remaining dynamic `require()` calls that esbuild can't resolve
- Makes the bundle executable
- Reports bundle size
- (Optional) Can add obfuscation here if bundle is small enough

**Customize for your project:**
- Update `your-server.bundle.cjs` to match your output filename

### Step 5: Update package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "tsc && mcp-build",
    "build:bundle": "node esbuild.config.js && node scripts/obfuscate.js",
    "build:all": "npm run build && npm run build:bundle"
  },
  "devDependencies": {
    "esbuild": "^0.27.0",
    "javascript-obfuscator": "^4.1.1",
    "@types/node": "^20.0.0",
    "typescript": "^5.9.3"
  }
}
```

**Script Explanation:**
- `build` - Original dev build (unchanged)
- `build:bundle` - Creates production bundle (runs esbuild + post-processing)
- `build:all` - Runs both builds (convenient for CI/CD)

### Step 6: Update .gitignore

Add bundle output to `.gitignore`:

```gitignore
# Bundle outputs (large files, not for version control)
dist/*.bundle.cjs
dist/*.bundle.js
```

**Why gitignore the bundle:**
- Bundle is 10-20MB+ (too large for git)
- Generated file (can be rebuilt)
- Keep in version control: source files and configs
- Distribute bundle separately or via releases

---

## Build Process Explained

### Development Build

```bash
npm run build
```

**What happens:**
1. TypeScript compiles `src/**/*.ts` → `dist/**/*.js`
2. `mcp-build` validates tools and adds shebang
3. Output: Multi-file structure in `dist/`
4. Requires: `node_modules/` to run

**Use for:**
- Development and debugging
- npm package distribution
- Standard Node.js deployment

### Production Bundle Build

```bash
npm run build:bundle
```

**What happens:**
1. **esbuild runs:**
   - Reads `src/index.bundle.ts` (manual registration entry)
   - Bundles all dependencies
   - Minifies code
   - Tree-shakes unused code
   - Injects CommonJS shims
   - Adds shebang
   - Outputs `dist/your-server.bundle.cjs`

2. **Post-processing runs:**
   - Patches dynamic `require()` calls
   - Makes bundle executable
   - Reports final size

**Output:** Single `.cjs` file (10-20MB)

**Use for:**
- Commercial embedding
- Single-file distribution
- Hiding source code
- Environments where node_modules isn't wanted

### Combined Build

```bash
npm run build:all
```

Runs both builds sequentially. Useful for:
- CI/CD pipelines
- Pre-release validation
- Testing both distributions

---

## Testing the Bundle

### Create Test Script

**File:** `test-bundle.js` (project root)

```javascript
// test-bundle.js
// Test script for validating bundled MCP server

import { spawn } from 'child_process';

const BUNDLE_PATH = './dist/your-server.bundle.cjs'; // UPDATE THIS

async function testMCPServer(serverPath, label) {
  console.log(`\n━━━ Testing: ${label} ━━━`);

  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('Server error:', data.toString());
    });

    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };

    setTimeout(() => {
      server.stdin.write(JSON.stringify(initRequest) + '\n');
    }, 100);

    // Send list tools request
    setTimeout(() => {
      const listToolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };
      server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    }, 500);

    // Send list resources request
    setTimeout(() => {
      const listResourcesRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/list',
        params: {}
      };
      server.stdin.write(JSON.stringify(listResourcesRequest) + '\n');
    }, 1000);

    // Close and analyze results
    setTimeout(() => {
      server.stdin.end();

      const responses = output
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Find responses by ID
      const initResponse = responses.find(r => r.id === 1);
      const toolsResponse = responses.find(r => r.id === 2);
      const resourcesResponse = responses.find(r => r.id === 3);

      console.log('✅ Initialize:', initResponse ? 'Success' : 'Failed');
      console.log('✅ List Tools:', toolsResponse ?
        `Found ${toolsResponse.result?.tools?.length || 0} tools` : 'Failed');
      console.log('✅ List Resources:', resourcesResponse ?
        `Found ${resourcesResponse.result?.resources?.length || 0} resources` : 'Failed');

      if (toolsResponse?.result?.tools) {
        console.log('\nTools available:');
        toolsResponse.result.tools.forEach((tool, i) => {
          console.log(`  ${i + 1}. ${tool.name}`);
        });
      }

      resolve({
        initResponse,
        toolsResponse,
        resourcesResponse,
        errorOutput
      });
    }, 2000);
  });
}

// Test both bundle and original
async function runTests() {
  console.log('Testing MCP Server Bundle\n');

  const bundleResults = await testMCPServer(BUNDLE_PATH, 'Bundle (.cjs)');
  const originalResults = await testMCPServer('./dist/index.js', 'Original (index.js)');

  console.log('\n━━━ Test Summary ━━━');
  console.log('Bundle tests passed:', bundleResults.toolsResponse ? '✅' : '❌');
  console.log('Original tests passed:', originalResults.toolsResponse ? '✅' : '❌');

  if (bundleResults.errorOutput || originalResults.errorOutput) {
    console.log('\n⚠️  Errors detected during testing');
  } else {
    console.log('\n✅ All tests passed!');
  }
}

runTests().catch(console.error);
```

**Customize:**
- Update `BUNDLE_PATH` to match your bundle filename
- Update original path if different from `./dist/index.js`

### Run Tests

```bash
# Test the bundle
node test-bundle.js

# Manual test
node dist/your-server.bundle.cjs
```

**What to verify:**
- ✅ Server starts without errors
- ✅ All tools are registered
- ✅ All resources are registered
- ✅ MCP protocol initialization works
- ✅ Tool execution works
- ✅ Same behavior as original build

---

## Troubleshooting

### Issue: "Cannot find module" errors

**Cause:** Some dependency not bundled properly

**Solution:**
```javascript
// In esbuild.config.js, mark it as external:
external: ['problematic-package']
```

Then ensure users have that package installed.

### Issue: "SyntaxError: Unexpected identifier"

**Cause:** Module format mismatch (ESM vs CommonJS)

**Solution:**
- Ensure `format: 'cjs'` in esbuild config
- Use `.cjs` file extension
- Check that `inject: ['./cjs-shim.js']` is present

### Issue: "import.meta is not defined"

**Cause:** ESM syntax in CommonJS bundle

**Solution:**
```javascript
// In esbuild.config.js:
inject: ['./cjs-shim.js'],
define: {
  'import.meta.url': 'import_meta_url',
}
```

### Issue: Bundle is very large (>50MB)

**Causes and solutions:**

1. **Unused dependencies bundled:**
   ```javascript
   // Add more aggressive tree-shaking
   treeShaking: true,
   external: ['large-unused-package']
   ```

2. **Source maps included:**
   ```javascript
   sourcemap: false, // Ensure this is false
   ```

3. **License comments:**
   ```javascript
   legalComments: 'none', // Strip comments
   ```

### Issue: Memory errors during obfuscation

**Cause:** Bundle too large for aggressive obfuscation

**Solution:**
Disable obfuscation in `scripts/obfuscate.js`. esbuild's minification is usually sufficient:

```javascript
// Just do post-processing, no obfuscation
// (See the provided obfuscate.js script)
```

### Issue: Tool auto-discovery doesn't work

**Expected:** This is intentional! Bundle uses manual registration.

**Solution:** Make sure `src/index.bundle.ts` imports and registers all tools:
```typescript
import AllYourTools from './tools/...';
const tools = [new Tool1(), new Tool2(), ...];
serverAny.toolsMap = new Map(tools.map(t => [t.name, t]));
```

### Issue: "Server does not support tools" error

**Symptoms:**
```
Error: Server does not support tools (required for tools/list)
Capabilities detected: {}
```

**Cause:** The bundle is trying to load tools from the filesystem, but when running in isolation (without the dist/ directory), it finds no tools. The mcp-framework's `start()` method overwrites any manually populated maps and detects empty capabilities.

**Solution:** Override the loader methods in `src/index.bundle.ts`:

```typescript
// CRITICAL: Override loaders to prevent filesystem loading
const serverAny = server as any;

// Override loadTools to return bundled tools
serverAny.toolLoader.loadTools = async () => {
  return tools;
};

// Override hasTools to enable tools capability
serverAny.toolLoader.hasTools = async () => {
  return tools.length > 0;
};

// Do the same for resources if you have them
serverAny.resourceLoader.loadResources = async () => {
  return resources;
};

serverAny.resourceLoader.hasResources = async () => {
  return resources.length > 0;
};
```

**Testing the fix:**
```bash
# Test bundle in isolation (no dist directory)
mkdir /tmp/test-bundle && cp dist/your-server.bundle.cjs /tmp/test-bundle/
cd /tmp/test-bundle && node your-server.bundle.cjs
# Should start successfully with capabilities detected
```

**Why this happens:**
1. mcp-framework's `start()` method calls `await toolLoader.loadTools()`
2. Without the override, this tries to load from `dist/tools/` directory
3. In a bundle-only environment, this directory doesn't exist
4. `loadTools()` returns empty array, `detectCapabilities()` returns `{}`
5. SDK Server refuses to register handlers without capabilities

---

## Distribution

### For Commercial Embedding

**Ship just the bundle:**
```
your-app/
├── lib/
│   └── your-server.bundle.cjs  # Single file, no dependencies!
└── package.json
```

**Usage in another project:**
```javascript
import { spawn } from 'child_process';

// Start the bundled MCP server
const server = spawn('node', ['./lib/your-server.bundle.cjs']);

// Communicate via stdio (JSON-RPC)
server.stdin.write(JSON.stringify(request) + '\n');
```

### For npm Distribution

**Use the original dev build:**
```bash
npm publish
# Users get multi-file build with node_modules
```

Don't publish the bundle - it's for embedding only.

### For GitHub Releases

**Attach bundle as release asset:**
```bash
# Create release with bundle
gh release create v1.0.0 \
  dist/your-server.bundle.cjs \
  --title "Release v1.0.0" \
  --notes "See CHANGELOG.md"
```

Users download single `.cjs` file without cloning repo.

---

## Summary Checklist

Use this checklist when implementing bundling for a new MCP server:

- [ ] Install esbuild and javascript-obfuscator
- [ ] Create `src/index.bundle.ts` with manual tool registration
- [ ] List ALL tools in index.bundle.ts
- [ ] List ALL resources in index.bundle.ts (if any)
- [ ] Create `cjs-shim.js` for CommonJS compatibility
- [ ] Create `esbuild.config.js` with CommonJS format
- [ ] Update output filename in esbuild config
- [ ] Create `scripts/obfuscate.js` for post-processing
- [ ] Update filename in obfuscate.js
- [ ] Add build scripts to package.json
- [ ] Update .gitignore to exclude bundle
- [ ] Create test-bundle.js script
- [ ] Run `npm run build:bundle`
- [ ] Run `node test-bundle.js`
- [ ] Verify all tools are registered
- [ ] Test tool execution
- [ ] Compare with original build
- [ ] Document bundle usage for your project
- [ ] Add bundle to releases (optional)

---

## Quick Reference Commands

```bash
# Install dependencies
npm install --save-dev esbuild javascript-obfuscator

# Build dev version (multi-file)
npm run build

# Build production bundle (single-file)
npm run build:bundle

# Build both
npm run build:all

# Test bundle
node test-bundle.js

# Check bundle size
ls -lh dist/*.bundle.cjs

# Run bundle directly
node dist/your-server.bundle.cjs

# Make bundle executable
chmod +x dist/your-server.bundle.cjs
./dist/your-server.bundle.cjs
```

---

## Additional Resources

- [esbuild Documentation](https://esbuild.github.io/)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [mcp-framework Documentation](https://github.com/QuantGeekDev/mcp-framework)
- [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator)

---

## License

This bundling approach is framework-agnostic and can be used with any MCP server project.

---

**Last Updated:** 2025-11-10
**Tested With:** mcp-framework 0.2.15, esbuild 0.27.0, Node.js 18+
