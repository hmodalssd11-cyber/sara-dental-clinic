'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DentalChart, ToothCondition } from '@/lib/db'
import { cn } from '@/lib/utils'

interface DentalChartProps {
  chart: DentalChart
  onUpdateTooth: (toothNumber: string, condition: ToothCondition) => void
  readOnly?: boolean
}

const conditions = [
  { value: 'healthy', label: 'سليم', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'cavity', label: 'تسوس', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'filling', label: 'حشوة', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'crown', label: 'تاج', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'extraction', label: 'خلع', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { value: 'root-canal', label: 'علاج عصب', color: 'bg-purple-100 text-purple-800 border-purple-300' },
]

// FDI Notation - Upper teeth (right to left): 18-11, 21-28, Lower teeth: 48-41, 31-38
const upperRightTeeth = ['18', '17', '16', '15', '14', '13', '12', '11']
const upperLeftTeeth = ['21', '22', '23', '24', '25', '26', '27', '28']
const lowerRightTeeth = ['48', '47', '46', '45', '44', '43', '42', '41']
const lowerLeftTeeth = ['31', '32', '33', '34', '35', '36', '37', '38']

const toothNames: Record<string, string> = {
  '18': 'ضرس العقل العلوي الأيمن',
  '17': 'الضرس الثاني العلوي الأيمن',
  '16': 'الضرس الأول العلوي الأيمن',
  '15': 'الضاحك الثاني العلوي الأيمن',
  '14': 'الضاحك الأول العلوي الأيمن',
  '13': 'الناب العلوي الأيمن',
  '12': 'الرباعية العلوية اليمنى',
  '11': 'الثنية العلوية اليمنى',
  '21': 'الثنية العلوية اليسرى',
  '22': 'الرباعية العلوية اليسرى',
  '23': 'الناب العلوي الأيسر',
  '24': 'الضاحك الأول العلوي الأيسر',
  '25': 'الضاحك الثاني العلوي الأيسر',
  '26': 'الضرس الأول العلوي الأيسر',
  '27': 'الضرس الثاني العلوي الأيسر',
  '28': 'ضرس العقل العلوي الأيسر',
  '48': 'ضرس العقل السفلي الأيمن',
  '47': 'الضرس الثاني السفلي الأيمن',
  '46': 'الضرس الأول السفلي الأيمن',
  '45': 'الضاحك الثاني السفلي الأيمن',
  '44': 'الضاحك الأول السفلي الأيمن',
  '43': 'الناب السفلي الأيمن',
  '42': 'الرباعية السفلية اليمنى',
  '41': 'الثنية السفلية اليمنى',
  '31': 'الثنية السفلية اليسرى',
  '32': 'الرباعية السفلية اليسرى',
  '33': 'الناب السفلي الأيسر',
  '34': 'الضاحك الأول السفلي الأيسر',
  '35': 'الضاحك الثاني السفلي الأيسر',
  '36': 'الضرس الأول السفلي الأيسر',
  '37': 'الضرس الثاني السفلي الأيسر',
  '38': 'ضرس العقل السفلي الأيسر',
}

export function DentalChartComponent({ chart, onUpdateTooth, readOnly = false }: DentalChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null)
  const [selectedCondition, setSelectedCondition] = useState<ToothCondition['condition']>('healthy')
  const [notes, setNotes] = useState('')

  const getToothColor = (toothNumber: string) => {
    const condition = chart[toothNumber]?.condition || 'healthy'
    switch (condition) {
      case 'healthy':
        return 'bg-green-50 border-green-200 hover:bg-green-100'
      case 'cavity':
        return 'bg-red-50 border-red-200 hover:bg-red-100'
      case 'filling':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100'
      case 'crown':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
      case 'extraction':
        return 'bg-gray-200 border-gray-400 hover:bg-gray-300'
      case 'root-canal':
        return 'bg-purple-50 border-purple-200 hover:bg-purple-100'
      default:
        return 'bg-green-50 border-green-200 hover:bg-green-100'
    }
  }

  const handleToothClick = (toothNumber: string) => {
    if (readOnly) return
    setSelectedTooth(toothNumber)
    const current = chart[toothNumber]
    setSelectedCondition(current?.condition || 'healthy')
    setNotes(current?.notes || '')
  }

  const handleSave = () => {
    if (!selectedTooth) return
    onUpdateTooth(selectedTooth, {
      condition: selectedCondition,
      notes: notes || undefined,
      date: new Date().toISOString(),
    })
    setSelectedTooth(null)
    setNotes('')
  }

  const renderToothRow = (teeth: string[], isUpper: boolean) => (
    <div className="flex gap-1 justify-center">
      {teeth.map((tooth) => (
        <button
          key={tooth}
          onClick={() => handleToothClick(tooth)}
          disabled={readOnly}
          className={cn(
            'relative w-8 h-10 sm:w-10 sm:h-12 rounded-lg border-2 transition-all text-xs font-medium flex flex-col items-center justify-center',
            getToothColor(tooth),
            !readOnly && 'cursor-pointer',
            readOnly && 'cursor-default',
            isUpper ? 'rounded-t-2xl' : 'rounded-b-2xl'
          )}
          title={toothNames[tooth]}
        >
          <span className="text-[10px] sm:text-xs text-muted-foreground">{tooth}</span>
          {chart[tooth]?.condition === 'extraction' && (
            <span className="absolute inset-0 flex items-center justify-center text-gray-500 font-bold text-lg">
              X
            </span>
          )}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {conditions.map((c) => (
          <span
            key={c.value}
            className={cn('px-2 py-1 rounded-lg text-xs font-medium border', c.color)}
          >
            {c.label}
          </span>
        ))}
      </div>

      {/* Dental Chart */}
      <div className="bg-muted/30 rounded-2xl p-4 space-y-2">
        {/* Upper Jaw */}
        <div className="text-center mb-2">
          <span className="text-xs text-muted-foreground">الفك العلوي</span>
        </div>
        <div className="flex justify-center gap-4">
          <div className="text-xs text-muted-foreground self-center">يمين</div>
          <div className="flex gap-1">
            {renderToothRow(upperRightTeeth, true)}
            <div className="w-px bg-border mx-1" />
            {renderToothRow(upperLeftTeeth, true)}
          </div>
          <div className="text-xs text-muted-foreground self-center">يسار</div>
        </div>

        {/* Divider */}
        <div className="h-px bg-border my-2" />

        {/* Lower Jaw */}
        <div className="flex justify-center gap-4">
          <div className="text-xs text-muted-foreground self-center">يمين</div>
          <div className="flex gap-1">
            {renderToothRow(lowerRightTeeth, false)}
            <div className="w-px bg-border mx-1" />
            {renderToothRow(lowerLeftTeeth, false)}
          </div>
          <div className="text-xs text-muted-foreground self-center">يسار</div>
        </div>
        <div className="text-center mt-2">
          <span className="text-xs text-muted-foreground">الفك السفلي</span>
        </div>
      </div>

      {/* Tooth Condition Dialog */}
      <Dialog open={!!selectedTooth} onOpenChange={(open) => !open && setSelectedTooth(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              سن رقم {selectedTooth} - {selectedTooth && toothNames[selectedTooth]}
            </DialogTitle>
            <DialogDescription>تحديث حالة السن</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select
                value={selectedCondition}
                onValueChange={(v) => setSelectedCondition(v as ToothCondition['condition'])}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات..."
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedTooth(null)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button onClick={handleSave} className="rounded-xl bg-primary hover:bg-primary/90">
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
