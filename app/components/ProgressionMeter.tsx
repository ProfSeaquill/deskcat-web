type RewardStop = {
  label: string;
  value: number;
  highlight?: boolean;
};

type ProgressionMeterProps = {
  title: string;
  actionLabel: string;
  currentPercent?: number;
  rewards: RewardStop[];
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function ProgressionMeter({
  title,
  actionLabel,
  currentPercent = 62,
  rewards
}: ProgressionMeterProps) {
  const progress = clampPercent(currentPercent);
  const fillHeight = progress === 0 ? "0%" : `calc(${progress}% - 0.5rem)`;

  return (
    <section className="theme-surface rounded-[32px] border px-5 py-4 backdrop-blur">
      <div className="text-center">
        <h2 className="theme-text-primary text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="theme-text-secondary mt-2 text-sm">
          Three milestones, one very well-fed cat.
        </p>
      </div>

      <div className="relative mx-auto mt-5 h-[27.75rem] w-full max-w-[15.5rem]">
        <div className="absolute bottom-0 left-0 flex h-full w-[4.5rem] items-end justify-center">
          <div
            className="relative h-full w-12 rounded-full p-2 shadow-inner"
            style={{ backgroundColor: "var(--theme-subsurface)" }}
          >
            <div
              className="absolute inset-x-2 bottom-2 rounded-full bg-gradient-to-t from-[#6caedd] via-[#94caec] to-[#dff4ff] shadow-[0_0_24px_rgba(122,185,230,0.45)] transition-[height] duration-300"
              style={{ height: fillHeight }}
            />
          </div>
        </div>

        {rewards.map((reward) => {
          const style =
            reward.value >= 100
              ? { top: "-0.1rem" }
              : { top: `calc(${100 - reward.value}% - 0px)`, transform: "translateY(-50%)" };

          return (
            <div
              key={`${reward.label}-${reward.value}`}
              className="absolute left-[4.35rem] right-0 flex items-center gap-2"
              style={style}
            >
              <span
                className={`h-px w-5 ${
                  reward.highlight ? "bg-[#7ab9e6]" : "bg-white/30"
                }`}
              />
              <span
                className={
                  reward.highlight
                    ? "text-xl font-semibold tracking-tight"
                    : "theme-text-secondary text-base font-medium"
                }
                style={reward.highlight ? { color: "var(--theme-link)" } : undefined}
              >
                {reward.label}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="theme-button-primary theme-hover-highlight mt-5 w-full rounded-2xl border px-4 py-3 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        {actionLabel}
      </button>
    </section>
  );
}
