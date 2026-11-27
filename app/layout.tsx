import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WebVitals } from "@/components/WebVitals";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Wave Tech — AI Career Agent & Job Tracker",
    template: "%s | Wave Tech",
  },
  description:
    "Upload your resume once, discover curated role matches, tailor applications in chat, and track every application with Wave Tech.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-white text-zinc-900 font-sans overflow-x-hidden"
      >
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
