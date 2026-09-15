# Sistema de diseño — Plataforma GIMPA

Guía viva del lenguaje visual del frontend. La idea es **replicar estos patrones
poco a poco en todas las pantallas** para lograr un producto coherente, moderno y
con la identidad de Gimnasio El Paraíso.

> **Referencias de estilo:**
> - **Módulos (formularios, tablas, modales, botones, toasts):** Matrículas es la fuente
>   de verdad del lenguaje visual. Sus clases ya están centralizadas en
>   `components/ui/formStyles.ts` y en los componentes de `components/ui/` (ver §13).
> - **Pantalla de acceso:** `src/pages/Login.tsx` tiene un diseño propio y deliberado
>   (ver §8). No copies su estilo a otras pantallas.
>
> _Última revisión contra el código: 2026-09-11 (Matrícula v2)._

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

Definido en el theme daisyui `gimpa` (`src/index.css`), según el manual de marca.
**Usa siempre los tokens semánticos, nunca hex sueltos ni `text-gray-*`.**

| Token                | Hex       | Uso                                              |
| -------------------- | --------- | ------------------------------------------------ |
| `primary`            | `#1F3A5F` | Acción principal, enlaces, foco, fondo del sidebar |
| `secondary`          | `#2E75B6` | Títulos de página, overlays de marca             |
| `accent`             | `#59AF4E` | Éxito, confirmaciones, CTA del Login             |
| `neutral`            | `#6B7280` | Gris medio (sin rol específico en el manual)     |
| `base-100`           | `#FAFAFA` | Fondo de superficies (cards, modales, navbar)    |
| `base-200`           | `#F3F4F6` | Fondo de página / zonas hundidas / ítem activo del sidebar |
| `base-300`           | `#e9ecef` | Bordes sutiles, separadores                      |
| `base-content`       | `#374151` | Texto principal                                  |
| `info`               | `#003496` | Información, estados neutros de marca            |
| `success`            | `#166534` | Estado correcto                                   |
| `warning`            | `#ff6b35` | Advertencia (sin dato en el manual, valor previo) |
| `error`              | `#B91C1C` | Error, acciones destructivas                     |

Todos los `*-content` son `#ffffff`. Radios del theme: `--radius-selector`,
`--radius-field` y `--radius-box` = `0.5rem`.

**Opacidad para jerarquía de texto** (en vez de grises arbitrarios):

- Texto principal: `text-base-content`
- Secundario: `text-base-content/60`
- Terciario / ayudas: `text-base-content/50`

**Única excepción a "nada de hex":** el degradado del panel de marca del Login
(`PANEL_GRADIENT_FROM`/`PANEL_GRADIENT_TO` en `Login.tsx`) va como string en un
`style` inline, porque Tailwind no puede leer un `var()` dentro de un degradado armado
en JS. `PANEL_GRADIENT_FROM` es el mismo valor que `primary`.

---

## 3. Tipografía (parametrizada)

Dos familias, conectadas por variables. **Para cambiar la fuente de todo el sitio,
edita solo el bloque `@theme` en `src/index.css`** (y, si cambias de familia, sus
`@font-face` en el mismo archivo).

```css
@theme {
  --font-sans:    "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif; /* cuerpo y UI */
  --font-display: "Aleo", ui-serif, Georgia, serif;                               /* títulos     */
}
```

| Rol            | Clase          | Familia          | Notas                                  |
| -------------- | -------------- | ---------------- | -------------------------------------- |
| Cuerpo / UI    | `font-sans`\*  | Inter            | Por defecto en `body`; no hace falta declararla |
| Títulos        | `font-display` | Aleo (serif)     | `h1`–`h2`, cifras destacadas, firma    |

\* aplicada globalmente al `body`. No existen `font-poppins` ni `font-inter` como
utilidades.

**Ambas fuentes se auto-hospedan** (`@font-face` en `index.css`, archivos en
`src/assets/fonts/`). `index.html` ya no carga nada desde Google Fonts.

**Pesos de Inter** (`src/assets/fonts/inter/`): los del manual de marca
(Thin/Book/Regular/Medium) **más** SemiBold/Bold, porque `font-semibold`/`font-bold`
se usan en toda la app y sin esos archivos el navegador sintetiza una negrita falsa.

| Peso        | CSS `font-weight` | Archivo                    |
| ----------- | ------------------ | --------------------------- |
| Thin        | 100                 | `Inter-Thin.ttf`            |
| Book\*\*    | 300                 | `Inter-Light.ttf`           |
| Regular     | 400                 | `Inter-Regular.ttf`         |
| Medium      | 500                 | `Inter-Medium.ttf`          |
| SemiBold    | 600                 | `Inter-SemiBold.ttf`        |
| Bold        | 700                 | `Inter-Bold.ttf`            |

\*\* Inter no tiene un peso literal llamado "Book": se usa `Light` como el más cercano.

**Aleo** (`src/assets/fonts/aleo/`) es la fuente de marca para títulos desde
2026-09-09. Reemplazó a Poppins en `--font-display` y a Neue Aachen Pro, que llegó sin
archivo de licencia y se eliminó del proyecto. Aleo viene de Google Fonts con licencia
libre (OFL). Solo se cargaron los 4 pesos del manual:

| Peso      | CSS `font-weight` | Archivo            |
| --------- | ------------------ | ------------------ |
| Thin      | 100                 | `Aleo-Thin.ttf`    |
| Book\*\*  | 300                 | `Aleo-Light.ttf`   |
| Regular   | 400                 | `Aleo-Regular.ttf` |
| Medium    | 500                 | `Aleo-Medium.ttf`  |

> ⚠️ **Negrita sintética en títulos.** Aleo no tiene 600/700 cargados: `font-semibold` y
> `font-bold` sobre `font-display` se ven **igual** (el navegador toma el Medium y le
> inventa la negrita: más gruesa, apretada y menos legible — comprobado en Chrome).
> **Decisión en Matrículas (2026-09-11):** los títulos en Aleo van en `font-medium`, el
> peso real más alto del manual, con los tokens de `src/components/ui/textStyles.ts`
> (`titleClass`, `smallTitleClass`, `cardTitleClass`, `SubSection`). Quedan los títulos
> de página (`text-3xl font-bold`) y ~50 combinaciones fuera de Matrículas (ver §14).

