# Multiservicios Tecnológicos — Tienda de electrónica y pagos de servicios

> Sitio web estático publicable en GitHub Pages. El catálogo de productos se carga automáticamente desde un **Google Sheet** público; las imágenes se sirven desde **Google Drive**. No se necesita backend ni base de datos. Los IDs y la API key se inyectan de forma segura en tiempo de despliegue mediante **GitHub Actions Secrets y Variables**.

---

## Estructura de archivos

```
/
├── index.html              ← Página principal
├── styles.css              ← Estilos (tema tecnología oscuro)
├── script.js               ← Lógica: Google Sheets, Drive, renderizado
├── robots.txt              ← Directivas SEO para buscadores
├── sitemap.xml             ← Mapa del sitio para Google (actualiza la URL)
├── Logo2.png               ← Logo de la tienda (header, hero, footer)
├── logoBN.png              ← Logo Banco Nacional (tarjeta de servicios)
├── logoBP.png              ← Logo Banco Popular (tarjeta de servicios)
└── productos-imagenes/     ← Imágenes locales de respaldo
```

---

## Cómo abrir el sitio en local

El sitio usa `fetch()`, por lo que **no abre correctamente con doble clic** en `index.html`.
Usa uno de estos métodos:

### Opción A — Live Server (VS Code)

1. Instala la extensión **Live Server** (Ritwick Dey).
2. Clic derecho sobre `index.html` → **Open with Live Server**.

### Opción B — Python

```bash
# Windows — usa puerto 3000 si el 8080 está bloqueado
C:/Python311/python.exe -m http.server 3000
# Abre http://localhost:3000
```

### Opción C — GitHub Pages (producción)

Sube el repositorio a GitHub y activa Pages en **Settings → Pages → Branch: main**.
No se necesita ningún servidor; Google Sheets y Google Drive funcionan directamente.

---

## Configuración inicial

`WHATSAPP_NUMBER` y `GOOGLE_SHEET_NAME` se editan directamente en `script.js`. Los valores que identifican recursos o son credenciales se configuran en GitHub, **no en el código**:

| Valor | Tipo | Dónde en GitHub |
|---|---|---|
| `GOOGLE_SHEET_ID` | Variable | Settings → Secrets and variables → Actions → **Variables** |
| `GOOGLE_DRIVE_FOLDER_ID` | Variable | Settings → Secrets and variables → Actions → **Variables** |
| `GOOGLE_CLOUD_API_KEY` | Secret | Settings → Secrets and variables → Actions → **Secrets** |

El workflow `.github/workflows/deploy.yml` sustituye automáticamente los placeholders en `script.js` antes de publicar en GitHub Pages.

### Obtener el ID del Google Sheet

Abre tu Sheet → copia la URL:
```
https://docs.google.com/spreadsheets/d/→ ESTE_ES_EL_ID ←/edit
```
El documento debe estar compartido como **"Cualquiera con el enlace puede verlo"**.

### Obtener el ID de la carpeta de Drive

Abre la carpeta en Google Drive → copia la URL:
```
https://drive.google.com/drive/folders/→ ESTE_ES_EL_ID ←
```
La carpeta debe estar compartida como **"Cualquiera con el enlace puede verlo"**.

### Obtener la API Key de Google Cloud

