# Gmail MCP Server - Login Flow Technical Documentation

A technical deep-dive into the OAuth 2.0 authentication flow, token management, and implementation details.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Detailed Authentication Flow](#detailed-authentication-flow)
3. [Component Documentation](#component-documentation)
4. [Token Storage Format](#token-storage-format)
5. [Security Considerations](#security-considerations)
6. [MCP Server Usage](#mcp-server-usage)
7. [Debugging Guide](#debugging-guide)
8. [Advanced Topics](#advanced-topics)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Gmail MCP Authentication System                    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│   CLI Script         │      │   Auth Manager       │      │   OAuth Helper       │
│  (authenticate.ts)   │─────>│  (gmail-auth.ts)     │─────>│  (local-auth-       │
│                      │      │                      │      │   helper.ts)         │
│  - Entry point       │      │  - Token management  │      │                      │
│  - User feedback     │      │  - Client creation   │      │  - HTTP server       │
│  - API test          │      │  - Token loading     │      │  - Browser launch    │
└──────────────────────┘      └──────────────────────┘      │  - Code exchange     │
                                                             └──────────────────────┘
                                       │
                                       │ uses
                                       ▼
                             ┌──────────────────────┐
                             │   Config Loader      │
                             │  (config.ts)         │
                             │                      │
                             │  - Credentials file  │
                             │  - Environment vars  │
                             │  - Path resolution   │
                             └──────────────────────┘

External Systems:
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│   User Browser       │      │   Google OAuth       │      │   Gmail API          │
│                      │      │                      │      │                      │
│  - Sign in           │─────>│  - Authentication    │      │  - Email operations  │
│  - Grant consent     │      │  - Token generation  │<─────│  - API calls         │
└──────────────────────┘      └──────────────────────┘      └──────────────────────┘
```

### Component Responsibilities

#### 1. **CLI Script** (`src/cli/authenticate.ts`)
- Entry point for `npm run auth` command
- Provides user-friendly console output
- Handles errors and displays helpful messages
- Tests authentication by calling Gmail API

#### 2. **Auth Manager** (`src/auth/gmail-auth.ts`)
- Core authentication logic
- Token lifecycle management (load, save, refresh)
- Gmail client creation
- OAuth2Client wrapper

#### 3. **OAuth Helper** (`src/auth/local-auth-helper.ts`)
- Local OAuth callback server
- Random port selection (50000-60000)
- Browser automation
- Authorization code exchange
- Enhanced error handling and logging

#### 4. **Config Loader** (`src/auth/config.ts`)
- Loads credentials from file or environment
- Path resolution
- Credential validation

---

## Detailed Authentication Flow

### Complete Step-by-Step Flow

```
STEP-BY-STEP TECHNICAL FLOW
════════════════════════════════════════════════════════════════════════

1. USER INITIATES AUTHENTICATION
   Command: npm run auth
   Script: dist/cli/authenticate.js

   Console output:
   🔐 Gmail MCP Server - Authentication Setup
   This will open your browser to authenticate with Google Gmail API.

2. CREATE AUTH MANAGER
   File: src/auth/gmail-auth.ts
   Function: createGmailAuth()

   Code: const authManager = new GmailAuthManager();

   Result: Auth manager instance created

3. GET GMAIL CLIENT
   File: src/auth/gmail-auth.ts
   Function: authManager.getGmailClient()

   Calls: getAuthClient() → checks for existing token

4. CHECK FOR EXISTING TOKEN
   File: src/auth/gmail-auth.ts
   Function: loadStoredToken()
   Path: .credentials/token.json

   If token exists:
     → Load token file
     → Parse JSON
     → Create OAuth2Client with credentials
     → Test token validity with getAccessToken()
     → If valid: Return client (FLOW ENDS HERE)
     → If invalid: Continue to step 5

   If token doesn't exist:
     → Continue to step 5

5. START NEW OAUTH FLOW
   File: src/auth/gmail-auth.ts
   Function: authenticateNewUser()

   Actions:
   - Load OAuth credentials (client_id, client_secret)
   - Call authenticateWithLogging() from helper

6. LOAD OAUTH CREDENTIALS
   File: src/auth/config.ts
   Function: loadOAuthCredentials()

   Priority order:
   1. Environment variables (GOOGLE_CLIENT_ID, etc.)
   2. credentials.json file
   3. Throw error if neither exists

   Returns: { client_id, client_secret, redirect_uri }

7. SELECT RANDOM PORT
   File: src/auth/local-auth-helper.ts
   Function: authenticateWithLogging()

   Code: const port = Math.floor(Math.random() * (60000 - 50000) + 50000);
   Example: port = 55669

   Why random?
   - Avoid port conflicts
   - Multiple authentications can run simultaneously
   - No hardcoded port dependencies

8. CREATE HTTP CALLBACK SERVER
   File: src/auth/local-auth-helper.ts

   Server configuration:
   - Host: localhost
   - Port: random (e.g., 55669)
   - Path: /
   - Timeout: 5 minutes

   Server purpose:
   - Receive OAuth callback from Google
   - Extract authorization code from URL
   - Exchange code for tokens
   - Display success page to user

9. CREATE OAUTH2 CLIENT
   File: src/auth/local-auth-helper.ts

   const client = new OAuth2Client({
     clientId: credentials.client_id,
     clientSecret: credentials.client_secret,
     redirectUri: `http://localhost:${port}`
   });

10. GENERATE AUTHORIZATION URL
    File: src/auth/local-auth-helper.ts

    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',    // Get refresh token
      scope: scopes.join(' '),   // Gmail scopes
      redirect_uri: redirectUri  // Callback URL
    });

    Example URL:
    https://accounts.google.com/o/oauth2/auth?
      client_id=xxxxx.apps.googleusercontent.com&
      redirect_uri=http://localhost:55669&
      response_type=code&
      scope=https://www.googleapis.com/auth/gmail.modify%20...&
      access_type=offline

11. OPEN BROWSER
    File: src/auth/local-auth-helper.ts
    Package: 'open'

    Code: await open(authorizeUrl, { wait: false });

    Behavior:
    - Opens user's default browser
    - Navigates to authorization URL
    - Process unref'd (doesn't block)

    Fallback:
    - If browser fails to open, URL is printed to console
    - User can copy-paste manually

12. USER SIGNS IN TO GOOGLE
    Platform: Google OAuth (accounts.google.com)

    User actions:
    - Enter Google email address
    - Enter password
    - Complete 2FA if enabled

    Google verifies:
    - User identity
    - Account status
    - Security checks

13. GOOGLE DISPLAYS CONSENT SCREEN
    Platform: Google OAuth

    Screen shows:
    - App name: "Gmail MCP Server"
    - Developer: your email
    - Permissions requested:
      * Read, compose, send, and permanently delete email
      * Create and send email only
      * Manage basic mail settings

    User actions:
    - Review permissions
    - Click "Allow" or "Continue"

14. GOOGLE GENERATES AUTHORIZATION CODE
    Platform: Google OAuth

    Process:
    - Validate user consent
    - Generate one-time authorization code
    - Prepare redirect with code

15. GOOGLE REDIRECTS TO CALLBACK
    Platform: Browser
    Target: http://localhost:55669/?code=4/0AXxxxx...&scope=...

    URL parameters:
    - code: Authorization code (used once)
    - scope: Granted scopes
    - state: (if provided)

    Or if error:
    - error: Error code
    - error_description: Human-readable description

16. HTTP SERVER RECEIVES CALLBACK
    File: src/auth/local-auth-helper.ts
    Server: HTTP server on localhost:port

    Request handling:
    - Parse URL and query parameters
    - Check for error parameters
    - Extract authorization code
    - Validate code exists

17. CHECK FOR ERRORS
    File: src/auth/local-auth-helper.ts

    If error in URL:
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');
      → Send 400 response to browser
      → Reject promise with error
      → Flow ends with failure

    Common errors:
    - access_denied: User clicked "Cancel"
    - invalid_request: Malformed OAuth request
    - unauthorized_client: Invalid credentials

18. EXTRACT AUTHORIZATION CODE
    File: src/auth/local-auth-helper.ts

    Code: const code = url.searchParams.get('code');

    Validation:
    - Code must exist
    - Code is non-empty string
    - Code is single-use only

19. EXCHANGE CODE FOR TOKENS
    File: src/auth/local-auth-helper.ts
    Library: google-auth-library

    const { tokens } = await client.getToken({
      code: code,
      redirect_uri: redirectUri
    });

    Google validates:
    - Authorization code is valid
    - Code matches client_id
    - Code not already used
    - Redirect URI matches

    Google returns:
    {
      access_token: "ya29.xxx...",      // 1 hour lifetime
      refresh_token: "1//xxx...",       // Long-lived
      scope: "https://www.googleapis.com/auth/gmail.modify ...",
      token_type: "Bearer",
      expiry_date: 1234567890123        // Unix timestamp
    }

20. SET CLIENT CREDENTIALS
    File: src/auth/local-auth-helper.ts

    client.setCredentials(tokens);

    OAuth2Client now has:
    - Access token (for API calls)
    - Refresh token (for renewal)
    - Expiry timestamp
    - Token type (Bearer)

21. SEND SUCCESS RESPONSE TO BROWSER
    File: src/auth/local-auth-helper.ts

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #28a745; font-size: 24px; }
          .message { margin-top: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="success">✓ Authentication Successful!</div>
        <div class="message">You can close this window and return to the terminal.</div>
      </body>
      </html>
    `);

    Browser displays success page

22. CLEANUP HTTP SERVER
    File: src/auth/local-auth-helper.ts

    Actions:
    - Clear 5-minute timeout
    - Close HTTP server
    - Free port
    - Clean up resources

23. RETURN TO AUTH MANAGER
    File: src/auth/gmail-auth.ts
    Function: authenticateNewUser()

    Returns: OAuth2Client with valid credentials

24. SAVE TOKENS TO DISK
    File: src/auth/gmail-auth.ts
    Function: saveToken()
    Path: .credentials/token.json

    Process:
    - Extract refresh_token from client.credentials
    - Create token object with client_id, client_secret, refresh_token
    - Ensure .credentials directory exists
    - Write JSON file atomically
    - Set file permissions (644)

    Content:
    {
      "type": "authorized_user",
      "client_id": "xxxxx.apps.googleusercontent.com",
      "client_secret": "xxxxx",
      "refresh_token": "1//xxx..."
    }

25. CREATE GMAIL API CLIENT
    File: src/auth/gmail-auth.ts
    Function: getGmailClient()

    const gmail = google.gmail({ version: 'v1', auth: authClient });

    Client is now ready for Gmail API calls

26. TEST AUTHENTICATION (CLI ONLY)
    File: src/cli/authenticate.ts

    const profile = await gmail.users.getProfile({ userId: 'me' });

    Verifies:
    - Token is valid
    - Gmail API access works
    - Scopes are correct

    Returns:
    - Email address
    - Total messages count
    - Total threads count

27. DISPLAY SUCCESS MESSAGE
    File: src/cli/authenticate.ts

    Console output:
    ✓ Authentication successful!
    Testing Gmail API access...
    ✓ Gmail API access verified!

    📧 Authenticated as: user@gmail.com
       Messages: 1,234
       Threads: 890

    ✅ Authentication complete!
    Your token has been saved to .credentials/token.json
    You can now start the MCP server with: npm start

28. FLOW COMPLETE
    Result: Authenticated and ready to use

    What's saved:
    - ✓ .credentials/token.json with refresh token
    - ✓ OAuth2Client configured
    - ✓ Gmail API access verified

    Next steps:
    - Start MCP server: npm start
    - Use any of 17 Gmail tools
    - No more authentication needed (until token revoked)

════════════════════════════════════════════════════════════════════════
```

### Subsequent Runs (Token Already Exists)

```
SUBSEQUENT AUTHENTICATION FLOW
════════════════════════════════════════════════════════════════════════

1. MCP Server starts
   File: src/index.ts

2. Tool invoked (e.g., gmail_list_messages)
   File: src/tools/list-messages.ts

3. Create auth manager
   Code: const authManager = createGmailAuth();

4. Get Gmail client
   Code: const gmail = await authManager.getGmailClient();

5. Auth manager checks for token
   File: src/auth/gmail-auth.ts
   Function: loadStoredToken()

   Steps:
   - Read .credentials/token.json
   - Parse JSON
   - Create OAuth2Client
   - Set refresh_token from file

6. Test token validity
   Code: await auth.getAccessToken();

   Behind the scenes:
   - If access token cached and valid: Use it
   - If access token expired or missing:
     * Use refresh_token to request new access_token
     * Google validates refresh_token
     * Google returns new access_token
     * OAuth2Client caches new access_token

   Result: Valid access token ready for use

7. Return Gmail client
   Client has valid access token for API calls

8. API call succeeds
   Example: gmail.users.messages.list()

No browser interaction!
No user input!
Fully automatic!

════════════════════════════════════════════════════════════════════════
```

---

## Component Documentation

### GmailAuthManager (`src/auth/gmail-auth.ts`)

The core authentication manager class.

#### Class Structure

```typescript
export class GmailAuthManager {
  private authClient: OAuth2Client | null = null;

  async getAuthClient(): Promise<OAuth2Client>
  async getGmailClient(): Promise<gmail_v1.Gmail>
  async hasValidToken(): Promise<boolean>
  async revokeToken(): Promise<void>

  private async loadStoredToken(tokenPath: string): Promise<OAuth2Client | null>
  private async authenticateNewUser(): Promise<OAuth2Client>
  private async saveToken(client: OAuth2Client, tokenPath: string): Promise<void>
}
```

#### Method: `getAuthClient()`

**Purpose:** Get authenticated OAuth2Client

**Flow:**
1. Check if authClient already exists (singleton pattern)
2. If exists, return it
3. If not, try to load stored token
4. If token valid, create client and return
5. If no token or invalid, trigger new OAuth flow
6. Save token and return client

**Error Handling:**
- Token file not found: Triggers new auth
- Token invalid: Triggers new auth
- Network errors: Throws exception

#### Method: `getGmailClient()`

**Purpose:** Get Gmail API client (convenience method)

**Implementation:**
```typescript
async getGmailClient() {
  const auth = await this.getAuthClient();
  return google.gmail({ version: 'v1', auth });
}
```

**Returns:** Ready-to-use Gmail API client

#### Method: `loadStoredToken()`

**Purpose:** Load and validate stored refresh token

**Steps:**
1. Read `.credentials/token.json`
2. Parse JSON
3. Extract client_id, client_secret, refresh_token
4. Create OAuth2Client
5. Set credentials (refresh_token only)
6. Test validity by calling `getAccessToken()`
7. Return client if valid, null otherwise

**Token Validation:**
```typescript
try {
  await auth.getAccessToken();
  return auth;  // Valid token
} catch (error) {
  return null;  // Invalid token
}
```

#### Method: `authenticateNewUser()`

**Purpose:** Perform new OAuth flow

**Steps:**
1. Load OAuth credentials
2. Call `authenticateWithLogging()` helper
3. Return authenticated OAuth2Client

**Uses:** `local-auth-helper.ts` for actual OAuth flow

#### Method: `saveToken()`

**Purpose:** Save refresh token to disk

**Process:**
1. Extract refresh_token from OAuth2Client
2. Create StoredToken object:
   ```typescript
   {
     type: 'authorized_user',
     client_id: credentials.client_id,
     client_secret: credentials.client_secret,
     refresh_token: tokens.refresh_token
   }
   ```
3. Ensure `.credentials` directory exists
4. Write JSON file atomically
5. File permissions: 644 (user read/write, others read)

**Critical:** Refresh token must exist (always present in new auth flow)

---

### OAuth Helper (`src/auth/local-auth-helper.ts`)

Enhanced OAuth callback server with better UX.

#### Function: `authenticateWithLogging()`

**Purpose:** Perform OAuth flow with local callback server

**Parameters:**
```typescript
interface LocalAuthOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;  // Ignored - uses random port
  scopes: string[];
}
```

**Implementation Highlights:**

**Random Port Selection:**
```typescript
const port = Math.floor(Math.random() * (60000 - 50000) + 50000);
```
- Range: 50000-60000
- Reduces port conflicts
- No hardcoded dependencies

**HTTP Server:**
```typescript
const server = createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://localhost:${port}`);

  // Only process callback path
  if (url.pathname !== callbackPath) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  // Check for errors
  if (url.searchParams.has('error')) {
    // Handle OAuth error
  }

  // Extract authorization code
  const code = url.searchParams.get('code');

  // Exchange code for tokens
  const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });

  // Send success page to browser
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(successHTML);

  // Cleanup and resolve
  cleanup();
  resolve(client);
});
```

**Timeout Handling:**
```typescript
const timeoutId = setTimeout(() => {
  cleanup();
  reject(new Error('Authentication timed out after 5 minutes. Please try again.'));
}, 5 * 60 * 1000);  // 5 minutes
```

**Port Conflict Handling:**
```typescript
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    reject(new Error(`Port ${port} is already in use...`));
  }
});
```

**Browser Launch:**
```typescript
try {
  const childProcess = await open(authorizeUrl, { wait: false });
  childProcess.unref();  // Don't block process exit
} catch (error) {
  // Browser launch failed - URL printed to console
}
```

---

### Config Loader (`src/auth/config.ts`)

Loads OAuth credentials from environment or file.

#### Function: `loadOAuthCredentials()`

**Purpose:** Load and validate OAuth credentials

**Priority Order:**
1. Environment variables (highest priority)
2. credentials.json file
3. Throw error if neither exists

**Environment Variables:**
```typescript
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  return {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost'
  };
}
```

**File Loading:**
```typescript
const credentialsPath = path.join(process.cwd(), 'credentials.json');
const content = await fs.readFile(credentialsPath, 'utf-8');
const credentials = JSON.parse(content);

