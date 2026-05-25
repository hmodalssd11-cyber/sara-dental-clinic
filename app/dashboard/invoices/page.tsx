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
  Receipt,
  Trash2,
  Download,
  CreditCard,
} from 'lucide-react'
import { 
  getAllInvoices, 
  createInvoice,
  updateInvoice,
  getAllPatients,
  getTreatmentPlansByPatient,
  getSettings,
  type Invoice,
  type InvoiceItem,
  type Patient,
  type TreatmentPlan,
  type Settings,
} from '@/lib/db'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { jsPDF } from 'jspdf'

function InvoicesContent() {
  const searchParams = useSearchParams()
  const preselectedPatientId = searchParams.get('patient')
  
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [saving, setSaving] = useState(false)
  const [patientPlans, setPatientPlans] = useState<TreatmentPlan[]>([])

  const [newInvoice, setNewInvoice] = useState({
    patientId: preselectedPatientId || '',
    treatmentPlanId: '',
    items: [] as InvoiceItem[],
    discount: 0,
    tax: 0,
    notes: '',
  })

  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0,
  })

  const [paymentAmount, setPaymentAmount] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (preselectedPatientId) {
      setNewInvoice(prev => ({ ...prev, patientId: preselectedPatientId }))
      loadPatientPlans(preselectedPatientId)
      setShowNewDialog(true)
    }
  }, [preselectedPatientId])

  const loadData = async () => {
    try {
      const [invoicesData, patientsData, settingsData] = await Promise.all([
        getAllInvoices(),
        getAllPatients(),
        getSettings(),
      ])
      setInvoices(invoicesData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
      setPatients(patientsData)
      setSettings(settingsData || null)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPatientPlans = async (patientId: string) => {
    const plans = await getTreatmentPlansByPatient(patientId)
    setPatientPlans(plans.filter(p => p.status === 'active'))
  }

  const handlePatientChange = async (patientId: string) => {
    setNewInvoice(prev => ({ ...prev, patientId, treatmentPlanId: '', items: [] }))
    await loadPatientPlans(patientId)
  }

  const handlePlanChange = (planId: string) => {
    const plan = patientPlans.find(p => p.id === planId)
    if (plan) {
      const items: InvoiceItem[] = plan.treatments
        .filter(t => t.status !== 'completed')
        .map(t => ({
          description: t.name + (t.toothNumber ? ` (سن ${t.toothNumber})` : ''),
          quantity: 1,
          unitPrice: t.cost,
          total: t.cost,
        }))
      setNewInvoice(prev => ({ ...prev, treatmentPlanId: planId, items }))
    }
  }

  const handleAddItem = () => {
    if (!newItem.description || newItem.unitPrice <= 0) return

    const item: InvoiceItem = {
      description: newItem.description,
      quantity: newItem.quantity,
      unitPrice: newItem.unitPrice,
      total: newItem.quantity * newItem.unitPrice,
    }

    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, item],
    }))

    setNewItem({ description: '', quantity: 1, unitPrice: 0 })
  }

  const handleRemoveItem = (index: number) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const calculateTotals = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => sum + item.total, 0)
    const discountAmount = (subtotal * newInvoice.discount) / 100
    const taxableAmount = subtotal - discountAmount
    const taxAmount = (taxableAmount * newInvoice.tax) / 100
    const total = taxableAmount + taxAmount
    return { subtotal, discountAmount, taxAmount, total }
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newInvoice.items.length === 0) return
    setSaving(true)

    try {
      const patient = patients.find(p => p.id === newInvoice.patientId)
      if (!patient) return

      const { subtotal, total } = calculateTotals()

      await createInvoice({
        patientId: newInvoice.patientId,
        patientName: patient.name,
        treatmentPlanId: newInvoice.treatmentPlanId || undefined,
        items: newInvoice.items,
        subtotal,
        discount: newInvoice.discount,
        tax: newInvoice.tax,
        total,
        paidAmount: 0,
        status: 'pending',
        notes: newInvoice.notes || undefined,
      })

      await loadData()
      setShowNewDialog(false)
      setNewInvoice({ patientId: '', treatmentPlanId: '', items: [], discount: 0, tax: 0, notes: '' })
      setPatientPlans([])
    } catch (error) {
      console.error('Error creating invoice:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddPayment = async () => {
    if (!selectedInvoice || paymentAmount <= 0) return

    const newPaidAmount = selectedInvoice.paidAmount + paymentAmount
    const newStatus = newPaidAmount >= selectedInvoice.total ? 'paid' : 'partial'

    await updateInvoice(selectedInvoice.id, {
      paidAmount: newPaidAmount,
      status: newStatus,
    })

    await loadData()
    setShowPaymentDialog(false)
    setPaymentAmount(0)
    setSelectedInvoice(null)
  }

  const generatePDF = async (invoice: Invoice) => {
    // Ensure Cairo font is loaded (Google Fonts) so html2canvas renders Arabic correctly
    const cairoHref = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap'
    if (!document.querySelector(`link[href="${cairoHref}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = cairoHref
      document.head.appendChild(link)
    }
    try {
      await (document as any).fonts.load('16px Cairo')
      await (document as any).fonts.ready
    } catch (e) {
      // ignore font loading errors and continue
    }
    // Use html rendering so the browser can render Arabic properly (shaping & RTL)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Build simple HTML markup for the invoice and render it via jsPDF.html
    const container = document.createElement('div')
    container.setAttribute('dir', 'rtl')
    // Reset inherited styles to avoid parsing site CSS (eg. `lab()` colors)
    container.style.cssText = 'all: initial; direction: rtl; width: 790px; padding: 20px; font-family: "Cairo", sans-serif; color: #000; background: #fff; font-size: 12px;'
    container.innerHTML = `
      <div style="text-align:center; color:#f2aca5; font-size:24px; font-weight:700;">Sara Dental Clinic</div>
      <div style="text-align:center; color:#6b7280; font-size:12px; margin-top:4px;">${settings?.clinicAddress || 'Damascus, Syria'}</div>
      <div style="text-align:center; color:#6b7280; font-size:12px; margin-bottom:12px;">${settings?.clinicPhone || '09XXXXXXXX'}</div>
      <div style="margin-top:8px;">
        <div style="font-size:14px; font-weight:700;">فاتورة: ${invoice.invoiceNumber}</div>
        <div style="font-size:12px;">التاريخ: ${format(new Date(invoice.createdAt), 'dd/MM/yyyy')}</div>
        <div style="font-size:12px; margin-bottom:8px;">المريض: ${invoice.patientName}</div>
      </div>
      <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <thead>
          <tr style="background:#f2aca5; color:#fff; text-align:right;">
            <th style="padding:6px;">الوصف</th>
            <th style="padding:6px;">الكمية</th>
            <th style="padding:6px;">السعر</th>
            <th style="padding:6px;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr style="text-align:right;">
              <td style="padding:6px;">${item.description}</td>
              <td style="padding:6px;">${item.quantity}</td>
              <td style="padding:6px;">${item.unitPrice.toLocaleString('en-US')}</td>
              <td style="padding:6px;">${item.total.toLocaleString('en-US')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top:12px; width:100%; display:flex; justify-content:flex-start; flex-direction:column; align-items:flex-start;">
        <div style="width:40%; text-align:right;">
          <div>المجموع الفرعي: ${invoice.subtotal.toLocaleString('en-US')} SYP</div>
          ${invoice.discount > 0 ? `<div>الخصم (${invoice.discount}%): -${(invoice.subtotal * invoice.discount / 100).toLocaleString('en-US')} SYP</div>` : ''}
          ${invoice.tax > 0 ? `<div>الضريبة (${invoice.tax}%): ${(invoice.subtotal * (1 - invoice.discount / 100) * invoice.tax / 100).toLocaleString('en-US')} SYP</div>` : ''}
          <div style="font-weight:700; margin-top:6px;">الإجمالي: ${invoice.total.toLocaleString('en-US')} SYP</div>
          <div>المدفوع: ${invoice.paidAmount.toLocaleString('en-US')} SYP</div>
          <div>المتبقي: ${(invoice.total - invoice.paidAmount).toLocaleString('en-US')} SYP</div>
        </div>
      </div>
    `

    // Render inside an isolated iframe (so page CSS like `lab()` won't be parsed)
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.left = '-9999px'
    iframe.style.width = '790px'
    iframe.style.height = '1120px'
    document.body.appendChild(iframe)

    const src = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><link rel="stylesheet" href="${cairoHref}"><style>html,body{height:100%;}body{margin:0;font-family:\"Cairo\",sans-serif;color:#000;background:#fff;font-size:12px;} .invoice-wrapper{padding:28px;box-sizing:border-box;width:100%;}</style></head><body><div class="invoice-wrapper">${container.innerHTML}<div style="text-align:center;margin-top:28px;color:#6b7280;font-size:13px;font-weight:600;">Sara Dental Clinic تشكر زيارتكم</div></div></body></html>`
    iframe.srcdoc = src

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve()
    })

    const iframeDoc = iframe.contentDocument as Document
    try {
      await (iframe.contentWindow as any).fonts.load('16px Cairo')
      await (iframe.contentWindow as any).fonts.ready
    } catch (e) {
      // ignore font load errors
    }

    // Use html2canvas inside the isolated iframe as a reliable renderer
    try {
      const pxWidth = iframe.clientWidth || 790
      const pxHeight = iframe.clientHeight || 1120

      // Load html2canvas into the iframe if missing
      await new Promise<void>((resolve, reject) => {
        const win = iframe.contentWindow as any
        if (win && win.html2canvas) return resolve()
        const script = iframeDoc.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load html2canvas in iframe'))
        iframeDoc.head.appendChild(script)
      })

      const h2c = (iframe.contentWindow as any).html2canvas
      if (!h2c) throw new Error('html2canvas unavailable')

      // Increase scale for better resolution (use devicePixelRatio when available)
      const dpr = (iframe.contentWindow as any).devicePixelRatio || 2
      const scale = Math.min(3, Math.max(1, dpr))

      const canvas: HTMLCanvasElement = await h2c(iframeDoc.body, { scale, useCORS: true, backgroundColor: '#ffffff' })
      const dataUrl = canvas.toDataURL('image/png')
      const pageWidth = doc.internal.pageSize.getWidth()
      const imgWidthMm = pageWidth
      const imgHeightMm = (canvas.height / canvas.width) * imgWidthMm
      doc.addImage(dataUrl, 'PNG', 0, 0, imgWidthMm, imgHeightMm)

      // Download via blob URL
      const pdfBlob = await doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = pdfUrl
      a.download = `${invoice.invoiceNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(pdfUrl)

      try { document.body.removeChild(iframe) } catch (e) {}
    } catch (e) {
      try { document.body.removeChild(iframe) } catch (er) {}
      console.error('PDF generation failed:', e)
      alert('فشل تحويل الفاتورة إلى PDF. الرجاء فتح Console وإرسال الخطأ.')
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
      case 'paid':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'partial':
        return 'bg-orange-100 text-orange-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      case 'draft':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'مسودة'
      case 'pending': return 'معلق'
      case 'paid': return 'مدفوع'
      case 'partial': return 'جزئي'
      case 'cancelled': return 'ملغي'
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

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الفواتير</h1>
          <p className="text-muted-foreground">إدارة فواتير المرضى</p>
        </div>
        <Button
          onClick={() => setShowNewDialog(true)}
          className="rounded-xl bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          فاتورة جديدة
        </Button>
      </div>

      {/* Invoices List */}
      <div className="grid gap-4">
        {invoices.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              لا توجد فواتير بعد
            </CardContent>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card 
              key={invoice.id} 
              className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedInvoice(invoice)
                setShowViewDialog(true)
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{invoice.invoiceNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {invoice.patientName} - {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatCurrency(invoice.total)}</p>
                    <span className={cn(
                      'inline-block px-2 py-1 rounded-full text-xs font-medium',
                      getStatusColor(invoice.status)
                    )}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </div>
                </div>

                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <div className="mt-4 flex justify-between items-center p-3 rounded-xl bg-muted/50">
                    <span className="text-sm text-muted-foreground">المتبقي</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(invoice.total - invoice.paidAmount)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New Invoice Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>فاتورة جديدة</DialogTitle>
            <DialogDescription>إنشاء فاتورة للمريض</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>المريض</Label>
                <Select
                  value={newInvoice.patientId}
                  onValueChange={handlePatientChange}
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

              {patientPlans.length > 0 && (
                <div className="space-y-2">
                  <Label>خطة العلاج (اختياري)</Label>
                  <Select
                    value={newInvoice.treatmentPlanId}
                    onValueChange={handlePlanChange}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="اختر خطة العلاج" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientPlans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.treatments.length} علاجات - {formatCurrency(p.totalCost)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Add Item */}
            <Card className="rounded-xl border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">إضافة بند</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>الوصف</Label>
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="وصف البند"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>السعر</Label>
                    <Input
                      type="number"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddItem}
                      className="rounded-xl w-full"
                      disabled={!newItem.description || newItem.unitPrice <= 0}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      إضافة
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items List */}
            {newInvoice.items.length > 0 && (
              <div className="space-y-2">
                <Label>البنود</Label>
                <div className="space-y-2">
                  {newInvoice.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(item.total)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discount & Tax */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>الخصم (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newInvoice.discount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, discount: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>الضريبة (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newInvoice.tax}
                  onChange={(e) => setNewInvoice({ ...newInvoice, tax: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Totals */}
            {newInvoice.items.length > 0 && (
              <div className="space-y-2 p-4 rounded-xl bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span>المجموع الفرعي</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {newInvoice.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>الخصم ({newInvoice.discount}%)</span>
                    <span>-{formatCurrency(totals.discountAmount)}</span>
                  </div>
                )}
                {newInvoice.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>الضريبة ({newInvoice.tax}%)</span>
                    <span>{formatCurrency(totals.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
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
                      disabled={saving || newInvoice.items.length === 0 || !newInvoice.patientId}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        'إنشاء الفاتورة'
                      )}
                    </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الفاتورة</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">المريض</p>
                  <p className="font-medium">{selectedInvoice.patientName}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-medium">{formatDate(selectedInvoice.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>البنود</Label>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-xl bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span>المجموع الفرعي</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>الخصم ({selectedInvoice.discount}%)</span>
                    <span>-{formatCurrency(selectedInvoice.subtotal * selectedInvoice.discount / 100)}</span>
                  </div>
                )}
                {selectedInvoice.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>الضريبة ({selectedInvoice.tax}%)</span>
                    <span>{formatCurrency(selectedInvoice.subtotal * (1 - selectedInvoice.discount / 100) * selectedInvoice.tax / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>الإجمالي</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>المدفوع</span>
                  <span>{formatCurrency(selectedInvoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-orange-600">
                  <span>المتبقي</span>
                  <span>{formatCurrency(selectedInvoice.total - selectedInvoice.paidAmount)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => generatePDF(selectedInvoice)}
                  variant="outline"
                  className="rounded-xl"
                >
                  <Download className="mr-2 h-4 w-4" />
                  تحميل PDF
                </Button>
                {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
                  <Button
                    onClick={() => {
                      setPaymentAmount(selectedInvoice.total - selectedInvoice.paidAmount)
                      setShowPaymentDialog(true)
                    }}
                    className="rounded-xl bg-green-600 hover:bg-green-700"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    إضافة دفعة
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowViewDialog(false)}
              className="rounded-xl"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>إضافة دفعة</DialogTitle>
            <DialogDescription>
              المتبقي: {selectedInvoice && formatCurrency(selectedInvoice.total - selectedInvoice.paidAmount)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>مبلغ الدفعة</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="rounded-xl"
                max={selectedInvoice ? selectedInvoice.total - selectedInvoice.paidAmount : 0}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddPayment}
              className="rounded-xl bg-green-600 hover:bg-green-700"
              disabled={paymentAmount <= 0}
            >
              تأكيد الدفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <InvoicesContent />
    </Suspense>
  )
}
