# Sistema de diseño — Plataforma GIMPA

Guía viva del lenguaje visual del frontend. La idea es **replicar estos patrones
poco a poco en todas las pantallas** para lograr un producto coherente, moderno y
con la identidad de Gimnasio El Paraíso.

> Primera pantalla estandarizada: **Login** (`src/pages/Login.tsx`).
> Úsala como referencia de estilo al migrar el resto.

---

## 1. Principios

- **Moderno y pulido:** bordes redondeados, sombras suaves, transiciones cortas.
- **Institucional y confiable:** el azul de marca manda; el verde es acento.
- **Con carácter, sin ruido:** un solo elemento de "firma" por pantalla; el resto,
  tranquilo y disciplinado.
- **Accesible por defecto:** foco visible, contraste suficiente, respeto a
  `prefers-reduced-motion`, responsive hasta móvil.

---

## 2. Color

Definido en el theme daisyui `gimpa` (`src/index.css`). **Usa siempre los tokens
semánticos, nunca hex sueltos ni `text-gray-*`.**

| Token                | Hex       | Uso                                              |
| -------------------- | --------- | ------------------------------------------------ |
| `primary`            | `#1F3A5F` | Acción principal, enlaces, foco                  |
| `secondary`          | `#2E75B6` | Títulos fuertes, overlays de marca               |
| `accent`             | `#59AF4E` | Éxito, confirmaciones, detalles de acento        |
| `base-100`           | `#FAFAFA` | Fondo de superficies                             |
| `base-200`           | `#F3F4F6` | Fondo de página / zonas hundidas                 |
| `base-300`           | `#e9ecef` | Bordes sutiles, separadores                      |
| `base-content`       | `#374151` | Texto principal                                  |
| `info`               | `#003496` | Información, estados neutros de marca            |
| `success` / `warning` / `error` | — | Estados (ver `index.css`)                 |

> **Nota (2026-09-09):** esta tabla estaba desactualizada — tenía los colores previos
> al manual de marca. Sincronizada con los valores reales de `src/index.css`.

**Opacidad para jerarquía de texto** (en vez de grises arbitrarios):

- Texto principal: `text-base-content`
- Secundario: `text-base-content/60`
- Terciario / ayudas: `text-base-content/50`

---

## 3. Tipografía (parametrizada)

Dos familias, conectadas por variables. **Para cambiar la fuente de todo el sitio,
edita solo el bloque `@theme` en `src/index.css`** (y, si cambias de familia, sus
`@font-face` o el `<link>` de Google Fonts en `index.html`, según cómo se cargue).

```css
@theme {
  --font-sans:    "Inter", ui-sans-serif, system-ui, sans-serif;   /* cuerpo y UI */
  --font-display: "Poppins", ui-sans-serif, system-ui, sans-serif; /* títulos     */
}
```

| Rol            | Clase          | Familia | Notas                                  |
| -------------- | -------------- | ------- | -------------------------------------- |
| Cuerpo / UI    | `font-sans`\*  | Inter   | Por defecto en `body`; no hace falta declararla |
| Títulos        | `font-display` | Poppins | `h1`–`h2`, cifras destacadas, firma    |

\* aplicada globalmente al `body`.

**Pesos disponibles de Inter** _(2026-09-09)_: auto-hospedada en
`src/assets/fonts/inter/` (`@font-face` en `index.css`), ya no viene del `<link>`
de Google Fonts. Pesos según el manual de marca (Thin/Book/Regular/Medium) **más**
SemiBold/Bold (600/700, ya usados por `font-bold`/`font-semibold` en 51 archivos
antes de este cambio — sin ellos el navegador sintetiza negrita falsa):

| Peso        | CSS `font-weight` | Archivo                    |
| ----------- | ------------------ | --------------------------- |
| Thin        | 100                 | `Inter-Thin.ttf`            |
| Book\*\*    | 300                 | `Inter-Light.ttf`           |
| Regular     | 400                 | `Inter-Regular.ttf`         |
| Medium      | 500                 | `Inter-Medium.ttf`          |
| SemiBold    | 600                 | `Inter-SemiBold.ttf`        |
| Bold        | 700                 | `Inter-Bold.ttf`            |

