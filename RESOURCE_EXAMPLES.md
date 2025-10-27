# Auth Status Resource - Example Outputs

This document shows example outputs from the `gmail://auth-status` resource in different authentication states.

## State 1: Authenticated ✅

When credentials exist, token is valid, and authentication succeeds:

```markdown
# Gmail Authentication Status

✅ **AUTHENTICATED**

You are currently authenticated with Gmail as: **user@example.com**

All Gmail tools are available and ready to use. You can:
- List and read messages
- Send emails
- Create drafts
- Manage labels
- Configure filters
- And more!

---

## Available Tools

This MCP server provides 17 Gmail tools:

**Essential:**
- gmail_list_messages - List emails with filters
- gmail_read_message - Read full message content
- gmail_search_messages - Search with Gmail query syntax
- gmail_send_email - Send emails with attachments

**Standard:**
- gmail_get_thread - Get conversation threads
- gmail_create_draft - Create email drafts
- gmail_send_draft - Send existing drafts
- gmail_modify_message - Modify message labels
- gmail_list_labels - List all labels
- gmail_create_label - Create custom labels
- gmail_get_attachment - Download attachments

**Advanced:**
- gmail_list_filters - List email filters
- gmail_create_filter - Create filter rules
- gmail_get_settings - Get Gmail settings
- gmail_update_signature - Update email signature
- gmail_set_vacation - Configure auto-reply
- gmail_batch_modify - Bulk operations

Use these tools to help the user manage their Gmail account!
```

## State 2: Not Authenticated ⚠️

When credentials.json exists but token doesn't or is invalid:

```markdown
# Gmail Authentication Status

⚠️ **NOT AUTHENTICATED**

## What's Wrong

The Gmail MCP server has OAuth credentials configured, but you haven't authenticated yet.

## How to Fix

Run this command in your terminal:

\`\`\`bash
npm run auth
\`\`\`

This will:
1. Open your browser to Google's authentication page
2. Ask you to sign in with your Google account
3. Request permission to access Gmail
4. Save an authentication token for future use

After authenticating, all Gmail tools will be available.

---

## What Happens During Authentication

When you run \`npm run auth\`, you'll see:
- A URL to visit (browser should open automatically)
- Google's sign-in page
- Permission request for Gmail access (read, send, modify)
- Confirmation message when complete

The authentication token will be saved to \`.credentials/token.json\` and automatically used by this MCP server.

## First Time Setup

If you don't have \`credentials.json\` yet, you'll need to:
1. Go to Google Cloud Console
2. Create a project and enable Gmail API
3. Create OAuth 2.0 credentials (Desktop app type)
4. Download credentials.json to the project root

See AUTHENTICATION_GUIDE.md for detailed instructions.
```

## State 3: Not Configured ❌

When credentials.json doesn't exist:

```markdown
# Gmail Authentication Status

❌ **NOT CONFIGURED**

## What's Wrong

The Gmail MCP server is not configured with Google Cloud OAuth credentials.

## How to Fix

You need to set up Google Cloud credentials before using this MCP server.

### Step 1: Create Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable the Gmail API
4. Configure OAuth consent screen (External type)
5. Add yourself as a test user
6. Create OAuth 2.0 Client ID (Desktop app type)
7. Download the credentials JSON file

### Step 2: Add Credentials to Project

Place the downloaded credentials file as:
\`\`\`
/Users/username/path/to/mcp-gmail/credentials.json
\`\`\`

### Step 3: Authenticate

Run in your terminal:
\`\`\`bash
npm run auth
\`\`\`

This will open your browser to authenticate with Google and save your access token.

---

## Need Help?

See the detailed setup guide:
- **AUTHENTICATION_GUIDE.md** - Complete setup walkthrough
- **QUICKSTART.md** - 5-minute quick start
- **README.md** - Project overview

After setup, you'll have access to 17 Gmail tools for managing email!
```

## State 4: Error ⚠️

When an unexpected error occurs:

```markdown
# Gmail Authentication Status

⚠️ **ERROR CHECKING STATUS**

An error occurred while checking authentication status:

\`\`\`
Error: Unable to access credentials directory
\`\`\`

## Troubleshooting

1. Ensure the MCP server is running from the correct directory
2. Check that credentials.json exists (if you have it)
3. Try running: \`npm run auth\`
4. See AUTHENTICATION_GUIDE.md for detailed troubleshooting

If problems persist, check the server logs for more details.
```

## How LLMs Can Use This

### Scenario 1: User asks "Can you check my email?"

```
LLM Process:
1. Read gmail://auth-status resource
2. Check authentication state from returned markdown
3. Respond appropriately:

If Authenticated:
  "Yes! I can access your Gmail account (user@example.com). What would you like me to do?"

If Not Authenticated:
  "I can't access your Gmail yet. You need to authenticate first by running: npm run auth"

If Not Configured:
  "The Gmail server isn't configured yet. You need to set up Google Cloud credentials first. Here's how..."
```

### Scenario 2: Tool call fails with auth error

```
LLM Process:
1. Tool returns authentication error
2. Read gmail://auth-status resource
3. Explain the issue based on current state
4. Provide specific next steps

Example response:
"I got an authentication error. Looking at the status, your token has expired.
Please run: npm run auth to authenticate again."
```

### Scenario 3: User asks "What can you do?"

```
LLM Process:
1. Read gmail://auth-status resource
2. Extract list of available tools
3. Present capabilities to user

Example response:
"I'm connected to your Gmail account (user@example.com) and can help you with:
- Reading and searching emails
- Sending emails with attachments
- Managing drafts
- Organizing with labels
- Setting up filters and auto-replies
- And much more! What would you like to do?"
```

## Resource Properties

- **URI**: `gmail://auth-status`
- **MIME Type**: `text/markdown`
- **Caching**: None (reads current state each time)
- **Size**: ~1-3 KB depending on state
- **Response Time**: ~50-200ms (includes Gmail API call when authenticated)

## Integration Notes

### For MCP Clients

The resource is automatically available once the server starts. No configuration needed.

To read it programmatically:
```typescript
const resource = await client.readResource('gmail://auth-status');
const content = resource.contents[0].text;
// Parse markdown content as needed
```

### For LLMs

The resource is designed to be read directly as markdown. The structure is:
1. Header with status emoji and text
2. Explanation section
3. Action items (how to fix)
4. Additional context and links

All information is formatted for easy extraction and natural language processing.

### For Users

You don't need to interact with this resource directly. It's provided for the LLM to understand the system state and guide you appropriately.

## Maintenance

To update the messages:
1. Edit `/Users/dennisonbertram/Develop/ModelContextProtocol/mcp-gmail/src/resources/auth-status.ts`
2. Modify the appropriate message method:
   - `getAuthenticatedMessage()` for authenticated state
   - `getNotAuthenticatedMessage()` for not authenticated state
   - `getNotConfiguredMessage()` for not configured state
   - `getErrorMessage()` for error state
3. Run `npm run build`
4. Restart the MCP server

The changes will be immediately available to all connected clients.