// Support both 'installed' and 'web' credential types
const creds = credentials.installed || credentials.web;
if (!creds) {
  throw new Error('Invalid credentials format');
}

return {
  client_id: creds.client_id,
  client_secret: creds.client_secret,
  redirect_uri: creds.redirect_uris[0] || 'http://localhost'
};
```

#### Function: `getTokenPath()`

**Purpose:** Get path to token storage file

**Implementation:**
```typescript
export function getTokenPath(): string {
  const credentialsDir = path.join(process.cwd(), '.credentials');
  return path.join(credentialsDir, 'token.json');
}
```

**Result:** `/path/to/mcp-gmail/.credentials/token.json`

---

## Token Storage Format

### Stored Token File

**Location:** `.credentials/token.json`

**Format:**
```json
{
  "type": "authorized_user",
  "client_id": "123456789.apps.googleusercontent.com",
  "client_secret": "GOCSPX-xxxxxxxxxxxxxxxxxxxxxx",
  "refresh_token": "1//0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

**Field Descriptions:**

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `type` | string | Always "authorized_user" | Yes |
| `client_id` | string | OAuth client ID | Yes |
| `client_secret` | string | OAuth client secret | Yes |
| `refresh_token` | string | Long-lived refresh token | Yes |

**Security:**
- File is gitignored
- Contains sensitive credentials
- Should have restrictive permissions (600 or 644)
- Never commit to version control

**Why These Fields?**

1. **type:** Identifies token format for google-auth-library
2. **client_id:** Needed to identify the OAuth application
3. **client_secret:** Required for token refresh
4. **refresh_token:** The actual long-lived credential

**Why NOT access_token?**
- Access tokens expire after 1 hour
- Storing them is pointless
- Refresh token is used to get new access tokens
- Access tokens obtained on-demand

### Access Token (In Memory)

**Not stored on disk, only in OAuth2Client memory**

**Format:**
```json
{
  "access_token": "ya29.a0AfB_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "token_type": "Bearer",
  "expiry_date": 1234567890123,
  "scope": "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.settings.basic"
}
```

**Lifecycle:**
1. Obtained by exchanging refresh_token
2. Cached in OAuth2Client instance
3. Used for Gmail API calls
4. Expires after ~1 hour
5. Automatically refreshed when needed
6. Never persisted to disk

---

## Security Considerations

### Threat Model

**Protected Assets:**
1. OAuth client credentials (client_id, client_secret)
2. Refresh tokens
3. Access tokens (in memory)
4. Gmail data accessed via API

**Threat Actors:**
1. Malicious applications on user's system
2. Network attackers (MITM)
3. Unauthorized file system access
4. Compromised credentials
5. Social engineering

### Security Measures

#### 1. Credential Storage

**credentials.json Protection:**
```bash
# File permissions (restrict to user only)
chmod 600 credentials.json

# Gitignore (never commit)
echo "credentials.json" >> .gitignore

# Environment variables (production)
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
```

**Token Storage:**
```bash
# Directory permissions
mkdir -p .credentials
chmod 700 .credentials

# File permissions
chmod 600 .credentials/token.json

# Gitignore
echo ".credentials/" >> .gitignore
```

#### 2. Network Security

**HTTPS Everywhere:**
- OAuth URLs use HTTPS
- Token exchange uses HTTPS
- Gmail API uses HTTPS
- No credentials sent over HTTP

**Local Callback Server:**
- Runs on localhost only (127.0.0.1)
- Not accessible from network
- Random port reduces predictability
- 5-minute timeout limits exposure

#### 3. Token Security

**Refresh Token Protection:**
- Stored locally only
- Never sent except to Google token endpoint
- Used only for obtaining access tokens
- Can be revoked from Google Account

**Access Token Protection:**
- Memory only (never persisted)
- Short-lived (1 hour)
- Automatically refreshed
- Limited scope (Gmail only)

**Token Rotation:**
```typescript
// Google may rotate refresh tokens
// Old refresh token becomes invalid
// New refresh token saved automatically
```

#### 4. Scope Minimization

**Current Scopes:**
```typescript
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',      // Read, send, delete email
  'https://www.googleapis.com/auth/gmail.compose',     // Create, send email
  'https://www.googleapis.com/auth/gmail.settings.basic', // Basic settings
];
```

**Why These Scopes:**
- Required for MCP server functionality
- No access to non-Gmail services
- No access to Google Drive, Calendar, etc.
- Follows least privilege principle

**Reducing Scopes:**
```typescript
// Read-only access (if that's all you need)
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly'
];
```

#### 5. Audit Trail

**Google Account Permissions:**
- View at: [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
- Shows all authorized apps
- Displays granted scopes
- Last access timestamp
- Easy revocation

**Security Events:**
- Google sends email on new device/app authorization
- User can review security activity
- Suspicious activity alerts

#### 6. Best Practices

**Development:**
1. Use `credentials.json` file
2. Keep credentials local
3. Don't share credentials
4. Use test account
5. Review permissions regularly

**Production:**
1. Use environment variables
2. Store in secret manager (AWS Secrets Manager, GCP Secret Manager)
3. Rotate credentials regularly
4. Monitor access logs
5. Implement rate limiting
6. Use service accounts if possible

**User Education:**
1. Explain what permissions mean
2. Show how to revoke access
3. Encourage regular security audits
4. Provide security documentation

---

## MCP Server Usage

### Automatic Authentication

When MCP server starts, authentication happens automatically:

```typescript
// src/tools/list-messages.ts (example)
export default class ListMessagesTool extends MCPTool {
  async execute(input: MCPInput<this>) {
    // Authentication happens here automatically
    const authManager = createGmailAuth();
    const gmail = await authManager.getGmailClient();

    // Token loaded from .credentials/token.json
    // If expired, automatically refreshed
    // No browser interaction needed

    // Now use Gmail API
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: input.maxResults
    });

    return response.data;
  }
}
```

### No Browser Interaction After First Auth

**First time:**
- User runs `npm run auth`
- Browser opens
- User grants permissions
- Token saved

**Every subsequent time:**
- MCP server loads token
- No browser needed
- Automatic token refresh
- Seamless operation

### Token Refresh Mechanism

**Automatic Refresh Flow:**

```
Tool Invoked
     │
     ▼
createGmailAuth()
     │
     ▼
authManager.getGmailClient()
     │
     ▼
loadStoredToken()
     │
     ├─> Read token.json
     │
     ├─> Create OAuth2Client
     │
     ├─> Set refresh_token
     │
     ▼
await auth.getAccessToken()
     │
     ├─> Access token cached?
     │   ├─> Yes ─> Is valid? ─> Yes ─> Use it
     │   │                      │
     │   │                      └─> No (expired)
     │   │                          │
     │   │                          ▼
     │   │                    Use refresh_token
     │   │                    Call Google token endpoint
     │   │                    Get new access_token
     │   │                    Cache it
     │   │                    Return new token
     │   │
     │   └─> No ─> Use refresh_token
     │             Call Google token endpoint
     │             Get new access_token
     │             Cache it
     │             Return new token
     │
     ▼
Gmail API call with valid access_token
     │
     ▼
Success!
```

**Key Points:**
- Fully automatic
- No user interaction
- Transparent to application code
- Handled by google-auth-library

### Error Handling in MCP Server

```typescript
try {
  const authManager = createGmailAuth();
  const gmail = await authManager.getGmailClient();

  // Use Gmail API
  const result = await gmail.users.messages.list({ userId: 'me' });

  return { success: true, data: result.data };

} catch (error) {
  // Authentication errors
  if (error.message.includes('credentials not configured')) {
    return {
      success: false,
      error: 'OAuth credentials not configured. Run: npm run auth'
    };
  }

  if (error.message.includes('invalid_grant')) {
    return {
      success: false,
      error: 'Token expired or revoked. Please re-authenticate: npm run auth'
    };
  }

  // Gmail API errors
  if (error.code === 401) {
    return {
      success: false,
      error: 'Authentication failed. Please re-authenticate: npm run auth'
    };
  }

  if (error.code === 403) {
    return {
      success: false,
      error: 'Permission denied. Check OAuth scopes.'
    };
  }

  // Generic error
  return {
    success: false,
    error: error.message
  };
}
```

---

## Debugging Guide

### Debug Logging

**Enable Debug Mode:**
```bash
# All debug output
DEBUG=* npm run auth

# Specific modules
DEBUG=auth:* npm run auth
DEBUG=gmail:* npm run auth
```

**Add Debug Logging:**
```typescript
import debug from 'debug';
const log = debug('auth:gmail');

log('Starting authentication flow');
log('Token path: %s', tokenPath);
log('Credentials loaded: %O', credentials);
```

### Checking Token Status

**Verify Token File:**
```bash
# Check if token exists
ls -la .credentials/token.json

# View token contents (be careful - sensitive!)
cat .credentials/token.json | jq .

# Check file permissions
ls -la .credentials/token.json
# Should be: -rw-r--r-- or -rw-------
```

**Verify Token Format:**
```bash
# Check required fields
cat .credentials/token.json | jq 'keys'
# Should show: ["type", "client_id", "client_secret", "refresh_token"]

# Check token type
cat .credentials/token.json | jq -r '.type'
# Should be: authorized_user
```

### Testing Gmail API Access

**Manual Test:**
```typescript
// test-auth.ts
import { createGmailAuth } from './src/auth/index.js';

async function testAuth() {
  try {
    console.log('Creating auth manager...');
    const authManager = createGmailAuth();

    console.log('Getting Gmail client...');
    const gmail = await authManager.getGmailClient();

    console.log('Testing API access...');
    const profile = await gmail.users.getProfile({ userId: 'me' });

    console.log('Success!');
    console.log('Email:', profile.data.emailAddress);
    console.log('Messages:', profile.data.messagesTotal);

  } catch (error) {
    console.error('Failed:', error.message);
    console.error(error.stack);
  }
}

testAuth();
```

**Run Test:**
```bash
npx tsx test-auth.ts
```

### Debugging OAuth Flow

**Check HTTP Server:**
```bash
# While authentication is in progress
lsof -i :55669  # Replace with actual port from console

# Should show Node.js process listening
```

**Monitor Network Traffic:**
```bash
# Terminal 1: Start authentication
npm run auth

# Terminal 2: Monitor traffic (requires root)
sudo tcpdump -i lo0 port 55669 -A
```

**Check Browser Console:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Complete authentication
4. Check:
   - OAuth redirect to localhost
   - Query parameters (code=xxx)
   - Any JavaScript errors

### Debugging Token Refresh

**Force Token Refresh:**
```typescript
// Temporarily clear access token to force refresh
const authManager = createGmailAuth();
const auth = await authManager.getAuthClient();

// Access token expired/missing
auth.credentials = {
  refresh_token: auth.credentials.refresh_token
  // No access_token - will force refresh
};

// Next API call will trigger refresh
const gmail = google.gmail({ version: 'v1', auth });
const profile = await gmail.users.getProfile({ userId: 'me' });
// Refresh happened automatically
```

**Monitor Refresh:**
```typescript
import debug from 'debug';
const log = debug('auth:refresh');

// Add logging to OAuth2Client
auth.on('tokens', (tokens) => {
  log('New tokens received');
  log('Access token: %s', tokens.access_token?.substring(0, 20) + '...');
  log('Expires in: %d seconds', (tokens.expiry_date - Date.now()) / 1000);
});
```

### Common Debug Scenarios

**Scenario 1: "No token file"**
```bash
# Check file exists
ls .credentials/token.json
# If not found: rm .credentials/token.json && npm run auth
```

**Scenario 2: "Invalid token format"**
```bash
# Validate JSON
cat .credentials/token.json | jq .
# If error: Delete file and re-authenticate
rm .credentials/token.json && npm run auth
```

**Scenario 3: "Token expired"**
```bash
# Check token age (if you track it)
stat .credentials/token.json
# Refresh tokens don't expire unless revoked
# Try: npm run auth
```

**Scenario 4: "Port already in use"**
```bash
# Find process using port
lsof -i :55669

# Kill process
kill -9 <PID>

# Or just retry - new random port will be selected
npm run auth
```

---

## Advanced Topics

### Implementing Custom Token Storage

**Use Case:** Store tokens in database or cloud storage

```typescript
// custom-token-storage.ts
export interface TokenStorage {
  load(): Promise<StoredToken | null>;
  save(token: StoredToken): Promise<void>;
  delete(): Promise<void>;
}

export class DatabaseTokenStorage implements TokenStorage {
  async load(): Promise<StoredToken | null> {
    // Load from database
    const result = await db.query(
      'SELECT * FROM oauth_tokens WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  async save(token: StoredToken): Promise<void> {
    // Save to database
    await db.query(
      'INSERT INTO oauth_tokens (user_id, token_data) VALUES ($1, $2) ' +
      'ON CONFLICT (user_id) DO UPDATE SET token_data = $2',
      [userId, JSON.stringify(token)]
    );
  }

  async delete(): Promise<void> {
    // Delete from database
    await db.query(
      'DELETE FROM oauth_tokens WHERE user_id = $1',
      [userId]
    );
  }
}

// Modify GmailAuthManager to use custom storage
export class GmailAuthManager {
  constructor(private tokenStorage: TokenStorage = new FileTokenStorage()) {}

  private async loadStoredToken(): Promise<OAuth2Client | null> {
    const tokenData = await this.tokenStorage.load();
    if (!tokenData) return null;

    // Create OAuth2Client with token data
    const auth = new OAuth2Client(...);
    auth.setCredentials({ refresh_token: tokenData.refresh_token });

    return auth;
  }

  private async saveToken(client: OAuth2Client): Promise<void> {
    const tokenData = {
      type: 'authorized_user',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: client.credentials.refresh_token
    };

    await this.tokenStorage.save(tokenData);
  }
}
```

### Multi-User Support

**Use Case:** MCP server for multiple users

```typescript
// multi-user-auth.ts
export class MultiUserAuthManager {
  private authClients: Map<string, OAuth2Client> = new Map();

  async getGmailClient(userId: string): Promise<gmail_v1.Gmail> {
    // Get or create auth client for user
    let auth = this.authClients.get(userId);

    if (!auth) {
      auth = await this.loadUserToken(userId);
      this.authClients.set(userId, auth);
    }

    return google.gmail({ version: 'v1', auth });
  }

  private async loadUserToken(userId: string): Promise<OAuth2Client> {
    // Load user-specific token
    const tokenPath = `.credentials/token-${userId}.json`;
    const content = await fs.readFile(tokenPath, 'utf-8');
    const token = JSON.parse(content);

    // Create OAuth2Client
    const auth = new OAuth2Client(...);
    auth.setCredentials({ refresh_token: token.refresh_token });

    return auth;
  }
}

// Usage in tools
export default class ListMessagesTool extends MCPTool {
  async execute(input: MCPInput<this>) {
    // Get user ID from context (e.g., MCP session metadata)
    const userId = this.context.userId;

    const authManager = new MultiUserAuthManager();
    const gmail = await authManager.getGmailClient(userId);

    // Use Gmail API for specific user
    const response = await gmail.users.messages.list({ userId: 'me' });
    return response.data;
  }
}
```

### Headless Authentication

**Use Case:** Server environment without browser

```typescript
// headless-auth.ts
export async function authenticateHeadless(
  clientId: string,
  clientSecret: string,
  scopes: string[]
): Promise<OAuth2Client> {
  const client = new OAuth2Client(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');

  // Generate auth URL
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes.join(' ')
  });

  // Print URL for user
  console.log('Please visit this URL to authorize the application:');
  console.log(authUrl);
  console.log('\nEnter the authorization code here: ');

  // Read code from stdin
  const code = await readLineAsync();

  // Exchange code for tokens
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  return client;
}

// Helper to read from stdin
function readLineAsync(): Promise<string> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('', (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
```

### Service Account Authentication

**Use Case:** Server-to-server authentication (Google Workspace only)

```typescript
// service-account-auth.ts
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

export function createServiceAccountAuth(
  serviceAccountEmail: string,
  privateKey: string,
  userEmail: string  // User to impersonate
): JWT {
  return new JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.settings.basic'
    ],
    subject: userEmail  // Impersonate this user
  });
}

// Usage
const auth = createServiceAccountAuth(
  'service@project.iam.gserviceaccount.com',
  privateKey,
  'user@domain.com'
);

const gmail = google.gmail({ version: 'v1', auth });
```

**Requirements:**
- Google Workspace account
- Service account created in GCP
- Domain-wide delegation enabled
- Service account has Gmail API scope granted

### Token Encryption

**Use Case:** Encrypt tokens at rest

```typescript
// encrypted-token-storage.ts
import crypto from 'crypto';

export class EncryptedTokenStorage {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(encryptionKey: string) {
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  async save(token: StoredToken): Promise<void> {
    // Generate random IV
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // Encrypt token
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(token), 'utf8'),
      cipher.final()
    ]);

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Save: iv + authTag + encrypted
    const data = Buffer.concat([iv, authTag, encrypted]);
    await fs.writeFile('.credentials/token.enc', data);
  }

  async load(): Promise<StoredToken | null> {
    try {
      // Read encrypted file
      const data = await fs.readFile('.credentials/token.enc');

      // Extract parts
      const iv = data.slice(0, 16);
      const authTag = data.slice(16, 32);
      const encrypted = data.slice(32);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      // Parse JSON
      return JSON.parse(decrypted.toString('utf8'));

    } catch (error) {
      return null;
    }
  }
}

// Usage
const storage = new EncryptedTokenStorage(process.env.ENCRYPTION_KEY);
const token = await storage.load();
```

---

## References

- **Gmail API:** [developers.google.com/gmail/api](https://developers.google.com/gmail/api)
- **OAuth 2.0:** [oauth.net/2/](https://oauth.net/2/)
- **Google Auth Library:** [github.com/googleapis/google-auth-library-nodejs](https://github.com/googleapis/google-auth-library-nodejs)
- **MCP Framework:** [github.com/modelcontextprotocol/framework](https://github.com/modelcontextprotocol/framework)

---

**For user-friendly setup instructions, see [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)**
