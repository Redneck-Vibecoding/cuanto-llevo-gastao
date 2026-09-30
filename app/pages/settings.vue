<script setup lang="ts">
const settingsStore = useSettingsStore()
const { t } = useI18n()
const toast = useToast()

const formState = reactive({
  monthlyBudget: (settingsStore.monthlyBudget || 400) as number | string,
  openAiApiKey: settingsStore.openAiApiKey || ''
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
    openAiApiKey: formState.openAiApiKey
  })

  toast.add({ title: t('common.success'), color: 'success' })
}

const hasChanges = computed(() => {
  const current = {
    monthlyBudget: parseCurrency(formState.monthlyBudget),
    openAiApiKey: formState.openAiApiKey
  }

  const saved = {
    monthlyBudget: settingsStore.monthlyBudget || 400,
    openAiApiKey: settingsStore.openAiApiKey || ''
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
  formState.openAiApiKey = settingsStore.openAiApiKey || ''
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
          <h2 class="text-base font-bold text-gray-900 dark:text-white">{{ $t('settings.budget.title') }}</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ $t('settings.budget.description') }}
          </p>
        </div>
      </div>

      <UFormField :label="$t('settings.budget.label')" name="monthlyBudget">
        <UInput
          v-model="formState.monthlyBudget"
          type="text"
          inputmode="decimal"
          icon="i-heroicons-currency-euro"
          placeholder="400.00"
          class="w-full text-lg font-bold"
        />
        <template #help>
          {{ $t('settings.budget.help') }}
        </template>
      </UFormField>
    </div>

    <!-- OpenAI API Key -->
    <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <div class="flex items-center gap-3 mb-4">
        <span class="size-10 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
          <UIcon name="i-heroicons-sparkles" class="w-6 h-6" />
        </span>
        <div>
          <h2 class="text-base font-bold text-gray-900 dark:text-white">{{ $t('settings.openai.label') }}</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ $t('settings.openai.description') }}
          </p>
        </div>
      </div>

      <UFormField :label="$t('settings.openai.label')" name="openAiApiKey">
        <UInput v-model="formState.openAiApiKey" type="password" icon="i-heroicons-sparkles" placeholder="sk-..." />
        <template #help>
          <p class="text-emerald-600 dark:text-emerald-400">{{ $t('settings.openai.privacy') }}</p>
        </template>
      </UFormField>
    </div>

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
