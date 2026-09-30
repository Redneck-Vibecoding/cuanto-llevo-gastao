<script setup lang="ts">
definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="space-y-6 pb-10">

    <UBreadcrumb
      :items="[
        { label: 'Inici', to: '/' },
        { label: 'Ajuda', to: '/help' },
        { label: 'API Google Maps' }
      ]"
    />
    <div class="border-b border-gray-200 dark:border-gray-800 pb-6">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">API de Google Maps</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-2">
        Configura la teva clau d'API per a l'autocompletat i geolocalització de supermercats i establiments.
      </p>
    </div>

    <!-- Google Maps API Section -->
    <section>
      <UCard>
        <template #header>
          <h3 class="font-semibold text-lg">Com obtenir la teua API Key</h3>
        </template>
        
        <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Per a que l'autocompletat de supermercats, la cerca d'establiments i la detecció de la ubicació de compra funcionin, necessites una <strong>API Key de Google Maps</strong> amb les APIs necessàries habilitades. Segueix aquests passos:
          </p>

          <ol class="list-decimal list-inside space-y-3 ml-2">
            <li>
              <strong>Crea un projecte a Google Cloud:</strong>
              <div class="ml-5 mt-1">
                Ves a la <a href="https://console.cloud.google.com/" target="_blank" class="text-primary-500 hover:underline">Google Cloud Console</a> i crea un nou projecte.
              </div>
            </li>
            <li>
              <strong>Habilita les APIs necessàries:</strong>
              <div class="ml-5 mt-1">
                Al menú lateral esquerre, ves a <em>"APIs & Services" > "Library"</em>. Cerca i habilita <strong>"Places API (New)"</strong>, <strong>"Maps JavaScript API"</strong> i <strong>"Geocoding API"</strong>.
              </div>
            </li>
            <li>
              <strong>Crea les credencials:</strong>
              <div class="ml-5 mt-1">
                Ves a <em>"APIs & Services" > "Credentials"</em>. Fes clic a <em>"Create Credentials"</em> i tria <strong>"API Key"</strong>. Copia la clau generada.
              </div>
            </li>
            <li>
              <strong>Configura la clau a Cuánto llevo gastao:</strong>
              <div class="ml-5 mt-1">
                Torna a aquesta aplicació, ves a <NuxtLink to="/settings" class="text-primary-500 hover:underline">Configuració > Integracions</NuxtLink> i enganxa la clau al camp "Clau API de Google Maps".
              </div>
            </li>
          </ol>

          <UAlert
            icon="i-heroicons-exclamation-triangle"
            color="warning"
            variant="soft"
            title="Costos i Facturació"
            description="Google ofereix un crèdit mensual gratuït suficient per a milers de consultes d'autocompletat. És obligatori configurar un compte de facturació per activar el servei a Google Cloud. Recomanem establir quotes/límits de pressupost al panell de Google Cloud per evitar sorpreses."
            class="mt-4"
          />
        </div>
      </UCard>
    </section>

    <!-- Supermarket Autocomplete Logic Section -->
    <section>
      <UCard>
        <template #header>
          <h3 class="font-semibold text-lg">Ús de la localització a l'aplicació</h3>
        </template>
        <div class="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Quan registres una compra o tiquet a Cuánto llevo gastao, pots indicar la ubicació del supermercat o comerç:
          </p>
          <ul class="list-disc list-inside space-y-2 ml-2">
            <li><strong>Autocompletat intel·ligent:</strong> Comença a escriure el nom de la cadena o carrer (ex: "Mercadona Gran Via") i Google Maps et suggerirà establiments exactes.</li>
            <li><strong>Detecció automàtica:</strong> Amb el botó "Detectar ubicació", l'aplicació obté les coordenades GPS del teu dispositiu i les converteix en adreça amb la Geocoding API.</li>
            <li><strong>Filtratge i estadístiques:</strong> Podràs analitzar les teues compres filtrant per municipi o zona comercial.</li>
          </ul>
        </div>
      </UCard>
    </section>
  </div>
</template>
