/**
 * Generates the content for "No lo reenvíes".
 *
 * Keeping the long branching graph in a small JS authoring file avoids a
 * 1,500-line hand-maintained JSON file while still shipping plain JSON to the
 * runtime. Run:
 *
 *   node scripts/build-no-lo-reenvies.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const storyDir = path.resolve(here, "../public/content/stories/no-lo-reenvies");

const nodes = {};
const portraits = {
  Sara: "sara",
  Julia: "julia",
  Sergio: "sergio",
  Hugo: "hugo",
  Marina: "marina",
};

const say = (id, speaker, text, next, extra = {}) => {
  const portrait = portraits[speaker];
  nodes[id] = {
    type: "dialogue",
    speaker,
    text,
    next,
    ...(portrait ? { cast: { [portrait]: "neutral" } } : {}),
    // A null cast clears the portrait when the speaking character has no sprite.
    ...(speaker && !portrait ? { cast: { sara: null } } : {}),
    ...extra,
  };
};

const narrate = (id, text, next, extra = {}) => say(id, null, text, next, extra);

const thought = (id, text, next, extra = {}) =>
  say(id, extra.speaker ?? null, text, next, { tone: "thought", ...extra });

const chat = (id, chatTitle, self, messages, next, extra = {}) => {
  nodes[id] = { type: "chat", chatTitle, self, messages, next, ...extra };
};

const choice = (id, prompt, options, extra = {}) => {
  nodes[id] = { type: "choice", prompt, options, ...extra };
};

const branch = (id, when, then, otherwise, extra = {}) => {
  nodes[id] = { type: "branch", when, then, else: otherwise, ...extra };
};

const card = (id, kicker, title, text, next) => {
  nodes[id] = { type: "interstitial", ...(kicker ? { kicker } : {}), title, text, next };
};

const ending = (id, kicker, title, text) => {
  nodes[id] = { type: "ending", kicker, title, text };
};

const msg = (from, text, time, extra = {}) => ({ from, text, time, ...extra });
const system = (text, time) => ({ from: "Sistema", text, time, system: true });
const option = (id, label, next, extra = {}) => ({ id, label, next, ...extra });

/* ------------------------------------------------------------------ prologue */

card(
  "start",
  "Chavales Legales",
  "No lo reenvíes",
  "Una novela visual sobre acoso, intimidad y derecho a pedir ayuda.",
  "prologo-1",
);

narrate(
  "prologo-1",
  "Lunes, 08:15. El timbre anuncia el inicio de las clases. Sara camina con Julia hacia su aula.",
  "prologo-2",
  { scene: "hallway-day", cast: { sara: "neutral" } },
);
say("prologo-2", "Julia", "Otra vez con Sergio...", "prologo-3");
say(
  "prologo-3",
  "Sara",
  "Es que no entiendo qué gracia les hace.",
  "prologo-4",
);
say(
  "prologo-4",
  "Julia",
  "Ya. Pero como les digas algo, empiezan contigo también.",
  "prologo-5",
);
narrate(
  "prologo-5",
  "Al pasar junto a las taquillas, Sara ve a varios chicos riéndose alrededor de un móvil.",
  "prologo-6",
);
say("prologo-6", "Hugo", "Tío, mirad lo que han puesto de Sergio.", "prologo-7");
say("prologo-7", "Dani", "JAJAJA. Qué cabrones.", "prologo-8");
say("prologo-8", "Sergio", "¿Podéis quitar eso ya?", "prologo-9");
say("prologo-9", "Hugo", "Pero si es una broma. No te rayes.", "prologo-10");
say("prologo-10", "Sergio", "Os he dicho que lo borréis.", "prologo-11");
say(
  "prologo-11",
  "Hugo",
  "Vale, vale. Tampoco te pongas así.",
  "prologo-12",
);
narrate(
  "prologo-12",
  "Sergio recoge su mochila y se aleja. Sara reconoce al chico del taller de radio.",
  "decision-1",
);

choice("decision-1", "Sara ve lo que está pasando. ¿Qué hace?", [
  option("intervene", "Intervenir y pedir que dejen de burlarse.", "d1-intervene", {
    flags: { intervened: true },
  }),
  option("talk", "Buscar a Sergio después para preguntarle cómo está.", "d1-talk", {
    flags: { talkedSergio: true },
  }),
  option(
    "avoid",
    "Seguir caminando para no meterse en problemas.",
    "d1-avoid",
    { flags: { avoidedSergio: true } },
  ),
], { cast: { sara: "neutral" } });

say(
  "d1-intervene",
  "Sara",
  "No os riáis de él. Eso no es una broma.",
  "d1-intervene-2",
);
narrate(
  "d1-intervene-2",
  "Hugo guarda el móvil por un momento. Sergio levanta la vista, sorprendido.",
  "d1-intervene-3",
);
say("d1-intervene-3", "Sergio", "Gracias...", "prologo-end");

narrate(
  "d1-talk",
  "Durante el recreo, Sara se acerca a Sergio.",
  "d1-talk-2",
  { scene: "patio-day" },
);
say(
  "d1-talk-2",
  "Sergio",
  "Estoy cansado de que se rían de mí.",
  "d1-talk-3",
);
say("d1-talk-3", "Sara", "Lo siento. No deberían hacerlo.", "prologo-end");

