# Gmail MCP Server

A comprehensive Model Context Protocol (MCP) server that provides AI assistants with full access to Gmail functionality through 17 powerful tools.

## Overview

This MCP server enables AI assistants like Claude to interact with Gmail on your behalf, providing capabilities ranging from reading and sending emails to managing labels, filters, and account settings. Built with TypeScript and the mcp-framework, it offers secure OAuth 2.0 authentication with automatic token refresh.

## Features

### MCP Resources
- **Authentication Status Resource** - Provides real-time authentication status and setup instructions to LLMs

### 17 Gmail Tools Organized by Category

#### Essential Tools (Email Core)
- **listMessages** - List messages with filters (labels, queries)
- **getMessage** - Read full message content with multiple format options
- **searchMessages** - Advanced search using Gmail query syntax
- **sendEmail** - Send emails with HTML support, CC/BCC, and attachments

#### Standard Tools (Email Management)
- **getThread** - Retrieve complete conversation threads
- **createDraft** - Create email drafts for later editing
- **sendDraft** - Send previously created drafts
- **modifyMessage** - Modify message labels (read/unread, star, archive)
- **listLabels** - List all system and custom labels
- **createLabel** - Create custom labels with colors
- **getAttachment** - Download and save email attachments

#### Advanced Tools (Automation & Settings)
- **listFilters** - List all email filters
- **createFilter** - Create automated email filters
- **getSettings** - Retrieve account settings
- **updateSignature** - Update email signature
- **setVacationResponder** - Configure vacation/auto-reply settings
- **batchModify** - Bulk modify up to 1000 messages at once

## Prerequisites

- **Node.js 18+** - Required runtime environment
- **Google Cloud Project** - Free to create at [console.cloud.google.com](https://console.cloud.google.com/)
- **Gmail API Enabled** - Must be enabled in your Google Cloud project
- **OAuth 2.0 Credentials** - Desktop app credentials from Google Cloud Console

## Quick Start

Get up and running in 5 minutes:

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Set Up Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API" and click "Enable"
4. Configure OAuth consent screen:
   - Choose "External" user type
   - Fill in app information
   - Add yourself as a test user
5. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as application type
   - Download the JSON file
6. Save as `credentials.json` in the project root

**Need help?** See [AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md) for detailed setup instructions with screenshots and troubleshooting.

### 4. Authenticate with Gmail

**Important:** Run this command before starting the MCP server:

```bash
npm run auth
```

This will:
- Open your browser for Google sign-in
- Request Gmail permissions
- Save your authentication token to `.credentials/token.json`
- Verify Gmail API access

**First-time authentication is required!** The MCP server cannot access Gmail without this step.

After successful authentication, you'll see:
```
✅ Authentication complete!
Your token has been saved to .credentials/token.json
You can now start the MCP server with: npm start
```

**Authentication happens once.** The token is automatically refreshed, so you won't need to authenticate again unless you revoke access.

### 5. Configure Your MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-gmail/dist/index.js"],
      "env": {}
    }
  }
}
```

## Configuration

### Option 1: Credentials File (Recommended for Development)

Place `credentials.json` in the project root:

```json
{
  "installed": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost:3000/oauth2callback"]
  }
}
```

### Option 2: Environment Variables (Recommended for Production)

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"
```

Or create a `.env` file (see `.env.example`):

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

## Usage Examples

### Common Workflows

#### Read Recent Emails

```typescript
// List 10 most recent unread emails
gmail_list_messages({
  maxResults: 10,
  labelIds: ["UNREAD"]
})

// Read a specific message
gmail_read_message({
  messageId: "18f2d3e4b5c6a7d8",
  format: "simple"
})
```

#### Search for Emails

```typescript
// Find emails from a specific sender
gmail_search_messages({
  query: "from:example@gmail.com",
  maxResults: 20
})

// Find unread emails with attachments
gmail_search_messages({
  query: "is:unread has:attachment",
  includeBody: true
})

// Find emails in date range
gmail_search_messages({
  query: "after:2024/01/01 before:2024/12/31 subject:invoice"
})
```

#### Send Emails

```typescript
// Send a simple email
gmail_send_email({
  to: "recipient@example.com",
  subject: "Hello from Gmail MCP",
  body: "This is a test email sent via the Gmail MCP server."
})

// Send HTML email with CC and attachments
gmail_send_email({
  to: "recipient@example.com",
  cc: "cc@example.com",
  subject: "Report with Attachments",
  body: "<h1>Monthly Report</h1><p>Please see attached files.</p>",
  isHtml: true,
  attachments: [
    { filename: "report.pdf", path: "/path/to/report.pdf" }
  ]
})
```

#### Manage Messages