**Tipografía de Matrículas (estudiante y staff): `src/components/ui/textStyles.ts`.** Las
dos vistas usan los mismos tokens: título de paso/modal, tarjeta de sección (igual que
`SubSection`), nombre de un elemento (`font-medium`, 16 px), texto secundario (`text-sm`
al 60 %), dato en solo lectura (etiqueta como la del campo del formulario y valor en
16 px) y comentarios citados. Nada que haya que leer va en 12 px al 50 %.

**Escala de referencia:** `text-3xl font-bold` (título de página y del Login),
`text-2xl` (cards/placeholders), `text-base` (subtítulo), `text-sm` (ayudas).

---

## 4. Radios, sombras y transiciones

Los tres ingredientes del acabado "moderno". Mantenlos consistentes.

| Concepto        | Valor recomendado                              | Ejemplo                         |
| --------------- | ---------------------------------------------- | ------------------------------- |
| Radio de card   | `rounded-2xl` (cards grandes, placeholders)     | card de placeholder (§10)       |
| Radio de campo  | `0.5rem` del theme (`--radius-field`)          | `btn`, `input`, `select` de daisyUI; `rounded-lg` si es a mano |
| Sombra base     | `shadow-sm`                                    | estado reposo, `primaryBtnClass` |
| Sombra hover    | `shadow-lg shadow-primary/25`                  | elevación al pasar el mouse     |
| Transición      | `transition-all duration-200 ease-out`         | **estándar en todo lo interactivo** |

---

## 5. Botones

### 5.1 Botón de formulario / módulo (estándar)

Usa las constantes de `components/ui/formStyles.ts`, nunca un string propio:

```tsx
import { primaryBtnClass, ghostBtnClass, outlineBtnClass } from "@/components/ui/formStyles";

<button className={primaryBtnClass}>Guardar</button>  {/* "btn btn-primary gap-2 shadow-sm" */}
<button className={ghostBtnClass}>Cancelar</button>   {/* "btn btn-ghost gap-2" */}
<button className={outlineBtnClass}>Atrás</button>    {/* contorno suave, fondo al pasar */}
```

- **"Atrás" / volver** en un asistente: `outlineBtnClass` (con contorno, nunca ghost).
- **Acciones del pie de un modal** (rechazar, cancelar, solicitar corrección, cambiar
  grado): `btn btn-outline btn-<intención>`; solo la acción principal es sólida. **Aprobar**
  es verde (`btn btn-success`) con hover visible (se aclara y sube la sombra: el hover de
  daisyUI apenas oscurece un 7 % y el tema no define `--depth`, así que en colores oscuros
  no se nota).

Para otras variantes, usa las clases de daisyUI directamente: `btn btn-outline`,
`btn btn-error`, `btn-sm`…

Esta es la misma clase que usa Matrículas en listados, modales y paneles. Admisiones
tenía su propia familia de botones con hover-lift, sombra de color y `h-12 rounded-xl`,
sin equivalente en Matrículas. Se eliminó para igualarla (ver la cabecera de
`formStyles.ts`). `adminPrimaryBtnClass`/`adminGhostBtnClass` son solo alias de
compatibilidad: no los uses en código nuevo.

### 5.2 CTA del Login (excepción deliberada)

`Login.tsx` define localmente su CTA: píldora `rounded-full bg-accent`, `min-h-12`,
micro-elevación en hover con `shadow-accent/25`, anillo de foco, `disabled:opacity-70`
y variantes `motion-reduce:*`. También define un botón secundario `rounded-full border`
y su propio estilo de campo (subrayado, sin caja). Pertenece a esa pantalla; no lo
copies a otras.

### 5.3 CTA grande anterior (legado)

El patrón `h-14 rounded-2xl bg-primary ... hover:-translate-y-0.5
hover:shadow-primary/25` que esta guía recomendaba antes solo sobrevive en
`pages/NotFound.tsx` y `pages/Roles.tsx`. **No lo uses en pantallas nuevas** (ver §14).

> **Decisión (2026-07-09):** el frontend usa **solo daisyui + Tailwind**. Se eliminó
> el shadcn/ui residual (`ui/button`, `ui/dialog`, `components.json`, deps Radix y
> `class-variance-authority`). Los widgets accesibles complejos se construyen sobre
> daisyUI (ya existen `ComboBox`, `FilterSelect`, `OtpInput`, `tabs`; ver §13) o se
> traerán con librerías headless puntuales cuando se necesiten, no con todo shadcn.

---

## 5b. Botones de acción en filas/tablas (solo ícono)

Las acciones por fila (ver, editar, eliminar) son **solo ícono**, sin texto ni
color de fondo. Nunca `btn btn-ghost` con la palabra al lado ("Ver", "Editar").
El significado lo da el ícono + `title` (tooltip/accesibilidad); el color aparece
solo en hover. Referencias: `matriculas/matriculasUI/EnrollmentRow`,
`pages/Usuarios` y el botón "Ver expediente" de `pages/AdmisionesAdmin`.

```tsx
import { iconBtnClass, iconClass, iconHover } from "@/components/ui/formStyles";

{/* Ver detalles / acción neutra → primary en hover */}
<button type="button" className={`${iconBtnClass} ${iconHover.primary}`}
        title="Ver" aria-label={`Ver la matrícula de ${nombre}`} onClick={…}>
  <Eye className={iconClass} aria-hidden="true" />
</button>

{/* Eliminar / destructiva → error en hover */}
<button type="button" className={`${iconBtnClass} ${iconHover.error}`}
        title="Eliminar" aria-label={`Eliminar a ${nombre}`} onClick={…}>
  <Trash2 className={iconClass} aria-hidden="true" />
</button>
```

Claves (tokens en `src/components/ui/formStyles.ts`):

- **Gris opaco, nunca con transparencia** (`text-base-content/40`, `/60`…). Con un color
  con alpha cada tramo del SVG se pinta semitransparente y donde dos tramos se cruzan el
  gris se suma: el trazo queda a manchas (oscuro en uniones y puntas, claro en el resto) y
  se lee borroso. `iconBtnClass` usa `color-mix(base-content 70 %, base-100)`, que es
  opaco y además llega al contraste 3:1 de un ícono. Vale para cualquier ícono de Lucide
  que tenga que verse nítido.
- Ícono a 20 px (`iconClass` = `h-5 w-5`) y botón de 36 px (`p-2`).
- El color de la acción solo en hover (`iconHover.primary | success | accent | error |
  neutral`), `rounded-full`, foco visible y **siempre `title` + `aria-label`**
  (el `aria-label` dice sobre qué actúa: "Eliminar a Ana Pérez").
