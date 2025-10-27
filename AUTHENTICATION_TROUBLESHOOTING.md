# Gmail MCP Authentication Troubleshooting Guide

## Quick Start

To authenticate with Gmail:

```bash
npm run auth
```

The script will:
1. Start a local OAuth server on port 3000
2. Print the OAuth URL to your console
3. Attempt to open your browser automatically
4. Wait for you to complete the authentication

## Common Issues and Solutions

### 1. Browser Doesn't Open Automatically

**Symptom**: Script says "Opening browser for authentication..." but nothing happens

**Solution**: Copy the URL from the console and paste it into your browser manually

The URL will be displayed like this:
```
If the browser does not open automatically, please visit this URL:

https://accounts.google.com/o/oauth2/v2/auth?...
```

**Why this happens**:
- You're using SSH to connect to a remote server
- You're using WSL (Windows Subsystem for Linux)
- Your system doesn't have a default browser configured
- The `open` package can't detect your browser

### 2. Port 3000 Already in Use

**Symptom**:
```
Error: Port 3000 is already in use by another process.
```

**Solution 1**: Kill the process using port 3000
```bash
# Find the process
lsof -i :3000

# Kill it (replace PID with the actual process ID)
kill -9 <PID>

# Try again
npm run auth
```

**Solution 2**: Change the redirect URI port
1. Edit your `credentials.json`:
   ```json
   {
     "installed": {
       "redirect_uris": ["http://localhost:3001/oauth2callback"]
     }
   }
   ```
2. Update the redirect URI in Google Cloud Console to match
3. Try again

### 3. Authentication Times Out

**Symptom**: After 5 minutes, script exits with timeout error

**Cause**: You didn't complete the OAuth flow within 5 minutes

**Solution**: Run the command again and complete the authentication faster
```bash
npm run auth
```

**Note**: The 5-minute timeout is a safety feature to prevent the script from hanging forever

### 4. "Invalid Redirect URI" Error

**Symptom**: Google shows an error about the redirect URI being invalid

**Cause**: The redirect URI in your `credentials.json` doesn't match what's configured in Google Cloud Console

**Solution**:
1. Check your `credentials.json`:
   ```json
   {
     "installed": {
       "redirect_uris": ["http://localhost:3000/oauth2callback"]
     }
   }
   ```

2. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
3. Click on your OAuth 2.0 Client ID
4. Under "Authorized redirect URIs", add:
   ```
   http://localhost:3000/oauth2callback
   ```
5. Save and try again

### 5. Credentials File Not Found

**Symptom**:
```
Gmail OAuth credentials not configured!
```

**Solution**: Create a `credentials.json` file in the project root

Two options:

**Option A**: Download from Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create or select OAuth 2.0 Client ID (Desktop app type)
3. Download the JSON file
4. Save it as `credentials.json` in the project root

**Option B**: Use environment variables
```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REDIRECT_URI="http://localhost:3000/oauth2callback"

npm run auth
```

### 6. "Access Blocked" Error in Browser

**Symptom**: Google shows "This app isn't verified" or "Access blocked"

**Cause**: Your OAuth app is in testing mode

**Solution**:
1. Go to [Google Cloud Console > OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Either:
   - **Option A**: Add your email to "Test users" list
   - **Option B**: Publish your app (not recommended for personal use)
3. Try authenticating again

### 7. Script Hangs at "Waiting for authorization..."

**Symptom**: Script shows the URL but never completes

**Possible Causes**:
1. You didn't visit the URL or complete authentication
2. You're blocking the redirect (firewall/browser extension)
3. The callback port is being blocked

**Solution**:
1. Make sure you clicked "Allow" on the Google consent screen
2. Check if the browser redirected to `http://localhost:3000/oauth2callback?code=...`
3. If the redirect failed, check your firewall settings
4. Try disabling browser extensions that might block redirects

### 8. "Connection Refused" Error

**Symptom**:
```
Error: Connection refused
```

**Causes**:
- You closed the browser before completing authentication
- A firewall is blocking port 3000
- The redirect happened before the server was ready

**Solution**:
1. Make sure not to close the browser until you see "Authentication successful"
2. Check firewall settings (allow port 3000)
3. Try again:
   ```bash
   npm run auth
   ```

## SSH / Remote Server Setup

If you're running the MCP server on a remote machine:

### Method 1: SSH Port Forwarding
```bash
# On your local machine
ssh -L 3000:localhost:3000 user@remote-server

# Then on the remote server
npm run auth

# The browser on your local machine will be able to reach the OAuth callback
```

### Method 2: Manual URL Method
```bash
# On remote server
npm run auth

# Copy the displayed URL
# Paste it into a browser on your local machine
# After clicking "Allow", you'll see a page that can't connect
# Copy the full redirect URL from your browser address bar
# It will look like: http://localhost:3000/oauth2callback?code=...

# You'll need to manually send this to the server
# Use another SSH session or a tunnel to complete the flow
```

## WSL (Windows Subsystem for Linux) Setup

### Method 1: Install wslu (Recommended)
```bash
# Install wslu for WSL browser opening
sudo apt install wslu

# Try again
npm run auth
```

### Method 2: Manual URL Method
```bash
npm run auth

# Copy the displayed URL
# Paste it into your Windows browser
# Complete authentication
# The callback should work if WSL networking is configured correctly
```

### Method 3: Use Windows Node.js
If WSL networking is problematic, run the authentication from Windows:
```powershell
# In Windows PowerShell (not WSL)
npm run auth
```

## Verification Steps

After successful authentication, you should see:

```
Authorization code received!
Exchanging code for tokens...

✓ Authentication successful!

✓ Gmail API access verified!

📧 Authenticated as: your-email@gmail.com
   Messages: 1234
   Threads: 567

✅ Authentication complete!

Your token has been saved to .credentials/token.json
You can now start the MCP server with: npm start
```

The token file will be at:
```
.credentials/token.json
```

## Re-authentication

To re-authenticate (e.g., if permissions changed or token expired):

```bash
# Remove the old token
rm .credentials/token.json

# Authenticate again
npm run auth
```

## Debug Mode

To see more detailed logs, set the DEBUG environment variable:

```bash
DEBUG=gmail-mcp:* npm run auth
```

## Still Having Issues?

If you're still experiencing problems:

1. Check the server logs in the console output
2. Verify your `credentials.json` format matches the examples in `QUICKSTART.md`
3. Ensure you've enabled the Gmail API in Google Cloud Console
4. Try with a fresh credentials file from Google Cloud Console
5. Check if your Google account has 2FA enabled (shouldn't affect OAuth but worth noting)

## Getting Help

When reporting authentication issues, please include:

1. The exact error message from the console
2. Your operating system (macOS, Linux, Windows, WSL)
3. Whether you're using SSH or connecting locally
4. The output of `npm run auth` (redact sensitive information)
5. Whether the browser opens automatically or not
6. The format of your redirect URI

Example:
```
OS: macOS 14.1
Connection: Local
Browser opens: No
Redirect URI: http://localhost:3000/oauth2callback
Error: [paste error message]
```
