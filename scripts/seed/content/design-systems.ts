import type { ModuleSpec } from "../course-content";

export const designSystemsModules: ModuleSpec[] = [
  {
    title: "Foundations",
    lessons: [
      {
        title: "What a Design System Is For",
        duration: 9,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content:
          "## What a Design System Is For\n\nA design system is a shared vocabulary, not a component folder. This lesson covers what belongs in one and — more usefully — what does not.",
      },
      {
        title: "Design Tokens",
        duration: 14,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content:
          "## Design Tokens\n\nColour, spacing, radius and type scales expressed as named values, so a change lands in one place instead of two hundred.",
      },
      {
        title: "Spacing and Type Scales",
        duration: 12,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content:
          "## Scales\n\nWhy a constrained scale produces better layouts than free choice, and how to pick one you can live with.",
      },
    ],
  },
  {
    title: "Components",
    lessons: [
      {
        title: "Variants and Composition",
        duration: 18,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        githubRepoUrl:
          "https://github.com/total-typescript/design-system-variants",
        content:
          "## Variants\n\nA variant API that composes beats one that enumerates. We build a button whose options multiply without the source doing the same.",
      },
      {
        title: "Accessible Primitives",
        duration: 16,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content:
          "## Accessible Primitives\n\nFocus management, keyboard interaction and ARIA — handled once in the primitive rather than in every consumer.",
      },
      {
        title: "Theming and Dark Mode",
        duration: 15,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content:
          "## Theming\n\nOne set of components, several themes, no forks. CSS custom properties do most of the work.",
      },
    ],
  },
  {
    title: "Living With It",
    lessons: [
      {
        title: "Documentation That Gets Read",
        duration: 11,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content:
          "## Documentation\n\nDocs next to the code, examples that run, and the one page every new team member actually opens.",
      },
      {
        title: "Versioning and Breaking Changes",
        duration: 13,
        videoUrl: "https://www.youtube.com/watch?v=zQnBQ4tB3ZA",
        content:
          "## Breaking Changes\n\nHow to ship a breaking change to twelve teams without becoming the reason they fork.",
      },
      {
        title: "Course Wrap-Up",
        duration: 6,
        content:
          "## Wrap-Up\n\nYou have a token layer, a component API you can defend, and a story for how changes land. Go and delete some CSS.",
      },
    ],
  },
];
