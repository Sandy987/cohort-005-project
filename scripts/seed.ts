import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { defaultNotifications } from "../app/lib/notifications.server";
import { syncAllUsers } from "../app/lib/notification-preferences.server";
import { db, resetDatabase } from "./seed/db";
import { seedCategories, seedUsers } from "./seed/users";
import { seedCourses } from "./seed/courses";
import { seedQuizzes } from "./seed/quizzes";
import { seedEnrollmentsAndRatings } from "./seed/enrollments";
import { seedComments } from "./seed/comments";
import { seedLessonProgress, seedQuizAttempts } from "./seed/progress";
import {
  createWatchEvents,
  flushWatchEvents,
  seedNarrativeWatchSessions,
} from "./seed/watch-events";
import { seedFirstTeam, seedPurchases } from "./seed/purchases";
import { seedGeneratedHistory } from "./seed/generated-history";
import { seedFurtherTeamPurchases } from "./seed/team-purchases";
import { seedRefunds } from "./seed/refunds";
import { printSummary } from "./seed/summary";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Runs under tsx, not Vite, so load .env for the Knock keys ourselves.
const envFile = path.resolve(__dirname, "../.env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Each step writes rows the later steps refer to by id, so the order below is
// the order the rows land in, and the ids they get.
async function seed() {
  console.log("Seeding database...");

  resetDatabase();

  const users = seedUsers();
  const catBySlug = seedCategories();
  const courses = seedCourses(users, catBySlug);
  const quizzes = seedQuizzes(courses);
  seedEnrollmentsAndRatings(users, courses);
  seedComments(users, courses);
  seedLessonProgress(users, courses);
  seedQuizAttempts(users, quizzes);

  const watchEvents = createWatchEvents();
  seedNarrativeWatchSessions(users, courses, watchEvents);
  seedPurchases(users, courses);
  seedFirstTeam(users, courses);
  seedGeneratedHistory(users, courses, watchEvents);
  const teamPurchases = seedFurtherTeamPurchases(users, courses);
  seedRefunds(users, courses, teamPurchases);
  flushWatchEvents(watchEvents);

  printSummary();

  // ─── Sync users to Knock ───
  // Name, email, avatar, and default preferences for anyone without a set.
  if (process.env.KNOCK_SECRET_API_KEY) {
    const synced = await syncAllUsers(db, await defaultNotifications());
    console.log(`  Synced ${synced} users to Knock.`);
  } else {
    console.log("  Skipped Knock user sync: KNOCK_SECRET_API_KEY is not set.");
  }
}

seed().catch(console.error);
