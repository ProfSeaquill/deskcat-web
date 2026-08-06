"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type GtagParams = Record<string, unknown>;

type Gtag = {
  (command: "js", date: Date): void;
  (command: "config", targetId: string, config?: GtagParams): void;
  (command: "event", eventName: string, eventParams?: GtagParams): void;
  (command: "set", params: GtagParams): void;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

function pagePath(pathname: string, searchParams: { toString(): string }) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const didMount = useRef(false);

  useEffect(() => {
    if (!measurementId) {
      return;
    }

    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    window.gtag?.("config", measurementId, {
      page_path: pagePath(pathname, searchParams)
    });
  }, [pathname, searchParams]);

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag("js", new Date());
          gtag("config", ${JSON.stringify(measurementId)});
        `}
      </Script>
    </>
  );
}
