/**
 * ════════════════════════════════════════════════════════════
 *  script.js — TechStore
 *
 *  Lee el catálogo desde un Google Sheet público (sin backend).
 *  Las imágenes se sirven directamente desde Google Drive.
 *
 *  Para actualizar el catálogo:
 *    - Edita el Google Sheet (precios, nombres, imágenes).
 *    - Recarga la página — los cambios se reflejan automáticamente.
 * ════════════════════════════════════════════════════════════
 */

/* ────────────────────────────────────────────
   CONFIGURACIÓN  ← Edita estos valores
──────────────────────────────────────────── */

/** Número de WhatsApp (código país + número, sin + ni espacios) */
const WHATSAPP_NUMBER = '50686155449';

/**
 * ID del Google Sheet que contiene el catálogo.
 * Cómo obtenerlo: abre el Sheet → copia la URL:
 *   https://docs.google.com/spreadsheets/d/→ ESTE_ES_EL_ID ←/edit
 * El documento debe estar compartido como "Cualquiera con el enlace puede verlo".
 */
const GOOGLE_SHEET_ID = '1dYkmCURpbZeJs_C9EiigtUQk1tWIT57PmsEVjxx0iX8'; // ← reemplaza con tu ID

/**
 * Nombre exacto de la pestaña (hoja) dentro del Google Sheet.
 * Sensible a mayúsculas. Por defecto "Productos".
 */
const GOOGLE_SHEET_NAME = 'Productos';

/**
 * Carpeta local de imágenes (respaldo si la columna "imagen" contiene
 * un nombre de archivo local como "cargador.jpg").
 */
const IMG_FOLDER = 'productos-imagenes/';

/**
 * ID de la carpeta de Google Drive donde subes las imágenes.
 * Cómo obtenerlo: abre la carpeta en Drive → copia la URL:
 *   https://drive.google.com/drive/folders/→ ESTE_ES_EL_ID ←
 * La carpeta debe estar compartida como "Cualquiera con el enlace puede verlo".
 */
const GOOGLE_DRIVE_FOLDER_ID = '10q5t1VMXHOIex5MX8yBfvRxMBAXwzr_t'; // ← reemplaza con tu ID de carpeta

/**
 * API Key de Google Cloud (solo lectura, Drive API v3).
 * Cómo obtenerla:
 *   1. Ve a https://console.cloud.google.com
 *   2. Crea un proyecto → APIs y servicios → Habilitar API → busca "Google Drive API".
 *   3. Credenciales → Crear credencial → Clave de API.
 *   4. Restringe la clave: APIs = "Google Drive API", HTTP referrers = tu dominio.
 * Es seguro publicarla en el código si está restringida al dominio.
 */
const GOOGLE_API_KEY = 'AIzaSyCd66sPtdseDmUnzO4wY6-2ePZqsCr61S8'; // ← reemplaza con tu API key

/**
 * Nombre de la pestaña del Google Sheet que contiene los mensajes del banner.
 * Columnas esperadas: mensaje | activo | tipo | link | link_texto
 * Deja vacío ('') para deshabilitar el banner.
 */
const GOOGLE_SHEET_BANNER = 'Banner';

/**
 * Mapa interno filename → fileId, construido al cargar la página.
 * Se llena en loadDriveFolder() antes de renderizar las tarjetas.
 */
const driveFileMap = new Map();

/** Placeholder SVG cuando no hay imagen disponible */
const PLACEHOLDER_IMG = buildPlaceholder();


/* ────────────────────────────────────────────
   INICIALIZACIÓN
──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Año actual en el footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  buildSkeletonCards();
  initMobileNav();
  initServiceCards();
  initContactWhatsApp();
  initBackToTop();
  loadBanner();
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
   BANNER DINÁMICO
──────────────────────────────────────────── */
/**
 * Lee la pestaña "Banner" del mismo Google Sheet y muestra un banner
 * en la parte superior de la página.
 *
 * Columnas en la hoja "Banner":
 *   mensaje    — Texto a mostrar (obligatorio)
 *   activo     — TRUE / 1 para mostrar; FALSE / 0 / vacío para ocultar
 *   tipo       — "promo" | "urgente" | "info"  (por defecto: "info")
 *   link       — URL opcional al hacer clic en el enlace
 *   link_texto — Etiqueta del enlace (por defecto: "Ver más")
 *
 * Si hay varios mensajes activos se rotan cada 5 s con fade.
 * El botón × descarta el banner para la sesión actual.
 */
