'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Receipt,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getLowStockItems, type InventoryItem } from '@/lib/db'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
  { label: 'المرضى', href: '/dashboard/patients', icon: Users },
  { label: 'المواعيد', href: '/dashboard/appointments', icon: Calendar },
  { label: 'خطط العلاج', href: '/dashboard/treatments', icon: ClipboardList },
  { label: 'الفواتير', href: '/dashboard/invoices', icon: Receipt },
  { label: 'المخزون', href: '/dashboard/inventory', icon: Package },
  { label: 'التقارير', href: '/dashboard/reports', icon: BarChart3 },
  { label: 'الإعدادات', href: '/dashboard/settings', icon: Settings, adminOnly: true },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // RTL sidebar layout adjustments applied
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    } else if (user?.mustChangePassword) {
      router.push('/change-password')
    }
  }, [isAuthenticated, user, router])

  useEffect(() => {
    const checkLowStock = async () => {
      const items = await getLowStockItems()
      setLowStockItems(items)
    }
    checkLowStock()
    const interval = setInterval(checkLowStock, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || user.role === 'admin'
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-card px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-10 overflow-hidden">
            <Image src="/LOGO.PNG" alt="Logo" fill className="object-contain" />
          </div>
          <span className="font-semibold text-primary">Sara Dental Clinic</span>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Bell className="h-5 w-5" />
            {lowStockItems.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-72 bg-card border-l transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden">
                <Image src="/LOGO.PNG" alt="Logo" fill className="object-contain" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Sara Dental Clinic</h2>
                <p className="text-xs text-muted-foreground">د. سارة وسوف</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="rounded-xl lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors flex-row-reverse text-right',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                    {item.href === '/dashboard/inventory' && lowStockItems.length > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                        {lowStockItems.length}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </ScrollArea>

          {/* User Section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.role === 'admin' ? 'مدير' : 'موظف استقبال'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl justify-end text-muted-foreground hover:text-destructive hover:border-destructive"
              onClick={handleLogout}
            >
              تسجيل الخروج
              <LogOut className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:mr-72">
        <div className="min-h-screen p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
