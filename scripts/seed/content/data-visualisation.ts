import type { ModuleSpec } from "../course-content";

export const dataVisualisationModules: ModuleSpec[] = [
  {
    title: "Choosing a Chart",
    lessons: [
      {
        title: "Encodings and What They Say",
        duration: 12,
        videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
        content:
          "## Encodings\n\nPosition beats length beats angle beats area. Pick the strongest encoding the question allows.",
      },
      {
        title: "Time Series Done Right",
        duration: 14,
        videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
        content:
          "## Time Series\n\nRanges, resampling, and why a 30-day and a 90-day view of the same data should not look identical.",
      },
      {
        title: "Distributions",
        duration: 13,
        videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
        content:
          "## Distributions\n\nHistograms, box plots, and the mean hiding a bimodal population.",
      },
    ],
  },
  {
    title: "Making It Readable",
    lessons: [
      {
        title: "Scales and Axes",
        duration: 11,
        videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
        content:
          "## Scales\n\nWhen truncating an axis is honest, and when it is a lie with a legend.",
      },
      {
        title: "Colour and Accessibility",
        duration: 15,
        videoUrl: "https://www.youtube.com/watch?v=lsMQRaeKNDk",
        content:
          "## Colour\n\nSequential, diverging and categorical palettes, checked against the three common forms of colour blindness.",
      },
      {
        title: "Annotation and Narrative",
        duration: 10,
        content:
          "## Annotation\n\nThe label on the spike is doing more work than the spike.",
      },
    ],
  },
];
