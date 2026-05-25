'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  AlertCircle,
  Check,
  X,
  User,
} from 'lucide-react'
import { 
  getAllAppointments, 
  getAppointmentsByDate,
  createAppointment, 
  updateAppointment,
  deleteAppointment,
  checkAppointmentOverlap,
  getAllPatients,
  type Appointment,
  type Patient,
} from '@/lib/db'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const appointmentTypes = [
  'كشف',
  'تنظيف',
  'حشوة',
  'خلع',
  'علاج عصب',
  'تركيب تاج',
  'تقويم',
  'أشعة',
  'متابعة',
  'أخرى',
]

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
]

function AppointmentsContent() {
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patient')
  
  const [view, setView] = useState<'day' | 'week'>('day')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [saving, setSaving] = useState(false)
  const [overlapError, setOverlapError] = useState('')

  const [newAppointment, setNewAppointment] = useState({
    patientId: preselectedPatientId || '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '09:30',
    type: 'كشف',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (preselectedPatientId) {
      setNewAppointment(prev => ({ ...prev, patientId: preselectedPatientId }))
      setShowNewDialog(true)
    }
  }, [preselectedPatientId])

  const loadData = async () => {
    try {
      const [appointmentsData, patientsData] = await Promise.all([
        getAllAppointments(),
        getAllPatients(),
      ])
      setAppointments(appointmentsData)
      setPatients(patientsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + 30
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setOverlapError('')
    setSaving(true)

    try {
      const patient = patients.find(p => p.id === newAppointment.patientId)
      if (!patient) {
        setOverlapError('يرجى اختيار مريض')
        setSaving(false)
        return
      }

      const hasOverlap = await checkAppointmentOverlap(
        newAppointment.date,
        newAppointment.startTime,
        newAppointment.endTime
      )

      if (hasOverlap) {
        setOverlapError('يوجد موعد آخر في هذا الوقت')
        setSaving(false)
        return
      }

      await createAppointment({
        patientId: newAppointment.patientId,
        patientName: patient.name,
        date: newAppointment.date,
        startTime: newAppointment.startTime,
        endTime: newAppointment.endTime,
        type: newAppointment.type,
        status: 'scheduled',
        notes: newAppointment.notes || undefined,
      })

      await loadData()
      setShowNewDialog(false)
      setNewAppointment({
        patientId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '09:30',
        type: 'كشف',
        notes: '',
      })
    } catch (error) {
      console.error('Error creating appointment:', error)
      setOverlapError('حدث خطأ أثناء إنشاء الموعد')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: Appointment['status']) => {
    try {
      await updateAppointment(id, { status })
      await loadData()
    } catch (error) {
      console.error('Error updating appointment:', error)
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    try {
      await deleteAppointment(id)
      await loadData()
      setShowEditDialog(false)
    } catch (error) {
      console.error('Error deleting appointment:', error)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const days = view === 'day' ? 1 : 7
    setSelectedDate(prev => 
      direction === 'next' ? addDays(prev, days) : addDays(prev, -days)
    )
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments
      .filter(apt => apt.date === dateStr && apt.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const getWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'scheduled':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'completed':
        return 'bg-gray-100 border-gray-300 text-gray-800'
      case 'no-show':
        return 'bg-red-100 border-red-300 text-red-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'مجدول'
      case 'confirmed': return 'مؤكد'
      case 'completed': return 'مكتمل'
      case 'cancelled': return 'ملغي'
      case 'no-show': return 'لم يحضر'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المواعيد</h1>
          <p className="text-muted-foreground">إدارة مواعيد العيادة</p>
        </div>
        <Button
          onClick={() => setShowNewDialog(true)}
          className="rounded-xl bg-primary hover:bg-primary/90"
        >
            <Plus className="mr-2 h-4 w-4" />
          موعد جديد
        </Button>
      </div>

      {/* Calendar Controls */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate('prev')}
                className="rounded-xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedDate(new Date())}
                className="rounded-xl"
              >
                اليوم
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateDate('next')}
                className="rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

<h2 className="text-lg font-semibold">
                  {view === 'day' 
                    ? (() => {
                        const dayName = format(selectedDate, 'EEEE', { locale: ar })
                        const day = selectedDate.getDate()
                        const month = selectedDate.toLocaleString('ar', { month: 'long' })
                        const year = selectedDate.getFullYear()
                        return `${dayName}، ${day} ${month} ${year}`
                      })()
                    : (() => {
                        const start = getWeekDays()[0]
                        const end = getWeekDays()[6]
                        const startDay = start.getDate()
                        const startMonth = start.toLocaleString('ar', { month: 'long' })
                        const endDay = end.getDate()
                        const endMonth = end.toLocaleString('ar', { month: 'long' })
                        const endYear = end.getFullYear()
                        return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`
                      })()
                  }
                </h2>

            <div className="flex items-center gap-2">
              <Button
                variant={view === 'day' ? 'default' : 'outline'}
                onClick={() => setView('day')}
                className={cn('rounded-xl', view === 'day' && 'bg-primary')}
              >
                يوم
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'outline'}
                onClick={() => setView('week')}
                className={cn('rounded-xl', view === 'week' && 'bg-primary')}
              >
                أسبوع
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {view === 'day' ? (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle>مواعيد اليوم</CardTitle>
            <CardDescription>
              {getAppointmentsForDate(selectedDate).length} مواعيد
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeSlots.map((time) => {
                const apt = getAppointmentsForDate(selectedDate).find(
                  a => a.startTime === time
                )
                return (
                  <div
                    key={time}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-xl border',
                      apt ? getStatusColor(apt.status) : 'bg-muted/30 border-transparent'
                    )}
                  >
                    <div className="w-16 text-sm font-medium text-muted-foreground">
                      {time}
                    </div>
                    {apt ? (
                      <div
                        className="flex-1 flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          setSelectedAppointment(apt)
                          setShowEditDialog(true)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Check className="mr-2 h-4 w-4 text-green-700" />
                          <User className="h-4 w-4" />
                          <div className="mx-3">
                            <p className="font-medium">{apt.patientName}</p>
                            <p className="text-sm opacity-80">{apt.type}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {apt.status === 'scheduled' && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg hover:bg-green-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdateStatus(apt.id, 'confirmed')
                                }}
                              >
                                <Check className="h-4 w-4 text-green-700" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-lg hover:bg-red-200"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdateStatus(apt.id, 'cancelled')
                                }}
                              >
                                <X className="h-4 w-4 text-red-700" />
                              </Button>
                            </>
                          )}
                          {apt.status === 'confirmed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-lg hover:bg-green-200 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleUpdateStatus(apt.id, 'completed')
                              }}
                            >
                              إكمال
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 text-sm text-muted-foreground">
                        متاح
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {getWeekDays().map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-3 text-center border-l first:border-l-0',
                    isSameDay(day, new Date()) && 'bg-primary/10'
                  )}
                >
                  <p className="text-xs text-muted-foreground">
                    {format(day, 'EEEE', { locale: ar })}
                  </p>
                  <p className={cn(
                    'text-lg font-semibold',
                    isSameDay(day, new Date()) && 'text-primary'
                  )}>
                    {format(day, 'd')}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[400px]">
              {getWeekDays().map((day, i) => {
                const dayAppointments = getAppointmentsForDate(day)
                return (
                  <div
                    key={i}
                    className={cn(
                      'p-2 border-l first:border-l-0 space-y-1',
                      isSameDay(day, new Date()) && 'bg-primary/5'
                    )}
                  >
                    {dayAppointments.slice(0, 5).map((apt) => (
                      <div
                        key={apt.id}
                        className={cn(
                          'p-2 rounded-lg text-xs cursor-pointer border',
                          getStatusColor(apt.status)
                        )}
                        onClick={() => {
                          setSelectedAppointment(apt)
                          setShowEditDialog(true)
                        }}
                      >
                        <p className="font-medium truncate">{apt.patientName}</p>
                        <p className="opacity-80">{apt.startTime}</p>
                      </div>
                    ))}
                    {dayAppointments.length > 5 && (
                      <p className="text-xs text-center text-muted-foreground">
                        +{dayAppointments.length - 5} المزيد
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Appointment Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>موعد جديد</DialogTitle>
            <DialogDescription>حجز موعد جديد للمريض</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAppointment} className="space-y-4">
            {overlapError && (
              <Alert variant="destructive" className="rounded-xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{overlapError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>المريض</Label>
              <Select
                value={newAppointment.patientId}
                onValueChange={(v) => setNewAppointment({ ...newAppointment, patientId: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر المريض" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {p.fileNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>التاريخ</Label>
                <Input
                  type="date"
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>الوقت</Label>
                <Select
                  onValueChange={(v) => setNewAppointment({ 
                    ...newAppointment, 
                    startTime: v,
                    endTime: getEndTime(v)
                  })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>نوع الموعد</Label>
              <Select
                value={newAppointment.type}
                onValueChange={(v) => setNewAppointment({ ...newAppointment, type: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                placeholder="أي ملاحظات إضافية..."
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewDialog(false)}
                className="rounded-xl"
                disabled={saving}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-primary hover:bg-primary/90"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حجز الموعد'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الموعد</DialogTitle>
            <DialogDescription>عرض وتعديل تفاصيل الموعد</DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">المريض</p>
                  <p className="font-medium">{selectedAppointment.patientName}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">نوع الموعد</p>
                  <p className="font-medium">{selectedAppointment.type}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-medium">
                    {format(parseISO(selectedAppointment.date), 'd MMMM yyyy', { locale: ar })}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">الوقت</p>
                  <p className="font-medium">
                    {selectedAppointment.startTime} - {selectedAppointment.endTime}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-sm text-muted-foreground">الحالة</p>
                <span className={cn(
                  'inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium',
                  getStatusColor(selectedAppointment.status)
                )}>
                  {getStatusLabel(selectedAppointment.status)}
                </span>
              </div>

              {selectedAppointment.notes && (
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">ملاحظات</p>
                  <p className="mt-1">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedAppointment.status === 'scheduled' && (
                  <>
                    <Button
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'confirmed')}
                      className="rounded-xl bg-green-600 hover:bg-green-700"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      تأكيد
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedAppointment.id, 'no-show')}
                      className="rounded-xl"
                    >
                      لم يحضر
                    </Button>
                  </>
                )}
                {selectedAppointment.status === 'confirmed' && (
                  <Button
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'completed')}
                    className="rounded-xl bg-green-600 hover:bg-green-700"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    إكمال الموعد
                  </Button>
                )}
                {selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'completed' && (
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateStatus(selectedAppointment.id, 'cancelled')}
                    className="rounded-xl"
                  >
                    <X className="mr-2 h-4 w-4" />
                    إلغاء
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="rounded-xl"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AppointmentsContent />
    </Suspense>
  )
}
