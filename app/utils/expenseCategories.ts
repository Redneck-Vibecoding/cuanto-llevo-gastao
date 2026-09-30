// Expense categories adapted for supermarket & household spending.
// Keys are language-independent and stored on the record;
// labels are translated in the UI via `expenses.categories.<key>`.

export const SUPERMARKET_CATEGORIES = [
    'alimentacion',
    'frescos',
    'bebidas',
    'limpieza',
    'cuidado_personal',
    'farmacia',
    'hogar',
    'mascotas',
    'otros'
] as const

export const LEGACY_CATEGORIES = ['diet', 'parking', 'gas', 'tolls', 'other'] as const

export const EXPENSE_CATEGORIES = [
    'alimentacion',
    'frescos',
    'bebidas',
    'limpieza',
    'cuidado_personal',
    'farmacia',
    'hogar',
    'mascotas',
    'otros',
    'diet',
    'parking',
    'gas',
    'tolls',
    'other'
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = 'alimentacion'

// Only "diet" expenses and supermarket expenses count toward balance
export const categoryCountsTowardBalance = (category: ExpenseCategory): boolean => {
    if (category === 'parking' || category === 'gas' || category === 'tolls' || category === 'other') return false
    return true
}

// Resolve an expense's effective category, migrating older records
export function resolveExpenseCategory(
    expense: { category?: ExpenseCategory, excludeFromBalance?: boolean }
): ExpenseCategory {
    if (expense.category) return expense.category
    return expense.excludeFromBalance ? 'other' : 'diet'
}

// Nuxt UI badge/colour per category, used for badges, charts and calendar dots.
export const CATEGORY_COLORS: Record<ExpenseCategory, 'primary' | 'info' | 'warning' | 'error' | 'neutral' | 'success'> = {
    alimentacion: 'primary',
    frescos: 'success',
    bebidas: 'info',
    limpieza: 'info',
    cuidado_personal: 'warning',
    farmacia: 'error',
    hogar: 'neutral',
    mascotas: 'warning',
    otros: 'neutral',
    diet: 'primary',
    parking: 'info',
    gas: 'warning',
    tolls: 'error',
    other: 'neutral'
}

export const CATEGORY_ICONS: Record<string, string> = {
    alimentacion: 'i-heroicons-shopping-bag',
    frescos: 'i-heroicons-sparkles',
    bebidas: 'i-heroicons-beaker',
    limpieza: 'i-heroicons-sparkles',
    cuidado_personal: 'i-heroicons-heart',
    farmacia: 'i-heroicons-plus-circle',
    hogar: 'i-heroicons-home',
    mascotas: 'i-heroicons-face-smile',
    otros: 'i-heroicons-tag'
}

export const CATEGORY_HEX_COLORS: Record<string, string> = {
    alimentacion: '#10b981',
    frescos: '#14b8a6',
    bebidas: '#06b6d4',
    limpieza: '#3b82f6',
    cuidado_personal: '#8b5cf6',
    farmacia: '#ef4444',
    hogar: '#f59e0b',
    mascotas: '#ec4899',
    otros: '#6b7280'
}
