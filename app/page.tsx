"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import React from "react";
import Link from "next/link";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import Header from "@/components/header";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center pt-28 pb-16 min-h-[calc(100vh-112px)] flex flex-col items-center justify-center">
            <TextEffect
              per="char"
              preset="fade"
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 font-michroma px-2 sm:px-4 leading-tight"
            >
              Create and sell audio books with AI
            </TextEffect>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              The complete AI-powered platform for authors, influencers, and creators to write books, generate audio versions, and create professional sales pages to monetize their content.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/auth/signup">Get Started for free</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
