import type { Metadata } from "next";
import { Geist, Geist_Mono, Michroma } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner"
import BackgroundGradients from "@/components/layout/background-gradients"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const michroma = Michroma({
  weight: "400",
  variable: "--font-michroma",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SellAudioBooks",
  description: "Create and sell audio books with AI",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "icon",
        url: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-primary/10" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${michroma.variable} antialiased`} suppressHydrationWarning>
        <Providers>
          <BackgroundGradients />
          <div className="min-h-screen relative z-10">
            {children}
          </div>
          <Toaster position="bottom-center" />
        </Providers>
      </body>
    </html>
  );
}
