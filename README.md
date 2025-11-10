# Gmail MCP Server

A Model Context Protocol (MCP) server providing AI assistants with comprehensive Gmail access through 17 powerful tools.

[![MCP](https://img.shields.io/badge/MCP-1.20.2-blue)](https://github.com/modelcontextprotocol)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Features

- **17 Gmail Tools**: Send, read, search, manage emails, drafts, labels, filters, and settings
- **Markdown Export**: Automatically saves large result sets to grep-friendly markdown files
- **Secure OAuth 2.0**: Google authentication with automatic token refresh
- **MCP Resource**: Real-time authentication status for intelligent LLM interactions
- **Full TypeScript**: Type-safe with Zod schema validation
- **Production Ready**: Comprehensive error handling and Gmail API best practices

## Quick Start

### 1. Install

```bash
npm install
npm run build
```

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable the **Gmail API**
3. Create **OAuth 2.0 credentials** (Desktop app type)
4. Download and save as `credentials.json`:
   - **Recommended**: `~/.config/mcp-gmail/credentials.json` (works from any directory)
   - **Alternative**: Project root (backwards compatible)

📖 **Detailed setup**: See [docs/AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md)

### 3. Authenticate

```bash
npm run auth
```

This opens your browser to authenticate with Google and saves the token to `~/.config/mcp-gmail/token.json`.

### 4. Configure MCP Client

Add to your MCP client (e.g., Claude Desktop config):

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-gmail/dist/index.js"]
    }
  }
}
```

Or use the bin command after `npm link`:
```json
{
  "mcpServers": {
    "gmail": {
      "command": "mcp-gmail"
    }
  }
}
```

## Available Tools

### Essential Tools
- **sendEmail** - Send emails with HTML, CC/BCC, and attachments
- **searchMessages** - Search using Gmail query syntax
- **listMessages** - List messages with filters
- **getMessage** - Read full message content

### Email Management
- **getThread** - Get conversation threads
- **createDraft** / **sendDraft** - Draft management
- **modifyMessage** - Change labels (read/unread, star, archive)
- **batchModify** - Bulk operations (up to 1000 messages)
- **getAttachment** - Download attachments

### Organization
- **listLabels** / **createLabel** - Label management
- **listFilters** / **createFilter** - Email filter automation

### Settings
- **getSettings** - Account settings
- **updateSignature** - Email signature
- **setVacationResponder** - Auto-reply configuration

📖 **Full reference**: [docs/TOOLS_REFERENCE.md](./docs/TOOLS_REFERENCE.md)

## Usage Examples

### Search and Read Emails

```typescript
// Search for emails
await searchMessages({
  query: "from:example@gmail.com is:unread",
  maxResults: 10
});

// Read a message
await getMessage({
  messageId: "abc123",
  format: "full"
});
```

### Send Email

```typescript
await sendEmail({
  to: "recipient@example.com",
  subject: "Hello",
  body: "<h1>Test</h1><p>Email body</p>",
  isHtml: true,
  attachments: [
    { filename: "report.pdf", path: "/path/to/file.pdf" }
  ]
});
```

### Manage Messages

```typescript
// Mark as read and archive
await modifyMessage({
  messageId: "abc123",
  addLabelIds: ["STARRED"],
  removeLabelIds: ["UNREAD", "INBOX"]
});

// Bulk archive
await batchModify({
  messageIds: ["id1", "id2", "id3"],
  removeLabelIds: ["INBOX"]
});
```

## Markdown Export Feature

**By default**, `searchMessages`, `listMessages`, and `getThread` automatically save results to markdown files instead of returning data inline. This saves tokens and enables efficient parsing with grep/awk.

### Default Behavior

```typescript
// Results saved to ~/.mcp-gmail/exports/search-messages/YYYY-MM-DD-description.md
await searchMessages({
  query: "from:boss@company.com",
  outputDescription: "emails-from-boss"  // Optional, auto-generated if not provided
});

