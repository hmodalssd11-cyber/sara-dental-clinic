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
import { 
  Plus, 
  Loader2,
  ClipboardList,
  Trash2,
  Check,
  Edit,
} from 'lucide-react'
import { 
  getAllTreatmentPlans, 
  createTreatmentPlan,
  updateTreatmentPlan,
  getAllPatients,
  type TreatmentPlan,
  type Treatment,
  type Patient,
} from '@/lib/db'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const treatmentTypes = [
  { name: 'كشف وتشخيص', cost: 100 },
  { name: 'تنظيف الأسنان', cost: 200 },
  { name: 'حشوة بيضاء', cost: 300 },
  { name: 'حشوة فضية', cost: 200 },
  { name: 'خلع عادي', cost: 150 },
  { name: 'خلع جراحي', cost: 400 },
  { name: 'علاج عصب أمامي', cost: 600 },
  { name: 'علاج عصب خلفي', cost: 800 },
  { name: 'تاج زيركون', cost: 1500 },
  { name: 'تاج معدني', cost: 800 },
  { name: 'جسر ثابت (للسن)', cost: 1200 },
  { name: 'طقم كامل', cost: 3000 },
  { name: 'طقم جزئي', cost: 2000 },
  { name: 'تقويم أسنان', cost: 8000 },
  { name: 'تبييض أسنان', cost: 1000 },
  { name: 'أشعة بانوراما', cost: 150 },
  { name: 'أشعة سيفالومتري', cost: 200 },
]

