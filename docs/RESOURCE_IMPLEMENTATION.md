# MCP Resource Implementation: Authentication Status

## Overview

This document describes the implementation of the `auth-status` MCP resource for the Gmail MCP server. This resource provides LLMs with real-time information about authentication status and setup instructions.

## Implementation Details

### File Created

**Location**: `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-gmail/src/resources/auth-status.ts`

### Resource Specification

- **Name**: `auth-status`
- **URI**: `gmail://auth-status`
- **MIME Type**: `text/markdown`
- **Description**: Gmail authentication status and setup instructions

### How It Works

The resource implements the `MCPResource` interface from mcp-framework and provides a `read()` method that:

1. **Checks for credentials file** (`credentials.json`)
2. **Checks for token file** (`.credentials/token.json`)
3. **Attempts authentication** if token exists
4. **Fetches user profile** to verify authentication
5. **Returns appropriate content** based on state

### Authentication States

The resource detects three distinct states and provides tailored content for each:

#### 1. ✅ Authenticated

**Detected when**: Token exists and Gmail API call succeeds

**Content includes**:
- Confirmation of successful authentication
- User's email address
- List of all 17 available Gmail tools organized by category
- Brief description of each tool's capabilities

**Example output**:
```markdown
# Gmail Authentication Status

✅ **AUTHENTICATED**

You are currently authenticated with Gmail as: **user@example.com**

All Gmail tools are available and ready to use...
```

#### 2. ⚠️ Not Authenticated

**Detected when**: Credentials file exists but token doesn't or is invalid

**Content includes**:
- Clear explanation of the issue
- Step-by-step instructions to run `npm run auth`
- Explanation of what happens during authentication
- Where the token will be saved
- Link to detailed setup guides

**Example output**:
```markdown
# Gmail Authentication Status

⚠️ **NOT AUTHENTICATED**

## What's Wrong
The Gmail MCP server has OAuth credentials configured, but you haven't authenticated yet.

## How to Fix
Run this command in your terminal:
npm run auth
...
```

#### 3. ❌ Not Configured

**Detected when**: Credentials file doesn't exist

**Content includes**:
- Explanation that credentials are missing
- Complete step-by-step Google Cloud setup guide
- Instructions for creating OAuth credentials
- Where to place the credentials file
- Links to documentation

**Example output**:
```markdown
# Gmail Authentication Status

❌ **NOT CONFIGURED**

## What's Wrong
The Gmail MCP server is not configured with Google Cloud OAuth credentials.

## How to Fix
You need to set up Google Cloud credentials...
```

#### 4. ⚠️ Error State

**Detected when**: An error occurs during status check

**Content includes**:
- Error message
- Troubleshooting steps
- Links to documentation

## Technical Implementation

### Class Structure

```typescript
export default class AuthStatusResource extends MCPResource {
  override name = "auth-status";
  override description = "Gmail authentication status and setup instructions";
  override uri = "gmail://auth-status";
  override mimeType = "text/markdown";

  override async read(): Promise<ResourceContent[]>
  private getAuthenticatedMessage(userEmail: string): string
  private getNotAuthenticatedMessage(): string
  private getNotConfiguredMessage(): string
  private getErrorMessage(error: unknown): string
}
```

### Key Design Decisions

1. **Fast Checks First**: Check for file existence before attempting API calls
2. **Graceful Degradation**: Handle all error cases without crashing
3. **Markdown Format**: Returns formatted markdown for easy LLM consumption
4. **Single Source of Truth**: Uses same auth manager as tools
5. **Helpful Context**: Includes absolute paths and specific instructions

### Dependencies

- `mcp-framework` - Base MCPResource class
- `fs` - File system operations (existsSync)
- `path` - Path resolution
- `../auth/index.js` - Gmail authentication manager

## Auto-Discovery

The MCP framework automatically discovers and loads resources from the `src/resources/` directory. No manual registration is required.

When the server starts:
1. Framework scans `src/resources/` directory
2. Imports all `.ts` files
3. Instantiates classes that extend `MCPResource`
4. Registers them with the MCP server
5. Makes them available to all connected clients

## Usage by LLMs

MCP clients can access this resource to:

### Proactive Status Checking

Before attempting any Gmail operations:
```
LLM: Let me check authentication status...
[Reads gmail://auth-status resource]
LLM: You're authenticated as user@example.com. I can now help with Gmail tasks.
```

### Troubleshooting Guidance

When errors occur:
```
User: Why isn't this working?
LLM: Let me check the authentication status...
[Reads gmail://auth-status resource]
LLM: You need to authenticate. Run: npm run auth
```

### Feature Discovery

When users ask what's available:
```
User: What can you do with my Gmail?
LLM: Let me check what's available...
[Reads gmail://auth-status resource]
LLM: I have access to 17 Gmail tools including...
```

## Benefits

### For Users

- **Clear guidance** when setup is incomplete
- **No trial-and-error** - accurate status before operations
- **Better error messages** - LLMs can provide context-specific help
- **Reduced friction** - setup issues identified immediately

### For LLMs

- **Contextual awareness** of authentication state
- **Proactive problem-solving** before errors occur
- **Accurate capabilities** - know what tools are available
- **Better user guidance** - can walk users through setup

### For Developers

- **Centralized status logic** - single source of truth
- **Automatic updates** - reflects real authentication state
- **No client configuration** - works out of the box
- **Maintainable** - all messages in one place

## Testing

### Manual Test

Run the included test to verify the resource works:

```bash
npx tsx test-resource.ts
```

Expected output:
- Resource properties (name, URI, etc.)
- Current authentication state
- Appropriate markdown content

### Integration Test

Start the MCP server and connect with an MCP client:

```bash
npm run build
node dist/index.js
```

The resource should be automatically available at `gmail://auth-status`.

## Future Enhancements

Possible additions to this implementation:

1. **Caching**: Cache authentication status for 30 seconds to avoid repeated API calls
2. **Token Expiry Info**: Include token expiration date when authenticated
3. **Scope Information**: Show which Gmail scopes are granted
4. **Quota Status**: Include Gmail API quota usage information
5. **Additional Resources**: Create separate resources for troubleshooting, setup guides, etc.

## Related Files

- **Source**: `src/resources/auth-status.ts`
- **Compiled**: `dist/resources/auth-status.js`
- **Documentation**: Updated in `README.md`
- **Auth Manager**: `src/auth/gmail-auth.ts` (used by resource)
- **Config**: `src/auth/config.ts` (used by resource)

## Documentation Updates

The following files were updated to document this feature:

### README.md

Added new section "MCP Resources" with:
- Resource URI and specifications
- Authentication states explained
- Use cases for LLMs
- Benefits and examples

Updated "Project Structure" to include:
- `src/resources/` directory
- `auth-status.ts` file

Updated "Features" section to mention:
- Authentication Status Resource as a key feature

## Conclusion

The auth-status resource provides a robust, user-friendly way for LLMs to understand and communicate Gmail authentication status. It leverages MCP's resource protocol to give AI assistants the context they need to guide users effectively through setup and troubleshooting.

The implementation is:
- ✅ Automatic - no configuration needed
- ✅ Fast - minimal API calls
- ✅ Reliable - handles all error cases
- ✅ Helpful - provides actionable guidance
- ✅ Maintainable - centralized message logic

This sets a pattern for future resources that could provide other types of contextual information to LLMs (quota status, rate limiting, feature flags, etc.).
