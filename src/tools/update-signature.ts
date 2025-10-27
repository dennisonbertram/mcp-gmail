// src/tools/update-signature.ts
// Gmail MCP Tool - Update email signature
// Updates the email signature for a SendAs address

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const UpdateSignatureSchema = z.object({
  signature: z.string().describe("Email signature text (can include HTML formatting)"),
  sendAsEmail: z.string().optional().describe("Email address to update signature for (defaults to primary email 'me')"),
});

export default class UpdateSignatureTool extends MCPTool {
  name = "updateSignature";
  description = "Updates the email signature for your primary email or a specific SendAs address. Supports HTML formatting.";
  schema = UpdateSignatureSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      const sendAsEmail = input.sendAsEmail || 'me';

      // First, get the current SendAs settings to ensure the address exists
      try {
        const existingResponse = await gmail.users.settings.sendAs.get({
          userId: 'me',
          sendAsEmail: sendAsEmail,
        });

        if (!existingResponse.data) {
          return `Error: SendAs email address '${sendAsEmail}' not found. Use 'me' for primary email or specify a verified SendAs address.`;
        }
      } catch (error) {
        return `Error: Unable to find SendAs email address '${sendAsEmail}'. Use 'me' for primary email or specify a verified SendAs address.`;
      }

      // Update the signature
      const response = await gmail.users.settings.sendAs.patch({
        userId: 'me',
        sendAsEmail: sendAsEmail,
        requestBody: {
          signature: input.signature,
        },
      });

      const updatedSendAs = response.data;

      // Format success message
      const output: string[] = ["Email signature updated successfully!\n"];
      output.push(`Email: ${updatedSendAs.sendAsEmail}`);

      if (updatedSendAs.displayName) {
        output.push(`Display Name: ${updatedSendAs.displayName}`);
      }

      output.push(`\nNew Signature:`);
      output.push(`${updatedSendAs.signature}`);

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error updating signature: ${gmailError.message}`;
    }
  }
}
