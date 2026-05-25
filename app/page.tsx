'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { authenticateUser, initializeDB } from '@/lib/db'
import { useAuthStore } from '@/lib/auth-store'

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const init = async () => {
      await initializeDB()
      setInitializing(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await authenticateUser(username, password)
      if (user) {
        login(user)
        if (user.mustChangePassword) {
          router.push('/change-password')
        } else {
          router.push('/dashboard')
        }
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة')
      }
    } catch {
      setError('حدث خطأ أثناء تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <Image
            src="/LOGO.PNG"
            alt="Sara Dental Clinic Logo"
            width={120}
            height={120}
            className="mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-foreground">Sara Dental Clinic</h1>
          <p className="text-muted-foreground mt-1">د. سارة وسوف</p>
        </div>

        <Card className="rounded-2xl shadow-lg border-0 bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل بياناتك للدخول إلى النظام</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="rounded-xl h-11"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="rounded-xl h-11 pl-10"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          نظام إدارة Sara Dental Clinic
        </p>
      </div>
    </div>
  )
}
