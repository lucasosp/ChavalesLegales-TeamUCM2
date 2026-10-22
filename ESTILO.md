# Estilo Chavales Legales

Guía del lenguaje visual que ya usan las pantallas hechas: la **portada** (`app/page.jsx`), el
**panel del trabajador social** (`app/profesores/page.jsx` + `components/panel/*`), el **informe**
(`app/servicios/`) y la **mesa de la familia** (`app/experiments/cid-table/`). Sirve para
replicarlo en el resto de la web (juegos, novela).

La idea en una frase: **pegatinas de tebeo sobre un fondo oscuro**. Trazo de tinta grueso,
placa de color desplazada, esquinas irregulares, un pelín de giro y trama de puntos. Nada de
cristal, nada de sombras difusas, nada de degradados suaves.

Fuentes de verdad (si el doc y el CSS discrepan, manda el CSS):

| Archivo | Qué manda |
|---|---|
| `app/globals.css` | paleta, shell de página, barra de la portada, selector de idioma |
| `components/barra.module.css` | barra superior compartida (volver + rótulo mini + idioma) |
| `components/panel/panel.module.css` | tarjeta del panel, campos, CTA con barra de carga, resultado |
| `components/panel/desplegable.module.css` | desplegable propio (listbox) |
| `app/servicios/servicios.module.css` | plancha blanca del informe, tablas, KPIs y apartados |
| `app/experiments/cid-table/cid.module.css` | shell de un juego a pantalla completa, tarjetas de diálogo, ajustes en formulario |
| `app/experiments/caja-arena/arena.module.css` | lo mismo con escenario grande, aviso flotante y panel con acción destructiva |
| `app/experiments/cid-table/MesaCID.jsx`, `app/experiments/caja-arena/{Escenario,Clima}.jsx` | escenas SVG planas: relleno de token, contorno de tinta, placa dura y etiquetas tipo pegatina |

---

## 1. Paleta

`app/globals.css` es la única fuente. Tres familias y dos grupos de uso restringido:

| Grupo | Tokens | Para qué |
|---|---|---|
| Verde (principal) | `--verde-50 … --verde-950` | fondo oscuro, botones, foco, navegación, datos |
| Naranja (acento) | `--naranja-50 … --naranja-900` | destacados, avisos, exportar. **Nunca** en el botón principal |
| Neutros | `--neutro-50 … --neutro-900` | superficies blancas, texto, grises limpios sin tinte |
| Peligro | `--peligro`, `--peligro-fuerte`, `--peligro-suave`, `--peligro-borde` | solo error, cancelar, alerta grave y el aspa de borrar del buscador |
| Marca (restringido) | `--marca-ambar` `#fbbf24`, `--marca-ambar-claro` `#fcd34d`, `--marca-ambar-sombra` `#b45309` | logotipo y **el** botón que hace avanzar |
| Juegos (restringido) | `--juego-azul` `#50abf2`, `--juego-morado` `#e094f5`, `--juego-rojo` `#ff8a8a`, `--juego-verde` `#67d579` (+ `-borde` de cada uno) | solo las fichas de juego y las zonas planas de los tableros (`cid-table`, `caja-arena`), que necesitan colores distinguibles entre sí |

Tokens semánticos que hay que usar en código nuevo: `--superficie`, `--superficie-alt`,
`--borde`, `--borde-fuerte`, `--texto`, `--texto-medio`, `--texto-suave`, `--texto-inverso`,
`--acento`, `--acento-fuerte`, `--acento-suave`.

Reglas:
- La **tinta** (contorno y placas de las cajas) es `--verde-950` (`#011913`), no negro puro.
- Para texto naranja sobre fondo claro, `--naranja-700` u `800`. `--naranja-500` y más claros
  solo rellenan.
- Un solo acento por superficie: si el botón principal es ámbar, no hay otro naranja en esa caja.
- **El rojo es de borrar, no de decorar**: fuera de los errores, la única pieza roja admitida es el
  aspa de borrar del buscador, y **solo al hover** (fondo `--peligro-fuerte`, glifo blanco). En
  reposo es una pieza neutra (`--neutro-100` con glifo de tinta). Si aparece otro rojo, sobra.
