<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  SUPERMARKET_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_HEX_COLORS,
  resolveExpenseCategory
} from '~/utils/expenseCategories'

const expenseStore = useExpenseStore()
const { expenses } = storeToRefs(expenseStore)
const { t } = useI18n()

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth) // 0 = all months

const months = computed(() => [
  { value: 0, label: t('statistics.all_months') },
  { value: 1, label: t('months.1') },
  { value: 2, label: t('months.2') },
  { value: 3, label: t('months.3') },
  { value: 4, label: t('months.4') },
  { value: 5, label: t('months.5') },
  { value: 6, label: t('months.6') },
  { value: 7, label: t('months.7') },
  { value: 8, label: t('months.8') },
  { value: 9, label: t('months.9') },
  { value: 10, label: t('months.10') },
  { value: 11, label: t('months.11') },
  { value: 12, label: t('months.12') }
])

const availableYears = computed(() => {
  const years = new Set([currentYear])
  expenses.value.forEach(e => {
    const d = new Date(e.timestamp)
    if (!Number.isNaN(d.getTime())) years.add(d.getFullYear())
  })
  return Array.from(years).sort((a, b) => b - a)
})

const filteredExpenses = computed(() => {
  return expenses.value.filter(expense => {
    const date = new Date(expense.timestamp)
    if (Number.isNaN(date.getTime())) return false
    if (date.getFullYear() !== selectedYear.value) return false
    if (selectedMonth.value !== 0 && date.getMonth() + 1 !== selectedMonth.value) return false
    return true
  })
})

const totalSpent = computed(() => {
  return filteredExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
})

const averageTicket = computed(() => {
  if (filteredExpenses.value.length === 0) return 0
  return Number((totalSpent.value / filteredExpenses.value.length).toFixed(2))
})

// Category Breakdown
const categoryStats = computed(() => {
  const totals: Record<string, { amount: number, count: number }> = {}

  SUPERMARKET_CATEGORIES.forEach(cat => {
    totals[cat] = { amount: 0, count: 0 }
  })

  filteredExpenses.value.forEach(expense => {
    if (expense.items && expense.items.length > 0) {
      expense.items.forEach(item => {
        const cat = item.category || 'alimentacion'
        if (!totals[cat]) totals[cat] = { amount: 0, count: 0 }
        totals[cat].amount += (item.price || 0)
        totals[cat].count += 1
      })
    } else {
      const cat = resolveExpenseCategory(expense)
      if (!totals[cat]) totals[cat] = { amount: 0, count: 0 }
      totals[cat].amount += (expense.amount || 0)
      totals[cat].count += 1
    }
  })

  const total = totalSpent.value || 1

  return SUPERMARKET_CATEGORIES.map(category => {
    const data = totals[category] || { amount: 0, count: 0 }
    const pct = totalSpent.value > 0 ? (data.amount / total) * 100 : 0
    return {
      category,
      label: t(`expenses.categories.${category}`),
      amount: data.amount,
      count: data.count,
      percentage: pct,
      icon: CATEGORY_ICONS[category] || 'i-heroicons-tag',
      color: CATEGORY_COLORS[category] || 'primary',
      hexColor: CATEGORY_HEX_COLORS[category] || '#10b981'
    }
  }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)
})

// Supermarket / Establishment Breakdown
const supermarketStats = computed(() => {
  const totals: Record<string, { amount: number, count: number }> = {}

  filteredExpenses.value.forEach(expense => {
    const market = expense.description.trim() || 'Sin especificar'
    if (!totals[market]) totals[market] = { amount: 0, count: 0 }
    totals[market].amount += (expense.amount || 0)
    totals[market].count += 1
  })

  const total = totalSpent.value || 1

  return Object.entries(totals).map(([market, data]) => ({
    market,
    amount: data.amount,
    count: data.count,
    percentage: totalSpent.value > 0 ? (data.amount / total) * 100 : 0
  })).sort((a, b) => b.amount - a.amount)
})

// Total Products Count
const totalProductsCount = computed(() => {
  return filteredExpenses.value.reduce((sum, e) => {
    return sum + (e.items?.length || 1)
  }, 0)
})

