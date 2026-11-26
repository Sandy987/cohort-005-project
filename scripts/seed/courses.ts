import * as schema from "../../app/db/schema";
import { CourseStatus } from "../../app/db/schema";
import { markdown } from "../../app/lib/text";
import { db } from "./db";
import { daysAgo } from "./helpers";
import { insertCourseContent } from "./course-content";
import type { CategoriesBySlug, SeededUsers } from "./users";
import { typescriptModules } from "./content/typescript";
import { restApiModules } from "./content/rest-apis";
import { designSystemsModules } from "./content/design-systems";
import { dataVisualisationModules } from "./content/data-visualisation";
import { dockerModules } from "./content/docker";

export function seedCourses(users: SeededUsers, catBySlug: CategoriesBySlug) {
  const { instructor1, instructor2 } = users;

  // ─── Course 1: Introduction to TypeScript (Sarah Chen) ───

  const [course1] = db
    .insert(schema.courses)
    .values({
      title: "Introduction to TypeScript",
      slug: "introduction-to-typescript",
      description:
        "Master TypeScript from the ground up. Learn type annotations, interfaces, generics, and advanced patterns that will make your JavaScript code safer and more maintainable. Includes hands-on projects and real-world examples.",
      salesCopy: markdown(`## Why TypeScript?

If you've been writing JavaScript and wondering why your code breaks in production with cryptic "undefined is not a function" errors, TypeScript is the answer you've been looking for.

TypeScript adds a powerful type system on top of JavaScript that catches bugs before they ever reach your users. It's not just about finding errors — it's about writing code with confidence, knowing that your editor understands your code as well as you do.

## What You'll Learn

This course takes you from zero TypeScript knowledge to confidently using advanced patterns in real projects. We start with the basics — type annotations, interfaces, and simple generics — and build up to discriminated unions, mapped types, conditional types, and template literal types.

Every concept is taught through practical examples. You won't just learn what a generic is — you'll learn when and why to use one, and how to constrain them for maximum type safety.

### Course Highlights

- **19 lessons** across 5 modules, from setup to advanced patterns
- **Hands-on quizzes** to test your understanding as you go
- **Real-world React examples** showing TypeScript in production code
- **Error handling patterns** using Result types and discriminated unions

## Who Is This Course For?

This course is perfect for JavaScript developers who want to level up their code quality. Whether you're working on a personal project or a large team codebase, TypeScript will make your development experience faster, safer, and more enjoyable.

No prior TypeScript experience required — just a solid understanding of JavaScript fundamentals.

## What Makes This Course Different

Unlike courses that just show you syntax, this course focuses on *thinking in types*. You'll learn to design your types first and let them guide your implementation, catching entire categories of bugs at compile time instead of runtime.

By the end of this course, you'll understand why TypeScript has become the default choice for serious JavaScript development.`),
      instructorId: instructor1.id,
      categoryId: catBySlug["programming"].id,
      status: CourseStatus.Published,
      coverImageUrl: "/images/course-typescript.svg",
      price: 7900,
      createdAt: daysAgo(355),
      updatedAt: daysAgo(10),
    })
    .returning()
    .all();

  // Course 1 modules and lessons
  const course1LessonIds = insertCourseContent(
    course1.id,
    typescriptModules,
    350
  );

  console.log(
    `Created course "${course1.title}" with ${typescriptModules.length} modules and ${course1LessonIds.length} lessons.`
  );

  // ─── Course 2: Building REST APIs with Node.js (Marcus Johnson) ───

  const [course2] = db
    .insert(schema.courses)
    .values({
      title: "Building REST APIs with Node.js",
      slug: "building-rest-apis-with-nodejs",
      description:
        "Learn to build production-ready REST APIs using Node.js and Express. Covers routing, middleware, authentication, database integration, error handling, testing, and deployment best practices.",
      salesCopy: markdown(`## Build APIs That Actually Work in Production

Most API tutorials teach you how to return JSON from an endpoint. This course teaches you how to build APIs that handle real traffic, real users, and real problems — the kind you'll face on the job.

From your first Express route to deploying a production-ready API, you'll learn every layer of the stack: routing, middleware, validation, authentication, database integration, testing, and deployment.

## What You'll Build

Throughout this course, you'll build a complete REST API from scratch. Not a toy project — a properly structured API with authentication, input validation, error handling, pagination, and tests.

### Topics Covered

- **Express fundamentals** — routing, middleware chains, request/response lifecycle
- **Input validation with Zod** — never trust user input, validate everything
- **Database integration** — Drizzle ORM with SQLite, CRUD operations, transactions
- **JWT authentication** — secure your endpoints with industry-standard tokens
- **Security hardening** — rate limiting, CORS, security headers with Helmet
- **Testing** — unit tests with Vitest, integration tests with Supertest
- **Deployment** — environment config, process management, CI/CD basics

## Who Should Take This Course?

This course is designed for developers who know JavaScript and want to build backend services. If you've built frontends but never created your own API, this is the perfect next step.

You should be comfortable with JavaScript basics — functions, async/await, and working with objects. No backend experience required.

## Why Node.js for APIs?

Node.js lets you use the same language on both frontend and backend. Its non-blocking I/O model handles concurrent requests efficiently, and the npm ecosystem gives you battle-tested libraries for every common backend task.

Express is the most widely-used Node.js web framework for a reason — it's minimal, flexible, and has a massive community. The patterns you learn here will transfer to any Node.js framework.

## 20 Lessons, 5 Modules, Zero Fluff

Every lesson is focused and practical. No 45-minute lectures where 40 minutes are filler. Each lesson teaches one concept, shows you how to implement it, and moves on.`),
      instructorId: instructor2.id,
      categoryId: catBySlug["programming"].id,
      status: CourseStatus.Published,
      coverImageUrl: "/images/course-nodejs.svg",
      price: 5999,
      createdAt: daysAgo(305),
      updatedAt: daysAgo(5),
    })
    .returning()
    .all();

  const course2LessonIds = insertCourseContent(course2.id, restApiModules, 300);

  console.log(
    `Created course "${course2.title}" with ${restApiModules.length} modules and ${course2LessonIds.length} lessons.`
  );

  // ─── Course 3: Design Systems with Tailwind (Sarah Chen) ───
  // A second selling course for Sarah, so the per-instructor views have more
  // than one row and revenue splits across courses.

  const [course3] = db
    .insert(schema.courses)
    .values({
      title: "Design Systems with Tailwind",
      slug: "design-systems-with-tailwind",
      description:
        "Build a design system that survives contact with a real product team. Tokens, component APIs, theming, and the discipline that keeps a system from rotting into a component graveyard.",
      salesCopy: markdown(`## Design Systems That Survive

Most design systems die the same way: a beautiful component library nobody uses, drifting out of sync with the product it was meant to serve.

This course is about the other kind — the system your team reaches for because it is faster than not using it.

### What You'll Learn

- **Design tokens** — colour, spacing and type scales that mean something
- **Component APIs** — variants that compose instead of multiplying
- **Theming** — light, dark, and brand themes without a fork
- **Governance** — how changes land without breaking every consumer

## Who Is This For?

Frontend developers who have built components before and watched the collection turn into a mess. Tailwind experience helps but is not required.`),
      instructorId: instructor1.id,
      categoryId: catBySlug["design"].id,
      status: CourseStatus.Published,
      coverImageUrl: "/images/course-typescript.svg",
      price: 3999,
      createdAt: daysAgo(200),
      updatedAt: daysAgo(14),
    })
    .returning()
    .all();

  const course3LessonIds = insertCourseContent(
    course3.id,
    designSystemsModules,
    195
  );

  console.log(
    `Created course "${course3.title}" with 3 modules and ${course3LessonIds.length} lessons.`
  );

  // ─── Course 4: Practical Data Visualisation (Marcus Johnson) ───
  // Published but has never sold. The analytics views must render a course with
  // zero revenue, zero enrolments and zero progress without dividing by it.

  const [course4] = db
    .insert(schema.courses)
    .values({
      title: "Practical Data Visualisation",
      slug: "practical-data-visualisation",
      description:
        "Turn data into charts people can actually read. Chart selection, scales, colour, and the accessibility rules most dashboards break.",
      salesCopy: markdown(`## Charts People Can Read

A chart is an argument. This course is about making the argument clearly — picking the right encoding, scaling it honestly, and colouring it so everyone can read it.

### Topics

- Choosing an encoding that matches the question
- Scales, axes, and the zero-baseline argument
- Colour palettes that survive colour blindness
- Annotating a chart so it needs no caption

## Who Is This For?

Developers and analysts who produce charts for other people to act on.`),
      instructorId: instructor2.id,
      categoryId: catBySlug["data-science"].id,
      status: CourseStatus.Published,
      coverImageUrl: "/images/course-nodejs.svg",
      price: 4499,
      createdAt: daysAgo(40),
      updatedAt: daysAgo(6),
    })
    .returning()
    .all();

  const course4LessonIds = insertCourseContent(
    course4.id,
    dataVisualisationModules,
    35
  );

  console.log(
    `Created course "${course4.title}" with 2 modules and ${course4LessonIds.length} lessons (published, no sales).`
  );

  // ─── Course 5: Shipping with Docker and Kubernetes (Marcus Johnson) ───
  // Draft — never appears in the catalogue, and must be excluded from published
  // course counts and revenue.

  const [course5] = db
    .insert(schema.courses)
    .values({
      title: "Shipping with Docker and Kubernetes",
      slug: "shipping-with-docker-and-kubernetes",
      description:
        "Containerise an application and run it on Kubernetes without cargo-culting a YAML file you do not understand.",
      salesCopy: markdown(`## From Laptop to Cluster

Containers made deployment reproducible and Kubernetes made it configurable. This course covers both without pretending either is simple.

### Topics

- Writing a Dockerfile that builds fast and ships small
- Pods, deployments, services — what each one is actually for
- Config, secrets and the twelve-factor bits that matter
- Rolling out a change and rolling it back

## Status

This course is still in draft while the cluster examples are rewritten against the current API.`),
      instructorId: instructor2.id,
      categoryId: catBySlug["devops"].id,
      status: CourseStatus.Draft,
      coverImageUrl: "/images/course-nodejs.svg",
      price: 5499,
      createdAt: daysAgo(18),
      updatedAt: daysAgo(2),
    })
    .returning()
    .all();

  const course5LessonIds = insertCourseContent(course5.id, dockerModules, 15);

  console.log(
    `Created course "${course5.title}" with 2 modules and ${course5LessonIds.length} lessons (draft).`
  );

  return {
    course1,
    course2,
    course3,
    course4,
    course5,
    course1LessonIds,
    course2LessonIds,
    course3LessonIds,
    course4LessonIds,
    course5LessonIds,
  };
}

export type SeededCourses = ReturnType<typeof seedCourses>;
