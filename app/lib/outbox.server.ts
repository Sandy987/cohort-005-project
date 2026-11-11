import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The local stand-in for real delivery: each message is written as a JSON file
// under .outbox/ so it can be read without sending anything.

/** Writes `payload` to `<directory>/<timestamp>-<name>.json`. */
export function writeOutboxFile(
  directory: string,
  name: string,
  payload: unknown
): void {
  mkdirSync(directory, { recursive: true });
  const file = join(directory, `${Date.now()}-${name}.json`);
  writeFileSync(file, JSON.stringify(payload, null, 2));
}
