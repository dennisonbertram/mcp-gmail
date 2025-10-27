# Gmail MCP Server

A Model Context Protocol (MCP) server providing AI assistants with comprehensive Gmail access through 17 powerful tools.

[![MCP](https://img.shields.io/badge/MCP-1.20.2-blue)](https://github.com/modelcontextprotocol)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Features

- **17 Gmail Tools**: Send, read, search, manage emails, drafts, labels, filters, and settings
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
4. Download and save as `credentials.json` in project root

📖 **Detailed setup**: See [docs/AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md)

### 3. Authenticate

```bash
npm run auth
```

This opens your browser to authenticate with Google and saves the token.

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
- Ensure `credentials.json` exists in project root
- Or set environment variables (see Configuration)

### "Access blocked: This app's request is invalid"
- Add yourself as test user in OAuth consent screen
- Verify Gmail API is enabled

### Token errors
```bash
rm .credentials/token.json
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

- OAuth tokens stored in `.credentials/` (gitignored)
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
