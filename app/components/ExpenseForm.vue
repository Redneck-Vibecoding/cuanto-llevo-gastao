<script setup lang="ts">
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { FormSubmitEvent } from '#ui/types'
import type { ExpenseRecord, ExpenseItem } from '~/stores/expenses'
import { utcToLocalInput, localInputToUtc } from '~/utils/datetime'
import {
  compressImageToDataUrl, processDocumentFile, fileToDataUrl, isImageFile,
  TicketProcessingError, MAX_TICKET_BYTES
} from '~/utils/ticket'
import { recognizeImages, parseReceiptText } from '~/utils/ocr'
import { analyzeReceiptWithOpenAi } from '~/utils/openAiReceipt'
import { renderPdfToImages } from '~/utils/pdf'
import {
  EXPENSE_CATEGORIES, SUPERMARKET_CATEGORIES, DEFAULT_EXPENSE_CATEGORY, resolveExpenseCategory,
  CATEGORY_ICONS, type ExpenseCategory
} from '~/utils/expenseCategories'

const props = withDefaults(defineProps<{
  initialData?: ExpenseRecord | null
}>(), {
  initialData: null
})

const emit = defineEmits<{
  (e: 'saved', expense: ExpenseRecord): void
}>()

const toast = useToast()
const expenseStore = useExpenseStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()

const isEditing = computed(() => Boolean(props.initialData))
const isLoading = ref(false)

const COMMON_SUPERMARKETS = [
  'Mercadona', 'Carrefour', 'Lidl', 'Dia', 'Alcampo', 'Consum', 'Eroski', 'Aldi', 'Ahorramas', 'Farmacia'
]

// State with items breakdown
const state = reactive({
  description: '',
  dateTime: '',
  amount: undefined as number | undefined,
  ticket: undefined as string | undefined,
  ticketId: undefined as string | undefined,
  ticketName: undefined as string | undefined,
  ticketType: undefined as string | undefined,
  ticketSize: undefined as number | undefined,
  category: DEFAULT_EXPENSE_CATEGORY as ExpenseCategory | undefined,
  items: [] as ExpenseItem[]
})

const categoryItems = computed(() => SUPERMARKET_CATEGORIES.map(value => ({
  value: value as ExpenseCategory,
  label: t(`expenses.categories.${value}`),
  icon: CATEGORY_ICONS[value] || 'i-heroicons-tag'
})))

const amountInput = ref('')
watch(amountInput, (raw) => {
  let cleaned = raw.replace(/[^0-9.,]/g, '')
  const firstSep = cleaned.search(/[.,]/)
  if (firstSep !== -1) {
    cleaned = cleaned.slice(0, firstSep + 1) + cleaned.slice(firstSep + 1).replace(/[.,]/g, '')
  }
  if (cleaned !== raw) {
    amountInput.value = cleaned
    return
  }
  if (cleaned === '') {
    state.amount = undefined
    return
  }
  const parsed = Number.parseFloat(cleaned.replace(',', '.'))
  state.amount = Number.isFinite(parsed) ? parsed : undefined
})

const selectSupermarket = (name: string) => {
  state.description = name
}

// Items management
const addItem = () => {
  state.items.push({
    id: `item-${Date.now()}-${state.items.length}`,
    name: '',
    quantity: 1,
    price: 0,
    category: DEFAULT_EXPENSE_CATEGORY
  })
}

const removeItem = (index: number) => {
  state.items.splice(index, 1)
}

const itemsTotal = computed(() => {
  return state.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
})

const calculateTotalFromItems = () => {
  const sum = itemsTotal.value
  if (sum > 0) {
    state.amount = Number(sum.toFixed(2))
    amountInput.value = sum.toFixed(2)
    toast.add({
      title: t('components.expense_form.total_calculated', { amount: sum.toFixed(2) }),
      color: 'success'
    })
  }
}

// Ticket handling
const uploadInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const isProcessingTicket = ref(false)

const isCropOpen = ref(false)
const cropSrc = ref<string | null>(null)
const pendingTicketName = ref('ticket.jpg')

