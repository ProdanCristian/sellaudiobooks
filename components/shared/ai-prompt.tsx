"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextLoop } from "@/components/motion-primitives/text-loop";
import { TextShimmer } from "@/components/motion-primitives/text-shimmer";
import BookCover from "@/components/book/book-cover";
import Image from "next/image";

interface AiPromptProps {
    onSubmit?: (prompt: string) => void;
    isLoading?: boolean;
    onStateChange?: (state: FlowState) => void;
}

type FlowState = 'prompt' | 'titles' | 'cover' | 'complete';

const placeholders = [
    "Tell us what your book is about...",
    "Describe your book idea...",
    "Share your story concept...",
    "Let AI find the perfect title...",
    "What genre interests you?",
    "Describe your target audience...",
    "What's your book's main theme?"
];

export default function AiPrompt({ onSubmit, isLoading: externalLoading, onStateChange }: AiPromptProps) {
    const [prompt, setPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [flowState, setFlowState] = useState<FlowState>('prompt');

    const updateFlowState = (newState: FlowState) => {
        setFlowState(newState);
        if (onStateChange) {
            onStateChange(newState);
        }
    };
    const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
    const [selectedTitle, setSelectedTitle] = useState<string>("");
    const [generatedCover, setGeneratedCover] = useState<string>("");
    const [isRegenerating, setIsRegenerating] = useState(false);
    const router = useRouter();

    const actualLoading = externalLoading || isLoading;

    const generateTitles = async (prompt: string) => {
        try {
            const response = await fetch('/api/generation/titles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const data = await response.json();
            return data.titles || [];
        } catch (error) {
            console.error('Error generating titles:', error);
            return [];
        }
    };

    const generateBookCover = async (title: string) => {
        try {
            const response = await fetch('/api/generation/cover', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });

            const data = await response.json();

            if (data.imageUrl) {
                return data.imageUrl;
            } else if (data.fallbackUrl) {
                return data.fallbackUrl;
            }

            return '';
        } catch (error) {
            console.error('Error generating cover:', error);
            return '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || actualLoading) return;

        setIsLoading(true);
        try {
            if (flowState === 'prompt') {
                const titles = await generateTitles(prompt.trim());
                setGeneratedTitles(titles);
                updateFlowState('titles');
                if (onSubmit) {
                    await onSubmit(prompt.trim());
                }
            }
        } catch (error) {
            console.error('Error submitting prompt:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTitleSelect = async (title: string) => {
        setSelectedTitle(title);
        updateFlowState('cover');
        setIsLoading(true);

        try {
            const coverUrl = await generateBookCover(title);

            if (coverUrl) {
                setGeneratedCover(coverUrl);
                // Will transition to complete when BookCover calls onLoad
            } else {
                setGeneratedCover('/cover.png'); // fallback to existing cover
                updateFlowState('complete');
            }
        } catch (error) {
            console.error('Error generating cover:', error);
            setGeneratedCover('/cover.png'); // fallback to existing cover
            updateFlowState('complete');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageLoad = () => {
        updateFlowState('complete');
    };

    const handleFinish = () => {
        const searchParams = new URLSearchParams({
            title: selectedTitle,
            cover: generatedCover
        });
        router.push(`/auth/signup?${searchParams.toString()}`);
    };

    const handleRegenerateTitles = async () => {
        setIsRegenerating(true);
        try {
            const newTitles = await generateTitles(prompt.trim());
            setGeneratedTitles(newTitles);
        } catch (error) {
            console.error('Error regenerating titles:', error);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const syntheticEvent = {
                preventDefault: () => { },
                target: e.target,
                currentTarget: e.currentTarget
            } as React.FormEvent;
            handleSubmit(syntheticEvent);
        }
    };


    if (flowState === 'complete') {
        return (
            <div className="w-full max-w-4xl mx-auto px-4 text-center space-y-8">
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold">{selectedTitle}</h2>
                </div>

                {generatedCover ? (
                    <div className="flex justify-center">
                        <BookCover
                            imageSrc={generatedCover}
                            alt={selectedTitle}
                            className="max-w-sm"
                            onClick={handleFinish}
                        />
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="max-w-sm w-full h-64 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center">
                            <p className="text-gray-600 text-center px-4">Cover preview will be available soon</p>
                        </div>
                    </div>
                )}

                <Button
                    onClick={handleFinish}
                    size="lg"
                    className="px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                    Finish Creating Your Book
                    <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </div>
        );
    }

    if (flowState === 'cover') {
        return (
            <div className="w-full max-w-4xl mx-auto px-4 text-center space-y-8">
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold">{selectedTitle}</h2>
                    <p className="text-xl text-muted-foreground">Creating a beautiful cover for your book</p>
                </div>

                {/* Show BookCover with skeleton while generating/loading */}
                <div className="flex justify-center">
                    <BookCover
                        imageSrc={generatedCover || '/cover.png'}
                        alt={selectedTitle}
                        className="max-w-sm"
                        isLoading={!generatedCover}
                        onLoad={handleImageLoad}
                    />
                </div>
                <TextShimmer className="text-base text-muted-foreground/70">
                    Generating Cover...
                </TextShimmer>
            </div>
        );
    }

    if (flowState === 'titles' && generatedTitles.length > 0) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 space-y-6">
                <div className="text-center space-y-3">
                    <h2 className="text-2xl font-bold">Choose a Book Title</h2>
                </div>

                <div className="space-y-3">
                    {generatedTitles.map((title, index) => (
                        <Button
                            key={index}
                            onClick={() => handleTitleSelect(title)}
                            variant="outline"
                            className="w-full p-4 h-auto text-left justify-start hover:bg-primary/5 border-1 hover:border-primary/50 transition-all duration-300"
                            disabled={isLoading || isRegenerating}
                        >
                            <div className="text-base font-medium">{title}</div>
                        </Button>
                    ))}
                </div>

                <div className="flex justify-center pt-4">
                    <Button
                        onClick={handleRegenerateTitles}
                        variant="ghost"
                        disabled={isRegenerating || isLoading}
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        {isRegenerating ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Generating new titles...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Generate different titles
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-4">
            <form onSubmit={handleSubmit}>
                <div className="relative">
                    <Input
                        type="text"
                        value={actualLoading ? "" : prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-12 sm:h-14 md:h-16 pl-6 pr-20 sm:pr-24 rounded-full border focus:border-primary transition-all duration-300 md:text-base"
                        placeholder=""
                        disabled={actualLoading}
                    />
                    {actualLoading ? (
                        <div className="pointer-events-none absolute inset-y-0 left-6 flex items-center pr-16 sm:pr-20 md:pr-24 max-w-[75%] sm:max-w-[80%] md:max-w-[85%] overflow-hidden">
                            <TextShimmer className="text-base text-muted-foreground/70">
                                Generating titles...
                            </TextShimmer>
                        </div>
                    ) : prompt.length === 0 ? (
                        <div className="pointer-events-none absolute inset-y-0 left-6 flex items-center pr-16 sm:pr-20 md:pr-24 max-w-[75%] sm:max-w-[80%] md:max-w-[85%] overflow-hidden">
                            <TextLoop className="text-muted-foreground/70 text-center" interval={2.5} transition={{ duration: 0.35 }}>
                                {placeholders.map((text) => (
                                    <span key={text} className="truncate">{text}</span>
                                ))}
                            </TextLoop>
                        </div>
                    ) : null}
                    <div className="absolute top-1/2 right-2 sm:right-3 -translate-y-1/2 flex gap-1">
                        <Button
                            type="submit"
                            size="sm"
                            variant={prompt.trim() ? "default" : "ghost"}
                            className="rounded-full w-8 h-8 sm:w-9 sm:h-9"
                            disabled={!prompt.trim() || actualLoading}
                        >
                            <Send className="shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </div>
                </div>
            </form>

            {/* Powered by footer */}
            <div className="flex items-center justify-center gap-2">
                <Image
                    src="/Gpt.svg"
                    alt="GPT Logo"
                    width={20}
                    height={20}
                    className="opacity-70"
                />
                <span className="text-sm text-muted-foreground/70">
                    Powered by GPT 5
                </span>
            </div>
        </div>
    );
}
