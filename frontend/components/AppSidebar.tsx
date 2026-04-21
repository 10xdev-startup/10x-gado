"use client"

import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
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

const STORAGE_KEY = 'sidebar-mode'
const CHANGE_EVENT = 'sidebar-mode-change'

function isSidebarMode(v: string | null): v is SidebarMode {
  return v === 'expanded' || v === 'collapsed' || v === 'hover'
}

function subscribeSidebarMode(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener(CHANGE_EVENT, cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener(CHANGE_EVENT, cb)
  }
}

function getSidebarModeSnapshot(): SidebarMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  return isSidebarMode(stored) ? stored : 'expanded'
}

function getServerSidebarModeSnapshot(): SidebarMode {
  return 'expanded'
}

function setSidebarModePersisted(mode: SidebarMode) {
  localStorage.setItem(STORAGE_KEY, mode)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

const NAV_ITEMS = [
  { href: '/', title: 'Início', icon: '🏠' },
]

function AppSidebar() {
  const router    = useRouter()
  const pathname  = usePathname()
  const { setOpen, isMobile } = useSidebar()

  const sidebarMode = useSyncExternalStore(
    subscribeSidebarMode,
    getSidebarModeSnapshot,
    getServerSidebarModeSnapshot,
  )

  useEffect(() => {
    if (isMobile) return
    setOpen(sidebarMode === 'expanded')
  }, [sidebarMode, setOpen, isMobile])

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
                <DropdownMenuItem onClick={() => setSidebarModePersisted('expanded')}>
                  <Maximize2 className="size-4 mr-2" />
                  Expandido
                  {sidebarMode === 'expanded' && <Check className="size-4 ml-auto text-blue-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSidebarModePersisted('collapsed')}>
                  <Minimize2 className="size-4 mr-2" />
                  Recolhido
                  {sidebarMode === 'collapsed' && <Check className="size-4 ml-auto text-blue-600" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSidebarModePersisted('hover')}>
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
