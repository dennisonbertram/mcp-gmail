# Gmail MCP Server - Authentication Guide

A comprehensive guide to setting up OAuth 2.0 authentication for the Gmail MCP Server.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Authentication Flow](#authentication-flow)
5. [First-Time Authentication](#first-time-authentication)
6. [Token Management](#token-management)
7. [Troubleshooting](#troubleshooting)
8. [Security Best Practices](#security-best-practices)

---

## Overview

### What is OAuth 2.0?

OAuth 2.0 is an industry-standard protocol for authorization that enables applications to access Gmail on your behalf without ever seeing your Google password. When you authenticate:

1. Google verifies your identity
2. You explicitly grant permissions to the application
3. Google provides a secure token to access your Gmail
4. The application uses this token for all Gmail operations

### Why OAuth 2.0?

**Security Benefits:**
- Your Google password remains private
- You can revoke access anytime from Google Account settings
- Fine-grained permissions (only request what's needed)
- Automatic token expiration and refresh
- Audit trail of all granted permissions

**User Experience:**
- One-time browser authentication
- Automatic token refresh (no repeated logins)
- Works across devices with the same credentials
- Easy to revoke and re-grant access

### First-Time vs. Subsequent Usage

**First Time:**
- Run `npm run auth` command
- Browser opens for Google sign-in
- Grant permissions
- Token saved locally
- Ready to use!

**Subsequent Usage:**
- No browser interaction needed
- Token loaded automatically
- Automatic refresh when expired
- Seamless Gmail access

---

## Prerequisites

Before you begin, ensure you have:

### 1. Google Account
- Any Gmail account (personal or workspace)
- Access to [Google Cloud Console](https://console.cloud.google.com/)

### 2. Node.js Installation
- Node.js 18 or higher
- Verify: `node --version`

### 3. Gmail MCP Server
- Project cloned or downloaded
- Dependencies installed: `npm install`
- Project built: `npm run build`

---

## Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. **Navigate to Google Cloud Console**
   - Go to [console.cloud.google.com](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top
   - Click "New Project"
   - Enter project name: e.g., "Gmail MCP Server"
   - Click "Create"
   - Wait for project creation (takes a few seconds)

3. **Select Your Project**
   - Click the project dropdown again
   - Select your newly created project

### Step 2: Enable Gmail API

1. **Open API Library**
   - In the left sidebar, click "APIs & Services"
   - Click "Library"

2. **Find Gmail API**
   - In the search box, type "Gmail API"
   - Click on "Gmail API" in the results

3. **Enable the API**
   - Click the blue "Enable" button
   - Wait for activation (takes a few seconds)
   - You'll see "API enabled" confirmation

**Direct Link:** [Enable Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)

### Step 3: Configure OAuth Consent Screen

1. **Navigate to OAuth Consent Screen**
   - Click "APIs & Services" in left sidebar
   - Click "OAuth consent screen"

2. **Choose User Type**
   - Select "External" (available to any Google account)
   - Click "Create"

   **Note:** "Internal" is only available for Google Workspace organizations

3. **Fill in App Information**
   - **App name:** Gmail MCP Server (or your preferred name)
   - **User support email:** Your email address
   - **App logo:** (Optional - can skip)
   - **Developer contact email:** Your email address
   - Click "Save and Continue"

4. **Configure Scopes**
   - Click "Add or Remove Scopes"
   - The application will automatically request these scopes:
     - `gmail.modify` - Read, compose, and send emails
     - `gmail.compose` - Create and send emails
     - `gmail.settings.basic` - Manage basic mail settings
   - Click "Save and Continue"

5. **Add Test Users**
   - Click "Add Users"
   - Enter your Gmail address (the one you'll use for authentication)
   - Click "Add"
   - Click "Save and Continue"

   **Important:** While in testing mode, only listed test users can authenticate

6. **Review and Finish**
   - Review your settings
   - Click "Back to Dashboard"

### Step 4: Create OAuth 2.0 Credentials

1. **Navigate to Credentials**
   - Click "APIs & Services" in left sidebar
   - Click "Credentials"

2. **Create OAuth Client ID**
   - Click "Create Credentials" at the top
   - Select "OAuth client ID"

3. **Configure the OAuth Client**
   - **Application type:** Select "Desktop app"
   - **Name:** Gmail MCP Client (or your preferred name)
   - Click "Create"

4. **Download Credentials**
   - A dialog appears with your credentials
   - Click "Download JSON"
   - Save the file (it will be named something like `client_secret_xxx.json`)

### Step 5: Save Credentials File

1. **Rename the Downloaded File**
   - Rename it to exactly: `credentials.json`

2. **Move to Project Root**
   - Place `credentials.json` in your project's root directory
   - Same level as `package.json`
   - The path should be: `/path/to/mcp-gmail/credentials.json`

3. **Verify File Contents**
   ```json
   {
     "installed": {
       "client_id": "xxxxx.apps.googleusercontent.com",
       "project_id": "your-project-id",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
       "client_secret": "xxxxx",
       "redirect_uris": ["http://localhost"]
     }
   }
   ```

**Important:** The file is gitignored and will never be committed to version control.

---

## Authentication Flow

### Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Gmail MCP Authentication Flow                   │
└─────────────────────────────────────────────────────────────────────┘

    User                CLI                OAuth Helper         Browser            Google OAuth
     │                   │                      │                  │                    │
     │  npm run auth     │                      │                  │                    │
     ├──────────────────>│                      │                  │                    │
     │                   │                      │                  │                    │
     │                   │  authenticateUser()  │                  │                    │
     │                   ├─────────────────────>│                  │                    │
     │                   │                      │                  │                    │
     │                   │                      │  Start HTTP      │                    │
     │                   │                      │  Server on       │                    │
     │                   │                      │  random port     │                    │
     │                   │                      │  (50000-60000)   │                    │
     │                   │                      │                  │                    │
     │                   │                      │  Generate OAuth  │                    │
     │                   │                      │  URL             │                    │
     │                   │                      │                  │                    │
     │                   │                      │  Open browser    │                    │
     │                   │                      ├─────────────────>│                    │
     │                   │                      │                  │                    │
     │                   │                      │                  │  Navigate to       │
     │                   │                      │                  │  OAuth URL         │
     │                   │                      │                  ├───────────────────>│
     │                   │                      │                  │                    │
     │  Sign in to       │                      │                  │  Google Sign-In    │
     │  Google           │                      │                  │  Page              │
     │<──────────────────┼──────────────────────┼──────────────────┤                    │
     │                   │                      │                  │                    │
     │  Grant            │                      │                  │  Permissions       │
     │  Permissions      │                      │                  │  Consent Screen    │
     │<──────────────────┼──────────────────────┼──────────────────┤                    │
     │                   │                      │                  │                    │
     │                   │                      │                  │  Auth Code         │
     │                   │                      │  Redirect to     │<───────────────────┤
     │                   │                      │  localhost:port  │                    │
     │                   │                      │<─────────────────┤                    │
     │                   │                      │  /?code=xxx      │                    │
     │                   │                      │                  │                    │
     │                   │                      │  Exchange code   │                    │
     │                   │                      │  for tokens      │                    │
     │                   │                      ├────────────────────────────────────────>│
     │                   │                      │                  │                    │
     │                   │                      │  Access Token    │                    │
     │                   │                      │  + Refresh Token │                    │
     │                   │                      │<────────────────────────────────────────┤
     │                   │                      │                  │                    │
     │                   │                      │  Save tokens to  │                    │
     │                   │                      │  .credentials/   │                    │
     │                   │                      │  token.json      │                    │
     │                   │                      │                  │                    │
     │                   │                      │  Close HTTP      │                    │
     │                   │                      │  Server          │                    │
     │                   │                      │                  │                    │
     │                   │  Success! Token      │                  │                    │
     │                   │  Saved               │                  │                    │
     │<──────────────────┤<─────────────────────┤                  │                    │
     │                   │                      │                  │                    │
     │  ✓ Ready to use!  │                      │                  │                    │
     │                   │                      │                  │                    │
```

### Flow Summary

1. **User runs:** `npm run auth`
2. **System starts:** OAuth helper with random port (50000-60000)
3. **Browser opens:** Google OAuth consent page
4. **User signs in:** Enter Google credentials
5. **User grants:** Gmail permissions
6. **Google redirects:** To localhost with authorization code
7. **System exchanges:** Code for access + refresh tokens
8. **Tokens saved:** To `.credentials/token.json`
9. **HTTP server stops:** Cleanup complete
10. **Success!** Ready to use Gmail MCP Server

---

## First-Time Authentication

### Running the Authentication Command

Open your terminal in the project directory and run:

```bash
npm run auth
```

Or use the full command:

```bash
npm run build && node dist/cli/authenticate.js
```

### What to Expect

**Step 1: Command Output**
```
🔐 Gmail MCP Server - Authentication Setup

This will open your browser to authenticate with Google Gmail API.
Please sign in and grant the requested permissions.

Starting authentication flow...
```

**Step 2: Browser Opens Automatically**
- Your default browser will open
- You'll see the Google sign-in page
- The URL will be something like:
  ```
  https://accounts.google.com/o/oauth2/auth?client_id=...
  ```

**If Browser Doesn't Open:**
- The OAuth URL will be printed to the console
- Copy and paste it into your browser manually
- This is normal on some systems or remote servers

**Step 3: Google Sign-In**
- Sign in with your Google account
- Use the account you want to connect to Gmail MCP Server

**Step 4: OAuth Consent Screen**

You'll see a screen titled "Gmail MCP Server wants to access your Google Account"

**Permissions Requested:**
- **Read, compose, send, and permanently delete email**
  - Scope: `https://www.googleapis.com/auth/gmail.modify`
  - Why: Allows reading emails, creating drafts, sending emails, managing labels

- **Create and send email only**
  - Scope: `https://www.googleapis.com/auth/gmail.compose`
  - Why: Additional permission for composing and sending emails

- **Manage basic mail settings**
  - Scope: `https://www.googleapis.com/auth/gmail.settings.basic`
  - Why: Allows updating signature, vacation responder, filters

**Warning Messages:**

You may see: "Google hasn't verified this app"

This is normal! Click "Advanced" → "Go to Gmail MCP Server (unsafe)"

Why this happens:
- Your app is in testing mode
- Google verification requires publishing (not needed for personal use)
- This is safe for your own application

**Step 5: Grant Permissions**
- Review the permissions
- Click "Allow" or "Continue"
- You'll be redirected to `localhost` with a success message

**Step 6: Success Confirmation**

Browser shows:
```
✓ Authentication Successful!
You can close this window and return to the terminal.
```

Terminal shows:
```
✓ Authentication successful!

Testing Gmail API access...

✓ Gmail API access verified!

📧 Authenticated as: your.email@gmail.com
   Messages: 1,234
   Threads: 890

✅ Authentication complete!

Your token has been saved to .credentials/token.json
You can now start the MCP server with: npm start
```

### What Gets Saved

A file is created at: `.credentials/token.json`

```json
{
  "type": "authorized_user",
  "client_id": "xxxxx.apps.googleusercontent.com",
  "client_secret": "xxxxx",
  "refresh_token": "xxxxx"
}
```

**Important:**
- This file is gitignored (never committed)
- Contains your refresh token (long-lived)
- Used to automatically get new access tokens
- Keep this file secure

---

## Token Management

### Understanding Tokens

**Access Token:**
- Short-lived (1 hour)
- Used for actual Gmail API calls
- Automatically refreshed when expired
- Never stored (obtained from refresh token)

**Refresh Token:**
- Long-lived (doesn't expire unless revoked)
- Stored in `.credentials/token.json`
- Used to obtain new access tokens
- Never sent to Gmail API

### Automatic Token Refresh

The MCP server automatically handles token refresh:

```typescript
// When you use the Gmail client
const gmail = await authManager.getGmailClient();

// Behind the scenes:
// 1. Checks if access token exists
// 2. If expired, uses refresh token to get new access token
// 3. Returns ready-to-use Gmail client
// 4. No user interaction needed!
```

**Refresh happens automatically when:**
- Access token is expired (after ~1 hour)
- First API call after server restart
- Any Gmail API call with expired token

**You never need to:**
- Manually refresh tokens
- Re-authenticate (unless token revoked)
- Monitor token expiration

### Token Expiration

**Normal Expiration:**
- Access tokens expire after 1 hour
- Automatic refresh using refresh token
- No action required

**Refresh Token Expiration:**

Refresh tokens can expire or become invalid if:
1. User changes Google password
2. User revokes app access in Google Account
3. App unused for 6 months (Google policy)
4. Manual revocation

**What happens:**
- Next authentication attempt fails
- Error: "Token expired or revoked"
- Solution: Re-run `npm run auth`

### When Re-Authentication is Needed

You'll need to re-authenticate if:

1. **Token Revoked**
   - Manually revoked in Google Account settings
   - Solution: `npm run auth`

2. **Security Changes**
   - Changed Google password
   - Enabled 2FA
   - Solution: `npm run auth`

3. **Long Inactivity**
   - Haven't used app in 6+ months
   - Solution: `npm run auth`

4. **Corrupted Token**
   - `.credentials/token.json` modified or corrupted
   - Solution: Delete file and run `npm run auth`

### Revoking Access

**Method 1: Google Account Settings**
1. Go to [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
2. Find "Gmail MCP Server"
3. Click "Remove Access"

**Method 2: Programmatically**
```typescript
const authManager = createGmailAuth();
await authManager.revokeToken();
// Token revoked and file deleted
```

**Method 3: Delete Token File**
```bash
rm .credentials/token.json
# Next run will require re-authentication
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Gmail API not enabled"

**Error Message:**
```
Error: Gmail API has not been used in project xxxxx before or it is disabled.
```

**Solution:**
1. Go to [console.cloud.google.com/apis/library/gmail.googleapis.com](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
2. Ensure correct project is selected (top dropdown)
3. Click "Enable"
4. Wait 1-2 minutes for propagation
5. Try authentication again

**Quick Link:** [Enable Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)

---

#### 2. "redirect_uri_mismatch"

**Error Message:**
```
Error: redirect_uri_mismatch
The redirect URI in the request, http://localhost:XXXXX, does not match
```

**What happened:**
- OAuth callback server uses random port (50000-60000)
- Google Cloud Console credentials may have specific redirect URI

**Solution:**

The system automatically uses `http://localhost` which handles any port. If you still see this error:

1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", ensure you have:
   - `http://localhost`
   - (Or the specific port from error message)
4. Click "Save"
5. Wait 1-2 minutes
6. Try authentication again

---

#### 3. "Access blocked: This app isn't verified"

**Error Message:**
```
This app isn't verified
This app hasn't been verified by Google yet.
```

**Why this happens:**
- Your app is in testing mode
- Google verification requires publishing the app
- This is expected for personal use

**Solution:**
1. Click "Advanced" (small text at bottom left)
2. Click "Go to Gmail MCP Server (unsafe)"
3. This is safe - it's your own application
4. Continue with authentication

**To avoid this warning:**
- Add yourself as a test user in OAuth consent screen
- Or publish the app (requires Google verification - overkill for personal use)

---

#### 4. Browser doesn't open

**Symptoms:**
- Command runs but browser doesn't open
- Terminal shows OAuth URL

**Solutions:**

**Option A: Copy-Paste URL**
1. Terminal will display the OAuth URL
2. Copy the entire URL
3. Paste into your browser manually
4. Continue authentication normally

**Option B: Check Browser**
```bash
# macOS
open https://accounts.google.com/...

# Linux
xdg-open https://accounts.google.com/...

# Windows
start https://accounts.google.com/...
```

**Option C: Remote Server**
If running on remote server:
1. Copy the OAuth URL
2. Open on your local machine's browser
3. Complete authentication
4. Callback will fail (expected on remote)
5. Copy the authorization code from URL
6. Manual token exchange required (advanced)

---

#### 5. "Port already in use"

**Error Message:**
```
Error: Port 55669 is already in use by another process.
```

**What happened:**
- Random port selection collided with running service
- Rare but possible

**Solution:**

The system automatically tries different ports. If this persists:

```bash
# Find process using the port
lsof -i :55669

# Kill the process (if safe)
kill -9 <PID>

# Or just retry - new random port will be selected
npm run auth
```

---

#### 6. "Authentication timeout"

**Error Message:**
```
Error: Authentication timed out after 5 minutes. Please try again.
```

**What happened:**
- Took longer than 5 minutes from browser open to completing auth
- Callback server auto-closes after 5 minutes

**Solution:**
1. Re-run `npm run auth`
2. Complete authentication promptly
3. Don't navigate away from the consent screen
4. If consistently timing out, check internet connection

---

#### 7. "Gmail OAuth credentials not configured"

**Error Message:**
```
Gmail OAuth credentials not configured!
Please create credentials.json or set environment variables.
```

**Solution:**

**Check 1: File exists**
```bash
ls credentials.json
# Should show: credentials.json
```

**Check 2: File location**
- Must be in project root (same level as package.json)
- Not in subdirectory

**Check 3: File format**
```bash
cat credentials.json | grep client_id
# Should show client_id line
```

**Check 4: Environment variables (alternative)**
```bash
export GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="xxx"
export GOOGLE_REDIRECT_URI="http://localhost"
```

---

#### 8. "Invalid credentials format"

**Error Message:**
```
credentials.json does not contain 'installed' or 'web' credentials
```

**What happened:**
- Wrong type of credentials downloaded
- File might be corrupted

**Solution:**

1. **Re-download credentials:**
   - Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
   - Click the download icon (⬇️) next to your OAuth 2.0 Client ID
   - Save as `credentials.json`

2. **Verify format:**
   ```bash
   cat credentials.json
   ```
   Should contain either:
   ```json
   {
     "installed": { ... }
   }
   ```
   or
   ```json
   {
     "web": { ... }
   }
   ```

3. **Not these:**
   - ❌ API Key (just a string)
   - ❌ Service Account (different format)
   - ✅ OAuth 2.0 Client ID (correct)

---

#### 9. "Error 403: Access forbidden"

**Error Message:**
```
Error 403: Access denied
Please make sure you are a test user of the app
```

**Solution:**

1. Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
2. Scroll to "Test users"
3. Click "Add Users"
4. Add your Gmail address
5. Click "Save"
6. Try authentication again

---

#### 10. Token file permissions error

**Error Message:**
```
EACCES: permission denied, open '.credentials/token.json'
```

**Solution:**

```bash
# Fix directory permissions
chmod 755 .credentials

# Fix file permissions (if file exists)
chmod 644 .credentials/token.json

# If directory doesn't exist
mkdir -p .credentials
chmod 755 .credentials
```

---

### Getting More Help

**Debug Mode:**
```bash
# Enable debug logging
DEBUG=* npm run auth
```

**Check System:**
```bash
# Verify Node.js version
node --version  # Should be 18+

# Verify npm
npm --version

# Verify build
npm run build

# Test credentials file
cat credentials.json | json_pp  # Pretty print JSON
```

**Still stuck?**
1. Check [Gmail API Documentation](https://developers.google.com/gmail/api)
2. Review [LOGIN_FLOW.md](./LOGIN_FLOW.md) for technical details
3. Open an issue with error message and steps taken

---

## Security Best Practices

### 1. Credential Protection

**Never commit credentials:**
```bash
# Verify .gitignore includes:
credentials.json
.credentials/
token.json
```

**File permissions:**
```bash
# Restrict access to credentials
chmod 600 credentials.json
chmod 700 .credentials
```

**Environment variables (production):**
```bash
# Use environment variables in production
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
# Don't use credentials.json file in production
```

### 2. Token Security

**Storage:**
- Tokens stored in `.credentials/token.json`
- File is gitignored
- Restrict file permissions: `chmod 600 .credentials/token.json`

**Transmission:**
- All OAuth communication over HTTPS
- Tokens never sent in plaintext
- Local callback server only (no remote exposure)

**Revocation:**
- Review granted apps regularly: [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
- Revoke access if not using
- Re-authenticate when needed

### 3. Scope Minimization

**Current scopes:**
- `gmail.modify` - Full email access
- `gmail.compose` - Send emails
- `gmail.settings.basic` - Basic settings

**Why these scopes:**
- Required for MCP server functionality
- Follows principle of least privilege
- No access to non-Gmail services

**Alternative (read-only):**
If you only need to read emails, use:
- `gmail.readonly` - Read-only access
- Modify scopes in `src/auth/gmail-auth.ts`

### 4. Regular Security Audits

**Monthly checks:**
1. Review authorized apps: [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
2. Check for unfamiliar apps
3. Revoke unused access
4. Update credentials if compromised

**After security events:**
- Changed Google password? Re-authenticate
- Enabled 2FA? Re-authenticate
- Lost device? Revoke from Google Account

### 5. Development vs. Production

**Development:**
- Use `credentials.json` file
- Keep credentials local
- One developer = one credentials file
- Don't share credentials files

**Production:**
- Use environment variables
- Store in secure secret manager (AWS Secrets Manager, etc.)
- Rotate credentials regularly
- Monitor access logs

### 6. Test Users

**During development:**
- Add only necessary test users
- Remove test users when done
- Review test user list regularly

**Before publishing:**
- Complete OAuth verification with Google
- Provide privacy policy
- Provide terms of service

---

## Configuration Reference

### Environment Variables

```bash
# Required (if not using credentials.json)
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxxx"

# Optional (defaults shown)
GOOGLE_REDIRECT_URI="http://localhost"  # Handles any port
```

### Credentials File Format

**Location:** `credentials.json` in project root

**Desktop App Format:**
```json
{
  "installed": {
    "client_id": "xxxxx.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "xxxxx",
    "redirect_uris": ["http://localhost"]
  }
}
```

**Web App Format:**
```json
{
  "web": {
    "client_id": "xxxxx.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "xxxxx",
    "redirect_uris": ["http://localhost"],
    "javascript_origins": ["http://localhost"]
  }
}
```

### Token File Format

**Location:** `.credentials/token.json` (auto-generated)

```json
{
  "type": "authorized_user",
  "client_id": "xxxxx.apps.googleusercontent.com",
  "client_secret": "xxxxx",
  "refresh_token": "xxxxx"
}
```

---

## Next Steps

After successful authentication:

1. **Start the MCP Server**
   ```bash
   npm start
   ```

2. **Configure MCP Client**
   - See [README.md](./README.md) for Claude Desktop configuration
   - Add server to your MCP client configuration

3. **Test Gmail Tools**
   - Use any of the 17 Gmail tools
   - See [TOOLS_REFERENCE.md](./TOOLS_REFERENCE.md) for documentation

4. **Learn the Technical Details**
   - See [LOGIN_FLOW.md](./LOGIN_FLOW.md) for deep dive
   - Understand token refresh mechanism
   - Debug authentication issues

5. **Deploy to Production**
   - Use environment variables
   - Secure token storage
   - Monitor access logs

---

## Additional Resources

- **Gmail API Documentation:** [developers.google.com/gmail/api](https://developers.google.com/gmail/api)
- **OAuth 2.0 Guide:** [developers.google.com/identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2)
- **Google Cloud Console:** [console.cloud.google.com](https://console.cloud.google.com/)
- **Manage App Permissions:** [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
- **Technical Deep Dive:** [LOGIN_FLOW.md](./LOGIN_FLOW.md)
- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md)
- **Main Documentation:** [README.md](./README.md)

---

**Questions or issues?** Open an issue in the repository or consult the Gmail API documentation.
