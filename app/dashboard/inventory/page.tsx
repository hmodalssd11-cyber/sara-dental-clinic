'use client'

import { useState, useEffect } from 'react'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Plus, 
  Loader2,
  Package,
  Search,
  AlertTriangle,
  Edit,
  Trash2,
  TrendingDown,
} from 'lucide-react'
import { 
  getAllInventory, 
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockItems,
  type InventoryItem,
} from '@/lib/db'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const categories = [
  { id: 'disposables', name: 'المستهلكات', icon: '🧤' },
  { id: 'medications', name: 'الأدوية', icon: '💊' },
  { id: 'dental-materials', name: 'مواد طب الأسنان', icon: '🦷' },
  { id: 'instruments', name: 'الأدوات', icon: '🔧' },
  { id: 'equipment-parts', name: 'قطع المعدات', icon: '⚙️' },
  { id: 'sterilization', name: 'التعقيم', icon: '🧪' },
  { id: 'lab-materials', name: 'مواد المختبر', icon: '🔬' },
  { id: 'office-supplies', name: 'مستلزمات المكتب', icon: '📋' },
]

const units = ['قطعة', 'علبة', 'عبوة', 'لتر', 'كيلو', 'متر', 'زوج', 'مجموعة']

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    unit: 'قطعة',
    minStock: 0,
    costPrice: 0,
    supplier: '',
    expiryDate: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [inventoryData, lowStock] = await Promise.all([
        getAllInventory(),
        getLowStockItems(),
      ])
      setInventory(inventoryData)
      setLowStockItems(lowStock)
    } catch (error) {
      console.error('Error loading inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await createInventoryItem(formData)
      await loadData()
      setShowNewDialog(false)
      resetForm()
    } catch (error) {
      console.error('Error creating item:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    setSaving(true)

    try {
      await updateInventoryItem(selectedItem.id, formData)
      await loadData()
      setShowEditDialog(false)
      resetForm()
    } catch (error) {
      console.error('Error updating item:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedItem) return

    try {
      await deleteInventoryItem(selectedItem.id)
      await loadData()
      setShowDeleteDialog(false)
      setSelectedItem(null)
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const openEditDialog = (item: InventoryItem) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minStock: item.minStock,
      costPrice: item.costPrice,
      supplier: item.supplier || '',
      expiryDate: item.expiryDate || '',
      notes: item.notes || '',
    })
    setShowEditDialog(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      quantity: 0,
      unit: 'قطعة',
      minStock: 0,
      costPrice: 0,
      supplier: '',
      expiryDate: '',
      notes: '',
    })
    setSelectedItem(null)
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

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || categoryId
  }

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.icon || '📦'
  }

  const isLowStock = (item: InventoryItem) => item.quantity <= item.minStock

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
          <h1 className="text-2xl font-bold text-foreground">المخزون</h1>
          <p className="text-muted-foreground">إدارة مخزون العيادة</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowNewDialog(true)
          }}
          className="rounded-xl bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          إضافة مادة جديدة
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-sm bg-orange-50 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              تنبيه مخزون منخفض
            </CardTitle>
            <CardDescription className="text-orange-600">
              {lowStockItems.length} مواد وصلت للحد الأدنى
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.slice(0, 5).map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm"
                >
                  <TrendingDown className="h-3 w-3" />
                  {item.name}: {item.quantity} {item.unit}
                </span>
              ))}
              {lowStockItems.length > 5 && (
                <span className="text-sm text-orange-600">
                  +{lowStockItems.length - 5} المزيد
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المخزون..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 rounded-xl h-11"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px] rounded-xl h-11">
                <SelectValue placeholder="جميع الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Categories Tabs */}
      <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="rounded-xl bg-muted p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="rounded-lg">الكل</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="rounded-lg">
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Inventory Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInventory.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchQuery || selectedCategory !== 'all' 
                ? 'لا توجد نتائج للبحث'
                : 'لا توجد مواد في المخزون بعد'
              }
            </CardContent>
          </Card>
        ) : (
          filteredInventory.map((item) => (
            <Card 
              key={item.id} 
              className={cn(
                "rounded-2xl border-0 shadow-sm hover:shadow-md transition-shadow",
                isLowStock(item) && "border-2 border-orange-300 bg-orange-50/50"
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">{getCategoryName(item.category)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(item)}
                      className="h-8 w-8 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedItem(item)
                        setShowDeleteDialog(true)
                      }}
                      className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    isLowStock(item) ? "bg-orange-100" : "bg-muted/50"
                  )}>
                    <p className="text-xs text-muted-foreground">الكمية</p>
                    <p className={cn(
                      "font-bold",
                      isLowStock(item) && "text-orange-700"
                    )}>
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">الحد الأدنى</p>
                    <p className="font-medium">{item.minStock} {item.unit}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">سعر التكلفة</p>
                    <p className="font-medium">{formatCurrency(item.costPrice)}</p>
                  </div>
                  {item.expiryDate && (
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">تاريخ الانتهاء</p>
                      <p className="font-medium text-sm">{formatDate(item.expiryDate)}</p>
                    </div>
                  )}
                </div>

                {isLowStock(item) && (
                  <div className="mt-3 flex items-center gap-2 text-orange-700 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    مخزون منخفض
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* New Item Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>إضافة مادة جديدة</DialogTitle>
            <DialogDescription>أدخل بيانات المادة الجديدة</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المادة *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="أدخل اسم المادة"
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>الفئة *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
                required
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>الكمية *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الوحدة *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>الحد الأدنى للتنبيه *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>سعر التكلفة</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>المورد</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="اسم المورد"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                disabled={saving || !formData.name || !formData.category}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  'إضافة المادة'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>تعديل المادة</DialogTitle>
            <DialogDescription>تحديث بيانات المادة</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المادة *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>الفئة *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>الكمية *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الوحدة *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => setFormData({ ...formData, unit: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>الحد الأدنى للتنبيه *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>سعر التكلفة</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>المورد</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="rounded-xl"
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

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المادة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{selectedItem?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
