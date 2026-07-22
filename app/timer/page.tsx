"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CatStage from "../components/CatStage";
import PageBackLink from "../components/PageBackLink";

type SessionType = "Sprint" | "Marathon" | "Pomodoro" | "Custom";

type SessionConfig = {
  focusMinutes: number;
  breakMinutes: number;
  rounds: number;
};

type TimerSoundName = "break_over" | "end_session" | "start_session" | "take_break";

const SESSION_PRESETS: Record<SessionType, SessionConfig> = {
  Sprint: {
    focusMinutes: 15,
    breakMinutes: 0,
    rounds: 1
  },
  Marathon: {
    focusMinutes: 60,
    breakMinutes: 0,
    rounds: 1
  },
  Pomodoro: {
    focusMinutes: 15,
    breakMinutes: 5,
    rounds: 3
  },
  Custom: {
    focusMinutes: 10,
    breakMinutes: 1,
    rounds: 4
  }
};

const MAX_SESSION_MINUTES = 500;

function normalizeSessionType(type: string | null): SessionType {
  switch (type) {
    case "Marathon":
    case "Pomodoro":
    case "Custom":
      return type;
    case "Sprint":
    default:
      return "Sprint";
  }
}

function formatTime(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatMinutes(minutes: number) {
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

function formatRounds(rounds: number) {
  return `${rounds} round${rounds === 1 ? "" : "s"}`;
}

function parseSessionNumber(value: string, minimum: number, maximum: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return minimum;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export default function TimerPage() {
  return (
    <Suspense fallback={<TimerPageFallback />}>
      <TimerPageContent />
    </Suspense>
  );
}

function TimerPageContent() {
  const searchParams = useSearchParams();
  const sessionType = normalizeSessionType(searchParams.get("type"));

  return (
    <TimerSession
      key={sessionType}
      sessionType={sessionType}
      initialConfig={SESSION_PRESETS[sessionType]}
    />
  );
}

function TimerPageFallback() {
  return (
    <main className="min-h-screen px-6 pb-6 pt-10 flex justify-center">
      <div className="fixed left-4 top-4 z-40 max-w-[calc(100vw-2rem)]">
        <PageBackLink href="/" />
      </div>

      <div className="w-full max-w-md space-y-3">
        <CatStage />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Timer</h1>
          <span className="theme-text-secondary text-2xl font-semibold">Loading</span>
        </div>

        <div className="theme-surface rounded-2xl border p-6 text-center">
          <div className="text-6xl font-semibold tabular-nums">00:00</div>
        </div>
      </div>
    </main>
  );
}

function TimerSession({
  sessionType,
  initialConfig
}: {
  sessionType: SessionType;
  initialConfig: SessionConfig;
}) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [phase, setPhase] = useState<"focus" | "break" | "complete">("focus");
  const [currentRound, setCurrentRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(initialConfig.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const soundRefs = useRef<Record<TimerSoundName, HTMLAudioElement | null>>({
    break_over: null,
    end_session: null,
    start_session: null,
    take_break: null
  });

  useEffect(() => {
    const sounds: Record<TimerSoundName, HTMLAudioElement> = {
      break_over: new Audio("/sounds/break_over"),
      end_session: new Audio("/sounds/end_session"),
      start_session: new Audio("/sounds/start_session"),
      take_break: new Audio("/sounds/take_break")
    };

    for (const audio of Object.values(sounds)) {
      audio.preload = "auto";
    }

    soundRefs.current = sounds;

    return () => {
      for (const audio of Object.values(sounds)) {
        audio.pause();
      }

      soundRefs.current = {
        break_over: null,
        end_session: null,
        start_session: null,
        take_break: null
      };
    };
  }, []);

  const playSound = useCallback((soundName: TimerSoundName) => {
    const audio = soundRefs.current[soundName];
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play().catch(() => {});
  }, []);

  function resetSession() {
    setPhase("focus");
    setCurrentRound(1);
    setSecondsLeft(config.focusMinutes * 60);
  }

  const advancePhase = useCallback(() => {
    if (phase === "focus") {
      if (currentRound >= config.rounds) {
        playSound("end_session");
        setPhase("complete");
        setIsRunning(false);
        setSecondsLeft(0);
        return;
      }

      if (config.breakMinutes > 0) {
        playSound("take_break");
        setPhase("break");
        setSecondsLeft(config.breakMinutes * 60);
        return;
      }

      setCurrentRound((value) => value + 1);
      setSecondsLeft(config.focusMinutes * 60);
      return;
    }

    if (phase === "break") {
      playSound("break_over");
      setPhase("focus");
      setCurrentRound((value) => Math.min(value + 1, config.rounds));
      setSecondsLeft(config.focusMinutes * 60);
    }
  }, [config.breakMinutes, config.focusMinutes, config.rounds, currentRound, phase, playSound]);

  useEffect(() => {
    if (!isRunning || phase === "complete") return;

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalRef.current ?? undefined);
          intervalRef.current = null;
          window.setTimeout(() => {
            advancePhase();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [advancePhase, config.breakMinutes, config.focusMinutes, currentRound, isRunning, phase]);

  const isComplete = phase === "complete";
  const isAtStart = phase === "focus" && currentRound === 1 && secondsLeft === config.focusMinutes * 60;
  const primaryLabel = isRunning ? "Pause" : isComplete ? "Restart" : isAtStart ? "Start" : "Resume";

  function handlePrimary() {
    if (isComplete) {
      resetSession();
      playSound("start_session");
      setIsRunning(true);
      return;
    }

    if (isAtStart && !isRunning) {
      playSound("start_session");
    }

    setIsRunning((value) => !value);
  }

  function handleEnd() {
    setIsRunning(false);
    router.push(`/reflect?type=${encodeURIComponent(sessionType)}`);
  }

  function updateConfig<K extends keyof SessionConfig>(key: K, value: string) {
    const minimum = key === "breakMinutes" ? 0 : 1;
    const maximum = key === "rounds" ? 99 : MAX_SESSION_MINUTES;
    const nextConfig = {
      ...config,
      [key]: parseSessionNumber(value, minimum, maximum)
    };

    setConfig(nextConfig);
    setIsRunning(false);
    setPhase("focus");
    setCurrentRound(1);
    setSecondsLeft(nextConfig.focusMinutes * 60);
  }

  const timeText = formatTime(secondsLeft);
  const breakText = config.breakMinutes === 0 ? "No break" : formatMinutes(config.breakMinutes);
  const phaseLabel =
    phase === "break" ? "Break" : phase === "complete" ? "Session Complete" : "Focus";
  const phaseDetail =
    phase === "break"
      ? `Round ${Math.min(currentRound + 1, config.rounds)} starts next`
      : phase === "complete"
        ? `${formatRounds(config.rounds)} finished`
        : `Round ${currentRound} of ${config.rounds}`;

  return (
    <main className="min-h-screen px-6 pb-6 pt-10 flex justify-center">
      <div className="fixed left-4 top-4 z-40 max-w-[calc(100vw-2rem)]">
        <PageBackLink href="/" />
      </div>

      <div className="w-full max-w-md space-y-3">
        <CatStage />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Timer</h1>
          <span className="theme-text-secondary text-2xl font-semibold">{sessionType}</span>
        </div>

        <section className="theme-surface rounded-2xl border p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <SessionMetric label="Duration" value={formatMinutes(config.focusMinutes)} />
            <SessionMetric label="Breaks" value={breakText} />
            <SessionMetric label="Rounds" value={formatRounds(config.rounds)} />
          </div>

          {sessionType === "Custom" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="theme-text-secondary block text-sm font-medium">Minutes</span>
                <input
                  type="number"
                  min={1}
                  max={MAX_SESSION_MINUTES}
                  inputMode="numeric"
                  className="theme-input w-full rounded-xl border px-3 py-2"
                  value={config.focusMinutes}
                  onChange={(event) => updateConfig("focusMinutes", event.target.value)}
                  disabled={isRunning}
                />
              </label>

              <label className="space-y-1">
                <span className="theme-text-secondary block text-sm font-medium">Break</span>
                <input
                  type="number"
                  min={0}
                  max={MAX_SESSION_MINUTES}
                  inputMode="numeric"
                  className="theme-input w-full rounded-xl border px-3 py-2"
                  value={config.breakMinutes}
                  onChange={(event) => updateConfig("breakMinutes", event.target.value)}
                  disabled={isRunning}
                />
              </label>

              <label className="space-y-1">
                <span className="theme-text-secondary block text-sm font-medium">Rounds</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  inputMode="numeric"
                  className="theme-input w-full rounded-xl border px-3 py-2"
                  value={config.rounds}
                  onChange={(event) => updateConfig("rounds", event.target.value)}
                  disabled={isRunning}
                />
              </label>
            </div>
          )}

        </section>

        <div className="theme-surface rounded-2xl border px-6 py-5 text-center">
          <div className="mb-4 space-y-1">
            <div className="theme-text-tertiary text-xs uppercase tracking-[0.22em]">
              {phaseLabel}
            </div>
            <div className="theme-text-secondary text-sm">{phaseDetail}</div>
          </div>

          <div className="text-6xl font-semibold tabular-nums">{timeText}</div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              className="theme-button-secondary theme-hover-highlight rounded-xl border py-2 font-medium transition"
              onClick={handlePrimary}
            >
              {primaryLabel}
            </button>

            <button
              className="theme-button-primary theme-hover-highlight rounded-xl border py-2 font-medium transition"
              onClick={handleEnd}
            >
              End Session
            </button>
          </div>

          {isComplete && (
            <p className="theme-text-secondary mt-4 text-sm">
              Session complete. Use End Session to jump into reflection.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function SessionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-subsurface rounded-xl border px-3 py-3">
      <div className="theme-text-tertiary text-xs uppercase tracking-[0.18em]">{label}</div>
      <div className="theme-text-primary mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