\*\* Inter no tiene un peso literal llamado "Book" — se usa `Light` como el más
cercano a ese rol.

**Aleo** _(2026-09-09)_ — fuente de marca, aún no activada en `--font-display`:
reemplaza a Neue Aachen Pro (esa llegó sin archivo de licencia — no se podía
confirmar uso web —, se eliminó del proyecto). Aleo es de Google Fonts, licencia
libre (`OFL.txt`), auto-hospedada en `src/assets/fonts/aleo/` con los mismos 4
pesos del manual (Thin/Book/Regular/Medium — como con Inter, no tiene un peso
literal "Book"; se usa `Light`). **Pendiente:** decidir si se activa ya como
`--font-display` (la licencia ya no es un impedimento) o se deja para más adelante.

**Escala usada en Login** (referencia): `text-4xl font-bold` (título de página),
`text-base` (subtítulo), `text-sm` (ayudas).

---

## 4. Radios, sombras y transiciones

Los tres ingredientes del acabado "moderno". Mantenlos consistentes.

| Concepto        | Valor recomendado                              | Ejemplo                         |
| --------------- | ---------------------------------------------- | ------------------------------- |
| Radio de acción | `rounded-2xl` (botones/cards grandes)          | botón de login                  |
| Radio de campo  | `rounded-lg` (inputs, botones chicos)          | ver `--radius-field` en theme   |
| Sombra base     | `shadow-sm`                                    | estado reposo                   |
| Sombra hover    | `shadow-lg shadow-primary/25`                  | elevación al pasar el mouse     |
| Transición      | `transition-all duration-200 ease-out`         | **estándar en todo lo interactivo** |

---

## 5. Patrón de botón (acción principal)

Copia/pega este patrón para el CTA de cualquier pantalla:

```tsx
<button
  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl
             bg-primary px-6 text-base font-medium text-primary-content shadow-sm
             transition-all duration-200 ease-out
             hover:-translate-y-0.5 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/25
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
             focus-visible:ring-offset-2 focus-visible:ring-offset-base-100
             active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70
             motion-reduce:transition-none motion-reduce:hover:translate-y-0"
>
  …
</button>
```

Claves: micro-elevación en hover, **foco visible** con `ring`, estado `disabled`
y anulación de movimiento con `motion-reduce`.

> **Decisión (2026-07-09):** el frontend usa **solo daisyui + Tailwind**. Se eliminó
> el shadcn/ui residual (`ui/button`, `ui/dialog`, `components.json`, deps Radix y
> `class-variance-authority`). Para botones dentro de formularios/tablas usa las
> clases daisyui (`btn btn-primary`, `btn btn-outline`, …); para CTAs grandes, el
> patrón de arriba. Los widgets accesibles complejos (combobox, tablas con filtro,
> date picker) se traerán con librerías headless puntuales cuando se necesiten, no
> con todo shadcn.

---

## 5b. Botones de acción en filas/tablas (solo ícono)

Las acciones por fila (ver, editar, eliminar) son **solo ícono**, sin texto ni
color de fondo. Nunca `btn btn-ghost` con la palabra al lado ("Ver", "Editar").
El significado lo da el ícono + `title` (tooltip/accesibilidad); el color aparece
solo en hover. Referencia canónica: `matriculas/matriculasUI/EnrollmentRow` y
`pages/Usuarios`.

```tsx
{/* Ver detalles / acción neutra → primary en hover */}
<button
  className="p-2 text-base-content/40 hover:text-primary hover:bg-primary/10
             rounded-full transition-all cursor-pointer"
  title="Ver detalles"
  onClick={…}
>
  <Eye className="h-5 w-5" />
</button>

{/* Eliminar / destructiva → error en hover */}
<button
  className="p-2 text-base-content/40 hover:text-error hover:bg-error/10
             rounded-full transition-all cursor-pointer"
  title="Eliminar"
  onClick={…}
>
  <Trash2 className="h-5 w-5" />
</button>
```