```typescript
// Mark message as read
gmail_modify_message({
  messageId: "18f2d3e4b5c6a7d8",
  removeLabelIds: ["UNREAD"]
})

// Archive and star a message
gmail_modify_message({
  messageId: "18f2d3e4b5c6a7d8",
  addLabelIds: ["STARRED"],
  removeLabelIds: ["INBOX"]
})

// Bulk archive 100 messages
gmail_batch_modify({
  messageIds: ["id1", "id2", "id3", ...],
  removeLabelIds: ["INBOX"]
})
```

#### Work with Drafts

```typescript
// Create a draft
gmail_create_draft({
  to: "recipient@example.com",
  subject: "Draft Email",
  body: "This will be saved as a draft."
})

// Send the draft later
gmail_send_draft({
  draftId: "r-1234567890"
})
```

## Available Tools Summary

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `gmail_list_messages` | List messages with filters | `maxResults`, `query`, `labelIds` |
| `gmail_read_message` | Read full message content | `messageId`, `format` |
| `gmail_search_messages` | Search using Gmail syntax | `query`, `maxResults`, `includeBody` |
| `gmail_send_email` | Send email with attachments | `to`, `subject`, `body`, `attachments` |
| `gmail_get_thread` | Get conversation thread | `threadId` |
| `gmail_create_draft` | Create email draft | `to`, `subject`, `body` |
| `gmail_send_draft` | Send draft | `draftId` |
| `gmail_modify_message` | Modify message labels | `messageId`, `addLabelIds`, `removeLabelIds` |
| `gmail_list_labels` | List all labels | None |
| `gmail_create_label` | Create custom label | `name`, `color` |
| `gmail_get_attachment` | Download attachment | `messageId`, `attachmentId`, `outputPath` |
| `gmail_list_filters` | List email filters | None |
| `gmail_create_filter` | Create email filter | `criteria`, `action` |
| `gmail_get_settings` | Get account settings | None |
| `gmail_update_signature` | Update signature | `signature`, `sendAsEmail` |
| `gmail_set_vacation` | Set vacation responder | `enableAutoReply`, `responseSubject`, `responseBodyPlainText` |
| `gmail_batch_modify` | Bulk modify messages | `messageIds`, `addLabelIds`, `removeLabelIds` |

For detailed tool documentation, see [TOOLS_REFERENCE.md](./TOOLS_REFERENCE.md).

## MCP Resources

### Authentication Status Resource

This server provides an MCP resource that gives LLMs contextual information about authentication status:

**Resource URI**: `gmail://auth-status`
**MIME Type**: `text/markdown`
**Description**: Real-time authentication status and setup instructions

The resource automatically detects your authentication state and provides:

- **✅ Authenticated**: Confirms successful authentication, shows the authenticated email address, and lists all available tools
- **⚠️ Not Authenticated**: Provides step-by-step instructions to run `npm run auth` and complete OAuth flow
- **❌ Not Configured**: Guides you through creating Google Cloud credentials and initial setup

#### Why This Matters

MCP resources provide contextual information to LLMs, enabling them to:
- Proactively check if authentication is needed before attempting tool operations
- Guide users through setup without trial-and-error
- Provide accurate troubleshooting steps based on actual authentication state
- Understand what tools are available once authenticated

#### How LLMs Use This Resource

When an MCP client (like Claude Desktop) connects to this server, the LLM can read the `gmail://auth-status` resource to understand the current state. For example:

- **Before attempting to send email**: Check if authenticated
- **When user asks "Can you access my Gmail?"**: Read the resource to give accurate status
- **After authentication errors**: Consult the resource for troubleshooting guidance

The resource is automatically available to all MCP clients - no configuration needed!

## Architecture

### Project Structure

```
mcp-gmail/
├── src/
│   ├── auth/              # OAuth 2.0 authentication
│   │   ├── gmail-auth.ts  # Main auth manager
│   │   ├── config.ts      # Config loader
│   │   ├── index.ts       # Public exports
│   │   └── example.ts     # Auth test example
│   ├── tools/             # 17 Gmail MCP tools
│   │   ├── send-email.ts
│   │   ├── list-messages.ts
│   │   ├── search-messages.ts
│   │   └── ...            # 14 more tools
│   ├── resources/         # MCP resources
│   │   └── auth-status.ts # Authentication status resource
│   ├── utils/             # Shared utilities
│   │   ├── mime-builder.ts    # MIME message builder
│   │   ├── message-parser.ts  # Message parser
│   │   ├── attachment.ts      # Attachment handler
│   │   └── error-handler.ts   # Error handler
│   └── index.ts           # MCP server entry point
├── dist/                  # Compiled JavaScript (gitignored)
├── .credentials/          # OAuth tokens (gitignored)
│   └── token.json         # Refresh token storage
├── credentials.json       # OAuth credentials (gitignored)
├── package.json           # Project metadata
└── tsconfig.json          # TypeScript config
```

