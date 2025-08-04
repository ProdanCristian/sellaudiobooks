"use client"

import Link from "next/link"
import DashboardHeader from "@/components/dashboard-header"
import { Youtube, Smartphone, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"


export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DashboardHeader />

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-24 items-center justify-center h-screen flex flex-col">
        
        {/* Main Heading Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Choose Your Video Format
          </h1>
          <p className="text-lg text-muted-foreground mb-2 max-w-3xl mx-auto">
            Create AI-powered faceless videos with voiceovers for any platform
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl ">
          
          {/* Long Format Videos Card */}
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 hover:border-red-500/30 transition-all duration-300 group cursor-pointer justify-center items-center">
            <Link href="/long-videos">
              <CardContent className="p-8 h-72 flex flex-col">
                {/* Icon */}
                <div className="mb-6 text-center">
                  <div className="h-16 w-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                    <Youtube className="w-8 h-8 text-red-500" />
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-foreground mb-3 text-center">
                  Long Format Videos
                </h3>
                
                {/* Description */}
                <p className="text-muted-foreground text-center mb-6 flex-grow">
                  Perfect for YouTube • 5-15 minutes
                </p>
                
                
                {/* CTA Button */}
                <Button 
                  className="w-fit mx-auto bg-red-600 hover:bg-red-700 text-white font-medium transition-colors duration-200 group-hover:shadow-lg group-hover:shadow-red-500/25"
                  variant="default"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Create Long Video
                </Button>
              </CardContent>
            </Link>
          </Card>

          {/* Short Format Videos Card */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/30 transition-all duration-300 group cursor-pointer justify-center items-center">
            <Link href="/short-videos">
              <CardContent className="p-8 h-72 flex flex-col">
                {/* Icon */}
                <div className="mb-6 text-center">
                  <div className="h-16 w-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                    <Smartphone className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-bold text-foreground mb-3 text-center">
                  Short Format Videos
                </h3>
                
                {/* Description */}
                <p className="text-muted-foreground text-center mb-6 flex-grow">
                  Perfect for TikTok, Instagram Reels, YouTube Shorts
                </p>
                
               
                {/* CTA Button */}
                <Button 
                  className="w-fit mx-auto bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors duration-200 group-hover:shadow-lg group-hover:shadow-purple-500/25"
                  variant="default"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Create Short Video
                </Button>
              </CardContent>
            </Link>
          </Card>

        </div>
      </main>
    </div>
  )
}