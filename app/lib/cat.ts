import catLines from "../data/catLines.json";

type CatLines = {
  greetings: string[];
  unknown: string[];
  streakBonus: string[];
  overallPositive: string[];
  overallNegative: string[];
  overallMixed: string[];
};

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getCatReaction(outcome: string, currentStreak: number) {
  const lines = catLines as unknown as CatLines;

  const base =
    outcome === "overallPositive"
      ? pick(lines.overallPositive)
      : outcome === "overallNegative"
        ? pick(lines.overallNegative)
        : outcome === "overallMixed"
          ? pick(lines.overallMixed)
          : pick(lines.unknown);

  // Small chance of a streak bonus line if streak >= 2
  const bonus =
    currentStreak >= 2 && Math.random() < 0.35 ? pick(lines.streakBonus) : null;

  return bonus ? `${base} ${bonus}` : base;
}

export function getCatGreeting() {
  const lines = catLines as unknown as CatLines;
  return pick(lines.greetings);
}
