/**
 * ════════════════════════════════════════════════════════════
 *  script.js — TechStore
 *
 *  Carga el archivo productos.xlsx con SheetJS (XLSX) y genera
 *  dinámicamente las tarjetas del catálogo de productos.
 *
 *  Flujo:
 *    1. Al cargar la página, se hace fetch() al archivo Excel.
 *    2. SheetJS convierte el ArrayBuffer en un array de objetos JS.
 *    3. Por cada objeto (fila del Excel) se crea una tarjeta HTML.
 *    4. El botón "Consultar" abre WhatsApp con un mensaje predefinido.
 *
 *  Para actualizar el catálogo:
 *    - Edita productos.xlsx (agrega, quita o modifica filas).
 *    - Recarga la página — los cambios se reflejan automáticamente.
 * ════════════════════════════════════════════════════════════
 */

/* ────────────────────────────────────────────
   CONFIGURACIÓN  ← Edita estos valores
──────────────────────────────────────────── */

/**
 * Número de WhatsApp de la tienda.
 * Formato: código de país + número, sin +, espacios ni guiones.
 * Ejemplo: Colombia (+57) 300 123 4567 → "573001234567"
 */
const WHATSAPP_NUMBER = '50686155449';

/** Ruta a la carpeta de imágenes de productos */
const IMG_FOLDER = 'productos-imagenes/';

/** Nombre del archivo Excel (debe estar en la carpeta raíz del sitio) */
const EXCEL_URL = 'productos.xlsx';

/**
 * Imagen de respaldo (placeholder) cuando el archivo de imagen
 * no se encuentra o no se puede cargar. Es un SVG inline codificado
 * como Data URI, así no requiere archivos externos.
 */
const PLACEHOLDER_IMG = buildPlaceholder();


/* ────────────────────────────────────────────
   INICIALIZACIÓN
──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Año actual en el footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Menú móvil (hamburguesa)
  initMobileNav();
  initServiceCards();

  // Verificar que SheetJS esté disponible
  if (typeof XLSX === 'undefined') {
    showError('No se pudo cargar la librería SheetJS. Verifica tu conexión a internet.');
    return;
  }

  // Cargar y renderizar el catálogo
  loadProducts();
});


/* ────────────────────────────────────────────
   SERVICE CARDS → WhatsApp
──────────────────────────────────────────── */
/**
 * Makes every service card clickable. On click it opens WhatsApp
 * with a pre-filled message that includes the service name taken
 * from the card's <h3>.
 */
function initServiceCards() {
  document.querySelectorAll('.service-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const activate = () => {
      const serviceName = card.querySelector('h3')?.textContent.trim() || 'este servicio';
      const msg = `Hola, me interesa el servicio de *${serviceName}*. ¿Pueden ayudarme?`;
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
    };

    card.addEventListener('click', activate);
    // Keyboard accessibility: Enter or Space
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });
}

/* ────────────────────────────────────────────
   MOBILE NAV
──────────────────────────────────────────── */
function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
  });

  // Cerrar al hacer clic en un enlace de navegación
  nav.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}


/* ────────────────────────────────────────────
   CARGA DEL EXCEL
──────────────────────────────────────────── */
/**
 * Descarga productos.xlsx con fetch(), lo parsea con SheetJS
 * y renderiza las tarjetas de productos.
 *
 * Se añade cache:'no-cache' para que el navegador siempre
 * descargue la versión más reciente del archivo.
 */
async function loadProducts() {
  try {
    // Append a timestamp so the browser never serves a cached copy of the Excel.
    // This guarantees the latest version is fetched on every page load.
    const response = await fetch(`${EXCEL_URL}?v=${Date.now()}`, { cache: 'no-cache' });

    if (!response.ok) {
      throw new Error(
        `No se encontró "${EXCEL_URL}" (HTTP ${response.status}). ` +
        'Asegúrate de servir el sitio con un servidor local (Live Server).'
      );
    }

    // ── Leer el Excel con SheetJS ──────────────────────────────
    // response.arrayBuffer() obtiene los bytes crudos del archivo.
    // XLSX.read() los interpreta como libro de Excel.
    const arrayBuffer = await response.arrayBuffer();
    const workbook    = XLSX.read(arrayBuffer, { type: 'array' });

    // Tomamos la primera hoja del libro
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error('El archivo Excel no contiene hojas.');

    // sheet_to_json convierte las filas en objetos JS usando la fila 1
    // como nombres de campo (cabeceras).
    // defval:'' evita undefined en celdas vacías.
    const products = XLSX.utils.sheet_to_json(
      workbook.Sheets[firstSheet],
      { defval: '' }
    );

    if (products.length === 0) {
      showEmpty();
      return;
    }

    // Ocultar spinner y mostrar cuadrícula
    hide('catalog-loading');
    show('catalog-grid');
    renderProducts(products);

  } catch (err) {
    console.error('[TechStore] Error al cargar productos:', err);
    showError(err.message);
  }
}


/* ────────────────────────────────────────────
   RENDERIZADO DE TARJETAS
──────────────────────────────────────────── */
/**
 * Crea una tarjeta HTML por cada producto del array y la inserta
 * en el contenedor #catalog-grid.
 *
 * Columnas esperadas en el Excel (insensible a mayúsculas/tildes):
 *   nombre      — Nombre del producto
 *   precio      — Precio (número o texto con símbolo, ej. "$12.99")
 *   imagen      — Nombre del archivo de imagen (ej. "cargador.jpg")
 *   descripcion — Descripción corta (opcional)
 */