Claves: `p-2 rounded-full` (área táctil circular), reposo apagado
(`text-base-content/40`), el color de la acción solo en `hover:text-*` +
`hover:bg-*/10`, `transition-all`, `cursor-pointer` y **siempre `title`**.
Íconos `lucide-react` a `h-5 w-5`.

---

## 6. Estados

- **Carga:** ícono `Loader2` de `lucide-react` con `animate-spin` + texto de acción
  en gerundio ("Conectando…"). Deshabilita el control mientras tanto.
- **Vacío / error:** dan dirección, no disculpas. Di qué pasó y cómo seguir.
- **Confirmaciones destructivas:** usa el modal `Alert` (`components/ui/Alert`) con
  `variant`/`acceptText`, **nunca `confirm()` nativo**. Referencia: `MatriculasAdmin`.
- **Feedback de acción (éxito/error):** toast efímero (arriba-derecha, `bg-base-100`
  + ícono de estado, auto-cierre ~3.5 s), **nunca `alert()` nativo**. Hoy es local en
  `MatriculasAdmin`; **candidato a extraer** a un componente/hook compartido.

---

## 7. Movimiento

- Transiciones cortas (150–200 ms), `ease-out`. Menos es más.
- Todo lo que anima debe tener su variante `motion-reduce:*`, y hay una regla global
  en `index.css` que corta animaciones cuando el sistema pide reducir movimiento.

---

## 7b. Transición entre vistas de un card

Para cards multi-vista (login, wizards), anima la entrada con `.animate-view-in`
(definida en `index.css`: fade + 6px, `0.42s`, fill-mode `backwards` para no dejar
un `transform` pegado que reste nitidez al texto). Fuerza el remonte con un `key`
por vista. Respeta `prefers-reduced-motion` por la regla global.

## 8. Layout de referencia (Login)

Split-screen: acceso a la izquierda (`lg:w-2/5`), hero a la derecha
(`hidden lg:block lg:w-3/5`) con overlay de marca degradado + firma (nombre y lema
real del escudo). En móvil solo se muestra el panel de acceso, centrado.

---

## 12. Modales con scroll

Un modal alto se estructura en **tres franjas** dentro de un contenedor
`flex flex-col max-h-[90vh] overflow-hidden`:

- **Header** `shrink-0` (avatar + título).
- **Cuerpo** `flex-1 overflow-y-auto` — **el único elemento con scroll**.
- **Footer** `shrink-0` con las acciones (siempre visibles).

**Nunca anidar dos contenedores con `overflow-y-auto`** (p. ej. el cuerpo del modal
y, dentro, el área de pestañas): produce **doble barra de scroll**. El contenido
interno (tabs, listas de documentos) debe fluir con `min-h-[…]` pero **sin** su
propio `max-h/overflow`; deja que el cuerpo sea el que desplaza. Referencia:
`ContratacionAdmin` → `DetailModal`.

**Bloqueo del fondo:** con un modal abierto, **el `<body>` no debe hacer scroll**
(para eso está el backdrop difuminado: aislar la interacción). Todo modal usa el hook
`hooks/useBodyScrollLock(active)`, que fija `overflow: hidden` en el body y compensa
el ancho de la scrollbar (para que el fondo no “salte”). Soporta modales anidados.
Aplicado en `AnimatedModal` (Matrículas), `UserFormModal`, `Alert`, `DetailModal` /
`Overlay` (Contratación) y `PdfModal`. **Todo modal nuevo debe llamarlo.**

---

## 11. Selects de filtro

Los filtros de las páginas usan **`components/ui/FilterSelect`** (dropdown de daisyui),
**no `<select>` nativo**. Motivo: el navegador dibuja la opción activa con un ✓ que no
se puede reemplazar de forma fiable por CSS; el dropdown propio resalta la opción
seleccionada con el color de marca (`bg-primary text-primary-content`) y se cierra al
elegir o al perder foco. Uso:

