<script setup lang="ts">
import {
    clearLegacyLocalStorageData,
    getAppDatabaseUsageStats,
    type AppDatabaseUsageStats
} from '~/utils/appDatabase'
import { generateSampleExpenses } from '~/utils/sampleData'

const { t } = useI18n()
const toast = useToast()
const expenseStore = useExpenseStore()

const maintenanceState = reactive({
    selectedYear: undefined as number | undefined,
    selectedMonth: undefined as number | undefined
})

const confirmModal = reactive({
    isOpen: false,
    title: '',
    description: '',
    action: null as (() => Promise<void>) | null,
    confirmLabel: t('common.confirm'),
    confirmColor: 'primary' as 'primary' | 'error'
})

const monthFormatter = new Intl.DateTimeFormat('ca-ES', { month: 'long', year: 'numeric' })

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const availableYears = computed(() => {
    const years = new Set<number>()
    expenseStore.expenses.forEach(r => {
        const d = new Date(r.timestamp)
        if (!Number.isNaN(d.getTime())) years.add(d.getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a).map(y => ({ label: String(y), value: y }))
})

const availableMonthsForYear = computed(() => {
    if (!maintenanceState.selectedYear) return []
    const months = new Set<number>()
    expenseStore.expenses.forEach(r => {
        const d = new Date(r.timestamp)
        if (!Number.isNaN(d.getTime()) && d.getFullYear() === maintenanceState.selectedYear) {
            months.add(d.getMonth() + 1)
        }
    })
    return Array.from(months).sort((a, b) => a - b).map(m => {
        const date = new Date(maintenanceState.selectedYear!, m - 1, 1)
        const label = monthFormatter.format(date)
        return { label: label.charAt(0).toUpperCase() + label.slice(1), value: m }
    })
})

const deleteButtonLabel = computed(() => {
    if (!maintenanceState.selectedYear) return t('settings.maintenance.select_year_to_delete')
    if (maintenanceState.selectedMonth) {
        const monthName = availableMonthsForYear.value.find(m => m.value === maintenanceState.selectedMonth)?.label
        return t('settings.maintenance.delete_month_data', { month: monthName })
    }
    return t('settings.maintenance.delete_year_data', { year: maintenanceState.selectedYear })
})

const confirmDelete = () => {
    if (!maintenanceState.selectedYear) return

    const year = maintenanceState.selectedYear
    const month = maintenanceState.selectedMonth

    const title = t('settings.maintenance.confirm_delete_title')
    const description = month
        ? t('settings.maintenance.confirm_delete_month', { month })
        : t('settings.maintenance.confirm_delete_year', { year })

    confirmModal.title = title
    confirmModal.description = description
    confirmModal.action = async () => {
        if (month) {
            await expenseStore.deleteExpensesByMonth(year, month)
        } else {
            await expenseStore.deleteExpensesByYear(year)
        }
        await refreshStats()
        toast.add({ title: t('settings.maintenance.data_deleted'), color: 'success' })
        maintenanceState.selectedYear = undefined
        maintenanceState.selectedMonth = undefined
    }
    confirmModal.confirmLabel = t('common.confirm')
    confirmModal.confirmColor = 'error'
    confirmModal.isOpen = true
}

const ticketStats = ref({ count: 0, bytes: 0 })
const databaseStats = ref<AppDatabaseUsageStats>({
    totalBytes: 0,
    appStateBytes: 0,
    attachmentBytes: 0,
    attachmentCount: 0,
    browserUsageBytes: undefined as number | undefined,
    browserQuotaBytes: undefined as number | undefined,
    legacyLocalStorageBytes: 0,
    legacyLocalStorageKeys: [] as string[]
})

const refreshTicketStats = async () => {
    ticketStats.value = await expenseStore.getTicketStats()
}

const refreshDatabaseStats = async () => {
    databaseStats.value = await getAppDatabaseUsageStats()
}

const refreshStats = async () => {
    await Promise.all([
        refreshTicketStats(),
        refreshDatabaseStats()
    ])
}

const ticketStatsSignature = computed(() =>
    expenseStore.expenses.map(expense => `${expense.id}:${expense.ticketId || ''}`).join('|'))

watch(ticketStatsSignature, () => {
    void refreshStats()
}, { immediate: true })

watch(() => [
    expenseStore.expenses.length
], () => {
    void refreshDatabaseStats()
})

const confirmRemoveAllTickets = () => {
    confirmModal.title = t('settings.maintenance.confirm_remove_tickets_title')
    confirmModal.description = t('settings.maintenance.confirm_remove_tickets_all_desc')
    confirmModal.action = async () => {
        await expenseStore.removeAllTickets()
        await refreshStats()
        toast.add({ title: t('settings.maintenance.tickets_removed'), color: 'success' })
    }
    confirmModal.confirmLabel = t('settings.maintenance.remove_tickets')
    confirmModal.confirmColor = 'error'
    confirmModal.isOpen = true
}

// Strip ticket attachments for the year/month picked in the delete section,
// keeping the expense records themselves.
const confirmRemoveTicketsForSelection = () => {
    if (!maintenanceState.selectedYear) return
    const year = maintenanceState.selectedYear
    const month = maintenanceState.selectedMonth

    confirmModal.title = t('settings.maintenance.confirm_remove_tickets_title')
    confirmModal.description = t('settings.maintenance.confirm_remove_tickets_selection_desc')
    confirmModal.action = async () => {
        if (month) {
            await expenseStore.removeTicketsByMonth(year, month)
        } else {
            await expenseStore.removeTicketsByYear(year)
        }
        await refreshStats()
        toast.add({ title: t('settings.maintenance.tickets_removed'), color: 'success' })
    }
    confirmModal.confirmLabel = t('settings.maintenance.remove_tickets')
    confirmModal.confirmColor = 'error'
    confirmModal.isOpen = true
}

const confirmClearLegacyLocalStorage = () => {
    confirmModal.title = t('settings.maintenance.confirm_clear_legacy_title')
    confirmModal.description = t('settings.maintenance.confirm_clear_legacy_description')
    confirmModal.action = async () => {
        clearLegacyLocalStorageData()
        await refreshDatabaseStats()
        toast.add({ title: t('settings.maintenance.legacy_cleared'), color: 'success' })
    }
    confirmModal.confirmLabel = t('settings.maintenance.clear_legacy')
    confirmModal.confirmColor = 'error'
    confirmModal.isOpen = true
}

const handleConfirm = async () => {
    if (confirmModal.action) {
        await confirmModal.action()
    }
    confirmModal.isOpen = false
}

const isLoadingSample = ref(false)
const loadSampleData = async () => {
    isLoadingSample.value = true
    try {
        const samples = generateSampleExpenses()
        const existingIds = new Set(expenseStore.expenses.map(e => e.id))
        const newSamples = samples.filter(s => !existingIds.has(s.id))
        await expenseStore.setExpenses([...expenseStore.expenses, ...newSamples])
        await refreshStats()
        toast.add({
            title: t('settings.maintenance.sample_data_loaded', { count: newSamples.length }),
            color: 'success'
        })
    } catch (err) {
        console.error('Error loading sample data', err)
        toast.add({ title: t('common.error'), color: 'error' })
    } finally {
        isLoadingSample.value = false
    }
}
</script>

<template>
    <section class="space-y-4">
        <UCard>
            <template #header>
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-red-50 dark:bg-red-900/40 rounded-lg">
                        <UIcon name="i-heroicons-trash" class="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h2 class="text-xl font-semibold text-red-500">{{ $t('settings.maintenance.title') }}</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.maintenance.description') }}
                        </p>
                    </div>
                </div>
            </template>

            <div class="space-y-6">
                <div
                    class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">{{
                            $t('settings.maintenance.storage_usage')
                            }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{
                            $t('settings.maintenance.local_data') }}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-lg font-bold text-primary-600 dark:text-primary-400">{{
                            formatBytes(databaseStats.totalBytes) }}</p>
                        <p class="text-xs text-gray-500">{{ $t('settings.maintenance.total_expenses', {
                            count: expenseStore.expenses.length
                        }) }}</p>
                    </div>
                </div>

                <div
                    v-if="databaseStats.legacyLocalStorageBytes > 0"
                    class="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between gap-4">
                    <div>
                        <p class="text-sm font-medium text-emerald-900 dark:text-emerald-100">{{
                            $t('settings.maintenance.legacy_title') }}
                        </p>
                        <p class="text-xs text-emerald-700 dark:text-emerald-200 mt-1">{{
                            $t('settings.maintenance.legacy_description') }}</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="text-right">
                            <p class="text-lg font-bold text-emerald-700 dark:text-emerald-200">{{
                                formatBytes(databaseStats.legacyLocalStorageBytes) }}</p>
                            <p class="text-xs text-emerald-700 dark:text-emerald-200">{{
                                $t('settings.maintenance.legacy_keys', {
                                    count: databaseStats.legacyLocalStorageKeys.length
                                }) }}</p>
                        </div>
                        <UButton
                            color="warning" variant="ghost" icon="i-heroicons-trash" size="xs"
                            @click="confirmClearLegacyLocalStorage">
                            {{ $t('settings.maintenance.clear_legacy') }}
                        </UButton>
                    </div>
                </div>

                <div
                    class="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
                    <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">{{
                            $t('settings.maintenance.tickets_title') }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{
                            $t('settings.maintenance.tickets_description') }}</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="text-right">
                            <p class="text-lg font-bold text-primary-600 dark:text-primary-400">{{
                                formatBytes(ticketStats.bytes) }}</p>
                            <p class="text-xs text-gray-500">{{ $t('settings.maintenance.tickets_count', {
                                count: ticketStats.count }) }}</p>
                        </div>
                        <UButton
                            color="error" variant="ghost" icon="i-heroicons-trash" size="xs"
                            :disabled="ticketStats.count === 0" @click="confirmRemoveAllTickets">
                            {{ $t('settings.maintenance.remove_tickets') }}
                        </UButton>
                    </div>
                </div>


                <div
                    class="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 space-y-4">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm font-medium text-emerald-900 dark:text-emerald-100">{{
                                $t('settings.maintenance.storage_strategy.storage_limit_title')
                                }}</p>
                            <p class="text-xs text-emerald-700 dark:text-emerald-200 mt-1">{{
                                $t('settings.maintenance.storage_strategy.storage_limit_description')
                                }}</p>
                        </div>
                        <UBadge color="success" variant="soft">IndexedDB</UBadge>
                    </div>

                    <div
                        class="p-3 rounded-lg border border-emerald-200/70 dark:border-emerald-800/70 bg-white/70 dark:bg-gray-900/40">
                        <div class="flex items-center gap-2">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white">
                                {{ $t('settings.maintenance.storage_strategy.active_title') }}
                            </p>
                            <UBadge color="success" variant="subtle" size="xs">
                                {{ $t('settings.maintenance.storage_strategy.active') }}
                            </UBadge>
                        </div>
                        <p class="text-xs text-gray-600 dark:text-gray-300 mt-2">
                            {{ $t('settings.maintenance.storage_strategy.active_description') }}
                        </p>
                        <dl class="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-300">
                            <div>
                                <dt class="text-gray-500">{{ $t('settings.maintenance.storage_strategy.app_state') }}</dt>
                                <dd class="font-medium text-gray-900 dark:text-white">{{
                                    formatBytes(databaseStats.appStateBytes) }}</dd>
                            </div>
                            <div>
                                <dt class="text-gray-500">{{ $t('settings.maintenance.storage_strategy.attachments') }}</dt>
                                <dd class="font-medium text-gray-900 dark:text-white">{{
                                    formatBytes(databaseStats.attachmentBytes) }}</dd>
                            </div>
                            <div v-if="databaseStats.browserUsageBytes !== undefined">
                                <dt class="text-gray-500">{{ $t('settings.maintenance.storage_strategy.browser_usage') }}</dt>
                                <dd class="font-medium text-gray-900 dark:text-white">{{
                                    formatBytes(databaseStats.browserUsageBytes) }}</dd>
                            </div>
                            <div v-if="databaseStats.browserQuotaBytes !== undefined">
                                <dt class="text-gray-500">{{ $t('settings.maintenance.storage_strategy.browser_quota') }}</dt>
                                <dd class="font-medium text-gray-900 dark:text-white">{{
                                    formatBytes(databaseStats.browserQuotaBytes) }}</dd>
                            </div>
                        </dl>
                    </div>
                </div>

                <section class="space-y-4">
                    <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{
                        $t('settings.maintenance.delete_data')
                        }}
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <UFormField :label="$t('settings.maintenance.year')" name="deleteYear">
                            <USelect