- Aplica también a la X de cerrar de los modales (`iconHover.neutral`).

---

## 6. Estados

- **Carga dentro de un botón** (guardar, enviar, conectar…): ícono `Loader2` de
  `lucide-react` con `animate-spin`, suelto junto al texto del botón, en gerundio
  ("Conectando…"). Deshabilita el control mientras tanto. **Nunca** uses el spinner
  nativo de daisyUI (`loading loading-spinner`) en este caso: mezclar los dos estilos
  en botones vecinos es justo la inconsistencia que se quiere evitar. **Nunca el spinner
  solo**: siempre spinner + texto. Úsalo con **`BusyLabel`**
  (`components/ui/BusyLabel.tsx`):
  `<BusyLabel busy={saving} busyText="Guardando…">Guardar</BusyLabel>`. Lo usan
  `Alert` (`pending`), `ConfirmDeleteDialog`, Contratación y los formularios de usuario.
- **Resultado de una acción** (éxito o error del servidor): **siempre** el toast
  compartido arriba a la derecha (`useToast` + `<Toast>`), **nunca** un mensaje dentro
  del diálogo o del formulario. Un formulario dentro de un modal recibe `flash` de la
  página que lo abre (así lo hacen `UserRegister` y `UserFormModal`).
- **Carga de una SECCIÓN o PÁGINA completa** (tabla, panel de detalle, modal
  cargando datos previos, un paso completo de un wizard): **siempre**
  `<LoadingState />` (`components/ui/LoadingState.tsx`), **nunca** armado a mano.
  Hasta 2026-09-10 convivían dos estilos distintos para el mismo propósito: el spinner
  nativo de daisyUI (un anillo sin ícono) en Usuarios, Matrículas y Contratación, y
  `Loader2` + texto en tarjeta en Admisiones. Se quedó el segundo y se extrajo al
  componente. **Usa el componente, no repitas el JSX a mano:**
  ```tsx
  import { LoadingState } from "@/components/ui/LoadingState";

  {loading ? (
    <LoadingState label="Cargando expedientes…" />
  ) : (
    …
  )}
  ```
  `compact` quita la tarjeta (borde, fondo y sombra) para cuando ya estás dentro de
  otro contenedor con su propio marco, como una fila de tabla o un modal chico. Si
  necesitas una variante que el componente no cubre (otro tamaño, otro layout),
  **amplía `LoadingState`, no crees un spinner suelto nuevo**.
  _Estado real:_ Admisiones todavía tiene 10 copias a mano de este mismo JSX, sin
  importar el componente. Ver §14.
- **Carga de pantalla completa al iniciar sesión:** `components/auxiliar/Spinner.tsx`
  (logo pulsando). Solo se usa mientras se rehidrata la sesión (`App.tsx`,
  `ProtectedRoute` en `loginLogic.tsx`). No lo uses para secciones.
- **Vacío / error:** dan dirección, no disculpas. Di qué pasó y cómo seguir.
- **Confirmar eliminar: `ConfirmDeleteDialog`** (`components/ui/ConfirmDeleteDialog`),
  la misma en toda la plataforma, **nunca `confirm()` nativo ni un `Alert` armado a mano**.
  Minimalista: título, una pregunta con lo que se elimina (el nombre en negrita) y, en
  rojo, "Este cambio es irreversible." (`irreversible={false}` si se puede restaurar);
  "Cancelar" con contorno suave y el botón rojo ("Eliminar usuario"). Mientras
  `onConfirm` trabaja: spinner en el botón ("Eliminando…"), botones bloqueados y el diálogo
  no se cierra. Si `onConfirm` termina bien se cierra solo; si lanza o devuelve `false`,
  queda abierto para reintentar. El toast de éxito (arriba a la derecha) lo lanza quien
  llama, con el nombre de lo eliminado:
  ```tsx
  <ConfirmDeleteDialog isOpen={!!toDelete} onClose={() => setToDelete(null)}
    title="Eliminar usuario" confirmText="Eliminar usuario"
    onConfirm={async () => { /* borrar; flash("success", …); return true | false */ }}>
    <p>Se eliminará al usuario <strong>{nombre}</strong> con sus datos y archivos.</p>
  </ConfirmDeleteDialog>
  ```
  Usos (todas las eliminaciones de la plataforma): usuarios, roles, matrículas, archivos
  de una matrícula, solicitudes de admisión (eliminar y eliminar permanentemente),
  contrataciones (documento, eliminar y eliminar permanentemente), plantillas de contrato y
  la foto de perfil. No aplica a "Quitar" algo que aún no se guardó (un archivo elegido
  antes de subirlo, la firma en el lienzo, la foto en un formulario).
- **Otras confirmaciones** (aprobar, reintegrar, enviar la matrícula…): `ConfirmDialog`
  con su `tone` (`success` para aprobar, `primary` para enviar o reintegrar), ver §12c.
  `Alert` queda para avisos largos que hay que leer (consentimientos, conflictos de
  guardado).
- **Feedback de acción (éxito/error):** usa el toast compartido, **nunca `alert()`
  nativo**:
  ```tsx
  import { useToast } from "@/hooks/use-toast";
  import { Toast } from "@/components/ui/Toast";

  const { toast, flash } = useToast();
  flash("success", "Guardado correctamente"); // success | error | warning | info

  return (
    <>
      <Toast toast={toast} />
      …
    </>
  );
  ```
  Muestra un toast a la vez, arriba a la derecha, sobre `bg-base-100` con ícono de
  estado, y se cierra solo a los 3.5 s. Para pasarlo a un subcomponente, usa el tipo
  `FlashFn` (ver `admisiones/admin/adminTypes.ts`).
  _Estado real:_ solo `ApplicationDetail` lo usa (y le pasa `flash` a `DecisionPanel`
  e `InterviewsPanel`). Quedan 5 toasts locales y 8 `alert()` nativos. Ver §14.

---

## 7. Movimiento

- Transiciones cortas (150–200 ms), `ease-out`. Menos es más.
- Todo lo que anima debe tener su variante `motion-reduce:*`, y hay una regla global
  en `index.css` que corta animaciones cuando el sistema pide reducir movimiento.
