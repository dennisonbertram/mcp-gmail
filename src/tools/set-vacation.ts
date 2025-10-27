// src/tools/set-vacation.ts
// Gmail MCP Tool - Set vacation responder
// Configures automatic vacation/auto-reply responder

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { gmail_v1 } from "googleapis";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const SetVacationSchema = z.object({
  enabled: z.boolean().describe("Enable or disable vacation responder"),
  responseBody: z.string().optional().describe("Auto-reply message body (plain text or HTML)"),
  responseSubject: z.string().optional().describe("Subject line for auto-reply (optional)"),
  startTime: z.number().optional().describe("Start time as Unix timestamp in milliseconds (optional, responder starts immediately if not specified)"),
  endTime: z.number().optional().describe("End time as Unix timestamp in milliseconds (optional, responder continues indefinitely if not specified)"),
  restrictToContacts: z.boolean().optional().describe("Only send auto-reply to people in your contacts (default: false)"),
  restrictToDomain: z.boolean().optional().describe("Only send auto-reply to people in your domain (default: false)"),
  isHtml: z.boolean().optional().describe("Set to true if responseBody contains HTML (default: false)"),
});

export default class SetVacationTool extends MCPTool {
  name = "setVacationResponder";
  description = "Sets vacation auto-reply responder with custom message, optional schedule (start/end times), and delivery restrictions (contacts only or domain only).";
  schema = SetVacationSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Validate that if enabled, responseBody must be provided
      if (input.enabled && !input.responseBody) {
        return "Error: responseBody is required when enabling vacation responder";
      }

      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Build vacation settings request
      const vacationSettings: gmail_v1.Schema$VacationSettings = {
        enableAutoReply: input.enabled,
      };

      if (input.enabled && input.responseBody) {
        // Set response body (HTML or plain text)
        if (input.isHtml) {
          vacationSettings.responseBodyHtml = input.responseBody;
        } else {
          vacationSettings.responseBodyPlainText = input.responseBody;
        }

        // Optional settings
        if (input.responseSubject) {
          vacationSettings.responseSubject = input.responseSubject;
        }

        if (input.startTime !== undefined) {
          vacationSettings.startTime = input.startTime.toString();
        }

        if (input.endTime !== undefined) {
          vacationSettings.endTime = input.endTime.toString();
        }

        if (input.restrictToContacts !== undefined) {
          vacationSettings.restrictToContacts = input.restrictToContacts;
        }

        if (input.restrictToDomain !== undefined) {
          vacationSettings.restrictToDomain = input.restrictToDomain;
        }
      }

      // Update vacation settings
      const response = await gmail.users.settings.updateVacation({
        userId: 'me',
        requestBody: vacationSettings,
      });

      const vacation = response.data;

      // Format success message
      const output: string[] = ["Vacation responder updated successfully!\n"];
      output.push(`Status: ${vacation.enableAutoReply ? 'ENABLED' : 'DISABLED'}`);

      if (vacation.enableAutoReply) {
        if (vacation.responseSubject) {
          output.push(`\nSubject: ${vacation.responseSubject}`);
        }

        output.push(`\nMessage:`);
        if (vacation.responseBodyPlainText) {
          output.push(vacation.responseBodyPlainText);
        } else if (vacation.responseBodyHtml) {
          output.push(vacation.responseBodyHtml);
        }

        if (vacation.startTime) {
          const startDate = new Date(parseInt(vacation.startTime));
          output.push(`\nStart Time: ${startDate.toLocaleString()}`);
        } else {
          output.push(`\nStart Time: Immediately`);
        }

        if (vacation.endTime) {
          const endDate = new Date(parseInt(vacation.endTime));
          output.push(`End Time: ${endDate.toLocaleString()}`);
        } else {
          output.push(`End Time: Indefinite (until manually disabled)`);
        }

        const restrictions: string[] = [];
        if (vacation.restrictToContacts) {
          restrictions.push("Only send to contacts");
        }
        if (vacation.restrictToDomain) {
          restrictions.push("Only send to domain");
        }

        if (restrictions.length > 0) {
          output.push(`\nRestrictions: ${restrictions.join(', ')}`);
        } else {
          output.push(`\nRestrictions: None (send to everyone)`);
        }
      }

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error setting vacation responder: ${gmailError.message}`;
    }
  }
}
