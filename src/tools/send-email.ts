// src/tools/send-email.ts
// Sends an email via Gmail API

import { MCPTool, MCPInput } from "mcp-framework";
import { z } from "zod";
import { createGmailAuth } from "../auth/index.js";
import {
  buildMimeMessage,
  createAttachmentFromFile,
  handleGmailError,
  isValidEmail,
  validateTotalAttachmentSize,
} from "../utils/index.js";

const AttachmentSchema = z.object({
  filename: z.string().min(1).describe("Name for the attachment"),
  path: z.string().min(1).describe("File path to attach"),
});

const SendEmailSchema = z.object({
  to: z
    .string()
    .min(1)
    .describe("Recipient email address (or comma-separated addresses)"),
  subject: z.string().min(1).describe("Email subject line"),
  body: z.string().min(1).describe("Email body content"),
  cc: z
    .string()
    .optional()
    .describe("CC recipients (comma-separated email addresses)"),
  bcc: z
    .string()
    .optional()
    .describe("BCC recipients (comma-separated email addresses)"),
  isHtml: z
    .boolean()
    .optional()
    .describe("Whether the body is HTML (true) or plain text (false). Default: false"),
  attachments: z
    .array(AttachmentSchema)
    .optional()
    .describe("Array of file attachments with filename and path"),
});

export default class SendEmailTool extends MCPTool {
  name = "sendEmail";
  description =
    "Sends an email from your Gmail account. " +
    "Supports HTML or plain text, CC/BCC recipients, multiple recipients (comma-separated), " +
    "and file attachments (up to 25MB total).";
  schema = SendEmailSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Apply defaults
      const isHtml = input.isHtml ?? false;

      // Validate email addresses
      const toAddresses = input.to.split(",").map((e) => e.trim());
      for (const email of toAddresses) {
        if (!isValidEmail(email)) {
          return {
            success: false,
            error: `Invalid 'to' email address: ${email}`,
          };
        }
      }

      if (input.cc) {
        const ccAddresses = input.cc.split(",").map((e) => e.trim());
        for (const email of ccAddresses) {
          if (!isValidEmail(email)) {
            return {
              success: false,
              error: `Invalid 'cc' email address: ${email}`,
            };
          }
        }
      }

      if (input.bcc) {
        const bccAddresses = input.bcc.split(",").map((e) => e.trim());
        for (const email of bccAddresses) {
          if (!isValidEmail(email)) {
            return {
              success: false,
              error: `Invalid 'bcc' email address: ${email}`,
            };
          }
        }
      }

      // Get authenticated Gmail client
      const authManager = createGmailAuth();
      const gmail = await authManager.getGmailClient();

      // Get the user's email address to use as 'from'
      const profile = await gmail.users.getProfile({ userId: "me" });
      const fromEmail = profile.data.emailAddress;

      if (!fromEmail) {
        return {
          success: false,
          error: "Could not retrieve sender email address from Gmail profile",
        };
      }

      // Process attachments if provided
      let processedAttachments;
      if (input.attachments && input.attachments.length > 0) {
        try {
          const attachmentPromises = input.attachments.map((att) =>
            createAttachmentFromFile(att.path, att.filename)
          );
          processedAttachments = await Promise.all(attachmentPromises);

          // Validate total attachment size
          const validation = validateTotalAttachmentSize(
            processedAttachments.map((att) => ({
              size: Buffer.from(att.content, "base64").length,
            }))
          );

          if (!validation.valid) {
            return {
              success: false,
              error: validation.message,
            };
          }
        } catch (error) {
          return {
            success: false,
            error: `Failed to process attachments: ${(error as Error).message}`,
          };
        }
      }

      // Build MIME message with exactOptionalPropertyTypes compliance
      const emailParams: Parameters<typeof buildMimeMessage>[0] = {
        from: fromEmail,
        to: input.to,
        subject: input.subject,
      };

      // Set optional properties only if defined
      if (input.cc !== undefined) {
        emailParams.cc = input.cc;
      }
      if (input.bcc !== undefined) {
        emailParams.bcc = input.bcc;
      }
      if (processedAttachments !== undefined) {
        emailParams.attachments = processedAttachments;
      }

      // Set text or html based on isHtml flag
      if (isHtml) {
        emailParams.html = input.body;
      } else {
        emailParams.text = input.body;
      }

      const mimeMessage = await buildMimeMessage(emailParams);

      // Send the email
      const sendResponse = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: mimeMessage,
        },
      });

      const sentMessage = sendResponse.data;

      return {
        success: true,
        messageId: sentMessage.id,
        threadId: sentMessage.threadId,
        labelIds: sentMessage.labelIds,
        from: fromEmail,
        to: input.to,
        subject: input.subject,
        attachmentCount: input.attachments?.length || 0,
        message: `Email sent successfully from ${fromEmail}`,
      };
    } catch (error) {
      const gmailError = handleGmailError(error);
      return {
        success: false,
        error: gmailError.message,
        errorType: gmailError.name,
        errorCode: gmailError.code,
      };
    }
  }
}