const ticketIsImage = computed(() => Boolean(state.ticketType?.startsWith('image/')))
const ticketIsPdf = computed(() => state.ticketType === 'application/pdf')

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const ticketSize = computed(() => {
  if (!state.ticket && state.ticketSize) return formatBytes(state.ticketSize)
  if (!state.ticket) return null
  const base64 = state.ticket.slice(state.ticket.indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return formatBytes(Math.floor((base64.length * 3) / 4) - padding)
})

const triggerUpload = () => uploadInput.value?.click()
const triggerCamera = () => cameraInput.value?.click()

const notifyTicketError = (error: unknown) => {
  const reason = error instanceof TicketProcessingError ? error.reason : 'error'
  const maxMb = Math.round(MAX_TICKET_BYTES / (1024 * 1024))
  const messages: Record<string, string> = {
    too_large: t('components.expense_form.alerts.ticket_too_large', { size: maxMb }),
    invalid: t('components.expense_form.alerts.ticket_invalid'),
    error: t('components.expense_form.alerts.ticket_error')
  }
  toast.add({ title: messages[reason] || messages.error, color: 'error' })
}

async function onTicketSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (isImageFile(file)) {
    try {
      cropSrc.value = await fileToDataUrl(file)
      pendingTicketName.value = file.name || 'ticket.jpg'
      isCropOpen.value = true
    } catch (error) {
      notifyTicketError(error)
    }
    return
  }

  isProcessingTicket.value = true
  try {
    const ticket = await processDocumentFile(file)
    state.ticket = ticket.dataUrl
    state.ticketId = undefined
    state.ticketName = ticket.name
    state.ticketType = ticket.type
    state.ticketSize = undefined
  } catch (error) {
    notifyTicketError(error)
  } finally {
    isProcessingTicket.value = false
  }
}

async function onCropConfirm(blob: Blob, grayscale: boolean) {
  isProcessingTicket.value = true
  try {
    const ticket = await compressImageToDataUrl(blob, pendingTicketName.value, { grayscale })
    state.ticket = ticket.dataUrl
    state.ticketId = undefined
    state.ticketName = ticket.name
    state.ticketType = ticket.type
    state.ticketSize = undefined
  } catch (error) {
    notifyTicketError(error)
  } finally {
    isProcessingTicket.value = false
    cropSrc.value = null
  }
}

const onCropCancel = () => {
  cropSrc.value = null
}

const editTicket = () => {
  if (!state.ticket || !ticketIsImage.value) return
  cropSrc.value = state.ticket
  pendingTicketName.value = state.ticketName || 'ticket.jpg'
  isCropOpen.value = true
}

const removeTicket = () => {
  state.ticket = undefined
  state.ticketId = undefined
  state.ticketName = undefined
  state.ticketType = undefined
  state.ticketSize = undefined
}

const isViewerOpen = ref(false)
const viewTicket = () => {
  if (state.ticket) isViewerOpen.value = true
}

// OCR / AI extraction
const isExtracting = ref(false)
const extractProgress = ref(0)

async function extractFromTicket() {
  if (isExtracting.value || !state.ticket || (!ticketIsImage.value && !ticketIsPdf.value)) return
  isExtracting.value = true
  extractProgress.value = 0
  try {
    const images = ticketIsPdf.value
      ? await renderPdfToImages(state.ticket)
      : [state.ticket]
    if (images.length === 0) throw new Error('no_pages')

    const parsed = settingsStore.openAiApiKey
      ? await analyzeReceiptWithOpenAi(images, settingsStore.openAiApiKey)
      : parseReceiptText(await recognizeImages(images, (p) => { extractProgress.value = Math.round(p * 100) }))

    const filled: string[] = []
    if (parsed.description && !state.description.trim()) {
      state.description = parsed.description
      filled.push(parsed.description)
    }
    if (parsed.amount != null && state.amount == null) {
      amountInput.value = String(parsed.amount)
      filled.push(`${parsed.amount} €`)
    }
    if (parsed.dateTime && !isEditing.value) {
      state.dateTime = parsed.dateTime
      filled.push(t('components.expense_form.date'))
    } else if (parsed.date && !isEditing.value) {
      const currentTime = state.dateTime.split('T')[1] || formatLocalNow().split('T')[1]
      state.dateTime = `${parsed.date}T${currentTime}`
      filled.push(t('components.expense_form.date'))
    }

    // Populate detected items
    if (parsed.items && parsed.items.length > 0) {
      state.items = parsed.items.map((it, idx) => ({
        id: it.id || `ocr-item-${Date.now()}-${idx}`,
        name: it.name,
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice,
        price: it.price,
        category: it.category || 'alimentacion'
      }))
      filled.push(t('components.expense_form.items_count', { count: parsed.items.length }))

      if (state.amount == null) {
        const sum = state.items.reduce((acc, it) => acc + (it.price || 0), 0)
        state.amount = Number(sum.toFixed(2))
        amountInput.value = sum.toFixed(2)
      }
    }

    if (filled.length > 0) {
      toast.add({
        title: t('components.expense_form.alerts.ocr_success', { description: filled.join(', ') }),
        color: 'success'
      })
    } else {
      toast.add({ title: t('components.expense_form.alerts.ocr_empty'), color: 'warning' })
    }
  } catch (error) {
    console.error('OCR extraction failed', error)
    toast.add({ title: t('components.expense_form.alerts.ocr_error'), color: 'error' })
  } finally {
    isExtracting.value = false
  }
}

