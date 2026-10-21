/**
 * Authoring script for "Dos voces".
 *
 * The story is generated from compact dialogue/choice helpers so the branching
 * graph stays readable and the pedagogical consequence options remain
 * consistent: every risky option names a consequence and a lesson, then
 * continues forward after the warning.
 *
 *   node scripts/build-dos-voces.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MINI_STORY_DIALOGUES } from "./dos-voces-risk-dialogues.mjs";
import { adaptDosVoces } from "./dos-voces-adaptation.mjs";
import { plainLanguage } from "./dos-voces-plain-language.mjs";
import { simplifyDosVoces } from "./dos-voces-simplify.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../public/content/stories/dos-voces");
const nodes = {};

function add(id, node) {
  if (nodes[id]) throw new Error(`Duplicate node id: ${id}`);
  nodes[id] = node;
  return id;
}

function chain(prefix, beats, next) {
  let nextId = next;
  for (let index = beats.length - 1; index >= 0; index -= 1) {
    const beat = beats[index];
    const id = index === 0 ? prefix : `${prefix}-${index + 1}`;
    add(id, {
      type: "dialogue",
      speaker: beat.speaker ?? null,
      text: beat.text,
      next: nextId,
      ...(beat.scene ? { scene: beat.scene } : {}),
      ...(beat.cast ? { cast: beat.cast } : {}),
      ...(beat.tone ? { tone: beat.tone } : {}),
      ...(beat.perspective ? { perspective: beat.perspective } : {}),
      ...(beat.mood ? { mood: beat.mood } : {}),
      ...(beat.flags ? { flags: beat.flags } : {}),
    });
    nextId = id;
  }
  return nextId;
}

const REMOTE_MINI_STORIES = new Set(["c1-s2-risk2", "c2-m4-risk1", "c4-m2-risk2"]);

function choice(id, prompt, options, optionsNode = {}) {
  add(id, {
    type: "choice",
    prompt,
    options,
    ...optionsNode,
  });

  // Every risky option opens a short consequence story. Its last beat is a
  // reconduction trigger: the engine raises a notice and continues forward.
  for (const option of options) {
    if (option.safe !== false) continue;
    const prefix = option.id;
    const reconductionId = `${prefix}-reconduction`;
    const perspective = optionsNode.perspective ?? "maya";

    add(reconductionId, {
      type: "reconduction",
      title: option.lessonTitle ?? "Hay otra forma de hacerlo",
      text: option.consequence,
      lesson: option.lesson,
      returnTo: id,
      ...(optionsNode.scene ? { scene: optionsNode.scene } : {}),
      ...(optionsNode.cast ? { cast: optionsNode.cast } : {}),
      ...(optionsNode.perspective ? { perspective: optionsNode.perspective } : {}),
      ...(optionsNode.mood ? { mood: optionsNode.mood } : {}),
    });

    const exchange = MINI_STORY_DIALOGUES[option.id] ?? pickExchange(perspective, option.id);
    const beats = [
      {
        speaker: null,
        text: option.consequence,
        tone: "narration",
        ...(optionsNode.scene ? { scene: optionsNode.scene } : {}),
        ...(optionsNode.cast ? { cast: optionsNode.cast } : {}),
      },
      ...exchange.map((entry) => {
        const speaker = Array.isArray(entry) ? entry[0] : entry.speaker;
        const text = Array.isArray(entry) ? entry[1] : entry.text;
        const remote = REMOTE_MINI_STORIES.has(option.id);
        return {
          speaker,
          text,
          ...(remote ? { remote: true } : {}),
          ...(!remote && speakerCast(speaker) ? { cast: speakerCast(speaker) } : {}),
        };
      }),
      {
        speaker: null,
        text: pickClosing(perspective, option.id),
        tone: "narration",
      },
    ];

    let nextId = reconductionId;
    for (let index = beats.length - 1; index >= 0; index -= 1) {
      const beat = beats[index];
      const nodeId = `${prefix}-${index + 1}`;
      add(nodeId, {
        type: "dialogue",
        speaker: beat.speaker ?? null,
        text: beat.text,
        next: nextId,
        ...(beat.tone ? { tone: beat.tone } : {}),
        ...(beat.remote ? { remote: true } : {}),
        ...(beat.scene ? { scene: beat.scene } : {}),
        ...(beat.cast ? { cast: beat.cast } : {}),
      });
      nextId = nodeId;
    }

    option.next = nextId;
  }

  return id;
}

function pick(list, key) {
  let hash = 0;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return list[Math.abs(hash) % list.length];
}

function pickExchange(perspective, key) {
  const exchanges = {
    maya: [
      [
        { speaker: "Maya", text: "«No quería que esto pasara», dice en voz baja." },
        { speaker: "Sofi", text: "«¿Estás bien? Te has quedado muy callada.»" },
      ],
      [
        { speaker: "Maya", text: "«Espera. No era lo que quería decir.»" },
        { speaker: "Mamá", text: "«Maya, no es el momento.»" },
      ],
      [
        { speaker: "Lucía", text: "«Maya, respira. Estoy aquí.»" },
        { speaker: "Maya", text: "«Creo que lo he empeorado.»" },
      ],
      [
        { speaker: "Maya", text: "«Lo siento», dice, aunque no sabe muy bien por qué." },
        { speaker: "Sofi", text: "«No tienes que pedir perdón por esto.»" },
      ],
      [
        { speaker: "Mamá", text: "«No sigas por ahí, cariño.»" },
        { speaker: "Maya", text: "«Lo sé. Pero tenía que decirlo.»" },
      ],
    ],
    sofi: [
      [
        { speaker: "Sofi", text: "«Maya, ¿estás bien?»" },
        { speaker: "Maya", text: "«No quiero hablar de esto ahora.»" },
      ],
      [
        { speaker: "Maya", text: "«No se lo cuentes a nadie.»" },
        { speaker: "Sofi", text: "«Vale. Pero no voy a dejarte sola.»" },
      ],
      [
        { speaker: "Compañera", text: "«¿Qué le pasa a Maya?»" },
        { speaker: "Sofi", text: "«No es mi historia que contar.»" },
      ],
      [
        { speaker: "Sofi", text: "«Espera, no quería presionarte.»" },
        { speaker: "Maya", text: "«Necesito un momento.»" },
      ],
      [
        { speaker: "Lucía", text: "«Sofi, ¿quieres contarme qué ha pasado?»" },
        { speaker: "Sofi", text: "«Creo que he metido la pata.»" },
      ],
    ],
    elena: [
      [
        { speaker: "Elena", text: "«Podemos volver a pensarlo sin prisa.»" },
        { speaker: "Maya", text: "«Gracias. Creo que lo necesito.»" },
      ],
    ],
  };
  return pick(exchanges[perspective] ?? exchanges.maya, key);
}

const SPEAKER_IDS = {
  maya: "maya",
  sofi: "sofi",
  lucia: "lucia",
  elena: "elena",
  mama: "madre",
  madre: "madre",
  papa: "padre",
  padre: "padre",
  profesor: "profesor",
  profesora: "profesor",
  companera: "companera",
  companero: "companero",
};

function speakerCast(speaker) {
  const id = String(speaker ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const characterId = SPEAKER_IDS[id];
  return characterId ? { [characterId]: "neutral" } : null;
}

function pickClosing(perspective, key) {
  const lines = {
    maya: [
      "El momento pasa. La casa sigue igual, pero Maya ya sabe que hay algo que no puede cargar sola.",
      "Nadie dice nada durante unos segundos. La decisión sigue delante, esperando otra respuesta.",
      "El silencio se queda un rato más. No borra lo ocurrido, pero deja espacio para elegir de nuevo.",
      "La noche sigue su curso. Maya respira hondo y vuelve a mirar la situación desde el principio.",
    ],
    sofi: [
      "El patio sigue lleno de voces, pero Sofi ya no escucha las mismas cosas que antes.",
      "Sofi se queda un momento en silencio. Todavía puede elegir otra forma de estar cerca.",
      "El timbre suena a lo lejos. La decisión sigue delante, y esta vez Sofi quiere mirarla con más calma.",
      "Sofi apoya la espalda en la pared. No todo está perdido: puede volver a intentarlo de otra manera.",
    ],
    elena: [
      "La clase guarda silencio. Elena espera sin llenar el hueco con una respuesta rápida.",
      "Elena deja la pregunta flotando. A veces la mejor forma de avanzar es volver a escuchar.",
    ],
  };
  return pick(lines[perspective] ?? lines.maya, key);
}

function safe(id, label, next, effects = {}, flags = {}) {
  return {
    id,
    label,
    next,
    ...(Object.keys(effects).length > 0 ? { effects } : {}),
    ...(Object.keys(flags).length > 0 ? { flags } : {}),
  };
}

function risk(id, label, consequence, lesson, lessonTitle) {
  return {
    id,
    label,
    safe: false,
    consequence,
    lesson,
    ...(lessonTitle ? { lessonTitle } : {}),
  };
}

function interstitial(id, kicker, title, text, next, extra = {}) {
  return add(id, {
    type: "interstitial",
    kicker,
    title,
    text,
    next,
    ...extra,
  });
}

function branch(id, when, then, elseNode) {
  return add(id, { type: "branch", when, then, else: elseNode });
}

function whatsapp(id, chatTitle, self, messages, next, extra = {}) {
  return add(id, {
    type: "chat",
    chatTitle,
    self,
    messages,
    next,
    ...extra,
  });
}

/* --------------------------------------------------------------- opening */

interstitial(
  "start",
  "Chavales Legales",
  "Dos voces",
  "Maya tiene 12 años. En casa, las palabras se han vuelto más afiladas. En el colegio, Sofi empieza a notar que algo no encaja.\n\nVas a mirar desde las dos voces. No hay respuestas perfectas: hay formas más seguras de actuar.",
  "modo",
  {
    scene: "home-living-cold",
    perspective: "maya",
    mood: "cold",
    flags: {
      modoAdolescente: false,
      banderas_rojas: 0,
      nivel_seguridad: 0,
      apoyo_emocional: 0,
      confidencialidad: 0,
      errores: 0,
      quizScore: 0,
      quizTotal: 0,
      quizPerfect: false,
    },
  },
);

choice(
  "modo",
  "Antes de empezar, elige cómo quieres que te acompañe esta historia.",
  [
    safe("modo-nino", "Tengo entre 7 y 11 años. Quiero palabras sencillas.", "prologo-nino"),
    safe(
      "modo-teen",
      "Tengo entre 12 y 16 años. Quiero hablar de control, privacidad y consentimiento.",
      "prologo-teen",
      {},
      { modoAdolescente: true },
    ),
  ],
  { perspective: "maya", mood: "cold" },
);

chain(
  "prologo-nino",
  [
    {
      speaker: null,
      text: "A veces, en casa, los mayores discuten y uno de ellos intenta mandar sobre el otro. Eso no es culpa de los hijos. Si algo te da miedo, puedes contarlo a un adulto de confianza. En esta historia, Maya aprenderá a pedir ayuda y Sofi aprenderá a acompañarla.",
      scene: "home-living-cold",
      perspective: "maya",
      mood: "cold",
    },
  ],
  "prologo",
);

chain(
  "prologo-teen",
  [
    {
      speaker: null,
      text: "La violencia no siempre deja marcas. También es control: revisar el móvil, exigir contraseñas, humillar delante de otros o usar una foto para dañar. Maya lo vive en casa. Sofi lo detecta en el colegio. Ninguna de las dos tiene que resolverlo sola.",
      scene: "home-living-cold",
      perspective: "maya",
      mood: "cold",
    },
  ],
  "prologo",
);

chain(
  "prologo",
  [
    {
      speaker: null,
      text: "Lunes, 20:41. Maya está en el salón cuando la voz de su padre sube de tono. Su madre habla bajito, como si cada palabra pudiera romper algo.",
      scene: "home-living-cold",
      cast: { maya: "neutral" },
      perspective: "maya",
      mood: "cold",
    },
    {
      speaker: "Maya",
      text: "«Si me quedo quieta, quizá termine antes. Si me voy, quizá se enfade más. Si grito, quizá me escuche a mí.»",
      tone: "thought",
      cast: { maya: "sad" },
    },
  ],
  "cap1",
);

interstitial(
  "cap1",
  "Capítulo 1",
  "Indicios, control y alarmas",
  "Maya aprende a mirar lo que ocurre sin culparse. Sofi aprende a mirar sin invadir.",
  "cap1-talk",
  { scene: "home-living-cold", perspective: "maya", mood: "cold" },
);

