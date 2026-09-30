import { isProxy, toRaw } from 'vue'
import type { ExpenseRecord, ExpenseLocation } from '~/stores/expenses'
import type { ExpenseCategory } from '~/utils/expenseCategories'

// Minified expense payload for QR. The ticket attachment is intentionally
// omitted — receipt images are far too large to fit in a QR code.
interface MinifiedExpenseLocation {
    l: string // label
    i?: string // placeId
    c?: string // city
    p?: string // province
    z?: string // zone
    a?: number // lat
    n?: number // lng
}

interface MinifiedExpense {
    d: string // description
    a: number // amount
    t: string // timestamp (UTC ISO)
    c?: ExpenseCategory // category
    l?: MinifiedExpenseLocation // location
}

const compressExpenseLocation = (location?: ExpenseLocation): MinifiedExpenseLocation | undefined => {
    if (!location?.label) return undefined
    return {
        l: location.label,
        i: location.placeId || undefined,
        c: location.city || undefined,
        p: location.province || undefined,
        z: location.zone || undefined,
        a: typeof location.lat === 'number' ? location.lat : undefined,
        n: typeof location.lng === 'number' ? location.lng : undefined
    }
}

const decompressExpenseLocation = (location?: MinifiedExpenseLocation | ExpenseLocation): ExpenseLocation | undefined => {
    if (!location) return undefined
    if ('label' in location) return location.label ? location : undefined
    if (!location.l) return undefined
    return {
        label: location.l,
        placeId: location.i,
        city: location.c,
        province: location.p,
        zone: location.z,
        lat: location.a,
        lng: location.n
    }
}

/**
 * Compresses an ExpenseRecord into a minified object for QR code generation.
 * Drops the id and any attached ticket.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const compressExpenseRecord = (record: any): MinifiedExpense => {
    const src = isProxy(record) ? toRaw(record) : record
    return {
        d: src.description,
        a: src.amount,
        t: src.timestamp,
        c: src.category || undefined,
        l: compressExpenseLocation(src.location)
    }
}

/**
 * Decompresses a minified object (or legacy full object) into a partial
 * ExpenseRecord. The id is NOT generated here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const decompressExpenseRecord = (data: any): Partial<ExpenseRecord> => {
    // Legacy/full format carries the long property names.
    if (data.description !== undefined && data.timestamp !== undefined) {
        return {
            description: data.description,
            amount: data.amount,
            timestamp: data.timestamp,
            category: data.category,
            location: decompressExpenseLocation(data.location)
        }
    }

    const minified = data as MinifiedExpense
    return {
        description: minified.d,
        amount: minified.a,
        timestamp: minified.t,
        category: minified.c,
        location: decompressExpenseLocation(minified.l)
    }
}
