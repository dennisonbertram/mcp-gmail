# Gmail OAuth Quick Start Guide

Get up and running with Gmail authentication in 5 minutes!

## Prerequisites

- Node.js installed
- Google account
- Project already built (`npm run build`)

## Step 1: Get Google OAuth Credentials (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search "Gmail API" and click "Enable"
4. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as application type
   - Download the JSON file
5. Save the downloaded file as `credentials.json` in the project root

## Step 2: Authenticate with Gmail (1 minute)

```bash
# Run the authentication command
npm run auth
```

This will:
1. Open your browser
2. Ask you to sign in to Google
3. Request permission to access Gmail
4. Save the token for future use (`.credentials/token.json`)
5. Test the Gmail API by fetching your profile

**First-time authentication is required!** Run this before starting the MCP server.

## Step 3: Start Using Gmail

The authentication is now set up! The token is stored in `.credentials/token.json` and will be automatically refreshed.

### In Your Code

```typescript
import { createGmailAuth } from './auth/index.js';

const authManager = createGmailAuth();
const gmail = await authManager.getGmailClient();

// Now use the Gmail API
const messages = await gmail.users.messages.list({
  userId: 'me',
  maxResults: 10,
});
```

### Example MCP Tools

Two example Gmail tools are included:

1. **gmail-list-messages.example.ts** - List and search messages
2. **gmail-send-email.example.ts** - Send emails

To enable them, rename to `.ts`:
```bash
cd src/tools
mv gmail-list-messages.example.ts gmail-list-messages.ts
mv gmail-send-email.example.ts gmail-send-email.ts
npm run build
```

## Configuration Options

### Option 1: Credentials File (Recommended for development)

Place `credentials.json` in project root:
```json
{
  "installed": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost:3000/oauth2callback"]
  }
}
```

### Option 2: Environment Variables (Recommended for production)

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"
```

## Troubleshooting

### "Gmail OAuth credentials not configured!"

Make sure `credentials.json` exists in the project root, or set the environment variables.

### "Access blocked: This app's request is invalid"

1. Go to OAuth consent screen in Google Cloud Console
2. Add yourself as a test user
3. Make sure Gmail API is enabled

### "Access blocked: This app isn't verified"

This is normal for apps in testing mode:
1. Click "Advanced" (small text at bottom left)
2. Click "Go to Gmail MCP Server (unsafe)"
3. This is safe - it's your own application
4. Continue with authentication

### Browser doesn't open

The OAuth URL will be printed to console. Copy and paste it into your browser manually.

### "Token expired or revoked"

Delete the token and re-authenticate:
```bash
rm .credentials/token.json
npm run auth
```

## Next Steps

- Read [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md) for comprehensive setup guide
- Check [LOGIN_FLOW.md](./LOGIN_FLOW.md) for technical deep-dive
- Review [TOOLS_REFERENCE.md](./TOOLS_REFERENCE.md) for all 17 Gmail tools
- Explore the [Gmail API documentation](https://developers.google.com/gmail/api)

## Helper Scripts

```bash
# Setup and validate credentials
./setup-auth.sh

# Build the project
npm run build

# Test authentication
node dist/auth/example.js

# Run tests
npm test
```

## File Structure

```
mcp-gmail/
├── credentials.json          # Your OAuth credentials (gitignored)
├── .credentials/
│   └── token.json           # Stored refresh token (gitignored)
├── src/
│   ├── auth/
│   │   ├── gmail-auth.ts    # Main auth manager
│   │   ├── config.ts        # Configuration loader
│   │   ├── index.ts         # Public exports
│   │   └── example.ts       # Test example
│   └── tools/
│       ├── gmail-list-messages.example.ts
│       └── gmail-send-email.example.ts
└── dist/                     # Compiled JavaScript (gitignored)
```

## Security Notes

- Never commit `credentials.json` or `.credentials/` directory
- Tokens are automatically refreshed
- Use environment variables in production
- Review granted permissions regularly

## Support

- Gmail API: https://developers.google.com/gmail/api
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Project Issues: Open an issue in the repository

---

**That's it!** You now have a fully functional Gmail OAuth 2.0 authentication system.