- **Un solo botón ámbar por pantalla**, y es el que hace avanzar (Entrar, Generar caso, Ver
  informe). Los secundarios son `--naranja-200` con placa `--naranja-600`; el resto, pegatina
  blanca (ver §12).
- El **ámbar de marca no es el naranja de acento**. `--marca-ambar` solo en logotipo, botón
  principal, hover de la barra superior y foco.
- El **foco es siempre el mismo aro ámbar** `box-shadow: 0 0 0 4px rgba(251, 191, 36, .55)`, sin
  cambiar el color del borde. Hoy está escrito a mano en tres archivos: si se toca, se toca en
  los tres (o se convierte en token `--foco`).

---

## 2. Borde: siempre tinta gruesa

```css
border: 3px solid var(--verde-950);
```

- **3px** en cajas, botones y campos. **2px** solo en piezas pequeñas (pastilla del icono de una
  ficha).
- Nunca `1px`, nunca gris, nunca `border-color` que cambie al hover (lo que cambia es el fondo).
  La única pieza que sí cambia de color de borde es la deshabilitada, que pasa a
  `--neutro-400` y pierde placa y giro.

## 3. Esquinas

Dos sistemas, y no se mezclan en la misma pieza:

**a) Controles (campos, disparador del desplegable, caja de error, caja del enlace): radio plano de
12px.** Un campo es una caja de datos, no una pegatina: si se le pone esquina irregular parece un
botón.

**b) Pegatinas (tarjetas, botones, pastillas, fichas): radio asimétrico** con barra
(`horizontal / vertical`), para que la pieza parezca recortada a mano:

```css
border-radius: 16px 11px 15px 12px / 12px 16px 11px 15px;   /* fichas de juego, botón Entrar, CTA principal */
border-radius: 18px 14px 16px 15px / 15px 17px 14px 16px;   /* tarjeta de código (portada) y tarjeta del panel */
border-radius: 14px 18px 15px 16px / 16px 14px 17px 15px;   /* tarjeta de juegos */
border-radius: 14px 11px 13px 12px / 12px 14px 11px 13px;   /* panel del desplegable y fichas resumen (ficha) */
border-radius: 12px 9px 11px 10px / 10px 12px 9px 11px;     /* pastilla del icono, botón copiar, aviso de error */
border-radius: 14px 10px 13px 11px / 11px 14px 10px 13px;   /* botones de la barra superior */
border-radius: 9px;                                         /* filas de una lista (opciones de desplegable) */
border-radius: 9999px;                                      /* solo píldoras y píldoras de progreso */
```

Nada de `border-radius: 8px` plano en una pegatina: o píldora completa, o esquina irregular, o
12px si es un control.
La píldora `9999px` está reservada a dos casos: el CTA de formulario del panel (`.accion`, que se
convierte en barra de progreso y necesita el radio cerrado para el relleno) y los carriles de
progreso. Si un botón puede rellenarse por dentro, va en píldora.

## 4. Placa desplazada (la "sombra")

Sombra dura, sin desenfoque, del **mismo color de la pieza oscurecido**, solo abajo y a la derecha:

| Pieza | Placa en reposo | Hover | Activo |
|---|---|---|---|
| Fichas de juego | `5px 5px 0 var(--tile-borde)` | `7px 8px 0` | `2px 2px 0` |
| Botón Entrar / CTA principal | `5px 5px 0 var(--marca-ambar-sombra)` | `7px 8px 0` | `2px 2px 0` (panel: 1px) |
| Tarjetas blancas | `6px 6px 0 var(--verde-950)` | no cambia | no cambia |
| Botones de la barra superior (arriba, volver, idioma) | `3px 3px 0 var(--neutro-400)` | `4px 5px 0 var(--marca-ambar-sombra)` | `1px 1px 0` |
| Tarjeta del código (`CL-xxxxx`) | `5px 5px 0 var(--verde-700)` | no cambia | no cambia |
| Panel del desplegable (panel del trabajador social) | `4px 4px 0 var(--verde-700)` | no cambia | no cambia |
| Desplegable de idioma | ninguna (solo trazo) | no cambia | no cambia |
| Botón secundario (copiar, crear otro) | `3px 3px 0 var(--naranja-600)` | `4px 5px 0` | `1px 1px 0` |
| Ficha resumen anidada (`.ficha`) | ninguna (trazo sí, placa no) | — | — |
| Aviso de error | ninguna | — | — |

