import type { Metadata, Viewport } from "next";
import { Inter, Lora, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { GlobalCommandPalette } from "@/components/ui/GlobalCommandPalette";
import "./globals.css";
import { Toaster } from 'sonner';

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

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quadencode.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Quad Encode - The AI Study Platform',
  description: 'Search a topic, get a ranked path of learning resources, and turn your notes into spaced-repetition flashcards instantly.',
  openGraph: {
    title: 'Quad Encode - The AI Study Platform',
    description: 'Search a topic, get a ranked path of learning resources, and turn your notes into spaced-repetition flashcards instantly.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Quad Encode',
    url: baseUrl,
    images: [{ url: '/study-notes.png', width: 1200, height: 630, alt: 'Quad Encode' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quad Encode',
    description: 'The AI-powered study platform.',
    images: ['/study-notes.png'],
  },
};

export const viewport: Viewport = {
  themeColor: "#14120f",
};

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
        <Providers>{children}</Providers>
        <GlobalCommandPalette />
        <Toaster theme="dark" position="bottom-center" toastOptions={{ className: 'bg-[#1a1815] border-white/10 text-white backdrop-blur-md bg-white/5' }} />
      </body>
    </html>
  );
}
