"use client"

import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"
import { Youtube, Smartphone } from "lucide-react"

export default function Dashboard() {
  const router = useRouter()

  const handleLongVideos = () => {
    router.push("/long-videos")
  }

  const handleShortVideos = () => {
    router.push("/short-videos")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DashboardHeader />

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-24 items-center justify-center h-screen flex flex-col">
        
        {/* Main Heading Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Choose Your Video Format
          </h1>
          <p className="text-lg text-white/70 mb-2 max-w-3xl mx-auto">
            Create AI-powered faceless videos with voiceovers for any platform
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Long Format Videos Card */}
          <div 
            className="cursor-pointer group"
            onClick={handleLongVideos}
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-200 h-72 flex flex-col">
              {/* Icon */}
              <div className="mb-6 text-center">
                <Youtube className="w-12 h-12 text-red-500 mx-auto" />
              </div>
              
              {/* Title */}
              <h2 className="text-xl font-bold text-white mb-3 text-center">
                Long Format Videos
              </h2>
              
              {/* Description */}
              <p className="text-white/70 text-center mb-6 flex-grow">
                Perfect for YouTube • 5-15 minutes
              </p>
              
              {/* CTA Button */}
              <button
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200 cursor-pointer"
                onClick={handleLongVideos}
              >
                Create Long Videos
              </button>
            </div>
          </div>

          {/* Short Format Videos Card */}
          <div 
            className="cursor-pointer group"
            onClick={handleShortVideos}
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-200 h-72 flex flex-col">
              {/* Icon */}
              <div className="mb-6 text-center">
                <Smartphone className="w-12 h-12 text-purple-500 mx-auto" />
              </div>
              
              {/* Title */}
              <h2 className="text-xl font-bold text-white mb-3 text-center">
                Short Format Videos
              </h2>
              
              {/* Description */}
              <p className="text-white/70 text-center mb-6 flex-grow">
                Perfect for TikTok, YouTube Shorts, Instagram Reels
              </p>
              
              {/* CTA Button */}
              <button
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors duration-200 cursor-pointer"
                onClick={handleShortVideos}
              >
                Create Short Videos
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}