- Animaciones disponibles: `tailwindcss-animate` (`animate-in`, `fade-in`,
  `slide-in-from-*`…, usado por `Modal` y `Toast`), `.animate-modal-pop` (entrada de
  `Alert`) y `.animate-view-in` (ver §7b), ambas definidas en `index.css`.

---

## 7b. Transición entre vistas de un card

Para cards multi-vista (login, wizards), anima la entrada con `.animate-view-in`
(definida en `index.css`: fade + 6px, `0.42s`, fill-mode `backwards` para no dejar
un `transform` pegado que reste nitidez al texto). Fuerza el remonte con un `key`
por vista. Respeta `prefers-reduced-motion` por la regla global.

---

## 8. Layout de referencia (Login)

Pantalla dividida al 50/50 en desktop:

- **Izquierda, panel de marca** (`hidden lg:flex lg:w-1/2`): degradado
  `PANEL_GRADIENT_FROM → PANEL_GRADIENT_TO` (ver §2), escudo y la textura decorativa
  `login-log.svg`.
- **Derecha, panel de acceso** (`lg:w-1/2`, `bg-base-200`, contenido en `max-w-sm`):
  lleva una pestaña "Login" recortada con `clip-path` sobre la costura entre los dos
  paneles.
- **Móvil:** solo se muestra el panel de acceso. El escudo aparece arriba únicamente en
  la vista principal, para no forzar scroll en los formularios largos.
- Título `font-display text-3xl font-bold text-secondary`. Cada vista (principal,
  correo, registro, verificar, recuperar) entra con `.animate-view-in`.
- Los códigos de verificación usan `OtpInput` (§13).

---

## 9. Marco de la app (Layout, Sidebar y Navbar)

`Layout.tsx` (área de staff) y `AcudienteLayout.tsx` (área del acudiente) arman el
mismo marco con las mismas piezas, sin copiarlas:

- **Drawer de daisyUI:** `drawer lg:drawer-open` con un checkbox `drawer-toggle` cuyo
  id es `SIDEBAR_DRAWER_ID` (exportado desde `Sidebar.tsx`, no lo repitas a mano). El
  estado inicial sale de `useSidebarDrawerState()`: abierto en ≥1024 px, cerrado en
  móvil.
- **Contenido:** `Navbar` arriba y `<main className="flex-1 overflow-y-auto bg-base-200
  p-6">`. El fondo `base-200` da profundidad a las cards `base-100`.
- **Sidebar:** fondo `bg-primary`.
  - En desktop siempre está montado y alterna entre riel de íconos (`w-14`) y ancho
    completo (`w-64`). En móvil se abre como overlay.
  - Ítem activo: `bg-base-200 text-primary shadow-sm`. Ítem inactivo:
    `text-primary-content/70 hover:bg-white/10`.
  - En modo riel el ícono se centra y la etiqueta aparece como tooltip (`data-tip`).
  - Logo: escudo compacto en riel; `platform-logo.png` (wordmark en blanco) expandido.
  - **Ítems nuevos:** usa `SidebarNavLink`, no un `NavLink` crudo. El ítem también
    necesita su entrada en `featureEnvMap`, o no se muestra.
- **Navbar:** a la izquierda el botón `PanelLeft`, que abre y cierra el overlay en
  móvil y colapsa o expande el riel en desktop. A la derecha, el menú de usuario. **No
  lleva título** (§10).
- El header del sidebar y el `Navbar` miden los dos `h-18`, para que sus bordes
  inferiores queden alineados.
- **Acudiente:** el mismo `Sidebar` detecta `isGuardianOnly(user)` y muestra un solo
  ítem, "Mis solicitudes".
- **Cuenta sin rol** (`permissions == null`): `Layout` muestra `NoAccess`, sin sidebar
  ni botón de menú.

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

- `font-display` (Aleo) + `text-secondary` (azul de marca). Ver la advertencia de
  negrita sintética en §3.
- `text-3xl` para páginas con contenido; `text-2xl` para cards/placeholders.
- Si la página es un placeholder, envuélvelo en el card estándar:
  `rounded-2xl border border-base-300 bg-base-100 p-8 shadow-sm` y una descripción en
  `text-base-content/70`.

---

## 11. Selects de filtro y listas buscables

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

Se usa en `MatriculasAdmin` (grado/estado/año), `Usuarios` (rol), `ContratacionAdmin`
(año) y `AdmisionesAdmin` (estado/año). Los `<select>` de **formulario** siguen siendo
nativos; una regla global en `index.css` colorea `option:checked` con el color de marca.

Para **listas largas dentro de un formulario** (países, departamentos, ciudades,
barrios, catálogos) usa **`components/ui/ComboBox`**: filtra por prefijo ignorando
tildes, se maneja con teclado (↑/↓/Enter/Esc) y tiene ARIA de combobox.

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

**Si las pestañas envuelven header y cuerpo** (`<Tabs>` como hijo directo del modal), el
`<Tabs>` también es una franja: lleva `className="flex min-h-0 flex-1 flex-col"`. Sin eso
crece con su contenido, el cuerpo nunca activa su scroll y el modal corta lo que sobra.
Referencias: `EnrollmentDetail`, `ApplicationDetail`.

**Una pestaña con formulario no abre un recuadro propio dentro del modal** (borde +
botones adentro: se lee como una tarjeta dentro de otra). El formulario fluye directo en
el cuerpo y sus botones van al pie del modal: el modal expone un contenedor del pie y la
pestaña dibuja ahí sus botones con `createPortal`, enlazados con `form={formId}`.
Referencia: "Guardar asignación" de `ValoracionTab` → pie de `ApplicationDetail`
(`footerSlot`).

**Modal nuevo:** usa **`components/ui/Modal`**. Trae animación de entrada y salida,
cierre con Escape y por backdrop (`closeOnBackdrop`), y bloqueo de scroll integrado.
Para confirmar una acción, usa `ConfirmDialog` (§12c); para un formulario, `FormDialog`
(§12b). Referencia: `ApplicationDetail`.

**Bloqueo del fondo:** con un modal abierto, **el `<body>` no debe hacer scroll**
(para eso está el backdrop difuminado: aislar la interacción).
`hooks/useBodyScrollLock(active)` fija `overflow: hidden` en el body y compensa el
ancho de la scrollbar, para que el fondo no "salte". Soporta modales anidados.

- `Modal` y `Alert` **ya lo llaman por dentro**: no lo llames aparte si los usas.
- Los modales hechos a mano sí deben llamarlo. Hoy lo hacen `DetailModal`/`Overlay`
  (Contratación), `PdfModal` (`PdfSignViewer`) y los modales de `Roles`.