- Sobre fondo claro: placa = tinta (o el color de la pieza oscurecido).
- Sobre fondo oscuro: placa = **color de la pieza oscurecido** (blanco → `--neutro-400`). Una
  placa de tinta sobre el fondo casi negro desaparece.
- Una pieza dentro de otra pieza no lleva placa: la jerarquía ya la da el trazo.
- Prohibido: `box-shadow` con blur, sombras de 1-2px, `filter: drop-shadow`.

## 5. Giro

Las piezas nacen torcidas poco (±0.3–0.7°) y se enderezan al pasar por encima:

```css
transform: rotate(-0.6deg);
:hover  { transform: translate(-1px, -2px) rotate(0deg); }
:active { transform: translate(2px, 2px)  rotate(0deg); }
```

| Pieza | Giro en reposo |
|---|---|
| Fichas de juego | `-0.7deg` impares / `0.6deg` pares |
| Botón Entrar, CTA principal, "Ver informe" | `-0.4deg` |
| Botón copiar | `0.6deg` |
| Botón "Crear otro caso" | `-0.5deg` |
| Botones de la barra superior | `-0.6deg` / `0.6deg` |
| Tarjeta del código | `-0.3deg` |
| Tarjetas grandes (acceso, juegos, panel) | sin giro: pesan demasiado |

Alternar el signo entre piezas hermanas (`.nth-child(odd)` / `even`).

> **Trampa (verificada dos veces):** nunca combines `rotate()` con `overflow: hidden` ni con
> `filter` en la misma pieza. Obliga al navegador a recortar y rasterizar el subárbol y salen
> bordes dentados y glifos cortados. Si necesitas contener un adorno, recórtalo con `mask-image`.
> Y si de verdad hace falta `overflow: hidden` (la barra de carga del panel lo necesita para que
> el relleno no se salga), **quita el giro**: `transform: none`.

## 6. Puntos (semiotono)

Cuatro colocaciones, siempre `radial-gradient` de motas de tinta:

| Dónde | Patrón | Opacidad |
|---|---|---|
| Tarjetas blancas (acceso, juegos, panel) | `radial-gradient(rgba(1,25,19,.06) 1.2px, transparent 1.3px)`, `background-size: 11px 11px` | 6 % |
| Barra superior y disparadores (`.btn-pro-opt1`, `.selector-idioma-trigger`) | mismas motas, `background-size: 7px 7px` | 12 % |
| Tarjeta del código | `rgba(1,25,19,.08)`, `background-size: 9px 9px` | 8 % |
| Esquina de las fichas | 88×76 px abajo a la derecha, `7px 7px` | 14 %, con `mask-image` radial |
| Franja derecha del botón Entrar | 96px de ancho × todo el alto, `7px 7px` | 13 %, con `mask-image` radial opuesta |
| Botones del panel (`.accion`, `.copiar`, `.btnPrimario`, `.btnTerciario`) | motas en todo el botón, `7px 7px` | 16 %, con `mask-image` **lineal** que se apaga al 58 % desde la izquierda |

```css
/* motas en una esquina, sin recortar con overflow */
.tile::after {
  content: ''; position: absolute; right: 0; bottom: 0; width: 88px; height: 76px;
  background-image: radial-gradient(var(--verde-950) 1.1px, transparent 1.2px);
  background-size: 7px 7px; opacity: .14; pointer-events: none; z-index: 0;
  -webkit-mask-image: radial-gradient(120% 120% at 100% 100%, #000 35%, transparent 78%);
          mask-image: radial-gradient(120% 120% at 100% 100%, #000 35%, transparent 78%);
}
.tile > * { position: relative; z-index: 1; }   /* el contenido siempre por encima */
```