narrate(
  "d1-avoid",
  "Sara sigue caminando hacia clase. Sergio se marcha solo.",
  "d1-avoid-2",
);
thought(
  "d1-avoid-2",
  "«Quizá debería haber dicho algo...»",
  "prologo-end",
  { speaker: "Sara" },
);

narrate(
  "prologo-end",
  "A veces resulta fácil saber que algo está mal. Lo difícil es decidir qué hacer cuando todos los demás se ríen.",
  "chapter1-card",
  { scene: "hallway-day" },
);

/* ----------------------------------------------------------------- chapter 1 */

card("chapter1-card", null, "Capítulo 1", "Martes, 18:42.", "ch1-1");

narrate(
  "ch1-1",
  "Sara intenta terminar los ejercicios de Matemáticas. Suena una notificación. Después otra. Y otra.",
  "ch1-chat-1",
  { scene: "bedroom-evening", cast: { sara: "neutral" } },
);

chat(
  "ch1-chat-1",
  "4.º ESO | Los de siempre",
  "Sara",
  [
    msg("Hugo", "alguien ha visto lo de Sara??", "18:39"),
    msg("Dani", "qué dices", "18:39"),
    msg("Hugo", "jajajaj", "18:40"),
    msg("Hugo", "Imagen oculta", "18:40", { hidden: true }),
    msg("Dani", "borra eso tío", "18:41"),
    msg("Hugo", "Mensaje eliminado.", "18:42", { deleted: true }),
  ],
  "ch1-2",
);

narrate(
  "ch1-2",
  "Sara deja de escribir. El móvil sigue vibrando sobre el cuaderno.",
  "ch1-chat-2",
);

chat(
  "ch1-chat-2",
  "Julia",
  "Sara",
  [
    msg("Julia", "sara estas?", "18:42"),
    msg("Sara", "sii\nqué pasa?", "18:42"),
    msg("Julia", "tengo q contarte algo\npero no te asustes", "18:42"),
    msg("Sara", "pues me estás asustando 😭", "18:43"),
    msg("Julia", "están pasando una foto tuya por un grupo", "18:43"),
    msg("Sara", "cómo que una foto mía??", "18:43"),
    msg("Julia", "dicen que es una foto íntima", "18:44"),
    msg("Sara", "QUÉ\npero qué foto???", "18:44"),
    msg("Julia", "no lo sé bien\nno sé si es real o está editada", "18:44"),
    msg("Sara", "pero quién la tiene?", "18:45"),
    msg("Julia", "creo que gente de 4ºB", "18:45"),
    msg(
      "Sara",
      "tía yo no he mandado nada a esa gente\nno entiendo nada",
      "18:45",
    ),
    msg("Julia", "ya\ny no quiero que nadie siga pasándola", "18:46"),
    msg("Sara", "no se lo digas a nadie por favor", "18:46"),
    msg("Julia", "estoy contigo vale?\nvamos a ver qué hacemos", "18:46"),
  ],
  "ch1-3",
);

thought(
  "ch1-3",
  "«¿Y si mañana todo el mundo me ha visto?»",
  "decision-2",
  { speaker: "Sara" },
);

choice("decision-2", "¿Qué hace Sara?", [
  option(
    "investigate",
    "Pedir a Julia que le ayude a identificar dónde circula, sin reenviarla.",
    "d2-investigate",
    { flags: { investigated: true } },
  ),
  option(
    "hugo",
    "Escribir a Hugo para exigirle explicaciones.",
    "d2-hugo",
    { flags: { confrontedHugo: true } },
  ),
  option(
    "avoid",
    "Apagar el teléfono y esperar a que el problema desaparezca.",
    "d2-avoid",
    { flags: { avoidedPhone: true } },
  ),
], { cast: { sara: "neutral" } });

say(
  "d2-investigate",
  "Julia",
  "Vale. No la reenvío. Podemos mirar en qué grupo empezó y hablarlo con alguien de confianza.",
  "d2-investigate-2",
);
say(
  "d2-investigate-2",
  "Sara",
  "Gracias. No quiero que siga pasando.",
  "ch1-end",
);

chat(
  "d2-hugo",
  "Hugo",
  "Sara",
  [
    msg("Sara", "Hugo, ¿qué es esa foto?", "18:50"),
    msg("Hugo", "qué foto", "18:50"),
    msg("Sara", "la que estáis pasando", "18:51"),
    msg("Hugo", "yo no he pasado nada", "18:51"),
    msg("Hugo", "pregúntale a los de 4ºB", "18:52"),
  ],
  "d2-hugo-2",
);
narrate(
  "d2-hugo-2",
  "La conversación no le ha dado respuestas. Sara siente que ha empeorado.",
  "ch1-end",
);

narrate(
  "d2-avoid",
  "Sara apaga el teléfono y lo deja a un lado. Pero la preocupación no desaparece.",
  "d2-avoid-2",
);
thought("d2-avoid-2", "«Mañana tendré que ir al instituto.»", "ch1-end", { speaker: "Sara" });

