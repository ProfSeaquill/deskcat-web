"use client";

import { usePathname } from "next/navigation";
import AccountControl from "./AccountControl";

export default function GlobalAccountLayer() {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isHomePage = pathname === "/";

  return (
    <>
      {!isLoginPage && !isHomePage && (
        <div className="fixed right-4 top-4 z-40 max-w-[calc(100vw-2rem)]">
          <AccountControl />
        </div>
      )}
    </>
  );
}