Los botones del panel usan el mismo truco con máscara lineal (`.accion::before` y compañía) y
`border-radius: inherit`, no un fondo con degradado: así el desvanecido no toca el texto ni el
color de fondo.

Y un caso especial de color: **confeti de motas** detrás del logotipo
(`.kahoot-title-wrapper::before`), cuatro capas de 2.1px en trama de 22px con ámbar, azul, rojo y
morado, `opacity: .38` y máscara elíptica (`ellipse 60% 60%`, opaca hasta el 58 %) que se apaga
antes de llegar al borde de su caja.

## 7. Fondos

**Shell de página** (`.kahoot-page`, portada y panel): columna a pantalla completa con la tinta
verde y dos resplandores.

```css
background:
  radial-gradient(90% 70% at 84% 4%, rgba(16,185,129,.28) 0%, transparent 62%),
  radial-gradient(85% 70% at 6% 98%, rgba(249,115,22,.20) 0%, transparent 66%),
  linear-gradient(180deg, #0e1e18 0%, #08120e 100%);
```

Encima, una capa `.kahoot-bg-canvas` (absoluta, `pointer-events: none`, `z-index: 1`) con tres
manchas orgánicas: `.bg-wave-left` (elipse verde rotada, `opacity .28`, `blur(2px)`),
`.bg-arc-right` (arco verde, `.45`) y `.bg-sphere-glow` (`blur(40px)`, `.22`).

- La **portada** añade además un `<svg>` (`.bg-curved-svg`, `viewBox 0 0 1440 900`,
  `preserveAspectRatio="none"`, `opacity .85`) con dos curvas de nivel y dos círculos, todo con
  `fill` de la escala verde y `fillOpacity` 0.12–0.45. Las subpáginas **no** llevan el SVG: mismo
  fondo, menos ruido.
- El fondo es siempre el mismo en toda la web: no hay modo claro de página. Lo claro son las
  **superficies** (tarjetas) que van encima.
- **Superficies claras**: `--superficie` (`#fff`) con la trama de puntos del §6, trazo de tinta y
  placa. No hay modo "papel" ni beige.

## 8. Tipografía

- UI: **Plus Jakarta Sans** (variable 300–800, cargada en `app/layout.jsx`). **Ojo: 800 es el
  máximo real**; cualquier `font-weight: 900` del proyecto se redondea a 800 y no engorda nada.
  Para dar énfasis, sube tamaño o contraste, no pidas 900.
- Logotipo: **Talina** (cursiva, solo marca, `public/fonts/talina.woff2`).

| Rol | Tamaño | Peso | Detalles |
|---|---|---|---|
| Logotipo CHAVAL/LEGAL | `clamp(3.5rem, 9.1vw, 5.25rem)` | normal | `line-height .84`, `letter-spacing -.04em`, una palabra por línea |
| Sufijo ES | `clamp(7.35rem, 19.95vw, 11.55rem)` | normal | `line-height .80`, `letter-spacing -.03em`, `margin-left 1.1rem` |
| Rótulo mini de la barra | `clamp(14px, 1.9vw, 21px)` (15px ≤640, 12px ≤420) | normal | misma Talina, CHAVAL/LEGAL en dos líneas y ES a `2em`; sombra de 2px |
| Título de pantalla (panel) | `1.6rem` (`1.3rem` en móvil) | 800 | `line-height 1.15`, `letter-spacing -.01em`, `--verde-800` |
| Título de tarjeta (portada) | `1.05rem` | 800 | `uppercase`, `letter-spacing .08em`, `--verde-800` |
| Título de sección (juegos) | `1.1rem` | 800 | `line-height 1.2`, `--verde-800` |
| Dato clave (código del caso) | `2.5rem` (`2.1rem` móvil) | 800 | `letter-spacing .12em`, `tabular-nums` |
| Texto de apoyo | `0.95–1rem` | 500–600 | `--texto-medio`, `line-height 1.5` |
| Etiqueta de campo | `11px` (portada `0.72rem`) | 800 | `uppercase`, `letter-spacing .05em` (`.08em` portada), `--verde-700/800` |
| Valor de ficha | `0.95rem` | 800 | `--verde-800` |
| Botón | `0.8–1.15rem` | 800 | `letter-spacing .03em` |
| Pie de página | `0.74rem` | normal | `rgba(255,255,255,.55)` |