async function loadBanner() {
  if (!GOOGLE_SHEET_BANNER || !GOOGLE_SHEET_ID || GOOGLE_SHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') return;

  try {
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq`
      + `?tqx=out:json&headers=1&sheet=${encodeURIComponent(GOOGLE_SHEET_BANNER)}&_=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return;

    const text  = await res.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
    if (!match) return;

    const data = JSON.parse(match[1]);
    if (data.status === 'error' || !data.table?.cols?.length) return;

    const cols = data.table.cols.map(c => c.label || '');
    const rows = (data.table.rows || []).map(row => {
      const obj = {};
      (row.c || []).forEach((cell, i) => {
        if (!cols[i]) return;
        obj[cols[i]] = cell ? (cell.v !== null && cell.v !== undefined ? cell.v : (cell.f || '')) : '';
      });
      return obj;
    });

    // Filtrar mensajes activos
    const active = rows.filter(r => {
      const activo = String(getField(r, ['activo'], 'true')).trim().toLowerCase();
      return activo !== 'false' && activo !== '0' && activo !== '';
    });

    if (active.length === 0) return;

    // Verificar si el usuario ya descartó este conjunto de mensajes
    const sessionKey = 'banner_dismissed_' + active.map(r => getField(r, ['mensaje'], '')).join('|');
    if (sessionStorage.getItem(sessionKey)) return;

    const bannerEl   = document.getElementById('site-banner');
    const msgEl      = bannerEl?.querySelector('.banner-msg');
    const iconEl     = bannerEl?.querySelector('.banner-icon');
    const linkEl     = bannerEl?.querySelector('.banner-link');
    const dotsEl     = bannerEl?.querySelector('.banner-dots');
    const closeBtn   = bannerEl?.querySelector('.banner-close');
    if (!bannerEl || !msgEl) return;

    const ICONS = { promo: '🏷️', urgente: '🚨', info: '📢' };
    let current = 0;
    let rotateTimer = null;

    function showMessage(index) {
      const item      = active[index];
      const tipo      = String(getField(item, ['tipo'], 'info')).toLowerCase();
      const mensaje   = escHtml(getField(item, ['mensaje'], ''));
      const link      = getField(item, ['link'], '');
      const linkTexto = getField(item, ['link_texto', 'link texto'], 'Ver más');

      // Tipo → clase de color
      bannerEl.classList.remove('banner--promo', 'banner--urgente', 'banner--info');
      bannerEl.classList.add(`banner--${['promo','urgente'].includes(tipo) ? tipo : 'info'}`);

      // Fade swap
      msgEl.classList.add('fade-out');
      setTimeout(() => {
        iconEl.textContent = ICONS[tipo] || ICONS.info;
        msgEl.textContent  = mensaje;
        msgEl.classList.remove('fade-out');
        msgEl.classList.add('fade-in');
        setTimeout(() => msgEl.classList.remove('fade-in'), 260);
      }, 200);

      // Enlace
      if (link) {
        linkEl.href        = link;
        linkEl.textContent = escHtml(linkTexto);
        linkEl.classList.remove('hidden');
      } else {
        linkEl.classList.add('hidden');
      }

      // Dots
      dotsEl.querySelectorAll('.banner-dot').forEach((d, i) =>
        d.classList.toggle('active', i === index)
      );
    }

    // Construir dots si hay >1 mensaje
    if (active.length > 1) {
      active.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className  = 'banner-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Mensaje ${i + 1}`);
        dot.addEventListener('click', () => {
          current = i;
          showMessage(current);
          restartTimer();
        });
        dotsEl.appendChild(dot);
      });
    }

    function restartTimer() {
      if (rotateTimer) clearInterval(rotateTimer);
      if (active.length > 1) {
        rotateTimer = setInterval(() => {
          current = (current + 1) % active.length;
          showMessage(current);
        }, 5000);
      }
    }

    // Cerrar banner
    closeBtn?.addEventListener('click', () => {
      if (rotateTimer) clearInterval(rotateTimer);
      bannerEl.classList.add('banner--closing');
      sessionStorage.setItem(sessionKey, '1');
      bannerEl.addEventListener('transitionend', () => bannerEl.classList.add('hidden'), { once: true });
    });

    // Mostrar primer mensaje y arrancar rotación
    show('site-banner');
    showMessage(0);
    restartTimer();

  } catch (e) {
    console.warn('[TechStore] No se pudo cargar el banner:', e.message);
  }
}


