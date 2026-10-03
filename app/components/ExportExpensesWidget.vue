<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  type PredefinedPeriod,
  filterExpensesByPeriod,
  formatPeriodDateLabel,
  formatIsoDateOnly
} from '~/utils/expensePeriods'
import { shareExpenses } from '~/utils/expenseShare'
import { generateSampleExpenses } from '~/utils/sampleData'

const expenseStore = useExpenseStore()
const { expenses } = storeToRefs(expenseStore)
const { t, locale } = useI18n()
const toast = useToast()

const selectedPeriod = ref<PredefinedPeriod>('current_month')

// Pre-fill custom dates with current month start and today
const now = new Date()
const defaultMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
const customStartDate = ref(formatIsoDateOnly(defaultMonthStart))
const customEndDate = ref(formatIsoDateOnly(now))

const isExporting = ref(false)

const periodOptions = computed(() => [
  { value: 'current_month', label: t('export_widget.periods.current_month') },
  { value: 'previous_month', label: t('export_widget.periods.previous_month') },
  { value: 'current_quarter', label: t('export_widget.periods.current_quarter') },
  { value: 'current_semester', label: t('export_widget.periods.current_semester') },
  { value: 'previous_semester', label: t('export_widget.periods.previous_semester') },
  { value: 'current_year', label: t('export_widget.periods.current_year') },
  { value: 'previous_year', label: t('export_widget.periods.previous_year') },
  { value: 'all', label: t('export_widget.periods.all') },
  { value: 'custom', label: t('export_widget.periods.custom') }
])

const isCustomPeriod = computed(() => selectedPeriod.value === 'custom')

const isCustomRangeValid = computed(() => {
  if (!isCustomPeriod.value) return true
  if (!customStartDate.value || !customEndDate.value) return false
  return customStartDate.value <= customEndDate.value
})

const periodCalculation = computed(() => {
  const customRange = isCustomPeriod.value
    ? { start: customStartDate.value, end: customEndDate.value }
    : undefined
  return filterExpensesByPeriod(expenses.value, selectedPeriod.value, customRange)
})

const filteredExpenses = computed(() => periodCalculation.value.filtered)
const activeDateRange = computed(() => periodCalculation.value.dateRange)

const formattedRangeText = computed(() =>
  formatPeriodDateLabel(activeDateRange.value, locale.value)
)

const totalAmount = computed(() =>
  filteredExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
)

const hasExpenses = computed(() => filteredExpenses.value.length > 0)

const canExport = computed(() =>
  hasExpenses.value && isCustomRangeValid.value && !isExporting.value
)

const handleExport = async () => {
  if (!canExport.value) return

  isExporting.value = true
  try {
    const periodName = isCustomPeriod.value
      ? formattedRangeText.value
      : t(`export_widget.periods.${selectedPeriod.value}`)

    const outcome = await shareExpenses(filteredExpenses.value, {
      locale: locale.value,
      categoryLabel: (category: string) => t(`expenses.categories.${category}`),
      title: `${t('export_widget.title')} - ${periodName}`,
      filenameDateRange: activeDateRange.value.filenameDateRange,
      periodLabel: periodName,
      dateRangeText: formattedRangeText.value
    })

    if (outcome === 'shared' || outcome === 'downloaded') {
      toast.add({
        title: t('export_widget.success_toast'),
        description: `${filteredExpenses.value.length} ${locale.value === 'ca' ? 'despeses' : 'gastos'} · ${totalAmount.value.toFixed(2)} € (PDF + CSV)`,
        color: 'success'
      })
    }
  } catch (err) {
    console.error('Error exporting expenses zip', err)
    toast.add({
      title: t('export_widget.error_toast'),
      color: 'error'
    })
  } finally {
    isExporting.value = false
  }
}

