import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StatCard } from "./stat-cards";
import { DropOffFunnel } from "./drop-off-funnel";
import { QuizPassRates } from "./quiz-pass-rates";
import { RefundExposurePanel } from "./refund-exposure-panel";

function text(element: React.ReactElement) {
  return renderToStaticMarkup(element)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("StatCard", () => {
  it("shows the hint when the figure is not zero", () => {
    const shown = text(
      <StatCard
        label="Buyers"
        value={3}
        hint="People who paid."
        emptyHint="Nobody."
      />
    );
    expect(shown).toContain("People who paid.");
    expect(shown).not.toContain("Nobody.");
  });

  it("shows the empty hint when the figure is zero or a dash", () => {
    expect(
      text(
        <StatCard label="Buyers" value={0} hint="Paid." emptyHint="Nobody." />
      )
    ).toContain("Nobody.");
    expect(
      text(
        <StatCard label="Rating" value="—" hint="Paid." emptyHint="Nobody." />
      )
    ).toContain("Nobody.");
  });

  it("keeps the hint for a zero when there is no empty copy", () => {
    expect(text(<StatCard label="Buyers" value={0} hint="Paid." />)).toContain(
      "Paid."
    );
  });
});

describe("DropOffFunnel", () => {
  it("says so when the course has no lessons", () => {
    expect(
      text(<DropOffFunnel funnel={{ enrolledCount: 4, modules: [] }} />)
    ).toContain("This course has no lessons yet");
  });

  it("spells out the drop beside each lesson", () => {
    const shown = text(
      <DropOffFunnel
        funnel={{
          enrolledCount: 4,
          modules: [
            {
              moduleId: 1,
              title: "Basics",
              reachedCount: 4,
              dropWithin: 1,
              lessons: [
                {
                  lessonId: 1,
                  title: "Intro",
                  reachedCount: 4,
                  dropFromPrevious: 0,
                },
                {
                  lessonId: 2,
                  title: "Setup",
                  reachedCount: 3,
                  dropFromPrevious: 1,
                },
              ],
            },
          ],
        }}
      />
    );
    expect(shown).toContain("4 of 4 reached, 1 lost inside");
    expect(shown).toContain("Setup 3 −1");
  });
});

describe("QuizPassRates", () => {
  it("reads an untaken quiz as untaken, not failed", () => {
    const shown = text(
      <QuizPassRates
        quizzes={[
          {
            quizId: 1,
            title: "Quiz one",
            moduleTitle: "Basics",
            lessonTitle: "Intro",
            passingScorePercent: 70,
            studentCount: 0,
            passedCount: 0,
            passRatePercent: null,
            averageBestScorePercent: null,
          },
        ]}
      />
    );
    expect(shown).toContain("Nobody has attempted this quiz in this period.");
    expect(shown).not.toMatch(/ 0%/);
  });
});

describe("RefundExposurePanel", () => {
  const exposure = {
    grossCents: 5000,
    netCents: 4000,
    purchaseCount: 2,
    sharePercent: 10,
    closingTodayCount: 1,
    courses: [
      {
        courseId: 1,
        title: "Course A",
        grossCents: 3000,
        purchaseCount: 1,
        daysLeft: 0,
      },
      {
        courseId: 2,
        title: "Course B",
        grossCents: 2000,
        purchaseCount: 1,
        daysLeft: 1,
      },
    ],
  };

  it("says nothing is at risk when no purchase is inside its window", () => {
    expect(
      text(
        <RefundExposurePanel
          exposure={{
            ...exposure,
            purchaseCount: 0,
            closingTodayCount: 0,
            courses: [],
          }}
        />
      )
    ).toContain("Nothing in this period is still inside its refund window.");
  });

  it("names the soonest close per course and warns about today", () => {
    const shown = text(<RefundExposurePanel exposure={exposure} />);
    expect(shown).toContain("1 purchase leaves the window today.");
    expect(shown).toContain("Course A $30.00 1 Today");
    expect(shown).toContain("Course B $20.00 1 1 day");
  });
});
