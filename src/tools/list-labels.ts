// src/tools/list-labels.ts
// List all Gmail labels (system and custom)

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const ListLabelsSchema = z.object({});

export default class ListLabelsTool extends MCPTool {
  name = "listLabels";
  description = "Lists all labels including system labels (INBOX, SENT, STARRED, etc.) and custom labels. Returns label IDs, names, message counts, and visibility settings.";
  schema = ListLabelsSchema;

  async execute(_input: MCPInput<this>) {
    try {
      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // List all labels
      const response = await gmail.users.labels.list({
        userId: 'me',
      });

      const labels = response.data.labels || [];

      if (labels.length === 0) {
        return 'No labels found.';
      }

      // Separate system and user labels
      const systemLabels = labels.filter(l => l.type === 'system');
      const userLabels = labels.filter(l => l.type === 'user');

      // Format output
      const output: string[] = [];
      output.push(`Total labels: ${labels.length} (${systemLabels.length} system, ${userLabels.length} custom)`);
      output.push('');

      // Display system labels
      if (systemLabels.length > 0) {
        output.push('SYSTEM LABELS:');
        output.push('='.repeat(80));
        systemLabels.forEach(label => {
          output.push(`ID: ${label.id}`);
          output.push(`Name: ${label.name}`);
          if (label.messagesTotal !== undefined) {
            output.push(`Messages: ${label.messagesTotal} total, ${label.messagesUnread || 0} unread`);
          }
          if (label.threadsTotal !== undefined) {
            output.push(`Threads: ${label.threadsTotal} total, ${label.threadsUnread || 0} unread`);
          }
          output.push('');
        });
      }

      // Display custom labels
      if (userLabels.length > 0) {
        output.push('');
        output.push('CUSTOM LABELS:');
        output.push('='.repeat(80));
        userLabels.forEach(label => {
          output.push(`ID: ${label.id}`);
          output.push(`Name: ${label.name}`);
          if (label.color) {
            output.push(`Color: ${label.color.backgroundColor || 'default'}`);
          }
          if (label.messagesTotal !== undefined) {
            output.push(`Messages: ${label.messagesTotal} total, ${label.messagesUnread || 0} unread`);
          }
          if (label.threadsTotal !== undefined) {
            output.push(`Threads: ${label.threadsTotal} total, ${label.threadsUnread || 0} unread`);
          }
          output.push(`Label list visibility: ${label.labelListVisibility || 'labelShow'}`);
          output.push(`Message list visibility: ${label.messageListVisibility || 'show'}`);
          output.push('');
        });
      }

      // Add helpful notes
      output.push('');
      output.push('NOTES:');
      output.push('- Use the label ID (not name) when calling other tools like modifyMessage');
      output.push('- System labels use their name as ID (e.g., "INBOX", "STARRED", "UNREAD")');
      output.push('- Custom labels have IDs like "Label_123456789"');

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error listing labels: ${gmailError.message}`;
    }
  }
}
