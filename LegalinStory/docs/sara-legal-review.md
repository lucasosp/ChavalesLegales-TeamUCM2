# Sara: revisión del proceso y del lenguaje

Revisión del guion y fichas: 22 de octubre de 2026. Se mantiene la historia de
una víctima de 14 años de violencia ejercida por su padre adulto. Las decisiones
emocionales de la jugadora no determinan el resultado judicial.

## Recorrido que cuenta la historia

1. Laura escucha, avisa inmediatamente a Servicios Sociales y Policía y no deja
   sola a Sara mientras se organiza una estancia con su madre y Dani.
2. Se escucha a ambos hermanos y se valora la seguridad. En este caso concreto,
   la jueza impone prohibiciones de acercamiento y comunicación y suspende las
   visitas. Se organiza la recogida del instituto y se explica cuándo pedir ayuda.
3. Se comprueba que la madre puede representar adecuadamente a Sara. Irene es su
   abogada; explica la alternativa del defensor judicial si tampoco la madre
   pudiera representarla. Escucha a Sara y explica la acusación particular y su
   consecuencia sobre la dispensa antes de que su madre formalice la personación.
   Recibir protección no depende de personarse.
4. La citación del capítulo 5 es para declarar durante la investigación. Irene
   distingue comparecer y declarar, y explica por qué, en este caso, no se aplica
   la dispensa por parentesco: Sara ya es acusación particular.
5. Se distinguen evitar el encuentro con el padre, elegir acompañamiento y
   valorar medidas concretas. Sara elige que Elena espere fuera y declara con
   una psicóloga por videoconferencia desde otra sala.
6. Su declaración se graba por ser menor. Se explica que grabar no basta para
   convertirla en prueba preconstituida y que la obligación por edad del art.
   449 ter se refiere a menores de 14 años. En esta historia no sustituye la
   declaración en juicio; cumplir 14 no elimina los apoyos.
7. Al acabar la investigación se explica que otros casos pueden archivarse. Este
   continúa con acusación, defensa y juicio ante otro juez o tribunal. Sara
   recibe información previa y vuelve a declarar con apoyos.
8. Después del juicio llegan la sentencia, su explicación y las opciones de
   recurso. La ayuda responde a sus necesidades; se explica qué medidas siguen
   y cuáles deben cambiar, sin prometer la continuidad de toda medida cautelar.

## Comprobación de los siete hallazgos

| Hallazgo | Escenas que lo resuelven |
| --- | --- |
| Comunicación inmediata del instituto | `c2-05`, `c2-protection`, `c2-06` |
| La casa de la tía no basta como protección | `c3-measures`, `c3-safety-plan`, `c3-safety-followup` |
| Conflicto de representación con el padre | `c3-representation`, `c3-defender`, `c3-party-warning`, `c3-party-confirmed` |
| Grabación y prueba preconstituida | `c5-recording`, `c5-age-rule`, `c5-recording-case` |
| Derechos y organización de apoyos | `c5-supports`, `c5-company`, `c5-07`, `c6-trial-supports` |
| Investigación, juicio y sentencia | `c5-investigation`, `c6-investigation-end`, `c6-trial-notice`, `c6-trial`, `c6-after-trial` |
| Comparecencia, declaración y dispensa | `c3-party-warning`, `c5-family-rule`, `c5-family-case` |

## Revisión del lenguaje y de las decisiones

- Las explicaciones nuevas del guion castellano se reparten en intervenciones de
  menos de 50 palabras. Sara hace preguntas y resume la diferencia entre investigar
  y juzgar antes del juicio. No se reproducen preguntas sobre la violencia ni se
  ensaya una versión de los hechos.
- Los términos necesarios se explican al aparecer: investigación o instrucción,
  acusación particular, defensor judicial, dispensa, prueba preconstituida, archivo,
  sentencia, absolución, recurso y firmeza. No se pide memorizar nombres o artículos.
- Pedir otra explicación, decir «no recuerdo» y solicitar una pausa se recuerdan
  en una escena común, independientemente de la opción elegida.
- Los detalles de su caso se presentan como decisiones concretas. No se promete
  una sala concreta por tener 14 años, una sola declaración, una fecha de sentencia
  ni una condena. La rama de absolución especifica el motivo de esa ficción.
- La responsabilidad de proteger, investigar y resolver sigue en las personas
  adultas y las autoridades. Sara no debe conseguir que su padre cumpla las
  medidas ni decidir su castigo.
- Las cinco traducciones conservaban datos de una versión anterior: 15 años y
  los nombres intercambiados de la trabajadora social y la abogada. Se actualizan
  a 14 años, Elena y su abogada Irene, junto con las explicaciones y los perfiles.

## Fuentes y verificación

- [LOPIVI, arts. 15–16](https://www.boe.es/buscar/act.php?id=BOE-A-2021-9347#a1-8):
  comunicación inmediata.
- [Código Civil, arts. 158 y 163](https://www.boe.es/buscar/act.php?id=BOE-A-1889-4763#art158):
  protección y representación ante intereses contrapuestos.
- [Estatuto de la víctima, arts. 19–26](https://www.boe.es/buscar/act.php?id=BOE-A-2015-4606#a19):
  contacto, acompañamiento, evaluación, grabación y defensor judicial.
- [LECrim](https://www.boe.es/buscar/act.php?id=BOE-A-1882-6036): arts. 109 bis,
  416, 449 bis y ter, 544 ter y quinquies, 637, 641, 703 bis, 707, 730.2,
  780–785 y 790.
- [Descripción oficial del proceso penal español](https://e-justice.europa.eu/topics/your-rights/defendants-criminal-proceedings/es_es):
  investigación, acusación, juicio y sentencia.

`scripts/sara-smoke.mjs` verifica que todas las rutas pasan por las explicaciones
esenciales, en castellano y en las cinco traducciones. Comprueba el orden de las
fases, los perfiles, las fuentes y ambos resultados, además del funcionamiento de
la novela. El guion se regenera con `npm run story:sara`.

Verificación ejecutada: batería completa `npm test` superada; Sara tiene 163 nodos
alcanzables, 31 opciones y 5.168 estados relevantes recorridos. La compilación
integrada mediante `node frontend/scripts/prepare-novel.mjs` también se completó.
El número de estados es una comprobación del motor, no una evaluación de lectura.

Esta revisión comprueba contenido y coherencia narrativa. No acredita que se haya
hecho una evaluación de comprensión con menores ni sustituye la revisión jurídica,
pedagógica y lingüística profesional indicada en `legal.json`.
