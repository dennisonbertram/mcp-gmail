// src/utils/markdown-exporter.ts
// Utility for exporting email results to markdown files

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ParsedMessage, getMessageBody } from './message-parser.js';

/**
 * Result of an export operation
 */
export interface ExportResult {
  success: boolean;
  savedToFile: boolean;
  filePath: string | null;
  count: number;
  format: 'markdown';
  message: string;
  error?: string;
}

/**
 * Sanitize a string for use in a filename
 * Removes/replaces unsafe characters and truncates to reasonable length
 */
export function sanitizeFilename(input: string, maxLength: number = 50): string {
  return input
    .toLowerCase()
    .replace(/[/\\:*?"<>|]/g, '') // Remove unsafe filename characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '')    // Remove any remaining special chars
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '')         // Remove leading/trailing hyphens
    .substring(0, maxLength);      // Truncate to max length
}

/**
 * Ensure the export directory exists
 * Creates ~/.mcp-gmail/exports/{toolName}/ if needed
 */
export async function ensureExportDirectory(toolName: string): Promise<string> {
  const homeDir = os.homedir();
  const exportDir = path.join(homeDir, '.mcp-gmail', 'exports', toolName);

  await fs.mkdir(exportDir, { recursive: true });

  return exportDir;
}

/**
 * Handle filename collisions by appending a counter
 * Returns a unique filename that doesn't exist yet
 */
export async function handleFileCollision(
  directory: string,
  baseFilename: string
): Promise<string> {
  const ext = path.extname(baseFilename);
  const nameWithoutExt = path.basename(baseFilename, ext);

  let counter = 1;
  let filename = baseFilename;

  while (true) {
    const fullPath = path.join(directory, filename);
    try {
      await fs.access(fullPath);
      // File exists, try next counter
      counter++;
      filename = `${nameWithoutExt}-${counter}${ext}`;
    } catch {
      // File doesn't exist, use this filename
      return filename;
    }
  }
}

/**
 * Generate a filename from query or description
 */
export function generateFilename(
  query: string,
  description?: string
): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (description) {
    return `${today}-${sanitizeFilename(description)}.md`;
  }

  // Auto-generate from query
  const sanitized = sanitizeFilename(query);
  return `${today}-${sanitized || 'search-results'}.md`;
}

/**
 * Format a single email as markdown section
 */
function formatEmailMarkdown(email: ParsedMessage, index: number): string {
  const hasAttachments = email.attachments && email.attachments.length > 0;
  const attachmentInfo = hasAttachments
    ? `Yes (${email.attachments.length})`
    : 'No';

  const labels = email.labelIds?.join(', ') || 'None';

  // Get plain text body (already handles HTML-to-text conversion)
  const body = getMessageBody(email);

  return `## Email ${index}

**Date:** ${email.date || 'Unknown'}
**From:** ${email.from || 'Unknown'}
**To:** ${email.to?.join(', ') || 'Unknown'}
**Subject:** ${email.subject || '(No subject)'}
**Labels:** ${labels}
**Attachments:** ${attachmentInfo}
**Message ID:** ${email.id}
**Thread ID:** ${email.threadId}

${body}

---`;
}

/**
 * Format thread message as markdown section
 */
function formatThreadMessageMarkdown(email: ParsedMessage, index: number): string {
  const hasAttachments = email.attachments && email.attachments.length > 0;
  const attachmentInfo = hasAttachments
    ? ` (${email.attachments.length} attachment${email.attachments.length > 1 ? 's' : ''})`
    : '';

  // Get plain text body
  const body = getMessageBody(email);

  return `## Message ${index}${index === 1 ? ' - Initial Email' : ' - Reply'}

**Date:** ${email.date || 'Unknown'}
**From:** ${email.from || 'Unknown'}
**To:** ${email.to?.join(', ') || 'Unknown'}
**Subject:** ${email.subject || '(No subject)'}${attachmentInfo}

${body}

---`;
}

/**
 * Export search/list results to markdown file
 */
export async function exportSearchResultsToMarkdown(
  toolName: string,
  query: string,
  messages: ParsedMessage[],
  outputDescription?: string
): Promise<ExportResult> {
  try {
    // Ensure directory exists
    const exportDir = await ensureExportDirectory(toolName);

    // Generate filename
    const baseFilename = generateFilename(query, outputDescription);
    const filename = await handleFileCollision(exportDir, baseFilename);
    const filePath = path.join(exportDir, filename);

    // Generate markdown content
    const timestamp = new Date().toISOString();
    const title = outputDescription || 'Search Results';

    let markdown = `# ${title}

**Query:** \`${query}\`
**Date:** ${timestamp}
**Count:** ${messages.length} message${messages.length !== 1 ? 's' : ''}
**File:** ${filePath}

---

`;

    // Add each email
    messages.forEach((email, index) => {
      markdown += formatEmailMarkdown(email, index + 1) + '\n\n';
    });

    // Write to file
    await fs.writeFile(filePath, markdown, 'utf-8');

    return {
      success: true,
      savedToFile: true,
      filePath,
      count: messages.length,
      format: 'markdown',
      message: `${messages.length} message${messages.length !== 1 ? 's' : ''} saved. Use grep to search or read the file.`
    };

  } catch (error) {
    // Return error but don't throw - caller can decide how to handle
    return {
      success: false,
      savedToFile: false,
      filePath: null,
      count: messages.length,
      format: 'markdown',
      message: 'Failed to save to disk. Returning data inline.',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Export email thread to markdown file
 */
export async function exportThreadToMarkdown(
  threadId: string,
  messages: ParsedMessage[],
  outputDescription?: string
): Promise<ExportResult> {
  try {
    // Ensure directory exists
    const exportDir = await ensureExportDirectory('get-thread');

    // Generate filename
    const subject = messages[0]?.subject || 'thread';
    const baseFilename = generateFilename(threadId, outputDescription || subject);
    const filename = await handleFileCollision(exportDir, baseFilename);
    const filePath = path.join(exportDir, filename);

    // Collect unique participants
    const participants = new Set<string>();
    messages.forEach(msg => {
      if (msg.from) participants.add(msg.from);
      msg.to?.forEach(to => participants.add(to));
    });

    // Generate markdown content
    const timestamp = new Date().toISOString();
    const title = outputDescription || messages[0]?.subject || 'Email Thread';

    let markdown = `# ${title}

**Thread ID:** ${threadId}
**Date:** ${timestamp}
**Messages:** ${messages.length}
**Participants:** ${Array.from(participants).join(', ')}

---

`;

    // Add each message in thread
    messages.forEach((email, index) => {
      markdown += formatThreadMessageMarkdown(email, index + 1) + '\n\n';
    });

    // Write to file
    await fs.writeFile(filePath, markdown, 'utf-8');

    return {
      success: true,
      savedToFile: true,
      filePath,
      count: messages.length,
      format: 'markdown',
      message: `Thread with ${messages.length} message${messages.length !== 1 ? 's' : ''} saved. Use grep to search or read the file.`
    };

  } catch (error) {
    // Return error but don't throw
    return {
      success: false,
      savedToFile: false,
      filePath: null,
      count: messages.length,
      format: 'markdown',
      message: 'Failed to save to disk. Returning data inline.',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
