import type { Metadata, Viewport } from "next";
import { Inter, Lora, JetBrains_Mono } from "next/font/google";
import { MotionConfig } from "framer-motion";
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
  title: "Quad Encode",
  description: "Universal Study Platform",
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
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
