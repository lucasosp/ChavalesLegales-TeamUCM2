# Sara: lectura sencilla y proceso legal

La historia sigue siendo la de una chica de 14 años. El lenguaje está adaptado
para lectores de 10–12 años. Las decisiones emocionales no cambian la sentencia.

## Qué se ha simplificado

- Se retiran once intervenciones: la explicación sucesiva de seis profesionales,
  la teoría sobre la dispensa, el umbral de edad y la prueba preconstituida.
- Los diálogos del capítulo del tribunal pasan de 881 a 473 palabras (46 % menos).
  El texto narrado total pasa de 3.057 a 2.464 palabras. Estas cifras no incluyen
  opciones, chats ni la tabla, que se consulta aparte.
- En vez de aprender términos legales, el lector sabe qué va a pasar: buscar
  pruebas, contar lo ocurrido con ayuda, ir al juicio y conocer la decisión.
- Los detalles técnicos y las fuentes se conservan en `legal.json`. No se recitan
  en la historia ni aparecen en las fichas de personajes.

## Fichas de personajes

Cada personaje con ficha (`guide.peopleProfiles`) tiene una placa con su nombre en
la barra superior. La primera vez que aparece, su ficha se abre sola: el nombre,
una frase sobre su papel y una explicación breve. Al cerrarla, el foco vuelve a su
placa, que permite releerla cuando haga falta. Leer una ficha pausa la novela y no
hace avanzar la escena ni salta ninguna línea.

Las fichas conservan la pausa de la novela y el foco dentro del panel, y funcionan
con teclado y lector de pantalla.

## Garantías que permanecen en la historia

| Qué debe entender el lector | Dónde se explica |
| --- | --- |
| Las personas adultas deben avisar y proteger | `c2-05`, `c2-protection`, `c2-06` |
| Ir a casa de la tía no basta: hay medidas judiciales | `c3-measures`, `c3-safety-plan` |
| El padre no puede decidir por Sara en este caso | `c3-representation` |
| Hay que explicar las opciones y escuchar a Sara antes de participar | `c3-party`, `c3-party-warning`, `c3-party-confirmed` |
| En este caso Sara tendrá que contar lo sucedido | `c5-family-case` |
| Puede pedir compañía, otra sala, explicaciones y pausas | `c5-supports`, `c5-company`, `c5-communication` |
| Grabar no le evita automáticamente volver a hablar | `c5-recording`, `c6-trial-supports` |
| Buscar pruebas, celebrar el juicio y decidir son pasos distintos | `c5-investigation`, `c6-investigation-end`, `c6-trial-notice`, `c6-after-trial` |
| Pedir ayuda estuvo bien, incluso sin condena | `c6-no-conviction`, `c6-protection-after` |
| Se puede pedir una revisión si la ley lo permite | `c6-appeal` |

La investigación no acaba siempre en juicio. Los apoyos y las medidas se valoran
según el caso. Sara no decide el castigo y no tiene que vigilar que su padre cumpla.

## Fuentes y comprobación

Se mantienen las referencias al [Estatuto de la víctima, arts. 19–26](https://www.boe.es/buscar/act.php?id=BOE-A-2015-4606#a19),
la [LECrim](https://www.boe.es/buscar/act.php?id=BOE-A-1882-6036), la
[LOPIVI, arts. 15–16](https://www.boe.es/buscar/act.php?id=BOE-A-2021-9347#a1-8) y el
[Código Civil, arts. 158 y 163](https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763#art158).

La prueba `npm run test:sara` recorre las rutas de ambos resultados y comprueba
que no se saltan las explicaciones esenciales. Cubre también las fichas que se
abren solas al conocer a cada personaje, pausar la historia y continuar sin perder
la escena. Comprueba los datos y textos de las fichas en los seis idiomas.

`npm run test:people` comprueba en navegador escritorio, móvil y pantalla
horizontal, además de cargar los seis idiomas. Verifica que la ficha se ancla a su
placa, que el teclado no hace avanzar la historia y que al cerrarla el foco vuelve
a la placa. Estas
comprobaciones han pasado con Chromium; requieren Playwright y Chromium. La novela y la guía se
regeneran con `npm run story:sara`.

La revisión del lenguaje no equivale a una evaluación de comprensión con menores
reales. Se mantiene la revisión profesional pendiente indicada en `legal.json`.
