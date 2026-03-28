import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppearanceController from "./components/AppearanceController";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppearanceController />
        {children}
      </body>
    </html>
  );
}