// Returns:
// {
//   success: true,
//   savedToFile: true,
//   filePath: "~/.mcp-gmail/exports/search-messages/2025-11-10-emails-from-boss.md",
//   count: 247,
//   format: "markdown"
// }
```

### Opt-In to Inline Results

Set `returnInline: true` to get results directly:

```typescript
await searchMessages({
  query: "is:unread",
  returnInline: true  // Get JSON response instead of file
});
```

### Grep-Friendly Format

Markdown files are structured for easy searching:

```bash
# Find all senders
grep "^**From:**" ~/.mcp-gmail/exports/search-messages/2025-11-10-emails.md

# Find emails with attachments
grep "^**Attachments:** Yes" ~/.mcp-gmail/exports/search-messages/*.md

# Count unread emails in a search
grep "^**Labels:**.*UNREAD" ~/.mcp-gmail/exports/search-messages/2025-11-10-*.md | wc -l

# Get full email by sender
grep -A 10 "^**From:** boss@company.com" ~/.mcp-gmail/exports/search-messages/*.md
```

### Export Directory Structure

```
~/.mcp-gmail/
  exports/
    search-messages/
      2025-11-10-emails-from-boss.md
      2025-11-10-unread-urgent.md
    list-messages/
      2025-11-10-inbox-last-week.md
    get-thread/
      2025-11-10-project-discussion.md
```

**Note**: Export files contain personal email data and are automatically excluded from version control via `.gitignore`.

## Authentication Resource

The server provides `gmail://auth-status` resource that LLMs can read to:
- Check authentication status before operations
- Guide users through setup
- Provide context-aware troubleshooting

## Project Structure

```
mcp-gmail/
├── src/
│   ├── tools/              # 17 Gmail tools
│   ├── resources/          # MCP resources (auth-status)
│   ├── auth/               # OAuth 2.0 flow
│   └── utils/              # MIME builder, parsers, error handling
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── dist/                   # Compiled output
```

## Configuration

### Credentials File (Development)

```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost"]
  }
}
```

### Environment Variables (Production)

```bash
export GOOGLE_CLIENT_ID="YOUR_CLIENT_ID"
export GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
export GOOGLE_REDIRECT_URI="http://localhost"
```

## Troubleshooting

### "OAuth credentials not configured"
- Ensure `credentials.json` exists in `~/.config/mcp-gmail/` or project root
- Or set environment variables (see Configuration)

### "Access blocked: This app's request is invalid"
- Add yourself as test user in OAuth consent screen
- Verify Gmail API is enabled

### Token errors
```bash
rm ~/.config/mcp-gmail/token.json
npm run auth
```

📖 **More help**: [docs/AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md)

## Documentation

- **[QUICKSTART.md](./docs/QUICKSTART.md)** - 5-minute setup guide
- **[AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md)** - OAuth setup with screenshots
- **[TOOLS_REFERENCE.md](./docs/TOOLS_REFERENCE.md)** - Complete API reference
- **[LOGIN_FLOW.md](./docs/LOGIN_FLOW.md)** - Technical authentication deep-dive

## Development

```bash
# Build
npm run build

# Test
npm test

# Validate MCP
mcp validate

# Lint
npm run lint
```

## Security

- OAuth tokens stored in `~/.config/mcp-gmail/` (user home directory)
- Automatic token refresh
- Fine-grained OAuth scopes
- Never commit `credentials.json`

## API Limits

Gmail API quotas:
- 250 quota units/user/second
- 1B quota units/day
- Monitor in Google Cloud Console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests and documentation
4. Submit a pull request

## License

MIT License

## Links

- **Gmail API**: https://developers.google.com/gmail/api
- **MCP Protocol**: https://modelcontextprotocol.io
- **Issues**: https://github.com/dennisonbertram/mcp-gmail/issues

---

Built with [mcp-framework](https://github.com/QuantGeekDev/mcp-framework), [googleapis](https://github.com/googleapis/google-api-nodejs-client), and TypeScript.
