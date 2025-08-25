"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import React from "react";
import Link from "next/link";
import { TextEffect } from "@/components/motion-primitives/text-effect";
import Header from "@/components/layout/header";
import AiPrompt from "@/components/shared/ai-prompt";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const [aiPromptState, setAiPromptState] = useState<'prompt' | 'titles' | 'cover' | 'complete'>('prompt');

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);


  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="max-w-5xl mx-auto text-center space-y-8 sm:space-y-12 lg:space-y-16">
            {/* Hero Section */}
            <div className="space-y-4 sm:space-y-6 lg:space-y-8">
              <TextEffect
                per="char"
                preset="fade"
                className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-bold font-michroma leading-tight"
              >
                Create and Sell Audio Books with AI
              </TextEffect>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-2 sm:px-4">
                The complete AI-powered platform for authors, influencers, and creators to write books, generate audio versions, and create professional sales pages.
              </p>
            </div>

            {/* AI Prompt */}
            <div className="w-full max-w-3xl mx-auto px-2 sm:px-0">
              <AiPrompt onStateChange={setAiPromptState} />
            </div>

            {/* CTA Button */}
            {aiPromptState === 'prompt' && (
              <div className="pt-2 sm:pt-4">
                <Button
                  size="lg"
                  className="text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 h-auto min-w-[180px] sm:min-w-[200px]"
                  asChild
                >
                  <Link href="/auth/signup">Get Started for free</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
