# Auditoría y estabilización de No lo reenvíes

## Implementación encontrada

La novela es una aplicación independiente con JavaScript nativo, Vite 8 y un
motor de grafos. `compileStory.js` traduce los JSON de escenas y personajes a
estados del escenario. `VisualNovelEngine` conserva variables y nodos vistos;
`EventBus` comunica el motor con `VisualNovelView`. `Typewriter` usa
requestAnimationFrame; el chat revela mensajes mediante temporizadores.
Las partidas se guardan por historia en localStorage. No se envían datos al
backend. No había parámetros de edad/dificultad ni registro remoto de progreso.

Next.js en `frontend/` tenía su propia historieta, alimentada por el backend.
Se conserva en `/historia` y `/historieta`; el acceso principal sin PIN y el
acceso docente apuntan ahora a `/novela`, que integra el motor existente.
Los comandos de desarrollo y compilación del frontend generan la novela en
`public/novela`. No se han cambiado endpoints ni añadido servicios.

## Fallos y correcciones

| Problema | Causa | Corrección |
| --- | --- | --- |
| Seleccionar apoyos recargaba la pregunta | Opciones de elección simple enlazadas al mismo nodo | Tarjetas que se marcan/desmarcan juntas y se confirman una vez; se conservan sus variables |
| Comprobar permitía seguir con respuestas inseguras | Continuar se mostraba incondicionalmente | Validación de la selección completa; feedback por tarjeta; cambiar una tarjeta invalida el resultado |
| Imágenes ocultas parecían avisos del sistema | Mensajes atribuidos a Sistema | Burbuja del remitente con miniatura pixelada genérica; no se carga ningún archivo sensible |
| Chat demasiado rápido | Intervalo fijo de 480 ms | Pausas de 1,4–4,2 s según longitud y botón para mostrarlo completo |
| Saltos al escribir y cambiar de escena | Altura dependiente de cada fragmento y animaciones activas fuera del diálogo | Reserva de altura final, panel ampliado y cancelación de escritura/opciones al cambiar de modo |
| Escenario incorrecto al recuperar escenas especiales | Los eventos especiales omitían el escenario del motor | Instantánea del escenario para chat, capítulos y actividades |
| Decisiones y diálogo podían solaparse en móvil | Posiciones absolutas independientes | Espacios separados con altura máxima y scroll, incluidos móviles en horizontal |
| Historias de ejemplo aparecían en el inicio | Catálogo y selector como entrada | Una sola historia publicada y apertura directa; ejemplos conservados como fixtures |

Las tarjetas de capítulo muestran solo «Capítulo 1», «Capítulo 2», etc., en
ambas historias. Se mantienen las decisiones y los cuatro finales de «No lo
reenvíes».
La actividad de apoyos explica su propósito y no puntúa necesidades personales.

Se añadieron controles en español, botones reales para continuar, navegación por
teclado, prevención de repetición de teclas, anuncio de cada diálogo completo
para lectores de pantalla, foco contenido en el panel de derechos y respeto a
movimiento reducido tanto en escritura como en chat.

## Recursos e integración

La página integrada permite volver al inicio y acceder al módulo existente
`/necesito-ayuda`. El botón Salir del iframe usa postMessage y el contenedor
comprueba origen y ventana emisora. En uso independiente, configurar
`VITE_PLATFORM_URL` para indicar la portada de la plataforma; en localhost se
usa el puerto 3000 por defecto.

Se verificaron y enlazaron recursos oficiales:

- INCIBE: https://www.incibe.es/linea-de-ayuda-en-ciberseguridad
- AEPD: https://www.aepd.es/canalprioritario

El texto distingue orientación, retirada de contenido y denuncia penal. No se
solicitan testimonios, datos personales ni archivos reales. No se promete un
resultado judicial ni se califica automáticamente cada conducta como delito.

## Archivos de esta intervención

- Motor/presentación: `src/core/VisualNovelEngine.js`, `src/app/App.js`,
  `src/content/compileStory.js`, `src/main.js`, `src/ui/Typewriter.js`,
  `src/ui/VisualNovelView.js`, `src/ui/templates.js`, `src/styles/main.css`.
- Contenido: `public/content/index.json`, `stories/no-lo-reenvies/story.json`
  y `rights.json`; generador `scripts/build-no-lo-reenvies.mjs` sincronizado.
