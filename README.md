# Cuánto llevo gastao

**Cuánto llevo gastao** es una Aplicación Web Progresiva (PWA) moderna diseñada para el control inteligente de compras y gastos de supermercado y del hogar. Permite registrar compras, escanear tickets físicos para desglosar productos automáticamente con OCR/IA, controlar el presupuesto mensual en tiempo real y analizar estadísticas de consumo por categorías.

---

## 🚀 Características Principales

### 📊 1. Resumen Mensual y Presupuesto Configurable
- **¿Cuánto llevo gastao este mes?**: Vista en tiempo real del gasto total acumulado en el mes en curso.
- **Presupuesto Mensual**: Configura tu objetivo de gasto mensual (por ejemplo 400 €).
- **Indicador de Estado**: Visualiza el porcentaje consumido, dinero restante o importe en el que te has excedido, con barra de progreso dinámica por colores (verde, ámbar y rojo).
- **Métricas Rápidas**: Gasto medio diario, número de compras realizadas y ticket medio por visita al supermercado.

### 🛒 2. Control de Compras de Supermercado y Desglose de Productos
- **Registro Rápido**: Selector rápido de los supermercados más frecuentes en España (*Mercadona, Carrefour, Lidl, Día, Alcampo, Consum, Eroski, Aldi, Ahorramas, Farmacias*, etc.) o cualquier tienda personalizada.
- **Desglose de Artículos**: Cada compra permite detallar los productos adquiridos con su nombre, cantidad, coste unitario y categoría.
- **Cálculo Automático**: Suma automática de artículos para rellenar el coste total del ticket con un solo clic.

### 📷 3. Escaneo de Tickets (OCR en el Navegador e IA Opcional)
- **OCR 100% Local (Privacidad Total)**: Mediante `tesseract.js`, escanea fotos o PDFs de tickets directamente en el navegador sin enviar datos a servidores externos.
  - Detección automática del establecimiento o supermercado.
  - Extracción de fecha y hora de la compra.
  - Detección del importe total.
  - **Extracción automática del desglose de productos**: Detecta líneas de producto, precios y categoriza cada artículo automáticamente por palabras clave.
- **Escaneo con IA (Opcional)**: Soporte para Vision API de OpenAI mediante clave de usuario para una precisión superior en tickets complejos.
- **Recorte y Optimización**: Permite recortar el comprobante, aplicar escala de grises y guardarlo comprimido en el dispositivo.

### 📈 4. Apartado Estadístico por Categorías de Productos
- Análisis exhaustivo por categorías esenciales:
  - **Alimentación** (conservas, lácteos, despensa, etc.)
  - **Frescos** (fruta, verdura, carne, pescado)
  - **Bebidas** (agua, refrescos, zumos, etc.)
  - **Limpieza** (detergentes, lejía, lavavajillas, etc.)
  - **Higiene y Cuidado Personal** (gel, champú, desodorante, etc.)
  - **Farmacia** (medicamentos, apósitos, salud)
  - **Hogar** (menaje, bombillas, papel cocina, etc.)
  - **Mascotas** (pienso, comida, accesorios)
  - **Otros**
- Visualización mediante barras de distribución porcentual y tarjetas de detalle.
- Ranking de supermercados con mayor volumen de gasto y frecuencia de compra.

### 📱 5. PWA (Progressive Web App) y Modo Offline
- **Instalable**: Añade la aplicación a la pantalla de inicio de tu teléfono móvil (Android/iOS) o navegador de escritorio como una aplicación nativa.
- **Offline First**: Todas las compras, fotos de tickets y configuraciones se almacenan localmente en el dispositivo mediante **IndexedDB**. Funciona perfectamente sin cobertura.
- **Copias de Seguridad**: Exporta e importa copias de seguridad en formato JSON seguro (opcionalmente cifrado con contraseña).

---

## 🛠️ Tecnologías

- **Framework**: [Nuxt 4](https://nuxt.com/) / Vue 3
- **UI & Diseño**: [Nuxt UI](https://ui.nuxt.com/) / Tailwind CSS
- **PWA & Offline**: `@vite-pwa/nuxt` / Workbox / IndexedDB
- **Estado**: Pinia con sincronización persistente
- **Reconocimiento de Tickets**: Tesseract.js (OCR local) + OpenAI Vision (opcional)
- **Idiomas**: Soporte en Español (`es`) por defecto y Català (`ca`)

---

## 💻 Ejecución Local

### 1. Requisitos
- **Node.js** v20 o superior (instalado en tu sistema).

### 2. Arrancar Servidor de Desarrollo

Inicia la aplicación en tu navegador:

```bash
npm run dev
```

La aplicación estará disponible en:
```
http://localhost:3000
```

### 3. Instalar en el Móvil o Navegador
1. Para probarla en tu teléfono móvil desde la misma red WiFi, abre la dirección IP local de tu ordenador con el puerto 3000 (ej: `http://192.168.1.X:3000`).
2. Pulsa en el navegador de tu móvil en **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"**.

---

## 📦 Compilación para Producción

Generar los archivos optimizados listos para desplegar:

```bash
npm run build
```

O generar estáticos para GitHub Pages, Cloudflare Pages o Netlify:

```bash
npm run generate
```

Previsualizar la compilación de producción:

```bash
npm run preview
```
