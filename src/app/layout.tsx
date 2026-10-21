import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const db = getDb();
    const appTitleSetting = await db.query.settings.findFirst({
      where: eq(settings.key, 'companyName'),
    });
    const title = appTitleSetting?.value || 'IT WORKPLACE';
    return {
      title: title,
      description: `ระบบงานไอที ${title}`,
    };
  } catch (e) {
    return {
      title: 'IT WORKPLACE',
      description: 'ระบบงานไอที',
    };
  }
}

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