const isLoadingSample = ref(false)
const loadSampleData = async () => {
  isLoadingSample.value = true
  try {
    const samples = generateSampleExpenses()
    const existingIds = new Set(expenses.value.map(e => e.id))
    const newSamples = samples.filter(s => !existingIds.has(s.id))
    await expenseStore.setExpenses([...expenses.value, ...newSamples])
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
  <div
    class="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-sm relative overflow-hidden">
    <!-- Top Emerald Accent Bar -->
    <div
      class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600"
      aria-hidden="true"
    />

    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        <span
          class="size-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs border border-emerald-100 dark:border-emerald-900/50">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-6 h-6" />
        </span>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {{ $t('export_widget.title') }}
            </h2>
            <UBadge
              :label="$t('export_widget.badge')"
              color="primary"
              variant="subtle"
              size="xs"
              class="font-semibold"
            />
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ $t('export_widget.subtitle') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Main Controls & Preview -->
    <div class="space-y-4">
      <!-- Period Selector Row -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div :class="isCustomPeriod ? 'md:col-span-4' : 'md:col-span-7'">
          <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            {{ $t('export_widget.period_label') }}
          </label>
          <USelect
            v-model="selectedPeriod"
            :items="periodOptions"
            option-attribute="label"
            value-attribute="value"
            size="md"
            class="w-full"
          />
        </div>

        <!-- Custom Date Range Inputs (when selectedPeriod is 'custom') -->
        <template v-if="isCustomPeriod">
          <div class="md:col-span-4">
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {{ $t('export_widget.custom_from') }}
            </label>
            <UInput
              v-model="customStartDate"
              type="date"
              size="md"
              class="w-full"
            />
          </div>

          <div class="md:col-span-4">
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {{ $t('export_widget.custom_to') }}
            </label>
            <UInput
              v-model="customEndDate"
              type="date"
              size="md"
              class="w-full"
            />
          </div>
        </template>

        <!-- Export CTA Button (placed in row if not custom, or full width row on custom) -->
        <div :class="isCustomPeriod ? 'md:col-span-12' : 'md:col-span-5'">
          <UButton
            icon="i-heroicons-archive-box-arrow-down"
            color="primary"
            variant="solid"
            size="md"
            block
            :loading="isExporting"
            :disabled="!canExport"
            class="font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
            @click="handleExport">
            {{ isExporting ? $t('export_widget.exporting') : $t('export_widget.export_btn') }}
          </UButton>
        </div>
      </div>

      <!-- Validation Error for Custom Date Range -->
      <div
        v-if="isCustomPeriod && !isCustomRangeValid"
        class="flex items-center gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400">
        <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 shrink-0" />
        <span>{{ $t('export_widget.invalid_range') }}</span>
      </div>

      <!-- Live Summary Preview Box -->
      <div
        class="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <!-- Resolved Period Date Range -->
          <div class="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
            <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{{ formattedRangeText }}</span>
          </div>

          <!-- Total Purchases Found -->
          <div class="flex items-center gap-1.5 font-medium">
            <UIcon name="i-heroicons-shopping-bag" class="w-4 h-4 text-emerald-500 shrink-0" />
            <span v-if="hasExpenses" class="text-gray-900 dark:text-white font-semibold">
              {{ $t('export_widget.expenses_count', { count: filteredExpenses.length }) }}
            </span>
            <span v-else class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              {{ $t('export_widget.no_expenses') }}
              <UButton
                variant="link"
                color="primary"
                size="xs"
                icon="i-heroicons-sparkles"
                :loading="isLoadingSample"
                @click="loadSampleData">
                {{ $t('export_widget.load_sample_data') }}
              </UButton>
            </span>
          </div>

          <!-- Total Spent in this Period -->
          <div v-if="hasExpenses" class="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
            <UIcon name="i-heroicons-banknotes" class="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{{ $t('export_widget.total_amount', { amount: totalAmount.toFixed(2) }) }}</span>
          </div>
        </div>

        <!-- Contents badge list -->
        <div class="flex items-center gap-2 shrink-0 text-[11px] text-gray-500 dark:text-gray-400">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono">
            <UIcon name="i-heroicons-document-text" class="w-3.5 h-3.5 text-red-500" />
            PDF
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono">
            <UIcon name="i-heroicons-table-cells" class="w-3.5 h-3.5 text-emerald-500" />
            CSV
          </span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-mono">
            <UIcon name="i-heroicons-archive-box" class="w-3.5 h-3.5 text-blue-500" />
            ZIP
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
