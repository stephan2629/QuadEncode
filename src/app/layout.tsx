import type { Metadata, Viewport } from "next";
import { Inter, Lora, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: 'Quad Encode - The AI Study Platform',
  description: 'Search a topic, get a ranked path of learning resources, and turn your notes into spaced-repetition flashcards instantly.',
  openGraph: {
    title: 'Quad Encode - The AI Study Platform',
    description: 'Search a topic, get a ranked path of learning resources, and turn your notes into spaced-repetition flashcards instantly.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Quad Encode',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quad Encode',
    description: 'The AI-powered study platform.',
  },
};

export const viewport: Viewport = {
  themeColor: "#14120f",
};

import { ThreeBackground } from "@/components/ui/ThreeBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
      </head>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} font-sans antialiased overflow-x-hidden`}
      >
        <ThreeBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