- El logotipo lleva una pila de `text-shadow` de desplazamientos de `-1px 1px` a `-11px 11px` en
  `--marca-ambar-sombra` / verde oscuro, más dos sombras difusas finales: es el bloque 3D.
- Números tabulares en todo dato alineado (`font-variant-numeric: tabular-nums`).
- El texto de apoyo de la portada va con `text-wrap: balance`.

## 9. Estructura de pantalla

```
.kahoot-page                     100dvh (si hay alto ≥ 560px), overflow-y:auto
├── .kahoot-topbar               pegatinas: izquierda (acción) + derecha (idioma)
├── .kahoot-main-content         columna centrada; portada 460px, panel 760px
│   ├── (portada) .kahoot-title-wrapper → logotipo
│   └── .kahoot-sections-stack   gap 1.35rem (0.9rem en pantallas bajas)
└── .kahoot-footer               enlaces UCM · Datathon · Administración de Justicia

.pagina (informe)               fondo verde + dos resplandores fijos
├── .fondo (fixed, z-index 0)   manchas globales .bg-wave-left / .bg-arc-right / .bg-sphere-glow
├── Barra (z-index 20)          volver · rótulo mini · idioma
└── .principal (z-index 1)      1280px, dentro .pliego = una sola plancha blanca
```

### Barra superior compartida (`components/Barra.jsx`)

La usan el panel y las dos pantallas del informe. Rejilla de tres columnas
`minmax(min-content, 1fr) auto minmax(min-content, 1fr)`: **volver** al borde izquierdo,
**rótulo mini** de Chavales Legales centrado y **selector de idioma** al borde derecho. Los
botones laterales nunca bajan de su `min-content`, así que el selector no se mete encima del
rótulo. La barra ocupa **todo el ancho**; lo que se limita a 1280px es el contenido de debajo.

- `z-index: 20` en la barra: si comparte plano con el contenido, el desplegable del idioma se
  mete debajo de la plancha blanca del informe.
- El rótulo es una versión de pulgar del logotipo: `CHAVAL` / `LEGAL` apilados y `ES` a doble
  tamaño, en Talina, con sombra de 2px. **Es un enlace a la portada** (`/`), con el nombre en el
  `aria-label` del enlace y el dibujo marcado como decorativo (`aria-hidden`); al hover crece un
  7 % y al foco lleva el aro ámbar.
- `acciones` añade enlaces propios antes del idioma ("Ver informes" en el panel). En móvil
  (`≤820px`) esas acciones bajan a una segunda fila a todo el ancho para que nada se apile
  encima del rótulo; por debajo de `380px` el rótulo se oculta y quedan dos columnas.
- La portada **no** usa esta barra: tiene la suya (`.kahoot-topbar`) con el botón de trabajadores sociales
  y el idioma en los extremos. Los tres botones de la portada comparten cuerpo (52px de alto)
  con los de la barra compartida; ese bloque va al final de `globals.css` a propósito, porque
  llega después de las reglas de cada botón y gana por orden.

- **Barra de la portada**: `padding: 1.15rem 2.2rem 0.1rem`, `flex`, izquierda acción / derecha
  idioma. En móvil (`≤640px`) baja a `0.85rem 1rem`, se reparte con `space-between` y el botón de
  trabajadores sociales cambia la etiqueta larga ("Acceso a trabajadores sociales") por la corta
  ("Trabajadores") con dos `<span>` que se alternan.
