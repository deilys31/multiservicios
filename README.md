# Multiservicios Tecnológicos — Tienda de electrónica y pagos de servicios

> Sitio web estático publicable en GitHub Pages. El catálogo de productos se carga automáticamente desde un **Google Sheet** público; las imágenes se sirven desde **Google Drive**. No se necesita backend, base de datos ni API key.

---

## Estructura de archivos

```
/
├── index.html              ← Página principal
├── styles.css              ← Estilos (tema tecnología oscuro)
├── script.js               ← Lógica: Google Sheets, Drive, renderizado
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

## Configuración inicial (`script.js`)

Abre `script.js` y edita las constantes en la sección **CONFIGURACIÓN**:

```javascript
const WHATSAPP_NUMBER     = '50686155449';               // Tu número (código país + número)
const GOOGLE_SHEET_ID     = 'TU_ID_DE_SPREADSHEET';      // ID de tu Google Sheet
const GOOGLE_SHEET_NAME   = 'Productos';                 // Nombre de la pestaña
const GOOGLE_DRIVE_FOLDER_ID = 'TU_ID_DE_CARPETA';       // ID de la carpeta de Drive con imágenes
const GOOGLE_API_KEY      = 'TU_API_KEY';                // API Key de Google Cloud (Drive API v3)
```

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

## Catálogo de productos — Google Sheet

El Sheet debe tener una hoja llamada **`Productos`** con estas columnas en la fila 1:

| Columna       | Descripción                                                      | Ejemplo               |
|---------------|------------------------------------------------------------------|-----------------------|
| `nombre`      | Nombre del producto                                              | Cable USB-C           |
| `precio`      | Precio en colones (número o texto)                               | 3500                  |
| `imagen`      | Nombre del archivo en la carpeta de Drive (ej. `cargador.jpg`)  | cargador.jpg          |
| `descripcion` | Descripción corta (opcional)                                     | 1 metro, carga rápida |

- Para **agregar** un producto: agrega una fila al final del Sheet.
- Para **eliminar** un producto: borra la fila completa.
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

| ¿Qué cambiar?               | ¿Dónde?                              |
|-----------------------------|--------------------------------------|
| Nombre / logo de la tienda  | `index.html` → sección `<header>`    |
| Colores del tema            | `styles.css` → variables `:root`     |
| Horario y dirección         | `index.html` → sección `#contacto`  |
| Servicios ofrecidos         | `index.html` → sección `#servicios` |
| Número de WhatsApp          | `script.js` → `WHATSAPP_NUMBER`     |
| Sheet ID / hoja             | `script.js` → `GOOGLE_SHEET_ID`     |

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