```tsx
<FilterSelect
  className="w-56"
  ariaLabel="Filtrar por rol"
  value={roleFilter}
  onChange={setRoleFilter}
  options={[{ value: "", label: "Todos los roles" }, ...ROLE_OPTIONS]}
/>
```

Aplicado en `MatriculasAdmin` (grado/estado/año), `Usuarios` (rol) y
`ContratacionAdmin` (año). Para los `<select>` de **formulario** que siguen siendo
nativos, hay una regla global en `index.css` que colorea `option:checked` con el
color de marca.

---

## 10. Encabezado de página

**Cada página es dueña de su propio título.** El `Navbar` **no** repite el nombre de
la sección (sería redundante); solo lleva el menú de usuario a la derecha. Así, el
título vive una sola vez, dentro del contenido, y no se duplica.

Patrón del `<h1>` de página:

```tsx
<h1 className="font-display text-3xl font-bold text-secondary">
  Gestión de Notas
</h1>
```

- `font-display` (Poppins) + `text-secondary` (azul de marca fuerte).
- `text-3xl` para páginas con contenido; `text-2xl` para cards/placeholders.
- Si la página es un placeholder, envuélvelo en el card estándar:
  `rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm` y una descripción en
  `text-base-content/70`.

---

## 9. Pendientes de migración

A medida que toquemos cada pantalla, alinearla con esta guía:

- [x] **Migrar clases de tokens shadcn muertas → tokens daisyui.** _(hecho 2026-07-09)_
      Estaban escritas inline y nunca se generaron (no se cablearon a Tailwind v4).
      Equivalencias aplicadas (referencia para futuros casos):
  - `bg-background` / `bg-card` → `bg-base-100`
  - `text-muted-foreground` / `placeholder:text-muted-foreground` → `text-base-content/60`
  - `hover:bg-accent hover:text-accent-foreground` → `hover:bg-base-200` (botón outline)
    o `hover:bg-primary/90` (botón primario)
  - `ring-ring` → `ring-primary`
  - `border-input` → `border-base-300` · `text-primary-foreground` → `text-primary-content`
  - Archivos migrados: `auxiliar/userRegister.tsx`, `auxiliar/userUpdate.tsx`,
    `auxiliar/userEnroll.tsx`, `pages/Pagos.tsx`, `pages/NotAuthorized.tsx`,
    `pages/Index.tsx`, `matriculas/MatriculasAdmin.tsx`. Verificado: 0 tokens muertos
    restantes en `src`, typecheck sin errores nuevos.
- [x] **Marco de la app estandarizado** _(2026-07-09)_: `Layout` (main sobre
      `bg-base-200` para dar profundidad a las cards), `Sidebar` (verde con activo
      `--accent-dark` de más contraste, íconos `h-5 w-5`, foco visible), `Navbar`
      (tokens, `lucide`, `text-error`; **ya no repite el título de la sección**) y
      `Dashboard` (re-estilizado).
- [x] **Título de página estandarizado** _(2026-07-09)_: **cada página es dueña de
      su propio `<h1>`** (`font-display text-secondary`, `text-3xl`/`text-2xl`); el
      **`Navbar` no lo repite**. Alineados: `Notas`, `Estudiantes`, `Certificados`,
      `Usuarios`, `Pagos`, `RegisterUser`, `ContratacionAdmin` y el `<h2>` de
      `EnrollmentBlockedMessage`. Ver §10.
- [x] **Aplicar `font-display` a títulos** _(2026-07-09)_. ⚠️ `font-poppins` y
      `font-inter` **no existen** como utilidades (solo `font-sans`/`font-display` en el
      `@theme`): eran **clases muertas**, los títulos que las usaban caían en Inter.
      Migrados: `Dashboard`, `Sidebar`, `pages/Certificados.tsx`, `pages/Estudiantes.tsx`,
      `pages/Notas.tsx`, `matriculas/EnrollmentBlockedMessage.tsx`. Verificado: 0
      `font-poppins`/`font-inter` restantes en `src`.
