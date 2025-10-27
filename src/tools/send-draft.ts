// src/tools/send-draft.ts
// Send an existing Gmail draft

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import { handleGmailError } from "../utils/index.js";

const SendDraftSchema = z.object({
  draftId: z.string().describe("The ID of the draft to send"),
});

export default class SendDraftTool extends MCPTool {
  name = "sendDraft";
  description = "Sends an existing draft email. Once sent, the draft is deleted and the message appears in the sent folder.";
  schema = SendDraftSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Create auth manager and get Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Get draft details before sending
      const draftResponse = await gmail.users.drafts.get({
        userId: 'me',
        id: input.draftId,
      });

      const draft = draftResponse.data;
      const message = draft.message;

      // Extract some details for confirmation
      const headers = message?.payload?.headers || [];
      const toHeader = headers.find(h => h.name === 'To')?.value;
      const subjectHeader = headers.find(h => h.name === 'Subject')?.value;

      // Send the draft
      const response = await gmail.users.drafts.send({
        userId: 'me',
        requestBody: {
          id: input.draftId,
        },
      });

      const sentMessage = response.data;

      // Format output
      const output: string[] = [];
      output.push('Draft sent successfully!');
      output.push('');
      output.push(`Message ID: ${sentMessage.id}`);
      output.push(`Thread ID: ${sentMessage.threadId}`);
      output.push('');
      output.push('Sent message details:');
      if (toHeader) {
        output.push(`To: ${toHeader}`);
      }
      if (subjectHeader) {
        output.push(`Subject: ${subjectHeader}`);
      }
      output.push('');
      output.push('The draft has been sent and removed from your drafts folder.');
      output.push('The message now appears in your Sent folder.');

      return output.join('\n');

    } catch (error) {
      const gmailError = handleGmailError(error);
      return `Error sending draft: ${gmailError.message}`;
    }
  }
}