const schema = computed(() => z.object({
  description: z.string().min(1, t('components.expense_form.validation.description_required')),
  dateTime: z.string().min(1, t('components.expense_form.validation.date_required')),
  amount: z.number({ message: t('components.expense_form.validation.amount_required') })
    .positive(t('components.expense_form.validation.amount_positive')),
  category: z.custom<ExpenseCategory>(
    value => EXPENSE_CATEGORIES.includes(value as ExpenseCategory),
    { message: t('components.expense_form.validation.category_required') }
  )
}))

const formatLocalNow = () => utcToLocalInput(new Date().toISOString())

const resetState = () => {
  if (props.initialData) {
    state.description = props.initialData.description
    state.dateTime = utcToLocalInput(props.initialData.timestamp)
    state.amount = props.initialData.amount
    amountInput.value = props.initialData.amount != null ? String(props.initialData.amount) : ''
    state.ticket = props.initialData.ticket
    state.ticketId = props.initialData.ticketId
    state.ticketName = props.initialData.ticketName
    state.ticketType = props.initialData.ticketType
    state.ticketSize = props.initialData.ticketSize
    state.category = resolveExpenseCategory(props.initialData)
    state.items = props.initialData.items ? JSON.parse(JSON.stringify(props.initialData.items)) : []
  } else {
    state.description = ''
    state.dateTime = formatLocalNow()
    state.amount = undefined
    amountInput.value = ''
    state.ticket = undefined
    state.ticketId = undefined
    state.ticketName = undefined
    state.ticketType = undefined
    state.ticketSize = undefined
    state.category = 'alimentacion'
    state.items = []
  }
}