- [x] **Matrículas (admin) estandarizado** _(2026-07-09)_: **tabla maestra filtrable**
      (grado · estado · búsqueda · año) con **paginación** (15/pág, `join` de daisyui,
      se reinicia al filtrar) en vez de acordeones por grado; stats con Pendientes;
      `alert()/confirm()` → **toasts** + modal **`Alert`**; tokens y `font-display`.
      `GradeAccordion` quedó sin uso (borrable). La paginación y el toast son
      **candidatos a extraer** a componentes compartidos para otras tablas.
- [x] **Detalle del estudiante y forms de matrícula estandarizados** _(2026-07-09)_:
      `StudentDataTabs` (tabs, estado vacío y tarjetas de documentos a tokens),
      `DisplayField` (grises → `base-content/opacidad`, `border-base-200`, resaltado
      `text-error`), cabecera del modal de detalle (`font-display text-secondary`),
      títulos de todos los modales (`font-display text-secondary`), y los dos
      formularios: `auxiliar/enrollmentUpdate.tsx` (ComboBox, mensajes y encabezados a
      tokens) y `auxiliar/userEnroll.tsx` (**selects falsos con `style=` inline →
      `select`/`input` de daisyui**, dropdown de búsqueda con tokens, botones daisyui).
- [x] **Diálogos nativos del detalle eliminados** _(2026-07-09)_: `StudentDataTabs` ya
      no usa `alert()`/`confirm()` en las acciones de documentos; ahora usa **toast**
      efímero + modal **`Alert`** para confirmar el borrado. Como el modal de detalle usa
      `transform` (un hijo `fixed` se posicionaría respecto a él, no al viewport), el toast
      y el `Alert` se montan con **`createPortal(..., document.body)`**. Patrón a reutilizar
      para cualquier feedback dentro de un contenedor con `transform`.
- [x] **Usuarios estandarizado** _(2026-07-09)_: `pages/Usuarios.tsx` (tabla, filas y
      paginación a tokens; modal de borrado a mano → **`Alert`** compartido; `alert()` →
      **toast** daisyui) y `components/users/UserFormModal.tsx` (todos los **hex
      hardcodeados** `#3b4aa0`/`#f8f9fa`/`#e9ecef`/`#2a2a2a`/`#dc3545` → tokens, mensajes
      success/error, `fill-mode-forwards` en la salida, botones daisyui).
- [x] **Contratación estandarizado** _(2026-07-09)_: `ContratacionAdmin.tsx` (tabla,
      `SearchSelect`, `Overlay`, tarjetas de documento y tabs a tokens; header del detalle
      `font-display text-secondary`; alto fijo `h-[400px]` → `min-h/max-h` como el detalle
      de matrícula; **3 `confirm()` nativos → `Alert`**), `ContratacionEmpleado.tsx`
      (`SectionCard`, tarjetas de estado, wizard de pasos, títulos `font-display`) y
      `FieldWidget.tsx`. Verificado: 0 grises/hex/`bg-white` restantes en el módulo.
- [~] Reemplazar `text-gray-*` por tokens `base-content/opacidad` (hecho en el marco,
      Matrículas, detalle/forms de matrícula, Usuarios y Contratación; quedan páginas sueltas).
- [ ] Unificar radios/sombras/transiciones al estándar de §4.
- [ ] Revisar foco visible y `motion-reduce` en componentes interactivos.
- [ ] (Opcional) Limpiar de `src/index.css` las variables shadcn muertas del
      bloque `:root` (`--background`, `--foreground`, `--card`, `--muted`, `--ring`,
      `--input`, `--popover`, `--destructive`, `--radius` y sus `-foreground`). Ya
      ninguna clase las referencia. **Conservar** `--accent`, `--accentlight`,
      `--primary-*`, `--accent-dark`: `Sidebar.tsx` los usa vía `bg-[hsl(var(--accent))]`
      y `bg-[hsl(var(--accentlight))]`.
