# Gmail MCP Tools Reference

Complete documentation for all 17 Gmail MCP tools with examples, parameters, and usage patterns.

## Table of Contents

- [Essential Tools](#essential-tools)
  - [gmail_list_messages](#gmail_list_messages)
  - [gmail_read_message](#gmail_read_message)
  - [gmail_search_messages](#gmail_search_messages)
  - [gmail_send_email](#gmail_send_email)
- [Standard Tools](#standard-tools)
  - [gmail_get_thread](#gmail_get_thread)
  - [gmail_create_draft](#gmail_create_draft)
  - [gmail_send_draft](#gmail_send_draft)
  - [gmail_modify_message](#gmail_modify_message)
  - [gmail_list_labels](#gmail_list_labels)
  - [gmail_create_label](#gmail_create_label)
  - [gmail_get_attachment](#gmail_get_attachment)
- [Advanced Tools](#advanced-tools)
  - [gmail_list_filters](#gmail_list_filters)
  - [gmail_create_filter](#gmail_create_filter)
  - [gmail_get_settings](#gmail_get_settings)
  - [gmail_update_signature](#gmail_update_signature)
  - [gmail_set_vacation](#gmail_set_vacation)
  - [gmail_batch_modify](#gmail_batch_modify)
- [Gmail Search Query Syntax](#gmail-search-query-syntax)
- [System Labels Reference](#system-labels-reference)
- [Common Workflows](#common-workflows)

---

## Essential Tools

### gmail_list_messages

Lists Gmail messages with optional filters and labels.

**Purpose**: Retrieve a list of messages from your Gmail account with basic metadata (subject, from, snippet, date).

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `maxResults` | number | No | 10 | Maximum messages to return (1-500) |
| `query` | string | No | - | Gmail search query (e.g., 'is:unread', 'from:example@gmail.com') |
| `labelIds` | string[] | No | - | Filter by label IDs (e.g., ['INBOX', 'UNREAD', 'STARRED']) |
| `returnInline` | boolean | No | false | Return results inline instead of saving to file. Default: false (saves to markdown) |
| `outputDescription` | string | No | - | Human-readable description for the output filename (e.g., 'inbox-last-week') |

**Returns (Default - Saved to File)**:
```json
{
  "success": true,
  "savedToFile": true,
  "filePath": "~/.mcp-gmail/exports/list-messages/2025-11-10-inbox-last-week.md",
  "count": 10,
  "format": "markdown",
  "message": "10 messages saved. Use grep to search or read the file."
}
```

**Returns (When `returnInline: true`)**:
```json
{
  "success": true,
  "count": 10,
  "resultCount": "10 of 150",
  "messages": [
    {
      "id": "18f2d3e4b5c6a7d8",
      "threadId": "18f2d3e4b5c6a7d8",
      "subject": "Welcome to Gmail MCP",
      "from": "sender@example.com",
      "date": "Mon, 15 Jan 2024 10:30:00 -0800",
      "snippet": "Get started with the Gmail MCP server...",
      "labelIds": ["INBOX", "UNREAD"],
      "isUnread": true,
      "isStarred": false
    }
  ]
}
```

**Usage Examples**:

```typescript
// Default: Save to markdown file
gmail_list_messages({
  maxResults: 50,
  outputDescription: "inbox-last-week"
})
// Returns filepath to ~/.mcp-gmail/exports/list-messages/2025-11-10-inbox-last-week.md

// Get results inline instead
gmail_list_messages({
  maxResults: 10,
  returnInline: true
})

// List unread messages in inbox (saved to file by default)
gmail_list_messages({
  maxResults: 20,
  labelIds: ["INBOX", "UNREAD"],
  outputDescription: "unread-inbox"
})

// List starred messages
gmail_list_messages({
  labelIds: ["STARRED"]
})

// Search with query
gmail_list_messages({
  query: "from:boss@company.com",
  maxResults: 50,
  outputDescription: "emails-from-boss"
})
```

**Error Handling**: Returns error message if Gmail API fails or authentication is invalid.

---

### gmail_read_message

Reads the full content of a Gmail message by its ID.

**Purpose**: Retrieve complete message details including headers, body (plain text and HTML), attachments, and metadata.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `messageId` | string | Yes | - | Gmail message ID (from list_messages or search_messages) |
| `format` | enum | No | "full" | Response format: 'full', 'simple', or 'text' |

**Format Options**:
- `full`: Complete parsed message with all headers and body formats
- `simple`: Key fields only (subject, from, to, body, attachments)
- `text`: Human-readable plain text format

**Returns (full format)**:
```json
{
  "success": true,
  "message": {
    "id": "18f2d3e4b5c6a7d8",
    "threadId": "18f2d3e4b5c6a7d8",
    "labelIds": ["INBOX", "UNREAD"],
    "snippet": "Email preview text...",
    "subject": "Meeting Tomorrow",
    "from": "colleague@company.com",
    "to": ["me@company.com"],
    "cc": ["team@company.com"],
    "date": "Mon, 15 Jan 2024 10:30:00 -0800",
    "body": {
      "plain": "Let's meet tomorrow at 2pm...",
      "html": "<html>...</html>"
    },
    "attachments": [
      {
        "filename": "agenda.pdf",
        "mimeType": "application/pdf",
        "size": 45320,
        "attachmentId": "ANGjdJ..."
      }
    ],
    "isUnread": true,
    "isStarred": false,
    "isInInbox": true
  }
}
```

**Usage Examples**:

```typescript
// Read full message with all details
gmail_read_message({
  messageId: "18f2d3e4b5c6a7d8",
  format: "full"
})

// Read message with simple format (smaller response)
gmail_read_message({
  messageId: "18f2d3e4b5c6a7d8",
  format: "simple"
})

// Read message as plain text (most readable)
gmail_read_message({
  messageId: "18f2d3e4b5c6a7d8",
  format: "text"
})
```

**Best Practices**:
- Use 'simple' or 'text' format for faster responses when full details aren't needed
- Use 'full' format when you need complete headers or HTML body
- Get message IDs from `gmail_list_messages` or `gmail_search_messages`

---

### gmail_search_messages

Searches Gmail messages using Gmail's powerful query syntax.

**Purpose**: Find messages using advanced search operators (from, to, subject, date ranges, attachments, etc.).

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Gmail search query using search operators |
| `maxResults` | number | No | 20 | Maximum messages to return (1-500) |
| `includeBody` | boolean | No | false | Include message body in results (slower but more detailed) |
| `returnInline` | boolean | No | false | Return results inline instead of saving to file. Default: false (saves to markdown) |
| `outputDescription` | string | No | - | Human-readable description for the output filename (e.g., 'emails-from-boss') |

**Returns (Default - Saved to File)**:
```json
{
  "success": true,
  "savedToFile": true,
  "filePath": "~/.mcp-gmail/exports/search-messages/2025-11-10-emails-from-boss.md",
  "count": 5,
  "query": "from:example@gmail.com has:attachment",
  "format": "markdown",
  "message": "5 messages saved. Use grep to search or read the file."
}
```

**Returns (When `returnInline: true`)**:
```json
{
  "success": true,
  "query": "from:example@gmail.com has:attachment",
  "count": 5,
  "resultCount": "5 of 12",
  "messages": [
    {
      "id": "18f2d3e4b5c6a7d8",
      "threadId": "18f2d3e4b5c6a7d8",
      "subject": "Report Attached",
      "from": "example@gmail.com",
      "to": ["me@company.com"],
      "date": "Mon, 15 Jan 2024 10:30:00 -0800",
      "snippet": "Please review the attached report...",
      "labelIds": ["INBOX"],
      "hasAttachments": true,
      "attachments": [
        {
          "filename": "report.pdf",
          "mimeType": "application/pdf",
          "size": 245680,
          "attachmentId": "ANGjdJ..."
        }
      ]
    }
  ]
}
```

**Usage Examples**:

```typescript
// Default: Save to markdown file with custom description
gmail_search_messages({
  query: "from:boss@company.com",
  outputDescription: "emails-from-boss"
})
// Returns filepath to ~/.mcp-gmail/exports/search-messages/2025-11-10-emails-from-boss.md

// Get results inline instead of file
gmail_search_messages({
  query: "is:unread has:attachment",
  maxResults: 10,
  returnInline: true
})

// Search by date range (auto-generates filename from query)
gmail_search_messages({
  query: "after:2024/01/01 before:2024/12/31"
})

// Search by subject
gmail_search_messages({
  query: "subject:invoice",
  outputDescription: "invoice-emails"
})

// Complex query with multiple operators and full body
gmail_search_messages({
  query: "from:example@gmail.com subject:report after:2024/01/01 has:attachment",
  includeBody: true,
  maxResults: 50,
  outputDescription: "reports-from-example"
})

// Search for large emails
gmail_search_messages({
  query: "larger:10M",
  outputDescription: "large-emails"
})

// Exclude specific sender (results saved to file by default)
gmail_search_messages({
  query: "to:me -from:notifications@example.com"
})
```

**Search Operators**: See [Gmail Search Query Syntax](#gmail-search-query-syntax) section below.

**Best Practices**:
- Use `includeBody: false` (default) for faster searches
- Combine multiple operators for precise results
- Use date operators for time-based searches
- Use labels in queries: `label:important`

---

### gmail_send_email

Sends an email through Gmail with support for HTML, CC/BCC, and attachments.

**Purpose**: Send emails directly from your Gmail account with full formatting and attachment support.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `to` | string | Yes | - | Recipient email address (comma-separated for multiple) |
| `subject` | string | Yes | - | Email subject line |
| `body` | string | Yes | - | Email body content |
| `cc` | string | No | - | CC recipients (comma-separated) |
| `bcc` | string | No | - | BCC recipients (comma-separated) |
| `isHtml` | boolean | No | false | Whether body is HTML (true) or plain text (false) |
| `attachments` | array | No | - | File attachments with filename and path |

**Attachment Object**:
```typescript
{
  filename: string,  // Display name for attachment
  path: string       // File system path to file
}
```

**Returns**:
```json
{
  "success": true,
  "messageId": "18f2d3e4b5c6a7d8",
  "threadId": "18f2d3e4b5c6a7d8",
  "labelIds": ["SENT"],
  "from": "me@company.com",
  "to": "recipient@example.com",
  "subject": "Hello from Gmail MCP",
  "attachmentCount": 2,
  "message": "Email sent successfully from me@company.com"
}
```

**Usage Examples**:

```typescript
// Simple plain text email
gmail_send_email({
  to: "recipient@example.com",
  subject: "Quick Update",
  body: "Just wanted to let you know the project is complete."
})

// Email with CC
gmail_send_email({
  to: "recipient@example.com",
  cc: "manager@company.com",
  subject: "Project Status",
  body: "The project is on track for completion."
})

// HTML email
gmail_send_email({
  to: "client@example.com",
  subject: "Monthly Report",
  body: "<h1>Monthly Report</h1><p>Here are the highlights...</p>",
  isHtml: true
})

// Email with attachments
gmail_send_email({
  to: "client@example.com",
  subject: "Documents Attached",
  body: "Please find the requested documents attached.",
  attachments: [
    { filename: "contract.pdf", path: "/path/to/contract.pdf" },
    { filename: "invoice.pdf", path: "/path/to/invoice.pdf" }
  ]
})

// Multiple recipients with BCC
gmail_send_email({
  to: "team@company.com, department@company.com",
  bcc: "manager@company.com",
  subject: "Team Meeting",
  body: "Meeting scheduled for tomorrow at 2pm."
})

// Full example with all options
gmail_send_email({
  to: "client@example.com",
  cc: "sales@company.com",
  bcc: "archive@company.com",
  subject: "Proposal and Contract",
  body: "<h2>Proposal</h2><p>Thank you for your interest...</p>",
  isHtml: true,
  attachments: [
    { filename: "proposal.pdf", path: "/documents/proposal.pdf" },
    { filename: "contract.pdf", path: "/documents/contract.pdf" }
  ]
})
```

**Limitations**:
- Total attachment size: 25MB maximum
- Individual attachments validated before sending
- Email addresses validated for proper format

**Error Handling**:
- Invalid email addresses detected before sending
- Attachment size validation
- File not found errors for attachments
- Gmail API quota limits

---

## Standard Tools

### gmail_get_thread

Retrieves a complete conversation thread with all messages.

**Purpose**: Get all messages in an email conversation, useful for viewing entire email chains.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `threadId` | string | Yes | - | The ID of the thread to retrieve |
| `returnInline` | boolean | No | false | Return results inline instead of saving to file. Default: false (saves to markdown) |
| `outputDescription` | string | No | - | Human-readable description for the output filename (e.g., 'project-discussion'). If not provided, uses thread subject. |

**Returns (Default - Saved to File)**:
```json
{
  "success": true,
  "savedToFile": true,
  "filePath": "~/.mcp-gmail/exports/get-thread/2025-11-10-project-discussion.md",
  "count": 3,
  "threadId": "18f2d3e4b5c6a7d8",
  "format": "markdown",
  "message": "Thread with 3 messages saved. Use grep to search or read the file."
}
```

**Returns (When `returnInline: true`)**: Formatted text showing all messages in the thread with full details.

**Usage Examples**:

```typescript
// Default: Save thread to markdown file
gmail_get_thread({
  threadId: "18f2d3e4b5c6a7d8",
  outputDescription: "project-discussion"
})
// Returns filepath to ~/.mcp-gmail/exports/get-thread/2025-11-10-project-discussion.md

// Get thread inline (text format)
gmail_get_thread({
  threadId: "18f2d3e4b5c6a7d8",
  returnInline: true
})

// Save thread to file (auto-generates filename from subject)
gmail_get_thread({
  threadId: "18f2d3e4b5c6a7d8"
})
```

**Output Format**:
```
Thread ID: 18f2d3e4b5c6a7d8
Number of messages: 3
Snippet: Re: Project Discussion

================================================================================

MESSAGE 1 of 3
ID: 18f2d3e4b5c6a7d8
From: colleague@company.com
To: me@company.com
Subject: Project Discussion
Date: Mon, 15 Jan 2024 10:30:00 -0800
Labels: INBOX, UNREAD

--- Body ---
Let's discuss the project timeline...

--------------------------------------------------------------------------------

MESSAGE 2 of 3
...
```

**Best Practices**:
- Use thread IDs from message listings
- Threads show conversation history in chronological order
- Includes all attachments from all messages in thread

---

### gmail_create_draft

Creates an email draft in Gmail that can be edited or sent later.

**Purpose**: Save email drafts for later editing or sending.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `to` | string/array | Yes | - | Recipient email address(es) |
| `subject` | string | Yes | - | Email subject line |
| `body` | string | Yes | - | Email body content |
| `cc` | string/array | No | - | CC recipient(s) |
| `bcc` | string/array | No | - | BCC recipient(s) |
| `isHtml` | boolean | No | false | Whether body is HTML |
| `from` | string | No | (authenticated user) | Sender email address |

**Returns**: Draft ID and confirmation message.

**Usage Examples**:

```typescript
// Create simple draft
gmail_create_draft({
  to: "recipient@example.com",
  subject: "Draft Email",
  body: "This is a draft message."
})

// Create HTML draft with CC
gmail_create_draft({
  to: ["recipient1@example.com", "recipient2@example.com"],
  cc: "manager@company.com",
  subject: "Project Update Draft",
  body: "<h1>Update</h1><p>Draft content...</p>",
  isHtml: true
})
```

**Best Practices**:
- Save the returned draft ID to send it later with `gmail_send_draft`
- Drafts appear in your Gmail Drafts folder
- Can be edited manually in Gmail before sending

---

### gmail_send_draft

Sends a previously created draft email.

**Purpose**: Send a draft that was created with `gmail_create_draft` or manually in Gmail.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `draftId` | string | Yes | - | The ID of the draft to send |

**Returns**: Confirmation with sent message details.

**Usage Examples**:

```typescript
// Send a draft
gmail_send_draft({
  draftId: "r-1234567890"
})
```

**Notes**:
- Once sent, the draft is deleted from Drafts folder
- Message appears in Sent folder after sending
- Cannot be undone after sending

---

### gmail_modify_message

Modifies message labels to mark as read/unread, star, archive, etc.

**Purpose**: Change message status by adding or removing labels.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `messageId` | string | Yes | - | The ID of the message to modify |
| `addLabelIds` | string[] | No | - | Label IDs to add (e.g., ['STARRED', 'IMPORTANT']) |
| `removeLabelIds` | string[] | No | - | Label IDs to remove (e.g., ['UNREAD', 'INBOX']) |

**Returns**: Confirmation with updated labels.

**Common Operations**:

```typescript
// Mark as read
gmail_modify_message({
  messageId: "18f2d3e4b5c6a7d8",
  removeLabelIds: ["UNREAD"]
})

// Mark as unread
gmail_modify_message({
  messageId: "18f2d3e4b5c6a7d8",
  addLabelIds: ["UNREAD"]
})

// Star a message
gmail_modify_message({
  messageId: "18f2d3e4b5c6a7d8",
  addLabelIds: ["STARRED"]
})

// Archive (remove from inbox)
gmail_modify_message({
  messageId: "18f2d3e4b5c6a7d8",
  removeLabelIds: ["INBOX"]
})

// Mark important and star
gmail_modify_message({
  messageId: "18f2d3e4b5c6a7d8",
  addLabelIds: ["STARRED", "IMPORTANT"]
})

// Move to trash
gmail_modify_message({
  messageId: "18f2d3e4b5c6a7d8",
  addLabelIds: ["TRASH"]
})

// Apply custom label
gmail_modify_message({
  messageId: "18f2d3e4b5c6a7d8",
  addLabelIds: ["Label_123456789"]
})
```

**System Labels**: See [System Labels Reference](#system-labels-reference) below.

---

### gmail_list_labels

Lists all labels in the Gmail account (system and custom).

**Purpose**: View all available labels with message counts and settings.

**Parameters**: None

**Returns**: Formatted list of system and custom labels with details.

**Usage Examples**:

```typescript
// List all labels
gmail_list_labels({})
```

**Output Example**:
```
Total labels: 25 (15 system, 10 custom)

SYSTEM LABELS:
================================================================================
ID: INBOX
Name: INBOX
Messages: 150 total, 25 unread
Threads: 120 total, 20 unread

ID: STARRED
Name: STARRED
Messages: 45 total, 5 unread
...

CUSTOM LABELS:
================================================================================
ID: Label_123456789
Name: Work/Projects
Color: #ff0000
Messages: 30 total, 5 unread
Label list visibility: labelShow
Message list visibility: show
...
```

**Best Practices**:
- Use label IDs (not names) when calling other tools
- System labels use their name as ID (e.g., "INBOX", "STARRED")
- Custom labels have IDs like "Label_123456789"

---

### gmail_create_label

Creates a new custom label in Gmail.

**Purpose**: Organize emails with custom labels (similar to folders).

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | Yes | - | The name of the label to create |
| `labelListVisibility` | enum | No | "labelShow" | Show label in list: 'labelShow', 'labelShowIfUnread', 'labelHide' |
| `messageListVisibility` | enum | No | "show" | Show messages: 'show' or 'hide' |
| `backgroundColor` | string | No | - | Background color in hex (e.g., '#ff0000') |
| `textColor` | string | No | - | Text color in hex (e.g., '#ffffff') |

**Returns**: Created label details with ID.

**Usage Examples**:

```typescript
// Create simple label
gmail_create_label({
  name: "Important Projects"
})

// Create label with color
gmail_create_label({
  name: "Urgent",
  backgroundColor: "#ff0000",
  textColor: "#ffffff"
})

// Create nested label (use / separator)
gmail_create_label({
  name: "Work/Clients/Acme Corp"
})

// Create label that only shows when unread
gmail_create_label({
  name: "Newsletters",
  labelListVisibility: "labelShowIfUnread"
})
```

**Visibility Options**:
- `labelListVisibility`:
  - `labelShow`: Always show in label list (default)
  - `labelShowIfUnread`: Show only if unread messages exist
  - `labelHide`: Hide from label list
- `messageListVisibility`:
  - `show`: Show messages with this label (default)
  - `hide`: Hide messages (useful for automatic filtering)

**Best Practices**:
- Use descriptive names
- Use nested labels with `/` for hierarchy (e.g., "Work/Projects")
- Save the returned label ID for use with other tools
- Colors help visually organize labels

---

### gmail_get_attachment

Downloads and saves email attachments.

**Purpose**: Extract and save file attachments from emails.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `messageId` | string | Yes | - | The ID of the message containing the attachment |
| `attachmentId` | string | Yes | - | The ID of the attachment to download |
| `savePath` | string | No | - | File path to save attachment (if not provided, returns base64 data) |
| `filename` | string | No | - | Filename when saving to directory |

**Returns**: Attachment details and save confirmation or base64 data.

**Usage Examples**:

```typescript
// Download and save attachment
gmail_get_attachment({
  messageId: "18f2d3e4b5c6a7d8",
  attachmentId: "ANGjdJ9x...",
  savePath: "/Users/john/Downloads/report.pdf"
})

// Save to directory (uses original filename)
gmail_get_attachment({
  messageId: "18f2d3e4b5c6a7d8",
  attachmentId: "ANGjdJ9x...",
  savePath: "/Users/john/Downloads/"
})

// Get base64 data without saving
gmail_get_attachment({
  messageId: "18f2d3e4b5c6a7d8",
  attachmentId: "ANGjdJ9x..."
})
```

**Getting Attachment IDs**:
1. Use `gmail_read_message` with format='full'
2. Use `gmail_search_messages` with includeBody=true
3. Use `gmail_get_thread` to see all attachments in conversation

**Best Practices**:
- Check attachment size before downloading
- Validate file paths exist and are writable
- Use full absolute paths for `savePath`

---

## Advanced Tools

### gmail_list_filters

Lists all email filters with their criteria and actions.

**Purpose**: View automated email filtering rules in your Gmail account.

**Parameters**: None

**Returns**: Formatted list of all filters with criteria and actions.

**Usage Examples**:

```typescript
// List all filters
gmail_list_filters({})
```

**Output Example**:
```
Found 5 email filter(s):

1. Filter ID: ANGjdJ9x...
   Criteria:
     - From: newsletter@example.com
   Actions:
     - Add Labels: INBOX, READ
     - Remove Labels: UNREAD

2. Filter ID: BNHkeK8y...
   Criteria:
     - Subject: Invoice
     - Has Attachment: true
   Actions:
     - Add Labels: Label_123456789 (Invoices)
...
```

**Use Cases**:
- Audit existing filters
- Document automation rules
- Debug email routing issues
- Review filter criteria before creating similar ones

---

### gmail_create_filter

Creates a new automated email filter rule.

**Purpose**: Automatically process incoming emails based on criteria (sender, subject, keywords, etc.).

**Parameters**:

**Criteria** (at least one required):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | No | Filter by sender (e.g., 'user@example.com') |
| `to` | string | No | Filter by recipient |
| `subject` | string | No | Filter by subject text |
| `query` | string | No | Gmail search query |
| `negatedQuery` | string | No | Negated query (NOT matching) |
| `hasAttachment` | boolean | No | Filter by attachment presence |
| `excludeChats` | boolean | No | Exclude chat messages |
| `size` | number | No | Message size in bytes |
| `sizeComparison` | enum | No | 'larger' or 'smaller' |

**Actions** (at least one required):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `addLabelIds` | string[] | No | Labels to add |
| `removeLabelIds` | string[] | No | Labels to remove |
| `forward` | string | No | Email address to forward to |

**Returns**: Created filter details with ID.

**Usage Examples**:

```typescript
// Auto-archive newsletters
gmail_create_filter({
  from: "newsletter@example.com",
  removeLabelIds: ["INBOX"],
  addLabelIds: ["Label_123456789"]  // Custom "Newsletters" label
})

// Mark emails from boss as important
gmail_create_filter({
  from: "boss@company.com",
  addLabelIds: ["IMPORTANT", "STARRED"]
})

// Auto-forward invoices
gmail_create_filter({
  subject: "Invoice",
  hasAttachment: true,
  forward: "accounting@company.com",
  addLabelIds: ["Label_987654321"]  // Custom "Invoices" label
})

// Auto-delete spam from specific sender
gmail_create_filter({
  from: "spam@example.com",
  addLabelIds: ["TRASH"]
})

// Filter by size (large attachments)
gmail_create_filter({
  size: 10485760,  // 10MB in bytes
  sizeComparison: "larger",
  addLabelIds: ["Label_555555555"]  // Custom "Large Files" label
})

// Complex filter with query
gmail_create_filter({
  query: "has:attachment (pdf OR doc)",
  from: "client@example.com",
  addLabelIds: ["IMPORTANT", "Label_123456789"]
})
```

**Best Practices**:
- Test filters with `gmail_search_messages` using the same query first
- Use specific criteria to avoid false positives
- Create labels before using them in filters
- Document your filters with descriptive label names
- Start with conservative actions (add labels) before aggressive ones (delete)

---

### gmail_get_settings

Retrieves comprehensive Gmail account settings.

**Purpose**: View all Gmail settings including signatures, vacation responder, forwarding, IMAP/POP, and more.

**Parameters**: None

**Returns**: Comprehensive formatted settings report.

**Usage Examples**:

```typescript
// Get all settings
gmail_get_settings({})
```

**Output Sections**:
- Email Addresses & Signatures
- Vacation Responder (Auto-Reply)
- Forwarding Addresses
- Auto-Forwarding
- IMAP Settings
- POP Settings
- Language Settings

**Use Cases**:
- Audit account configuration
- Verify signature before updating
- Check vacation responder status
- Review forwarding rules
- Document account setup

---

### gmail_update_signature

Updates the email signature for your Gmail account.

**Purpose**: Set or modify your email signature that appears at the bottom of sent emails.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `signature` | string | Yes | - | Email signature text (can include HTML) |
| `sendAsEmail` | string | No | 'me' | Email address to update signature for |

**Returns**: Confirmation with updated signature.

**Usage Examples**:

```typescript
// Simple text signature
gmail_update_signature({
  signature: "Best regards,\nJohn Smith\nSoftware Engineer"
})

// HTML signature
gmail_update_signature({
  signature: `
<div style="font-family: Arial, sans-serif;">
  <strong>John Smith</strong><br>
  Software Engineer<br>
  <a href="mailto:john@company.com">john@company.com</a><br>
  Phone: (555) 123-4567
</div>
  `
})

// Signature with company branding
gmail_update_signature({
  signature: `
<table style="font-family: Arial, sans-serif; font-size: 12px;">
  <tr>
    <td>
      <strong>John Smith</strong><br>
      Senior Developer<br>
      Acme Corporation<br>
      john@acme.com | www.acme.com
    </td>
  </tr>
</table>
  `
})
```

**Best Practices**:
- Keep signatures concise (4-6 lines recommended)
- Include essential contact information only
- Test HTML signatures in different email clients
- Use inline CSS for HTML (not external stylesheets)
- Avoid large images in signatures

---

### gmail_set_vacation

Configures automatic vacation/auto-reply responder.

**Purpose**: Set up automatic replies when you're away or unable to respond to emails.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `enabled` | boolean | Yes | - | Enable or disable vacation responder |
| `responseBody` | string | No* | - | Auto-reply message (*required if enabled=true) |
| `responseSubject` | string | No | - | Subject line for auto-reply |
| `startTime` | number | No | - | Start time (Unix timestamp in milliseconds) |
| `endTime` | number | No | - | End time (Unix timestamp in milliseconds) |
| `restrictToContacts` | boolean | No | false | Only reply to contacts |
| `restrictToDomain` | boolean | No | false | Only reply to domain |
| `isHtml` | boolean | No | false | Body is HTML |

**Returns**: Confirmation with vacation responder details.

**Usage Examples**:

```typescript
// Enable simple vacation responder
gmail_set_vacation({
  enabled: true,
  responseBody: "I'm out of office until January 20th. I'll respond to your email when I return."
})

// Vacation with subject and restrictions
gmail_set_vacation({
  enabled: true,
  responseSubject: "Out of Office",
  responseBody: "Thank you for your email. I'm currently on vacation and will respond when I return on January 20th.",
  restrictToContacts: true
})

// Scheduled vacation with dates
gmail_set_vacation({
  enabled: true,
  responseBody: "I'm on vacation from Jan 15-20. For urgent matters, contact support@company.com.",
  startTime: 1705276800000,  // Jan 15, 2024
  endTime: 1705708800000     // Jan 20, 2024
})

// HTML vacation message
gmail_set_vacation({
  enabled: true,
  responseSubject: "Out of Office",
  responseBody: `
<html>
  <body>
    <h2>Out of Office</h2>
    <p>Thank you for your email.</p>
    <p>I'm currently on vacation until <strong>January 20th</strong>.</p>
    <p>For urgent matters, please contact:</p>
    <ul>
      <li>Support: support@company.com</li>
      <li>Manager: manager@company.com</li>
    </ul>
  </body>
</html>
  `,
  isHtml: true
})

// Disable vacation responder
gmail_set_vacation({
  enabled: false
})
```

**Best Practices**:
- Include return date in message
- Provide alternative contact for urgent matters
- Use `restrictToContacts` to avoid spam replies
- Set end time to automatically disable responder
- Test by sending yourself an email
- Remember to disable when you return if no end time set

---

### gmail_batch_modify

Bulk modify multiple Gmail messages at once (up to 1000 messages).

**Purpose**: Efficiently apply label changes to many messages simultaneously.

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `messageIds` | string[] | Yes | - | Array of message IDs to modify (max 1000) |
| `addLabelIds` | string[] | No | - | Label IDs to add to all messages |
| `removeLabelIds` | string[] | No | - | Label IDs to remove from all messages |

**Returns**: Confirmation with number of messages modified.

**Usage Examples**:

```typescript
// Bulk archive messages
gmail_batch_modify({
  messageIds: ["id1", "id2", "id3", ...],
  removeLabelIds: ["INBOX"]
})

// Bulk mark as read
gmail_batch_modify({
  messageIds: ["id1", "id2", "id3", ...],
  removeLabelIds: ["UNREAD"]
})

// Bulk star important messages
gmail_batch_modify({
  messageIds: ["id1", "id2", "id3", ...],
  addLabelIds: ["STARRED"]
})

// Move multiple messages to trash
gmail_batch_modify({
  messageIds: ["id1", "id2", "id3", ...],
  addLabelIds: ["TRASH"],
  removeLabelIds: ["INBOX"]
})

// Apply custom label to many messages
gmail_batch_modify({
  messageIds: ["id1", "id2", "id3", ...],
  addLabelIds: ["Label_123456789"]
})

// Bulk categorize and mark as read
gmail_batch_modify({
  messageIds: ["id1", "id2", "id3", ...],
  addLabelIds: ["Label_555555555"],
  removeLabelIds: ["UNREAD"]
})
```

**Workflow Example**:

```typescript
// 1. Search for messages to bulk modify
const searchResult = gmail_search_messages({
  query: "from:newsletter@example.com is:unread",
  maxResults: 100
});

// 2. Extract message IDs
const messageIds = searchResult.messages.map(msg => msg.id);

// 3. Bulk archive and mark as read
gmail_batch_modify({
  messageIds: messageIds,
  removeLabelIds: ["INBOX", "UNREAD"]
});
```

**Limitations**:
- Maximum 1000 messages per batch
- At least one of `addLabelIds` or `removeLabelIds` required
- All messages modified with same label changes

**Best Practices**:
- Use `gmail_search_messages` to find messages for bulk operations
- Preview message count before batch modifying
- Use conservative label changes to avoid mistakes
- Consider backing up important labels first
- Split large operations into multiple batches of 1000

---

## Gmail Search Query Syntax

Gmail's search operators allow powerful message filtering. Use these in `gmail_search_messages` or `gmail_list_messages` `query` parameter.

### Basic Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `from:` | Sender email or name | `from:example@gmail.com` |
| `to:` | Recipient email | `to:me` |
| `subject:` | Subject line text | `subject:invoice` |
| `label:` | Messages with label | `label:important` |
| `has:attachment` | Messages with attachments | `has:attachment` |
| `is:unread` | Unread messages | `is:unread` |
| `is:read` | Read messages | `is:read` |
| `is:starred` | Starred messages | `is:starred` |
| `is:important` | Important messages | `is:important` |

### Date Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `after:` | After date (YYYY/MM/DD) | `after:2024/01/01` |
| `before:` | Before date | `before:2024/12/31` |
| `older:` | Older than (d/m/y) | `older:7d` (7 days ago) |
| `newer:` | Newer than | `newer:2d` (last 2 days) |
| `older_than:` | Alternative syntax | `older_than:1y` |
| `newer_than:` | Alternative syntax | `newer_than:3m` |

### Size Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `larger:` | Larger than size | `larger:10M` (10 megabytes) |
| `smaller:` | Smaller than size | `smaller:1M` |
| `size:` | Exact size | `size:5M` |

### Boolean Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `OR` | Match either condition | `from:alice OR from:bob` |
| `-` | Exclude/negate | `-from:spam@example.com` |
| `""` | Exact phrase | `subject:"monthly report"` |
| `()` | Group conditions | `(from:alice OR from:bob) subject:urgent` |

### Advanced Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `in:` | In folder | `in:inbox`, `in:trash`, `in:spam` |
| `filename:` | Attachment filename | `filename:pdf` |
| `cc:` | CC recipient | `cc:manager@company.com` |
| `bcc:` | BCC recipient | `bcc:archive@company.com` |
| `has:` | Has feature | `has:yellow-star`, `has:drive`, `has:document` |
| `list:` | Mailing list | `list:announcements@company.com` |

### Complex Query Examples

```typescript
// Unread emails with attachments from specific sender
"from:client@example.com is:unread has:attachment"

// Large PDFs from last month
"filename:pdf larger:5M after:2024/01/01 before:2024/02/01"

// Important emails excluding newsletters
"is:important -label:newsletters"

// Emails from team members about specific project
"(from:alice OR from:bob OR from:charlie) subject:project-x"

// Unread emails from last week excluding automated
"is:unread newer:7d -(from:noreply OR from:automated)"

// All emails with invoices
"subject:invoice OR filename:invoice OR (has:attachment filename:pdf subject:payment)"
```

---

## System Labels Reference

Gmail system labels can be used with `gmail_modify_message`, `gmail_batch_modify`, and filter tools.

### Core Labels

| Label ID | Name | Description |
|----------|------|-------------|
| `INBOX` | Inbox | Messages in inbox |
| `SENT` | Sent | Sent messages |
| `DRAFT` | Drafts | Draft messages |
| `TRASH` | Trash | Deleted messages (deleted after 30 days) |
| `SPAM` | Spam | Spam messages |

### Status Labels

| Label ID | Name | Description |
|----------|------|-------------|
| `UNREAD` | Unread | Unread messages |
| `STARRED` | Starred | Starred/favorited messages |
| `IMPORTANT` | Important | Important messages |

### Category Labels

| Label ID | Name | Description |
|----------|------|-------------|
| `CATEGORY_PERSONAL` | Personal | Personal category |
| `CATEGORY_SOCIAL` | Social | Social networks |
| `CATEGORY_PROMOTIONS` | Promotions | Promotional emails |
| `CATEGORY_UPDATES` | Updates | Update notifications |
| `CATEGORY_FORUMS` | Forums | Forum/mailing list messages |

### Special Labels

| Label ID | Name | Description |
|----------|------|-------------|
| `CHAT` | Chat | Google Chat messages |
| `UNREAD` | Unread | Unread status |

### Label Operations

**Add Labels** (using `addLabelIds`):
- Adds labels without removing existing ones
- Can add multiple labels at once
- Use to categorize, star, or mark important

**Remove Labels** (using `removeLabelIds`):
- Removes labels without affecting others
- Use to mark as read (remove `UNREAD`)
- Use to archive (remove `INBOX`)

**Common Patterns**:

```typescript
// Archive = Remove from inbox
removeLabelIds: ["INBOX"]

// Mark as read = Remove unread label
removeLabelIds: ["UNREAD"]

// Mark as unread = Add unread label
addLabelIds: ["UNREAD"]

// Star = Add starred label
addLabelIds: ["STARRED"]

// Move to trash = Add trash, remove inbox
addLabelIds: ["TRASH"], removeLabelIds: ["INBOX"]

// Mark important and star
addLabelIds: ["IMPORTANT", "STARRED"]
```

---

## Common Workflows

### Email Triage Workflow

```typescript
// 1. List unread inbox messages
const messages = gmail_list_messages({
  labelIds: ["INBOX", "UNREAD"],
  maxResults: 50
});

// 2. Read each important message
for (const msg of messages.messages) {
  if (msg.isImportant) {
    const full = gmail_read_message({
      messageId: msg.id,
      format: "simple"
    });
    // Process message...
  }
}

// 3. Archive processed messages
gmail_batch_modify({
  messageIds: processedIds,
  removeLabelIds: ["INBOX", "UNREAD"]
});
```

### Newsletter Management

```typescript
// 1. Create newsletter label
const label = gmail_create_label({
  name: "Newsletters",
  labelListVisibility: "labelShowIfUnread"
});

// 2. Create filter for known newsletters
gmail_create_filter({
  from: "newsletter@example.com",
  addLabelIds: [label.id],
  removeLabelIds: ["INBOX", "UNREAD"]
});

// 3. Find and categorize existing newsletters
const newsletters = gmail_search_messages({
  query: "from:newsletter@example.com",
  maxResults: 500
});

// 4. Bulk apply label
gmail_batch_modify({
  messageIds: newsletters.messages.map(m => m.id),
  addLabelIds: [label.id],
  removeLabelIds: ["INBOX"]
});
```

### Attachment Download Workflow

```typescript
// 1. Search for emails with attachments
const messages = gmail_search_messages({
  query: "from:client@example.com has:attachment filename:pdf",
  includeBody: false,
  maxResults: 20
});

// 2. Download all attachments
for (const msg of messages.messages) {
  const fullMsg = gmail_read_message({
    messageId: msg.id,
    format: "full"
  });

  for (const attachment of fullMsg.message.attachments) {
    gmail_get_attachment({
      messageId: msg.id,
      attachmentId: attachment.attachmentId,
      savePath: `/Users/john/Downloads/${attachment.filename}`
    });
  }
}
```

### Automated Email Sending

```typescript
// 1. Create draft templates
const draft1 = gmail_create_draft({
  to: "client1@example.com",
  subject: "Weekly Report",
  body: "Please find this week's report attached.",
  isHtml: false
});

// 2. Send draft when ready
gmail_send_draft({
  draftId: draft1.id
});

// OR send directly
gmail_send_email({
  to: "client@example.com",
  subject: "Automated Report",
  body: "<h1>Weekly Report</h1><p>Data attached.</p>",
  isHtml: true,
  attachments: [
    { filename: "report.pdf", path: "/reports/weekly.pdf" }
  ]
});
```

### Vacation Setup Workflow

```typescript
// 1. Get current settings
const settings = gmail_get_settings({});

// 2. Update signature for vacation
gmail_update_signature({
  signature: "John Smith\nOut of office until Jan 20"
});

// 3. Enable vacation responder
gmail_set_vacation({
  enabled: true,
  responseSubject: "Out of Office",
  responseBody: "I'm on vacation until January 20th. I'll respond when I return.",
  startTime: Date.now(),
  endTime: Date.parse("2024-01-20"),
  restrictToContacts: true
});

// 4. When returning - disable vacation
gmail_set_vacation({
  enabled: false
});

// 5. Restore signature
gmail_update_signature({
  signature: "John Smith\nSoftware Engineer"
});
```

### Thread Management

```typescript
// 1. Find all messages in a conversation
const thread = gmail_get_thread({
  threadId: "18f2d3e4b5c6a7d8"
});

// 2. Download all attachments from thread
// (parse thread output to extract attachment IDs)

// 3. Archive entire thread
// (get all message IDs from thread)
gmail_batch_modify({
  messageIds: threadMessageIds,
  removeLabelIds: ["INBOX"]
});
```

---

## Error Handling

All tools return error information when operations fail:

```json
{
  "success": false,
  "error": "Error message description",
  "errorType": "GmailAPIError",
  "errorCode": 404
}
```

**Common Errors**:
- `401`: Authentication failed (re-authenticate)
- `403`: Permission denied (check OAuth scopes)
- `404`: Message/thread/label not found
- `429`: Rate limit exceeded (wait and retry)
- `500`: Gmail API server error (retry later)

**Best Practices**:
- Always check `success` field in responses
- Handle errors gracefully with retries
- Log errors for debugging
- Validate input parameters before calling tools
- Use specific error messages to guide troubleshooting

---

## Additional Resources

- **Gmail API Documentation**: https://developers.google.com/gmail/api
- **Search Operators**: https://support.google.com/mail/answer/7190
- **OAuth 2.0 Setup**: See [AUTHENTICATION.md](./AUTHENTICATION.md)
- **Quick Start Guide**: See [QUICKSTART.md](./QUICKSTART.md)
- **Main README**: See [README.md](./README.md)

---

**Need help?** Open an issue in the repository or consult the Gmail API documentation.
