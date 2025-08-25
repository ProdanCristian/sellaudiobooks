"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import Logo from "@/components/layout/logo"
import { LogIn, LogOut, User, BookOpen } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"

export default function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({
      callbackUrl: "/auth/login",
    })
  }

  const navigateToDashboard = () => {
    router.push("/dashboard")
  }

  const navigateToBooks = () => {
    router.push("/books")
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-border">
      <div className="mx-auto">
        <div className="container px-2 mx-auto flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer"
            onClick={navigateToDashboard}
          >
            <Logo />
          </div>

          {/* User Menu or Login Button */}
          {status === 'loading' ? (
            <Skeleton className="h-10 w-10 rounded-full bg-muted/30" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-10 w-10 cursor-pointer">
                  <AvatarImage
                    src={session?.user?.image || ""}
                    alt={session?.user?.name || session?.user?.email || "User"}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                  <AvatarFallback className="bg-primary/10 text-foreground">
                    {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-transparent backdrop-blur-md p-2" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="" onClick={navigateToDashboard}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="" onClick={navigateToBooks}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Books</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              size="sm"
              asChild
              className="flex"
            >
              <Link href="/auth/login" className="flex items-center">
                <LogIn className="w-4 h-4" />
                <p className="hidden md:block pl-1">Login</p>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
} 