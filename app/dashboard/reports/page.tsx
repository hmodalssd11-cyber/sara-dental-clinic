'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Download,
  BarChart3,
  PieChart,
} from 'lucide-react'
import {
  getRevenueStats,
  getAppointmentStats,
  getAllPatients,
  getAllInvoices,
  getAllAppointments,
} from '@/lib/db'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [revenueStats, setRevenueStats] = useState({ totalRevenue: 0, totalPending: 0, invoiceCount: 0 })
  const [appointmentStats, setAppointmentStats] = useState({ total: 0, byStatus: {} as Record<string, number> })
  const [patientCount, setPatientCount] = useState(0)
  const [monthlyComparison, setMonthlyComparison] = useState({ current: 0, previous: 0, change: 0 })

  useEffect(() => {
    loadReports()
  }, [startDate, endDate])

  async function loadReports() {
    setLoading(true)
    try {
      const [revenue, appointments, patients, invoices] = await Promise.all([
        getRevenueStats(startDate, endDate),
        getAppointmentStats(startDate, endDate),
        getAllPatients(),
        getAllInvoices(),
      ])

      setRevenueStats(revenue)
      setAppointmentStats(appointments)
      setPatientCount(patients.length)

      // Calculate monthly comparison
      const currentMonth = startOfMonth(new Date())
      const previousMonth = startOfMonth(subMonths(new Date(), 1))
      const previousMonthEnd = endOfMonth(subMonths(new Date(), 1))

      const currentMonthRevenue = await getRevenueStats(
        format(currentMonth, 'yyyy-MM-dd'),
        format(endOfMonth(new Date()), 'yyyy-MM-dd')
      )
      const previousMonthRevenue = await getRevenueStats(
        format(previousMonth, 'yyyy-MM-dd'),
        format(previousMonthEnd, 'yyyy-MM-dd')
      )

      const change = previousMonthRevenue.totalRevenue > 0
        ? ((currentMonthRevenue.totalRevenue - previousMonthRevenue.totalRevenue) / previousMonthRevenue.totalRevenue) * 100
        : 0

      setMonthlyComparison({
        current: currentMonthRevenue.totalRevenue,
        previous: previousMonthRevenue.totalRevenue,
        change,
      })
    } catch (error) {
      console.error('Error loading reports:', error)
    }
    setLoading(false)
  }

  function setQuickRange(days: number) {
    const end = new Date()
    const start = subDays(end, days)
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }

  function setMonthRange() {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  }

  const statusLabels: Record<string, string> = {
    scheduled: 'مجدولة',
    confirmed: 'مؤكدة',
    completed: 'مكتملة',
    cancelled: 'ملغية',
    'no-show': 'لم يحضر',
  }

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500',
    confirmed: 'bg-green-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-red-500',
    'no-show': 'bg-orange-500',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground">عرض وتحليل بيانات العيادة</p>
        </div>
      </div>

      {/* Date Filters */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuickRange(7)}>
                آخر 7 أيام
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange(30)}>
                آخر 30 يوم
              </Button>
              <Button variant="outline" size="sm" onClick={setMonthRange}>
                هذا الشهر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-foreground">
                  {revenueStats.totalRevenue.toLocaleString()} ل.س
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {monthlyComparison.change >= 0 ? (
                <>
                  <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{monthlyComparison.change.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                  <span className="text-red-500">{monthlyComparison.change.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-2">مقارنة بالشهر السابق</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المستحقات المعلقة</p>
                <p className="text-2xl font-bold text-foreground">
                  {revenueStats.totalPending.toLocaleString()} ل.س
                </p>
              </div>
              <div className="rounded-full bg-orange-100 p-3">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {revenueStats.invoiceCount} فاتورة في الفترة المحددة
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">المواعيد</p>
                <p className="text-2xl font-bold text-foreground">{appointmentStats.total}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {appointmentStats.byStatus['completed'] || 0} موعد مكتمل
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المرضى</p>
                <p className="text-2xl font-bold text-foreground">{patientCount}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">مسجلين في النظام</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointment Status Breakdown */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              توزيع حالات المواعيد
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(appointmentStats.byStatus).map(([status, count]) => {
                const percentage = appointmentStats.total > 0
                  ? ((count as number) / appointmentStats.total) * 100
                  : 0
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{statusLabels[status] || status}</span>
                      <span className="text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${statusColors[status] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {Object.keys(appointmentStats.byStatus).length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  لا توجد مواعيد في الفترة المحددة
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Summary */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              ملخص الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-xl bg-green-50 p-4">
                <div>
                  <p className="text-sm text-green-700">المحصل</p>
                  <p className="text-xl font-bold text-green-800">
                    {revenueStats.totalRevenue.toLocaleString()} ل.س
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-orange-50 p-4">
                <div>
                  <p className="text-sm text-orange-700">المعلق</p>
                  <p className="text-xl font-bold text-orange-800">
                    {revenueStats.totalPending.toLocaleString()} ل.س
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-500" />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-4">
                <div>
                  <p className="text-sm text-blue-700">الإجمالي</p>
                  <p className="text-xl font-bold text-blue-800">
                    {(revenueStats.totalRevenue + revenueStats.totalPending).toLocaleString()} ل.س
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle>المقارنة الشهرية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">الشهر الحالي</p>
              <div className="h-4 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(100, (monthlyComparison.current / Math.max(monthlyComparison.current, monthlyComparison.previous, 1)) * 100)}%`,
                  }}
                />
              </div>
              <p className="font-medium">{monthlyComparison.current.toLocaleString()} ل.س</p>
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">الشهر السابق</p>
              <div className="h-4 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-muted-foreground/50"
                  style={{
                    width: `${Math.min(100, (monthlyComparison.previous / Math.max(monthlyComparison.current, monthlyComparison.previous, 1)) * 100)}%`,
                  }}
                />
              </div>
              <p className="font-medium">{monthlyComparison.previous.toLocaleString()} ل.س</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
