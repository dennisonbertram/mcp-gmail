// src/resources/auth-status.ts
// MCP Resource that provides Gmail authentication status and setup instructions

import { MCPResource } from "mcp-framework";
import { createGmailAuth } from "../auth/index.js";
import { existsSync } from "fs";
import { resolve } from "path";

export default class AuthStatusResource extends MCPResource {
  override name = "auth-status";
  override description = "Gmail authentication status and setup instructions";
  override uri = "gmail://auth-status";
  override mimeType = "text/markdown";

  override async read() {
    try {
      // Check if credentials exist
      const credsPath = resolve(process.cwd(), "credentials.json");
      const hasCredentials = existsSync(credsPath);

      // Check if token exists
      const tokenPath = resolve(process.cwd(), ".credentials/token.json");
      const hasToken = existsSync(tokenPath);

      // Try to verify authentication
      let isAuthenticated = false;
      let userEmail = "";

      if (hasToken) {
        try {
          const authManager = createGmailAuth();
          const gmail = await authManager.getGmailClient();
          const profile = await gmail.users.getProfile({ userId: "me" });
          isAuthenticated = true;
          userEmail = profile.data.emailAddress || "";
        } catch (error) {
          isAuthenticated = false;
        }
      }

      // Generate appropriate message based on authentication state
      let content = "";

      if (isAuthenticated) {
        content = this.getAuthenticatedMessage(userEmail);
      } else if (hasCredentials && !hasToken) {
        content = this.getNotAuthenticatedMessage();
      } else {
        content = this.getNotConfiguredMessage();
      }

      return [{
        uri: this.uri,
        mimeType: this.mimeType,
        text: content
      }];
    } catch (error) {
      return [{
        uri: this.uri,
        mimeType: this.mimeType,
        text: this.getErrorMessage(error)
      }];
    }
  }

  private getAuthenticatedMessage(userEmail: string): string {
    return `# Gmail Authentication Status

✅ **AUTHENTICATED**

You are currently authenticated with Gmail as: **${userEmail}**

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

Use these tools to help the user manage their Gmail account!`;
  }

  private getNotAuthenticatedMessage(): string {
    return `# Gmail Authentication Status

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

See AUTHENTICATION_GUIDE.md for detailed instructions.`;
  }

  private getNotConfiguredMessage(): string {
    return `# Gmail Authentication Status

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
${process.cwd()}/credentials.json
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

After setup, you'll have access to 17 Gmail tools for managing email!`;
  }

  private getErrorMessage(error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `# Gmail Authentication Status

⚠️ **ERROR CHECKING STATUS**

An error occurred while checking authentication status:

\`\`\`
${errorMessage}
\`\`\`

## Troubleshooting

1. Ensure the MCP server is running from the correct directory
2. Check that credentials.json exists (if you have it)
3. Try running: \`npm run auth\`
4. See AUTHENTICATION_GUIDE.md for detailed troubleshooting

If problems persist, check the server logs for more details.`;
  }
}