narrate(
  "ch1-end",
  "Ninguna opción implica que Sara sea responsable de lo sucedido. Pedir ayuda no es enfrentarse a quien lo hizo.",
  "chapter2-card",
);

/* ----------------------------------------------------------------- chapter 2 */

card(
  "chapter2-card",
  null,
  "Capítulo 2",
  "Martes, 19:03. Mientras Sara intenta entender qué ocurre, a Julia le llega un mensaje.",
  "ch2-1",
);

narrate(
  "ch2-1",
  "Julia abre la conversación. Hugo le ha enviado la imagen que circula sobre Sara.",
  "ch2-chat-1",
  { scene: "bedroom-evening", cast: { julia: "neutral" } },
);

chat(
  "ch2-chat-1",
  "Hugo",
  "Julia",
  [
    msg("Hugo", "mira lo que están pasando por ahí", "19:03"),
    msg("Hugo", "Imagen oculta", "19:03", { hidden: true }),
    msg("Hugo", "pásaselo a alguien de 4ºA\na ver qué dicen JAJA", "19:04"),
    msg("Julia", "pero esto de dónde ha salido?", "19:04"),
    msg("Hugo", "ni idea\nestá por todos lados", "19:05"),
  ],
  "ch2-2",
);

thought(
  "ch2-2",
  "«No sé si esto es real. Tampoco sé quién lo ha hecho. Pero Sara me ha pedido que no se lo diga a nadie.»",
  "decision-3",
  { speaker: "Julia" },
);

choice("decision-3", "¿Qué hace Julia?", [
  option(
    "forward",
    "Reenviarlo a otra amiga para comprobar si es auténtico.",
    "d3-forward",
    { flags: { juliaForwarded: true } },
  ),
  option(
    "help",
    "Negarse a reenviarlo y buscar ayuda para Sara.",
    "d3-help-hugo",
    { flags: { juliaHelped: true } },
  ),
  option(
    "exit",
    "Salir de la conversación y no involucrarse.",
    "d3-exit",
    { flags: { juliaDisengaged: true } },
  ),
], { cast: { julia: "neutral" } });

narrate(
  "d3-forward",
  "Julia reenvía el archivo a otra amiga. En cuestión de segundos, aparecen nuevas burbujas de chat.",
  "d3-forward-2",
);
narrate(
  "d3-forward-2",
  "El reenvío ha creado otra copia de la imagen. Aunque Julia quería comprobar de dónde venía, ahora otra persona la tiene.",
  "d3-forward-3",
);
narrate(
  "d3-forward-3",
  "Julia se queda mirando el chat. Ya no puede retirar lo que la otra persona ha recibido.",
  "ch2-end",
);

chat(
  "d3-help-hugo",
  "Hugo",
  "Julia",
  [
    msg("Julia", "no voy a pasarlo", "19:06"),
    msg("Julia", "es una foto privada y Sara no ha dado permiso", "19:06"),
    msg("Julia", "dejad de compartirla", "19:06"),
    msg("Hugo", "tía no es para tanto", "19:07"),
    msg("Julia", "no. no voy a seguir con esto.", "19:07"),
  ],
  "d3-help-sara",
);

chat(
  "d3-help-sara",
  "Sara",
  "Julia",
  [
    msg("Julia", "estoy contigo", "19:08"),
    msg("Julia", "mañana podemos hablar con Marina si quieres", "19:08"),
    msg("Sara", "gracias", "19:09"),
  ],
  "d3-help-end",
);

narrate(
  "d3-help-end",
  "Julia ha decidido no ampliar la difusión y acompañar a Sara.",
  "ch2-end",
);

narrate(
  "d3-exit",
  "Julia cierra la conversación. El móvil continúa vibrando.",
  "d3-exit-2",
);
narrate(
  "d3-exit-2",
  "Julia no ha reenviado la imagen, aunque Sara todavía necesita apoyo.",
  "ch2-end",
);

narrate("ch2-end", "Al día siguiente, Sara vuelve al instituto.", "chapter3-card");

/* ----------------------------------------------------------------- chapter 3 */

card("chapter3-card", null, "Capítulo 3", "Miércoles, 08:05.", "ch3-1");

narrate(
  "ch3-1",
  "Sara entra en clase. Dos compañeros dejan de hablar cuando la ven.",
  "ch3-2",
  { scene: "classroom-day", cast: { sara: "neutral" } },
);
say("ch3-2", "Compañera", "¿Es ella?", "ch3-3");
say("ch3-3", "Otro alumno", "No sé, tío.", "ch3-4");
thought(
  "ch3-4",
  "«Antes me preocupaba suspender Matemáticas. Ahora solo quiero que nadie me mire.»",
  "ch3-5",
  { speaker: "Sara" },
);
narrate(
  "ch3-5",
  "En el recreo, Sara recibe un mensaje de Sergio.",
  "ch3-chat-sergio",
  { scene: "patio-day" },
);

