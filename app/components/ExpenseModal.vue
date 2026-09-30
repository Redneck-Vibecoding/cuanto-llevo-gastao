<script setup lang="ts">
import type { ExpenseRecord } from '~/stores/expenses'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<{
  expense?: ExpenseRecord | null
}>(), {
  expense: null
})

const emit = defineEmits<{
  (e: 'saved', expense: ExpenseRecord): void
  (e: 'close'): void
}>()

const { t } = useI18n()

const title = computed(() => props.expense
  ? t('components.expense_list.modals.edit_title')
  : t('components.expense_list.modals.new_title'))

const description = computed(() => props.expense
  ? t('components.expense_list.modals.edit_desc')
  : t('components.expense_list.modals.new_desc'))

const handleClose = () => {
  open.value = false
  emit('close')
}

const handleSaved = (expense: ExpenseRecord) => {
  open.value = false
  emit('saved', expense)
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-gray-950/60 backdrop-blur-xs transition-opacity"
      @click="handleClose"
    />

    <!-- Dialog Box -->
    <div
      class="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200 dark:border-gray-800 dark:bg-gray-900 z-10">
      
      <!-- Modal Header -->
      <div class="flex shrink-0 items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
        <div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5 text-primary-500" />
            {{ title }}
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ description }}</p>
        </div>
        <UButton
          icon="i-heroicons-x-mark-20-solid"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="$t('common.cancel')"
          @click="handleClose"
        />
      </div>

      <!-- Scrollable Form Container -->
      <div class="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        <ExpenseForm
          :initial-data="expense"
          @saved="handleSaved"
        />
      </div>
    </div>
  </div>
</template>
