import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Puxy | Private Duo Chat Platform",
  description: "A luxury private digital room for two people. Secure, temporary, and beautiful.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} h-full antialiased dark`}
      >
        <body className="min-h-full flex flex-col bg-neutral-950 text-white font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