function TreatmentsContent() {
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patient')
  
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null)
  const [saving, setSaving] = useState(false)

  const [newPlan, setNewPlan] = useState({
    patientId: preselectedPatientId || '',
    treatments: [] as Treatment[],
    notes: '',
  })

  const [newTreatment, setNewTreatment] = useState({
    name: '',
    cost: 0,
    toothNumber: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (preselectedPatientId) {
      setNewPlan(prev => ({ ...prev, patientId: preselectedPatientId }))
      setShowNewDialog(true)
    }
  }, [preselectedPatientId])

  const loadData = async () => {
    try {
      const [plansData, patientsData] = await Promise.all([
        getAllTreatmentPlans(),
        getAllPatients(),
      ])
      setTreatmentPlans(plansData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
      setPatients(patientsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTreatment = () => {
    if (!newTreatment.name) return

    const treatment: Treatment = {
      id: crypto.randomUUID(),
      name: newTreatment.name,
      description: newTreatment.description || undefined,
      cost: newTreatment.cost,
      toothNumber: newTreatment.toothNumber || undefined,
      status: 'planned',
    }

    setNewPlan(prev => ({
      ...prev,
      treatments: [...prev.treatments, treatment],
    }))

    setNewTreatment({ name: '', cost: 0, toothNumber: '', description: '' })
  }

  const handleRemoveTreatment = (id: string) => {
    setNewPlan(prev => ({
      ...prev,
      treatments: prev.treatments.filter(t => t.id !== id),
    }))
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPlan.treatments.length === 0) return
    setSaving(true)

    try {
      const patient = patients.find(p => p.id === newPlan.patientId)
      if (!patient) return

      const totalCost = newPlan.treatments.reduce((sum, t) => sum + t.cost, 0)

      await createTreatmentPlan({
        patientId: newPlan.patientId,
        patientName: patient.name,
        treatments: newPlan.treatments,
        totalCost,
        paidAmount: 0,
        status: 'active',
        notes: newPlan.notes || undefined,
      })

      await loadData()
      setShowNewDialog(false)
      setNewPlan({ patientId: '', treatments: [], notes: '' })
    } catch (error) {
      console.error('Error creating plan:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTreatmentStatus = async (planId: string, treatmentId: string, status: Treatment['status']) => {
    const plan = treatmentPlans.find(p => p.id === planId)
    if (!plan) return

    const updatedTreatments = plan.treatments.map(t =>
      t.id === treatmentId 
        ? { ...t, status, completedDate: status === 'completed' ? new Date().toISOString() : undefined }
        : t
    )

    const allCompleted = updatedTreatments.every(t => t.status === 'completed')

    await updateTreatmentPlan(planId, {
      treatments: updatedTreatments,
      status: allCompleted ? 'completed' : 'active',
    })

    await loadData()
    if (selectedPlan?.id === planId) {
      setSelectedPlan(prev => prev ? { ...prev, treatments: updatedTreatments } : null)
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US') + ' ل.س'
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'active':
      case 'in-progress':
        return 'bg-blue-100 text-blue-700'
      case 'planned':
        return 'bg-yellow-100 text-yellow-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'نشط'
      case 'completed': return 'مكتمل'
      case 'cancelled': return 'ملغي'
      case 'planned': return 'مخطط'
      case 'in-progress': return 'جاري'
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
          <h1 className="text-2xl font-bold text-foreground">خطط العلاج</h1>
          <p className="text-muted-foreground">إدارة خطط علاج المرضى</p>
        </div>
        <Button
          onClick={() => setShowNewDialog(true)}
          className="rounded-xl bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          خطة علاج جديدة
        </Button>
      </div>

      {/* Treatment Plans List */}
      <div className="grid gap-4">
        {treatmentPlans.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد خطط علاج بعد
            </CardContent>
          </Card>
        ) : (
          treatmentPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedPlan(plan)
                setShowEditDialog(true)
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{plan.patientName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.treatments.length} علاجات - {formatDate(plan.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(plan.totalCost)}</p>
                    <span className={cn(
                      'inline-block px-2 py-1 rounded-full text-xs font-medium',
                      getStatusColor(plan.status)
                    )}>
                      {getStatusLabel(plan.status)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">التقدم</span>
                    <span className="font-medium">
                      {plan.treatments.filter(t => t.status === 'completed').length}/{plan.treatments.length}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ 
                        width: `${(plan.treatments.filter(t => t.status === 'completed').length / plan.treatments.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New Plan Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>خطة علاج جديدة</DialogTitle>
            <DialogDescription>إنشاء خطة علاج للمريض</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="space-y-2">
              <Label>المريض</Label>
              <Select
                value={newPlan.patientId}
                onValueChange={(v) => setNewPlan({ ...newPlan, patientId: v })}
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

            {/* Add Treatment */}
            <Card className="rounded-xl border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">إضافة علاج</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>نوع العلاج</Label>
                    <Select
                      value={newTreatment.name}
                      onValueChange={(v) => {
                        const type = treatmentTypes.find(t => t.name === v)
                        setNewTreatment({ 
                          ...newTreatment, 
                          name: v, 
                          cost: type?.cost || 0 
                        })
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="اختر العلاج" />
                      </SelectTrigger>
                      <SelectContent>
                        {treatmentTypes.map((t) => (
                          <SelectItem key={t.name} value={t.name}>
                            {t.name} - {formatCurrency(t.cost)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>رقم السن (اختياري)</Label>
                    <Input
                      value={newTreatment.toothNumber}
                      onChange={(e) => setNewTreatment({ ...newTreatment, toothNumber: e.target.value })}
                      placeholder="مثال: 16"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>التكلفة</Label>
                    <Input
                      type="number"
                      value={newTreatment.cost}
                      onChange={(e) => setNewTreatment({ ...newTreatment, cost: Number(e.target.value) })}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={handleAddTreatment}
                          className="rounded-xl w-full"
                          disabled={!newTreatment.name}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          إضافة
                        </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Treatments List */}
            {newPlan.treatments.length > 0 && (
              <div className="space-y-2">
                <Label>العلاجات المضافة</Label>
                <div className="space-y-2">
                  {newPlan.treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{treatment.name}</p>
                        {treatment.toothNumber && (
                          <p className="text-sm text-muted-foreground">سن رقم {treatment.toothNumber}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(treatment.cost)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTreatment(treatment.id)}
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between p-3 rounded-xl bg-primary/10 font-bold">
                    <span>الإجمالي</span>
                    <span>{formatCurrency(newPlan.treatments.reduce((sum, t) => sum + t.cost, 0))}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={newPlan.notes}
                onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
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
                disabled={saving || newPlan.treatments.length === 0 || !newPlan.patientId}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'إنشاء الخطة'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View/Edit Plan Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل خطة العلاج</DialogTitle>
            <DialogDescription>
              {selectedPlan?.patientName} - {selectedPlan && formatDate(selectedPlan.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">إجمالي التكلفة</p>
                  <p className="font-bold text-lg">{formatCurrency(selectedPlan.totalCost)}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <span className={cn(
                    'inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium',
                    getStatusColor(selectedPlan.status)
                  )}>
                    {getStatusLabel(selectedPlan.status)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>العلاجات</Label>
                <div className="space-y-2">
                  {selectedPlan.treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border',
                        treatment.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {treatment.status === 'completed' ? (
                          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <Check className="h-4 w-4 text-green-700" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{treatment.name}</p>
                          {treatment.toothNumber && (
                            <p className="text-sm text-muted-foreground">سن رقم {treatment.toothNumber}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(treatment.cost)}</span>
                        {treatment.status !== 'completed' && selectedPlan.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateTreatmentStatus(selectedPlan.id, treatment.id, 'completed')}
                            className="rounded-lg"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            إكمال
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPlan.notes && (
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">ملاحظات</p>
                  <p className="mt-1">{selectedPlan.notes}</p>
                </div>
              )}
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

export default function TreatmentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <TreatmentsContent />
    </Suspense>
  )
}