- **Subpáginas** (panel, informe): la barra va en el flujo del documento (nada de
  `position: absolute`); el fondo con las manchas sí es una capa fija.
- **Aire**: `gap: 1.35rem` entre bloques de la portada; el título deja `3rem` hasta la primera
  tarjeta (la sombra 3D del logotipo se sale de su caja).
- **Rejilla de juegos**: `grid-template-columns: repeat(2, minmax(0, 1fr))`, `gap: 10px`
  (`8px` a ≤420px). Nunca flex con porcentajes.
- **Breakpoints**: `640px` (barra superior, paddings, panel), `420px` (fichas de juego),
  `max-height: 820px` con `min-height: 560px` (portada compacta: menos aire, campos de 46px,
  botón de 44px, título de sección a `1rem`). Por debajo de 560px de alto la página deja de
  fijarse a la pantalla y scrollea.
- **Contenedores**: portada `460px`, panel `760px`, informe `1280px`. Centrados con
  `margin: 0 auto`, nunca a ancho completo.
- **Excepción: los tableros de juego** (`cid-table`, `caja-arena`). Son pantallas de juego, no
  de lectura: el lienzo va dentro de una tarjeta-pegatina que ocupa **casi toda la ventana**,
  con la proporción del dibujo (`1600×900` en la caja de arena, `800×540` en la mesa) y sin
  tope de ancho. El tamaño se calcula con una consulta de contenedor — `width: min(100%,
  calc(100cqh * <proporción>))` — para que el marco nunca deje franjas blancas alrededor del
  dibujo, y el SVG escala con la ventana.

## 10. Animación

| Momento | Receta |
|---|---|
| Entrada de tarjeta | `cardEntrance` 0.6s `--ease-spring`, `translateY(28px) scale(.96)`, `backwards`, retardos 0.1s y 0.2s (portada) |
| Entrada del logotipo | `logoEntrance` 0.7s `--ease-spring`, `translateY(-24px) scale(.92)` |
| Bote de letras | `logoLetterBounce` 2.5s infinito por letra, retardo `índice × 55ms` |
| Desplegable | `translateY(-6px)` + opacidad, 0.14–0.18s `cubic-bezier(.16,1,.3,1)` |
| Botón que sube | `transform .12s ease`, placa y fondo en la misma transición |
| Vuelta tras cancelar | `accionEntra` 0.12s (opacidad 0.35 → 1, `scale .98`) |
| Barra de carga | relleno con `width .1s linear` + rayas `repeating-linear-gradient` corriendo 0.5s |

- Lo único infinito es el bote de las letras del logotipo. Todo lo demás entra una vez.
- `@media (prefers-reduced-motion: reduce)` apaga el bote de letras, las rayas de la barra y la
  vuelta del botón.
- Solo se animan `transform`, `box-shadow`, `background-color`, `opacity` y `width` (este último
  solo en la barra de progreso). Nunca `top/left/height`, nunca `filter` en hover.
- Duraciones de interacción: **120–150 ms** `ease`. Nada de springs largos en un botón.

## 11. Estados

| Estado | Transform | Placa | Fondo |
|---|---|---|---|
| Reposo | `rotate(±0.5deg)` | base | base |
| Hover | `translate(-1px,-2px) rotate(0)` | +2px | aclara, o pasa a `--marca-ambar` (barra superior), o a `--naranja-50/300` (campos y secundarios) |
| Activo | `translate(2px,2px) rotate(0)` | 1–2px | el mismo |
| Foco | — | — | aro `0 0 0 4px rgba(251,191,36,.55)`; el borde no cambia |
| Deshabilitado | sin giro | ninguna | `--neutro-200` + borde `--neutro-400` + texto `--texto-medio`/`--texto-suave` |

Casos concretos ya implementados:
- **Campo del código**: 52px de alto, texto centrado `1.3rem/700` con `letter-spacing .12em`,
  fondo blanco y borde de tinta para que el número se lea como dato. El foco añade el aro ámbar.