### Key Components

- **MCP Framework**: Built on `mcp-framework` for standardized tool definitions
- **Gmail API**: Uses official `googleapis` library
- **OAuth 2.0**: Secure authentication with token persistence and auto-refresh
- **TypeScript**: Full type safety and modern JavaScript features
- **Zod Schemas**: Runtime validation for all tool inputs

## Documentation

### Getting Started
- **[QUICKSTART.md](./docs/QUICKSTART.md)** - 5-minute setup guide
- **[AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md)** - Comprehensive OAuth 2.0 setup guide with troubleshooting

### Technical Documentation
- **[LOGIN_FLOW.md](./docs/LOGIN_FLOW.md)** - Technical deep-dive into authentication flow and token management
- **[TOOLS_REFERENCE.md](./docs/TOOLS_REFERENCE.md)** - Complete documentation for all 17 Gmail tools
- **[PROJECT_SUMMARY.md](./docs/PROJECT_SUMMARY.md)** - Architecture and implementation details

## Troubleshooting

### "Gmail OAuth credentials not configured!"

**Solution**: Ensure `credentials.json` exists in the project root, or set environment variables:
```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"
```

### "Access blocked: This app's request is invalid"

**Solution**:
1. Go to OAuth consent screen in Google Cloud Console
2. Add yourself as a test user under "Test users"
3. Verify Gmail API is enabled in "APIs & Services" > "Library"

### Token Expired or Invalid

**Solution**: Delete and re-authenticate:
```bash
rm .credentials/token.json
node dist/auth/example.js
```

### Port 3000 Already in Use

**Solution**: The OAuth callback uses port 3000. If occupied:
1. Stop the service using port 3000, or
2. Change the redirect URI in both Google Cloud Console and your credentials

### Permission Denied Errors

**Solution**: Ensure your OAuth consent screen has the required scopes:
- `https://www.googleapis.com/auth/gmail.modify` - Read, compose, send, and modify emails
- `https://www.googleapis.com/auth/gmail.settings.basic` - Manage basic settings

### Rate Limiting

Gmail API has usage quotas. If you hit rate limits:
- Wait a few minutes before retrying
- Reduce the frequency of requests
- Check your quota in Google Cloud Console
- Request quota increases if needed for production use

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Validate MCP

```bash
mcp validate
```

### Create Custom Tools

1. Create a new file in `src/tools/`:

```typescript
import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";

const MyToolSchema = z.object({
  param: z.string().describe("Parameter description")
});

export default class MyTool extends MCPTool {
  name = "gmail_my_tool";
  description = "Tool description";
  schema = MyToolSchema;

  async execute(input: MCPInput<this>) {
    const authManager = createGmailAuth();
    const gmail = await authManager.getGmailClient();

    // Your implementation
  }
}
```

2. Rebuild: `npm run build`
3. The tool is automatically discovered and registered

## Security

- OAuth tokens stored in `.credentials/` directory (gitignored)
- Credentials never committed to version control
- Automatic token refresh prevents expiration
- Fine-grained OAuth scopes limit access
- All API calls use authenticated Gmail client

### Security Best Practices

1. Never commit `credentials.json` or `.credentials/` directory
2. Use environment variables in production environments
3. Regularly review granted permissions in Google Account settings
4. Use test users during development
5. Request only the minimum required OAuth scopes

## Gmail API Quotas

Be aware of Gmail API usage limits:
- **250 quota units/user/second**
- **1,000,000,000 quota units/day** (per project)
- Most operations cost 5-25 units
- Batch operations are more efficient

Monitor usage in Google Cloud Console under "APIs & Services" > "Dashboard".

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

### Development Guidelines

- Follow existing code style and structure
- Add tests for new features
- Update documentation as needed
- Use TypeScript strict mode
- Validate with `mcp validate` before submitting

## License

MIT License - see LICENSE file for details

## Support

- **Gmail API Documentation**: https://developers.google.com/gmail/api
- **MCP Framework**: https://github.com/modelcontextprotocol/framework
- **Google OAuth 2.0**: https://developers.google.com/identity/protocols/oauth2
- **Issues**: Open an issue in the repository

## Acknowledgments

Built with:
- [mcp-framework](https://github.com/modelcontextprotocol/framework) - MCP server framework
- [googleapis](https://github.com/googleapis/google-api-nodejs-client) - Official Google APIs client
- [Zod](https://github.com/colinhacks/zod) - Schema validation
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

---

**Ready to integrate Gmail with AI?** Follow the [Quick Start](#quick-start) guide above!