/* ────────────────────────────────────────────
   SKELETON LOADING (11)
──────────────────────────────────────────── */
/**
 * Fills #catalog-loading with 6 skeleton placeholder cards so the page
 * layout doesn't jump when real products load in.
 */
function buildSkeletonCards() {
  const container = document.getElementById('catalog-loading');
  if (!container) return;
  const SKELETON_COUNT = 6;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < SKELETON_COUNT; i++) {
    const card = document.createElement('div');
    card.className = 'product-card skeleton-card';
    card.setAttribute('aria-hidden', 'true');
    card.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line sk-title"></div>
        <div class="skeleton-line sk-desc"></div>
        <div class="skeleton-line sk-desc sk-short"></div>
        <div class="skeleton-line sk-price"></div>
        <div class="skeleton-line sk-btn"></div>
      </div>`;
    frag.appendChild(card);
  }
  container.appendChild(frag);
}


/* ────────────────────────────────────────────
   WHATSAPP DINÁMICO (3 + 6)
──────────────────────────────────────────── */
/**
 * Wires the contact-section button and the floating button to the
 * WHATSAPP_NUMBER constant so both stay in sync with script.js.
 */
function initContactWhatsApp() {
  const msg = encodeURIComponent('Hola, necesito información sobre sus productos y servicios.');
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;

  const contactBtn = document.getElementById('contact-wa-btn');
  if (contactBtn) contactBtn.href = url;

  const floatBtn = document.getElementById('wa-float');
  if (floatBtn) floatBtn.href = url;
}


/* ────────────────────────────────────────────
   VOLVER ARRIBA (12)
──────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('hidden', window.scrollY < 450);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


/* ────────────────────────────────────────────
   BUSCADOR DE PRODUCTOS (4)
──────────────────────────────────────────── */
/**
 * Wires the #catalog-search input to filter product cards in real time.
 * Matching is case-insensitive and accent-insensitive using normalizeStr().
 */
function initSearch(allProducts) {
  const input     = document.getElementById('catalog-search');
  const clearBtn  = document.getElementById('search-clear');
  const emptyMsg  = document.getElementById('catalog-search-empty');
  const querySpan = document.getElementById('search-query-display');
  if (!input) return;

  function applyFilter() {
    const q     = normalizeStr(input.value.trim());
    const cards = document.querySelectorAll('#catalog-grid .product-card');
    let visible = 0;

    cards.forEach(card => {
      const name = normalizeStr(card.querySelector('.product-name')?.textContent || '');
      const desc = normalizeStr(card.querySelector('.product-desc')?.textContent || '');
      const matches = !q || name.includes(q) || desc.includes(q);
      card.style.display = matches ? '' : 'none';
      // Ensure animated cards are visible when shown again
      if (matches) { card.classList.add('card-visible'); visible++; }
    });

    const hasQuery = q.length > 0;
    clearBtn?.classList.toggle('hidden', !hasQuery);
    if (emptyMsg) {
      emptyMsg.classList.toggle('hidden', visible > 0 || !hasQuery);
      if (querySpan) querySpan.textContent = input.value.trim();
    }
  }

  input.addEventListener('input', applyFilter);

  clearBtn?.addEventListener('click', () => {
    input.value = '';
    applyFilter();
    input.focus();
  });
}


/* ────────────────────────────────────────────
   ANIMACIÓN DE ENTRADA DE TARJETAS (13)
──────────────────────────────────────────── */
/**
 * Uses IntersectionObserver to fade-in product cards with a staggered
 * delay as they scroll into view. Respects prefers-reduced-motion.
 */
function initCardAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = document.querySelectorAll('#catalog-grid .product-card');
  if (!cards.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('card-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });

  cards.forEach((card, i) => {
    card.classList.add('card-entering');
    card.style.transitionDelay = `${Math.min(i * 55, 440)}ms`;
    observer.observe(card);
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
   CARGA DESDE GOOGLE SHEETS + DRIVE
──────────────────────────────────────────── */

/**
 * Punto de entrada: carga la carpeta de Drive (para el mapa de imágenes)
 * y los datos del Sheet en paralelo, luego renderiza las tarjetas.
 */
async function loadProducts() {
  try {
    const [products] = await Promise.all([
      fetchFromGoogleSheets(),
      loadDriveFolder()
    ]);
    if (products.length === 0) { showEmpty(); return; }
    hide('catalog-loading');
    show('catalog-grid');
    renderProducts(products);
    initSearch(products);
    initCardAnimations();
  } catch (err) {
    console.error('[TechStore]', err);
    showError(err.message);
  }
}

/**
 * Descarga la lista de archivos de la carpeta de Google Drive
 * y llena driveFileMap: { 'filename.jpg' → 'fileId' }.
 * Solo funciona si GOOGLE_DRIVE_FOLDER_ID y GOOGLE_API_KEY están configurados.
 * Si no están configurados, se omite silenciosamente (modo degradado).
 */
async function loadDriveFolder() {
  if (
    !GOOGLE_DRIVE_FOLDER_ID || GOOGLE_DRIVE_FOLDER_ID === 'YOUR_FOLDER_ID_HERE' ||
    !GOOGLE_API_KEY         || GOOGLE_API_KEY         === 'YOUR_API_KEY_HERE'
  ) return;

  try {
    const q   = encodeURIComponent(`'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1000&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) { console.warn('[TechStore] Drive folder error:', res.status); return; }
    const data = await res.json();
    (data.files || []).forEach(f => driveFileMap.set(f.name.toLowerCase(), f.id));
  } catch (e) {
    console.warn('[TechStore] No se pudo cargar la carpeta de Drive:', e.message);
  }
}

