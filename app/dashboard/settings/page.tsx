'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import packageJson from '@/package.json'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Settings,
  Users,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Shield,
  User,
  Save,
  AlertCircle,
} from 'lucide-react'
import {
  getSettings,
  updateSettings,
  getAllUsers,
  createUser,
  deleteUser,
  getDatabaseBackupPayload,
  restoreDatabaseBackup,
  type DatabaseBackupPayload,
  type Settings as SettingsType,
  type User as UserType,
} from '@/lib/db'
import { useAuthStore } from '@/lib/auth-store'
import { useToast } from '@/hooks/use-toast'

interface BackupPreview {
  users: number
  patients: number
  appointments: number
  treatments: number
  invoices: number
  inventory: number
  clinicName: string
  fileName: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const APP_VERSION = packageJson.version ?? '0.0.0'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [users, setUsers] = useState<UserType[]>([])
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null)
  const [error, setError] = useState('')
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null)
  const [backupPayload, setBackupPayload] = useState<DatabaseBackupPayload | null>(null)
  const [selectedBackupName, setSelectedBackupName] = useState('')
  const [restorePassword, setRestorePassword] = useState('')
  const [restoreError, setRestoreError] = useState('')
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [exportingBackup, setExportingBackup] = useState(false)
  const [restoreInProgress, setRestoreInProgress] = useState(false)
  const [backupProgress, setBackupProgress] = useState(0)
  const [restoreProgress, setRestoreProgress] = useState(0)

  // New user form
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'receptionist' as 'admin' | 'receptionist',
  })

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [currentUser])

  async function loadData() {
    setLoading(true)
    try {
      const [settingsData, usersData] = await Promise.all([
        getSettings(),
        getAllUsers(),
      ])
      if (settingsData) setSettings(settingsData)
      setUsers(usersData)
    } catch (error) {
      console.error('Error loading settings:', error)
    }
    setLoading(false)
  }

  async function handleSaveSettings() {
    if (!settings) return
    setSaving(true)
    try {
      await updateSettings(settings)
    } catch (error) {
      console.error('Error saving settings:', error)
    }
    setSaving(false)
  }

  function validateBackupPayload(data: unknown, fileName: string): BackupPreview | null {
    if (typeof data !== 'object' || data === null) {
      return null
    }

    const payload = data as Record<string, unknown>
    const tableKeys = ['users', 'patients', 'appointments', 'invoices', 'inventory', 'clinicInfo']
    const hasTables = tableKeys.every((key) => Array.isArray(payload[key]) || key === 'clinicInfo')
    const treatments = Array.isArray(payload.treatments)
      ? payload.treatments
      : Array.isArray(payload.treatmentPlans)
        ? payload.treatmentPlans
        : null

    if (!hasTables || !treatments || typeof payload.clinicInfo !== 'object' || payload.clinicInfo === null) {
      return null
    }

    return {
      users: Array.isArray(payload.users) ? payload.users.length : 0,
      patients: Array.isArray(payload.patients) ? payload.patients.length : 0,
      appointments: Array.isArray(payload.appointments) ? payload.appointments.length : 0,
      treatments: treatments.length,
      invoices: Array.isArray(payload.invoices) ? payload.invoices.length : 0,
      inventory: Array.isArray(payload.inventory) ? payload.inventory.length : 0,
      clinicName: String((payload.clinicInfo as any).clinicName ?? 'نادي الأسنان'),
      fileName,
    }
  }

  async function handleExportBackup() {
    setExportingBackup(true)
    setBackupProgress(10)

    try {
      const payload = await getDatabaseBackupPayload(APP_VERSION)
      setBackupProgress(40)

      const fileData = JSON.stringify(payload, null, 2)
      const blob = new Blob([fileData], { type: 'application/json' })
      const fileName = `sara-backup-${new Date().toISOString().slice(0, 10)}.json`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      setBackupProgress(100)
      toast({ title: 'نجاح', description: 'تم تصدير النسخة الاحتياطية بنجاح' })
    } catch (error) {
      console.error('Backup export failed:', error)
      toast({ title: 'فشل التصدير', description: 'حدث خطأ أثناء إنشاء النسخة الاحتياطية' })
    } finally {
      setTimeout(() => setBackupProgress(0), 400)
      setExportingBackup(false)
    }
  }

  async function handleOpenImportFile() {
    fileInputRef.current?.click()
  }

  async function handleBackupFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedBackupName(file.name)
    setBackupPreview(null)
    setBackupPayload(null)
    setRestoreError('')
    setRestorePassword('')

    try {
      const fileText = await file.text()
      const parsed = JSON.parse(fileText) as DatabaseBackupPayload
      const preview = validateBackupPayload(parsed, file.name)

      if (!preview) {
        throw new Error('تنسيق الملف غير صالح، يرجى اختيار نسخة احتياطية صحيحة')
      }

      setBackupPreview(preview)
      setBackupPayload(parsed)
      setRestoreDialogOpen(true)
    } catch (error) {
      console.error('Backup file validation failed:', error)
      toast({ title: 'فشل الاستيراد', description: 'الملف غير صالح أو ليس نسخة احتياطية صحيحة' })
      event.target.value = ''
      setSelectedBackupName('')
    }
  }

  async function handleRestoreBackup() {
    if (!backupPayload) {
      setRestoreError('الرجاء تحميل ملف النسخة الاحتياطية أولاً')
      return
    }

    if (!restorePassword) {
      setRestoreError('الرجاء إدخال كلمة مرور المدير')
      return
    }

    if (currentUser?.password !== restorePassword) {
      setRestoreError('كلمة المرور غير صحيحة')
      return
    }

    setRestoreError('')
    setRestoreInProgress(true)
    setRestoreProgress(15)

    try {
      await restoreDatabaseBackup(backupPayload)
      setRestoreProgress(80)
      toast({ title: 'نجاح', description: 'تم استعادة النسخة الاحتياطية بنجاح' })
      setRestoreProgress(100)
      setTimeout(() => {
        window.location.reload()
      }, 1200)
    } catch (error) {
      console.error('Restore failed:', error)
      toast({ title: 'فشل الاستعادة', description: 'حدث خطأ أثناء استعادة البيانات' })
    } finally {
      setTimeout(() => setRestoreProgress(0), 400)
      setRestoreInProgress(false)
    }
  }

  async function handleCreateUser() {
    if (!newUser.username || !newUser.password || !newUser.name) {
      setError('جميع الحقول مطلوبة')
      return
    }

    try {
      await createUser({
        ...newUser,
        mustChangePassword: true,
      })
      setShowUserDialog(false)
      setNewUser({ username: '', password: '', name: '', role: 'receptionist' })
      setError('')
      loadData()
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('حدث خطأ أثناء إنشاء المستخدم')
      }
    }
  }

  async function handleDeleteUser() {
    if (!userToDelete) return

    try {
      await deleteUser(userToDelete.id)
      setShowDeleteDialog(false)
      setUserToDelete(null)
      loadData()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">غير مصرح</h2>
          <p className="text-muted-foreground">هذه الصفحة متاحة للمدراء فقط</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleBackupFileChange}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground">إدارة إعدادات العيادة والمستخدمين</p>
      </div>

      {/* Clinic Settings */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            معلومات العيادة
          </CardTitle>
          <CardDescription>المعلومات الأساسية التي تظهر في الفواتير والتقارير</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>اسم العيادة</Label>
              <Input
                value={settings?.clinicName || ''}
                onChange={(e) =>
                  setSettings(prev => prev ? { ...prev, clinicName: e.target.value } : null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={settings?.clinicPhone || ''}
                onChange={(e) =>
                  setSettings(prev => prev ? { ...prev, clinicPhone: e.target.value } : null)
                }
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>العنوان</Label>
              <Input
                value={settings?.clinicAddress || ''}
                onChange={(e) =>
                  setSettings(prev => prev ? { ...prev, clinicAddress: e.target.value } : null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={settings?.clinicEmail || ''}
                onChange={(e) =>
                  setSettings(prev => prev ? { ...prev, clinicEmail: e.target.value } : null)
                }
                dir="ltr"
                className="text-left"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="mb-4 font-medium">ساعات العمل والمواعيد</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>بداية الدوام</Label>
                <Input
                  type="time"
                  value={settings?.workingHoursStart || '09:00'}
                  onChange={(e) =>
                    setSettings(prev => prev ? { ...prev, workingHoursStart: e.target.value } : null)
                  }
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>نهاية الدوام</Label>
                <Input
                  type="time"
                  value={settings?.workingHoursEnd || '21:00'}
                  onChange={(e) =>
                    setSettings(prev => prev ? { ...prev, workingHoursEnd: e.target.value } : null)
                  }
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>مدة الموعد (دقيقة)</Label>
                <Input
                  type="number"
                  value={settings?.appointmentDuration || 30}
                  onChange={(e) =>
                    setSettings(prev => prev ? { ...prev, appointmentDuration: parseInt(e.target.value) } : null)
                  }
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                النسخ الاحتياطي والاستعادة
              </CardTitle>
              <CardDescription>حفظ واستعادة بيانات العيادة بالكامل بأمان</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="bg-[#F2ACA5] text-white hover:bg-[#e5968f]"
                onClick={handleExportBackup}
                disabled={exportingBackup}
              >
                {exportingBackup ? 'جاري التصدير...' : 'تصدير النسخة الاحتياطية'}
              </Button>
              <Button
                className="bg-[#F2ACA5] text-white hover:bg-[#e5968f]"
                onClick={handleOpenImportFile}
              >
                استيراد نسخة احتياطية
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-muted p-4">
              <p className="mb-3 text-sm font-medium">تقدم التصدير</p>
              <Progress value={backupProgress} className="h-2 rounded-full" />
              <p className="mt-3 text-sm text-muted-foreground">
                {backupProgress > 0
                  ? `جاري المعالجة ${backupProgress}%`
                  : 'اضغط زر التصدير لتحميل النسخة الاحتياطية'}
              </p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-muted p-4">
              <p className="mb-3 text-sm font-medium">استعادة النسخة الاحتياطية</p>
              <Progress value={restoreProgress} className="h-2 rounded-full" />
              <p className="mt-3 text-sm text-muted-foreground">
                {restoreProgress > 0
                  ? `جاري الاستعادة ${restoreProgress}%`
                  : 'حدد ملف نسخة احتياطية لمعاينته قبل الاستعادة'}
              </p>
            </div>
          </div>

          {backupPreview && (
            <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>سيتم استبدال جميع البيانات الحالية</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">اسم العيادة في النسخة</p>
                  <p className="mt-1 font-semibold">{backupPreview.clinicName}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">اسم الملف</p>
                  <p className="mt-1 font-semibold">{backupPreview.fileName}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">المستخدمون</p>
                  <p className="mt-1 font-semibold">{backupPreview.users}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">المرضى</p>
                  <p className="mt-1 font-semibold">{backupPreview.patients}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">المواعيد</p>
                  <p className="mt-1 font-semibold">{backupPreview.appointments}</p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground">العلاجات</p>
                  <p className="mt-1 font-semibold">{backupPreview.treatments}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                إدارة المستخدمين
              </CardTitle>
              <CardDescription>إضافة وإدارة مستخدمي النظام</CardDescription>
            </div>
            <Button onClick={() => setShowUserDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              إضافة مستخدم
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>الصلاحية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-24">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell dir="ltr" className="text-left">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="mr-1 h-3 w-3" />
                          مدير
                        </>
                      ) : (
                        <>
                          <User className="mr-1 h-3 w-3" />
                          موظف استقبال
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.mustChangePassword ? (
                      <Badge variant="outline" className="text-orange-600">
                        يتطلب تغيير كلمة المرور
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600">
                        نشط
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setUserToDelete(user)
                          setShowDeleteDialog(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            <DialogDescription>
              سيُطلب من المستخدم الجديد تغيير كلمة المرور عند أول تسجيل دخول
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                placeholder="أدخل الاسم الكامل"
              />
            </div>

            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input
                value={newUser.username}
                onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                placeholder="أدخل اسم المستخدم"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label>كلمة المرور المؤقتة</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                placeholder="أدخل كلمة المرور"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: 'admin' | 'receptionist') =>
                  setNewUser(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receptionist">موظف استقبال</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateUser}>إضافة المستخدم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد استعادة النسخة الاحتياطية</DialogTitle>
            <DialogDescription>
              سيؤدي هذا الإجراء إلى استبدال جميع البيانات الحالية بالبيانات الموجودة في النسخة الاحتياطية.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>سيتم استبدال جميع البيانات الحالية</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>كلمة مرور المدير</Label>
              <Input
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="أدخل كلمة المرور لتأكيد الاستعادة"
                dir="ltr"
                className="text-left"
              />
            </div>

            {restoreError ? (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {restoreError}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              className="bg-[#F2ACA5] text-white hover:bg-[#e5968f]"
              onClick={handleRestoreBackup}
              disabled={restoreInProgress}
            >
              {restoreInProgress ? 'جاري الاستعادة...' : 'استعادة النسخة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المستخدم "{userToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
