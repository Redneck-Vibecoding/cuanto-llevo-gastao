// Exhaustive categories of supermarket and domestic expenses.
// Categories are mutually exclusive (each product or expense belongs to exactly one category).
// Keys are language-independent and stored on the record;
// labels are translated in the UI via `expenses.categories.<key>`.

export const SUPERMARKET_CATEGORIES = [
    'carnes',
    'pescados',
    'charcuteria',
    'verduras',
    'frutas',
    'quesos',
    'lacteos_huevos',
    'panes_tostadas',
    'desayuno_dulces_cafe',
    'arroz_pastas_legumbres',
    'caldos_sopas_pures',
    'aperitivos_frutos_secos',
    'congelados',
    'helados',
    'bebidas',
    'aceites_condimentos',
    'conservas',
    'limpieza',
    'cuidado_personal',
    'mascotas',
    'hogar',
    'otros'
] as const

// Retain DOMESTIC_CATEGORIES as an alias for SUPERMARKET_CATEGORIES for compatibility
export const DOMESTIC_CATEGORIES = SUPERMARKET_CATEGORIES

export const LEGACY_CATEGORIES = [
    'vivienda',
    'suministros',
    'alimentacion',
    'transporte',
    'telecomunicaciones',
    'salud',
    'ropa_calzado',
    'ocio_restauracion',
    'suscripciones',
    'educacion',
    'seguros',
    'impuestos',
    'viajes',
    'frescos',
    'farmacia',
    'diet',
    'parking',
    'gas',
    'tolls',
    'other'
] as const

export const EXPENSE_CATEGORIES = [
    ...SUPERMARKET_CATEGORIES,
    ...LEGACY_CATEGORIES
] as const

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = 'otros'

// All domestic, supermarket and diet expenses count toward balance; legacy transport/other do not
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
    carnes: 'error',
    pescados: 'info',
    charcuteria: 'warning',
    verduras: 'success',
    frutas: 'success',
    quesos: 'warning',
    lacteos_huevos: 'primary',
    panes_tostadas: 'warning',
    desayuno_dulces_cafe: 'primary',
    arroz_pastas_legumbres: 'warning',
    caldos_sopas_pures: 'warning',
    aperitivos_frutos_secos: 'warning',
    congelados: 'info',
    helados: 'primary',
    bebidas: 'info',
    aceites_condimentos: 'success',
    conservas: 'neutral',
    limpieza: 'info',
    cuidado_personal: 'primary',
    mascotas: 'warning',
    hogar: 'neutral',
    otros: 'neutral',
    // Legacy categories
    vivienda: 'primary',
    suministros: 'warning',
    alimentacion: 'success',
    transporte: 'info',
    telecomunicaciones: 'info',
    salud: 'error',
    ropa_calzado: 'primary',
    ocio_restauracion: 'warning',
    suscripciones: 'info',
    educacion: 'success',
    seguros: 'neutral',
    impuestos: 'error',
    viajes: 'info',
    frescos: 'success',
    farmacia: 'error',
    diet: 'primary',
    parking: 'info',
    gas: 'warning',
    tolls: 'error',
    other: 'neutral'
}

export const CATEGORY_ICONS: Record<string, string> = {
    carnes: 'i-heroicons-fire',
    pescados: 'i-heroicons-sparkles',
    charcuteria: 'i-heroicons-tag',
    verduras: 'i-heroicons-sparkles',
    frutas: 'i-heroicons-sun',
    quesos: 'i-heroicons-cake',
    lacteos_huevos: 'i-heroicons-beaker',
    panes_tostadas: 'i-heroicons-cake',
    desayuno_dulces_cafe: 'i-heroicons-sparkles',
    arroz_pastas_legumbres: 'i-heroicons-circle-stack',
    caldos_sopas_pures: 'i-heroicons-fire',
    aperitivos_frutos_secos: 'i-heroicons-sparkles',
    congelados: 'i-heroicons-cloud',
    helados: 'i-heroicons-sparkles',
    bebidas: 'i-heroicons-beaker',
    aceites_condimentos: 'i-heroicons-beaker',
    conservas: 'i-heroicons-archive-box',
    limpieza: 'i-heroicons-sparkles',
    cuidado_personal: 'i-heroicons-user',
    mascotas: 'i-heroicons-face-smile',
    hogar: 'i-heroicons-home',
    otros: 'i-heroicons-ellipsis-horizontal-circle',
    // Legacy categories
    vivienda: 'i-heroicons-home',
    suministros: 'i-heroicons-bolt',
    alimentacion: 'i-heroicons-shopping-bag',
    transporte: 'i-heroicons-truck',
    telecomunicaciones: 'i-heroicons-wifi',
    salud: 'i-heroicons-heart',
    ropa_calzado: 'i-heroicons-tag',
    ocio_restauracion: 'i-heroicons-ticket',
    suscripciones: 'i-heroicons-tv',
    educacion: 'i-heroicons-academic-cap',
    seguros: 'i-heroicons-shield-check',
    impuestos: 'i-heroicons-document-text',
    viajes: 'i-heroicons-globe-alt',
    frescos: 'i-heroicons-sparkles',
    farmacia: 'i-heroicons-plus-circle',
    diet: 'i-heroicons-shopping-bag',
    parking: 'i-heroicons-truck',
    gas: 'i-heroicons-bolt',
    tolls: 'i-heroicons-tag',
    other: 'i-heroicons-ellipsis-horizontal-circle'
}

