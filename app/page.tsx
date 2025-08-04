"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { LogIn } from "lucide-react"
import Link from "next/link"
import Logo from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "authenticated") {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Logo />
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className="space-x-2">
                <Button variant="outline" asChild>
                  <Link href="/auth/login" className="flex items-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Create Amazing Video Reels with AI
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Transform your content into engaging video reels that captivate your audience
          </p>
          <Button size="lg" className="mr-4" asChild>
            <Link href="/auth/signup">
              Get Started
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/auth/login">
              Learn More
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Easy Creation</CardTitle>
              <CardDescription>
                Create professional video reels with our intuitive tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No technical skills required. Our drag-and-drop interface makes video creation accessible to everyone.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Smart Templates</CardTitle>
              <CardDescription>
                Choose from hundreds of professionally designed templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get started quickly with our library of templates optimized for social media platforms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instant Sharing</CardTitle>
              <CardDescription>
                Share your creations across all platforms instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                One-click publishing to Instagram, TikTok, YouTube, and more. Reach your audience everywhere.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Ready to Start Creating?
          </h3>
          <p className="text-muted-foreground mb-6">
            Join thousands of creators who are already making amazing content with VidsReels
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/signup">
              Start Your Free Trial
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
