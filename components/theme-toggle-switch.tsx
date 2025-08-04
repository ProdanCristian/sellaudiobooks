"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"

export function ThemeToggleSwitch() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-between w-full px-2 py-1.5">
        <div className="flex items-center space-x-2">
          <Sun className="h-4 w-4" />
          <span className="text-sm">Theme</span>
        </div>
        <Switch checked={false} />
      </div>
    )
  }

  const isDark = theme === "dark"

  return (
    <div className="flex items-center justify-between w-full px-2 py-1.5">
      <div className="flex items-center space-x-2">
        {isDark ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
        <span className="text-sm">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </div>
  )
}