chat(
  "ch3-chat-sergio",
  "Sergio",
  "Sara",
  [
    msg("Sergio", "oye Sara", "11:12"),
    msg("Sergio", "he visto que están diciendo cosas de ti", "11:12"),
    msg("Sara", "genial\ntambién te has enterado tú", "11:13"),
    msg("Sergio", "perdona\nno quería molestarte", "11:13"),
    msg("Sara", "no tranqui\nes que estoy harta", "11:13"),
    msg("Sergio", "te entiendo\nconmigo llevan meses así", "11:14"),
    msg("Sara", "ya lo sé\nvi lo del otro día", "11:14"),
    msg(
      "Sergio",
      "al principio pensé que pararían\npero cada vez es peor\nhay días que ni quiero venir a clase",
      "11:14",
    ),
    msg("Sara", "lo siento mucho", "11:15"),
    msg(
      "Sergio",
      "Marina me dijo hace poco que podía hablar con ella\npero todavía no he ido",
      "11:15",
    ),
    msg("Sara", "y no te da miedo?", "11:15"),
    msg(
      "Sergio",
      "muchísimo\nsobre todo que se enteren y luego sea peor",
      "11:16",
    ),
    msg("Sara", "a mí me pasa igual", "11:16"),
    msg("Sergio", "podemos ir juntos si quieres", "11:16"),
  ],
  "ch3-6",
);

narrate(
  "ch3-6",
  "Sergio lleva meses esperando que alguien haga algo. Sara empieza a comprender ese miedo.",
  "decision-4",
);

choice("decision-4", "¿A quién acude Sara?", [
  option("together", "Ir con Sergio a hablar con Marina.", "d4-together", {
    flags: { helpRoute: true },
  }),
  option(
    "family",
    "Contárselo primero a un familiar u otra persona adulta de confianza.",
    "d4-family",
    { flags: { familyRoute: true } },
  ),
  option(
    "notReady",
    "Decidir que todavía no está preparada para contarlo.",
    "d4-not-ready",
    { flags: { notReady: true } },
  ),
], { cast: { sara: "neutral" } });

say("d4-together", "Sergio", "¿Vamos juntos?", "d4-together-2");
narrate(
  "d4-together-2",
  "Sergio la acompaña hasta la puerta del Departamento de Orientación.",
  "chapter4-card",
  { scene: "hallway-day", cast: { sara: "neutral" } },
);

narrate(
  "d4-family",
  "Esa noche, Sara habla con su familia. Le cuesta encontrar las palabras, pero no está sola.",
  "d4-family-2",
  { scene: "bedroom-evening", cast: { sara: "sad" } },
);
say(
  "d4-family-2",
  "Madre",
  "Gracias por contárnoslo. Vamos a buscar ayuda juntos.",
  "d4-family-3",
);
narrate(
  "d4-family-3",
  "Al día siguiente, la acompañan al instituto y le proponen hablar con Marina.",
  "chapter4-card",
);

narrate(
  "d4-not-ready",
  "Sara no se siente preparada. Guarda el móvil y decide esperar.",
  "late-1",
  { scene: "bedroom-evening", cast: { sara: "sad" } },
);
narrate(
  "late-1",
  "Pasan los días. Los rumores no desaparecen y Sara sigue evitando a sus compañeros.",
  "late-2",
  { scene: "classroom-day", cast: { sara: "sad" } },
);
narrate(
  "late-2",
  "El viernes por la noche, Sara abre la conversación de Marina. Escribe un mensaje, pero no se atreve a enviarlo.",
  "late-choice",
  { scene: "bedroom-evening", cast: { sara: "sad" } },
);

choice("late-choice", "¿Quieres ayudar a Sara a dar el primer paso?", [
  option("send", "Enviar el mensaje a Marina.", "late-send", {
    flags: { delayedHelp: true },
  }),
  option("keep", "No enviarlo todavía.", "late-not-send", {
    flags: { neverAsked: true },
  }),
], { cast: { sara: "sad" } });

narrate(
  "late-send",
  "Sara respira hondo y envía el mensaje.",
  "late-send-2",
);
say(
  "late-send-2",
  "Marina",
  "El lunes, cuando llegues al instituto, podemos hablar. No tienes que enfrentarte sola.",
  "late-send-3",
);
narrate("late-send-3", "El lunes, Sara acude al Departamento de Orientación.", "chapter4-card");

narrate(
  "late-not-send",
  "Sara observa el mensaje. Su dedo se acerca al botón de enviar. La pantalla se congela.",
  "late-not-send-router",
);

branch(
  "late-not-send-router",
  { flag: "juliaForwarded" },
  "final3-scene",
  "final4-scene",
);

card(
  "chapter4-card",
  null,
  "Capítulo 4",
  "Departamento de Orientación.",
  "ch4-0",
);

/* ----------------------------------------------------------------- chapter 4 */

