import type { Metadata } from "next";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import AppearanceController from "./components/AppearanceController";
import AppearanceCatalogProvider from "./components/AppearanceCatalogProvider";
import AppWarmup from "./components/AppWarmup";
import AuthProvider from "./components/AuthProvider";
import GoogleAnalytics from "./components/GoogleAnalytics";
import GlobalAccountLayer from "./components/GlobalAccountLayer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeskCat",
  description: "The coziest writing companion on your desk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} antialiased`}>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <AuthProvider>
          <AppearanceCatalogProvider>
            <AppearanceController />
            <AppWarmup />
            <GlobalAccountLayer />
            {children}
          </AppearanceCatalogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