v-model="maintenanceState.selectedYear" :items="availableYears"
                                :placeholder="$t('settings.maintenance.select_year')" class="w-full" />
                        </UFormField>
                        <UFormField :label="$t('settings.maintenance.month_optional')" name="deleteMonth">
                            <USelect
v-model="maintenanceState.selectedMonth" :items="availableMonthsForYear"
                                :disabled="!maintenanceState.selectedYear"
                                :placeholder="$t('settings.maintenance.entire_year')" class="w-full" />
                        </UFormField>
                    </div>

                    <UButton
block color="error" variant="soft" icon="i-heroicons-trash"
                        :disabled="!maintenanceState.selectedYear" @click="confirmDelete">
                        {{ deleteButtonLabel }}
                    </UButton>

                    <UButton
block color="warning" variant="ghost" icon="i-heroicons-paper-clip"
                        :disabled="!maintenanceState.selectedYear" @click="confirmRemoveTicketsForSelection">
                        {{ $t('settings.maintenance.remove_tickets_for_selection') }}
                    </UButton>
                </section>

                <!-- SAMPLE TEST DATA SECTION -->
                <section class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <UIcon name="i-heroicons-beaker" class="w-6 h-6" />
                        </div>
                        <div>
                            <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                                {{ $t('settings.maintenance.sample_data_title') }}
                            </h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                {{ $t('settings.maintenance.sample_data_description') }}
                            </p>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3">
                        <UButton
                            color="primary"
                            variant="soft"
                            icon="i-heroicons-sparkles"
                            :loading="isLoadingSample"
                            @click="loadSampleData">
                            {{ $t('settings.maintenance.load_sample_data') }}
                        </UButton>
                        <UButton
                            to="/datos-prueba-gastos.json"
                            target="_blank"
                            download="datos-prueba-gastos.json"
                            color="neutral"
                            variant="outline"
                            icon="i-heroicons-arrow-down-tray">
                            {{ $t('settings.maintenance.download_sample_json') }}
                        </UButton>
                    </div>
                </section>
            </div>

            <!-- Local Confirmation Modal -->
            <UModal
v-model:open="confirmModal.isOpen" :title="confirmModal.title"
                :description="confirmModal.description">
                <template #footer>
                    <UButton color="neutral" variant="ghost" @click="confirmModal.isOpen = false">{{ $t('common.cancel')
                        }}
                    </UButton>
                    <UButton :color="confirmModal.confirmColor" @click="handleConfirm">{{ confirmModal.confirmLabel }}
                    </UButton>
                </template>
            </UModal>
        </UCard>
    </section>
</template>
