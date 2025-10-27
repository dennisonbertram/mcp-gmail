# Quick Authentication Setup

This guide shows you how to authenticate with Gmail using the dedicated authentication script.

## Prerequisites

Before running authentication, you need OAuth credentials from Google Cloud:

### Option 1: Using credentials.json (Recommended for beginners)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Enable the Gmail API
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Desktop app" as application type
   - Download the JSON file
5. Save the downloaded file as `credentials.json` in the project root

### Option 2: Using Environment Variables

Set these environment variables:

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"
```

## Running Authentication

Once you have OAuth credentials configured, simply run:

```bash
npm run auth
```

This will:

1. **Build the project** (if not already built)
2. **Open your browser** to Google's login page
3. **Prompt you to sign in** to your Google account
4. **Request permissions** for Gmail access:
   - Read, compose, and send email
   - Manage labels and settings
   - Manage email filters
5. **Save the token** to `.credentials/token.json`
6. **Verify access** by fetching your Gmail profile

## What You'll See

### Successful Authentication

```
🔐 Gmail MCP Server - Authentication Setup

This will open your browser to authenticate with Google Gmail API.
Please sign in and grant the requested permissions.

Starting authentication flow...

✓ Authentication successful!

Testing Gmail API access...

✓ Gmail API access verified!

📧 Authenticated as: your-email@gmail.com
   Messages: 12,345
   Threads: 6,789

✅ Authentication complete!

Your token has been saved to .credentials/token.json
You can now start the MCP server with: npm start
```

### Browser Flow

When you run `npm run auth`, your default browser will open showing:

1. **Google Sign-In** - Sign in to your Google account
2. **Permission Request** - Review and accept the requested Gmail permissions
3. **Success Message** - Confirmation that authentication was successful

The browser window will automatically close, and the terminal will show success.

## Token Management

### Token Location
Your authentication token is saved to:
```
.credentials/token.json
```

This file contains:
- Access token (short-lived, ~1 hour)
- Refresh token (long-lived, automatically refreshes access token)

### Token Security
- The token file is automatically added to `.gitignore`
- Never commit this file to version control
- Keep it secure like a password

### Automatic Refresh
Once authenticated, the token is automatically refreshed when it expires. You don't need to re-authenticate manually unless:
- You revoke access in Google account settings
- You delete the token file
- The refresh token expires (rare, usually only if unused for 6 months)

## Re-Authentication

If you need to re-authenticate (e.g., with a different account):

1. Delete the token file:
   ```bash
   rm .credentials/token.json
   ```

2. Run authentication again:
   ```bash
   npm run auth
   ```

## Troubleshooting

### "Error: ENOENT: no such file or directory, open 'credentials.json'"

**Solution**: You haven't configured OAuth credentials yet. Follow the Prerequisites section above.

### "Error: invalid_client"

**Solution**: Your OAuth credentials are incorrect or expired. Re-download from Google Cloud Console.

### "Error: redirect_uri_mismatch"

**Solution**: Your redirect URI doesn't match what's configured in Google Cloud Console.

For Desktop app credentials, add this authorized redirect URI:
```
http://localhost:3000/oauth2callback
```

### Browser doesn't open

**Solution**: The authentication script will print a URL. Copy and paste it into your browser manually.

### "Error: access_denied"

**Solution**: You denied the permission request. Run `npm run auth` again and accept the permissions.

## After Authentication

Once authenticated successfully:

1. **Start the MCP Server**:
   ```bash
   npm start
   ```

2. **Or test individual tools** (after building):
   ```bash
   node dist/tools/list-messages.js
   ```

3. **Use with MCP clients** like Claude Desktop

## Need More Help?

- Full setup guide: See `QUICKSTART.md`
- Detailed OAuth info: See `AUTHENTICATION.md`
- All documentation: See `README.md`

## Security Reminder

⚠️ The authentication token grants full access to your Gmail account. Never:
- Commit the token file to version control
- Share the token with others
- Use in untrusted environments

The `.credentials/` directory is automatically gitignored to prevent accidental commits.