- **Desplegable**: el disparador es un campo más (12px, blanco); al abrir, fondo `--naranja-50`,
  aro ámbar y la flecha gira 180°. La lista es una pegatina con placa de `--verde-700`.
- **Botón que se convierte en barra de carga** (`.accion` + `.accionCargando`): fondo
  `--neutro-100`, `overflow: hidden`, `transform: none`, relleno ámbar con rayas diagonales y
  punta redondeada (`border-radius: 0 9999px 9999px 0`) avanzando al `%`. Al pasar por encima se
  vuelve blanco con placa y rayas `--peligro-borde` / `--peligro` y el texto cambia a
  "¿Quieres cancelar?": el hover es el aviso de cancelación.
- **Error de formulario**: caja `--peligro-suave` con borde 3px `--peligro-fuerte`, texto
  `0.85rem/700` centrado. En la portada el error es solo texto (`0.8rem/700`, `--peligro`) bajo el
  botón, sin caja: la tarjeta ya tiene mucho trazo.
- **Éxito** (caso creado): tarjeta del código en `--verde-50` con motas al 8 %, placa
  `--verde-700` y giro `-0.3deg`. El dato va en verde, no en ámbar (el ámbar es del botón).

## 12. Jerarquía de acción

Tres niveles y un solo ámbar:

| Nivel | Aspecto | Dónde |
|---|---|---|
| Primario | ámbar, placa `--marca-ambar-sombra`, 5px, giro −0.4° | Entrar, Generar caso, Ver informe del caso |
| Secundario | `--naranja-200`, placa `--naranja-600`, 3px, texto de tinta | Copiar enlace, Crear otro caso |
| Terciario / navegación | pegatina blanca con motas al 12 %, placa `--neutro-400` 3px | barra superior (inicio, ver informes, idioma) |

- Si una pantalla tiene dos acciones que compiten, la segunda se degrada de nivel; no se ponen
  dos ámbar.
- Un botón con texto que cambia ("Copiar enlace" → "¡Copiado!") lleva **ancho mínimo fijo**
  (`min-width: 10.5rem`): si no, encoge y mueve el campo de al lado.
- Los botones de la barra superior llevan **pastilla de icono** de 26px: círculo `--verde-900`
  con el glifo en blanco; al hover, círculo `--verde-950` y glifo ámbar. El botón "volver" no
  lleva pastilla y por eso reparte el padding por igual.

## 13. Iconos

- Trazo 1.9–2 (`stroke-linecap: round`, `stroke-linejoin: round`), relleno `none`. La flecha de
  "volver" de la barra va a 2.5 por ser pequeña; el icono de trabajadores sociales y el de idioma son
  glifos rellenos (`fill: currentColor`).
- Dentro de una pastilla blanca de 40px (fichas) o 26px (barra), borde 2–3px de tinta y el glifo
  en el color **oscurecido de la pieza** (ficha azul → `--juego-azul-borde`).
- El `<svg>` de una ficha se escala al **72 % de su caja** en vez de ir con tamaño fijo: así
  nunca toca el borde redondeado ni se recorta cuando la ficha se compacta.

## 14. Cómo llevar esto a otra pantalla

1. Copia el shell: `.kahoot-page` + `.kahoot-bg-canvas` (sin el SVG si no es la portada) y la
   barra compartida `components/Barra.jsx` (volver · rótulo mini · idioma).
2. La superficie clara pasa a ser una **tarjeta pegatina**: `background-color: var(--superficie)`
   + motas al 6 % + `border: 3px solid var(--verde-950)` + radio irregular + `box-shadow: 6px 6px
   0 var(--verde-950)`.
3. **Una pantalla larga = una sola plancha** (como el informe): `.pliego` blanca a lo ancho de
   1280px y dentro los bloques separados por `.bloque` (`border-top: 3px solid var(--verde-950)`
   + `1.6rem` de aire). No apiles tarjetas blancas con placa: dos niveles de relieve en una misma
   página se comen la jerarquía.
