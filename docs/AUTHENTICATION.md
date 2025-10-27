# Gmail OAuth 2.0 Authentication Guide

This guide explains how to set up and use the Gmail OAuth 2.0 authentication system for the MCP Gmail server.

## Overview

The authentication system handles:
- OAuth 2.0 authorization flow with Google
- Secure token storage and automatic refresh
- Support for both environment variables and credentials file
- Browser-based consent flow on first run

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type (unless you have a Google Workspace)
   - Fill in the required app information
   - Add your email as a test user
4. For Application type, choose "Desktop app"
5. Give it a name (e.g., "MCP Gmail Server")
6. Click "Create"
7. Download the JSON file

### Step 3: Configure Credentials

Choose **ONE** of the following methods:

#### Method 1: Credentials File (Recommended for local development)

1. Rename the downloaded JSON file to `credentials.json`
2. Place it in the project root directory (same level as `package.json`)

The file should look like this:
```json
{
  "installed": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost:3000/oauth2callback"],
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
  }
}
```

#### Method 2: Environment Variables (Recommended for production)

Set the following environment variables:

```bash
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"  # Optional, defaults to this
```

**Note:** Environment variables take priority over the credentials file.

## Usage

### Basic Usage

```typescript
import { createGmailAuth } from './auth/index.js';

// Create auth manager
const authManager = createGmailAuth();

// Get authenticated OAuth2 client
const auth = await authManager.getAuthClient();

// Or get Gmail API client directly
const gmail = await authManager.getGmailClient();

// Use the Gmail API
const response = await gmail.users.messages.list({
  userId: 'me',
  maxResults: 10,
});
```

### First Run

On the first run, the system will:
1. Check for existing stored token in `.credentials/token.json`
2. If not found, open your default browser
3. Prompt you to sign in to your Google account
4. Ask for permission to access your Gmail
5. Save the refresh token for future use

You'll see output like this:
```
=== Gmail Authentication Required ===
Opening browser for Google account authorization...
Please sign in and grant the requested permissions.

Authentication successful!
Token saved to /path/to/.credentials/token.json
```

### Subsequent Runs

On subsequent runs:
- The system loads the stored token from `.credentials/token.json`
- Automatically refreshes the access token if expired
- No browser interaction required

### Check Token Status

```typescript
const authManager = createGmailAuth();

// Check if valid token exists
const hasToken = await authManager.hasValidToken();
if (hasToken) {
  console.log('Already authenticated');
} else {
  console.log('Authentication required');
}
```

### Revoke Token / Logout

```typescript
const authManager = createGmailAuth();

// Revoke token and delete stored credentials
await authManager.revokeToken();
console.log('Logged out successfully');
```

## File Structure

```
mcp-gmail/
├── src/
│   └── auth/
│       ├── index.ts           # Main exports
│       ├── gmail-auth.ts      # Authentication manager
│       └── config.ts          # Configuration loader
├── .credentials/              # Token storage (gitignored)
│   └── token.json            # Stored refresh token
├── credentials.json          # OAuth credentials (gitignored)
└── AUTHENTICATION.md         # This file
```

## OAuth Scopes

The system requests the following Gmail API scopes:

- `https://www.googleapis.com/auth/gmail.modify` - Read, compose, send, and permanently delete email
- `https://www.googleapis.com/auth/gmail.compose` - Create and send email only
- `https://www.googleapis.com/auth/gmail.settings.basic` - Manage basic mail settings

These scopes provide full Gmail functionality while following the principle of least privilege.

## Security Notes

1. **Never commit credentials**: The `.gitignore` file is configured to exclude:
   - `credentials.json`
   - `.credentials/` directory
   - `token.json`

2. **Token storage**: Tokens are stored in `.credentials/token.json` with file system permissions

3. **Automatic refresh**: Access tokens are automatically refreshed using the stored refresh token

4. **Production deployment**: Use environment variables in production environments

## Troubleshooting

### "Gmail OAuth credentials not configured!"

**Solution**: You haven't set up credentials. Follow Step 3 above to configure either the credentials file or environment variables.

### "credentials.json does not contain 'installed' or 'web' credentials"

**Solution**: The credentials file format is incorrect. Make sure you downloaded the OAuth client credentials (not API key or service account) and it contains an "installed" or "web" object.

### "Stored token is invalid or expired"

**Solution**: The stored token has been revoked or is corrupted. Delete `.credentials/token.json` and run the application again to re-authenticate.

### Browser doesn't open during authentication

**Solution**: Check that port 3000 is not in use. You can modify the redirect URI in your credentials or environment variables to use a different port.

### "Access blocked: This app's request is invalid"

**Solution**:
1. Make sure the OAuth consent screen is properly configured
2. Add yourself as a test user in the OAuth consent screen settings
3. Ensure the Gmail API is enabled in your Google Cloud project

## API Reference

### `GmailAuthManager`

Main class for handling Gmail authentication.

#### Methods

- `getAuthClient(): Promise<OAuth2Client>` - Get authenticated OAuth2 client
- `getGmailClient(): Promise<gmail_v1.Gmail>` - Get Gmail API client instance
- `hasValidToken(): Promise<boolean>` - Check if valid token exists
- `revokeToken(): Promise<void>` - Revoke and delete stored token

### `createGmailAuth()`

Factory function to create a new `GmailAuthManager` instance.

```typescript
const authManager = createGmailAuth();
```

### `loadOAuthCredentials()`

Load OAuth credentials from environment variables or credentials file.

```typescript
const credentials = await loadOAuthCredentials();
// Returns: { client_id, client_secret, redirect_uri }
```

## Examples

### Example 1: Simple Email Fetch

```typescript
import { createGmailAuth } from './auth/index.js';

const authManager = createGmailAuth();
const gmail = await authManager.getGmailClient();

// Get latest 10 messages
const response = await gmail.users.messages.list({
  userId: 'me',
  maxResults: 10,
});

console.log('Messages:', response.data.messages);
```

### Example 2: Send Email

```typescript
import { createGmailAuth } from './auth/index.js';

const authManager = createGmailAuth();
const gmail = await authManager.getGmailClient();

const email = [
  'To: recipient@example.com',
  'Subject: Test Email',
  '',
  'This is a test email sent via Gmail API',
].join('\n');

const encodedEmail = Buffer.from(email)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

await gmail.users.messages.send({
  userId: 'me',
  requestBody: {
    raw: encodedEmail,
  },
});

console.log('Email sent successfully!');
```

### Example 3: Error Handling

```typescript
import { createGmailAuth } from './auth/index.js';

try {
  const authManager = createGmailAuth();
  const gmail = await authManager.getGmailClient();

  // Your Gmail API calls here...

} catch (error) {
  if (error.message.includes('credentials not configured')) {
    console.error('Please set up OAuth credentials first');
    console.error('See AUTHENTICATION.md for setup instructions');
  } else if (error.message.includes('invalid_grant')) {
    console.error('Token expired or revoked. Please re-authenticate.');
    // Delete token and retry
    await authManager.revokeToken();
    const gmail = await authManager.getGmailClient();
  } else {
    console.error('Error:', error.message);
  }
}
```

## Support

For issues related to:
- Google Cloud setup: [Google Cloud Support](https://cloud.google.com/support)
- Gmail API: [Gmail API Documentation](https://developers.google.com/gmail/api)
- This implementation: Open an issue in the project repository
