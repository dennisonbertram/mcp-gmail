# Bundle Capabilities Bug Fix - Summary Report

**Date:** November 10, 2025
**Reporter:** Claude (Sonnet 4.5)
**Status:** FIXED ✅

---

## The Bug

The bundled MCP server failed with "Server does not support tools" error when run without the `dist/` directory.

```
Error: Server does not support tools (required for tools/list)
Capabilities detected: {}
```

---

## Root Cause

The `mcp-framework`'s `start()` method:
1. Calls `await toolLoader.loadTools()` to load tools from `dist/tools/` directory
2. **Overwrites any manually populated toolsMap** with the result
3. When `dist/tools/` doesn't exist, returns empty array
4. Calls `detectCapabilities()` which finds no tools
5. SDK Server refuses to register handlers without capabilities

**Key insight:** Manual map population before `start()` gets overwritten!

---

## The Fix

Override the loader methods to return bundled tools instead of loading from filesystem:

```typescript
// src/index.bundle.ts

const tools = [new Tool1(), new Tool2(), ...];
const resources = [new Resource1(), ...];

const serverAny = server as any;

// CRITICAL: Override loaders to prevent filesystem loading
serverAny.toolLoader.loadTools = async () => tools;
serverAny.toolLoader.hasTools = async () => tools.length > 0;

serverAny.resourceLoader.loadResources = async () => resources;
serverAny.resourceLoader.hasResources = async () => resources.length > 0;

await server.start(); // Now uses our overridden methods
```

---

## Test Results

### Before Fix (FAILED)
```bash
$ cd /tmp/test-bundle && node gmail-mcp.bundle.cjs
[INFO] Capabilities detected: {}
[ERROR] Server does not support tools (required for tools/list)
```

### After Fix (SUCCESS)
```bash
$ cd /tmp/test-bundle && node gmail-mcp.bundle.cjs
[INFO] Capabilities detected: {"tools":{},"resources":{}}
[INFO] Tools (17): batchModify, createDraft, createFilter, ...
[INFO] Resources (1): gmail://auth-status
[INFO] Server running and ready.

✅ All 4 MCP protocol tests pass
✅ Bundle works identically to original
```

---

## Files Changed

1. **`src/index.bundle.ts`** (NEW) - Bundle entry point with loader overrides
2. **`docs/BUNDLING_GUIDE.md`** - Updated with fix documentation
3. **`docs/BUNDLE_CAPABILITIES_BUG_FIX.md`** (NEW) - Complete technical report

---

## Impact

### Before
- ❌ Bundle unusable without dist/ directory
- ❌ Single-file distribution impossible
- ❌ Commercial embedding broken

### After
- ✅ Bundle is completely self-contained
- ✅ Single file, no dependencies
- ✅ Works in any environment
- ✅ Ready for commercial distribution

---

## Distribution Ready

The bundle can now be distributed as a single file:

```bash
# Just ship this one file:
dist/gmail-mcp.bundle.cjs  # 13.6 MB

# Users run it with:
node gmail-mcp.bundle.cjs

# No npm install required
# No dist/ directory required
# No configuration needed
```

---

## Key Takeaway

When bundling MCP servers with mcp-framework:
- **Don't** manually populate toolsMap/resourcesMap (gets overwritten)
- **Do** override loader methods (loadTools, hasTools, loadResources, hasResources)
- **Always** test bundle in isolation without dist/ directory

---

## Documentation

- **Quick Reference:** This file
- **Technical Details:** `docs/BUNDLE_CAPABILITIES_BUG_FIX.md`
- **How-To Guide:** `docs/BUNDLING_GUIDE.md`
- **Test Suite:** `test-bundle.js`

---

**Status:** Production Ready ✅
**Next Steps:** Deploy and distribute single-file bundle