narrate(
  "ch4-0",
  "Sara está sentada frente a Marina. La puerta se cierra y, por un momento, el pasillo queda en silencio.",
  "ch4-1",
  { scene: "orientation-office", cast: { sara: "neutral" } },
);
say(
  "ch4-1",
  "Marina",
  "Hola, Sara. ¿Quieres contarme qué ha pasado?",
  "ch4-2",
);
say("ch4-2", "Sara", "Es que no sé ni por dónde empezar.", "ch4-3");
say("ch4-3", "Marina", "Está bien. Tenemos tiempo.", "ch4-4");
say("ch4-4", "Sara", "Hay una foto mía por ahí. O eso dicen.", "ch4-5");
say("ch4-5", "Marina", "¿Sabes dónde la han compartido?", "ch4-6");
say(
  "ch4-6",
  "Sara",
  "En grupos del instituto. Pero no sé si es real.",
  "ch4-7",
);
say(
  "ch4-7",
  "Marina",
  "Entiendo. ¿Y qué es lo que más te preocupa ahora mismo?",
  "ch4-8",
);
say(
  "ch4-8",
  "Sara",
  "Que todo el mundo la haya visto. Y que si lo cuento sea todavía peor.",
  "ch4-9",
);
say(
  "ch4-9",
  "Marina",
  "Gracias por confiar en mí. Vamos a ver qué podemos hacer para protegerte.",
  "ch4-10",
);
say("ch4-10", "Sara", "¿Se lo vas a decir a mis padres?", "ch4-11");
say(
  "ch4-11",
  "Marina",
  "Puede que necesitemos informar a tu familia y a otros profesionales para ayudarte. Te explicaré lo que tengamos que hacer y por qué. No vamos a convertir esto en un anuncio delante de tus compañeros.",
  "ch4-12",
);
say("ch4-12", "Sara", "¿Y si quiero denunciar?", "ch4-13");
say(
  "ch4-13",
  "Marina",
  "Podemos ayudarte a conocer los recursos y los pasos para hacerlo. También debemos abordar lo que está ocurriendo aquí, en el centro.",
  "ch4-14",
);
say(
  "ch4-14",
  "Sara",
  "¿Pero denunciar significa que voy a tener que ir a un juicio?",
  "ch4-15",
);
say(
  "ch4-15",
  "Marina",
  "No necesariamente. Hay diferentes actuaciones posibles. Te las voy a explicar para que entiendas qué puede suceder.",
  "ch4-16",
);
say(
  "ch4-16",
  "Sara",
  "Es que tengo miedo de que me pregunten cosas que no sé.",
  "ch4-17",
);
say(
  "ch4-17",
  "Marina",
  "No tienes que saberlo todo. Puedes contar lo que recuerdes y expresar lo que necesites.",
  "needs-menu",
);

card(
  "needs-menu",
  "Apoyos",
  "Hablar con apoyo",
  "Sara puede pedir compañía, explicaciones sencillas o una pausa. También puede preguntar qué medidas de protección ofrece el instituto.",
  "needs-response",
);

say(
  "needs-response",
  "Marina",
  "Vamos a ir paso a paso. Puedes pedir que alguien te acompañe, que te lo expliquen con palabras sencillas, parar cuando lo necesites y solicitar medidas de protección en el centro.",
  "ch4-after",
);
say(
  "ch4-after",
  "Marina",
  "Primero vamos a ordenar lo que sabemos. Después podemos revisar qué ayuda necesitas y qué actuaciones corresponden.",
  "chapter5-card",
);

/* ----------------------------------------------------------------- chapter 5 */

card(
  "chapter5-card",
  null,
  "Capítulo 5",
  "Con Marina. Un paso cada vez.",
  "ch5-1",
);

say(
  "ch5-1",
  "Marina",
  "No tienes que conseguir la foto. Podemos identificar dónde se ha compartido y pedir orientación para comunicarlo de forma segura.",
  "ch5-minigame",
);

card(
  "ch5-minigame",
  "Información útil",
  "Qué información conviene guardar",
  "Guarda conversaciones con comentarios ofensivos, fechas y nombres de usuario; el nombre del grupo o enlace donde se publicó; e información de quienes lo vieron. No hace falta descargar ni reenviar contenido íntimo para pedir ayuda.",
  "ch5-2",
);

say(
  "ch5-2",
  "Marina",
  "Podemos trabajar en varias cosas a la vez: solicitar medidas de protección en el instituto, pedir orientación para denunciar y comunicar el contenido a la plataforma donde se ha difundido.",
  "ch5-3",
);
say("ch5-3", "Sara", "¿Y si no consiguen quitar la foto?", "ch5-4");
say(
  "ch5-4",
  "Marina",
  "No podemos prometer que desaparezca inmediatamente. Pero existen mecanismos para solicitar su retirada y profesionales que pueden ayudarte.",
  "ch5-5",
);
say("ch5-5", "Sara", "¿Quién investiga lo que ha pasado?", "ch5-6");
say(
  "ch5-6",
  "Marina",
  "Depende de los hechos. Si existen indicios de delito, pueden intervenir la Policía y, cuando corresponda por la edad de las personas implicadas, la Fiscalía de Menores.",
  "ch5-7",
);
say("ch5-7", "Sara", "¿Y qué es la Fiscalía de Menores?", "ch5-8");
say(
  "ch5-8",
  "Marina",
  "Investiga los posibles delitos cometidos por adolescentes de 14 a 17 años y también vela por los derechos de los menores.",
  "ch5-9",
);
say(
  "ch5-9",
  "Marina",
  "No todos los casos siguen el mismo procedimiento ni terminan en un juicio. Te explicaré las opciones que correspondan a tu situación.",
  "chapter6-card",
);

