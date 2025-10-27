// src/tools/create-label.ts
// Create a custom Gmail label

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { gmail_v1 } from "googleapis";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const CreateLabelSchema = z.object({
  name: z.string().describe("The name of the label to create"),
  labelListVisibility: z.enum(['labelShow', 'labelShowIfUnread', 'labelHide'])
    .optional()
    .describe("Whether to show the label in the label list (default: labelShow)"),
  messageListVisibility: z.enum(['show', 'hide'])
    .optional()
    .describe("Whether to show messages with this label in the message list (default: show)"),
  backgroundColor: z.string()
    .optional()
    .describe("Background color in hex format (e.g., '#ff0000')"),
  textColor: z.string()
    .optional()
    .describe("Text color in hex format (e.g., '#ffffff')"),
});

export default class CreateLabelTool extends MCPTool {
  name = "createLabel";
  description = "Creates a custom label for organizing messages. Configure visibility settings and optional colors. Labels work like folders and can be used with filters or manual organization.";

  schema = CreateLabelSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Build label object
      const labelObject: gmail_v1.Schema$Label = {
        name: input.name,
        labelListVisibility: input.labelListVisibility || 'labelShow',
        messageListVisibility: input.messageListVisibility || 'show',
      };

      // Add color if provided
      if (input.backgroundColor || input.textColor) {
        labelObject.color = {};
        if (input.backgroundColor) {
          labelObject.color.backgroundColor = input.backgroundColor;
        }
        if (input.textColor) {
          labelObject.color.textColor = input.textColor;
        }
      }

      // Create the label
      const response = await gmail.users.labels.create({
        userId: 'me',
        requestBody: labelObject,
      });

      const label = response.data;

      // Format output
      const output: string[] = [];
      output.push('Label created successfully!');
      output.push('');
      output.push(`Label ID: ${label.id}`);
      output.push(`Name: ${label.name}`);
      output.push(`Type: ${label.type}`);
      output.push('');
      output.push('Visibility settings:');
      output.push(`  Label list: ${label.labelListVisibility || 'labelShow'}`);
      output.push(`  Message list: ${label.messageListVisibility || 'show'}`);

      if (label.color) {
        output.push('');
        output.push('Color:');
        if (label.color.backgroundColor) {
          output.push(`  Background: ${label.color.backgroundColor}`);
        }
        if (label.color.textColor) {
          output.push(`  Text: ${label.color.textColor}`);
        }
      }

      output.push('');
      output.push('You can now use this label with:');
      output.push(`  - modifyMessage with addLabelIds: ["${label.id}"]`);
      output.push('  - Gmail search queries: label:"' + input.name + '"');

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);

      // Check for duplicate label error
      if (gmailError.message.includes('already exists') || gmailError.code === 409) {
        return `Error: A label with the name "${input.name}" already exists. Please use a different name or use listLabels to see existing labels.`;
      }

      return `Error creating label: ${gmailError.message}`;
    }
  }
}
