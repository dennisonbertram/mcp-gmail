// src/tools/modify-message.ts
// Modify message labels (mark as read/unread, star, archive, etc.)

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const ModifyMessageSchema = z.object({
  messageId: z.string().describe("The ID of the message to modify"),
  addLabelIds: z.array(z.string()).optional().describe("Array of label IDs to add (e.g., ['STARRED', 'IMPORTANT'] or custom label IDs)"),
  removeLabelIds: z.array(z.string()).optional().describe("Array of label IDs to remove (e.g., ['UNREAD', 'INBOX'] to mark as read and archive)"),
});

export default class ModifyMessageTool extends MCPTool {
  name = "modifyMessage";
  description = `Modifies message labels to mark as read/unread, star/unstar, archive, trash, or apply custom labels.

Common operations:
- Mark as read: removeLabelIds: ["UNREAD"]
- Star message: addLabelIds: ["STARRED"]
- Archive: removeLabelIds: ["INBOX"]

System labels: INBOX, UNREAD, STARRED, IMPORTANT, SENT, DRAFT, SPAM, TRASH`;

  schema = ModifyMessageSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Validate that at least one label operation is provided
      if ((!input.addLabelIds || input.addLabelIds.length === 0) &&
          (!input.removeLabelIds || input.removeLabelIds.length === 0)) {
        return "Error: Must provide at least one of 'addLabelIds' or 'removeLabelIds'";
      }

      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Get message details before modification
      const beforeResponse = await gmail.users.messages.get({
        userId: 'me',
        id: input.messageId,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });

      const headers = beforeResponse.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';

      // Build request body with exactOptionalPropertyTypes compliance
      const requestBody: { addLabelIds?: string[]; removeLabelIds?: string[] } = {};
      if (input.addLabelIds !== undefined) {
        requestBody.addLabelIds = input.addLabelIds;
      }
      if (input.removeLabelIds !== undefined) {
        requestBody.removeLabelIds = input.removeLabelIds;
      }

      // Modify message labels
      const response = await gmail.users.messages.modify({
        userId: 'me',
        id: input.messageId,
        requestBody,
      });

      const afterLabels = response.data.labelIds || [];

      // Format output
      const output: string[] = [];
      output.push('Message modified successfully!');
      output.push('');
      output.push(`Message ID: ${input.messageId}`);
      output.push(`From: ${from}`);
      output.push(`Subject: ${subject}`);
      output.push('');

      if (input.addLabelIds && input.addLabelIds.length > 0) {
        output.push('Added labels:');
        input.addLabelIds.forEach(label => {
          output.push(`  + ${label}`);
        });
        output.push('');
      }

      if (input.removeLabelIds && input.removeLabelIds.length > 0) {
        output.push('Removed labels:');
        input.removeLabelIds.forEach(label => {
          output.push(`  - ${label}`);
        });
        output.push('');
      }

      output.push('Current labels:');
      if (afterLabels.length > 0) {
        afterLabels.forEach(label => {
          output.push(`  • ${label}`);
        });
      } else {
        output.push('  (No labels)');
      }

      // Add helpful messages for common operations
      const removed = input.removeLabelIds || [];
      const added = input.addLabelIds || [];

      if (removed.includes('UNREAD')) {
        output.push('');
        output.push('✓ Message marked as read');
      }
      if (added.includes('UNREAD')) {
        output.push('');
        output.push('✓ Message marked as unread');
      }
      if (removed.includes('INBOX')) {
        output.push('');
        output.push('✓ Message archived (removed from inbox)');
      }
      if (added.includes('STARRED')) {
        output.push('');
        output.push('✓ Message starred');
      }
      if (removed.includes('STARRED')) {
        output.push('');
        output.push('✓ Message unstarred');
      }
      if (added.includes('TRASH')) {
        output.push('');
        output.push('✓ Message moved to trash');
      }

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error modifying message: ${gmailError.message}`;
    }
  }
}
