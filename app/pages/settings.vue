<script setup lang="ts">
const settingsStore = useSettingsStore()
const { t } = useI18n()
const toast = useToast()

const formState = reactive({
  monthlyBudget: (settingsStore.monthlyBudget || 400) as number | string,
  googleMapsApiKey: settingsStore.googleMapsApiKey || '',
  openAiApiKey: settingsStore.openAiApiKey || '',
  reminderDay: settingsStore.reminder?.day || 1,
  reminderTime: settingsStore.reminder?.time || '09:00',
  reminderRecurring: settingsStore.reminder?.isRecurring ?? true
})

const parseCurrency = (input: string | number) => {
  if (typeof input === 'number') return input
  const normalized = String(input).replace(/,/g, '.')
  const val = parseFloat(normalized)
  return Number.isNaN(val) ? 0 : val
}

const saveSettings = async () => {
  const normalizedBudget = parseCurrency(formState.monthlyBudget)
  formState.monthlyBudget = normalizedBudget
  await settingsStore.updateMonthlyBudget(normalizedBudget)

  settingsStore.$patch({
    googleMapsApiKey: formState.googleMapsApiKey,
    openAiApiKey: formState.openAiApiKey,
    reminder: {
      day: formState.reminderDay,
      time: formState.reminderTime,
      isRecurring: formState.reminderRecurring
    }
  })

  toast.add({ title: t('common.success'), color: 'success' })
}

const hasChanges = computed(() => {
  const current = {
    monthlyBudget: parseCurrency(formState.monthlyBudget),
    googleMapsApiKey: formState.googleMapsApiKey,
    openAiApiKey: formState.openAiApiKey,
    reminder: {
      day: formState.reminderDay,
      time: formState.reminderTime,
      isRecurring: formState.reminderRecurring
    }
  }

  const saved = {
    monthlyBudget: settingsStore.monthlyBudget || 400,
    googleMapsApiKey: settingsStore.googleMapsApiKey || '',
    openAiApiKey: settingsStore.openAiApiKey || '',
    reminder: {
      day: settingsStore.reminder?.day || 1,
      time: settingsStore.reminder?.time || '09:00',
      isRecurring: settingsStore.reminder?.isRecurring ?? true
    }
  }

  return JSON.stringify(current) !== JSON.stringify(saved)
})

onBeforeRouteLeave((to, from, next) => {
  if (hasChanges.value) {
    const answer = window.confirm('Tens canvis sense guardar. Segur que vols sortir?')
    if (answer) next()
    else next(false)
  } else {
    next()
  }
})

// Refresh Logic when import happens
const onBackupImported = () => {
  formState.monthlyBudget = settingsStore.monthlyBudget || 400
  formState.googleMapsApiKey = settingsStore.googleMapsApiKey || ''
  formState.openAiApiKey = settingsStore.openAiApiKey || ''
  formState.reminderDay = settingsStore.reminder?.day || 1
  formState.reminderTime = settingsStore.reminder?.time || '09:00'
  formState.reminderRecurring = settingsStore.reminder?.isRecurring ?? true
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="border-b border-gray-200 pb-6 dark:border-gray-800">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.title') }}</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-2">
          {{ $t('settings.description') }}
        </p>
      </div>
    </div>

    <!-- Language -->
    <SettingsLanguage />

    <!-- Monthly Budget -->
    <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-4">
        <span class="size-10 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
          <UIcon name="i-heroicons-banknotes" class="w-6 h-6" />
        </span>
        <div>
          <h2 class="text-base font-bold text-gray-900 dark:text-white">Presupuesto Mensual</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Define tu objetivo o límite de gasto mensual para compras de supermercado
          </p>
        </div>
      </div>

      <UFormField label="Límite mensual (€)" name="monthlyBudget">
        <UInput
          v-model="formState.monthlyBudget"
          type="text"
          inputmode="decimal"
          icon="i-heroicons-currency-euro"
          placeholder="400.00"
          class="w-full text-lg font-bold"
        />
        <template #help>
          Este importe se utiliza en el inicio para calcular el porcentaje gastado y avisarte si te excedes.
        </template>
      </UFormField>
    </div>

    <!-- Integrations (OpenAI API key & Google Maps) -->
    <SettingsIntegrations
      v-model:google-maps-api-key="formState.googleMapsApiKey"
      v-model:open-ai-api-key="formState.openAiApiKey"
    />

    <!-- Reminders -->
    <SettingsReminders
      v-model:reminder-day="formState.reminderDay"
      v-model:reminder-time="formState.reminderTime"
      v-model:reminder-recurring="formState.reminderRecurring"
    />

    <!-- Backup -->
    <SettingsBackup @imported="onBackupImported" />

    <!-- Maintenance -->
    <SettingsMaintenance />

    <UButton
      icon="i-heroicons-check-circle"
      color="primary"
      size="xl"
      class="page-floating-action fixed right-4 z-40 rounded-full shadow-xl sm:right-6"
      @click="saveSettings">
      {{ $t('settings.save') }}
    </UButton>
  </div>
</template>