/* ----------------------------------------------------------------- chapter 6 */

card(
  "chapter6-card",
  null,
  "Capítulo 6",
  "Días después. Una sala tranquila.",
  "ch6-1",
);

narrate(
  "ch6-1",
  "Días después, Sara se reúne con una profesional de apoyo. Ella le explica para qué es la conversación y que puede pedir una pausa.",
  "ch6-2",
  { scene: "quiet-room", cast: { sara: "neutral" } },
);
say(
  "ch6-2",
  "Profesional",
  "Hola, Sara. ¿Recuerdas cuándo te enteraste de que compartían esa imagen? Si algo no está claro, puedes preguntármelo.",
  "ch6-3",
);
say("ch6-3", "Sara", "Vale.", "decision-6");

choice("decision-6", "¿Cómo responde Sara?", [
  option(
    "precise",
    "«No recuerdo la hora exacta, pero Julia me lo contó el martes por la tarde».",
    "d6-precise",
    { flags: { preciseRecall: true } },
  ),
  option("guess", "«A las seis en punto», aunque no está segura.", "d6-guess", {
    flags: { guessedTime: true },
  }),
  option(
    "repeat",
    "«Estoy nerviosa. ¿Puedes repetirme la pregunta?».",
    "d6-repeat",
    { flags: { askedRepeat: true } },
  ),
], { cast: { sara: "neutral" } });

say(
  "d6-precise",
  "Profesional",
  "Gracias por distinguir lo que recuerdas de lo que no. Eso ayuda.",
  "ch6-4",
);
say(
  "d6-guess",
  "Profesional",
  "No necesitas adivinar datos. Si no estás segura, puedes decirlo.",
  "ch6-4",
);
say(
  "d6-repeat",
  "Profesional",
  "Claro. ¿Recuerdas cuándo te enteraste de que estaban compartiendo esa imagen?",
  "d6-repeat-2",
);
say(
  "d6-repeat-2",
  "Sara",
  "No recuerdo la hora exacta. Julia me lo contó el martes por la tarde.",
  "ch6-4",
);

say("ch6-4", "Profesional", "¿Sabes quién creó la imagen?", "ch6-5");
say("ch6-5", "Sara", "No.", "ch6-6");
say("ch6-6", "Profesional", "¿Y quién la compartió?", "ch6-7");
say(
  "ch6-7",
  "Sara",
  "Vi mensajes de Hugo, pero no sé quién la había enviado antes.",
  "ch6-8",
);
say(
  "ch6-8",
  "Profesional",
  "Está bien. Es importante diferenciar lo que sabes de lo que supones.",
  "ch6-9",
);
say("ch6-9", "Sara", "¿Y ahora qué va a pasar?", "ch6-10");
say(
  "ch6-10",
  "Profesional",
  "Eso dependerá de lo que se averigüe y de las actuaciones que correspondan. Te iremos explicando los siguientes pasos.",
  "ch6-11",
);
say("ch6-11", "Sara", "¿Voy a tener que hablar otra vez de todo esto?", "ch6-12");
say(
  "ch6-12",
  "Profesional",
  "Intentaremos evitar que tengas que repetir innecesariamente lo ocurrido. Existen medidas de protección para menores, y los profesionales valorarán cuáles corresponden en tu situación.",
  "ch6-13",
);
say(
  "ch6-13",
  "Sara",
  "¿Y si mañana tengo que volver a verlos en clase?",
  "ch6-14",
);
say(
  "ch6-14",
  "Profesional",
  "Es importante que lo digas. Tu seguridad y tus preocupaciones deben tenerse en cuenta para valorar las medidas adecuadas.",
  "ch6-15",
);
narrate("ch6-15", "Sara respira más despacio.", "ch6-16");
say(
  "ch6-16",
  "Sara",
  "Pensaba que tenía que saber responder a todo.",
  "ch6-17",
);
say(
  "ch6-17",
  "Profesional",
  "No. Lo importante es que puedas contar lo que recuerdas, hacer preguntas y recibir la ayuda que necesites.",
  "ch6-18",
);
narrate(
  "ch6-18",
  "La pantalla comienza a oscurecerse. Sara todavía no sabe cómo terminará todo. Pero ahora comprende mejor qué está pasando y quién puede ayudarla.",
  "ending-router-forward",
);

/* -------------------------------------------------------------------- endings */

branch(
  "ending-router-forward",
  { flag: "juliaForwarded" },
  "final3-scene",
  "ending-router-help",
);

branch(
  "ending-router-help",
  { any: [{ flag: "helpRoute" }, { flag: "familyRoute" }] },
  "ending-router-julia",
  "ending-router-delay",
);

branch(
  "ending-router-julia",
  { flag: "juliaHelped" },
  "final1-julia-helped",
  "final1-julia-disengaged",
);

