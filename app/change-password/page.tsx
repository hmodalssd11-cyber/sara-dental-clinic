'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { updateUserPassword } from '@/lib/db'
import { useAuthStore } from '@/lib/auth-store'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, updateUser, isAuthenticated } = useAuthStore()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    } else if (user && !user.mustChangePassword) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, user, router])

  const validatePassword = (password: string) => {
    return password.length >= 6
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validatePassword(newPassword)) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('كلمات المرور غير متطابقة')
      return
    }

    if (user && newPassword === 'admin123') {
      setError('لا يمكنك استخدام كلمة المرور الافتراضية')
      return
    }

    setLoading(true)

    try {
      if (user) {
        await updateUserPassword(user.id, newPassword)
        updateUser({ mustChangePassword: false, password: newPassword })
        router.push('/dashboard')
      }
    } catch {
      setError('حدث خطأ أثناء تغيير كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">تغيير كلمة المرور</h1>
          <p className="text-muted-foreground mt-1">يجب تغيير كلمة المرور الافتراضية</p>
        </div>

        <Card className="rounded-2xl shadow-lg border-0 bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">كلمة مرور جديدة</CardTitle>
            <CardDescription>أدخل كلمة مرور قوية وآمنة</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                    className="rounded-xl h-11 pr-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">6 أحرف على الأقل</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  className="rounded-xl h-11"
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ كلمة المرور'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
