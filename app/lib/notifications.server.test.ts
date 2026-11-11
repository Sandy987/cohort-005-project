import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "~/db/schema";
import { UserRole } from "~/db/schema";
import { createTestDb, seedBaseData } from "~/test/setup";
import {
  notify,
  outboxTransport,
  recordingTransport,
} from "./notifications.server";

let db: ReturnType<typeof createTestDb>;
let buyer: typeof schema.users.$inferSelect;
let admin: typeof schema.users.$inferSelect;

beforeEach(() => {
  db = createTestDb();
  buyer = seedBaseData(db).user;
  admin = db
    .insert(schema.users)
    .values({ name: "Pat Admin", email: "pat@example.com", role: UserRole.Admin })
    .returning()
    .get();
});

describe("notify", () => {
  it("triggers the workflow, identifying recipients and actor inline", async () => {
    const transport = recordingTransport();

    await notify(
      db,
      {
        workflow: "refund-request-decided",
        recipientIds: [buyer.id],
        actorId: admin.id,
        data: { outcome: "approved", courseTitle: "Test Course" },
      },
      transport
    );

    expect(transport.triggers).toEqual([
      {
        workflow: "refund-request-decided",
        recipients: [
          { id: String(buyer.id), name: "Test User", email: "test@example.com" },
        ],
        actor: { id: String(admin.id), name: "Pat Admin", email: "pat@example.com" },
        data: { outcome: "approved", courseTitle: "Test Course" },
      },
    ]);
  });

  it("does not notify the actor about their own action", async () => {
    const transport = recordingTransport();

    await notify(
      db,
      {
        workflow: "refund-request-decided",
        recipientIds: [admin.id, buyer.id],
        actorId: admin.id,
        data: {},
      },
      transport
    );

    expect(transport.triggers.map((t) => t.recipients)).toEqual([
      [{ id: String(buyer.id), name: "Test User", email: "test@example.com" }],
    ]);
  });

  it("triggers nothing when an admin decides their own Refund Request", async () => {
    const transport = recordingTransport();

    await notify(
      db,
      {
        workflow: "refund-request-decided",
        recipientIds: [admin.id],
        actorId: admin.id,
        data: { outcome: "approved" },
      },
      transport
    );

    expect(transport.triggers).toEqual([]);
  });
});

describe("the outbox transport", () => {
  it("writes each trigger as JSON under the notifications directory", async () => {
    const directory = join(mkdtempSync(join(tmpdir(), "outbox-")), "notifications");

    await notify(
      db,
      {
        workflow: "refund-request-decided",
        recipientIds: [buyer.id],
        actorId: admin.id,
        data: { outcome: "declined", note: "Seats are in use." },
      },
      outboxTransport(directory)
    );

    const files = readdirSync(directory);
    expect(files).toHaveLength(1);
    const written = JSON.parse(readFileSync(join(directory, files[0]), "utf8"));
    expect(written).toEqual({
      workflow: "refund-request-decided",
      recipients: [
        { id: String(buyer.id), name: "Test User", email: "test@example.com" },
      ],
      actor: { id: String(admin.id), name: "Pat Admin", email: "pat@example.com" },
      data: { outcome: "declined", note: "Seats are in use." },
    });
  });
});