function renderProducts(products) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  // Fragment para un único reflow en el DOM
  const fragment = document.createDocumentFragment();

  products.forEach((raw, index) => {
    // Extraer campos de forma robusta (case-insensitive, con o sin tilde)
    const nombre      = getField(raw, ['nombre'],                  'Producto sin nombre');
    const precioRaw   = getField(raw, ['precio'],                  '');
    const imagenFile  = getField(raw, ['imagen'],                  '');
    const descripcion = getField(raw, ['descripcion','descripción'],'');

    const precioStr = formatPrice(precioRaw);
    const imgSrc    = imagenFile
                        ? `${IMG_FOLDER}${imagenFile}`
                        : PLACEHOLDER_IMG;

    // Crear elemento de tarjeta
    const card = document.createElement('article');
    card.className = 'product-card';
    card.setAttribute('data-index', index);

    card.innerHTML = `
      <div class="product-img-wrap">
        <img
          src="${escHtml(imgSrc)}"
          alt="${escHtml(nombre)}"
          loading="lazy"
          onerror="this.src='${PLACEHOLDER_IMG}';this.onerror=null;"
        />
        <span class="product-badge" aria-label="Disponible">Disponible</span>
      </div>
      <div class="product-body">
        <h3 class="product-name">${escHtml(nombre)}</h3>
        ${descripcion
          ? `<p class="product-desc">${escHtml(descripcion)}</p>`
          : ''}
        <p class="product-price" aria-label="Precio: ${escHtml(precioStr)}">
          ${escHtml(precioStr)}
        </p>
        <a
          href="${escHtml(buildWhatsAppLink(nombre, precioStr))}"
          class="btn-consultar"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Consultar ${escHtml(nombre)} por WhatsApp"
        >
          ${whatsappSvg()}
          Consultar / Comprar
        </a>
      </div>
    `;

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
}


/* ────────────────────────────────────────────
   UTILIDADES
──────────────────────────────────────────── */

/**
 * Busca un campo en el objeto de producto de forma insensible
 * a mayúsculas y tildes. Acepta múltiples nombres alternativos.
 *
 * @param {Object}   obj          - Fila del Excel como objeto JS
 * @param {string[]} keys         - Nombres posibles del campo
 * @param {string}   defaultValue - Valor si no se encuentra
 */
function getField(obj, keys, defaultValue = '') {
  for (const key of keys) {
    const match = Object.keys(obj).find(
      k => normalizeStr(k) === normalizeStr(key)
    );
    if (match !== undefined) {
      const val = String(obj[match]).trim();
      if (val !== '') return val;
    }
  }
  return defaultValue;
}

/** Normaliza cadena: minúsculas, sin tildes */
function normalizeStr(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Formatea el precio:
 *   - Si ya contiene símbolo de moneda → lo devuelve tal cual.
 *   - Si es un número → lo formatea como "$XX.XX".
 *   - Si está vacío → devuelve "Precio a consultar".
 */
/**
 * Formatea el precio con el símbolo ₡ (colón costarricense).
 * - Si la celda es un número (o texto numérico), aplica formato
 *   es-CR: separador de miles punto, decimal coma → ₡25.000,00
 * - Si ya contiene texto no numérico (ej. "₡ 500"), lo devuelve tal cual.
 * - Celda vacía → "Precio a consultar".
 */
function formatPrice(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return 'Precio a consultar';
  }

  // Quitar cualquier símbolo de moneda y espacios para intentar parsear
  const cleaned = String(raw).trim().replace(/[₡$€£¢₲₦₩¥₹,\s]/g, '').replace(/\./g, '');
  const num = parseFloat(cleaned);

  if (!isNaN(num)) {
    // Formato es-CR: punto como separador de miles, coma como decimal
    return '₡' + num.toLocaleString('es-CR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // No es numérico → devolver tal cual
  return String(raw).trim();
}

/**
 * Genera el enlace de WhatsApp con un mensaje predefinido
 * que incluye nombre y precio del producto.
 */
function buildWhatsAppLink(nombre, precio) {
  const msg = `Hola, me interesa el producto: *${nombre}* (Precio: ${precio}). ¿Está disponible?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

/** Escapa caracteres HTML para prevenir XSS */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** SVG del logo de WhatsApp (inline) */
function whatsappSvg() {
  return `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>`;
}

/** Genera un SVG Data URI como imagen de respaldo */
function buildPlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#ecf0ff"/>
    <rect x="60" y="55" width="80" height="60" rx="8" fill="#c7d2fe"/>
    <circle cx="100" cy="130" r="10" fill="#c7d2fe"/>
    <rect x="80" y="140" width="40" height="6" rx="3" fill="#c7d2fe"/>
    <text x="100" y="91" text-anchor="middle" font-size="28" font-family="sans-serif" fill="#818cf8">&#128247;</text>
    <text x="100" y="165" text-anchor="middle" font-size="11" font-family="Arial,sans-serif" fill="#94a3b8">Sin imagen</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}


/* ────────────────────────────────────────────
   HELPERS DE ESTADO DE UI
──────────────────────────────────────────── */
function showError(msg) {
  hide('catalog-loading');
  const errEl = document.getElementById('catalog-error-msg');
  if (errEl) errEl.textContent = msg;
  show('catalog-error');
}
function showEmpty() {
  hide('catalog-loading');
  show('catalog-empty');
}
function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}
