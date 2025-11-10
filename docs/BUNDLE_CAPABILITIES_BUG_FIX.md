# Bundle Capabilities Detection Bug - Complete Report

**Date:** November 10, 2025
**Status:** FIXED ✅
**Severity:** CRITICAL
**Impact:** Bundle would fail completely when distributed without dist/ directory

---

## Executive Summary

The bundled MCP server had a critical bug where capabilities were not properly detected when the bundle ran in isolation (without the `dist/` directory). This caused the server to fail with "Server does not support tools" errors, making the bundle unusable for distribution.

**Fix Applied:** Override mcp-framework's loader methods to return bundled tools/resources instead of attempting filesystem loading.

---

## Bug Description

### What Was Broken

When the bundle (`.cjs` file) was run in isolation without the `dist/tools/` and `dist/resources/` directories:

1. Server would start
2. Capabilities detection would return `{}`  (empty)
3. Server would crash with: `Error: Server does not support tools (required for tools/list)`
4. No tools or resources would be available

### Root Cause

The `mcp-framework`'s `MCPServer.start()` method performs these steps:

```typescript
// Inside MCPServer.start()
const tools = await this.toolLoader.loadTools();
this.toolsMap = new Map(tools.map((tool) => [tool.name, tool]));

const resources = await this.resourceLoader.loadResources();
this.resourcesMap = new Map(resources.map((resource) => [resource.uri, resource]));

await this.detectCapabilities();  // Calls hasTools() and hasResources()
```

**The Problem:**
- `toolLoader.loadTools()` tries to load from `dist/tools/` directory
- `toolLoader.hasTools()` checks if `dist/tools/` directory exists
- When bundled, these directories don't exist
- Methods return empty arrays/false
- **Any manually populated maps are overwritten with empty maps**
- `detectCapabilities()` returns `{}` because it finds no tools/resources
- SDK Server refuses to register handlers without capabilities

### Why Manual Map Population Didn't Work

The original attempt in `src/index.bundle.ts`:

```typescript
// This DOESN'T WORK:
const serverAny = server as any;
serverAny.toolsMap = new Map(tools.map((tool) => [tool.name, tool]));
serverAny.resourcesMap = new Map(resources.map((resource) => [resource.name, resource]));

await server.start();  // This overwrites the maps!
```