chain(
  "cap1-talk",
  [
    {
      speaker: null,
      text: "La casa huele a comida recalentada. Maya deja la mochila junto a la puerta y se quita los zapatos despacio.",
      scene: "home-living-cold",
      cast: { maya: "neutral" },
    },
    { speaker: "Mamá", text: "«¿Qué tal el día?»" },
    { speaker: "Maya", text: "«Bien. Como siempre.»" },
    { speaker: "Mamá", text: "«Si necesitas algo, estoy en la cocina.»" },
    { speaker: "Maya", text: "«Vale.»" },
  ],
  "c1-m1",
);

choice(
  "c1-m1",
  "El padre da un golpe en la mesa. La madre se queda callada. ¿Qué hace Maya?",
  [
    safe(
      "c1-m1-safe",
      "Esperar a que baje la tensión y acompañar a mamá después, sin ponerse en medio.",
      "c1-m1-ok",
      { nivel_seguridad: { add: 1 }, banderas_rojas: { add: 1 } },
    ),
    risk(
      "c1-m1-risk1",
      "Ponerse delante de papá para que pare.",
      "Maya se interpone. La discusión se dirige ahora hacia ella y el miedo crece. No es su trabajo poner el cuerpo.",
      "Interponerse puede aumentar el riesgo para ti o para la persona que intentas proteger. Busca un momento seguro para acompañar y avisar a un adulto.",
      "Tu cuerpo no es un escudo",
    ),
    risk(
      "c1-m1-risk2",
      "Subir el volumen de los auriculares y pensar que es culpa suya.",
      "La música no tapa los gritos. Maya se queda sola con una culpa que no le corresponde.",
      "La violencia es responsabilidad de quien la ejerce. Aislarte con culpa no te protege: busca una persona segura y ponle palabras a lo que has visto.",
      "La culpa no es tuya",
    ),
  ],
  { cast: { maya: "sad" }, perspective: "maya", mood: "cold" },
);

chain(
  "c1-m1-ok",
  [
    {
      speaker: null,
      text: "Maya espera a que la puerta del despacho se cierre. Entra en la cocina y se sienta al lado de su madre, sin preguntar por qué. Le ofrece un vaso de agua.",
      scene: "home-kitchen-cold",
      cast: { maya: "neutral" },
    },
    {
      speaker: "Mamá",
      text: "«Gracias, cariño. No deberías haber visto eso.»",
      cast: { maya: "sad" },
    },
    {
      speaker: "Maya",
      text: "«No debería, pero lo he visto. Y no puedo hacer como si no.»",
      tone: "thought",
      cast: { maya: "neutral" },
    },
  ],
  "c1-m2",
);

choice(
  "c1-m2",
  "El padre pide las contraseñas del móvil de mamá «para saber que no hay secretos». ¿Qué aconseja Maya?",
  [
    safe(
      "c1-m2-safe",
      "Ayudar a mamá a revisar la privacidad de sus cuentas y anotar lo ocurrido en la libreta.",
      "c1-m2-ok",
      { confidencialidad: { add: 1 }, banderas_rojas: { add: 1 } },
    ),
    risk(
      "c1-m2-risk1",
      "Decirle a mamá que las dé: así habrá paz.",
      "La paz dura una tarde. Al día siguiente, el padre revisa los mensajes de mamá y vuelve a acusarla.",
      "Ceder contraseñas no compra seguridad: amplía el control. La privacidad es un límite, no un secreto que deba demostrarse.",
      "Una contraseña no es una prueba de amor",
    ),
    risk(
      "c1-m2-risk2",
      "Borrar los chats para que no quede nada.",
      "Maya borra conversaciones que podían explicar lo que pasaba. Después siente aún más miedo.",
      "Borrar mensajes puede destruir información útil. Guarda pruebas sin difundirlas y pide ayuda antes de decidir.",
      "Documentar no es difundir",
    ),
  ],
  { cast: { maya: "neutral" }, perspective: "maya", mood: "cold" },
);

chain(
  "c1-m2-ok",
  [
    {
      speaker: null,
      text: "Maya ayuda a mamá a cambiar la contraseña y a activar la verificación en dos pasos. Después escribe en su libreta: «Martes. Papá pidió las claves. Mamá dijo que no.»",
      cast: { maya: "neutral" },
    },
    { speaker: "Mamá", text: "«No sé si esto sirve de algo.»", cast: { maya: "sad" } },
    {
      speaker: "Maya",
      text: "«Sirve para que no pueda entrar. Y si vuelve a pasar, lo contamos.»",
      cast: { maya: "neutral" },
    },
  ],
  "c1-m3",
);

choice(
  "c1-m3",
  "Maya ha empezado una libreta con fechas y frases. ¿Dónde la guarda?",
  [
    safe(
      "c1-m3-safe",
      "En una app protegida con clave, sin compartirla en grupos.",
      "c1-m3-ok",
      { banderas_rojas: { add: 1 }, nivel_seguridad: { add: 1 }, confidencialidad: { add: 1 } },
    ),
    risk(
      "c1-m3-risk1",
      "Dejarla en el escritorio: total, es solo un cuaderno.",
      "El padre encuentra la libreta y la lee. La usa para decir que Maya inventa cosas.",
      "Las pruebas deben guardarse en un lugar protegido. Tenerlas no es traicionar: es cuidar lo que sabes.",
      "Un lugar seguro para tus pruebas",
    ),
    risk(
      "c1-m3-risk2",
      "Romper las notas para que nadie las lea.",
      "Maya se queda sin sus fechas y sin sus palabras. Lo que recuerda se vuelve más difícil de explicar.",
      "Romper las notas no borra lo ocurrido. Puedes guardarlas en un lugar seguro y decidir después con quién compartirlas.",
      "Tus recuerdos también cuentan",
    ),
  ],
  { cast: { maya: "neutral" }, perspective: "maya", mood: "cold" },
);

chain(
  "c1-m3-ok",
  [
    {
      speaker: null,
      text: "Maya guarda la libreta con clave y deja una copia en un sobre cerrado dentro de su mochila. No lo publica ni lo cuenta en el grupo de clase.",
      cast: { maya: "neutral" },
    },
    {
      speaker: "Maya",
      text: "«No es un diario. Es un mapa de lo que está pasando.»",
      tone: "thought",
      cast: { maya: "neutral" },
    },
  ],
  "c1-m4",
);

choice(
  "c1-m4",
  "El sábado, el padre trae flores y sonríe. Dice que «ya está todo arreglado». ¿Qué piensa Maya?",
  [
    safe(
      "c1-m4-safe",
      "Mantener la observación prudente: una sonrisa no borra lo anterior.",
      "c1-m4-ok",
      { banderas_rojas: { add: 1 } },
    ),
    risk(
      "c1-m4-risk1",
      "Creer que la violencia ha terminado y olvidar la libreta.",
      "La calma se rompe el domingo. Maya siente que había empezado a creer una promesa sin hechos.",
      "La calma después de un estallido no confirma que el problema haya terminado. Observa los hechos y mantén tu red de apoyo.",
      "La calma aparente no es una solución",
    ),
    risk(
      "c1-m4-risk2",
      "Reprochar a mamá que disimule y sonría.",
      "Mamá se cierra. Maya descubre que la culpa no abre conversaciones.",
      "La persona que sufre violencia no necesita reproches. Necesita información, tiempo y una red que no la juzgue.",
      "Acompañar sin juzgar",
    ),
  ],
  { cast: { maya: "neutral" }, perspective: "maya", mood: "cold" },
);

chain(
  "c1-m4-ok",
  [
    {
      speaker: null,
      text: "Maya acepta el helado y no discute. Pero esa noche escribe: «Sábado. Flores. Domingo volvió a gritar.»",
      cast: { maya: "neutral" },
    },
    {
      speaker: "Maya",
      text: "«No voy a confundir una tregua con una solución.»",
      tone: "thought",
      cast: { maya: "neutral" },
    },
  ],
  "persp-sofi-1",
);

interstitial(
  "persp-sofi-1",
  "Perspectiva de Sofi",
  "El colegio",
  "Sofi ve a Maya cada mañana. Hoy nota algo distinto.",
  "persp-sofi-1-talk",
  { scene: "hallway-day", perspective: "sofi", mood: "warm" },
);


