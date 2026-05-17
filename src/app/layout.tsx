import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://tari.drepram.com"),
  title: {
    default: "TARI - Markdown to LaTeX Converter",
    template: "%s | TARI",
  },
  description:
    "TARI is a Markdown to LaTeX converter and Markdown to LaTeX syntax interpreter for clean, copy-ready LaTeX output.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TARI - Markdown to LaTeX Converter",
    description:
      "Convert Markdown into clean, copy-ready LaTeX syntax with TARI.",
    url: "https://tari.drepram.com",
    siteName: "TARI",
    locale: "en-US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TARI - Markdown to LaTeX Converter",
    description:
      "Convert Markdown into clean, copy-ready LaTeX syntax with TARI.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
