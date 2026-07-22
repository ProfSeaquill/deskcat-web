"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { createPortal } from "react-dom";

export default function AccountControl() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const isLoading = status === "loading";
  const callbackUrl = pathname || "/";
  const userLabel = session?.user?.name ?? session?.user?.email ?? "Signed in";

  if (isLoading) {
    return (
      <div className="theme-button-secondary rounded-2xl border px-4 py-2 text-sm opacity-70">
        Account
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsSignInOpen(true)}
          className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Sign in
        </button>

        {isSignInOpen &&
          createPortal(
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/58 px-6 py-8 backdrop-blur-md">
              <section className="theme-surface-strong w-full max-w-md rounded-[28px] border p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="theme-text-tertiary text-xs font-semibold uppercase tracking-[0.22em]">
                      DeskCat account
                    </p>
                    <h1 className="theme-text-primary mt-2 text-3xl font-semibold tracking-tight">
                      Sign in
                    </h1>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSignInOpen(false)}
                    className="theme-button-secondary theme-hover-highlight inline-flex h-9 w-9 items-center justify-center rounded-full border text-lg leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    aria-label="Close sign in"
                  >
                    ×
                  </button>
                </div>

                <p className="theme-text-secondary mt-3 text-sm leading-6">
                  Use Google to sign in to DeskCat. You can close this and keep using the app
                  without an account.
                </p>

                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    onClick={() => void signIn("google", { callbackUrl })}
                    className="theme-button-primary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  >
                    Continue with Google
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSignInOpen(false)}
                    className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                  >
                    Not now
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )}
      </>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <div className="theme-subsurface max-w-full truncate rounded-2xl border px-4 py-2 text-sm">
        {userLabel}
      </div>
      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/" })}
        className="theme-button-secondary theme-hover-highlight inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        Sign out
      </button>
    </div>
  );
}