watch(() => props.initialData, resetState, { immediate: true })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function onSubmit(event: FormSubmitEvent<any>) {
  if (isLoading.value) return
  isLoading.value = true

  try {
    const baseRecord: ExpenseRecord = {
      id: props.initialData?.id || uuidv4(),
      description: event.data.description.trim(),
      timestamp: localInputToUtc(event.data.dateTime),
      amount: event.data.amount,
      category: event.data.category,
      items: state.items.length > 0 ? state.items : undefined,
      ...(state.ticket || state.ticketId
        ? {
            ticket: state.ticket,
            ticketId: state.ticketId,
            ticketName: state.ticketName,
            ticketType: state.ticketType,
            ticketSize: state.ticketSize
          }
        : {})
    }

    const saveResult = isEditing.value
      ? await expenseStore.updateExpense(baseRecord)
      : await expenseStore.addExpense(baseRecord)

    toast.add({
      title: isEditing.value
        ? t('components.expense_form.alerts.updated')
        : t('components.expense_form.alerts.saved'),
      description: saveResult.attachmentRemoved
        ? t('components.expense_form.alerts.ticket_removed_for_space')
        : undefined,
      color: saveResult.attachmentRemoved ? 'warning' : 'success'
    })

    if (!isEditing.value) {
      resetState()
    }

    emit('saved', saveResult.expense)
  } catch (error) {
    console.error('Error saving expense', error)
    toast.add({ title: t('components.expense_form.alerts.save_error'), color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const submitLabel = computed(() => isEditing.value
  ? t('components.expense_form.update')
  : t('components.expense_form.save'))
</script>

<template>
  <UForm :schema="schema" :state="state" class="flex flex-col gap-6" @submit="onSubmit">
    <!-- Ticket & OCR Section -->
    <UFormField
      name="ticket"
      class="rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-5 shadow-sm
             dark:border-emerald-800 dark:bg-emerald-950/25">
      <div class="mb-4 flex items-start gap-3">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600
                 font-bold text-white shadow-sm">1</span>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ $t('components.expense_form.ticket_step_title') }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {{ $t('components.expense_form.ticket_step_description') }}
          </p>
        </div>
      </div>

      <input
        ref="uploadInput" type="file" accept="image/*,application/pdf" class="hidden"
        @change="onTicketSelected">
      <input
        ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden"
        @change="onTicketSelected">

      <div v-if="!state.ticket && !state.ticketId" class="flex flex-wrap gap-3">
        <UButton
          icon="i-heroicons-arrow-up-tray" color="primary" variant="solid" size="lg"
          :loading="isProcessingTicket" @click="triggerUpload">
          {{ $t('components.expense_form.ticket_upload') }}
        </UButton>
        <UButton
          icon="i-heroicons-camera" color="neutral" variant="outline" size="lg"
          :loading="isProcessingTicket" @click="triggerCamera">
          {{ $t('components.expense_form.ticket_camera') }}
        </UButton>
      </div>

      <div
        v-else
        class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800 bg-white dark:bg-gray-900">
        <img
          v-if="ticketIsImage && state.ticket" :src="state.ticket" alt="ticket"
          class="h-16 w-16 cursor-pointer rounded object-cover border" @click="viewTicket">
        <UIcon v-else name="i-heroicons-document" class="h-10 w-10 text-gray-400" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{{ state.ticketName || 'Ticket adjunto' }}</p>
          <div class="flex items-center gap-2 text-xs">
            <span v-if="ticketSize" class="text-gray-400">{{ ticketSize }}</span>
            <button
              type="button" class="text-primary-600 hover:underline disabled:text-gray-400 disabled:no-underline font-semibold"
              :disabled="!state.ticket" @click="viewTicket">
              {{ $t('components.expense_form.ticket_view') }}
            </button>
          </div>
        </div>
        <UButton
          v-if="ticketIsImage" icon="i-heroicons-scissors" color="neutral" variant="ghost" size="xs"
          :aria-label="$t('components.expense_form.ticket_edit')" @click="editTicket" />
        <UButton
          icon="i-heroicons-trash" color="error" variant="ghost" size="xs"
          :aria-label="$t('components.expense_form.ticket_remove')" @click="removeTicket" />
      </div>

      <!-- OCR Extract Button -->
      <div
        v-if="state.ticket && (ticketIsImage || ticketIsPdf)"
        class="mt-4 rounded-xl border border-emerald-200 bg-white/90 p-3 dark:border-emerald-900 dark:bg-gray-900/80">
        <UButton
          icon="i-heroicons-sparkles" color="primary" variant="solid" size="lg" block
          :loading="isExtracting" @click="extractFromTicket">
          {{ isExtracting && extractProgress > 0
            ? `${$t('components.expense_form.ocr_progress', { progress: extractProgress })}`
            : $t('components.expense_form.ocr_action') }}
        </UButton>
        <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400 text-center">
          {{ $t('components.expense_form.ocr_hint') }}
        </p>
      </div>
    </UFormField>

    <!-- Supermarket / Establishment -->
    <UFormField :label="$t('components.expense_form.establishment')" name="description" required>
      <UInput
        v-model="state.description" icon="i-heroicons-shopping-bag"
        :placeholder="$t('components.expense_form.establishment_placeholder')" class="w-full" />
      <div class="mt-2 flex flex-wrap gap-1.5">
        <UBadge
          v-for="market in COMMON_SUPERMARKETS"
          :key="market"
          :label="market"
          variant="subtle"
          :color="state.description === market ? 'primary' : 'neutral'"
          class="cursor-pointer hover:opacity-80 transition-opacity"
          @click="selectSupermarket(market)"
        />
      </div>
    </UFormField>

    <!-- Date & Amount -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UFormField :label="$t('components.expense_form.date')" name="dateTime" required>
        <UInput v-model="state.dateTime" type="datetime-local" icon="i-heroicons-clock" class="w-full" />
      </UFormField>

      <UFormField :label="$t('components.expense_form.amount')" name="amount" required>
        <UInput
          v-model="amountInput" type="text" inputmode="decimal"
          icon="i-heroicons-banknotes" placeholder="0.00" class="w-full font-bold text-lg" />
        <template v-if="itemsTotal > 0" #help>
          <span class="text-xs text-gray-500">
            {{ $t('components.expense_form.items_sum') }}: <strong>{{ itemsTotal.toFixed(2) }} €</strong>
            <button
              type="button"
              class="ml-2 text-primary-600 dark:text-primary-400 hover:underline font-semibold"
              @click="calculateTotalFromItems">
              {{ $t('components.expense_form.use_as_total') }}
            </button>
          </span>
        </template>
      </UFormField>
    </div>

    <!-- Category -->
    <UFormField :label="$t('components.expense_form.category')" name="category" required>
      <USelect
        v-model="state.category" :items="categoryItems" option-attribute="label" value-attribute="value"
        icon="i-heroicons-tag" :placeholder="$t('components.expense_form.category_placeholder')" class="w-full" />
      <template #help>{{ $t('components.expense_form.category_hint') }}</template>
    </UFormField>

    <!-- Product Breakdown (Desglose de productos) -->
    <div class="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h4 class="font-semibold text-gray-900 dark:text-white">
            {{ $t('components.expense_form.items_title') }}
          </h4>
          <UBadge v-if="state.items.length > 0" :label="`${state.items.length}`" color="primary" variant="subtle" size="xs" />
        </div>
        <UButton
          icon="i-heroicons-plus" color="primary" variant="soft" size="xs"
          @click="addItem">
          {{ $t('components.expense_form.add_item') }}
        </UButton>
      </div>

      <p v-if="state.items.length === 0" class="text-xs text-gray-500 dark:text-gray-400 py-2">
        {{ $t('components.expense_form.items_hint') }}
      </p>

      <div v-else class="space-y-2.5">
        <div
          v-for="(item, index) in state.items"
          :key="item.id || index"
          class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs">
          <!-- Item Name -->
          <div class="flex-1">
            <UInput
              v-model="item.name"
              :placeholder="$t('components.expense_form.item_name_placeholder')"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Item Category -->
          <div class="w-full sm:w-44">
            <USelect
              v-model="item.category"
              :items="categoryItems"
              option-attribute="label"
              value-attribute="value"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Quantity -->
          <div class="w-20">
            <UInput
              v-model.number="item.quantity"
              type="number"
              step="any"
              min="0.01"
              :placeholder="$t('components.expense_form.item_qty')"
              size="sm"
              class="w-full text-center"
            />
          </div>

          <!-- Price -->
          <div class="w-28">
            <UInput
              v-model.number="item.price"
              type="number"
              step="0.01"
              min="0"
              :placeholder="$t('components.expense_form.item_price')"
              size="sm"
              icon="i-heroicons-currency-euro"
              class="w-full font-medium"
            />
          </div>

          <!-- Remove Item -->
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="sm"
            @click="removeItem(index)"
          />
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-sm">
          <span class="text-gray-500 font-medium">
            {{ $t('components.expense_form.items_total') }}: <strong class="text-gray-900 dark:text-white">{{ itemsTotal.toFixed(2) }} €</strong>
          </span>
          <UButton
            v-if="itemsTotal > 0 && state.amount !== itemsTotal"
            icon="i-heroicons-arrow-path"
            color="primary"
            variant="ghost"
            size="xs"
            @click="calculateTotalFromItems">
            {{ $t('components.expense_form.calculate_total') }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <TicketCropperModal
      v-model:open="isCropOpen" :src="cropSrc"
      @confirm="onCropConfirm" @cancel="onCropCancel" />

    <TicketViewerModal
      v-model:open="isViewerOpen" :src="state.ticket || null"
      :name="state.ticketName" :type="state.ticketType" />

    <div class="pt-4 border-t border-gray-200 dark:border-gray-800">
      <UButton type="submit" block size="xl" color="primary" :loading="isLoading">
        {{ submitLabel }}
      </UButton>
    </div>
  </UForm>
</template>
