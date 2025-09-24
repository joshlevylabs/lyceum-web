"use client"

import * as React from "react"

// Try to import Radix tabs, fall back to simple implementation if not available
let TabsPrimitive: any
try {
  TabsPrimitive = require("@radix-ui/react-tabs")
} catch (e) {
  // Fallback implementation
  TabsPrimitive = {
    Root: ({ children, value, onValueChange, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    List: ({ children, className, ...props }: any) => (
      <div className={`flex ${className || ''}`} {...props}>{children}</div>
    ),
    Trigger: ({ children, value, onClick, className, ...props }: any) => (
      <button 
        className={`px-3 py-2 ${className || ''}`} 
        onClick={() => onClick && onClick(value)}
        {...props}
      >
        {children}
      </button>
    ),
    Content: ({ children, value, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    )
  }
}

import { cn } from "@/lib/utils"

// Context for tab state management (simple fallback)
const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
}>({ value: '', onValueChange: () => {} })

const Tabs = TabsPrimitive?.Root || React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
    onValueChange: (value: string) => void
  }
>(({ className, value, onValueChange, children, ...props }, ref) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  </TabsContext.Provider>
))

const TabsList = TabsPrimitive?.List || React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500",
      className
    )}
    {...props}
  />
))

const TabsTrigger = TabsPrimitive?.Trigger || React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
  }
>(({ className, value: triggerValue, children, ...props }, ref) => {
  const { value, onValueChange } = React.useContext(TabsContext)
  const isActive = value === triggerValue
  
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "bg-white text-gray-900 shadow-sm" 
          : "hover:bg-gray-200 hover:text-gray-900",
        className
      )}
      onClick={() => onValueChange(triggerValue)}
      {...props}
    >
      {children}
    </button>
  )
})

const TabsContent = TabsPrimitive?.Content || React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
  }
>(({ className, value: contentValue, children, ...props }, ref) => {
  const { value } = React.useContext(TabsContext)
  
  if (value !== contentValue) return null
  
  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

// Set display names
if (Tabs) Tabs.displayName = "Tabs"
if (TabsList) TabsList.displayName = "TabsList" 
if (TabsTrigger) TabsTrigger.displayName = "TabsTrigger"
if (TabsContent) TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