3. Cada botón: borde 3px de tinta, radio irregular (o píldora si puede rellenarse por dentro),
   placa del propio color oscurecido, giro `-0.4deg`, hover que sube y endereza, activo que hunde.
   Un solo ámbar por pantalla.
4. Cada campo: 12px de radio, borde de tinta, foco con el aro ámbar; etiqueta encima en 11px/800
   mayúsculas; el error debajo, en rojo; nunca placeholder en lugar de etiqueta.
5. Cada tabla/lista: fuera las líneas grises de 1px; separa con `--borde` (2px) o con aire.
   Cabecera en banda `--verde-50` con regla de 3px de tinta debajo y 10.5px/800 mayúsculas. La
   tabla va dentro de un carril con `overflow-x: auto` (`.tablaScroll`), **nunca** cambiando el
   `display` del `<table>`: eso rompe sus grupos de filas. Los números, `tabular-nums` y a la
   derecha.
6. Cada insignia/etiqueta: píldora con borde de tinta de 2px y relleno de la familia que
   corresponda (verde = informativo, naranja = destacado, rojo = alerta).
7. Los datos del informe siguen en verde; el dato destacado en `--naranja-700`.
8. Un dato que se teclea (código, enlace) va en una caja **verde-50 o blanca**, nunca ámbar.

## 15. Antipatrones (ya nos mordieron)

- **Cristal**: `backdrop-filter`, fondos `rgba(255,255,255,.08)` y bordes translúcidos. Fuera.
- **Placa de tinta sobre fondo oscuro**: se pierde; usa el color de la pieza oscurecido.
- **`rotate()` + `overflow: hidden` + `border`**: bordes dentados y logos recortados. Si hace
  falta recortar, `mask-image`; si hace falta `overflow: hidden`, quita el giro.
- **`filter` en hover**: cambia el rasterizado y aparecen artefactos en el borde.
- **`font-weight: 900`**: no existe en la fuente cargada.
- **Sombras con blur** y degradados suaves: rompen el registro de tebeo. (El difuminado del fondo
  es la única excepción, y va detrás de todo.)
- **Más de dos familias de color** en la misma pantalla: verde + un acento, y ya.
- **Dos ámbar en la misma pantalla**: el ojo deja de saber cuál avanza.
- **Botones que cambian de ancho al cambiar de texto** ("Copiar" → "¡Copiado!"): ancho mínimo fijo.
- **`overflow: hidden` en una tarjeta con fichas giradas dentro**: recorta las placas duras de
  las fichas. Es el motivo de que `.solo-section-card` no lo lleve.
- **Texto largo en un botón de la barra**: se cambia la etiqueta, no el tamaño de la barra.

## 16. Inconsistencias conocidas (pendientes de decidir)

Detectadas al documentar la portada y el panel. No son bugs de render: son dos maneras de hacer
lo mismo. Al tocar cualquiera de las dos piezas, unificar.

1. **Radio del CTA principal**: `.btn-acceso` (portada) usa pegatina `16 11 15 12`; `.accion`
   (panel) usa píldora `9999px`. El comentario del panel justifica la píldora por la barra de
   carga, pero el botón de la portada también podría cargar. Decidir uno y aplicarlo; hoy el §3
   admite los dos.
2. **Aro de foco**: `rgba(251,191,36,.55)` repetido en `globals.css`, `panel.module.css` y
   `desplegable.module.css`. Debería ser un token (`--foco`).
3. **Placa activa de los secundarios**: `.btnPrimario:active, .btnTerciario:active` usan
   `--neutro-400`, que sobre el botón naranja se lee gris. Lo coherente es `--naranja-600` /
   `--marca-ambar-sombra` a 1px.
4. **Comentario desfasado**: `ResultadoCaso.jsx` dice que el código va "en ámbar y con puntos";
   el CSS lo pinta en `--verde-50`. Manda el CSS.
5. **Botones deshabilitados**: la portada usa `--texto-medio` y el panel `--texto-suave` para la
   misma situación.