const monthLabel = computed(() => {
  return months.value.find(m => m.value === selectedMonth.value)?.label || ''
})
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Header with Filters -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {{ $t('statistics.title') }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {{ $t('statistics.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <USelect
          v-model="selectedMonth"
          :items="months"
          option-attribute="label"
          value-attribute="value"
          size="sm"
          class="w-38"
        />
        <USelect
          v-model="selectedYear"
          :items="availableYears.map(y => ({ value: y, label: String(y) }))"
          option-attribute="label"
          value-attribute="value"
          size="sm"
          class="w-24"
        />
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <span class="block text-xs font-semibold uppercase text-gray-400">Total Gastado</span>
        <span class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1 block">
          {{ totalSpent.toFixed(2) }} €
        </span>
        <span class="text-xs text-gray-500 mt-1 block">{{ monthLabel }} {{ selectedYear }}</span>
      </div>

      <div class="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <span class="block text-xs font-semibold uppercase text-gray-400">Compras Registradas</span>
        <span class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1 block">
          {{ filteredExpenses.length }}
        </span>
        <span class="text-xs text-gray-500 mt-1 block">Tickets totales</span>
      </div>

      <div class="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <span class="block text-xs font-semibold uppercase text-gray-400">Ticket Medio</span>
        <span class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1 block">
          {{ averageTicket.toFixed(2) }} €
        </span>
        <span class="text-xs text-gray-500 mt-1 block">Media por compra</span>
      </div>

      <div class="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
        <span class="block text-xs font-semibold uppercase text-gray-400">Artículos Comprados</span>
        <span class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1 block">
          {{ totalProductsCount }}
        </span>
        <span class="text-xs text-gray-500 mt-1 block">Productos en tickets</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredExpenses.length === 0" class="py-16 text-center rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <UIcon name="i-heroicons-chart-bar" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
        {{ $t('statistics.no_data') }}
      </p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- CATEGORY STATISTICS -->
      <div class="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ $t('statistics.by_category') }}
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Alimentación, frescos, limpieza, farmacia y otros
          </p>
        </div>

        <!-- Stacked visual bar -->
        <div class="w-full h-3 rounded-full flex overflow-hidden bg-gray-100 dark:bg-gray-800">
          <div
            v-for="cat in categoryStats"
            :key="cat.category"
            :style="{ width: `${cat.percentage}%`, backgroundColor: cat.hexColor }"
            class="h-full first:rounded-l-full last:rounded-r-full hover:opacity-90 transition-opacity"
            :title="`${cat.label}: ${cat.amount.toFixed(2)} €`"
          />
        </div>

        <div class="space-y-3 pt-2">
          <div
            v-for="cat in categoryStats"
            :key="cat.category"
            class="space-y-1.5 p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2">
                <span
                  class="size-6 rounded-lg flex items-center justify-center text-white"
                  :style="{ backgroundColor: cat.hexColor }">
                  <UIcon :name="cat.icon" class="w-3.5 h-3.5" />
                </span>
                <span class="font-bold text-gray-800 dark:text-gray-200">{{ cat.label }}</span>
                <span class="text-xs text-gray-400">({{ cat.count }} arts.)</span>
              </div>
              <div class="text-right">
                <span class="font-black text-gray-900 dark:text-white">{{ cat.amount.toFixed(2) }} €</span>
                <span class="text-xs text-gray-400 ml-1.5 font-medium">{{ cat.percentage.toFixed(1) }}%</span>
              </div>
            </div>

            <!-- Progress bar per category -->
            <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                :style="{ width: `${cat.percentage}%`, backgroundColor: cat.hexColor }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- SUPERMARKET / ESTABLISHMENT BREAKDOWN -->
      <div class="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ $t('statistics.by_supermarket') }}
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Dónde compras más frecuentemente y cuánto gastas
          </p>
        </div>

        <div class="space-y-3 pt-2">
          <div
            v-for="(market, idx) in supermarketStats"
            :key="market.market"
            class="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-1.5">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2.5">
                <span class="size-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                  {{ idx + 1 }}
                </span>
                <span class="font-bold text-gray-900 dark:text-white">{{ market.market }}</span>
                <span class="text-xs text-gray-400">({{ market.count }} compras)</span>
              </div>
              <div class="text-right">
                <span class="font-black text-gray-900 dark:text-white">{{ market.amount.toFixed(2) }} €</span>
                <span class="text-xs text-gray-400 ml-1.5 font-medium">{{ market.percentage.toFixed(1) }}%</span>
              </div>
            </div>

            <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-emerald-500 rounded-full"
                :style="{ width: `${market.percentage}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
