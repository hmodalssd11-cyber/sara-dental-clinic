'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { 
  ArrowRight, 
  User, 
  Phone, 
  Mail,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  Edit,
  Loader2,
  ClipboardList,
  Receipt,
} from 'lucide-react'
import { 
  getPatient, 
  updatePatient,
  updateToothCondition,
  getAppointmentsByPatient,
  getTreatmentPlansByPatient,
  getInvoicesByPatient,
  type Patient,
  type Appointment,
  type TreatmentPlan,
  type Invoice,
  type ToothCondition,
} from '@/lib/db'
import { DentalChartComponent } from '@/components/dental-chart'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import Link from 'next/link'

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Patient>>({})

  useEffect(() => {
    loadPatientData()
  }, [id])

  const loadPatientData = async () => {
    try {
      const [patientData, appointmentsData, plansData, invoicesData] = await Promise.all([
        getPatient(id),
        getAppointmentsByPatient(id),
        getTreatmentPlansByPatient(id),
        getInvoicesByPatient(id),
      ])
      
      if (patientData) {
        setPatient(patientData)
        setEditForm(patientData)
      }
      setAppointments(appointmentsData.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ))
      setTreatmentPlans(plansData)
      setInvoices(invoicesData)
    } catch (error) {
      console.error('Error loading patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient) return
    setSaving(true)

    try {
      const updated = await updatePatient(patient.id, editForm)
      if (updated) {
        setPatient(updated)
        setShowEditDialog(false)
      }
    } catch (error) {
      console.error('Error updating patient:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTooth = async (toothNumber: string, condition: ToothCondition) => {
    if (!patient) return
    try {
      const updated = await updateToothCondition(patient.id, toothNumber, condition)
      if (updated) {
        setPatient(updated)
      }
    } catch (error) {
      console.error('Error updating tooth:', error)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const day = date.getDate()
      const month = date.toLocaleString('ar', { month: 'long' })
      const year = date.getFullYear()
      return `${day} ${month} ${year}`
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US') + ' ل.س'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'مجدول',
      confirmed: 'مؤكد',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      'no-show': 'لم يحضر',
      active: 'نشط',
      draft: 'مسودة',
      pending: 'معلق',
      paid: 'مدفوع',
      partial: 'جزئي',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-700'
      case 'confirmed':
      case 'active':
        return 'bg-blue-100 text-blue-700'
      case 'scheduled':
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      case 'partial':
        return 'bg-orange-100 text-orange-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">المريض غير موجود</p>
        <Button onClick={() => router.push('/dashboard/patients')} className="mt-4 rounded-xl">
          العودة للمرضى
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/patients')}
          className="rounded-xl"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{patient.name}</h1>
          <p className="text-muted-foreground">{patient.fileNumber}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowEditDialog(true)}
          className="rounded-xl"
        >
            <Edit className="mr-2 h-4 w-4" />
          تعديل
        </Button>
      </div>

      {/* Patient Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الهاتف</p>
                <p className="font-medium" dir="ltr">{patient.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الميلاد</p>
                <p className="font-medium">{formatDate(patient.dateOfBirth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 p-2">
                <User className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الجنس</p>
                <p className="font-medium">{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 p-2">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                <p className="font-medium">{formatDate(patient.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dental-chart" className="space-y-4">
        <TabsList className="rounded-xl bg-muted p-1">
          <TabsTrigger value="dental-chart" className="rounded-lg">خريطة الأسنان</TabsTrigger>
          <TabsTrigger value="medical" className="rounded-lg">المعلومات الطبية</TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-lg">المواعيد</TabsTrigger>
          <TabsTrigger value="treatments" className="rounded-lg">خطط العلاج</TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-lg">الفواتير</TabsTrigger>
        </TabsList>

        {/* Dental Chart Tab */}
        <TabsContent value="dental-chart">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle>خريطة الأسنان (FDI)</CardTitle>
              <CardDescription>اضغط على أي سن لتعديل حالته</CardDescription>
            </CardHeader>
            <CardContent>
              <DentalChartComponent
                chart={patient.dentalChart}
                onUpdateTooth={handleUpdateTooth}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Info Tab */}
        <TabsContent value="medical">
          <div className="grid gap-4 md:grid-cols-2">
            {patient.medicalHistory && (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    التاريخ الطبي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{patient.medicalHistory}</p>
                </CardContent>
              </Card>
            )}

            {patient.allergies && (
              <Card className="rounded-2xl border-0 shadow-sm border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-5 w-5" />
                    الحساسية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-orange-700 whitespace-pre-wrap">{patient.allergies}</p>
                </CardContent>
              </Card>
            )}

            {patient.email && (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    البريد الإلكتروني
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground" dir="ltr">{patient.email}</p>
                </CardContent>
              </Card>
            )}

            {patient.address && (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    العنوان
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{patient.address}</p>
                </CardContent>
              </Card>
            )}

            {patient.notes && (
              <Card className="rounded-2xl border-0 shadow-sm md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">ملاحظات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{patient.notes}</p>
                </CardContent>
              </Card>
            )}

            {!patient.medicalHistory && !patient.allergies && !patient.email && !patient.address && !patient.notes && (
              <Card className="rounded-2xl border-0 shadow-sm md:col-span-2">
                <CardContent className="py-12 text-center text-muted-foreground">
                  لا توجد معلومات طبية إضافية
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>المواعيد</CardTitle>
                <CardDescription>جميع مواعيد المريض</CardDescription>
              </div>
              <Link href={`/dashboard/appointments?patient=${patient.id}`}>
                <Button className="rounded-xl bg-primary hover:bg-primary/90">
                  حجز موعد جديد
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد مواعيد سابقة
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-primary/10 p-2">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{apt.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(apt.date)} - {apt.startTime}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {getStatusLabel(apt.status)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatments Tab */}
        <TabsContent value="treatments">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>خطط العلاج</CardTitle>
                <CardDescription>خطط العلاج الخاصة بالمريض</CardDescription>
              </div>
                <Link href={`/dashboard/treatments?patient=${patient.id}`}>
                <Button className="rounded-xl bg-primary hover:bg-primary/90">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  خطة جديدة
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {treatmentPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد خطط علاج
                </div>
              ) : (
                <div className="space-y-3">
                  {treatmentPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{plan.treatments.length} علاجات</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(plan.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(plan.totalCost)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                          {getStatusLabel(plan.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>الفواتير</CardTitle>
                <CardDescription>فواتير المريض</CardDescription>
              </div>
                <Link href={`/dashboard/invoices?patient=${patient.id}`}>
                <Button className="rounded-xl bg-primary hover:bg-primary/90">
                  <Receipt className="mr-2 h-4 w-4" />
                  فاتورة جديدة
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد فواتير
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.total)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {getStatusLabel(invoice.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المريض</DialogTitle>
            <DialogDescription>تحديث معلومات المريض</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePatient} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">الاسم الكامل</Label>
                <Input
                  id="edit-name"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">رقم الهاتف</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="rounded-xl"
                  dir="ltr"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="rounded-xl"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dateOfBirth">تاريخ الميلاد</Label>
                <Input
                  id="edit-dateOfBirth"
                  type="date"
                  value={editForm.dateOfBirth || ''}
                  onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-gender">الجنس</Label>
                <Select
                  value={editForm.gender}
                  onValueChange={(v: 'male' | 'female') => setEditForm({ ...editForm, gender: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">العنوان</Label>
                <Input
                  id="edit-address"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-medicalHistory">التاريخ الطبي</Label>
              <Textarea
                id="edit-medicalHistory"
                value={editForm.medicalHistory || ''}
                onChange={(e) => setEditForm({ ...editForm, medicalHistory: e.target.value })}
                className="rounded-xl min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-allergies">الحساسية</Label>
              <Textarea
                id="edit-allergies"
                value={editForm.allergies || ''}
                onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                className="rounded-xl min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">ملاحظات</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes || ''}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="rounded-xl min-h-[60px]"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
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
                  'حفظ التعديلات'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
