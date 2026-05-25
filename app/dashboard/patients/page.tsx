'use client'

import { useState, useEffect } from 'react'
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
  Search, 
  Plus, 
  User, 
  Phone, 
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react'
import { 
  getAllPatients, 
  createPatient, 
  searchPatients,
  type Patient 
} from '@/lib/db'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import Link from 'next/link'

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // New patient form
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female',
    address: '',
    medicalHistory: '',
    allergies: '',
    notes: '',
  })

  useEffect(() => {
    loadPatients()
  }, [])

  useEffect(() => {
    const search = async () => {
      if (searchQuery.trim()) {
        const results = await searchPatients(searchQuery)
        setFilteredPatients(results)
      } else {
        setFilteredPatients(patients)
      }
    }
    search()
  }, [searchQuery, patients])

  const loadPatients = async () => {
    try {
      const data = await getAllPatients()
      const sorted = data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setPatients(sorted)
      setFilteredPatients(sorted)
    } catch (error) {
      console.error('Error loading patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await createPatient(newPatient)
      await loadPatients()
      setShowNewPatientDialog(false)
      setNewPatient({
        name: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        gender: 'male',
        address: '',
        medicalHistory: '',
        allergies: '',
        notes: '',
      })
    } catch (error) {
      console.error('Error creating patient:', error)
    } finally {
      setSaving(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">المرضى</h1>
          <p className="text-muted-foreground">إدارة سجلات المرضى</p>
        </div>
        <Button
          onClick={() => setShowNewPatientDialog(true)}
          className="rounded-xl bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          إضافة مريض جديد
        </Button>
      </div>

      {/* Search */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث بالاسم أو رقم الهاتف أو رقم الملف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 rounded-xl h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPatients.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد مرضى مسجلين بعد'}
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <Link key={patient.id} href={`/dashboard/patients/${patient.id}`}>
              <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
                      {patient.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{patient.name}</h3>
                      <p className="text-sm text-muted-foreground">{patient.fileNumber}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span dir="ltr">{patient.phone}</span>
                    </div>
                    {patient.dateOfBirth && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(patient.dateOfBirth)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* New Patient Dialog */}
      <Dialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>إضافة مريض جديد</DialogTitle>
            <DialogDescription>أدخل بيانات المريض الجديد</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePatient} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل *</Label>
                <Input
                  id="name"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  placeholder="أدخل اسم المريض"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  placeholder="09XXXXXXXX"
                  className="rounded-xl"
                  dir="ltr"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  placeholder="example@email.com"
                  className="rounded-xl"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">تاريخ الميلاد *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={newPatient.dateOfBirth}
                  onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                  className="rounded-xl"
                  dir="ltr"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">الجنس *</Label>
                <Select
                  value={newPatient.gender}
                  onValueChange={(value: 'male' | 'female') => 
                    setNewPatient({ ...newPatient, gender: value })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="اختر الجنس" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  placeholder="أدخل العنوان"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicalHistory">التاريخ الطبي</Label>
              <Textarea
                id="medicalHistory"
                value={newPatient.medicalHistory}
                onChange={(e) => setNewPatient({ ...newPatient, medicalHistory: e.target.value })}
                placeholder="أي أمراض مزمنة أو حالات طبية سابقة..."
                className="rounded-xl min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">الحساسية</Label>
              <Textarea
                id="allergies"
                value={newPatient.allergies}
                onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                placeholder="أي حساسية معروفة من أدوية أو مواد..."
                className="rounded-xl min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات إضافية</Label>
              <Textarea
                id="notes"
                value={newPatient.notes}
                onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                placeholder="أي ملاحظات إضافية..."
                className="rounded-xl min-h-[60px]"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewPatientDialog(false)}
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
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    حفظ المريض
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
