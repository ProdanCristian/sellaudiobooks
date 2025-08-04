"use client"

import { useSession } from 'next-auth/react'
import DashboardHeader from '@/components/dashboard-header'
import Link from 'next/link'
import { Plus, TrendingUp, Video, User } from "lucide-react"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const Dashboard = () => {
  const { data: session } = useSession()
  
  const firstName = session?.user?.name ? session.user.name.split(' ')[0] : 'Creator'

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-24">
        
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Welcome back, {firstName}!
              </h1>
              <p className="text-lg text-muted-foreground">
                Ready to create your next viral video?
              </p>
            </div>
            <Link href="/create">
              <Button className="bg-red-600 hover:bg-red-700 text-white font-medium transition-colors duration-200 group-hover:shadow-lg group-hover:shadow-red-500/25">
                <Plus className="w-4 h-4 mr-2" />
                Create New Video
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card border-border hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/create">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Videos Created</p>
                    <p className="text-2xl font-bold text-foreground">12</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Video className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
          
          <Card className="bg-card border-border hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/character-generation">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">Character Generation</p>
                    <p className="text-sm text-foreground">Create consistent characters</p>
                  </div>
                  <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <User className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Views</p>
                  <p className="text-2xl font-bold text-foreground">24.5K</p>
                </div>
                <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Recent Activity</h2>
          
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Latest Videos</CardTitle>
              <CardDescription className="text-muted-foreground">
                Your most recent video creations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent videos found</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default Dashboard