**Feedback dentro de un contenedor con `transform`:** un hijo `fixed` se posiciona
respecto al contenedor transformado, no al viewport. Monta el toast o el `Alert` con
`createPortal(..., document.body)`. En Matrículas ya no hace falta: el detalle de staff
usa `ui/Modal` y los diálogos anidados van en su propio `Modal`.

## 12b. Diálogo de formulario (crear o editar algo)

**Todo diálogo que crea o edita algo usa este formato**, con los componentes de
`components/ui/FormDialog.tsx`. El modelo es **"Registrar nuevo usuario"** (Usuarios);
lo siguen "Registrar usuario" y "Nueva matrícula" (Matrículas) y "Cambiar grado" (detalle
de la matrícula). No armes el marco, las etiquetas ni los botones a mano: así los tamaños y
la tipografía no se separan.

```
┌───────────────────────────────────────────────────┐
│ (ícono)  Registrar nuevo usuario                 X │  cabecera blanca, borde abajo
│          Completa los datos del nuevo usuario      │  (Aleo 24 px + línea de 14 px)
├───────────────────────────────────────────────────┤
│  ┌ Datos del usuario * ───────────────────────┐    │  fondo gris (base-200)
│  │ NOMBRE *            APELLIDO *              │    │  secciones: tarjetas blancas
│  │ [👤 Ej: Juan     ]  [👤 Ej: Pérez       ]   │    │  con título azul subrayado
│  └─────────────────────────────────────────────┘    │
│  ───────────────────────────────────────────────    │
│                            Cancelar   [Registrar]   │
└───────────────────────────────────────────────────┘
```

| Pieza | Qué es | Medidas |
|---|---|---|
| `FormDialog` | Marco: cabecera (ícono en círculo, título, línea de ayuda o datos del registro, X) y cuerpo con scroll propio | `max-w-3xl` (`size="sm"`: `max-w-lg`, para un solo campo), hasta el 90 % del alto, fondo `base-200`. Título `font-display text-2xl` en `secondary`. `stacked` si se abre encima de otro modal |
| `FormSection` | Tarjeta blanca con su título ("Datos del acudiente"); `required` le pone `*` | `p-5`, título `text-base font-bold text-primary` con borde abajo |
| `FormGrid` | Dos columnas en escritorio, una en móvil | `gap-4` |
| `FormInput` | Etiqueta + campo de texto, con ícono opcional a la izquierda (`User`, `Mail`, `Phone`…) y ayuda | Etiqueta **12 px en negrita** (`formLabelClass`), campo **14 px** (`formInputClass`), ayuda 12 px (`formHintClass`). `full` ocupa las dos columnas |
| `FormSelect` | Lo mismo con el `Select` de la plataforma | Igual que `FormInput` |
| `FormActions` | Borde arriba, "Cancelar" (ghost) y el botón principal con spinner y gerundio | `btn btn-primary`; "Registrando…", "Creando…" |

Reglas:

- **Obligatorios con `*` rojo**, nunca con la palabra "obligatorio".
- **No se cierra con un clic en el fondo** (se perdería lo escrito); sí con la X, Escape o
  "Cancelar".
- **El resultado va en el toast** de la página (arriba a la derecha), nunca dentro del
  diálogo: el formulario recibe `flash` de quien lo abre. Mientras envía, el botón muestra
  el spinner y el gerundio; el diálogo se cierra al terminar bien.
- Si hace falta un campo que no existe (fecha, casilla…), agrégalo a `FormDialog.tsx` con
  las mismas medidas, no en el formulario.

## 12c. Confirmar una acción

**`ConfirmDialog`** (`components/ui/ConfirmDialog.tsx`): la confirmación de toda la
plataforma. Minimalista: panel angosto, título, una frase (el nombre en negrita) y dos
botones, "Cancelar" con contorno suave y la acción en el color de su intención
(`tone`: `danger` rojo, `success` verde, `primary` azul). Opcional, una línea final en ese
color (`note`). El foco arranca en "Cancelar". Mientras `onConfirm` trabaja: spinner y
gerundio, botones bloqueados; termina bien → se cierra; falla (lanza o devuelve `false`) →
queda abierto. El resultado, en el toast. `ConfirmDeleteDialog` es este mismo con
`tone="danger"` y "Este cambio es irreversible." (ver §6).

---

## 13. Componentes y hooks compartidos

**Antes de crear un componente, revisa esta tabla.** Si lo que necesitas casi existe,
amplía el compartido en vez de duplicarlo dentro de un módulo.

### 13.1 `components/ui/`