chain(
  "persp-sofi-1-talk",
  [
    {
      speaker: null,
      text: "Sofi ve a Maya entrar en el patio con la mirada baja. Se acerca sin correr.",
      scene: "patio-day",
      cast: { sofi: "neutral" },
    },
    { speaker: "Sofi", text: "«Hoy no te has sentado con nadie.»" },
    { speaker: "Maya", text: "«No tenía ganas.»" },
    { speaker: "Sofi", text: "«Vale. ¿Te sientas conmigo?»" },
  ],
  "c1-s1",
);
choice(
  "c1-s1",
  "Maya llega tarde, con el pelo sin peinar y la mirada perdida. ¿Qué hace Sofi?",
  [
    safe(
      "c1-s1-safe",
      "Acercarse con afecto y preguntarle a solas, sin presión.",
      "c1-s1-ok",
      { apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c1-s1-risk1",
      "Ignorar los cambios: seguramente esté cansada.",
      "Pasan los días. Maya se sienta cada vez más sola y Sofi pierde una oportunidad de estar cerca.",
      "Notar un cambio no obliga a resolverlo, pero ignorarlo deja sola a la persona. Un saludo tranquilo puede abrir una puerta.",
      "Mirar también es acompañar",
    ),
    risk(
      "c1-s1-risk2",
      "Preguntarle a gritos delante de toda la clase.",
      "Maya se pone roja. Todos miran. Sofi quería ayudar, pero la ha expuesto.",
      "La privacidad también protege. Busca un lugar tranquilo y pregunta sin público.",
      "La ayuda no necesita público",
    ),
  ],
  { cast: { sofi: "neutral" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c1-s1-ok",
  [
    {
      speaker: null,
      text: "Sofi se sienta a su lado en el patio, sin mirarla demasiado. Le ofrece la mitad de su bocadillo.",
      scene: "patio-day",
      cast: { sofi: "smile" },
    },
    { speaker: "Maya", text: "«Estoy bien. Solo he dormido mal.»", cast: { sofi: "neutral" } },
    {
      speaker: "Sofi",
      text: "«Vale. Si algún día no estás bien, no hace falta que lo cuentes todo. Yo estoy aquí.»",
      cast: { sofi: "smile" },
    },
  ],
  "c1-s2",
);

choice(
  "c1-s2",
  "Esa noche, Sofi llama a Maya. Al fondo se oyen gritos. ¿Qué hace?",
  [
    safe(
      "c1-s2-safe",
      "Validar lo que oye y ofrecerle un mensaje tranquilo: «No estás sola. ¿Quieres que mañana hablemos con Lucía?»",
      "c1-s2-ok",
      { apoyo_emocional: { add: 1 }, banderas_rojas: { add: 1 } },
    ),
    risk(
      "c1-s2-risk1",
      "Enviarle veinte mensajes seguidos para que conteste ya.",
      "Maya se bloquea. Siente que tiene que calmar a Sofi además de sobrevivir a la noche.",
      "La urgencia de quien ayuda no debe convertirse en otra carga. Ofrece presencia y deja espacio para que la otra persona responda.",
      "Tu prisa también puede pesar",
    ),
    risk(
      "c1-s2-risk2",
      "Llamar a casa de Maya para encarar al padre.",
      "El padre contesta y la conversación se vuelve una amenaza. Sofi ha puesto a Maya en más riesgo.",
      "No confrontes a la persona que ejerce violencia sin apoyo profesional. Avisa a un adulto del centro o a una línea de ayuda.",
      "No confrontes en solitario",
    ),
  ],
  { cast: { sofi: "sad" }, perspective: "sofi", mood: "tense" },
);

chain(
  "c1-s2-ok",
  [
    {
      speaker: "Sofi",
      text: "«Te he oído. No voy a hacer nada que te ponga en peligro. Mañana, si quieres, vamos juntas a ver a Lucía.»",
      cast: { sofi: "neutral" },
    },
    { speaker: "Maya", text: "«Mañana no sé si podré.»", cast: { sofi: "sad" } },
    {
      speaker: "Sofi",
      text: "«No hace falta que lo decidas esta noche. Yo no me voy.»",
      cast: { sofi: "neutral" },
    },
  ],
  "c1-s3",
);

choice(
  "c1-s3",
  "En clase, Maya no entrega la tarea y el profesor la llama la atención. ¿Qué hace Sofi?",
  [
    safe(
      "c1-s3-safe",
      "Esperar al timbre y hablar con el profesor en privado.",
      "c1-s3-ok",
      { apoyo_emocional: { add: 1 }, nivel_seguridad: { add: 1 } },
    ),
    risk(
      "c1-s3-risk1",
      "Gritar al profesor que no es justo y que Maya tiene problemas.",
      "La clase se gira hacia Maya. El profesor se pone a la defensiva y nadie escucha lo importante.",
      "Defender a alguien no exige exponer su intimidad. Habla en privado y pide medidas concretas, sin contar más de lo necesario.",
      "Defender sin exponer",
    ),
    risk(
      "c1-s3-risk2",
      "No hacer nada: es un problema de Maya.",
      "Maya se queda sola también en el aula. El silencio del entorno hace que el aislamiento crezca.",
      "El silencio no es neutral. Puedes acompañar sin resolverlo todo: sentarte cerca, avisar a un adulto o preguntar qué necesita.",
      "El silencio también deja huella",
    ),
  ],
  { cast: { sofi: "neutral" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c1-s3-ok",
  [
    {
      speaker: null,
      text: "Al sonar el timbre, Sofi explica al profesor que Maya ha tenido una semana difícil y que quizá necesita hablar con Lucía. No cuenta detalles.",
      cast: { sofi: "neutral" },
    },
    { speaker: "Profesor", text: "«Gracias por decírmelo. Lo tendré en cuenta.»", cast: { sofi: "smile" } },
    {
      speaker: "Sofi",
      text: "«No he contado su historia. Solo he abierto una puerta.»",
      tone: "thought",
      cast: { sofi: "neutral" },
    },
  ],
  "c1-s4",
);

choice(
  "c1-s4",
  "Sofi quiere pasar el sábado con Maya. ¿Qué le propone?",
  [
    safe(
      "c1-s4-safe",
      "Estudiar en la biblioteca o dar una vuelta por el parque.",
      "c1-s4-ok",
      { apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c1-s4-risk1",
      "Insistir en ir a su casa a jugar.",
      "Maya inventa una excusa. No puede decir que en casa no se siente segura.",
      "Insistir en entrar en un espacio que no controla puede aumentar la presión. Propón un lugar neutral y deja que decida.",
      "Un lugar neutral también es refugio",
    ),
    risk(
      "c1-s4-risk2",
      "Dejar de invitarla para no molestar.",
      "Maya interpreta el silencio como abandono. Sofi desaparece justo cuando más falta hacía.",
      "Retirarte sin explicación puede doler. Puedes poner límites y seguir ofreciendo compañía de otra forma.",
      "Poner límites no es desaparecer",
    ),
  ],
  { cast: { sofi: "smile" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c1-s4-ok",
  [
    { speaker: "Sofi", text: "«Podemos estudiar en la biblioteca y luego dar una vuelta. Sin planes raros.»", cast: { sofi: "smile" } },
    { speaker: "Maya", text: "«Me gustaría.»", cast: { sofi: "happy" } },
    { speaker: "Sofi", text: "«Entonces quedamos. Y si cambias de idea, me lo dices.»", cast: { sofi: "smile" } },
  ],
  "cap2",
);

/* -------------------------------------------------------------- chapter 2 */

interstitial(
  "cap2",
  "Capítulo 2",
  "El dilema de la confesión",
  "Maya decide cuánto contar. Sofi decide qué hacer con una promesa que pesa demasiado.",
  "c2-edad-router",
  { scene: "home-living-cold", perspective: "maya", mood: "cold" },
);

branch("c2-edad-router", { flag: "modoAdolescente" }, "c2-teen", "c2-child");

chain(
  "c2-teen",
  [
    {
      speaker: null,
      text: "Para Maya, contar lo de casa también es hablar de algo que le da vergüenza: un vídeo manipulado con su cara circula en el grupo de clase. Alguien ha usado su imagen para burlarse de ella. No sabe si eso es violencia o solo una broma pesada.",
      scene: "home-living-cold",
      cast: { maya: "sad" },
    },
    { speaker: "Sofi", text: "«¿Ese vídeo es tuyo?»", cast: { sofi: "neutral" } },
    { speaker: "Maya", text: "«No. Alguien lo ha hecho con mi cara.»", cast: { maya: "sad" } },
    { speaker: "Sofi", text: "«Entonces no tienes que demostrar nada. Vamos a guardar pruebas.»", cast: { sofi: "neutral" } },
  ],
  "c2-m1",
);

chain(
  "c2-child",
  [
    {
      speaker: null,
      text: "Maya tiene dos secretos. Uno es lo que pasa en casa. El otro es una foto fea que alguien ha hecho con su cara y ha compartido. Los dos le pesan en el pecho. Y los dos son secretos que duelen.",
      scene: "home-living-cold",
      cast: { maya: "sad" },
    },
    { speaker: "Sofi", text: "«¿Estás triste por algo?»", cast: { sofi: "neutral" } },
    { speaker: "Maya", text: "«Hay una foto fea. Y cosas en casa. No sé cómo decirlo.»", cast: { maya: "sad" } },
    { speaker: "Sofi", text: "«Puedes decirlo poco a poco. Yo no me voy.»", cast: { sofi: "neutral" } },
  ],
  "c2-m1",
);

choice(
  "c2-m1",
  "Sofi le pregunta qué le pasa. Maya siente que si habla, todo se rompe. ¿Qué hace?",
  [
    safe(
      "c2-m1-safe",
      "Pedir ayuda con franqueza, sin contarlo todo de golpe.",
      "c2-m1-ok",
      { nivel_seguridad: { add: 1 }, apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c2-m1-risk1",
      "Exigir a Sofi un pacto de silencio: «si lo cuentas, dejo de hablarte».",
      "Sofi acepta con miedo. La promesa la deja sola con una información que no puede manejar.",
      "Los pactos de silencio aíslan a las dos personas. Puedes pedir confidencialidad y, a la vez, permitir que un adulto de confianza ayude.",
      "Un secreto que pesa no es lealtad",
    ),
    risk(
      "c2-m1-risk2",
      "Decir que «solo fue una discusión», para que no se preocupe.",
      "Sofi se queda tranquila. Maya sigue sola con el miedo y la vergüenza.",
      "Minimizar no protege a nadie. Puedes decir «no quiero contarlo todo todavía» sin negar lo que está pasando.",
      "No tienes que contarlo todo",
    ),
  ],
  { cast: { maya: "sad" }, perspective: "maya", mood: "cold" },
);

chain(
  "c2-m1-ok",
  [
    {
      speaker: "Maya",
      text: "«En casa hay gritos. Y hay algo más. Un vídeo con mi cara. No sé cómo contarlo sin que se rompa todo.»",
      cast: { maya: "sad" },
    },
    {
      speaker: "Sofi",
      text: "«No tienes que contarlo todo hoy. Podemos ir paso a paso. ¿Quieres que te acompañe a hablar con Lucía?»",
      cast: { sofi: "neutral" },
    },
    { speaker: "Maya", text: "«Sí. Pero primero necesito guardar pruebas.»", cast: { maya: "neutral" } },
  ],
  "c2-whatsapp",
);

whatsapp(
  "c2-whatsapp",
  "4.º B · grupo de clase",
  "Maya",
  [
    { from: "Hugo", text: "chicas habéis visto la foto de Maya??", time: "17:42" },
    { from: "Dani", text: "qué foto", time: "17:42" },
    { from: "Hugo", text: "la que ha subido el nuevo", time: "17:43" },
    { from: "Maya", text: "¿qué foto?", time: "17:43" },
    { from: "Sistema", text: "Hugo ha enviado una imagen.", time: "17:44", system: true },
    { from: "Hugo", text: "Imagen censurada", time: "17:44", hidden: true },
    { from: "Dani", text: "no puede ser real JAJA", time: "17:44" },
    { from: "Sofi", text: "no os riáis. eso no es ella.", time: "17:45" },
    { from: "Hugo", text: "tranquila que solo es una broma", time: "17:45" },
    { from: "Sistema", text: "Varios mensajes nuevos", time: "17:46", system: true },
    { from: "Maya", text: "borrad eso por favor", time: "17:46" },
    { from: "Dani", text: "ya lo ha visto todo el mundo", time: "17:47" },
  ],
  "c2-m2",
  {
    scene: "home-living-cold",
    cast: { maya: "sad" },
    perspective: "maya",
    mood: "tense",
  },
);

choice(
  "c2-m2",
  "En el grupo de clase circula una imagen manipulada de Maya. ¿Qué hace?",
  [
    safe(
      "c2-m2-safe",
      "Hacer una captura con fecha y hora, reportar la cuenta y no reenviar la imagen.",
      "c2-m2-ok",
      { banderas_rojas: { add: 1 }, nivel_seguridad: { add: 1 }, confidencialidad: { add: 1 } },
    ),
    risk(
      "c2-m2-risk1",
      "Borrar la imagen rápidamente por vergüenza.",
      "La imagen sigue en otros móviles. Maya se queda sin una prueba de lo que ha pasado.",
      "Borrar no hace desaparecer lo que ya se ha compartido. Guarda una captura sin difundirla y pide ayuda para reportar.",
      "Borrar no detiene la difusión",
    ),
    risk(
      "c2-m2-risk2",
      "Amenazar a los acosadores en el chat.",
      "El grupo se ríe más. Ahora tienen una excusa para decir que Maya también insulta.",
      "Responder con amenazas puede aumentar el conflicto y ponerte en una posición difícil. Bloquea, reporta y documenta.",
      "No entres al juego de la amenaza",
    ),
  ],
  { cast: { maya: "sad" }, perspective: "maya", mood: "tense" },
);

chain(
  "c2-m2-ok",
  [
    {
      speaker: null,
      text: "Maya hace una captura de la publicación, apunta la cuenta y la fecha. No reenvía la imagen. Después la guarda en la misma carpeta protegida de su libreta.",
      cast: { maya: "neutral" },
    },
    { speaker: "Sofi", text: "«Eso no es difundir. Es documentar. Ahora vamos a contarlo.»", cast: { sofi: "neutral" } },
    {
      speaker: "Maya",
      text: "«La imagen no me define. La prueba me devuelve un poco de control.»",
      tone: "thought",
      cast: { maya: "neutral" },
    },
  ],
  "c2-m3",
);

choice(
  "c2-m3",
  "Maya no quiere volver a casa. ¿Dónde busca ayuda?",
  [
    safe(
      "c2-m3-safe",
      "Acudir a dirección junto a Sofi y pedir hablar con Lucía.",
      "c2-m3-ok",
      { nivel_seguridad: { add: 1 }, apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c2-m3-risk1",
      "Escaparse sola sin decir a nadie dónde va.",
      "Maya se aleja del centro y se queda sin un adulto que pueda ayudarla. El miedo decide por ella.",
      "Huir sin avisar puede aumentar el peligro. Si necesitas salir de una situación, busca un lugar seguro y avisa a alguien de confianza.",
      "Un lugar seguro y una persona avisada",
    ),
    risk(
      "c2-m3-risk2",
      "Esconderse en los baños a oscuras hasta que cierren.",
      "El centro se vacía. Maya sigue sola y nadie sabe que necesita ayuda.",
      "Esconderse no es lo mismo que protegerse. Pide a una persona de confianza que se quede contigo y avise al equipo de orientación.",
      "Protegerse es pedir compañía",
    ),
  ],
  { cast: { maya: "sad" }, perspective: "maya", mood: "tense" },
);

chain(
  "c2-m3-ok",
  [
    {
      speaker: null,
      text: "Sofi coge la mano de Maya y la acompaña a dirección. No la suelta hasta que Lucía abre la puerta.",
      scene: "orientation-office",
      cast: { sofi: "neutral" },
    },
    {
      speaker: "Lucía",
      text: "«Estoy aquí. No tienes que tenerlo todo claro. Vamos a escucharte con calma.»",
      cast: { lucia: "smile" },
    },
    {
      speaker: "Maya",
      text: "«Hay una foto. Y hay gritos en casa. No sé cómo empezar.»",
      cast: { maya: "sad" },
    },
  ],
  "c2-m4-whatsapp",
);

whatsapp(
  "c2-m4-whatsapp",
  "Papá",
  "Maya",
  [
    { from: "Papá", text: "Maya, contéstame.", time: "21:03" },
    { from: "Papá", text: "Sé que has hablado con alguien.", time: "21:04" },
    { from: "Papá", text: "Si cuentas algo, tu madre lo va a pasar peor.", time: "21:04" },
    { from: "Papá", text: "Piénsalo.", time: "21:05" },
    { from: "Maya", text: "...", time: "21:06" },
    { from: "Sistema", text: "Maya no ha respondido.", time: "21:07", system: true },
  ],
  "c2-m4",
  {
    scene: "home-living-cold",
    cast: { maya: "sad" },
    perspective: "maya",
    mood: "tense",
  },
);

choice(
  "c2-m4",
  "El padre envía un mensaje: «Si cuentas algo, tu madre lo va a pasar peor». ¿Qué hace Maya?",
  [
    safe(
      "c2-m4-safe",
      "No responder, guardar el mensaje y mostrárselo a Lucía.",
      "c2-m4-ok",
      { nivel_seguridad: { add: 1 }, banderas_rojas: { add: 1 }, confidencialidad: { add: 1 } },
    ),
    risk(
      "c2-m4-risk1",
      "Responder para defender a mamá.",
      "El padre usa la respuesta para seguir discutiendo. Maya entra en un juego que no puede ganar.",
      "No tienes que responder a una amenaza para demostrar que quieres a tu madre. Guarda el mensaje y compártelo con un adulto de confianza.",
      "No respondas al chantaje",
    ),
    risk(
      "c2-m4-risk2",
      "Borrar los mensajes para que no los vea nadie.",
      "Maya borra una prueba de la presión que está sufriendo. Después se pregunta si lo habrá imaginado.",
      "Los mensajes que dan miedo también son importantes. No los borres: guárdalos en un lugar seguro y pide ayuda.",
      "El miedo también deja pruebas",
    ),
  ],
  { cast: { maya: "sad" }, perspective: "maya", mood: "tense" },
);

chain(
  "c2-m4-ok",
  [
    {
      speaker: null,
      text: "Maya no contesta. Hace una captura del mensaje y se lo enseña a Lucía, que lo guarda con la misma calma con la que apunta una fecha.",
      cast: { maya: "neutral" },
    },
    { speaker: "Lucía", text: "«Esto no es tu culpa. Y no tienes que cargarlo sola.»", cast: { lucia: "neutral" } },
    {
      speaker: "Maya",
      text: "«No contestar también es una forma de decir que no.»",
      tone: "thought",
      cast: { maya: "neutral" },
    },
  ],
  "persp-sofi-2",
);

interstitial(
  "persp-sofi-2",
  "Perspectiva de Sofi",
  "La promesa",
  "Sofi sabe más de lo que puede guardar. Y no quiere traicionar a su amiga.",
  "persp-sofi-2-talk",
  { scene: "classroom-day", perspective: "sofi", mood: "warm" },
);


chain(
  "persp-sofi-2-talk",
  [
    {
      speaker: null,
      text: "Maya le ha pedido a Sofi que guarde un secreto. Sofi lo lleva en la mochila como si pesara.",
      scene: "classroom-day",
      cast: { sofi: "sad" },
    },
    { speaker: "Sofi", text: "«No sé si puedo guardarlo sin hacer nada.»" },
    { speaker: "Maya", text: "«Solo necesito que no se lo cuentes a nadie.»" },
    { speaker: "Sofi", text: "«Vale. Pero si un día no puedo, te lo digo antes de hacer nada.»" },
  ],
  "c2-s1",
);
choice(
  "c2-s1",
  "Maya le pide a Sofi que no cuente nada. ¿Qué hace Sofi?",
  [
    safe(
      "c2-s1-safe",
      "Acompañarla a dirección y acordar juntas qué parte se puede compartir para protegerla.",
      "c2-s1-ok",
      { apoyo_emocional: { add: 2 } },
    ),
    risk(
      "c2-s1-risk1",
      "Guardar el secreto por lealtad, sin contárselo a ningún adulto.",
      "Pasan las semanas. Sofi se siente mal por no hacer nada y Maya sigue en peligro.",
      "La lealtad no puede significar dejar a una amiga sin protección. Puedes mantener su confianza y, a la vez, buscar ayuda con ella.",
      "La lealtad también protege",
    ),
    risk(
      "c2-s1-risk2",
      "Contarlo en el grupo de clase para pedir consejo.",
      "Los detalles se convierten en cotilleo. Maya se entera de que su historia circula sin su permiso.",
      "Pedir consejo no requiere contar la intimidad de otra persona. Habla con un adulto o con una línea de ayuda, no con un grupo.",
      "Pedir ayuda sin cotillear",
    ),
  ],
  { cast: { sofi: "sad" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c2-s1-ok",
  [
    {
      speaker: "Sofi",
      text: "«No voy a contar tu historia a tus espaldas. Pero no puedo quedarme quieta si estás en peligro. ¿Vamos juntas y decides qué decir?»",
      cast: { sofi: "neutral" },
    },
    { speaker: "Maya", text: "«¿Y si me odias por esto?»", cast: { maya: "sad" } },
    { speaker: "Sofi", text: "«No te odio. Estoy contigo incluso cuando me das miedo.»", cast: { sofi: "smile" } },
  ],
  "c2-s2",
);

choice(
  "c2-s2",
  "Alguien reenvía la imagen manipulada a más gente. ¿Qué hace Sofi?",
  [
    safe(
      "c2-s2-safe",
      "Reportar la cuenta, avisar a Lucía y pedir que no se reenvíe.",
      "c2-s2-ok",
      { apoyo_emocional: { add: 1 }, confidencialidad: { add: 1 } },
    ),
    risk(
      "c2-s2-risk1",
      "Reenviarla a otras amigas preguntando si es verdad.",
      "La imagen llega a más móviles. Sofi quería comprobar, pero ha ayudado a difundirla.",
      "Reenviar para preguntar es difundir. No necesitas compartir el contenido para verificar que está mal.",
      "Preguntar no exige reenviar",
    ),
    risk(
      "c2-s2-risk2",
      "Pelearse físicamente con quien se ríe de Maya.",
      "Sofi termina castigada y la imagen sigue circulando. La pelea no protege a Maya.",
      "La violencia no desactiva la violencia. Reporta, documenta y busca a un adulto que pueda intervenir.",
      "La pelea no protege",
    ),
  ],
  { cast: { sofi: "surprised" }, perspective: "sofi", mood: "tense" },
);

chain(
  "c2-s2-ok",
  [
    {
      speaker: null,
      text: "Sofi reporta la cuenta y escribe a Lucía: «Hay una imagen manipulada de Maya circulando. No la he reenviado. ¿Qué hacemos?»",
      cast: { sofi: "neutral" },
    },
    { speaker: "Lucía", text: "«Gracias por no difundirla. Actuamos desde el centro y respetamos la privacidad de Maya.»", cast: { lucia: "neutral" } },
    { speaker: "Sofi", text: "«Proteger también es no compartir.»", tone: "thought", cast: { sofi: "neutral" } },
  ],
  "c2-s3",
);

choice(
  "c2-s3",
  "Maya se queda paralizada antes de entrar en orientación. ¿Qué hace Sofi?",
  [
    safe(
      "c2-s3-safe",
      "Cogerle la mano y entrar juntas, sin obligarla a hablar.",
      "c2-s3-ok",
      { apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c2-s3-risk1",
      "Dejarla marchar porque parece que no quiere.",
      "Maya se va sola. La puerta de orientación se cierra y el miedo gana espacio.",
      "El silencio o la parálisis no siempre significan «déjame». Puedes ofrecer compañía sin forzar y preguntar qué necesita.",
      "La parálisis no es un no",
    ),
    risk(
      "c2-s3-risk2",
      "Empujarla a la fuerza al despacho.",
      "Maya se siente atrapada. La ayuda se parece demasiado a una orden.",
      "Acompañar no es empujar. La persona debe poder decidir cómo y cuándo contar su historia.",
      "Acompañar no es empujar",
    ),
  ],
  { cast: { sofi: "neutral" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c2-s3-ok",
  [
    {
      speaker: null,
      text: "Sofi no dice nada. Solo le coge la mano y espera. Cuando Maya asiente, llaman juntas a la puerta.",
      scene: "orientation-office",
      cast: { sofi: "neutral" },
    },
    { speaker: "Lucía", text: "«Pasad. Aquí no hay prisa.»", cast: { lucia: "smile" } },
    { speaker: "Maya", text: "«Creo que necesito ayuda.»", cast: { maya: "neutral" } },
  ],
  "cap3",
);

/* -------------------------------------------------------------- chapter 3 */

interstitial(
  "cap3",
  "Capítulo 3",
  "El mapa de los canales oficiales",
  "Pedir ayuda tiene nombres, números y personas. Maya y Sofi descubren que no están solas.",
  "cap3-talk",
  { scene: "home-kitchen-cold", perspective: "maya", mood: "tense" },
);

chain(
  "cap3-talk",
  [
    {
      speaker: null,
      text: "Maya está en la cocina con el móvil en la mano. La pantalla de Lucía sigue abierta.",
      scene: "home-kitchen-cold",
      cast: { maya: "neutral" },
    },
    { speaker: "Mamá", text: "«Lucía ha llamado. Dice que si quieres, puedes hablar con ella.»" },
    { speaker: "Maya", text: "«¿Le has contado algo?»" },
    { speaker: "Mamá", text: "«Solo que no estabas bien. Nada más.»" },
    { speaker: "Maya", text: "«Vale. Creo que voy a llamar.»" },
  ],
  "c3-m1",
);

choice(
  "c3-m1",
  "Lucía le da a Maya el número 116 111. Maya duda. ¿Qué hace?",
  [
    safe(
      "c3-m1-safe",
      "Llamar y narrar los hechos apuntados en su libreta, sin inventar nada.",
      "c3-m1-ok",
      { nivel_seguridad: { add: 1 }, banderas_rojas: { add: 1 } },
    ),
    risk(
      "c3-m1-risk1",
      "Colgar por miedo a que salga en la factura del teléfono.",
      "Maya se queda con el teléfono en la mano. El miedo a una consecuencia inventada le impide pedir ayuda.",
      "Las líneas de ayuda a la infancia son gratuitas y confidenciales. No aparecen en la factura como una llamada cualquiera ni te obligan a dar tu nombre.",
      "Las líneas de ayuda son gratuitas",
    ),
    risk(
      "c3-m1-risk2",
      "Inventar datos para que la atiendan más rápido.",
      "La persona que atiende necesita entender lo que pasa. Los datos inventados dificultan la ayuda real.",
      "No necesitas exagerar ni inventar. Cuenta lo que sabes, con tus palabras y con las fechas que recuerdes.",
      "Tu relato ya es suficiente",
    ),
  ],
  { cast: { maya: "neutral" }, perspective: "maya", mood: "tense" },
);

chain(
  "c3-m1-ok",
  [
    {
      speaker: null,
      text: "Maya llama. Le tiembla la voz. Lee su libreta: «Martes, gritos. Jueves, contraseñas. Sábado, flores. Domingo, otra vez.»",
      cast: { maya: "sad" },
    },
    { speaker: "Línea 116 111", text: "«Gracias por llamar. No estás sola. Vamos a pensar juntas los siguientes pasos.»", cast: { maya: "neutral" } },
    { speaker: "Maya", text: "«No me han dicho que exagero. Me han escuchado.»", tone: "thought", cast: { maya: "neutral" } },
  ],
  "c3-m2",
);

choice(
  "c3-m2",
  "El tío de Maya le dice: «No arruines a la familia. Retira lo que has contado.» ¿Qué hace?",
  [
    safe(
      "c3-m2-safe",
      "Informar a Lucía sobre la presión y seguir el plan de protección.",
      "c3-m2-ok",
      { nivel_seguridad: { add: 1 }, apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c3-m2-risk1",
      "Ceder a la amenaza y cancelar la ayuda.",
      "La presión familiar gana tiempo. Maya vuelve a quedarse sin protección.",
      "Proteger a la familia no es ocultar violencia. Puedes querer a tu familia y, a la vez, pedir que se detenga el daño.",
      "Querer no es callar",
    ),
    risk(
      "c3-m2-risk2",
      "Insultar al tío y colgar.",
      "La conversación se rompe. Maya se queda con rabia y sin un adulto que interceda.",
      "La rabia es comprensible, pero no tiene que convertirse en tu única herramienta. Cuéntale la presión a una persona profesional.",
      "La rabia necesita un cauce seguro",
    ),
  ],
  { cast: { maya: "surprised" }, perspective: "maya", mood: "tense" },
);

chain(
  "c3-m2-ok",
  [
    {
      speaker: null,
      text: "Maya le cuenta a Lucía lo que ha dicho su tío. Lucía lo apunta y le explica que la presión familiar también es algo que el equipo debe conocer.",
      cast: { maya: "neutral" },
    },
    { speaker: "Lucía", text: "«No tienes que convencer a tu familia de que te crea. Nosotras te creemos.»", cast: { lucia: "neutral" } },
    { speaker: "Maya", text: "«No estoy traicionando a nadie por decir la verdad.»", tone: "thought", cast: { maya: "neutral" } },
  ],
  "c3-m3",
);

choice(
  "c3-m3",
  "En la entrevista con Servicios Sociales, Maya teme que la separen de su madre. ¿Qué hace?",
  [
    safe(
      "c3-m3-safe",
      "Expresar sus dudas y preguntar qué va a pasar con ella y con su madre.",
      "c3-m3-ok",
      { nivel_seguridad: { add: 1 }, apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c3-m3-risk1",
      "Retractarse de todo para que no la lleven a un centro.",
      "Maya se calla lo que sabe. La protección se detiene y el miedo sigue en casa.",
      "Puedes preguntar qué va a pasar antes de contar más. La protección de menores busca seguridad, no castigar a la víctima.",
      "Preguntar también es un derecho",
    ),
    risk(
      "c3-m3-risk2",
      "Huir de casa con su madre por su cuenta.",
      "Madre e hija se quedan sin un lugar seguro y sin apoyo profesional. El aislamiento crece.",
      "Huir sin un plan puede aumentar el riesgo. Los recursos de acogida existen para que podáis estar juntas y protegidas.",
      "Un plan seguro es mejor que una huida",
    ),
  ],
  { cast: { maya: "sad" }, perspective: "maya", mood: "tense" },
);

chain(
  "c3-m3-ok",
  [
    { speaker: "Maya", text: "«¿Mi madre y yo vamos a estar juntas? ¿Qué pasa si él vuelve?»", cast: { maya: "sad" } },
    { speaker: "Trabajadora social", text: "«Esas son buenas preguntas. Vamos a explicarte cada paso y a buscar un recurso donde podáis estar juntas y seguras.»", cast: { maya: "sad" } },
    { speaker: "Maya", text: "«Entonces quiero contarlo. Pero quiero entenderlo.»", cast: { maya: "neutral" } },
  ],
  "persp-sofi-3",
);

interstitial(
  "persp-sofi-3",
  "Perspectiva de Sofi",
  "Información sin ruido",
  "Sofi quiere ayudar, pero no todo lo que encuentra en internet sirve.",
  "persp-sofi-3-talk",
  { scene: "orientation-office", perspective: "sofi", mood: "warm" },
);


chain(
  "persp-sofi-3-talk",
  [
    {
      speaker: null,
      text: "Sofi abre tres pestañas a la vez. Todas dicen cosas distintas.",
      scene: "orientation-office",
      cast: { sofi: "neutral" },
    },
    { speaker: "Sofi", text: "«Hay demasiadas páginas. No sé cuál es de verdad.»" },
    { speaker: "Lucía", text: "«Empieza por las oficiales. Y no compartas nada sin hablarlo.»" },
    { speaker: "Sofi", text: "«Vale. Primero pregunto.»" },
  ],
  "c3-s1",
);
choice(
  "c3-s1",
  "Sofi busca cómo ayudar a Maya. ¿Dónde busca?",
  [
    safe(
      "c3-s1-safe",
      "En la web oficial de ayuda a la infancia y en los recursos que le ha dado Lucía.",
      "c3-s1-ok",
      { banderas_rojas: { add: 1 }, confidencialidad: { add: 1 } },
    ),
    risk(
      "c3-s1-risk1",
      "Publicar el caso en un foro anónimo abierto.",
      "Desconocidos opinan y hacen preguntas. La historia de Maya se expone y la información se vuelve confusa.",
      "Los foros abiertos no garantizan privacidad ni información fiable. Usa canales oficiales y consulta con un adulto.",
      "La información también se cuida",
    ),
    risk(
      "c3-s1-risk2",
      "Intentar redactar una denuncia por su cuenta.",
      "Sofi se pierde en formularios y términos que no entiende. La denuncia no avanza y ella se frustra.",
      "Una persona menor no tiene que presentar sola una denuncia. Puede acompañar a su amiga a un servicio especializado.",
      "Acompañar no es sustituir",
    ),
  ],
  { cast: { sofi: "neutral" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c3-s1-ok",
  [
    {
      speaker: null,
      text: "Sofi entra en la web del 116 111 y lee qué pasos puede dar una amiga. Apunta: «Escuchar. No juzgar. Acompañar. Avisar a un adulto.»",
      cast: { sofi: "neutral" },
    },
    { speaker: "Sofi", text: "«No necesito saberlo todo. Necesito saber a quién llamar.»", tone: "thought", cast: { sofi: "smile" } },
  ],
  "c3-s2",
);

choice(
  "c3-s2",
  "Maya entra en pánico antes de la entrevista. ¿Qué hace Sofi?",
  [
    safe(
      "c3-s2-safe",
      "Guiarla en una respiración lenta y recordarle que no está sola.",
      "c3-s2-ok",
      { apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c3-s2-risk1",
      "Decirle que está exagerando.",
      "Maya siente que su miedo es un problema más. Se cierra y deja de contar lo que necesita.",
      "El miedo no es exagerado: es una respuesta. Valida lo que siente antes de proponer un paso.",
      "El miedo no se discute",
    ),
    risk(
      "c3-s2-risk2",
      "Ponerse a llorar con ella y contagiarle más pánico.",
      "Las dos se bloquean. La emoción compartida no se convierte en apoyo.",
      "Puedes sentir mucho y, a la vez, ofrecer calma. Respira tú primero y propón un paso pequeño.",
      "También puedes sostener la calma",
    ),
  ],
  { cast: { sofi: "sad" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c3-s2-ok",
  [
    { speaker: "Sofi", text: "«Mira. Cuatro tiempos para inspirar, seis para soltar. No tienes que hacerlo perfecto. Solo estamos aquí.»", cast: { sofi: "neutral" } },
    { speaker: "Maya", text: "«Me tiembla todo.»", cast: { maya: "sad" } },
    { speaker: "Sofi", text: "«Ya. Yo me quedo fuera. Si necesitas parar, pides parar.»", cast: { sofi: "smile" } },
  ],
  "c3-s3",
);

choice(
  "c3-s3",
  "Otras alumnas preguntan a Sofi qué le pasa a Maya. ¿Qué responde?",
  [
    safe(
      "c3-s3-safe",
      "Dar una respuesta neutra y protectora: «No es mi historia que contar. Si quiere, ella os lo dirá.»",
      "c3-s3-ok",
      { confidencialidad: { add: 1 } },
    ),
    risk(
      "c3-s3-risk1",
      "Contar los detalles en secreto a sus amigas.",
      "El secreto se convierte en rumor. Maya vuelve a perder el control sobre su propia historia.",
      "La intimidad de otra persona no se comparte para conseguir apoyo. Puedes pedir ayuda sin contar detalles.",
      "La intimidad no es un cotilleo",
    ),
    risk(
      "c3-s3-risk2",
      "Inventar que Maya ha cometido una falta para desviar la atención.",
      "La mentira crece. Cuando se descubre, Maya queda aún más expuesta.",
      "Una mentira protectora puede volverse contra quien intentas proteger. Es mejor poner un límite claro y discreto.",
      "Una mentira no protege",
    ),
  ],
  { cast: { sofi: "neutral" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c3-s3-ok",
  [
    { speaker: "Sofi", text: "«No me corresponde contarlo. Está pasando por algo y necesita tranquilidad.»", cast: { sofi: "neutral" } },
    { speaker: "Compañera", text: "«Vale. ¿Podemos hacer algo?»", cast: { sofi: "smile" } },
    { speaker: "Sofi", text: "«Sí. No hacer rumores y dejar que ella decida cuándo hablar.»", cast: { sofi: "smile" } },
  ],
  "c3-s4-whatsapp",
);

whatsapp(
  "c3-s4-whatsapp",
  "4.º B · grupo de clase",
  "Sofi",
  [
    { from: "Dani", text: "os habéis enterado de lo de la familia de Maya?", time: "12:10" },
    { from: "Hugo", text: "qué ha pasado", time: "12:10" },
    { from: "Dani", text: "que han llamado a la policía o algo", time: "12:11" },
    { from: "Compañera", text: "en serio??", time: "12:11" },
    { from: "Sofi", text: "no sigáis con eso.", time: "12:12" },
    { from: "Dani", text: "solo preguntaba", time: "12:12" },
    { from: "Sistema", text: "5 personas están escribiendo...", time: "12:13", system: true },
  ],
  "c3-s4",
  {
    scene: "classroom-day",
    cast: { sofi: "neutral" },
    perspective: "sofi",
    mood: "tense",
  },
);

choice(
  "c3-s4",
  "En un grupo de clase empieza a circular el rumor de que «la familia de Maya está en la policía». ¿Qué hace Sofi?",
  [
    safe(
      "c3-s4-safe",
      "No difundir el rumor y avisar a Lucía para que el centro actúe.",
      "c3-s4-ok",
      { confidencialidad: { add: 1 }, apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c3-s4-risk1",
      "Comentarlo en el grupo para saber quién lo ha dicho.",
      "El rumor se multiplica. Cada mensaje añade una capa de exposición para Maya.",
      "Preguntar en el grupo amplía el rumor. Llévalo a un adulto y deja que se investigue con discreción.",
      "Frenar el rumor es proteger",
    ),
    risk(
      "c3-s4-risk2",
      "Encarar a los que hablan y montar una discusión.",
      "La discusión sube de tono y Maya se entera de todo. El centro tarda más en intervenir.",
      "No necesitas ganar una discusión para proteger a alguien. Interrumpe la difusión y busca una vía institucional.",
      "No alimentes la discusión",
    ),
  ],
  { cast: { sofi: "surprised" }, perspective: "sofi", mood: "tense" },
);

chain(
  "c3-s4-ok",
  [
    {
      speaker: null,
      text: "Sofi no responde al mensaje del grupo. Reenvía el rumor a Lucía y le pide que no se difunda más.",
      cast: { sofi: "neutral" },
    },
    { speaker: "Lucía", text: "«Gracias. Hablaremos con el grupo sin exponer a Maya.»", cast: { lucia: "neutral" } },
    { speaker: "Sofi", text: "«Frenar un rumor también es cuidar.»", tone: "thought", cast: { sofi: "neutral" } },
  ],
  "cap4",
);

/* -------------------------------------------------------------- chapter 4 */

interstitial(
  "cap4",
  "Capítulo 4",
  "Protección judicial y entorno seguro",
  "La justicia puede escuchar de otra manera. La seguridad también se construye con detalles pequeños.",
  "c4-edad-router",
  { scene: "court-friendly", perspective: "maya", mood: "safe" },
);

branch("c4-edad-router", { flag: "modoAdolescente" }, "c4-teen", "c4-child");

chain(
  "c4-teen",
  [
    {
      speaker: null,
      text: "Maya entra en una sala con sofás y una mesa baja. No hay estrado ni gente con toga. Una psicóloga le explica que la Cámara Gesell está adaptada para que pueda declarar sin estar frente a frente con la persona a la que teme.",
      scene: "court-friendly",
      cast: { maya: "surprised" },
    },
    { speaker: "Lucía", text: "«Hoy no vienes a un examen. Vienes a que te escuchen.»", cast: { lucia: "smile" } },
    { speaker: "Maya", text: "«¿Y si me quedo en blanco?»", cast: { maya: "sad" } },
    { speaker: "Lucía", text: "«Entonces paramos y respiramos.»", cast: { lucia: "neutral" } },
  ],
  "c4-m1",
);

chain(
  "c4-child",
  [
    {
      speaker: null,
      text: "Maya entra en una sala con sofás y dibujos en la pared. Una psicóloga le dice que puede hablar despacio y que no está sola. La sala está pensada para escuchar a los niños sin asustarlos.",
      scene: "court-friendly",
      cast: { maya: "surprised" },
    },
    { speaker: "Lucía", text: "«Hoy no vienes a un examen. Vienes a que te escuchen.»", cast: { lucia: "smile" } },
    { speaker: "Maya", text: "«¿Y si me quedo en blanco?»", cast: { maya: "sad" } },
    { speaker: "Lucía", text: "«Entonces paramos y respiramos.»", cast: { lucia: "neutral" } },
  ],
  "c4-m1",
);

choice(
  "c4-m1",
  "La psicóloga le pide que cuente lo que ha visto. ¿Qué hace Maya?",
  [
    safe(
      "c4-m1-safe",
      "Testificar en la sala amigable, guiada por la psicóloga y con pausas.",
      "c4-m1-ok",
      { nivel_seguridad: { add: 1 }, banderas_rojas: { add: 1 } },
    ),
    risk(
      "c4-m1-risk1",
      "Retractarse por pena hacia su padre.",
      "Maya se calla lo que sabe. La protección se complica y ella sigue cargando con el miedo.",
      "Sentir pena no significa que lo ocurrido no importe. Puedes decir la verdad y, a la vez, sentir cosas difíciles.",
      "La pena no borra el daño",
    ),
    risk(
      "c4-m1-risk2",
      "Cerrarse en el silencio y no responder nada.",
      "La sala respeta su silencio, pero la información necesaria tarda más en llegar.",
      "Pedir una pausa es distinto de cerrarse. Puedes decir «necesito parar» y retomar cuando te sientas preparada.",
      "Puedes pedir una pausa",
    ),
  ],
  { cast: { maya: "sad" }, perspective: "maya", mood: "safe" },
);

chain(
  "c4-m1-ok",
  [
    {
      speaker: null,
      text: "Maya habla despacio. La psicóloga le recuerda que puede parar cuando quiera. Cuando termina, siente que ha puesto algo fuera de su mochila.",
      cast: { maya: "neutral" },
    },
    { speaker: "Psicóloga", text: "«Gracias por contar algo tan difícil. No tienes que hacerlo perfecto.»", cast: { maya: "neutral" } },
    { speaker: "Maya", text: "«Me han escuchado sin prisa.»", tone: "thought", cast: { maya: "smile" } },
  ],
  "c4-m2-whatsapp",
);

whatsapp(
  "c4-m2-whatsapp",
  "Papá",
  "Mamá",
  [
    { from: "Papá", text: "Si no retiráis la denuncia, os quedaréis sin nada.", time: "10:02" },
    { from: "Papá", text: "Lo digo por vosotras.", time: "10:03" },
    { from: "Mamá", text: "No me escribas más.", time: "10:04" },
    { from: "Papá", text: "Tú verás.", time: "10:04" },
    { from: "Sistema", text: "Maya ha leído la conversación.", time: "10:05", system: true },
  ],
  "c4-m2",
  {
    scene: "shelter-room",
    cast: { maya: "sad" },
    perspective: "maya",
    mood: "tense",
  },
);

choice(
  "c4-m2",
  "El padre manda un mensaje a la madre: «Si no retiráis la denuncia, os quedaréis sin nada». ¿Qué hace Maya?",
  [
    safe(
      "c4-m2-safe",
      "Entregar la captura a la abogada y no responder al mensaje.",
      "c4-m2-ok",
      { nivel_seguridad: { add: 1 }, confidencialidad: { add: 1 }, banderas_rojas: { add: 1 } },
    ),
    risk(
      "c4-m2-risk1",
      "Convencer a su madre de retirar la denuncia por miedo a la ruina económica.",
      "La presión económica se convierte en una razón para callar. La amenaza gana poder.",
      "El miedo a las consecuencias económicas es comprensible, pero retirar una denuncia por chantaje no garantiza seguridad. Compártelo con la abogada.",
      "El chantaje no es una razón para callar",
    ),
    risk(
      "c4-m2-risk2",
      "Responder al padre con insultos.",
      "El padre usa la respuesta para justificarse. Maya descarga rabia, pero no gana protección.",
      "La rabia puede acompañarte, pero responder no suele detener el chantaje. Guarda el mensaje y entrégaselo a quien lleva el caso.",
      "Guarda el mensaje, no la respuesta",
    ),
  ],
  { cast: { maya: "sad" }, perspective: "maya", mood: "tense" },
);

chain(
  "c4-m2-ok",
  [
    {
      speaker: null,
      text: "Maya hace una captura y se la entrega a la abogada. No contesta. La abogada explica que el chantaje también puede ser denunciado.",
      cast: { maya: "neutral" },
    },
    { speaker: "Abogada", text: "«Que él amenace no significa que tenga razón.»", cast: { maya: "neutral" } },
    { speaker: "Maya", text: "«No he respondido. Pero no me he callado.»", tone: "thought", cast: { maya: "neutral" } },
  ],
  "c4-m3",
);

choice(
  "c4-m3",
  "Maya y su madre llegan a un recurso de acogida. ¿Qué hace Maya el primer día?",
  [
    safe(
      "c4-m3-safe",
      "Participar en el acompañamiento emocional y preguntar cómo funciona el lugar.",
      "c4-m3-ok",
      { nivel_seguridad: { add: 1 }, apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c4-m3-risk1",
      "Aislarse en la habitación sin hablar con el equipo.",
      "El equipo respeta su espacio, pero tarda más en conocer qué necesita. Maya se siente más sola.",
      "El primer día puede ser abrumador. No tienes que contarlo todo, pero sí puedes decir «necesito tiempo» y aceptar compañía.",
      "Puedes pedir tiempo sin desaparecer",
    ),
    risk(
      "c4-m3-risk2",
      "Publicar fotos del nuevo barrio en redes.",
      "La ubicación del recurso puede quedar expuesta. La seguridad de todas las personas del lugar se resiente.",
      "La seguridad también es digital. No publiques ubicaciones, horarios ni detalles que puedan identificar un recurso protegido.",
      "Tu ubicación también te protege",
    ),
  ],
  { cast: { maya: "neutral" }, perspective: "maya", mood: "safe" },
);

chain(
  "c4-m3-ok",
  [
    {
      speaker: null,
      text: "Maya pregunta dónde puede dejar sus cosas, cuándo se cena y quién puede acompañarla si no puede dormir. El equipo responde con calma.",
      scene: "shelter-room",
      cast: { maya: "neutral" },
    },
    { speaker: "Equipo de acogida", text: "«Aquí puedes ir despacio. Y puedes pedir ayuda sin tener que explicarlo todo.»", cast: { maya: "neutral" } },
    { speaker: "Maya", text: "«No es mi casa. Pero hoy puedo cerrar la puerta.»", tone: "thought", cast: { maya: "smile" } },
  ],
  "persp-sofi-4",
);

interstitial(
  "persp-sofi-4",
  "Perspectiva de Sofi",
  "Contacto a distancia",
  "Sofi quiere estar cerca. Pero estar cerca no es lo mismo que saberlo todo.",
  "persp-sofi-4-talk",
  { scene: "hallway-day", perspective: "sofi", mood: "warm" },
);


chain(
  "persp-sofi-4-talk",
  [
    {
      speaker: null,
      text: "Sofi mira el móvil sin escribir. No quiere preguntar lo que no debe.",
      scene: "hallway-day",
      cast: { sofi: "sad" },
    },
    { speaker: "Sofi", text: "«No sé qué decirle a Maya sin preguntarle dónde está.»" },
    { speaker: "Lucía", text: "«Pregúntale cómo está. No dónde está.»" },
    { speaker: "Sofi", text: "«Vale. Así lo haré.»" },
  ],
  "c4-s1",
);
choice(
  "c4-s1",
  "Maya está en un recurso protegido. ¿Cómo mantiene Sofi el contacto?",
  [
    safe(
      "c4-s1-safe",
      "Mantener llamadas seguras y no pedir la dirección del recurso.",
      "c4-s1-ok",
      { apoyo_emocional: { add: 1 }, confidencialidad: { add: 1 } },
    ),
    risk(
      "c4-s1-risk1",
      "Exigir la dirección del piso para ir a verla.",
      "La ubicación de Maya se convierte en información compartida. El recurso tiene que intervenir.",
      "La ubicación de un recurso protegido no se comparte. Puedes mantener el contacto por llamadas seguras y mensajes acordados.",
      "La ubicación no se comparte",
    ),
    risk(
      "c4-s1-risk2",
      "Enfadarse porque no pueden quedar como antes.",
      "Maya siente que tiene que cuidar también el enfado de Sofi. La amistad se llena de culpa.",
      "La amistad cambia cuando hay protección de por medio. Puedes decir que echas de menos sin exigir lo que no puede dar.",
      "Echar de menos no es exigir",
    ),
  ],
  { cast: { sofi: "sad" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c4-s1-ok",
  [
    { speaker: "Sofi", text: "«No necesito saber dónde estás. Solo necesito saber que estás bien cuando puedas decírmelo.»", cast: { sofi: "neutral" } },
    { speaker: "Maya", text: "«Hoy he dormido. Y he comido. Eso es raro.»", cast: { maya: "neutral" } },
    { speaker: "Sofi", text: "«Me alegro. Mañana te cuento el examen de mates.»", cast: { sofi: "smile" } },
  ],
  "c4-s2",
);

choice(
  "c4-s2",
  "En el colegio, alguien habla de que Maya está «en un centro». ¿Qué hace Sofi?",
  [
    safe(
      "c4-s2-safe",
      "Desmentir con firmeza: «Pedir ayuda no es ningún drama. Es de valientes. Y su historia no se cuenta.»",
      "c4-s2-ok",
      { confidencialidad: { add: 1 }, apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c4-s2-risk1",
      "Pelearse con quien hable de la policía.",
      "La pelea da más que hablar. El foco se pone en el conflicto y no en el respeto a Maya.",
      "Puedes poner un límite sin pelear. Una frase firme y breve puede frenar más que un enfrentamiento.",
      "Un límite no necesita pelea",
    ),
    risk(
      "c4-s2-risk2",
      "Callar por vergüenza.",
      "El rumor sigue creciendo. El silencio deja el espacio libre para que otros llenen la historia.",
      "Callar no siempre protege. Puedes decir lo justo para cortar el rumor y pedir ayuda al centro.",
      "Callar también deja espacio al rumor",
    ),
  ],
  { cast: { sofi: "neutral" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c4-s2-ok",
  [
    { speaker: "Sofi", text: "«Está pasando por algo difícil. No es un cotilleo. Y pedir ayuda no la hace menos.»", cast: { sofi: "neutral" } },
    { speaker: "Compañero", text: "«No lo había pensado así.»", cast: { sofi: "smile" } },
    { speaker: "Sofi", text: "«Pues piénsalo antes de volver a contarlo.»", cast: { sofi: "neutral" } },
  ],
  "c4-s3",
);

choice(
  "c4-s3",
  "Maya vuelve al colegio después de unos días. ¿Qué prepara Sofi?",
  [
    safe(
      "c4-s3-safe",
      "Coordinar una acogida natural: guardarle los apuntes y sentarse cerca sin hacer un espectáculo.",
      "c4-s3-ok",
      { apoyo_emocional: { add: 1 } },
    ),
    risk(
      "c4-s3-risk1",
      "Organizar una fiesta masiva de bienvenida.",
      "Maya se siente observada. La atención no pedida se convierte en otra presión.",
      "La acogida no tiene que ser un evento. Pregúntale qué necesita y empieza por lo pequeño.",
      "La acogida puede ser pequeña",
    ),
    risk(
      "c4-s3-risk2",
      "Pedir a todos que la ignoren para no incomodarla.",
      "Maya se siente invisible. El silencio de todos pesa como una ausencia.",
      "Ignorar no es respetar. Un saludo tranquilo y un gesto pequeño pueden hacer que el regreso sea más amable.",
      "Ignorar no es respetar",
    ),
  ],
  { cast: { sofi: "smile" }, perspective: "sofi", mood: "warm" },
);

chain(
  "c4-s3-ok",
  [
    {
      speaker: null,
      text: "Sofi deja los apuntes en el pupitre de Maya sin decir nada. Luego se sienta a su lado, como si fuera un día normal.",
      scene: "classroom-day",
      cast: { sofi: "smile" },
    },
    { speaker: "Maya", text: "«Gracias. No quería que todos me miraran.»", cast: { maya: "smile" } },
    { speaker: "Sofi", text: "«Lo sé. Por eso no he hecho un cartel.»", cast: { sofi: "happy" } },
  ],
  "cap5",
);

/* -------------------------------------------------------------- chapter 5 */

interstitial(
  "cap5",
  "Capítulo 5",
  "El taller de Elena",
  "Una mediadora judicial entra en el aula. No viene a dar una charla: viene a escuchar y a desmontar mitos.",
  "c5-intro",
  { scene: "classroom-day", perspective: "elena", mood: "warm" },
);

chain(
  "c5-intro",
  [
    {
      speaker: null,
      text: "Elena entra en el aula con una carpeta bajo el brazo. Deja el móvil boca abajo sobre la mesa y mira a la clase.",
      scene: "classroom-day",
      cast: { elena: "neutral" },
    },
    {
      speaker: "Elena",
      text: "«Me llamo Elena. Trabajo en justicia, pero hoy no vengo a hablar de castigos. Vengo a hablar de cómo se protege a una persona cuando pide ayuda.»",
      cast: { elena: "smile" },
    },
    {
      speaker: "Elena",
      text: "«Antes del cuestionario, repasemos la libreta de Maya. ¿Qué ideas os ayudan a reconocer y actuar sin poneros en riesgo?»",
      cast: { elena: "neutral" },
    },
  ],
  "libreta-minigame",
);

add("libreta-minigame", {
  type: "minigame",
  mode: "information",
  title: "La libreta de Maya",
  prompt:
    "Selecciona las ideas que ayudan a reconocer la violencia y a pedir ayuda sin difundir intimidad.",
  cards: [
    {
      id: "ciclo",
      text: "El ciclo de la violencia alterna tensión, estallido y calma aparente.",
      correct: true,
      feedback: "La calma después del estallido no borra lo ocurrido.",
    },
    {
      id: "gesell",
      text: "La Cámara Gesell es una sala adaptada para escuchar a un menor con protección.",
      correct: true,
      feedback: "No es un tribunal intimidante: es un espacio pensado para declarar con apoyo.",
    },
    {
      id: "lineas",
      text: "El 116 111 y el 016 son líneas gratuitas y confidenciales de ayuda.",
      correct: true,
      feedback: "Puedes llamar sin tenerlo todo claro y sin dar tu nombre.",
    },
    {
      id: "borrar",
      text: "Si borro los mensajes y las fotos, la violencia desaparece.",
      correct: false,
      feedback: "Borrar no detiene la violencia y puede destruir pruebas útiles.",
    },
    {
      id: "foro",
      text: "Compartir capturas en un foro abierto es la forma más rápida de ayudar.",
      correct: false,
      feedback: "Los foros abiertos no protegen la intimidad ni garantizan información fiable.",
    },
    {
      id: "culpa",
      text: "Los hijos son responsables de las decisiones de sus padres.",
      correct: false,
      feedback: "La violencia es responsabilidad de quien la ejerce, nunca de quien la sufre.",
    },
    {
      id: "ayuda",
      text: "Pedir ayuda es de valientes y no tienes que hacerlo solo.",
      correct: true,
      feedback: "La red de apoyo existe para sostenerte.",
    },
    {
      id: "orden",
      text: "Una orden de alejamiento puede proteger a la familia mientras se resuelve el caso.",
      correct: true,
      feedback: "La medida la valora un juez; no tienes que resolverlo tú.",
    },
  ],
  next: "c5-quiz-intro",
  scene: "classroom-day",
  cast: { elena: "neutral" },
  perspective: "elena",
  mood: "warm",
});

chain(
  "c5-quiz-intro",
  [
    {
      speaker: "Elena",
      text: "«Ahora cuatro preguntas. No hay nota. Si algo no lo sabes, puedes preguntarlo después.»",
      cast: { elena: "smile" },
    },
  ],
  "final-quiz",
);

add("final-quiz", {
  type: "quiz",
  title: "Cuatro ideas para llevarte",
  prompt: "Responde con calma. Cada respuesta abre una explicación.",
  questions: [
    {
      id: "q-violencia",
      voice: "Maya",
      flag: "quizViolencia",
      question: "¿Cuál de estas situaciones es violencia psicológica y no una simple discusión?",
      explanation:
        "La violencia psicológica incluye control, humillación, aislamiento y amenazas.",
      options: [
        {
          id: "a",
          label: "Dos personas discuten y luego se escuchan.",
          correct: false,
          feedback: "Una discusión puede ser difícil, pero no por sí sola es violencia.",
        },
        {
          id: "b",
          label: "Una persona revisa el móvil de otra, la humilla y le exige contraseñas.",
          correct: true,
          feedback: "El control, la humillación y la vigilancia buscan someter a la otra persona.",
        },
        {
          id: "c",
          label: "Una persona dice que necesita espacio.",
          correct: false,
          feedback: "Poner un límite no es violencia.",
        },
      ],
    },
    {
      id: "q-culpa",
      voice: "Sofi",
      flag: "quizCulpa",
      question: "Si una amiga te cuenta que sufre violencia, ¿de quién es la culpa?",
      explanation:
        "La víctima y los menores que piden ayuda nunca son culpables del maltrato ni de las consecuencias legales del agresor.",
      options: [
        {
          id: "a",
          label: "De ella, por no haber hablado antes.",
          correct: false,
          feedback: "Callar no es culpa; el miedo y la manipulación dificultan hablar.",
        },
        {
          id: "b",
          label: "De quien ejerce la violencia, nunca de la víctima.",
          correct: true,
          feedback: "La responsabilidad es de quien decide controlar, humillar o dañar.",
        },
        {
          id: "c",
          label: "De toda la familia por igual.",
          correct: false,
          feedback: "La familia puede estar atrapada; la responsabilidad no se reparte así.",
        },
      ],
    },
    {
      id: "q-digital",
      voice: "Maya",
      flag: "quizDigital",
      question: "Te llega una imagen manipulada tuya. ¿Qué haces primero?",
      explanation:
        "No reenvíes, guarda la prueba, reporta la cuenta y cuenta lo ocurrido a una persona adulta de confianza.",
      options: [
        {
          id: "a",
          label: "Borrar todo y no contarlo.",
          correct: false,
          feedback: "Borrar puede destruir pruebas y no detiene la difusión.",
        },
        {
          id: "b",
          label: "Reenviarla al grupo para preguntar quién la ha hecho.",
          correct: false,
          feedback: "Reenviar es difundir. Aumenta el daño.",
        },
        {
          id: "c",
          label: "Guardar una captura con fecha, reportar la cuenta y avisar al centro.",
          correct: true,
          feedback: "Documentar sin difundir, reportar y pedir ayuda es el protocolo más seguro.",
        },
      ],
    },
    {
      id: "q-justicia",
      voice: "Sofi",
      flag: "quizJusticia",
      question: "¿Cuál de estas garantías existe para un menor en la justicia?",
      explanation:
        "La justicia infantil debe escuchar al menor en entornos protegidos, con información clara y sin coste en las líneas de ayuda.",
      options: [
        {
          id: "a",
          label: "Puede declarar en una sala adaptada y ser escuchado con protección.",
          correct: true,
          feedback: "La Cámara Gesell y los entornos amigables existen para eso.",
        },
        {
          id: "b",
          label: "Tiene que pagar la llamada al 116 111.",
          correct: false,
          feedback: "La línea es gratuita y confidencial.",
        },
        {
          id: "c",
          label: "No puede pedir que le expliquen el proceso.",
          correct: false,
          feedback: "Tiene derecho a que le expliquen las cosas con palabras sencillas.",
        },
      ],
    },
  ],
  next: "final-router",
  scene: "classroom-day",
  cast: { elena: "neutral" },
  perspective: "elena",
  mood: "warm",
});

branch(
  "final-router",
  {
    all: [
      { gte: [{ flag: "quizScore" }, 4] },
      { lte: [{ flag: "errores" }, 1] },
    ],
  },
  "final1",
  "final-router2",
);

branch("final-router2", { gte: [{ flag: "quizScore" }, 2] }, "final2", "final3");

add("final1", {
  type: "ending",
  kicker: "Final 1",
  title: "Una red que sostiene",
  text: "Maya no ha resuelto su historia de golpe. Pero ha aprendido a reconocer el control, a guardar pruebas sin difundirlas, a pedir ayuda y a dejar que otras personas la sostengan. Sofi ha aprendido que la lealtad también es acompañar a una amiga a una puerta que no puede cruzar sola. La justicia puede ser un lugar donde te escuchan con cuidado.",
  scene: "classroom-day",
  cast: { maya: "smile" },
  perspective: "red",
  mood: "hope",
});

add("final2", {
  type: "ending",
  kicker: "Final 2",
  title: "El primer paso",
  text: "Maya ha dado pasos importantes: ha hablado, ha guardado pruebas y ha pedido ayuda. Algunas ideas todavía le bailan y el miedo no desaparece de un día para otro. Sofi sigue cerca sin exigirle que esté bien. Pedir ayuda no requiere tener todas las respuestas.",
  scene: "shelter-room",
  cast: { maya: "neutral" },
  perspective: "red",
  mood: "safe",
});

add("final3", {
  type: "ending",
  kicker: "Final 3",
  title: "La puerta sigue abierta",
  text: "Maya ha reconocido que algo no estaba bien, aunque todavía le cuesta confiar en las líneas de ayuda y en el proceso. No está sola: la libreta, Sofi, Lucía y los servicios de protección siguen ahí. Aprender a pedir ayuda también es un camino, y se puede volver a empezar.",
  scene: "orientation-office",
  cast: { maya: "neutral" },
  perspective: "red",
  mood: "safe",
});

/* ------------------------------------------------ post-choice conversations */

// After every safe decision, the characters talk for a moment. These scenes do
// not add new plot events: they give the relationship time to breathe and keep
// the story from jumping from one decision to the next.
const POST_CHOICE_DIALOGUES = {
  maya: {
    c1: [
      [
        { speaker: "Mamá", text: "«¿Te has quedado con hambre? He guardado la cena.»" },
        { speaker: "Maya", text: "«No mucha.»" },
        { speaker: "Mamá", text: "«Si quieres, comemos las dos en la cocina.»" },
      ],
      [
        { speaker: "Sofi", text: "«¿Has podido dormir?»" },
        { speaker: "Maya", text: "«A ratos.»" },
        { speaker: "Sofi", text: "«Yo también he estado dando vueltas. Cuando quieras, te llamo.»" },
      ],
      [
        { speaker: "Maya", text: "«¿Estás bien?»" },
        { speaker: "Mamá", text: "«Estoy cansada. Pero estoy.»" },
        { speaker: "Maya", text: "«Yo también estoy.»" },
      ],
    ],
    c2: [
      [
        { speaker: "Sofi", text: "«¿Quieres que borre el mensaje o lo guardamos?»" },
        { speaker: "Maya", text: "«Guárdalo tú también. Por si acaso.»" },
        { speaker: "Sofi", text: "«Hecho. No se lo enseño a nadie.»" },
      ],
      [
        { speaker: "Lucía", text: "«¿Quieres que avise a tu madre ahora o prefieres que lo hablemos primero?»" },
        { speaker: "Maya", text: "«Primero contigo. Luego ella.»" },
        { speaker: "Lucía", text: "«Vamos despacio.»" },
      ],
      [
        { speaker: "Maya", text: "«Me da vergüenza que lo sepas.»" },
        { speaker: "Sofi", text: "«No sé qué haría yo en tu lugar. Pero no me das vergüenza.»" },
        { speaker: "Maya", text: "«Gracias.»" },
      ],
    ],
    c3: [
      [
        { speaker: "Lucía", text: "«La llamada es gratuita y no tienes que dar tu nombre.»" },
        { speaker: "Maya", text: "«¿Y si me pongo a llorar?»" },
        { speaker: "Lucía", text: "«Puedes llorar. No hace falta que suene perfecto.»" },
      ],
      [
        { speaker: "Mamá", text: "«¿De verdad va a cambiar algo contarlo?»" },
        { speaker: "Maya", text: "«No lo sé. Pero ahora no estamos solas.»" },
        { speaker: "Mamá", text: "«No. Ahora no.»" },
      ],
      [
        { speaker: "Sofi", text: "«¿Te acompaño a la entrevista?»" },
        { speaker: "Maya", text: "«Puedes esperar fuera.»" },
        { speaker: "Sofi", text: "«Entonces espero fuera.»" },
      ],
    ],
    c4: [
      [
        { speaker: "Lucía", text: "«Si necesitas parar, levantas la mano y paramos.»" },
        { speaker: "Maya", text: "«¿Y no se enfadan?»" },
        { speaker: "Lucía", text: "«No. Es tu derecho.»" },
      ],
      [
        { speaker: "Mamá", text: "«Esta noche podemos dormir con la puerta cerrada.»" },
        { speaker: "Maya", text: "«¿Y mañana?»" },
        { speaker: "Mamá", text: "«Mañana también. Poco a poco.»" },
      ],
      [
        { speaker: "Abogada", text: "«No tienes que responder a todas las preguntas hoy.»" },
        { speaker: "Maya", text: "«¿Y si no me acuerdo de algo?»" },
        { speaker: "Abogada", text: "«Puedes decirlo. Nadie espera que lo recuerdes todo.»" },
      ],
    ],
  },
  sofi: {
    c1: [
      [
        { speaker: "Maya", text: "«Gracias por no preguntar delante de todos.»" },
        { speaker: "Sofi", text: "«Cuando quieras hablar, aquí estoy.»" },
        { speaker: "Maya", text: "«Vale.»" },
      ],
      [
        { speaker: "Sofi", text: "«¿He hecho bien? No quería contar más de lo necesario.»" },
        { speaker: "Lucía", text: "«Has preguntado antes de actuar. Eso está bien.»" },
        { speaker: "Sofi", text: "«Vale. Gracias.»" },
      ],
      [
        { speaker: "Sofi", text: "«¿Te sientas conmigo en el patio?»" },
        { speaker: "Maya", text: "«Solo si no hablamos de nada importante.»" },
        { speaker: "Sofi", text: "«Trato: hablamos de lo que sea.»" },
      ],
    ],
    c2: [
      [
        { speaker: "Maya", text: "«No quiero que me veas como un problema.»" },
        { speaker: "Sofi", text: "«Te veo como mi amiga. El problema es lo que está pasando.»" },
        { speaker: "Maya", text: "«Vale.»" },
      ],
      [
        { speaker: "Sofi", text: "«¿Puedo decirle a Maya que hable contigo?»" },
        { speaker: "Lucía", text: "«Sí. Y si ella no quiere, no la fuerces.»" },
        { speaker: "Sofi", text: "«Se lo diré sin presión.»" },
      ],
      [
        { speaker: "Sofi", text: "«¿Has comido algo hoy?»" },
        { speaker: "Maya", text: "«Un poco.»" },
        { speaker: "Sofi", text: "«Tengo una manzana. ¿La compartimos?»" },
      ],
    ],
    c3: [
      [
        { speaker: "Sofi", text: "«¿Es verdad que el 116 111 no aparece en la factura?»" },
        { speaker: "Lucía", text: "«Es una línea gratuita y confidencial. Puedes llamar sin miedo.»" },
        { speaker: "Sofi", text: "«Se lo diré a Maya.»" },
      ],
      [
        { speaker: "Compañera", text: "«¿Maya está bien?»" },
        { speaker: "Sofi", text: "«Está pasando por algo. No es mi historia que contar.»" },
        { speaker: "Compañera", text: "«Vale. No lo pregunto más.»" },
      ],
      [
        { speaker: "Sofi", text: "«¿Quieres que no hable de esto en clase?»" },
        { speaker: "Maya", text: "«Sí. Por favor.»" },
        { speaker: "Sofi", text: "«Entendido. Solo si tú quieres.»" },
      ],
    ],
    c4: [
      [
        { speaker: "Sofi", text: "«No necesito saber dónde estás. Solo que estés bien.»" },
        { speaker: "Maya", text: "«Hoy estoy mejor.»" },
        { speaker: "Sofi", text: "«Me alegro. Te mando los apuntes.»" },
      ],
      [
        { speaker: "Sofi", text: "«¿Puedo decirle a Maya que la espero en la puerta?»" },
        { speaker: "Lucía", text: "«Pregúntale primero. Y respeta si dice que no.»" },
        { speaker: "Sofi", text: "«Se lo preguntaré.»" },
      ],
      [
        { speaker: "Maya", text: "«Gracias por seguir aquí.»" },
        { speaker: "Sofi", text: "«No me he ido a ninguna parte.»" },
        { speaker: "Maya", text: "«Ya lo sé.»" },
      ],
    ],
  },
};

function lastDialogueInChain(startId) {
  let currentId = startId;
  let current = nodes[currentId];
  if (!current || current.type !== "dialogue") return null;

  for (let guard = 0; guard < 40; guard += 1) {
    const next = nodes[current.next];
    if (!next || next.type !== "dialogue") return { id: currentId, node: current };
    currentId = current.next;
    current = next;
  }
  return { id: currentId, node: current };
}

const conversationTargets = new Set();

for (const [choiceId, choiceNode] of Object.entries(nodes)) {
  if (choiceNode.type !== "choice" || !choiceId.startsWith("c")) continue;
  const chapter = `c${choiceId.match(/^c(\d)/)?.[1] ?? "1"}`;
  const perspective = choiceNode.perspective ?? "maya";
  const groups = POST_CHOICE_DIALOGUES[perspective] ?? POST_CHOICE_DIALOGUES.maya;
  const group = groups[chapter] ?? groups.c1;

  for (const option of choiceNode.options ?? []) {
    if (option.safe === false || !option.next) continue;
    const targetInfo = lastDialogueInChain(option.next);
    if (!targetInfo || conversationTargets.has(targetInfo.id)) continue;
    conversationTargets.add(targetInfo.id);
    const target = targetInfo.node;

    const lines = pick(group, option.id);
    let nextId = target.next;
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      const nodeId = `${option.id}-talk-${index + 1}`;
      if (nodes[nodeId]) continue;
      add(nodeId, {
        type: "dialogue",
        speaker: line.speaker,
        text: line.text,
        next: nextId,
        ...(speakerCast(line.speaker) ? { cast: speakerCast(line.speaker) } : {}),
      });
      nextId = nodeId;
    }
    target.next = nextId;
  }
}

/* ------------------------------------------------------ room choreography */

// Make every decision happen in an explicit room. This keeps the background in
// sync with the dialogue on real zone changes.
const CHOICE_SCENES = {
  "c1-m1": "home-living-cold",
  "c1-m2": "home-kitchen-cold",
  "c1-m3": "home-kitchen-cold",
  "c1-m4": "home-living-cold",
  "c1-s1": "hallway-day",
  "c1-s2": "bedroom-evening",
  "c1-s3": "classroom-day",
  "c1-s4": "patio-day",
  "c2-m1": "home-living-cold",
  "c2-m2": "home-living-cold",
  "c2-m3": "hallway-day",
  "c2-m4": "home-living-cold",
  "c2-s1": "classroom-day",
  "c2-s2": "classroom-day",
  "c2-s3": "hallway-day",
  "c3-m1": "home-kitchen-cold",
  "c3-m2": "home-kitchen-cold",
  "c3-m3": "orientation-office",
  "c3-s1": "orientation-office",
  "c3-s2": "orientation-office",
  "c3-s3": "classroom-day",
  "c3-s4": "classroom-day",
  "c4-m1": "court-friendly",
  "c4-m2": "shelter-room",
  "c4-m3": "shelter-room",
  "c4-s1": "hallway-day",
  "c4-s2": "classroom-day",
  "c4-s3": "classroom-day",
};

for (const [id, scene] of Object.entries(CHOICE_SCENES)) {
  if (nodes[id]) nodes[id].scene = scene;
}

/* ------------------------------------------------ speaker / cast alignment */

// Keep the visible sprite in sync with the person who is speaking. This fixes
// lines where a mother, father, teacher or classmate spoke while a different
// character was still on stage.
for (const node of Object.values(nodes)) {
  if (node.type !== "dialogue" || !node.speaker || node.remote) continue;
  const cast = speakerCast(node.speaker);
  if (!cast) continue;
  const characterId = Object.keys(cast)[0];
  const expression = node.cast?.[characterId] ?? "neutral";
  node.cast = { [characterId]: expression };
}

/* --------------------------------------------------------------- pacing */

// One calm narration beat between the consequence of a decision and the next
// decision. It adds breathing room without introducing new plot events.
const choiceIds = new Set(
  Object.entries(nodes)
    .filter(([, node]) => node.type === "choice")
    .map(([id]) => id),
);

const pauseLines = {
  maya: [
    "Maya se queda un momento en silencio. El zumbido de la nevera llena la cocina y, por un instante, no hay nada más que hacer.",
    "La luz de la tarde se estira sobre la mesa. Maya respira hondo antes de levantar la vista.",
    "Maya guarda el móvil en el bolsillo. Todavía nota el calor de la pantalla en la palma de la mano.",
    "Fuera, alguien cierra una puerta. El ruido llega amortiguado, como si la casa también estuviera conteniendo el aire.",
    "Maya se queda mirando la libreta sin abrirla. Hay días en los que las palabras necesitan un poco más de tiempo.",
    "El reloj de la cocina marca los segundos. Maya deja que pasen, sin prisa por decidir lo siguiente.",
  ],
  sofi: [
    "Sofi se queda un momento en el patio, con la mochila colgada de un hombro. El aire huele a lluvia y a bocadillos.",
    "Las voces de la clase llegan desde dentro. Sofi se detiene antes de cruzar la puerta y respira hondo.",
    "Sofi mira el móvil, pero no lo abre. Todavía no sabe qué decir, y no quiere llenar el silencio con cualquier cosa.",
    "El timbre suena a lo lejos. Sofi se queda unos segundos más, dejando que la prisa se vaya con el resto de la gente.",
    "Sofi apoya la cabeza en la pared del pasillo. A veces acompañar empieza por no tener la respuesta perfecta.",
    "Una compañera pasa corriendo. Sofi sonríe sin ganas y vuelve a ordenar sus pensamientos.",
  ],
};

for (const [id, node] of Object.entries(nodes)) {
  if (node.type !== "dialogue") continue;
  if (!choiceIds.has(node.next)) continue;
  if (id.includes("-risk")) continue;

  const pauseId = `${id}-pausa`;
  if (nodes[pauseId]) continue;
  const perspective = node.perspective ?? nodes[node.next].perspective ?? "maya";
  const lines = pauseLines[perspective] ?? pauseLines.maya;

  add(pauseId, {
    type: "dialogue",
    speaker: null,
    text: pick(lines, id),
    tone: "narration",
    next: node.next,
    ...(node.scene ? { scene: node.scene } : {}),
    ...(node.cast ? { cast: node.cast } : {}),
  });
  node.next = pauseId;
}

/* --------------------------------------------------------- cohesion pass */

// Keep room changes, entrances and text-message scenes coherent after the
// reusable conversation and pacing layers have been applied.
adaptDosVoces(nodes);

// Shorten the prose, remove atmospheric pauses and simplify the vocabulary.
plainLanguage(nodes);

// Remove the leaked-photo and school-rumour branches, post-choice filler and
// the notebook minigame so the story stays focused on domestic violence.
simplifyDosVoces(nodes);

/* --------------------------------------------------------------- output */

const choiceNodes = Object.entries(nodes).filter(([, node]) => node.type === "choice");
const storyChoices = choiceNodes.filter(([id]) => id !== "modo");
const quizQuestions = nodes["final-quiz"].questions;
const totalDecisions = storyChoices.length + quizQuestions.length;

if (totalDecisions !== 21) {
  throw new Error(`Expected 21 decisions, found ${totalDecisions}`);
}

const mayaDecisions =
  choiceNodes.filter(([id]) => nodes[id].perspective === "maya" && id.startsWith("c")).length +
  quizQuestions.filter((question) => question.voice === "Maya").length;
const sofiDecisions =
  choiceNodes.filter(([id]) => nodes[id].perspective === "sofi").length +
  quizQuestions.filter((question) => question.voice === "Sofi").length;

await mkdir(outDir, { recursive: true });
await writeFile(
  path.join(outDir, "story.json"),
  `${JSON.stringify({ version: 1, start: "start", nodes }, null, 2)}\n`,
  "utf8",
);

console.log(`wrote ${path.relative(process.cwd(), path.join(outDir, "story.json"))}`);
console.log(
  `${Object.keys(nodes).length} nodes · ${totalDecisions} decisions (Maya ${mayaDecisions}, Sofi ${sofiDecisions}) · ${quizQuestions.length} quiz questions`,
);
