"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { DeskCatCosmeticId } from "../lib/deskcatSprite";
import { getManagedCosmetic } from "../lib/appearanceCatalog";
import { useAppearanceCatalog } from "./AppearanceCatalogProvider";

type RewardStop = {
  label: string;
  amount: number;
  highlight?: boolean;
  cosmeticId?: DeskCatCosmeticId;
};

type ProgressionMeterProps = {
  title: string;
  actionLabel: string;
  currentAmount: number;
  goalAmount: number;
  currencyCode?: string;
  rewards: RewardStop[];
  onDonationConfirmed?: () => void | Promise<void>;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(value);
}

export default function ProgressionMeter({
  title,
  actionLabel,
  currentAmount,
  goalAmount,
  currencyCode = "USD",
  rewards,
  onDonationConfirmed
}: ProgressionMeterProps) {
  const { catalog } = useAppearanceCatalog();
  const [openRewardKey, setOpenRewardKey] = useState<string | null>(null);
  const [isDonationInfoOpen, setIsDonationInfoOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState("5");
  const [donationError, setDonationError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [returnStatus, setReturnStatus] = useState<
    "verifying" | "success" | "processing" | "cancelled" | "error" | null
  >(null);
  const meterRef = useRef<HTMLElement>(null);
  const progress = clampPercent(goalAmount > 0 ? (currentAmount / goalAmount) * 100 : 0);
  const fillHeight = progress === 0 ? "0%" : `calc(${progress}% - 0.5rem)`;
  const currentLabel = formatCurrency(currentAmount, currencyCode);
  const goalLabel = formatCurrency(goalAmount, currencyCode);
  const remainingLabel = formatCurrency(Math.max(goalAmount - currentAmount, 0), currencyCode);

  useEffect(() => {
    let isCancelled = false;
    const url = new URL(window.location.href);
    const donationStatus = url.searchParams.get("donation");
    const sessionId = url.searchParams.get("session_id");

    function clearDonationQuery() {
      url.searchParams.delete("donation");
      url.searchParams.delete("session_id");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    if (donationStatus === "cancelled") {
      setReturnStatus("cancelled");
      clearDonationQuery();
    } else if (donationStatus === "success") {
      setReturnStatus("verifying");

      async function verifyDonation() {
        if (!sessionId) {
          setReturnStatus("error");
          clearDonationQuery();
          return;
        }

        try {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            const response = await fetch(
              `/api/donations/status?session_id=${encodeURIComponent(sessionId)}`,
              { cache: "no-store" }
            );
            const data = (await response.json()) as {
              status?: "complete" | "processing" | "open";
              error?: string;
            };

            if (!response.ok) {
              throw new Error(data.error ?? "Unable to verify this donation.");
            }

            if (data.status === "complete") {
              if (!isCancelled) {
                setReturnStatus("success");
                await onDonationConfirmed?.();
                clearDonationQuery();
              }
              return;
            }

            if (attempt < 3) {
              await new Promise((resolve) => window.setTimeout(resolve, 1500));
            }
          }

          if (!isCancelled) {
            setReturnStatus("processing");
            clearDonationQuery();
          }
        } catch {
          if (!isCancelled) {
            setReturnStatus("error");
            clearDonationQuery();
          }
        }
      }

      void verifyDonation();
    }

    function handlePointerDown(event: PointerEvent) {
      if (!meterRef.current?.contains(event.target as Node)) {
        setOpenRewardKey(null);
        setIsDonationInfoOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenRewardKey(null);
        setIsDonationInfoOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      isCancelled = true;
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDonationConfirmed]);

  async function startDonation() {
    const amount = Number(donationAmount);

    if (!Number.isFinite(amount) || amount < 1 || amount > 10_000) {
      setDonationError("Enter an amount between $1 and $10,000.");
      return;
    }

    setDonationError(null);
    setIsRedirecting(true);

    try {
      const response = await fetch("/api/donations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to open Stripe Checkout.");
      }

      window.location.assign(data.url);
    } catch (error) {
      setDonationError(
        error instanceof Error ? error.message : "Unable to open Stripe Checkout."
      );
      setIsRedirecting(false);
    }
  }

  return (
    <section
      ref={meterRef}
      className="theme-surface relative rounded-[32px] border px-5 py-3.5 backdrop-blur"
    >
      <div className="absolute right-4 top-4 z-30">
        <button
          type="button"
          aria-label="How donations work"
          aria-expanded={isDonationInfoOpen}
          aria-controls="donation-info-tooltip"
          onClick={() => {
            setIsDonationInfoOpen((isOpen) => !isOpen);
            setOpenRewardKey(null);
          }}
          className="theme-text-secondary theme-hover-highlight flex h-[21px] w-[21px] items-center justify-center rounded-full border text-[10.5px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <span aria-hidden="true">i</span>
        </button>

        {isDonationInfoOpen && (
          <div
            id="donation-info-tooltip"
            role="tooltip"
            className="theme-surface-strong absolute right-0 top-full mt-2 w-64 rounded-[20px] border p-4 text-left shadow-xl"
          >
            <p className="theme-text-secondary text-sm leading-relaxed">
              Every donation adds to the community total, which unlocks rewards for everyone
              when we reach milestones. DeskCat is free to use and has no subscriptions, so
              these donations are the only way DeskCat eats. You don&apos;t wanna meet a starving
              DeskCat.
            </p>
          </div>
        )}
      </div>

      <div className="text-center">
        <h2 className="theme-text-primary text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="theme-text-primary mt-3 text-xl font-semibold tracking-tight">
          {currentLabel} / {goalLabel}
        </p>
        <p className="theme-text-secondary mt-1 text-sm">{remainingLabel} to go</p>
      </div>

      <div className="relative mx-auto mt-4 h-[22.5rem] w-full max-w-[15.5rem]">
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
          const rewardKey = `${reward.label}-${reward.amount}`;
          const preview = reward.cosmeticId
            ? getManagedCosmetic(catalog, reward.cosmeticId)
            : null;
          const isOpen = openRewardKey === rewardKey;
          const isEarned = currentAmount >= reward.amount;
          const style =
            reward.amount >= goalAmount
              ? { top: "-0.1rem" }
              : {
                  top: `calc(${100 - clampPercent((reward.amount / goalAmount) * 100)}% - 0px)`,
                  transform: "translateY(-50%)"
                };

          return (
            <div
              key={rewardKey}
              className={`absolute left-0 right-0 flex items-center gap-2 ${
                isOpen ? "z-20" : "z-0"
              }`}
              style={style}
            >
              <span
                className={`h-1 w-[5.6rem] shrink-0 ${
                  reward.highlight ? "bg-[#7ab9e6]" : "bg-white/30"
                }`}
              />
              <button
                type="button"
                onClick={() =>
                  preview && setOpenRewardKey((current) => (current === rewardKey ? null : rewardKey))
                }
                aria-label={isEarned ? `Earned ${reward.label}` : reward.label}
                aria-expanded={preview ? isOpen : undefined}
                aria-controls={preview ? `reward-preview-${reward.amount}` : undefined}
                disabled={!preview}
                className={
                  isEarned
                    ? "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-sm font-bold uppercase tracking-[0.12em] shadow-[0_0_16px_rgba(122,185,230,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(122,185,230,0.46)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    : reward.highlight
                    ? "rounded-lg text-left text-xl font-semibold tracking-tight transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    : "theme-text-secondary rounded-lg text-left text-base font-medium transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                }
                style={
                  isEarned
                    ? {
                        background: "color-mix(in srgb, var(--theme-link) 16%, transparent)",
                        borderColor: "var(--theme-link)",
                        color: "var(--theme-link)"
                      }
                    : reward.highlight
                      ? { color: "var(--theme-link)" }
                      : undefined
                }
              >
                {isEarned && <span aria-hidden="true">✦</span>}
                {isEarned ? "Earned" : reward.label}
              </button>

              {isOpen && preview && (
                <div
                  id={`reward-preview-${reward.amount}`}
                  role="tooltip"
                  className="theme-surface-strong absolute right-0 top-full mt-2 w-36 rounded-[20px] border p-3 shadow-xl"
                >
                  <div className="theme-subsurface flex h-24 items-center justify-center rounded-2xl border p-2">
                    <Image
                      src={preview.previewSrc.src}
                      alt={preview.label}
                      width={preview.previewSrc.width}
                      height={preview.previewSrc.height}
                      unoptimized
                      className="h-auto max-h-20 w-auto object-contain"
                    />
                  </div>
                  <p className="theme-text-primary mt-2 text-center text-sm font-semibold">
                    {preview.label}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        <label className="theme-text-secondary block text-sm font-medium" htmlFor="donation-amount">
          Donation amount
        </label>
        <div className="theme-input flex items-center rounded-2xl border px-4">
          <span className="theme-text-secondary" aria-hidden="true">$</span>
          <input
            id="donation-amount"
            type="number"
            min="1"
            max="10000"
            step="1"
            inputMode="decimal"
            value={donationAmount}
            onChange={(event) => setDonationAmount(event.target.value)}
            className="theme-text-primary min-w-0 flex-1 bg-transparent px-2 py-3 outline-none"
            aria-describedby={donationError ? "donation-error" : undefined}
          />
          <span className="theme-text-tertiary text-sm">{currencyCode}</span>
        </div>

        <button
          type="button"
          onClick={startDonation}
          disabled={isRedirecting}
          className="theme-button-primary theme-hover-highlight w-full rounded-2xl border px-4 py-3 text-base font-semibold transition disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {isRedirecting ? "Opening Stripe…" : actionLabel}
        </button>

        {donationError && (
          <p id="donation-error" role="alert" className="text-sm text-red-400">
            {donationError}
          </p>
        )}
        {returnStatus === "verifying" && (
          <p role="status" className="theme-text-secondary text-sm">
            Confirming your donation with Stripe…
          </p>
        )}
        {returnStatus === "success" && (
          <p role="status" className="theme-text-secondary text-sm">
            Thank you! Your donation has been confirmed and added to the community total.
          </p>
        )}
        {returnStatus === "processing" && (
          <p role="status" className="theme-text-secondary text-sm">
            Stripe is still processing your donation. The community total will update
            automatically once payment is confirmed.
          </p>
        )}
        {returnStatus === "cancelled" && (
          <p role="status" className="theme-text-secondary text-sm">
            Donation cancelled. You were not charged.
          </p>
        )}
        {returnStatus === "error" && (
          <p role="status" className="theme-text-secondary text-sm">
            We couldn&apos;t update the community total yet. Stripe will retry automatically,
            so please don&apos;t submit the same donation again.
          </p>
        )}
      </div>
    </section>
  );
}
