import type { ExpenseRecord } from '~/stores/expenses'

export type PredefinedPeriod =
  | 'current_month'
  | 'previous_month'
  | 'current_quarter'
  | 'current_semester'
  | 'previous_semester'
  | 'current_year'
  | 'previous_year'
  | 'all'
  | 'custom'

export interface PeriodDateRange {
  start: Date | null
  end: Date | null
  labelKey: string
  filenameDateRange: string
  isCustom: boolean
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export const formatIsoDateOnly = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export function calculatePeriodDateRange(
  period: PredefinedPeriod,
  customRange?: { start?: string, end?: string },
  referenceDate = new Date()
): PeriodDateRange {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() // 0-indexed

  if (period === 'current_month') {
    const start = new Date(year, month, 1, 0, 0, 0, 0)
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
    return {
      start,
      end,
      labelKey: 'export_widget.periods.current_month',
      filenameDateRange: `${formatIsoDateOnly(start)}_${formatIsoDateOnly(end)}`,
      isCustom: false
    }
  }

  if (period === 'previous_month') {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
    const end = new Date(year, month, 0, 23, 59, 59, 999)
    return {
      start,
      end,
      labelKey: 'export_widget.periods.previous_month',
      filenameDateRange: `${formatIsoDateOnly(start)}_${formatIsoDateOnly(end)}`,
      isCustom: false
    }
  }

  if (period === 'current_quarter') {
    const quarterIndex = Math.floor(month / 3) // 0: Q1, 1: Q2, 2: Q3, 3: Q4
    const startMonth = quarterIndex * 3
    const start = new Date(year, startMonth, 1, 0, 0, 0, 0)
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
    return {
      start,
      end,
      labelKey: 'export_widget.periods.current_quarter',
      filenameDateRange: `${formatIsoDateOnly(start)}_${formatIsoDateOnly(end)}`,
      isCustom: false
    }
  }

  if (period === 'current_semester') {
    const isFirstSemester = month < 6
    const start = new Date(year, isFirstSemester ? 0 : 6, 1, 0, 0, 0, 0)
    const end = new Date(year, isFirstSemester ? 6 : 12, 0, 23, 59, 59, 999)
    return {
      start,
      end,
      labelKey: 'export_widget.periods.current_semester',
      filenameDateRange: `${formatIsoDateOnly(start)}_${formatIsoDateOnly(end)}`,
      isCustom: false
    }
  }

  if (period === 'previous_semester') {
    const isFirstSemester = month < 6
    const semYear = isFirstSemester ? year - 1 : year
    const start = new Date(semYear, isFirstSemester ? 6 : 0, 1, 0, 0, 0, 0)
    const end = new Date(semYear, isFirstSemester ? 12 : 6, 0, 23, 59, 59, 999)
    return {
      start,
      end,
      labelKey: 'export_widget.periods.previous_semester',
      filenameDateRange: `${formatIsoDateOnly(start)}_${formatIsoDateOnly(end)}`,
      isCustom: false
    }
  }

  if (period === 'current_year') {
    const start = new Date(year, 0, 1, 0, 0, 0, 0)
    const end = new Date(year, 11, 31, 23, 59, 59, 999)
    return {
      start,
      end,
      labelKey: 'export_widget.periods.current_year',
      filenameDateRange: `${year}-01-01_${year}-12-31`,
      isCustom: false
    }
  }

  if (period === 'previous_year') {
    const prevYear = year - 1
    const start = new Date(prevYear, 0, 1, 0, 0, 0, 0)
    const end = new Date(prevYear, 11, 31, 23, 59, 59, 999)
    return {
      start,
      end,
      labelKey: 'export_widget.periods.previous_year',
      filenameDateRange: `${prevYear}-01-01_${prevYear}-12-31`,
      isCustom: false
    }
  }

  if (period === 'all') {
    return {
      start: null,
      end: null,
      labelKey: 'export_widget.periods.all',
      filenameDateRange: 'historico',
      isCustom: false
    }
  }

  // Custom period
  let start: Date | null = null
  let end: Date | null = null

  if (customRange?.start) {
    const [y, m, d] = customRange.start.split('-').map(Number)
    if (y && m && d) {
      start = new Date(y, m - 1, d, 0, 0, 0, 0)
    }
  }

  if (customRange?.end) {
    const [y, m, d] = customRange.end.split('-').map(Number)
    if (y && m && d) {
      end = new Date(y, m - 1, d, 23, 59, 59, 999)
    }
  }

  const rangeStr = `${start ? formatIsoDateOnly(start) : 'inicio'}_${end ? formatIsoDateOnly(end) : 'fin'}`
  return {
    start,
    end,
    labelKey: 'export_widget.periods.custom',
    filenameDateRange: rangeStr,
    isCustom: true
  }
}

export function filterExpensesByPeriod(
  expenses: ExpenseRecord[],
  period: PredefinedPeriod,
  customRange?: { start?: string, end?: string },
  referenceDate = new Date()
): { filtered: ExpenseRecord[], dateRange: PeriodDateRange } {
  const dateRange = calculatePeriodDateRange(period, customRange, referenceDate)

  const filtered = expenses.filter(e => {
    const d = new Date(e.timestamp)
    if (Number.isNaN(d.getTime())) return false
    if (dateRange.start && d < dateRange.start) return false
    if (dateRange.end && d > dateRange.end) return false
    return true
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return { filtered, dateRange }
}

export function formatPeriodDateLabel(
  dateRange: PeriodDateRange,
  locale = 'es-ES'
): string {
  if (!dateRange.start && !dateRange.end) return 'Todo el historial'

  const dtf = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  if (dateRange.start && dateRange.end) {
    return `${dtf.format(dateRange.start)} - ${dtf.format(dateRange.end)}`
  }
  if (dateRange.start) {
    return `Desde ${dtf.format(dateRange.start)}`
  }
  if (dateRange.end) {
    return `Hasta ${dtf.format(dateRange.end)}`
  }
  return ''
}