- Validación/pruebas: `scripts/validate-content.mjs`, `library-smoke.mjs`,
  `no-lo-reenvies-smoke.mjs`, nuevos `engine-regressions.mjs` y `browser-smoke.mjs`.
- Entrada/documentación: `index.html`, `package.json`, `README.md` y este informe.
- Integración frontend: `app/novela/page.jsx`, enlaces de `app/page.jsx` y
  `app/profesores/page.jsx`, `scripts/prepare-novel.mjs`, `package.json` y `.gitignore`.
  `app/layout.jsx` declara el logo existente como favicon para evitar el 404
  detectado en la prueba integrada.

Los cambios simultáneos del módulo de derivación y otros archivos ajenos a la
novela se han conservado.

## Validación

- `npm test`: validador, asset ausente deliberado, UI, carga HTTP del catálogo,
  recorrido de la historia y regresiones del motor.
- El recorrido exhaustivo explora **270 rutas completas**, visita **170 nodos**
  y alcanza **los cuatro finales** con condiciones reales, desde el inicio.
- Reinicio durante chat/actividad, cancelación de escritura, conservación de
  flags y recuperación de un guardado del antiguo menú comprobados.
- `npm run story:build`: contenido regenerado con el autor actualizado.
- `npm run build` en la novela y el frontend: compilación de producción.
- Chromium real: 1440×900, 390×844, 768×1024 y 844×390; texto largo,
  decisiones, selecciones, corrección, guardado, reinicio, recursos, Escape y
  consola. Capturas de verificación en `/tmp/novela-dialogue-*.png` y
  `/tmp/novela-support-*.png`.
- Integración Next.js de producción comprobada con Chromium: entrada desde la
  portada, carga de contenido y recursos en `/novela/index.html`, enlace al
  módulo de ayuda y salida al inicio. Sin errores de consola tras declarar el
  favicon de la plataforma. La versión final queda disponible en
  `http://localhost:3000/novela` y Vite en `http://localhost:5173/`.
- No existen scripts específicos de lint/typecheck en la novela. Next.js
  ejecuta su comprobación integrada durante el build.

## Revisión editorial posterior

- La bienvenida conserva instrucciones breves sin adelantar los personajes.
  Las tarjetas y escenas muestran el cambio de perspectiva cuando ocurre.
- Todos los pensamientos de las dos historias identifican a su personaje.
  La interfaz etiqueta diálogos, narración y decisiones; los chats muestran
  también quién usa el móvil y quién envía cada mensaje. En «No lo reenvíes»,
  el retrato sigue a quien habla y desaparece cuando habla alguien sin dibujo.
- «No lo reenvíes» ajusta las horas del chat, el salto de viernes a lunes, la
  pregunta previa a la elección de Sara y la conversación del final del reenvío.
- «No soy yo» permite decidir si Sergio acude a Orientación. La escena con
  Marina y los finales respetan esa decisión; el segundo caso se presenta como
  una historia independiente.
- Las fichas de apoyos y pruebas son ahora informativas. El motor mantiene la
  capacidad de actividades interactivas para futuros contenidos.
- Los recursos distinguen la difusión de contenido sexual o violento publicado
  en Internet de la suplantación mediante un perfil falso.

## Límites y siguientes pasos, por impacto

1. Revisar las vulnerabilidades reportadas por npm en las dependencias existentes
   del frontend (una alta y una crítica). No se ha aplicado una migración mayor
   automática a Next.js dentro de esta intervención.
2. Validación pedagógica con adolescentes y profesionales, además de revisión
   jurídica del contenido completo; esta intervención comprueba recursos y
   funcionamiento, no sustituye esa evaluación.
3. Probar Safari/iOS y Firefox físicos, lectores de pantalla y distintos tamaños
   de fuente. Las pruebas visuales automáticas realizadas usan Chromium.
4. Si se edita la novela durante `frontend dev`, volver a generar con
   `node frontend/scripts/prepare-novel.mjs` o trabajar directamente con Vite.
   La copia integrada se prepara al iniciar, no se sincroniza continuamente.
5. Mantener las dependencias instaladas tanto en `LegalinStory/` como en
   `frontend/`. El progreso sigue siendo local; no hay sincronización entre
   dispositivos ni envío de resultados educativos al backend.
