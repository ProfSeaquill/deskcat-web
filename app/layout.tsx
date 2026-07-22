import type { Metadata } from "next";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import AppearanceController from "./components/AppearanceController";
import AppWarmup from "./components/AppWarmup";
import AuthProvider from "./components/AuthProvider";
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
        <AuthProvider>
          <AppearanceController />
          <AppWarmup />
          <GlobalAccountLayer />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
