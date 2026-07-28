import HomeApp from "./components/HomeApp";
import { isConstructionScreenEnabled } from "./lib/featureFlags.server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const isEnabled = await isConstructionScreenEnabled();

  return isEnabled ? <ConstructionScreen /> : <HomeApp />;
}

function ConstructionScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <div
          className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#9bd8ff]/30 bg-[#0d1521] shadow-[0_18px_48px_rgba(0,0,0,0.28)]"
          aria-hidden="true"
        >
          <span
            className="text-4xl font-semibold leading-none text-[#dff4ff]"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            D
          </span>
        </div>

        <p className="theme-text-tertiary mb-4 text-xs font-semibold uppercase tracking-[0.28em]">
          Under construction
        </p>

        <h1
          className="theme-text-primary text-5xl font-semibold leading-tight sm:text-6xl"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          DeskCat is getting ready.
        </h1>

        <p className="theme-text-secondary mt-6 max-w-md text-lg leading-8">
          A cozy writing companion is on the way. Please check back soon.
        </p>

        <div className="theme-text-tertiary mt-10 border-t border-white/10 pt-6 text-sm">
          Thanks for your patience.
        </div>
      </section>
    </main>
  );
}