narrate(
  "final1-julia-helped",
  "Julia ha evitado seguir difundiendo el contenido y les ha ayudado a identificar dónde solicitar apoyo.",
  "final1-scene",
  { scene: "patio-day", cast: { sara: "neutral" } },
);
narrate(
  "final1-julia-disengaged",
  "Julia no supo cómo actuar al principio, pero Sara encontró apoyo en otras personas.",
  "final1-scene",
  { scene: "patio-day", cast: { sara: "neutral" } },
);

narrate(
  "final1-scene",
  "Sara y Sergio están sentados en un banco del patio.",
  "final1-d1",
);
say("final1-d1", "Sergio", "¿Crees que van a parar?", "final1-d2");
say("final1-d2", "Sara", "No lo sé.", "final1-d3");
say(
  "final1-d3",
  "Sergio",
  "Yo antes pensaba que era mejor no contárselo a nadie.",
  "final1-d4",
);
say("final1-d4", "Sara", "Yo también.", "final1-d5");
say("final1-d5", "Sergio", "¿Entramos?", "final1-d6");
say("final1-d6", "Sara", "Venga.", "final1-d7");
narrate(
  "final1-d7",
  "Ambos se levantan y caminan hacia el edificio.",
  "final1",
);
ending(
  "final1",
  "Final 1",
  "Ya no estamos solos",
  "Pedir ayuda no hace desaparecer todos los problemas, pero permite que no tengas que afrontarlos sin apoyo.",
);

branch(
  "ending-router-delay",
  { flag: "delayedHelp" },
  "final2-scene",
  "final4-scene",
);

narrate(
  "final2-scene",
  "Sara está sentada frente a Marina. Ha tardado en dar el paso, pero por fin está allí.",
  "final2-d1",
  { scene: "orientation-office", cast: { sara: "neutral" } },
);
say("final2-d1", "Sara", "Perdona por no haber venido antes.", "final2-d2");
say("final2-d2", "Marina", "No tienes que disculparte.", "final2-d3");
say(
  "final2-d3",
  "Sara",
  "Es que pensaba que podía solucionarlo sola.",
  "final2-d4",
);
say(
  "final2-d4",
  "Marina",
  "Lo importante es que ahora podemos hablar y ver qué apoyo necesitas.",
  "final2-d5",
);
say("final2-d5", "Sara", "¿Todavía se puede hacer algo?", "final2-d6");
say(
  "final2-d6",
  "Marina",
  "Vamos a revisar lo ocurrido y las opciones disponibles.",
  "final2-d7",
);
narrate("final2-d7", "Sara escucha. Ya no tiene que resolverlo todo a la vez.", "final2");
ending(
  "final2",
  "Final 2",
  "Aún estamos a tiempo",
  "Aunque haya pasado tiempo, puedes pedir ayuda. No necesitas tener todas las respuestas para empezar.",
);

narrate(
  "final3-scene",
  "Julia se acerca a Sara en el patio.",
  "final3-d1",
  { scene: "patio-day", cast: { sara: "neutral" } },
);
say("final3-d1", "Julia", "Tengo que contarte una cosa.", "final3-d2");
say("final3-d2", "Sara", "Dime.", "final3-d3");
say(
  "final3-d3",
  "Julia",
  "Cuando me llegó la imagen, se la pasé a otra persona.",
  "final3-d4",
);
narrate("final3-d4", "Sara guarda silencio.", "final3-d5");
say(
  "final3-d5",
  "Julia",
  "Pensé que así podía averiguar de dónde había salido.",
  "final3-d6",
);
say(
  "final3-d6",
  "Sara",
  "Te pedí que no se la enseñaras a nadie.",
  "final3-d7",
);
say("final3-d7", "Julia", "Ya. Lo siento. Hice mal.", "final3-d8");
say("final3-d8", "Sara", "Ahora hay otra persona que la tiene.", "final3-d9");
say(
  "final3-d9",
  "Julia",
  "Lo sé. Voy a contar lo que hice y pedir ayuda para intentar detenerlo.",
  "final3-d10",
);
say("final3-d10", "Sara", "Necesito tiempo.", "final3-d11");
narrate("final3-d11", "Julia asiente.", "final3");
ending(
  "final3",
  "Final 3",
  "Un reenvío más",
  "Reenviar contenido íntimo sin consentimiento puede causar más daño y tener consecuencias legales. Reconocer un error es importante, pero también lo es dejar de difundir y buscar ayuda para actuar responsablemente.",
);

narrate(
  "final4-scene",
  "Es viernes por la noche. La habitación está a oscuras. Sara está sentada en la cama con el móvil.",
  "final4",
  { scene: "bedroom-evening", cast: { sara: "sad" } },
);
ending(
  "final4",
  "Final 4",
  "El mensaje sin enviar",
  "A veces, pedir ayuda empieza con un mensaje que cuesta mucho escribir. También puedes hablar con una persona de confianza para dar el primer paso. No tienes que afrontar esta situación sin apoyo.",
);

/* --------------------------------------------------------------------- scenes */