/**
 * Lee el catálogo desde Google Sheets usando la API gviz/tq (sin backend).
 * El Sheet debe estar compartido como "Cualquiera con el enlace puede verlo".
 */
async function fetchFromGoogleSheets() {
  if (!GOOGLE_SHEET_ID || GOOGLE_SHEET_ID === 'YOUR_SPREADSHEET_ID_HERE') {
    throw new Error('Configura GOOGLE_SHEET_ID en script.js con el ID de tu Google Sheet.');
  }

  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq`
    + `?tqx=out:json&headers=1&sheet=${encodeURIComponent(GOOGLE_SHEET_NAME)}&_=${Date.now()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `No se pudo conectar con Google Sheets (HTTP ${response.status}). ` +
      'Verifica que el Sheet ID es correcto y el documento es público.'
    );
  }

  const text  = await response.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error('Respuesta inesperada de Google Sheets. Verifica que el ID sea correcto y el documento sea público.');

  const data = JSON.parse(match[1]);
  if (data.status === 'error') {
    throw new Error(data.errors?.[0]?.detailed_message || data.errors?.[0]?.message || 'Error de Google Sheets');
  }

  const table = data.table;
  if (!table?.cols?.length) throw new Error('El Google Sheet está vacío o sin columnas.');

  const cols = table.cols.map(c => c.label || '');
  return (table.rows || [])
    .map(row => {
      const obj = {};
      (row.c || []).forEach((cell, i) => {
        if (!cols[i]) return;
        obj[cols[i]] = cell ? (cell.v !== null && cell.v !== undefined ? cell.v : (cell.f || '')) : '';
      });
      return obj;
    })
    .filter(p => String(getField(p, ['nombre'], '')).trim() !== '');
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
    const nombre       = getField(raw, ['nombre'],                   'Producto sin nombre');
    const precioRaw    = getField(raw, ['precio'],                   '');
    const imagenFile   = getField(raw, ['imagen'],                   '');
    const descripcion  = getField(raw, ['descripcion','descripción'], '');
    const cantidadRaw  = getField(raw, ['cantidad'],                  '');
    const promocionRaw = getField(raw, ['promocion','promoción'],     '');

    // cantidad = 0 o vacío → Agotado; cualquier número > 0 → Disponible
    const cantidad   = parseInt(cantidadRaw, 10);
    const disponible = isNaN(cantidad) ? true : cantidad > 0;

    // Descuento: valor numérico en la columna "promocion" (ej. 5 = 5 % off)
    const descuento      = parseFloat(String(promocionRaw).replace(',', '.'));
    const tienePromocion = !isNaN(descuento) && descuento > 0;

    // Badge: "Agotado" tiene prioridad; luego "Promoción"; por defecto "Disponible"
    const badgeLabel = !disponible ? 'Agotado' : tienePromocion ? `Promoción ${descuento}%` : 'Disponible';
    const badgeClass = !disponible ? 'badge-agotado' : tienePromocion ? 'badge-promocion' : '';

    // Precios: si hay promoción, calcular precio con descuento
    const precioOriginalStr = formatPrice(precioRaw);
    let precioDisplay;
    if (tienePromocion) {
      const precioNum = parseRawNumber(precioRaw);
      if (precioNum !== null) {
        const precioConDescuento = precioNum * (1 - descuento / 100);
        precioDisplay = `
          <p class="product-price-original" aria-label="Precio original: ${escHtml(precioOriginalStr)}">
            ${escHtml(precioOriginalStr)}
          </p>
          <p class="product-price product-price-discounted" aria-label="Precio con descuento: ${escHtml(formatPrice(precioConDescuento))}">
            ${escHtml(formatPrice(precioConDescuento))}
          </p>`;
      } else {
        precioDisplay = `<p class="product-price" aria-label="Precio: ${escHtml(precioOriginalStr)}">${escHtml(precioOriginalStr)}</p>`;
      }
    } else {
      precioDisplay = `<p class="product-price" aria-label="Precio: ${escHtml(precioOriginalStr)}">${escHtml(precioOriginalStr)}</p>`;
    }

    // Precio para el mensaje de WhatsApp
    const precioWhatsApp = tienePromocion && parseRawNumber(precioRaw) !== null
      ? formatPrice(parseRawNumber(precioRaw) * (1 - descuento / 100))
      : precioOriginalStr;

    const imgSrc = getImageSrc(imagenFile);

    // Crear elemento de tarjeta
    const card = document.createElement('article');
    card.className = `product-card${disponible ? '' : ' agotado'}`;
    card.setAttribute('data-index', index);

    card.innerHTML = `
      <div class="product-img-wrap">
        <img
          src="${escHtml(imgSrc)}"
          alt="${escHtml(nombre)}"
          loading="lazy"
          onerror="this.src='${PLACEHOLDER_IMG}';this.onerror=null;"
        />
        <span class="product-badge${badgeClass ? ` ${badgeClass}` : ''}" aria-label="${escHtml(badgeLabel)}">${escHtml(badgeLabel)}</span>
      </div>
      <div class="product-body">
        <h3 class="product-name">${escHtml(nombre)}</h3>
        ${descripcion
          ? `<p class="product-desc">${escHtml(descripcion)}</p>`
          : ''}
        ${precioDisplay}
        ${disponible
          ? `<a
          href="${escHtml(buildWhatsAppLink(nombre, precioWhatsApp))}"
          class="btn-consultar"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Consultar ${escHtml(nombre)} por WhatsApp"
        >
          ${whatsappSvg()}
          Consultar / Comprar
        </a>`
          : `<span class="btn-consultar btn-agotado" aria-disabled="true">
          Agotado
        </span>`}
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
 * Resuelve la URL de imagen a partir de la columna "imagen":
 *   - Nombre de archivo (ej. "teclado.png") → busca en driveFileMap → Drive CDN
 *     Si no está en el mapa, usa la carpeta local productos-imagenes/
 *   - URL de Drive (drive.google.com/...) → extrae el file ID
 *   - File ID puro (sin extensión) → Drive CDN directamente
 *   - Vacío → placeholder SVG
 */
function getImageSrc(raw) {
  if (!raw || String(raw).trim() === '') return PLACEHOLDER_IMG;
  const str = String(raw).trim();

  // Nombre de archivo con extensión de imagen
  if (/\.(jpe?g|png|svg|webp|gif)$/i.test(str)) {
    const fileId = driveFileMap.get(str.toLowerCase());
    if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
    return `${IMG_FOLDER}${str}`; // respaldo local
  }

  // URL de Google Drive → extraer file ID
  const driveMatch = str.match(/\/d\/([a-zA-Z0-9_-]{10,})/)
                  || str.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;

  // File ID puro
  if (/^[a-zA-Z0-9_-]{15,}$/.test(str)) return `https://lh3.googleusercontent.com/d/${str}`;

  return PLACEHOLDER_IMG;
}

/**
 * Formatea precio con símbolo ₡ (colón costarricense).
 * - Número → ₡25.000,00  (formato es-CR)
 * - Texto no numérico → devuelve tal cual
 * - Vacío → "Precio a consultar"
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
 * Extrae el valor numérico de un campo precio (mismo saneado que formatPrice).
 * Devuelve un número o null si no es parseble.
 */
function parseRawNumber(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  const cleaned = String(raw).trim().replace(/[₡$€£¢₲₦₩¥₹,\s]/g, '').replace(/\./g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
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
