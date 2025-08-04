"use client"

import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Logo from "@/components/logo"
import { ThemeToggleSwitch } from "@/components/theme-toggle-switch"
import { LogOut, User } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Image from "next/image"

export default function DashboardHeader() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({
      callbackUrl: "/auth/login",
    })
  }

  const navigateToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={navigateToDashboard}
          >
            <Logo />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="h-10 w-10">
                  {session?.user?.image && (
                    <Image
                      src={session.user.image} 
                      alt={session.user.name || session.user.email || "User"}
                      width={40}
                      height={40}
                    />
                  )}
                  <AvatarFallback className="bg-white text-black">
                    {session?.user?.name
                      ? session.user.name.charAt(0).toUpperCase()
                      : session?.user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session?.user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={navigateToDashboard}>
                <User className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1">
                <ThemeToggleSwitch />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 