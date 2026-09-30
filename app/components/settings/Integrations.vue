<script setup lang="ts">
const googleMapsApiKey = defineModel<string>('googleMapsApiKey')
const openAiApiKey = defineModel<string>('openAiApiKey')
</script>

<template>
    <UCard>
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                    <UIcon name="i-heroicons-puzzle-piece" class="w-6 h-6 text-primary-500" />
                </div>
                <div>
                    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ $t('settings.integrations.title')
                    }}</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.integrations.description') }}
                    </p>
                </div>
            </div>
        </template>

        <div class="space-y-6">
            <UFormField :label="$t('settings.api_keys.label')" name="googleMapsApiKey">
                <UInput v-model="googleMapsApiKey" type="password" icon="i-heroicons-key" placeholder="AIza..." />
                <template #help>
                    {{ $t('settings.api_keys.description') }}
                    <NuxtLink
to="/help/maps"
                        class="text-sm text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium inline-flex items-center gap-1 mt-1">
                        <UIcon name="i-heroicons-question-mark-circle" class="w-4 h-4" /> {{
                            $t('settings.api_keys.help') }}
                    </NuxtLink>
                </template>
            </UFormField>

            <UFormField :label="$t('settings.openai.label')" name="openAiApiKey">
                <UInput v-model="openAiApiKey" type="password" icon="i-heroicons-sparkles" placeholder="sk-..." />
                <template #help>
                    <p>{{ $t('settings.openai.description') }}</p>
                    <p class="mt-1 text-emerald-600 dark:text-emerald-400">{{ $t('settings.openai.privacy') }}</p>
                </template>
            </UFormField>
        </div>
    </UCard>
</template>
