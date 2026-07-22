"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  return <LoginShell callbackUrl={callbackUrl} isLoading={status === "loading"} />;
}

function LoginShell({
  callbackUrl = "/",
  isLoading = false
}: {
  callbackUrl?: string;
  isLoading?: boolean;
}) {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center">
        <section className="theme-surface w-full rounded-[28px] border p-6 backdrop-blur">
          <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="theme-text-secondary mt-2 text-sm">
            Use your Google account to access DeskCat.
          </p>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void signIn("google", { callbackUrl })}
            className="theme-button-primary theme-hover-highlight mt-6 inline-flex w-full items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Continue with Google
          </button>

          <Link href="/" className="theme-link mt-4 inline-flex text-sm underline">
            Back home
          </Link>
        </section>
      </div>
    </main>
  );
}
