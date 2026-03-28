export default function SpeechBubble({
  text,
  tail = "down-left"
}: {
  text: string;
  tail?: "down-left" | "down-right" | "up-left" | "up-right";
}) {
  const tailPosition =
    tail === "down-left"
      ? {
          outerClassName: "left-7 -bottom-7",
          innerClassName: "left-[30px] -bottom-6",
          outerStyle: { borderTopColor: "var(--theme-bubble-border)" },
          innerStyle: { borderTopColor: "var(--theme-bubble-background)" }
        }
      : tail === "down-right"
      ? {
          outerClassName: "right-7 -bottom-7",
          innerClassName: "right-[30px] -bottom-6",
          outerStyle: { borderTopColor: "var(--theme-bubble-border)" },
          innerStyle: { borderTopColor: "var(--theme-bubble-background)" }
        }
      : tail === "up-left"
      ? {
          outerClassName: "left-7 -top-7",
          innerClassName: "left-[30px] -top-6",
          outerStyle: { borderBottomColor: "var(--theme-bubble-border)" },
          innerStyle: { borderBottomColor: "var(--theme-bubble-background)" }
        }
      : {
          outerClassName: "right-7 -top-7",
          innerClassName: "right-[30px] -top-6",
          outerStyle: { borderBottomColor: "var(--theme-bubble-border)" },
          innerStyle: { borderBottomColor: "var(--theme-bubble-background)" }
        };

  return (
    <div
      className={[
        "relative w-[300px] max-w-[78vw]",
        "theme-bubble rounded-[26px] border-2 px-4 py-3",
        "text-sm leading-relaxed shadow-[0_12px_28px_rgba(15,23,42,0.14)]",
      ].join(" ")}
    >
      <span
        className={`absolute h-0 w-0 border-[14px] border-transparent ${tailPosition.outerClassName}`}
        style={tailPosition.outerStyle}
      />
      <span
        className={`absolute h-0 w-0 border-[12px] border-transparent ${tailPosition.innerClassName}`}
        style={tailPosition.innerStyle}
      />
      {text}
    </div>
  );
}
