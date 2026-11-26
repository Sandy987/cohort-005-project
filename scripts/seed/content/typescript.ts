import type { ModuleSpec } from "../course-content";

export const typescriptModules: ModuleSpec[] = [
  {
    title: "Getting Started with TypeScript",
    lessons: [
      {
        title: "What is TypeScript?",
        duration: 8,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        githubRepoUrl:
          "https://github.com/total-typescript/ts-intro-what-is-ts",
        content: `## What is TypeScript?

TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. It adds optional static typing and class-based object-oriented programming to the language.

### Why TypeScript?

- Catch errors at compile time instead of runtime
- Better IDE support with autocompletion
- Easier to refactor large codebases
- Self-documenting code through types`,
      },
      {
        title: "Installing and Configuring TypeScript",
        duration: 12,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Setting Up TypeScript

Let's get TypeScript installed and configured in your development environment.

### Installation

\`\`\`bash
npm install -g typescript
tsc --version
\`\`\`

### tsconfig.json

The \`tsconfig.json\` file configures the TypeScript compiler options for your project.`,
      },
      {
        title: "Your First TypeScript Program",
        duration: 15,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        githubRepoUrl:
          "https://github.com/total-typescript/ts-intro-first-program",
        content: `## Hello, TypeScript!

Let's write our first TypeScript program and see the compilation process in action.

\`\`\`typescript
function greet(name: string): string {
  return \\\`Hello, \\\${name}!\\\`;
}

console.log(greet('World'));
\`\`\``,
      },
    ],
  },
  {
    title: "Type System Fundamentals",
    lessons: [
      {
        title: "Primitive Types",
        duration: 10,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Primitive Types

TypeScript supports the same primitive types as JavaScript, plus a few extras.

- \`string\` — text values
- \`number\` — numeric values (integer and float)
- \`boolean\` — true/false
- \`null\` and \`undefined\`
- \`symbol\` and \`bigint\``,
      },
      {
        title: "Arrays and Tuples",
        duration: 12,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Arrays and Tuples

Learn how to type arrays and fixed-length tuples in TypeScript.

\`\`\`typescript
const numbers: number[] = [1, 2, 3];
const pair: [string, number] = ['age', 25];
\`\`\``,
      },
      {
        title: "Type Aliases and Interfaces",
        duration: 18,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Type Aliases vs Interfaces

Both type aliases and interfaces let you define custom types, but they have subtle differences.

### Type Alias

\`\`\`typescript
type User = {
  name: string;
  age: number;
};
\`\`\`

### Interface

\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\``,
      },
      {
        title: "Union and Intersection Types",
        duration: 14,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Union and Intersection Types

Combine types in powerful ways using unions (\`|\`) and intersections (\`&\`).

\`\`\`typescript
type StringOrNumber = string | number;
type Named = { name: string };
type Aged = { age: number };
type Person = Named & Aged;
\`\`\``,
      },
    ],
  },
  {
    title: "Functions and Generics",
    lessons: [
      {
        title: "Function Types",
        duration: 11,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Typing Functions

TypeScript lets you type function parameters, return values, and even the function itself.

\`\`\`typescript
function add(a: number, b: number): number {
  return a + b;
}

const multiply: (a: number, b: number) => number = (a, b) => a * b;
\`\`\``,
      },
      {
        title: "Generics Basics",
        duration: 20,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        githubRepoUrl: "https://github.com/total-typescript/ts-generics-basics",
        content: `## Introduction to Generics

Generics let you write reusable code that works with multiple types while maintaining type safety.

\`\`\`typescript
function identity<T>(value: T): T {
  return value;
}

const str = identity('hello'); // string
const num = identity(42); // number
\`\`\``,
      },
      {
        title: "Generic Constraints",
        duration: 16,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Constraining Generics

Use \`extends\` to limit what types a generic can accept.

\`\`\`typescript
function getLength<T extends { length: number }>(item: T): number {
  return item.length;
}

getLength('hello'); // OK
getLength([1, 2, 3]); // OK
// getLength(42); // Error!
\`\`\``,
      },
      {
        title: "Utility Types",
        duration: 15,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Built-in Utility Types

TypeScript provides several utility types for common type transformations.

- \`Partial<T>\` — makes all properties optional
- \`Required<T>\` — makes all properties required
- \`Pick<T, K>\` — selects specific properties
- \`Omit<T, K>\` — excludes specific properties
- \`Record<K, V>\` — creates an object type with keys K and values V`,
      },
    ],
  },
  {
    title: "Advanced Patterns",
    lessons: [
      {
        title: "Discriminated Unions",
        duration: 14,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Discriminated Unions

A pattern that combines union types with literal types to create type-safe tagged unions.

\`\`\`typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'rectangle': return shape.width * shape.height;
  }
}
\`\`\``,
      },
      {
        title: "Type Guards and Narrowing",
        duration: 13,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Type Guards

Type guards are expressions that narrow a type within a conditional block.

\`\`\`typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function process(value: string | number) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // string
  } else {
    console.log(value.toFixed(2)); // number
  }
}
\`\`\``,
      },
      {
        title: "Mapped Types",
        duration: 17,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Mapped Types

Create new types by transforming each property of an existing type.

\`\`\`typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

type Optional<T> = {
  [K in keyof T]?: T[K];
};
\`\`\``,
      },
      {
        title: "Conditional Types",
        duration: 19,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Conditional Types

Types that depend on a condition, similar to ternary expressions but at the type level.

\`\`\`typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>; // false
\`\`\``,
      },
      {
        title: "Template Literal Types",
        duration: 10,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Template Literal Types

Construct string types using template literal syntax.

\`\`\`typescript
type Color = 'red' | 'blue' | 'green';
type CSSProperty = \\\`color-\\\${Color}\\\`;
// 'color-red' | 'color-blue' | 'color-green'
\`\`\``,
      },
    ],
  },
  {
    title: "Real-World TypeScript",
    lessons: [
      {
        title: "TypeScript with React",
        duration: 22,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        githubRepoUrl: "https://github.com/total-typescript/ts-react-examples",
        content: `## TypeScript + React

Learn how to use TypeScript effectively in React applications.

\`\`\`typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button onClick={onClick} className={variant}>{label}</button>;
}
\`\`\``,
      },
      {
        title: "Error Handling Patterns",
        duration: 14,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content: `## Error Handling in TypeScript

Strategies for handling errors in a type-safe way.

\`\`\`typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function divide(a: number, b: number): Result<number> {
  if (b === 0) return { ok: false, error: new Error('Division by zero') };
  return { ok: true, value: a / b };
}
\`\`\``,
      },
      {
        title: "Course Wrap-Up and Next Steps",
        duration: 8,
        content: `## Congratulations!

You've completed the Introduction to TypeScript course. Here's what we covered:

- TypeScript fundamentals and type system
- Functions, generics, and utility types
- Advanced patterns like discriminated unions and mapped types
- Real-world usage with React

### Next Steps

Practice by converting an existing JavaScript project to TypeScript. Start with strict mode enabled and work through the errors one by one.`,
      },
    ],
  },
];
