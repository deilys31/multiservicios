# TechStore — Tienda de electrónica y pagos de servicios

> Sitio web estático listo para usar. Catálogo de productos alimentado automáticamente desde un archivo Excel.

---

## Estructura de archivos

```
/
├── index.html              ← Página principal
├── styles.css              ← Estilos (tema tecnología)
├── script.js               ← Lógica de carga del Excel y renderizado
├── productos.xlsx          ← Catálogo de productos (¡edítalo tú!)
├── generar_excel.html      ← Herramienta para (re)generar el Excel en el navegador
├── generar_excel.py        ← Script Python alternativo para generar el Excel
└── productos-imagenes/     ← Carpeta de imágenes de los productos
    ├── cargador-usb.svg
    ├── audifonos-bt.svg
    ├── cable-hdmi.svg
    ├── powerbank.svg
    └── hub-usb.svg
```

---

## Cómo abrir el sitio

> ⚠️ **Importante:** el sitio usa `fetch()` para leer el Excel. Esta API **no funciona con el protocolo `file://`** (doble clic en `index.html`). Debes servirlo con un servidor local HTTP.

### Opción A — Live Server (VS Code) — **Recomendada**

1. Instala la extensión **Live Server** (Ritwick Dey) en VS Code.
2. Abre la carpeta del sitio en VS Code.
3. Clic derecho sobre `index.html` → **Open with Live Server**.
4. El sitio se abrirá en `http://127.0.0.1:5500/index.html`.

### Opción B — Python (sin instalar nada extra)

```bash
# Desde la carpeta raíz del sitio:
python -m http.server 8080
# Abre http://localhost:8080 en tu navegador
```

### Opción C — Node.js / npx

```bash
npx serve .
# Abre la URL que indique la consola
```

---

## Cómo actualizar el catálogo de productos

El catálogo se genera **automáticamente** desde `productos.xlsx` cada vez que se carga la página.
No necesitas tocar el código HTML ni JS.

### Editar precios o descripción

1. Abre `productos.xlsx` con Excel, LibreOffice Calc o similar.
2. Modifica las celdas que quieras (nombre, precio, descripción).
3. Guarda el archivo.
4. Recarga la página → los cambios aparecen al instante.

### Agregar un nuevo producto

1. Abre `productos.xlsx`.
2. Agrega una nueva fila al final con los siguientes campos:

   | Columna      | Descripción                                        | Ejemplo               |
   |--------------|----------------------------------------------------|-----------------------|
   | `nombre`     | Nombre del producto                                | Cable USB-A a USB-C   |
   | `precio`     | Precio con símbolo de moneda o número              | $9.99                 |
   | `imagen`     | Nombre **exacto** del archivo en `productos-imagenes/` | cable-usb-c.jpg   |
   | `descripcion`| Descripción corta (opcional, puede dejarse vacía)  | 1 metro, carga rápida |

3. Guarda el archivo y recarga la página.

### Eliminar un producto

1. Abre `productos.xlsx`.
2. Elimina la fila completa del producto.
3. Guarda y recarga.

---

## Cómo agregar imágenes de productos

1. Copia la imagen (`.jpg`, `.png` o `.svg`) a la carpeta `productos-imagenes/`.
2. Escribe el nombre **exacto** del archivo (incluyendo extensión) en la columna `imagen` del Excel.

   ```
   productos-imagenes/
   └── mi-producto.jpg   ← la imagen
   
   Excel → columna "imagen" → mi-producto.jpg
   ```

3. Si la imagen no se encuentra, se mostrará un ícono de placeholder automáticamente.

> **Tip:** usa nombres de archivo sin espacios ni caracteres especiales (usa `-` o `_`).

---

## Configurar el número de WhatsApp

El botón **"Consultar / Comprar"** de cada producto abre WhatsApp con un mensaje predefinido.

1. Abre `script.js`.
2. Modifica la constante en la línea 18:

   ```javascript
   const WHATSAPP_NUMBER = '573001234567'; // ← Tu número aquí
   ```

   Formato: código de país + número, **sin** `+`, espacios ni guiones.
   - Colombia (+57) 300 123 4567 → `573001234567`
   - México (+52) 55 1234 5678 → `525512345678`
   - Venezuela (+58) 412 123 4567 → `584121234567`

3. Actualiza también el enlace en la sección de Contacto de `index.html` (busca `wa.me/10000000000`).

---

## Cómo regenerar el Excel de ejemplo

Si borras o corrompes `productos.xlsx`, tienes dos opciones:

### Opción A — Navegador (sin instalar nada)

1. Abre `generar_excel.html` en un navegador **con acceso a internet** (necesita CDN de SheetJS).
2. Haz clic en **"Generar y Descargar productos.xlsx"**.
3. Mueve el archivo descargado a la carpeta raíz del sitio.

### Opción B — Python

```bash
pip install openpyxl
python generar_excel.py
```

---

## Personalización rápida

| ¿Qué cambiar?               | ¿Dónde?                             |
|-----------------------------|-------------------------------------|
| Logo / nombre de la tienda  | `index.html` → busca `logo-text`    |
| Colores del tema            | `styles.css` → variables `:root`    |
| Dirección / horario         | `index.html` → sección `#contacto` |
| Servicios ofrecidos         | `index.html` → sección `#servicios`|
| Número de WhatsApp          | `script.js` → `WHATSAPP_NUMBER`    |
| Carpeta de imágenes         | `script.js` → `IMG_FOLDER`         |

---

## Tecnologías usadas

- **HTML5 / CSS3 / JavaScript** vanilla — sin frameworks
- **[SheetJS (XLSX)](https://sheetjs.com/)** — lectura del archivo Excel en el navegador
- Diseño responsive con CSS Grid y Flexbox
- SVG inline para iconos (sin dependencias externas)

---

## Notas de seguridad

- El sitio es 100% frontend; no hay backend ni base de datos.
- Todos los textos del Excel se escapan antes de insertarlos en el DOM para prevenir XSS.
- Los enlaces de WhatsApp usan `encodeURIComponent` para los mensajes.
