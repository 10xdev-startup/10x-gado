"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar
} from '@/components/ui/sidebar'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Check, Maximize2, Minimize2, MousePointerClick, PanelLeft } from 'lucide-react'

type SidebarMode = 'expanded' | 'collapsed' | 'hover'

const NAV_ITEMS = [
  { href: '/', title: 'Início', icon: '🏠' },
]

function AppSidebar() {
  const router    = useRouter()
  const pathname  = usePathname()
  const { setOpen, isMobile } = useSidebar()

  // Must match SSR: reading localStorage in useState initializer causes hydration
  // mismatch when saved mode is "hover" (SidebarRail only then).
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('expanded')
  const [modeRestored, setModeRestored] = useState(false)

  const prevModeRef = useRef<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-mode') as SidebarMode | null
    if (stored === 'expanded' || stored === 'collapsed' || stored === 'hover') {
      setSidebarMode(stored)
    }
    setModeRestored(true)
  }, [])

  useEffect(() => {
    if (!modeRestored) return
    if (prevModeRef.current === sidebarMode) return
    prevModeRef.current = sidebarMode
    localStorage.setItem('sidebar-mode', sidebarMode)
    if (isMobile) return
    setOpen(sidebarMode === 'expanded')
  }, [sidebarMode, setOpen, isMobile, modeRestored])

  const leaveTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownOpenRef  = useRef(false)

  const handleEnter = React.useCallback(() => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    setOpen(true)
  }, [setOpen])

  const handleLeave = React.useCallback(() => {
    if (dropdownOpenRef.current) return
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    leaveTimeoutRef.current = setTimeout(() => setOpen(false), 300)
  }, [setOpen])

  const handleDropdownChange = React.useCallback((open: boolean) => {
    dropdownOpenRef.current = open
    if (!open && sidebarMode === 'hover' && !isMobile) {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = setTimeout(() => setOpen(false), 400)
    }
  }, [sidebarMode, isMobile, setOpen])

  useEffect(() => () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
  }, [])

  const appName = useMemo(
    () => process.env['NEXT_PUBLIC_APP_NAME'] || 'Meu Projeto',
    []
  )

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={sidebarMode === 'hover' && !isMobile ? handleEnter : undefined}
      onMouseLeave={sidebarMode === 'hover' && !isMobile ? handleLeave : undefined}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{appName}</span>
                <span className="truncate text-xs text-muted-foreground">v0.1.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-y-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    onClick={() => router.push(item.href)}
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu onOpenChange={handleDropdownChange}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="text-muted-foreground hover:text-foreground">
                  <PanelLeft className="size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-48">
                <DropdownMenuItem onClick={() => setSidebarMode('expanded')}>
                  <Maximize2 className="size-4 mr-2" />
                  Expandido
                  {sidebarMode === 'expanded' && <Check className="size-4 ml-auto text-blue-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSidebarMode('collapsed')}>
                  <Minimize2 className="size-4 mr-2" />
                  Recolhido
                  {sidebarMode === 'collapsed' && <Check className="size-4 ml-auto text-blue-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSidebarMode('hover')}>
                  <MousePointerClick className="size-4 mr-2" />
                  Expandir ao passar
                  {sidebarMode === 'hover' && <Check className="size-4 ml-auto text-blue-600" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {sidebarMode === 'hover' && <SidebarRail />}
    </Sidebar>
  )
}

export default React.memo(AppSidebar)
