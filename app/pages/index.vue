<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  SUPERMARKET_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_HEX_COLORS,
  resolveExpenseCategory
} from '~/utils/expenseCategories'
import type { ExpenseRecord } from '~/stores/expenses'

const expenseStore = useExpenseStore()
const settingsStore = useSettingsStore()
const { expenses } = storeToRefs(expenseStore)
const { t } = useI18n()
const toast = useToast()

// Date filtering (current month by default)
const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth)

const months = computed(() => [
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

const isCurrentMonthView = computed(() => {
  return selectedYear.value === currentYear && selectedMonth.value === currentMonth
})

// Filter expenses for selected month
const monthExpenses = computed(() => {
  return expenses.value.filter(expense => {
    const date = new Date(expense.timestamp)
    if (Number.isNaN(date.getTime())) return false
    return date.getFullYear() === selectedYear.value && date.getMonth() + 1 === selectedMonth.value
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

// Total spent this month
const totalSpentMonth = computed(() => {
  return monthExpenses.value.reduce((sum, e) => sum + (e.amount || 0), 0)
})

// Budget calculations
const currentBudget = computed(() => settingsStore.monthlyBudget || 400)
const budgetPercentage = computed(() => {
  if (currentBudget.value <= 0) return 0
  return Math.round((totalSpentMonth.value / currentBudget.value) * 100)
})

const budgetDifference = computed(() => {
  return currentBudget.value - totalSpentMonth.value
})

const isBudgetExceeded = computed(() => budgetDifference.value < 0)

// Category Breakdown Calculation
// Takes into account product item breakdown when present, or main ticket category otherwise
const categoryStats = computed(() => {
  const totals: Record<string, { amount: number, itemsCount: number }> = {}

  SUPERMARKET_CATEGORIES.forEach(cat => {
    totals[cat] = { amount: 0, itemsCount: 0 }
  })

  monthExpenses.value.forEach(expense => {
    if (expense.items && expense.items.length > 0) {
      expense.items.forEach(item => {
        const cat = item.category || 'alimentacion'
        if (!totals[cat]) totals[cat] = { amount: 0, itemsCount: 0 }
        totals[cat].amount += (item.price || 0)
        totals[cat].itemsCount += 1
      })
    } else {
      const cat = resolveExpenseCategory(expense)
      if (!totals[cat]) totals[cat] = { amount: 0, itemsCount: 0 }
      totals[cat].amount += (expense.amount || 0)
      totals[cat].itemsCount += 1
    }
  })

  const total = totalSpentMonth.value || 1

  return SUPERMARKET_CATEGORIES.map(category => {
    const data = totals[category] || { amount: 0, itemsCount: 0 }
    const pct = totalSpentMonth.value > 0 ? (data.amount / total) * 100 : 0
    return {
      category,
      label: t(`expenses.categories.${category}`),
      amount: data.amount,
      itemsCount: data.itemsCount,
      percentage: pct,
      icon: CATEGORY_ICONS[category] || 'i-heroicons-tag',
      color: CATEGORY_COLORS[category] || 'primary',
      hexColor: CATEGORY_HEX_COLORS[category] || '#10b981'
    }
  }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)
})

// Daily average in current month
const dailyAverage = computed(() => {
  const today = new Date()
  const daysInCalc = isCurrentMonthView.value ? today.getDate() : 30
  if (daysInCalc <= 0 || totalSpentMonth.value <= 0) return 0
  return Number((totalSpentMonth.value / daysInCalc).toFixed(2))
})

const averageTicket = computed(() => {
  if (monthExpenses.value.length === 0) return 0
  return Number((totalSpentMonth.value / monthExpenses.value.length).toFixed(2))
})

// Modals
const isFormModalOpen = ref(false)
const editingExpense = ref<ExpenseRecord | null>(null)
const isBudgetModalOpen = ref(false)
const tempBudget = ref(currentBudget.value)
const isViewerOpen = ref(false)
const viewingTicket = ref<string | null>(null)
const viewingTicketName = ref<string | undefined>(undefined)

// Expanded tickets to view item breakdown
const expandedTicketIds = ref<Set<string>>(new Set())

const toggleExpandTicket = (id: string) => {
  if (expandedTicketIds.value.has(id)) {
    expandedTicketIds.value.delete(id)
  } else {
    expandedTicketIds.value.add(id)
  }
}

const openNewExpense = () => {
  editingExpense.value = null
  isFormModalOpen.value = true
}

const openEditExpense = (expense: ExpenseRecord) => {
  editingExpense.value = expense
  isFormModalOpen.value = true
}

const handleExpenseSaved = () => {
  isFormModalOpen.value = false
  editingExpense.value = null
}

const openBudgetModal = () => {
  tempBudget.value = currentBudget.value
  isBudgetModalOpen.value = true
}

const saveBudget = async () => {
  if (tempBudget.value > 0) {
    await settingsStore.updateMonthlyBudget(tempBudget.value)
    isBudgetModalOpen.value = false
    toast.add({ title: 'Presupuesto actualizado', color: 'success' })
  }
}

const viewTicketAttachment = (expense: ExpenseRecord) => {
  if (expense.ticket) {
    viewingTicket.value = expense.ticket
    viewingTicketName.value = expense.ticketName
    isViewerOpen.value = true
  }
}

const deleteExpense = async (id: string) => {
  if (confirm('¿Eliminar esta compra?')) {
    await expenseStore.deleteExpense(id)
    toast.add({ title: 'Compra eliminada', color: 'success' })
  }
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const monthName = computed(() => {
  return months.value.find(m => m.value === selectedMonth.value)?.label || ''
})
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Header with Month Filter -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {{ $t('dashboard.title') }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {{ $t('dashboard.subtitle') }}
        </p>
      </div>

      <!-- Month & Year Selector -->
      <div class="flex items-center gap-2">
        <USelect
          v-model="selectedMonth"
          :items="months"
          option-attribute="label"
          value-attribute="value"
          size="sm"
          class="w-36"
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

    <!-- MAIN HIGHLIGHT CARD: Spent vs Budget -->
    <div
      class="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 shadow-sm">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <!-- Spent Info -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {{ $t('dashboard.spent_this_month') }} ({{ monthName }})
            </span>
            <UBadge
              v-if="isCurrentMonthView"
              label="En curso"
              color="primary"
              variant="subtle"
              size="xs"
            />
          </div>
          <div class="flex items-baseline gap-3">
            <span class="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              {{ totalSpentMonth.toFixed(2) }} €
            </span>
          </div>

          <!-- Remaining or Exceeded -->
          <div class="flex items-center gap-2 text-sm pt-1">
            <UIcon
              :name="isBudgetExceeded ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-check-circle'"
              :class="isBudgetExceeded ? 'text-red-500' : 'text-emerald-500'"
              class="w-5 h-5 shrink-0"
            />
            <span v-if="!isBudgetExceeded" class="font-medium text-gray-700 dark:text-gray-200">
              {{ $t('dashboard.budget_remaining', { amount: budgetDifference.toFixed(2) }) }}
            </span>
            <span v-else class="font-medium text-red-600 dark:text-red-400">
              {{ $t('dashboard.budget_exceeded', { amount: Math.abs(budgetDifference).toFixed(2) }) }}
            </span>
          </div>
        </div>

        <!-- Budget & Action Controls -->
        <div class="lg:text-right space-y-3">
          <div class="inline-flex items-center gap-2 p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
            <div class="text-left px-2">
              <span class="block text-xs text-gray-400 dark:text-gray-500 font-medium">Presupuesto</span>
              <span class="text-lg font-bold text-gray-900 dark:text-white">{{ currentBudget.toFixed(2) }} €</span>
            </div>
            <UButton
              icon="i-heroicons-pencil-square"
              color="neutral"
              variant="subtle"
              size="xs"
              @click="openBudgetModal">
              {{ $t('dashboard.edit_budget') }}
            </UButton>
          </div>

          <div class="flex flex-wrap gap-2.5 lg:justify-end">
            <UButton
              icon="i-heroicons-plus"
              color="primary"
              variant="solid"
              size="lg"
              class="font-semibold shadow-xs"
              @click="openNewExpense">
              {{ $t('dashboard.new_expense') }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- PROGRESS BAR -->
      <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
        <div class="flex items-center justify-between text-xs font-semibold mb-2">
          <span class="text-gray-500 dark:text-gray-400">
            {{ budgetPercentage }}% {{ $t('dashboard.budget_pct', { pct: '' }) }}
          </span>
          <span class="text-gray-700 dark:text-gray-300">
            {{ totalSpentMonth.toFixed(2) }} € / {{ currentBudget.toFixed(2) }} €
          </span>
        </div>

        <!-- Dynamic progress bar -->
        <div class="w-full h-3.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
          <div
            class="h-full rounded-full transition-all duration-500"
            :class="{
              'bg-emerald-500': budgetPercentage < 75,
              'bg-amber-500': budgetPercentage >= 75 && budgetPercentage < 100,
              'bg-red-500': budgetPercentage >= 100
            }"
            :style="{ width: `${Math.min(budgetPercentage, 100)}%` }"
          />
        </div>
      </div>

      <!-- QUICK STATS ROW -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center sm:text-left">
        <div class="p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40">
          <span class="block text-xs text-gray-500 dark:text-gray-400 font-medium">{{ $t('dashboard.total_tickets') }}</span>
          <span class="text-xl font-bold text-gray-900 dark:text-white mt-0.5 block">
            {{ monthExpenses.length }}
          </span>
        </div>
        <div class="p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40">
          <span class="block text-xs text-gray-500 dark:text-gray-400 font-medium">{{ $t('dashboard.avg_ticket') }}</span>
          <span class="text-xl font-bold text-gray-900 dark:text-white mt-0.5 block">
            {{ averageTicket.toFixed(2) }} €
          </span>
        </div>
        <div class="p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 col-span-2 sm:col-span-1">
          <span class="block text-xs text-gray-500 dark:text-gray-400 font-medium">{{ $t('dashboard.daily_average') }}</span>
          <span class="text-xl font-bold text-gray-900 dark:text-white mt-0.5 block">
            {{ dailyAverage.toFixed(2) }} € / día
          </span>
        </div>
      </div>
    </div>

    <!-- PRODUCT CATEGORY BREAKDOWN -->
    <div class="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ $t('dashboard.categories_overview') }}
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Distribución según productos desglosados de cada compra
          </p>
        </div>
        <NuxtLink to="/statistics">
          <UButton variant="ghost" color="primary" size="xs" icon="i-heroicons-chart-bar">
            Ver estadísticas completas
          </UButton>
        </NuxtLink>
      </div>

      <div v-if="categoryStats.length === 0" class="py-6 text-center text-sm text-gray-400">
        No hay datos de categorías para este mes.
      </div>

      <div v-else class="space-y-4">
        <!-- Multi-colored category distribution bar -->
        <div class="w-full h-3 rounded-full flex overflow-hidden bg-gray-100 dark:bg-gray-800">
          <div
            v-for="cat in categoryStats"
            :key="cat.category"
            :style="{ width: `${cat.percentage}%`, backgroundColor: cat.hexColor }"
            class="h-full first:rounded-l-full last:rounded-r-full hover:opacity-90 transition-opacity"
            :title="`${cat.label}: ${cat.amount.toFixed(2)} € (${cat.percentage.toFixed(1)}%)`"
          />
        </div>

        <!-- Category Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          <div
            v-for="cat in categoryStats"
            :key="cat.category"
            class="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-2.5 min-w-0">
              <span
                class="size-8 shrink-0 rounded-xl flex items-center justify-center text-white"
                :style="{ backgroundColor: cat.hexColor }">
                <UIcon :name="cat.icon" class="w-4 h-4" />
              </span>
              <div class="min-w-0">
                <span class="block truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {{ cat.label }}
                </span>
                <span class="block text-[11px] text-gray-400 font-medium">
                  {{ cat.percentage.toFixed(1) }}% · {{ cat.itemsCount }} arts.
                </span>
              </div>
            </div>
            <span class="font-bold text-sm text-gray-900 dark:text-white shrink-0">
              {{ cat.amount.toFixed(2) }} €
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- RECENT PURCHASES WITH PRODUCT BREAKDOWN ACCORDION -->
    <div class="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white">
          {{ $t('dashboard.recent_purchases') }}
        </h2>
        <NuxtLink to="/expenses">
          <UButton variant="ghost" color="primary" size="xs">
            {{ $t('dashboard.view_all') }}
          </UButton>
        </NuxtLink>
      </div>

      <div v-if="monthExpenses.length === 0" class="py-10 text-center">
        <UIcon name="i-heroicons-shopping-bag" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ $t('dashboard.no_purchases_month') }}
        </p>
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          variant="soft"
          size="sm"
          class="mt-4"
          @click="openNewExpense">
          {{ $t('dashboard.new_expense') }}
        </UButton>
      </div>

      <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="expense in monthExpenses"
          :key="expense.id"
          class="py-4 first:pt-0 last:pb-0 space-y-2">
          <!-- Main Ticket Row -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <span class="size-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <UIcon name="i-heroicons-shopping-bag" class="w-5 h-5" />
              </span>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                    {{ expense.description }}
                  </h3>
                  <UBadge
                    v-if="expense.items && expense.items.length > 0"
                    :label="`${expense.items.length} arts.`"
                    color="primary"
                    variant="subtle"
                    size="xs"
                    class="cursor-pointer"
                    @click="toggleExpandTicket(expense.id)"
                  />
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{{ formatDate(expense.timestamp) }}</span>
                  <span v-if="expense.location?.label" class="truncate max-w-[140px]">
                    · {{ expense.location.label }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Price and Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white">
                {{ expense.amount.toFixed(2) }} €
              </span>

              <UButton
                v-if="expense.ticket"
                icon="i-heroicons-document-text"
                color="neutral"
                variant="ghost"
                size="xs"
                title="Ver comprobante"
                @click="viewTicketAttachment(expense)"
              />

              <UButton
                v-if="expense.items && expense.items.length > 0"
                :icon="expandedTicketIds.has(expense.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="toggleExpandTicket(expense.id)"
              />

              <UDropdownMenu
                :items="[
                  [{
                    label: 'Editar',
                    icon: 'i-heroicons-pencil-square',
                    onSelect: () => openEditExpense(expense)
                  }],
                  [{
                    label: 'Eliminar',
                    icon: 'i-heroicons-trash',
                    color: 'error',
                    onSelect: () => deleteExpense(expense.id)
                  }]
                ]">
                <UButton icon="i-heroicons-ellipsis-vertical" color="neutral" variant="ghost" size="xs" />
              </UDropdownMenu>
            </div>
          </div>

          <!-- Product Breakdown (Accordion) -->
          <div
            v-if="expense.items && expense.items.length > 0 && expandedTicketIds.has(expense.id)"
            class="mt-2 ml-13 pl-3 border-l-2 border-primary-200 dark:border-primary-800 space-y-1.5 py-1 text-xs">
            <div
              v-for="item in expense.items"
              :key="item.id"
              class="flex items-center justify-between text-gray-600 dark:text-gray-300 py-0.5">
              <div class="flex items-center gap-2 truncate">
                <UBadge
                  v-if="item.category"
                  :label="$t(`expenses.categories.${item.category}`)"
                  :color="CATEGORY_COLORS[item.category] || 'neutral'"
                  variant="subtle"
                  size="xs"
                />
                <span class="truncate font-medium">{{ item.name }}</span>
                <span v-if="item.quantity && item.quantity > 1" class="text-gray-400">
                  (x{{ item.quantity }})
                </span>
              </div>
              <span class="font-semibold text-gray-800 dark:text-gray-200 shrink-0">
                {{ item.price.toFixed(2) }} €
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FORM MODAL -->
    <ExpenseModal
      v-model:open="isFormModalOpen"
      :expense="editingExpense"
      @saved="handleExpenseSaved"
      @close="editingExpense = null"
    />

    <!-- BUDGET MODAL -->
    <UModal v-model:open="isBudgetModalOpen" :title="$t('dashboard.set_budget_title')">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {{ $t('dashboard.set_budget_description') }}
          </p>
          <UFormField :label="$t('dashboard.budget_input_label')" name="budget">
            <UInput
              v-model.number="tempBudget"
              type="number"
              min="0"
              step="10"
              icon="i-heroicons-banknotes"
              class="w-full text-lg font-bold"
            />
          </UFormField>
          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="outline" @click="isBudgetModalOpen = false">
              Cancelar
            </UButton>
            <UButton color="primary" @click="saveBudget">
              Guardar presupuesto
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- TICKET ATTACHMENT VIEWER MODAL -->
    <TicketViewerModal
      v-model:open="isViewerOpen"
      :src="viewingTicket"
      :name="viewingTicketName"
    />
  </div>
</template>
