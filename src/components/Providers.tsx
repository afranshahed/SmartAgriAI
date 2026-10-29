"use client";

import { SessionProvider } from "next-auth/react";
import { SWRConfig } from "swr";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Restore persisted theme preference.
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (stored === "dark" || (!stored && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <SessionProvider>
      <SWRConfig
        value={{
          fetcher: (url: string) =>
            fetch(url).then((r) => {
              if (!r.ok) throw new Error("Request failed");
              return r.json();
            }),
          revalidateOnFocus: false,
        }}
      >
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
