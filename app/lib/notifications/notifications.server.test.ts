import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "~/db/schema";
import { UserRole } from "~/db/schema";
import { createTestDb, seedBaseData } from "~/test/setup";
import {
  notify,
  notificationOutboxTransport,
  recordingTransport,
} from "~/lib/notifications/notifications.server";

const decided = {
  outcome: "approved",
  note: null,
  courseTitle: "Test Course",
  url: "/courses/test-course",
} as const;

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
        data: decided,
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
        data: decided,
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
        data: decided,
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
        data: decided,
      },
      transport
    );

    expect(transport.triggers).toEqual([]);
  });
});

describe("notify with Muted recipients", () => {
  function addUser(name: string, email: string, muted: boolean) {
    return db
      .insert(schema.users)
      .values({ name, email, role: UserRole.Student, muted })
      .returning()
      .get();
  }

  it("drops Muted recipients, Platform Admins included", async () => {
    const transport = recordingTransport();
    const mutedBuyer = addUser("Mo Muted", "mo@example.com", true);
    const mutedAdmin = db
      .insert(schema.users)
      .values({ name: "Max Admin", email: "max@example.com", role: UserRole.Admin, muted: true })
      .returning()
      .get();

    await notify(
      db,
      {
        workflow: "refund-request-decided",
        recipientIds: [mutedBuyer.id, buyer.id, mutedAdmin.id],
        actorId: admin.id,
        data: decided,
      },
      transport
    );

    expect(transport.triggers.map((t) => t.recipients)).toEqual([
      [{ id: String(buyer.id), name: "Test User", email: "test@example.com" }],
    ]);
  });

  it("triggers nothing when every recipient is Muted or is the actor", async () => {
    const transport = recordingTransport();
    const mutedBuyer = addUser("Mo Muted", "mo@example.com", true);

    await notify(
      db,
      {
        workflow: "refund-request-decided",
        recipientIds: [mutedBuyer.id, admin.id],
        actorId: admin.id,
        data: decided,
      },
      transport
    );

    expect(transport.triggers).toEqual([]);
  });

  it("still names a Muted actor", async () => {
    const transport = recordingTransport();
    const mutedActor = addUser("Mo Muted", "mo@example.com", true);

    await notify(
      db,
      {
        workflow: "refund-request-decided",
        recipientIds: [buyer.id],
        actorId: mutedActor.id,
        data: decided,
      },
      transport
    );

    expect(transport.triggers[0].actor).toEqual({
      id: String(mutedActor.id),
      name: "Mo Muted",
      email: "mo@example.com",
    });
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
        data: { ...decided, outcome: "declined", note: "Seats are in use." },
      },
      notificationOutboxTransport(directory)
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
      data: { ...decided, outcome: "declined", note: "Seats are in use." },
    });
  });
});