| Pieza | API | Para qué | Quién lo usa hoy |
| --- | --- | --- | --- |
| `formStyles.ts` | `labelClass`, `inputClass`, `selectClass`, `textareaClass`, `controlClass` (alias de `selectClass`), `primaryBtnClass`, `ghostBtnClass` | Clases de campo y botón (§5.1). Idénticas a lo que Matrículas renderiza inline | Admisiones (13 archivos), `ComboBox`, `OtpInput`, `fields/*`. Matrículas aún no lo importa |
| `LoadingState` | `{label?, compact?, className?}` | Carga de sección o página (§6) | Usuarios, Roles, Matrículas, Contratación, `PdfSignViewer`, `UserFormModal` |
| `Toast` | `{toast: ToastState \| null}` | Presentación del toast; el estado lo da `useToast` (§6). La región viva (`role="status"`) queda montada siempre para que los lectores de pantalla anuncien cada mensaje; los errores con `aria-live="assertive"` | `ApplicationDetail`, Matrículas (estudiante y staff), `Perfil` |
| `Alert` | `variant` (warning/info/error/success), `acceptText`, `requireScrollToBottom`, `pending`/`pendingText` (spinner y botones bloqueados), … | Confirmaciones y avisos modales. Cierra con Escape y backdrop. Título y descripción con ids únicos, foco inicial dentro del diálogo (en el texto si hay que leerlo hasta el final) y de vuelta al control que lo abrió | `ApplicationDetail`, `SolicitudWizard`, `ContratacionAdmin`, `MatriculasAdmin`, Matrículas del estudiante, `Perfil`, `Usuarios` |
| `ConfirmDeleteDialog` | `title`, `confirmText`, `onConfirm` (async; `false` = falló), `irreversible` | Confirmar cualquier eliminación (sobre `Alert`): spinner mientras borra, se cierra solo al terminar bien, queda abierto si falla | `Usuarios`, `Roles`, `MatriculasAdmin`, `EnrollmentDetail`, `ApplicationDetail`, `ContratacionAdmin`, `Perfil` |
| `Modal` | `{isOpen, onClose, children, className?, closeOnBackdrop?, labelledBy?, ariaLabel?}` | Modal genérico animado (§12). **Pasa siempre `labelledBy`** (id del título visible) o `ariaLabel`. Lleva el foco al diálogo, lo mantiene adentro con Tab y lo devuelve al cerrar | `ApplicationDetail`, panel de staff de Matrículas |
| `tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (controlado o no) | Pestañas propias, sin Radix. Patrón de pestañas de la WAI: `aria-controls`/`aria-labelledby` automáticos, solo la activa en el orden de Tab, flechas ←/→ e Inicio/Fin. Cada `TabsTrigger` usa **`tabTriggerClass`** (`ui/formStyles.ts`) y el `TabsList` lleva `flex gap-1 overflow-x-auto` para desplazarse en pantallas chicas. Una pestaña que aún no aplica va `disabled` con un candado y el aviso en el `title` de un `<span>` que la envuelve (el botón deshabilitado no recibe el puntero) | `ApplicationDetail`, `ContratacionAdmin`, Matrículas (detalle de staff, vista de matrícula aprobada) |
| `FilterSelect` | `{value, onChange, options, placeholder?, className?, ariaLabel?}` | Filtros de listado (§11). Combobox de solo selección accesible: `role="combobox"` + `listbox`/`option`, ↑/↓/Inicio/Fin/Enter/Escape. **Pasa siempre `ariaLabel`** | `MatriculasAdmin`, `Usuarios`, `ContratacionAdmin`, `AdmisionesAdmin` |
| `Select` | `{value, onChange, options, id?, placeholder?, invalid?, required?, disabled?, describedBy?, name?, variant?, emptyText?}` | **El select de toda la plataforma: nunca `<select>` nativo** (su lista es la del sistema operativo y no sigue el tema). Lista propia con el aspecto del `dropdown` de daisyUI y la opción elegida en `primary`. Mismo combobox accesible que `FilterSelect` + escribir una letra salta a la opción. Sin opciones, la lista abierta muestra `emptyText` ("No hay docentes para mostrar."), nunca una caja vacía; `FormSelect` lo reenvía. En formularios con RHF va con `Controller` (así lo hace `SelectField` de `ui/fields`); `FilterSelect` es este mismo `Select` con `variant="filter"` | `SelectField` (fichas del estudiante y admisiones), gestión de usuarios, matrículas, admisiones, contratación |
| `ComboBox` | `{value, onChange, options, label, placeholder?, disabled?, loading?, required?, name?, hint?}` | Lista buscable dentro de un formulario (§11). Con `name` muestra su error del `FieldErrorsProvider` y deja `data-field` para enfocarlo. La lista abierta usa `dropdown-open` para que sus opciones estén en el árbol de accesibilidad | `fields/*` (Admisiones y Matrículas) |
| `SubSection` | `{title, subtitle?, open, onToggle, status?: "complete"\|"incomplete"\|"error", id?, children}` | Acordeón controlado por el padre, animado con `grid-rows`. `<h3>` envuelve al botón (`aria-expanded` + `aria-controls`); la sección plegada lleva **`inert`** (sus campos no reciben foco ni se leen) | `SolicitudWizard`, `admisiones/steps.tsx`, paso 3 de Matrículas |
| `OtpInput` | `{value, onChange, length?=6, autoFocus?=true, onComplete?, error?, …}` | Código de verificación (componente `otp` de daisyUI). Solo acepta dígitos y restaura el foco | `Login`, verificación de Matrículas, `ContratacionEmpleado` |
| `pdf/PdfSignViewer` | `PdfModal {pdfData, title, onClose, overlays?, onReadToEnd?, footer?}`, `PdfViewer`, `embedImagesInPdf` | Visor de PDF con zonas de firma. `PdfModal` es un diálogo modal accesible (título, zoom "Alejar/Acercar", "Cerrar documento", foco atrapado y devuelto). **Abre al 100 %** y se ajusta al ancho en pantallas angostas. `onReadToEnd` avisa cuando el usuario llegó al final del documento (se usa para firmar solo lo leído). En Matrículas las zonas de firma y huella son **solo vista previa**: la firma y la huella se piden una vez en el panel de firmantes y se estampan en los tres documentos (en Contratación siguen siendo clicables). Las URL `blob:` de las imágenes se crean una vez por imagen y se liberan al cambiarla o salir | Firma de Matrículas, Contratación |

### 13.2 `components/ui/fields/` — campos declarativos

Los formularios nuevos **declaran sus campos como datos** (`FieldDescriptor[]`) y los
pintan con `<SchemaSection>`, en vez de escribir el JSX de cada campo a mano:

```tsx
import { SchemaSection } from "@/components/ui/fields/registry";
import type { FieldDescriptor } from "@/components/ui/fields/types";

const SCHEMA: FieldDescriptor[] = [
  { type: "text", name: "first_name", label: "Nombres" },
  { type: "yesno", name: "has_diagnosis", label: "¿Tiene diagnóstico?" },
  { type: "textarea", name: "diagnosis_detail", label: "Detalle",
    showWhen: { field: "has_diagnosis", equals: "Si" } },
];

<SchemaSection schema={SCHEMA} control={control} register={register} setValue={setValue} />
```

| Pieza | Qué contiene |
| --- | --- |
| `types.ts` | `FieldType` (text, email, tel, number, date, textarea, select, combobox, yesno, checkbox, checkbox-group, geo-cascade, photo, file), el descriptor `FieldDescriptor` (con `hint?` y, en fechas/números, `min?`/`max?`; `max: "today"` = hoy en hora de Colombia), las condiciones `FieldCondition` (`equals`/`notEquals`/`in`, o `watch` + `predicate`) para `showWhen`/`disabledWhen`/`required` |
| `registry.tsx` | `FIELD_REGISTRY` (tipo → componente), `SchemaField` y `SchemaSection`. `SchemaSection` observa con un solo `useWatch` únicamente los campos de los que dependen las condiciones. Acepta `disabledFields` (bloqueados desde afuera, p. ej. el nombre que viene de Microsoft) y `fieldHints`. Descriptores: `startsRow` hace que el campo empiece fila en la grilla de dos columnas (así una pregunta sí/no queda a la izquierda y el campo que revela, a su derecha: "¿Tiene celular propio?" → número); el tipo `computed` es un campo bloqueado calculado de otros ("Edad" desde la fecha de nacimiento), que no se guarda ni se envía. Los obligatorios se marcan solo con `*` rojo |
| `fieldErrors.tsx` | `FieldErrorsProvider {errors}` + `useFieldError(name)`: el padre pasa el mapa `{ruta: mensaje}` que devuelve el backend y cada campo muestra el suyo, con `aria-invalid` y `aria-describedby`. También el asterisco `RequiredMark` |
| `primitives.tsx` | `TextField`, `SelectField`, `TextAreaField`, `CheckboxField`, `YesNoField` (modo `"string"` → guarda `"Si"`/`"No"`, o `"boolean"`), `CheckboxGroupField`, `ComboBoxField`. Todos con `<label htmlFor>` asociado (ids válidos aunque el nombre tenga puntos: `student.birth.date` → `student-birth-date`), asterisco si son obligatorios, ayuda y error asociados |
| `GeoCascadeField.tsx` | Cascada país → departamento → ciudad → barrio, con dirección y estrato (1–6 y Comercial). Fuente `static` (listas fijas) o `api` (`/api/geo/`). El `prefix` admite rutas con punto (`residence.`, `father.birth.`). Si una ficha guardada trae el departamento sin su id, lo resuelve por nombre para cargar las ciudades |
| `PhotoField.tsx` | Foto JPG/PNG de hasta 3 MB, controlada desde fuera (`value`/`onChange`). **No va dentro de RHF**: un `File` no sobrevive al JSON del autoguardado |

Quién lo usa: **Admisiones** (`steps.tsx`, `guardianFields.tsx`) y **Matrículas**: la ficha
del estudiante (esquema v1 por secciones) se declara una sola vez en
`matriculas/profileSchema.ts` y sirve para el formulario del paso 3 (`student/StepProfile`)
y para la vista de solo lectura del staff (`profileRows()`).

### 13.3 `hooks/`

| Hook | API | Para qué | Quién lo usa |
| --- | --- | --- | --- |
| `useToast` (`use-toast.ts`) | `() → {toast, flash(type, msg), dismiss}` | Estado del toast compartido (§6) | `ApplicationDetail` |
| `useBodyScrollLock` | `(active: boolean)` | Bloquea el scroll del body con un modal abierto (§12) | `Modal`, `Alert` y los modales hechos a mano |
| `useAutosaveDraft` | `({key, enabled?, debounceMs?=500}) → {push(value, meta?), flush, discard, peekDraft}` + helpers `resolveDraft`, `valuesMatchServer`, `fingerprint`, `clearAllDrafts` | **Método único de autoguardado.** Borrador **solo local** (localStorage, nunca el servidor), con un `meta` opaco para saber sobre qué versión del servidor se escribió. El servidor se toca únicamente con una acción explícita del usuario. Al volver, `resolveDraft` decide: descartar, restaurar (con aviso) o conflicto (modal "Conservar lo mío / Usar lo guardado"). `clearAllDrafts()` se llama al cerrar sesión. Es agnóstico al motor de formularios | Admisiones: `SolicitudWizard` (un borrador por sección, `meta` = versión de la sección). Matrículas: `student/StepProfile` (un borrador para toda la ficha, `meta` = `fingerprint` de `enrollment.data`). `loginLogic` (`clearAllDrafts`) |

### 13.4 Otros compartidos

| Pieza | Para qué |
| --- | --- |
| `components/shared/formLists.ts` | Catálogos: `COUNTRIES`, `DOCUMENT_TYPES`, `EPS_LIST`, `COLOMBIA_DEPARTMENTS`, `ATLANTICO_CITIES`, `BARRIOS_BARRANQUILLA`, `GENDERS`, `BLOOD_ABO/RH`, `ACCOUNT_TYPES`, `EDUCATION_LEVELS`. **No redeclares estas listas en un módulo** |
| `components/auxiliar/Spinner.tsx` | Carga de pantalla completa durante la rehidratación de sesión (§6) |
| `utils/statusHelpers.ts` | Etiquetas y badges de los 8 estados de matrícula (`CREATED` … `INACTIVE`), de los estados por documento (`MISSING`, `UPLOADED`, `APPROVED`, `REJECTED`, `NOT_APPLICABLE`), origen y motivo de inactivación. No cubre admisiones: esos los pinta `admisiones/StatusBadge.tsx` |
| `matriculas/enrollmentApi.ts` | Cliente tipado de la API de Matrícula v2 (`enrollmentApi.*`, `ApiError` con `code` y `errors` por campo, `openDocument()` para ver un archivo con su URL firmada) |
| `matriculas/profileSchema.ts` | Ficha del estudiante v1: catálogos (códigos → etiquetas), secciones con sus `FieldDescriptor`, `profileRows()` para la vista de solo lectura, `relocateGuardianErrors()` |
| `utils/documentSensitivity.ts` | `classifyDocument(key)` → `normal`/`medical`/`sensitive` (espejo del backend) |

---

## 14. Pendientes de migración

A medida que toquemos cada pantalla, alinearla con esta guía.

### Por hacer

- [ ] **Negrita sintética en Aleo** (§3). En Matrículas ya se bajaron los títulos a
      `font-medium` (tokens de `textStyles.ts`). Faltan los títulos de página
      (`text-3xl font-bold`) y ~50 combinaciones en el resto de `src/`. Alternativa:
      agregar los `@font-face` 600/700 de Aleo (los archivos llegaron, pero no se
      copiaron), aunque el manual solo lista hasta Medium.
- [ ] **Admisiones → `LoadingState`**: 10 copias a mano del mismo JSX de carga en
      `AdmisionesAdmin`, `MisAdmisiones`, `DetalleAdmision`, `SolicitudWizard`,
      `ApplicationDetail`, `DecisionPanel`, `InterviewsPanel`, `GuardianDocumentsCard`,
      `GuardianInterviewsCard` y `GuardianPaymentCard`.
- [ ] **Spinner nativo dentro de botones → `Loader2`** (§6): 19 usos en 5 archivos.
      `ContratacionAdmin` (10), `ContratacionEmpleado` (6), `userRegister`, `userUpdate`
      y `UserFormModal` (1 cada uno).
- [ ] **Toasts locales → `useToast` + `Toast`**: `ContratacionAdmin` (`notify`), `Roles`
      y `Usuarios` (`showToast`).
- [ ] **`UserFormModal` redeclara `inputClass`/`selectClass`/`labelClass`** con valores
      propios → `formStyles.ts`. `Login` también, pero ahí es deliberado (§5.2).
- [ ] **Copia local de `ComboBox`** en `auxiliar/userUpdate.tsx`, que además no se
      importa en ningún lado: es código muerto.
- [ ] **CTA de legado** (§5.3) en `NotFound.tsx` y `Roles.tsx` → `primaryBtnClass`.
- [~] **Grises y colores crudos → tokens**. Hecho en el marco, Matrículas (estudiante y
      staff), Usuarios y Contratación. Queda `text-gray-*` en `userUpdate` (7) y
      `userRegister` (2), y la paleta cruda de esos dos archivos.
- [ ] Unificar radios/sombras/transiciones al estándar de §4.
- [ ] **Comentarios desactualizados**: `REGRESSION_CHECKLIST.md` dice que
      `use-toast.ts` importa un `ui/toast` inexistente; ya no es así.
- [ ] **Código muerto de UI**: no se importan `hooks/use-mobile.tsx`, `src/App.css`,
      `assets/login-hero.webp` ni `auxiliar/userUpdate.tsx`.

### Hecho

- [x] **Matrícula v2 — frontend** _(2026-09-11)_. Detalle en
      `gimpa-backend/docs/implementacion-matricula-v2.md`.
  - Paso 3 del estudiante sobre **campos declarativos** (`profileSchema.ts` +
    `SchemaSection` + `GeoCascadeField` con `/api/geo/`); se borraron las copias locales
    de catálogos que tenía `Step3StudentData`.
  - Se reescribieron el asistente del estudiante (`MatriculasEstudiantes` +
    `matriculas/student/*`) y el panel de staff (`MatriculasAdmin` + `matriculas/admin/*`,
    con `ui/Modal` en lugar del `AnimatedModal` local, `useToast` y `Alert`).
  - Se borraron `Step1…Step6`, `EnrollmentBlockedMessage`, `UploadPendingDocuments`,
    `StudentDataModal`, `StudentDataTabs`, `auxiliar/enrollmentUpdate`,
    `matriculasUI/GradeAccordion` y `matriculasUI/SectionCard` (con ellos se fueron los
    `alert()` nativos, los spinners nativos y los `text-gray-*` de Matrículas).
  - **Accesibilidad en los compartidos**: `SubSection` (`inert` al plegar, `<h3>` que
    envuelve al botón), `ComboBox` (errores asociados, opciones visibles en el árbol de
    accesibilidad), `FilterSelect` (combobox de solo selección con teclado), `tabs`
    (patrón de la WAI), `Modal` y `Alert` (nombre, foco inicial, foco atrapado y
    devuelto), `PdfModal` (diálogo con nombre, zoom con etiquetas, lectura hasta el
    final), `Toast` (región viva permanente), campos con `label`/`htmlFor`, asterisco,
    ayuda y error asociados (`fieldErrors.tsx`).
  - **Página "Mi perfil"** (`pages/Perfil.tsx`) con foto de perfil; el `Navbar` muestra
    la foto.

- [x] **Toast, modal, acordeón y clases de formulario compartidos** _(2026-09-07 →
      09-10, plan de Admisiones)_: `hooks/use-toast.ts` (reescrito, el anterior
      importaba un `ui/toast` inexistente), `ui/Toast`, `ui/Modal`, `ui/SubSection`,
      `ui/formStyles.ts`, `ui/ComboBox` (movido desde `admisiones/`, con teclado y
      ARIA), `ui/OtpInput` y los campos declarativos de `ui/fields/`. Ver §13.
- [x] **Aleo activada como `--font-display`** _(2026-09-09)_: reemplaza a Poppins.
      Inter y Aleo se auto-hospedan; se quitó el `<link>` de Google Fonts.
- [x] **Colores del manual de marca** _(2026-09-09)_: tabla de §2 sincronizada con
      `index.css`.
- [x] **Spinner de carga de página/sección unificado en `LoadingState`**
      _(2026-09-10)_. Convivían dos estilos distintos para lo mismo:
  - El spinner nativo de daisyUI (`loading loading-spinner loading-lg/md`) en
    `Usuarios.tsx`, `MatriculasAdmin.tsx` (×2), `MatriculasEstudiantes.tsx` (×3),
    `Step4Documents.tsx`, `ContratacionAdmin.tsx`, `ContratacionEmpleado.tsx` (×2),
    `UserFormModal.tsx`, `PdfSignViewer.tsx` y `UploadPendingDocuments.tsx`.
  - El patrón `Loader2` + texto en tarjeta de Admisiones. Es el que se quedó, elegido
    por el usuario.

  También se alineó `Roles.tsx`, que ya usaba `Loader2` pero sin tarjeta. Los spinners
  dentro de botones no se tocaron en ese cambio; su migración sigue pendiente (ver
  "Por hacer").
- [x] **Sidebar en azul institucional** _(2026-09-10)_: el fondo pasa del verde
      (`--accentlight`) a `bg-primary`, y el resaltador de la página activa pasa de
      `--accent-dark` a `bg-base-200`/`text-primary`. `Sidebar.tsx` ya no usa
      variables HSL propias, así que el bloque `:root` completo de `index.css` (con
      `--accent`, `--accentlight`, `--primary-*`, `--accent-dark` y las variables
      shadcn muertas) se eliminó. El wordmark de `platform-logo.png` se recoloreó a
      blanco para leerse sobre navy. El sidebar pasó al drawer de daisyUI con riel de
      íconos (§9).
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
      `bg-base-200` para dar profundidad a las cards), `Sidebar` (íconos `h-5 w-5`,
      foco visible), `Navbar` (tokens, `lucide`, `text-error`; **ya no repite el título
      de la sección**) y `Dashboard` (re-estilizado).
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
      La paginación es **candidata a extraer** a un componente compartido para otras
      tablas.
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
      efímero + modal **`Alert`** para confirmar el borrado, montados con
      `createPortal` (ver §12).
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
- [x] **Limpiar variables shadcn muertas de `:root`**: el bloque completo se eliminó
      junto con el cambio del sidebar (ver arriba).
