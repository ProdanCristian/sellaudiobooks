"use client"

import { useSession } from 'next-auth/react'
import Header from '@/components/header'


const Dashboard = () => {
  const { data: session } = useSession()


  const firstName = session?.user?.name ? session.user.name.split(' ')[0] : 'Creator'


  return (
    <div className="min-h-screen">
      <Header />

      {/* Dashboard Content */}
      <main className="page-container page-content">

        {/* Welcome Header */}
        <div className="mb-12">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-3">
              Welcome back, {firstName}!
            </h1>
          </div>
        </div>


      </main>
    </div>
  )
}

export default Dashboard