export const CATEGORY_HEX_COLORS: Record<string, string> = {
    carnes: '#ef4444',
    pescados: '#06b6d4',
    charcuteria: '#f97316',
    verduras: '#10b981',
    frutas: '#84cc16',
    quesos: '#eab308',
    lacteos_huevos: '#38bdf8',
    panes_tostadas: '#d97706',
    desayuno_dulces_cafe: '#a16207',
    arroz_pastas_legumbres: '#f59e0b',
    caldos_sopas_pures: '#fb923c',
    aperitivos_frutos_secos: '#ca8a04',
    congelados: '#0284c7',
    helados: '#ec4899',
    bebidas: '#0ea5e9',
    aceites_condimentos: '#65a30d',
    conservas: '#0d9488',
    limpieza: '#3b82f6',
    cuidado_personal: '#8b5cf6',
    mascotas: '#d946ef',
    hogar: '#64748b',
    otros: '#9ca3af',
    // Legacy categories
    vivienda: '#6366f1',
    suministros: '#f59e0b',
    alimentacion: '#10b981',
    transporte: '#0284c7',
    telecomunicaciones: '#06b6d4',
    salud: '#ef4444',
    ropa_calzado: '#ec4899',
    ocio_restauracion: '#f97316',
    suscripciones: '#a855f7',
    educacion: '#14b8a6',
    seguros: '#475569',
    impuestos: '#64748b',
    viajes: '#0ea5e9',
    frescos: '#14b8a6',
    farmacia: '#ef4444',
    diet: '#10b981',
    parking: '#0284c7',
    gas: '#f59e0b',
    tolls: '#64748b',
    other: '#9ca3af'
}

/**
 * Calculates category percentages using the Largest Remainder Method (Hare-Niemeyer),
 * mathematically guaranteeing that the rounded percentages sum to exactly 100.0%.
 *
 * @param categories Array of tuples [categoryKey, { total: number }]
 * @param totalAmount Grand total amount (if not provided, sum of category totals is used)
 * @param decimals Number of decimal digits (default: 1)
 * @returns Map from category key to its rounded percentage (which sums to 100.0)
 */
export function calculateCategoryPercentages<T extends { total: number }>(
    categories: [string, T][],
    totalAmount?: number,
    decimals = 1
): Map<string, number> {
    const result = new Map<string, number>()
    if (categories.length === 0) {
        return result
    }

    const effectiveTotal = categories.reduce((sum, [, d]) => sum + (d.total || 0), 0)
    const baseTotal = (totalAmount && totalAmount > 0) ? totalAmount : effectiveTotal

    if (baseTotal <= 0) {
        for (const [key] of categories) {
            result.set(key, 0)
        }
        return result
    }

    const factor = Math.pow(10, decimals)
    const targetUnits = Math.round(100 * factor) // e.g. 1000 for 1 decimal

    // 1. Calculate floor units and remainder per category
    const items = categories.map(([key, data]) => {
        const raw = data.total > 0 ? (data.total / baseTotal) : 0
        const exact = raw * targetUnits
        const floor = Math.floor(exact)
        const remainder = exact - floor
        return { key, floor, remainder }
    })

    // 2. Compute missing units to reach targetUnits exactly
    const currentUnits = items.reduce((sum, item) => sum + item.floor, 0)
    const diff = targetUnits - currentUnits

    // 3. Sort by remainder descending to distribute remaining units
    const sorted = [...items].sort((a, b) => b.remainder - a.remainder)
    const additions = new Map<string, number>()
    if (diff > 0 && sorted.length > 0) {
        for (let i = 0; i < diff; i++) {
            const item = sorted[i % sorted.length]
            if (item) {
                additions.set(item.key, (additions.get(item.key) || 0) + 1)
            }
        }
    }

    // 4. Set final percentages
    for (const item of items) {
        const units = item.floor + (additions.get(item.key) || 0)
        result.set(item.key, Number((units / factor).toFixed(decimals)))
    }

    return result
}

