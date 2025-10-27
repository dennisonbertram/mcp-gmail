// src/tools/create-draft.ts
// Create email draft in Gmail

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError, buildMimeMessage } from "../utils/index.js";

const CreateDraftSchema = z.object({
  to: z.union([z.string(), z.array(z.string())]).describe("Recipient email address(es)"),
  subject: z.string().describe("Email subject line"),
  body: z.string().describe("Email body content"),
  cc: z.union([z.string(), z.array(z.string())]).optional().describe("CC recipient email address(es)"),
  bcc: z.union([z.string(), z.array(z.string())]).optional().describe("BCC recipient email address(es)"),
  isHtml: z.boolean().optional().describe("Whether the body content is HTML (default: false)"),
  from: z.string().optional().describe("Sender email address (defaults to authenticated user)"),
});

export default class CreateDraftTool extends MCPTool {
  name = "createDraft";
  description = "Creates an email draft in Gmail. The draft can be edited later or sent using sendDraft tool.";
  schema = CreateDraftSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Get user's email address if 'from' not provided
      let fromAddress = input.from;
      if (!fromAddress) {
        const profile = await gmail.users.getProfile({
          userId: 'me',
        });
        fromAddress = profile.data.emailAddress || 'me';
      }

      // Build MIME message with exactOptionalPropertyTypes compliance
      const emailParams: Parameters<typeof buildMimeMessage>[0] = {
        to: input.to,
        from: fromAddress,
        subject: input.subject,
      };

      // Set optional properties only if defined
      if (input.cc !== undefined) {
        emailParams.cc = input.cc;
      }
      if (input.bcc !== undefined) {
        emailParams.bcc = input.bcc;
      }

      // Set text or html based on isHtml flag
      if (input.isHtml) {
        emailParams.html = input.body;
      } else {
        emailParams.text = input.body;
      }

      const mimeMessage = await buildMimeMessage(emailParams);

      // Create draft
      const response = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: mimeMessage,
          },
        },
      });

      const draft = response.data;

      // Format output
      const output: string[] = [];
      output.push('Draft created successfully!');
      output.push('');
      output.push(`Draft ID: ${draft.id}`);
      output.push(`Message ID: ${draft.message?.id}`);
      output.push('');
      output.push('Draft details:');
      output.push(`To: ${Array.isArray(input.to) ? input.to.join(', ') : input.to}`);
      if (input.cc) {
        output.push(`Cc: ${Array.isArray(input.cc) ? input.cc.join(', ') : input.cc}`);
      }
      output.push(`Subject: ${input.subject}`);
      output.push(`Body type: ${input.isHtml ? 'HTML' : 'Plain text'}`);
      output.push('');
      output.push(`Use sendDraft with draftId="${draft.id}" to send this draft.`);

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error creating draft: ${gmailError.message}`;
    }
  }
}
