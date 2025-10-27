// src/tools/batch-modify.ts
// Gmail MCP Tool - Batch modify messages
// Bulk modify multiple messages at once (add/remove labels)

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { gmail_v1 } from "googleapis";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const BatchModifySchema = z.object({
  messageIds: z.array(z.string()).describe("Array of message IDs to modify"),
  addLabelIds: z.array(z.string()).optional().describe("Label IDs to add to all messages (e.g., ['INBOX', 'IMPORTANT', 'STARRED'])"),
  removeLabelIds: z.array(z.string()).optional().describe("Label IDs to remove from all messages (e.g., ['UNREAD', 'SPAM'])"),
});

export default class BatchModifyTool extends MCPTool {
  name = "batchModify";
  description = "Bulk modifies up to 1000 messages at once by adding or removing labels. Use for bulk operations like archive, star, mark as read, or move to trash.";
  schema = BatchModifySchema;

  async execute(input: MCPInput<this>) {
    try {
      // Validate input
      if (!input.messageIds || input.messageIds.length === 0) {
        return "Error: At least one message ID must be provided";
      }

      if ((!input.addLabelIds || input.addLabelIds.length === 0) &&
          (!input.removeLabelIds || input.removeLabelIds.length === 0)) {
        return "Error: At least one of addLabelIds or removeLabelIds must be specified";
      }

      // Gmail API has a limit of 1000 messages per batch modify request
      if (input.messageIds.length > 1000) {
        return `Error: Cannot modify more than 1000 messages at once. You provided ${input.messageIds.length} message IDs.`;
      }

      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Build the request body
      const requestBody: gmail_v1.Schema$BatchModifyMessagesRequest = {
        ids: input.messageIds,
      };

      if (input.addLabelIds && input.addLabelIds.length > 0) {
        requestBody.addLabelIds = input.addLabelIds;
      }

      if (input.removeLabelIds && input.removeLabelIds.length > 0) {
        requestBody.removeLabelIds = input.removeLabelIds;
      }

      // Perform batch modify
      await gmail.users.messages.batchModify({
        userId: 'me',
        requestBody,
      });

      // Format success message
      const output: string[] = [`Successfully modified ${input.messageIds.length} message(s)\n`];

      output.push("Changes applied:");
      if (input.addLabelIds && input.addLabelIds.length > 0) {
        output.push(`  Added labels: ${input.addLabelIds.join(', ')}`);
      }
      if (input.removeLabelIds && input.removeLabelIds.length > 0) {
        output.push(`  Removed labels: ${input.removeLabelIds.join(', ')}`);
      }

      output.push(`\nMessage IDs: ${input.messageIds.slice(0, 10).join(', ')}${input.messageIds.length > 10 ? ` ... and ${input.messageIds.length - 10} more` : ''}`);

      // Add helpful tips
      output.push("\n\nCommon label operations:");
      output.push("  Archive:      removeLabelIds: ['INBOX']");
      output.push("  Mark as read: removeLabelIds: ['UNREAD']");
      output.push("  Star:         addLabelIds: ['STARRED']");
      output.push("  Mark spam:    addLabelIds: ['SPAM'], removeLabelIds: ['INBOX']");
      output.push("  Move to trash: addLabelIds: ['TRASH'], removeLabelIds: ['INBOX']");

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error performing batch modify: ${gmailError.message}`;
    }
  }
}