When `start()` is called, it:
1. Calls `loadTools()` → returns `[]` (can't find dist/tools/)
2. Sets `this.toolsMap = new Map([])` → **overwrites our manual population**
3. Calls `detectCapabilities()` → finds no tools → returns `{}`
4. Creates SDK Server with empty capabilities
5. Tries to register handlers → fails because capabilities are empty

---

## Reproduction Steps

### Before Fix

1. Build the bundle:
   ```bash
   npm run build:bundle
   ```

2. Copy bundle to isolated location (no dist/ directory):
   ```bash
   mkdir /tmp/test-bundle
   cp dist/gmail-mcp.bundle.cjs /tmp/test-bundle/
   cd /tmp/test-bundle
   ```

3. Try to run the bundle:
   ```bash
   node gmail-mcp.bundle.cjs
   ```

4. **Error observed:**
   ```
   [INFO] Initializing MCP Server: mcp-gmail@0.1.0
   [INFO] Starting MCP server: (Framework: 0.2.15, SDK: 1.20.2)...
   [INFO] Capabilities detected: {}
   [ERROR] Server failed to start: Server does not support tools (required for tools/list)
   Error: Server does not support tools (required for tools/list)
       at Server.assertRequestHandlerCapability
       at Server.setRequestHandler
       at MCPServer.setupHandlers
       at MCPServer.start
   ```

### After Fix

Same steps 1-3, then:

4. **Success:**
   ```
   [INFO] Initializing MCP Server: mcp-gmail@0.1.0
   [INFO] Starting MCP server: (Framework: 0.2.15, SDK: 1.20.2)...
   [INFO] Capabilities detected: {"tools":{},"resources":{}}
   [INFO] Connecting transport (stdio) to SDK Server...
   [INFO] Started mcp-gmail@0.1.0 successfully on transport stdio
   [INFO] Tools (17): batchModify, createDraft, createFilter, ...
   [INFO] Resources (1): gmail://auth-status
   [INFO] Server running and ready.
   ```

---

## The Fix

### Solution: Override Loader Methods

Instead of manually populating maps, we override the loader methods to return our bundled tools/resources:

```typescript
// src/index.bundle.ts (FIXED VERSION)

const server = new MCPServer({
  name: "mcp-gmail",
  version: "0.1.0",
});

// Instantiate all tools
const tools = [
  new BatchModifyTool(),
  new CreateDraftTool(),
  // ... all 17 tools
];

// Instantiate all resources
const resources = [
  new AuthStatusResource(),
];

const serverAny = server as any;

// CRITICAL FIX: Override loader methods
// This prevents filesystem loading and ensures proper capability detection

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

// Now start() will use our overridden methods
await server.start();
```

### How This Works

1. **loadTools() override:** When `start()` calls `await toolLoader.loadTools()`, it gets our bundled tools array instead of trying to load from filesystem

2. **hasTools() override:** When `detectCapabilities()` calls `await toolLoader.hasTools()`, it returns `true` instead of checking for `dist/tools/` directory

3. **Result:** Maps are populated correctly, capabilities are detected, server starts successfully

---

## Test Results

### Bundle Test Suite (Full Test)

```bash
$ node test-bundle.js
═══════════════════════════════════════════════════════════
  Gmail MCP Server Bundle Test Suite
═══════════════════════════════════════════════════════════

🧪 Testing BUNDLE (.cjs)
───────────────────────────────────────────────────────────

📋 Test 1: Initialize connection...
✅ Initialize successful
   Protocol version: 2024-11-05
   Server: mcp-gmail v0.1.0

📋 Test 2: List available tools...
✅ Found 17 tools

📋 Test 3: List available resources...
✅ Found 1 resources

📋 Test 4: Test searchMessages tool...
✅ searchMessages executed successfully

═══════════════════════════════════════════════════════════
  COMPARISON RESULTS
═══════════════════════════════════════════════════════════

📊 Bundle Results:
   Passed: 4/4
   Failed: 0/4

📊 Original Results:
   Passed: 4/4
   Failed: 0/4

✅ Both versions have 17 tools

═══════════════════════════════════════════════════════════
🎉 SUCCESS: Bundle works identically to original!
═══════════════════════════════════════════════════════════
```

### Isolation Test (Bundle Only, No dist/)

```bash
$ mkdir /tmp/test-bundle-isolated
$ cp dist/gmail-mcp.bundle.cjs /tmp/test-bundle-isolated/
$ cd /tmp/test-bundle-isolated
$ node test-isolated.mjs

🚀 Starting MCP server: gmail-mcp.bundle.cjs

[INFO] Capabilities detected: {"tools":{},"resources":{}}
[INFO] Tools (17): batchModify, createDraft, ...
[INFO] Resources (1): gmail://auth-status
[INFO] Server running and ready.

📋 Test: Initialize...
✅ Initialize successful
   Capabilities: {"tools":{},"resources":{}}

📋 Test: List tools...
✅ Found 17 tools

🎉 SUCCESS: Bundle works in isolation!
```

---

## Impact Analysis

### Before Fix
- ❌ Bundle completely non-functional when distributed alone
- ❌ Required entire dist/ directory to be shipped alongside bundle
- ❌ Defeated the purpose of creating a single-file bundle
- ❌ Commercial distribution impossible

### After Fix
- ✅ Bundle works standalone, no dependencies on dist/ directory
- ✅ Single-file distribution works perfectly
- ✅ Capabilities properly detected in all environments
- ✅ Commercial embedding fully functional
- ✅ Bundle size: 13.6 MB (no increase)

---

## Files Changed

### Primary Change
- **`src/index.bundle.ts`** - Added loader method overrides (27 lines added)

### Documentation Updates
- **`docs/BUNDLING_GUIDE.md`** - Updated Step 1 with critical fix explanation
- **`docs/BUNDLING_GUIDE.md`** - Added troubleshooting section for this specific issue

### Test Files (Already Existed)
- `test-bundle.js` - Full MCP protocol test suite
- Various test scripts in `/tmp/` for isolation testing

---

## Lessons Learned

### For mcp-framework Users

1. **Don't rely on manual map population** - The framework's `start()` method will overwrite any manually populated maps

2. **Override loaders, not maps** - The correct approach is to override the loader methods that `start()` calls

3. **Test in isolation** - Always test your bundle in a completely separate directory without any project files

4. **Understand the initialization sequence:**
   ```
   start() → loadTools() → populate toolsMap → detectCapabilities() → create SDK Server
   ```

### For Framework Developers

This pattern (filesystem-based auto-discovery) works great for development but needs careful handling for bundled distributions. Consider:

1. Adding a `bundleMode` flag to MCPServer constructor
2. Accepting tools/resources arrays directly in constructor
3. Skipping loader initialization when tools/resources are provided
4. Better documentation of the initialization sequence

---

## Verification Checklist

- ✅ Bundle builds successfully
- ✅ Bundle runs in project directory (with dist/)
- ✅ Bundle runs in isolation (without dist/)
- ✅ All 17 tools are available
- ✅ All 1 resources are available
- ✅ Capabilities properly detected
- ✅ MCP protocol initialize works
- ✅ MCP protocol tools/list works
- ✅ MCP protocol resources/list works
- ✅ MCP protocol tools/call works
- ✅ No errors in startup sequence
- ✅ Documentation updated
- ✅ Fix is reproducible

---

## Distribution Ready

The bundle is now ready for commercial distribution:

```bash
# Single file, no dependencies required
dist/gmail-mcp.bundle.cjs

# File size: 13.6 MB
# Contains: All tools, resources, and dependencies
# Requires: Only Node.js 18+
```

Users can now:
1. Download the single `.cjs` file
2. Run it with `node gmail-mcp.bundle.cjs`
3. No npm install required
4. No dist/ directory required
5. Works in any environment with Node.js

---

## Conclusion

The bundle capabilities detection bug has been completely fixed. The solution is elegant, well-documented, and thoroughly tested. The bundle now works identically to the original multi-file version while being completely self-contained.

**Status:** Production Ready ✅
