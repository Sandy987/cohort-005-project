import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mailOutboxTransport } from "~/lib/notifications/mailer.server";

describe("the outbox mail transport", () => {
  it("writes the message to the outbox as JSON", async () => {
    const directory = mkdtempSync(join(tmpdir(), "outbox-"));

    await mailOutboxTransport(directory).send({
      to: "liam@example.com",
      subject: "Hello",
      body: "Hi Liam",
    });

    const files = readdirSync(directory);
    expect(files).toHaveLength(1);
    const written = JSON.parse(readFileSync(join(directory, files[0]), "utf8"));
    expect(written).toMatchObject({
      to: "liam@example.com",
      subject: "Hello",
      body: "Hi Liam",
    });
  });
});
