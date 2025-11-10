// src/tools/get-thread.ts
// Get full conversation thread with all messages

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError, parseMessages } from "../utils/index.js";
import { exportThreadToMarkdown } from "../utils/markdown-exporter.js";

const GetThreadSchema = z.object({
  threadId: z.string().describe("The ID of the thread to retrieve"),
  returnInline: z
    .boolean()
    .optional()
    .describe(
      "Return results inline instead of saving to file. Default: false (saves to markdown file)"
    ),
  outputDescription: z
    .string()
    .optional()
    .describe(
      "Human-readable description for the output filename (e.g., 'project-discussion'). " +
      "If not provided, uses the thread subject."
    ),
});

export default class GetThreadTool extends MCPTool {
  name = "getThread";
  description = "Gets a complete conversation thread with all messages. Returns full details for each message including sender, subject, body, and attachments in chronological order.";
  schema = GetThreadSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Apply defaults
      const returnInline = input.returnInline ?? false;
      const outputDescription = input.outputDescription;

      // Get full thread with all messages
      const response = await gmail.users.threads.get({
        userId: 'me',
        id: input.threadId,
        format: 'full',
      });

      const thread = response.data;

      if (!thread.messages || thread.messages.length === 0) {
        return {
          success: true,
          threadId: input.threadId,
          count: 0,
          message: `Thread ${input.threadId} found but contains no messages.`,
        };
      }

      // Parse all messages in the thread
      const parsedMessages = parseMessages(thread.messages);

      // Check if we should export to file (default behavior)
      if (!returnInline) {
        // Export to markdown file
        const exportResult = await exportThreadToMarkdown(
          input.threadId,
          parsedMessages,
          outputDescription
        );

        // If export successful, return export result
        if (exportResult.savedToFile) {
          return {
            success: true,
            savedToFile: true,
            filePath: exportResult.filePath,
            count: exportResult.count,
            threadId: input.threadId,
            format: 'markdown',
            message: exportResult.message,
          };
        }

        // If export failed, fall through to return inline (with warning)
      }

      // Format output
      const output: string[] = [];
      output.push(`Thread ID: ${thread.id}`);
      output.push(`Number of messages: ${parsedMessages.length}`);
      output.push(`Snippet: ${thread.snippet || 'N/A'}`);
      output.push('');
      output.push('='.repeat(80));
      output.push('');

      // Display each message
      parsedMessages.forEach((msg, idx) => {
        output.push(`MESSAGE ${idx + 1} of ${parsedMessages.length}`);
        output.push(`ID: ${msg.id}`);
        output.push(`From: ${msg.from || 'Unknown'}`);
        output.push(`To: ${msg.to?.join(', ') || 'Unknown'}`);
        if (msg.cc && msg.cc.length > 0) {
          output.push(`Cc: ${msg.cc.join(', ')}`);
        }
        output.push(`Subject: ${msg.subject || 'No subject'}`);
        output.push(`Date: ${msg.date || 'Unknown'}`);
        output.push(`Labels: ${msg.labelIds.join(', ') || 'None'}`);
        output.push('');
        output.push('--- Body ---');
        output.push(msg.body.plain || msg.snippet || '(No text content)');

        if (msg.attachments.length > 0) {
          output.push('');
          output.push('--- Attachments ---');
          msg.attachments.forEach(att => {
            output.push(`- ${att.filename} (${att.mimeType}, ${formatBytes(att.size)})`);
            output.push(`  Attachment ID: ${att.attachmentId}`);
          });
        }

        output.push('');
        output.push('-'.repeat(80));
        output.push('');
      });

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error retrieving thread: ${gmailError.message}`;
    }
  }
}

/**
 * Formats bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