1. Ve a [console.cloud.google.com](https://console.cloud.google.com).
2. Crea un proyecto → **APIs y servicios → Habilitar APIs → Google Drive API**.
3. **Credenciales → Crear credencial → Clave de API**.
4. Restringe la clave:
   - **Restricción de API**: Google Drive API
   - **Referentes HTTP**: `https://TU_USUARIO.github.io/*`

---

## Banner dinámico — Google Sheet

Crea una segunda pestaña llamada **`Banner`** en el mismo Google Sheet para mostrar mensajes o promociones en una barra fija en la parte superior del sitio.

### Columnas de la hoja `Banner`

| Columna        | Descripción                                                     | Ejemplo                          |
|----------------|-----------------------------------------------------------------|----------------------------------|
| `mensaje`      | Texto del anuncio (obligatorio)                                 | ¡Descuentos de hasta 30 % hoy!   |
| `activo`       | `TRUE` / `1` para mostrar; `FALSE` / `0` / vacío para ocultar  | TRUE                             |
| `tipo`         | Color del banner: `promo` \| `urgente` \| `info`               | promo                            |
| `link`         | URL opcional (debe iniciar con `https://`)                      | https://wa.me/50686155449        |
| `link_texto`   | Etiqueta del enlace (por defecto: "Ver más →")                  | Consultar ahora                  |

### Tipos de banner

| Valor en `tipo` | Color         | Uso recomendado                     |
|-----------------|---------------|-------------------------------------|
| `info`          | 🔵 Azul       | Horarios, avisos generales          |
| `promo`         | 🟠 Naranja    | Descuentos, ofertas, promociones    |
| `urgente`       | 🔴 Rojo       | Cierres, urgencias, avisos críticos |

### Comportamiento

- El banner aparece con una **animación slide-down** al cargar la página.
- Si hay **varios mensajes activos**, rotan automáticamente cada 5 segundos con una transición slide + fade. Los puntos de navegación permiten cambiar manualmente.
- **Pausa al hover**: al pasar el cursor sobre el banner la rotación se detiene; retoma al salir.
- Una **barra de progreso** en la parte inferior indica cuánto falta para el siguiente mensaje (solo con >1 mensajes).
- Los banners de tipo `promo` tienen un **efecto de brillo animado** para destacar la oferta.
- Los enlaces se muestran como un **botón pill** en lugar de texto subrayado.
- El botón **×** descarta el banner para la sesión actual (sessionStorage). Se vuelve a mostrar al abrir una nueva pestaña.
- Si no hay mensajes activos, el banner no aparece.
- Para deshabilitar el banner completamente, deja `GOOGLE_SHEET_BANNER = ''` en `script.js`.

### Configuración en `script.js`

```javascript
const GOOGLE_SHEET_BANNER = 'Banner'; // nombre exacto de la pestaña; '' para deshabilitar
```

---

## Catálogo de productos — Google Sheet

El Sheet debe tener una hoja llamada **`Productos`** con estas columnas en la fila 1:

| Columna       | Descripción                                                      | Ejemplo               |
|---------------|------------------------------------------------------------------|-----------------------|
| `nombre`      | Nombre del producto                                              | Cable USB-C           |
| `precio`      | Precio en colones (número o texto)                               | 3500                  |
| `imagen`      | Nombre del archivo en Drive o ID/URL de Drive                    | cargador.jpg          |
| `descripcion` | Descripción corta (opcional)                                     | 1 metro, carga rápida |
| `cantidad`    | Unidades en stock (opcional)                                     | 5                     |
| `promocion`   | Porcentaje de descuento (opcional). Ej: `10` = 10 % de descuento | 10                    |

### Disponibilidad automática con la columna `cantidad`

| Valor en `cantidad` | Badge mostrado | Botón        |
|---------------------|----------------|--------------|
| `1` o más           | 🟢 Disponible  | WhatsApp     |
| `0`                 | 🔴 Agotado     | Deshabilitado (gris) |
| vacío / ausente     | 🟢 Disponible  | WhatsApp     |

Cuando un producto está agotado: el badge cambia a gris, la imagen se desatura levemente y el botón de WhatsApp se reemplaza por un botón "Agotado" no clickeable.

### Descuentos con la columna `promocion`

Escribe un número en la columna `promocion` para activar el modo promoción en esa tarjeta:

| Valor en `promocion` | Badge mostrado          | Precio mostrado                                  |
|----------------------|-------------------------|--------------------------------------------------|
| vacío / ausente      | Normal (Disponible)     | Precio original                                   |
| `10`                 | 🟠 Promoción 10%        | Precio original tachado + precio con 10 % de descuento |
| `25`                 | 🟠 Promoción 25%        | Precio original tachado + precio con 25 % de descuento |

Fórmula aplicada: `precio_final = precio * (1 - descuento / 100)`

> Si el producto también está agotado (`cantidad = 0`), el badge "Agotado" tiene prioridad sobre "Promoción".

- Para **agregar** un producto: agrega una fila al final del Sheet.
- Para **eliminar** un producto: borra la fila completa.
- Para **marcar como agotado**: pon `0` en la columna `cantidad`.
- Los cambios se reflejan en el sitio al recargar la página — sin tocar código.

---

## Imágenes de productos — Google Drive

1. Sube la imagen a la carpeta de Drive configurada en `GOOGLE_DRIVE_FOLDER_ID`.
2. Escribe el nombre exacto del archivo en la columna `imagen` del Sheet (ej. `teclado.png`).
3. El sitio resuelve el nombre al File ID automáticamente al cargar.

### Modos de imagen soportados

| Valor en la columna `imagen` | Comportamiento                                       |
|------------------------------|------------------------------------------------------|
| `cargador.jpg`               | Busca en la carpeta de Drive configurada             |
| File ID de Drive (25+ chars) | Usa ese ID directamente                              |
| URL completa de Drive        | Extrae el File ID automáticamente                    |
| Vacío                        | Muestra un placeholder SVG                           |

> Si no configuras `GOOGLE_DRIVE_FOLDER_ID` / `GOOGLE_API_KEY`, el sitio sigue funcionando con File IDs directos o archivos en `productos-imagenes/`.

---

## Configurar el número de WhatsApp

El botón **"Consultar / Comprar"** de cada producto y las tarjetas de servicio abren WhatsApp.

En `script.js`:
```javascript
const WHATSAPP_NUMBER = '50686155449'; // código país + número, sin + ni espacios
```

Formato: código de país + número sin espacios.
- Costa Rica (+506) 8615 5449 → `50686155449`
- Colombia (+57) 300 123 4567 → `573001234567`

---

## Personalización rápida

| ¿Qué cambiar?                     | ¿Dónde?                                                       |
|-----------------------------------|---------------------------------------------------------------|
| Nombre / logo de la tienda        | `index.html` → sección `<header>`                             |
| Colores del tema                  | `styles.css` → variables `:root`                              |
| Horario y dirección               | `index.html` → sección `#contacto`                            |
| Servicios ofrecidos               | `index.html` → sección `#servicios`                           |
| Número de WhatsApp                | `script.js` → `WHATSAPP_NUMBER`                               |
| Sheet ID / hoja                   | `script.js` → `GOOGLE_SHEET_ID`                               |
| Marcar producto como agotado      | Google Sheet → columna `cantidad` → poner `0`                 |
| Aplicar descuento a un producto   | Google Sheet → columna `promocion` → poner el % (ej. `10`)   |
| Mostrar/ocultar banner            | Google Sheet → pestaña `Banner` → columna `activo`            |
| Cambiar mensaje del banner        | Google Sheet → pestaña `Banner` → columna `mensaje`           |
| URL en `robots.txt` y `sitemap.xml` | Reemplaza `TU_USUARIO` y `TU_REPO` con tu usuario y repositorio de GitHub |

---

## Tecnologías usadas

- **HTML5 / CSS3 / JavaScript** vanilla — sin frameworks ni dependencias
- **Google Sheets gviz/tq API** — lectura del catálogo sin API key
- **Google Drive** — alojamiento de imágenes (`lh3.googleusercontent.com/d/ID`)
- CSS Grid y Flexbox para layout responsive
- SVG inline para iconos

---

## Notas de seguridad

- El sitio es 100% frontend; no hay backend ni base de datos.
- Todos los textos del Sheet se escapan antes de insertarlos en el DOM para prevenir XSS.
- Los mensajes de WhatsApp usan `encodeURIComponent`.
- La API Key de Google Cloud debe restringirse al dominio de GitHub Pages.
