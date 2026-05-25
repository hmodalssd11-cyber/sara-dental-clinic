'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  Calendar, 
  Receipt, 
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { 
  getAllPatients, 
  getAllAppointments, 
  getAllInvoices,
  getLowStockItems,
  type Patient,
  type Appointment,
  type Invoice,
  type InventoryItem,
} from '@/lib/db'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  monthlyRevenue: number
  pendingPayments: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
  })
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [recentPatients, setRecentPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [patients, appointments, invoices, lowStock] = await Promise.all([
          getAllPatients(),
          getAllAppointments(),
          getAllInvoices(),
          getLowStockItems(),
        ])

        const today = format(new Date(), 'yyyy-MM-dd')
        const todayApts = appointments.filter(
          (apt) => apt.date === today && apt.status !== 'cancelled'
        ).sort((a, b) => a.startTime.localeCompare(b.startTime))

        const currentMonth = format(new Date(), 'yyyy-MM')
        const monthlyInvoices = invoices.filter(
          (inv) => inv.createdAt.startsWith(currentMonth) && inv.status !== 'cancelled'
        )
        const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
        const pendingPayments = invoices
          .filter((inv) => inv.status === 'pending' || inv.status === 'partial')
          .reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0)

        setStats({
          totalPatients: patients.length,
          todayAppointments: todayApts.length,
          monthlyRevenue,
          pendingPayments,
        })
        setTodayAppointments(todayApts.slice(0, 5))
        setLowStockItems(lowStock.slice(0, 5))
        setRecentPatients(
          patients
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        )
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US') + ' ل.س'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700'
      case 'scheduled':
        return 'bg-blue-100 text-blue-700'
      case 'completed':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'مجدول'
      case 'confirmed':
        return 'مؤكد'
      case 'completed':
        return 'مكتمل'
      case 'cancelled':
        return 'ملغي'
      case 'no-show':
        return 'لم يحضر'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="rounded-2xl animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-20 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar }).replace(/[\u0660-\u0669]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48))}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المرضى
            </CardTitle>
            <div className="rounded-xl bg-primary/10 p-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">مريض مسجل</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              مواعيد اليوم
            </CardTitle>
            <div className="rounded-xl bg-blue-100 p-2">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">موعد لهذا اليوم</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إيرادات الشهر
            </CardTitle>
            <div className="rounded-xl bg-green-100 p-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">ليرة سورية</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              مدفوعات معلقة
            </CardTitle>
            <div className="rounded-xl bg-orange-100 p-2">
              <Receipt className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingPayments)}</div>
            <p className="text-xs text-muted-foreground">بانتظار السداد</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Appointments */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">مواعيد اليوم</CardTitle>
                <CardDescription>المواعيد المجدولة لهذا اليوم</CardDescription>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد مواعيد لهذا اليوم
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold">
                        {apt.patientName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{apt.patientName}</p>
                        <p className="text-sm text-muted-foreground">{apt.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{apt.startTime}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                          apt.status
                        )}`}
                      >
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">تنبيهات المخزون</CardTitle>
                <CardDescription>المواد منخفضة المخزون</CardDescription>
              </div>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد تنبيهات للمخزون
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-orange-50"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-orange-600">
                        {item.quantity} {item.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        الحد الأدنى: {item.minStock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card className="rounded-2xl border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">آخر المرضى المسجلين</CardTitle>
                <CardDescription>أحدث المرضى المضافين للنظام</CardDescription>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {recentPatients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد مرضى مسجلين بعد
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-semibold">
                      {patient.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">{patient.fileNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