const scenes = {
  version: 1,
  stage: { width: 1920, height: 1080, safeArea: 0.9 },
  presets: {
    positions: {
      left: { x: 0.27, y: 1.0, scale: 0.92 },
      center: { x: 0.5, y: 1.0, scale: 1.0 },
      right: { x: 0.73, y: 1.0, scale: 0.92 },
    },
    transitions: {
      cut: { type: "cut" },
      fade: { type: "fade", duration: 400 },
      dissolve: { type: "dissolve", duration: 700 },
    },
  },
  scenes: {},
};

const sceneSpecs = [
  ["hallway-day", "Pasillo del instituto, lunes por la mañana"],
  ["classroom-day", "Aula, miércoles por la mañana"],
  ["bedroom-evening", "Habitación de Sara, martes por la noche"],
  ["patio-day", "Patio del instituto"],
  ["orientation-office", "Departamento de Orientación"],
  ["quiet-room", "Sala tranquila de atención profesional"],
];

for (const [id, label] of sceneSpecs) {
  scenes.scenes[id] = {
    label,
    layers: [
      { id: "bg", type: "image", asset: `backgrounds/${id}`, fit: "cover" },
      {
        id: "sara",
        type: "character",
        asset: "characters/sara",
        expression: "neutral",
        at: "center",
        z: 20,
      },
      {
        id: "vignette",
        type: "effect",
        effect: "vignette",
        opacity: 0.24,
        z: 90,
      },
    ],
  };
}

const manifest = {
  version: 1,
  id: "no-lo-reenvies",
  title: "No lo reenvíes",
  content: {
    story: "story.json",
    assets: "../../shared/assets.json",
    scenes: "scene.json",
    rights: "rights.json",
  },
  stage: { width: 1920, height: 1080 },
  start: { node: "start", scene: "hallway-day" },
  save: { key: "no-lo-reenvies.save", version: 1 },
};

const rights = {
  version: 1,
  title: "Conoce tus derechos",
  intro:
    "Después de cualquiera de los finales, este resumen recuerda lo esencial. No sustituye la orientación de un profesional, pero puede ayudarte a saber por dónde empezar.",
  sections: [
    {
      title: "1. El acoso escolar no debe normalizarse.",
      text: "Los insultos, humillaciones y conductas reiteradas de hostigamiento requieren atención y protección. Dependiendo de los hechos, pueden existir también consecuencias jurídicas.",
    },
    {
      title: "2. Difundir imágenes íntimas sin consentimiento puede ser delito.",
      text: "El hecho de recibir una imagen no autoriza a compartirla. Las consecuencias legales dependen de las características concretas del contenido, su obtención, la difusión y las circunstancias de las personas implicadas.",
    },
    {
      title: "3. Pedir ayuda es un derecho.",
      text: "Los menores pueden comunicar situaciones de violencia a adultos de confianza y a profesionales de protección. También tienen derecho a recibir información adaptada a su edad.",
    },
    {
      title: "4. No necesitas investigarlo todo por tu cuenta.",
      text: "Puedes comunicar los mensajes, las fechas, los perfiles implicados y la información disponible sin redistribuir contenidos íntimos.",
    },
    {
      title: "5. Existen recursos de apoyo.",
      text: "Personas adultas de confianza, profesorado y orientación escolar. El centro educativo cuenta con protocolos de protección que deben activarse cuando se conoce una situación de violencia.",
    },
  ],
  resourcesTitle: "Recursos de apoyo",
  resources: [
    {
      name: "INCIBE 017",
      text: "Orientación en ciberseguridad para menores, familias y centros educativos. Este servicio no presenta una denuncia por ti.",
      url: "https://www.incibe.es/linea-de-ayuda-en-ciberseguridad",
    },
    {
      name: "Canal Prioritario de la AEPD",
      text: "Si el contenido sexual o violento se ha publicado en Internet y existe un riesgo grave, permite solicitar su retirada urgente. No equivale a presentar una denuncia penal.",
      url: "https://www.aepd.es/canalprioritario",
    },
    {
      name: "Policía y Fiscalía de Menores",
      text: "Cuando existan indicios de delito, pueden intervenir la Policía y, según la edad de las personas implicadas, la Fiscalía de Menores.",
    },
    {
      name: "Coordinación de bienestar y protección",
      text: "El centro educativo debe activar sus protocolos y valorar las medidas de protección disponibles.",
    },
  ],
  closing: "Conocer tus derechos es el primer paso para poder ejercerlos.",
};

await mkdir(storyDir, { recursive: true });
await writeFile(
  path.join(storyDir, "story.json"),
  `${JSON.stringify({ version: 1, start: "start", nodes }, null, 2)}\n`,
  "utf8",
);
await writeFile(
  path.join(storyDir, "scene.json"),
  `${JSON.stringify(scenes, null, 2)}\n`,
  "utf8",
);
await writeFile(
  path.join(storyDir, "novel.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
await writeFile(
  path.join(storyDir, "rights.json"),
  `${JSON.stringify(rights, null, 2)}\n`,
  "utf8",
);

console.log(`wrote ${Object.keys(nodes).length} nodes to ${storyDir}`);
