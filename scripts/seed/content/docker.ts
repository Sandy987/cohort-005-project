import type { ModuleSpec } from "../course-content";

export const dockerModules: ModuleSpec[] = [
  {
    title: "Containers",
    lessons: [
      {
        title: "Why Containers",
        duration: 8,
        videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
        content:
          "## Why Containers\n\nThe problem containers solve, stated precisely enough to know when you do not have it.",
      },
      {
        title: "Writing a Dockerfile",
        duration: 17,
        videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
        content:
          "## Dockerfiles\n\nLayer caching, multi-stage builds, and getting the image under a hundred megabytes.",
      },
      {
        title: "Images and Registries",
        duration: 12,
        content:
          "## Registries\n\nTagging, pushing, and why `latest` is not a version.",
      },
    ],
  },
  {
    title: "Kubernetes Basics",
    lessons: [
      {
        title: "Pods, Deployments, Services",
        duration: 19,
        videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
        content:
          "## The Core Objects\n\nThree objects explain most of Kubernetes. This lesson is those three.",
      },
      {
        title: "Config and Secrets",
        duration: 14,
        content:
          "## Config\n\nConfigMaps, Secrets, and keeping environment differences out of the image.",
      },
    ],
  },
];
