<script setup lang="ts">
import { validateSpanishId } from 'spain-id'

// Components are auto-imported due to naming convention (Settings/Language.vue -> <SettingsLanguage />)

const settingsStore = useSettingsStore()
const { t } = useI18n()
const toast = useToast()
const { provinces } = useLocations()

const formState = reactive({
  monthlyBudget: (settingsStore.monthlyBudget || 400) as number | string,
  halfDietPrice: (settingsStore.halfDietPrice || 0) as number | string,
  fullDietPrice: (settingsStore.fullDietPrice || 0) as number | string,
  googleMapsApiKey: settingsStore.googleMapsApiKey || '',
  openAiApiKey: settingsStore.openAiApiKey || '',
  firstName: settingsStore.firstName || '',
  lastName: settingsStore.lastName || '',
  nationalId: settingsStore.nationalId || '',
  reminderDay: settingsStore.reminder?.day || 1,
  reminderTime: settingsStore.reminder?.time || '09:00',
  reminderRecurring: settingsStore.reminder?.isRecurring ?? true,
  googleClientId: settingsStore.googleClientId || '',
  googleCalendarId: settingsStore.googleCalendarId || '',
  habitualRoute: (settingsStore.habitualRoute || []).map(d => ({ ...d, id: d.id || crypto.randomUUID() }))
})

const parseCurrency = (input: string | number) => {
  if (typeof input === 'number') return input
  // Replace commas with dots
  const normalized = String(input).replace(/,/g, '.')
  const val = parseFloat(normalized)
  return Number.isNaN(val) ? 0 : val
}

const saveSettings = async () => {
  if (formState.nationalId && !validateSpanishId(formState.nationalId)) {
    toast.add({ title: t('common.error'), description: 'DNI incorrecte', color: 'error' })
    return
  }

  const normalizedBudget = parseCurrency(formState.monthlyBudget)
  formState.monthlyBudget = normalizedBudget
  await settingsStore.updateMonthlyBudget(normalizedBudget)

  const normalizedHalfPrice = parseCurrency(formState.halfDietPrice)
  const normalizedFullPrice = parseCurrency(formState.fullDietPrice)

  // Update UI with parsed values
  formState.halfDietPrice = normalizedHalfPrice
  formState.fullDietPrice = normalizedFullPrice

  await settingsStore.updateDietPrices({
    half: normalizedHalfPrice,
    full: normalizedFullPrice
  })
  await settingsStore.updatePersonalData({
    firstName: formState.firstName,
    lastName: formState.lastName,
    nationalId: formState.nationalId.toUpperCase()
  })

  settingsStore.$patch({
    googleMapsApiKey: formState.googleMapsApiKey,
    openAiApiKey: formState.openAiApiKey,
    reminder: {
      day: formState.reminderDay,
      time: formState.reminderTime,
      isRecurring: formState.reminderRecurring
    },
    googleClientId: formState.googleClientId,
    googleCalendarId: formState.googleCalendarId
  })

  await settingsStore.updateHabitualRoute(formState.habitualRoute)
  toast.add({ title: t('common.success'), color: 'success' })
}

const hasChanges = computed(() => {
  const current = {
    halfDietPrice: Number(String(formState.halfDietPrice).replace(',', '.')) || 0,
    fullDietPrice: Number(String(formState.fullDietPrice).replace(',', '.')) || 0,
    googleMapsApiKey: formState.googleMapsApiKey,
    openAiApiKey: formState.openAiApiKey,
    firstName: formState.firstName,
    lastName: formState.lastName,
    nationalId: formState.nationalId,
    reminder: {
      day: formState.reminderDay,
      time: formState.reminderTime,
      isRecurring: formState.reminderRecurring
    },
    googleClientId: formState.googleClientId,
    googleCalendarId: formState.googleCalendarId,
    habitualRoute: formState.habitualRoute.map(d => ({
      province: d.province,
      municipality: d.municipality,
      hasLunch: d.hasLunch,
      hasDinner: d.hasDinner,
      observations: d.observations || ''
    }))
  }

  const saved = {
    halfDietPrice: settingsStore.halfDietPrice,
    fullDietPrice: settingsStore.fullDietPrice,
    googleMapsApiKey: settingsStore.googleMapsApiKey || '',
    openAiApiKey: settingsStore.openAiApiKey || '',
    firstName: settingsStore.firstName || '',
    lastName: settingsStore.lastName || '',
    nationalId: settingsStore.nationalId || '',
    reminder: {
      day: settingsStore.reminder?.day || 1,
      time: settingsStore.reminder?.time || '09:00',
      isRecurring: settingsStore.reminder?.isRecurring ?? true
    },
    googleClientId: settingsStore.googleClientId || '',
    googleCalendarId: settingsStore.googleCalendarId || '',
    habitualRoute: (settingsStore.habitualRoute || []).map(d => ({
      province: d.province,
      municipality: d.municipality,
      hasLunch: d.hasLunch,
      hasDinner: d.hasDinner,
      observations: d.observations || ''
    }))
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
  formState.halfDietPrice = settingsStore.halfDietPrice || 0
  formState.fullDietPrice = settingsStore.fullDietPrice || 0
  formState.googleMapsApiKey = settingsStore.googleMapsApiKey || ''
  formState.openAiApiKey = settingsStore.openAiApiKey || ''
  formState.firstName = settingsStore.firstName || ''
  formState.lastName = settingsStore.lastName || ''
  formState.nationalId = settingsStore.nationalId || ''
  formState.reminderDay = settingsStore.reminder?.day || 1
  formState.reminderTime = settingsStore.reminder?.time || '09:00'
  formState.reminderRecurring = settingsStore.reminder?.isRecurring ?? true
  formState.googleClientId = settingsStore.googleClientId || ''
  formState.googleCalendarId = settingsStore.googleCalendarId || ''
  formState.habitualRoute = (settingsStore.habitualRoute || []).map(d => ({ ...d, id: d.id || crypto.randomUUID() }))
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

    <!-- Personal Data -->
    <SettingsPersonalData
v-model:first-name="formState.firstName" v-model:last-name="formState.lastName"
      v-model:national-id="formState.nationalId" />

    <!-- Prices -->
    <SettingsPrices v-model:half-diet-price="formState.halfDietPrice" v-model:full-diet-price="formState.fullDietPrice" />

    <!-- Habitual Route -->
    <SettingsHabitualRoute v-model="formState.habitualRoute" :provinces="provinces" />

    <!-- Integrations -->
    <SettingsIntegrations
v-model:google-maps-api-key="formState.googleMapsApiKey"
      v-model:open-ai-api-key="formState.openAiApiKey"
      v-model:google-calendar-id="formState.googleCalendarId" @save="saveSettings" />

    <!-- Templates -->
    <SettingsTemplates />

    <!-- Reminders -->
    <SettingsReminders
v-model:reminder-day="formState.reminderDay" v-model:reminder-time="formState.reminderTime"
      v-model:reminder-recurring="formState.reminderRecurring" />

    <!-- Backup -->
    <SettingsBackup @imported="onBackupImported" />

    <!-- Maintenance -->
    <SettingsMaintenance />

    <UButton
      icon="i-heroicons-check-circle" color="primary" size="xl"
      class="page-floating-action fixed right-4 z-40 rounded-full shadow-xl sm:right-6"
      @click="saveSettings">
      {{ $t('settings.save') }}
    </UButton>

  </div>
</template>
