import { writeOutboxFile } from "~/lib/outbox.server";

// ─── Transactional email ───
// Postmark delivers every email when POSTMARK_SERVER_TOKEN is set. Without a
// token (local dev, tests) each message is written to .outbox/ as a JSON file
// instead, so it can be read without sending anything.

export type Email = {
  to: string;
  subject: string;
  body: string;
};

export interface MailTransport {
  send(email: Email): Promise<void>;
}

const FROM_ADDRESS = "Cadence <hello@cadence.dev>";

export function postmarkTransport(serverToken: string): MailTransport {
  return {
    async send(email) {
      const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": serverToken,
        },
        body: JSON.stringify({
          From: FROM_ADDRESS,
          To: email.to,
          Subject: email.subject,
          TextBody: email.body,
          MessageStream: "outbound",
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Postmark rejected the email to ${email.to}: ${response.status}`
        );
      }
    },
  };
}

export function mailOutboxTransport(directory: string): MailTransport {
  return {
    async send(email) {
      writeOutboxFile(directory, email.to, { from: FROM_ADDRESS, ...email });
    },
  };
}

export function defaultMailTransport(): MailTransport {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  return token ? postmarkTransport(token) : mailOutboxTransport(".outbox");
}
