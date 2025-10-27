// src/tools/get-attachment.ts
// Download and save email attachments

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { gmail_v1 } from "googleapis";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError, decodeBase64Url } from "../utils/index.js";
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

const GetAttachmentSchema = z.object({
  messageId: z.string().describe("The ID of the message containing the attachment"),
  attachmentId: z.string().describe("The ID of the attachment to download"),
  savePath: z.string().optional().describe("Optional file path to save the attachment. If not provided, returns base64 data."),
  filename: z.string().optional().describe("Optional filename to use when saving (only needed if savePath is a directory)"),
});

export default class GetAttachmentTool extends MCPTool {
  name = "getAttachment";
  description = "Downloads a message attachment by ID. Returns base64-encoded data or saves to a specified file path. Get attachment IDs from getMessage or getThread with format='full'.";

  schema = GetAttachmentSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Get the message to find attachment details
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: input.messageId,
        format: 'full',
      });

      const message = messageResponse.data;

      // Find the attachment in the message
      let attachmentFilename = input.filename || 'attachment';
      let attachmentMimeType = 'application/octet-stream';
      let attachmentSize = 0;

      // Search for the attachment in message parts
      const findAttachment = (parts: gmail_v1.Schema$MessagePart[] | undefined): boolean => {
        if (!parts) return false;

        for (const part of parts) {
          if (part.body?.attachmentId === input.attachmentId) {
            attachmentFilename = part.filename || attachmentFilename;
            attachmentMimeType = part.mimeType || attachmentMimeType;
            attachmentSize = part.body.size || 0;
            return true;
          }
          if (part.parts && findAttachment(part.parts)) {
            return true;
          }
        }
        return false;
      };

      // Check single-part message
      if (message.payload?.body?.attachmentId === input.attachmentId) {
        attachmentFilename = message.payload.filename || attachmentFilename;
        attachmentMimeType = message.payload.mimeType || attachmentMimeType;
        attachmentSize = message.payload.body.size || 0;
      } else {
        // Check multi-part message
        if (!findAttachment(message.payload?.parts)) {
          return `Error: Attachment ID "${input.attachmentId}" not found in message ${input.messageId}. Use getThread to see available attachments.`;
        }
      }

      // Download the attachment
      const attachmentResponse = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: input.messageId,
        id: input.attachmentId,
      });

      const attachmentData = attachmentResponse.data.data;

      if (!attachmentData) {
        return 'Error: No attachment data received from Gmail API.';
      }

      // Decode base64url to buffer
      const decodedData = decodeBase64Url(attachmentData);

      // Save to file if path provided
      if (input.savePath) {
        let finalPath = input.savePath;

        // If savePath is a directory, append filename
        if (finalPath.endsWith('/')) {
          finalPath = resolve(finalPath, attachmentFilename);
        } else if (!finalPath.includes('.') && input.filename) {
          // If no extension and filename provided, treat as directory
          finalPath = resolve(finalPath, attachmentFilename);
        }

        // Save the file
        await writeFile(finalPath, new Uint8Array(decodedData));

        // Format output
        const output: string[] = [];
        output.push('Attachment downloaded successfully!');
        output.push('');
        output.push(`Filename: ${attachmentFilename}`);
        output.push(`MIME type: ${attachmentMimeType}`);
        output.push(`Size: ${formatBytes(attachmentSize)}`);
        output.push(`Saved to: ${finalPath}`);
        output.push('');
        output.push(`Message ID: ${input.messageId}`);
        output.push(`Attachment ID: ${input.attachmentId}`);

        return output.join('\n');
      } else {
        // Return base64 data
        const base64Data = decodedData.toString('base64');

        const output: string[] = [];
        output.push('Attachment downloaded successfully!');
        output.push('');
        output.push(`Filename: ${attachmentFilename}`);
        output.push(`MIME type: ${attachmentMimeType}`);
        output.push(`Size: ${formatBytes(attachmentSize)}`);
        output.push('');
        output.push('Base64-encoded data:');
        output.push('');
        output.push(base64Data);
        output.push('');
        output.push('To save this attachment, call this tool again with the savePath parameter.');

        return output.join('\n');
      }

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error downloading attachment: ${gmailError.message}`;
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
