/** Authoring source for Sara. Fiction here; verified explanations in legal.json. */
import { readFile, writeFile, mkdir } from "node:fs/promises";

const dir = new URL("../public/content/stories/sara/", import.meta.url);
await mkdir(dir, { recursive: true });
const legal = JSON.parse(await readFile(new URL("legal.json", dir), "utf8"));
const nodes = {};
let chapter = 1;
const add = (id, data) => { if (nodes[id]) throw new Error(`Duplicate ${id}`); nodes[id] = { chapter, ...data }; };
const say = (id, speaker, text, next, extra = {}) => add(id, {
  type: "dialogue", speaker, text, next,
  cast: speaker === "Sara" || !speaker ? { sara: "neutral" } : { sara: null }, ...extra,
});
const narration = (id, text, next, extra) => say(id, null, text, next, extra);
const thought = (id, text, next) => say(id, "Sara", text, next, { tone: "thought", cast: { sara: "sad" } });
const option = (id, label, next, flags = {}) => ({ id, label, next, flags });
const choice = (id, prompt, options) => add(id, { type: "choice", prompt, options, cast: { sara: "neutral" } });
const explain = (id, speaker, key, next) => say(id, speaker, legal.notes[key].dialogue ?? legal.notes[key].text, next, { learn: [key] });
const branch = (id, when, then, otherwise) => add(id, { type: "branch", when, then, else: otherwise });
const card = (id, title, text, next, scene) => add(id, { type: "interstitial", kicker: `SARA · CAPÍTULO ${chapter} DE 6`, title, text, next, scene, cast: { sara: "neutral" } });
// Chat del móvil de Sara: [quién, texto, hora].
const chat = (id, chatTitle, messages, next) => add(id, { type: "chat", chatTitle, self: "Sara", messages: messages.map(([from, text, time]) => ({ from, text, time })), next });
const ABOGADA = "Irene · abogada";

card("start", "Algo no va bien", "Lunes por la mañana.", "c1-01", "school-exterior");
narration("c1-01", "Sara tiene catorce años y va a tercero de la ESO. Le encanta el voleibol y dibuja estrellas en los bordes de sus cuadernos. Suena el timbre y todavía le queda una estrella por terminar.", "c1-02", { scene: "classroom-day" });
say("c1-02", "Paula", "¿Vienes hoy al entreno de voleibol? Vamos a practicar el saque.", "c1-03");
say("c1-03", "Sara", "Hoy no puedo. Otro día, ¿vale?", "c1-04", { cast: { sara: "sad" } });
narration("c1-04", "En casa, Javier, su padre, le grita cuando algo no le gusta. Le mira el móvil y no la deja ver a quien ella quiere. Algunas veces la ha empujado y le ha pegado.", "c1-05", { cast: { sara: "sad" } });
thought("c1-05", "Ayer me volvió a quitar el móvil. Dani estaba en su cuarto. Solo tiene diez años. No sé cuánto oyó.", "c1-06");
say("c1-06", "Paula", "Vale. Te guardo un sitio a mi lado por si cambias de idea. Y si quieres contarme algo, aquí estoy.", "c1-07");
narration("c1-07", "Al recoger, a Sara se le cae el estuche. Laura, su tutora, se agacha a ayudarla. Se ha dado cuenta de que Sara falta más a clase y de que se asusta con cualquier ruido.", "c1-08");
say("c1-08", "Laura", "Te noto más callada estos días. No sé qué te pasa y no quiero adivinarlo. ¿Te apetece que hablemos un rato en un sitio tranquilo?", "c1-choice");
choice("c1-choice", "A Sara le cuesta empezar. ¿Qué dice primero?", [
  option("partial", "«En casa pasan cosas que me dan miedo».", "c1-partial", { opening: "partial" }),
  option("time", "«Necesito un poco de tiempo».", "c1-time", { opening: "time" }),
  option("what", "«Si te cuento algo, ¿qué va a pasar?».", "c1-what", { opening: "what" }),
]);
say("c1-partial", "Laura", "Gracias por contármelo. No tienes que explicarlo todo ahora. Si algo te hace daño, es importante, aunque todavía no sepas cómo decirlo.", "c1-close");
say("c1-time", "Laura", "Podemos ir despacio. Me quedo aquí contigo. Aunque hoy te cueste hablar, mi trabajo es cuidarte y buscar ayuda si algo me preocupa.", "c1-close");
say("c1-what", "Laura", "Te iré contando cada paso. Si creo que estás en peligro, tengo que avisar a las personas que pueden protegerte. Siempre puedes preguntarme a quién se lo digo.", "c1-close");
narration("c1-close", "Sara se sienta. Laura aparta los cuadernos que estaba corrigiendo para escucharla. Por primera vez en toda la mañana, nadie tiene prisa.", "c1-choice2", { scene: "orientation-office" });
choice("c1-choice2", "Antes de seguir, ¿qué le ayudaría a Sara?", [
  option("door", "Pedir que no entre nadie de clase mientras habla.", "c1-door", { schoolPrivacy: true }),
  option("company", "Preguntar si Paula puede esperarla fuera.", "c1-company", { paulaWaiting: true }),
]);
say("c1-door", "Laura", "Hablaremos en un sitio donde nadie nos interrumpa. Si alguien pregunta por ti, no tiene por qué saber lo que me cuentes.", "c2-card");
say("c1-company", "Laura", "Le diremos a Paula que estás conmigo y que saldrás enseguida. Tú decides qué le cuentas luego.", "c2-card");

chapter = 2;
card("c2-card", "Alguien escucha", "En el instituto. Una conversación, paso a paso.", "c2-01", "orientation-office");
say("c2-01", "Sara", "A veces pienso que, si me portara mejor, no pasaría. Pero ayer no hice nada y aun así se enfadó.", "c2-02", { cast: { sara: "sad" } });
say("c2-02", "Laura", "Nada de lo que hagas o digas hace que esté bien que alguien te haga daño. La culpa no es tuya.", "c2-03");
narration("c2-03", "Sara cuenta una parte de lo que pasa en casa. Laura la escucha sin pedirle que lo repita. Después le pregunta si se siente segura al volver a casa.", "c2-04");
say("c2-04", "Sara", "No quiero llegar a casa y que mi padre se entere de repente. Me da miedo lo que pueda hacer.", "c2-05");
say("c2-05", "Laura", "Voy a avisar ahora a la persona que cuida del bienestar en el instituto, a Servicios Sociales y a la Policía. Les contaré también que tienes miedo de volver a casa.", "c2-protection");
explain("c2-protection", "Laura", "protection", "c2-choice");
choice("c2-choice", "¿Qué pregunta Sara mientras Laura busca ayuda?", [
  option("privacy", "«¿Se lo vas a contar a todo el profesorado?».", "c2-privacy", { concernPrivacy: true }),
  option("dad", "«¿Vais a llamar ahora a mi padre?».", "c2-dad", { concernDad: true }),
  option("alone", "«¿Tengo que ir yo a la policía?».", "c2-alone", { concernAlone: true }),
]);
explain("c2-privacy", "Laura", "privacy", "c2-06");
say("c2-dad", "Laura", "No vamos a llamar sin pensar en tu miedo. Las personas que saben de esto decidirán cómo hacerlo para que estés segura. Te iré contando lo que sepa.", "c2-06");
say("c2-alone", "Laura", "No tienes que hacerlo tú sola. Al contármelo, las personas adultas que se encargan de esto ya pueden empezar a ayudarte. Te acompañarán en cada paso.", "c2-06");
narration("c2-06", "Laura hace los avisos sin dejar sola a Sara. Esa tarde, los profesionales organizan con su madre que ella y Dani estén en casa de su tía. Unos días después, conoce a alguien nuevo.", "c2-07");
say("c2-07", "Elena", "Hola, Sara. Me llamo Elena y soy trabajadora social. Voy a acompañarte. También me importa cómo te va en el instituto, con tus amigas y en tu día a día.", "c2-08");
say("c2-08", "Sara", "¿Tengo que contarlo todo otra vez? Ya no me acuerdo ni de cómo empecé.", "c2-09");
say("c2-09", "Elena", "Vamos a intentar que no tengas que repetirlo si no hace falta. Y antes de preguntarte algo, te diré para qué lo necesito.", "c2-choice2");
choice("c2-choice2", "Elena acerca una silla. ¿Cómo prefiere Sara empezar?", [
  option("short", "Una cosa cada vez, con explicaciones cortas.", "c2-short", { shortExplanations: true }),
  option("overview", "Saber primero todo lo que va a pasar.", "c2-overview", { overviewFirst: true }),
]);
say("c2-short", "Elena", "Muy bien. Lo primero: que estés segura. Después iremos viendo lo demás. Si hablo mucho, me lo dices.", "c3-card");
say("c2-overview", "Elena", "Primero vamos a ver cómo está tu familia. Luego buscaremos ayudas para vosotros. Y te explicaremos cada cosa antes de que pase.", "c3-card");

chapter = 3;
card("c3-card", "¿Qué va a pasar conmigo?", "Servicios Sociales. Hacer las preguntas que dan miedo.", "c3-01", "orientation-office");
say("c3-01", "Sara", "Laura dijo que ibais a valorar mi situación. ¿Eso es como un examen?", "c3-02");
say("c3-02", "Elena", "No, no es un examen. Queremos saber qué está pasando y qué ayuda necesitáis. También hablaremos con tu madre y veremos cómo está Dani.", "c3-social");
explain("c3-social", "Elena", "social", "c3-choice");
choice("c3-choice", "Sara tiene muchas preguntas. ¿Cuál hace primero?", [
  option("dani", "«¿Qué va a pasar con Dani?».", "c3-dani", { concernDani: true }),
  option("privacy", "«¿Quién se va a enterar de esto?».", "c3-privacy", { concernPrivacy: true }),
  option("home", "«¿Me tendré que ir de casa?».", "c3-home", { concernHome: true }),
]);
explain("c3-dani", "Elena", "brother", "c3-03");
explain("c3-privacy", "Elena", "privacy", "c3-03");
explain("c3-home", "Elena", "housing", "c3-03");
say("c3-03", "Sara", "Mi madre sabe algunas cosas, pero no todas. A veces me dice que no le lleve la contraria a papá. No sé qué tengo que hacer.", "c3-04");
say("c3-04", "Elena", "Tú no tienes que conseguir que tu padre se porte bien. Eso no es tarea tuya. Tu madre también va a recibir ayuda. Hablaremos contigo a solas para escuchar qué necesitas y qué te preocupa.", "c3-05");
narration("c3-05", "Sara, su madre y Dani siguen en casa de su tía. El equipo ha escuchado a los dos hermanos y revisa cómo protegerlos. Su madre está recibiendo ayuda para poder cuidarlos sin Javier.", "c3-safety-question");
say("c3-safety-question", "Sara", "¿Y si papá viene a buscarme al instituto?", "c3-measures");
explain("c3-measures", "Elena", "safety", "c3-safety-plan");
say("c3-safety-plan", "Elena", "El instituto conoce esas medidas y hemos acordado quién os recoge. Si tu padre intenta acercarse o escribiros, avisa a una persona adulta del equipo. Si hay peligro inmediato, llama al 112.", "c3-safety-followup");
say("c3-safety-followup", "Elena", "Te daré los teléfonos del equipo. Seguiremos mirando si estáis seguros: ir a casa de tu tía es solo una parte del plan. Tú no tienes que vigilar a tu padre ni hacer que cumpla.", "c3-lawyer-intro");
narration("c3-lawyer-intro", "El equipo presenta a Irene, una abogada que defenderá los intereses de Sara. Irene habla con ella y con su madre, también por separado.", "c3-representation");
explain("c3-representation", ABOGADA, "representation", "c3-defender");
explain("c3-defender", ABOGADA, "defender", "c3-party");
explain("c3-party", ABOGADA, "party", "c3-party-warning");
explain("c3-party-warning", ABOGADA, "partyChoice", "c3-party-confirmed");
narration("c3-party-confirmed", "Irene responde a las dudas de Sara y de su madre. Después de escuchar a Sara y hablar de las opciones, su madre formaliza su participación como acusación particular, con la ayuda de Irene.", "c3-06");
say("c3-06", "Sara", "He metido las zapatillas de voleibol en la mochila. No sé si las voy a usar, pero no quería dejarlas.", "c3-07");
say("c3-07", "Elena", "Has hecho bien en traerlas. Podemos hablar de lo que necesitas esta semana, no solo de las citas.", "c3-choice2");
choice("c3-choice2", "¿Qué quiere acordar Sara para los próximos días?", [
  option("contact", "Saber a quién llamar si pasa algo o tiene miedo.", "c3-contact", { wantsContact: true }),
  option("school", "Organizar las clases y los deberes que se ha perdido.", "c3-school", { wantsSchoolPlan: true }),
]);
say("c3-contact", "Elena", "Te daré los teléfonos del equipo y te explicaré qué hacer si algo cambia. Si hay peligro inmediato, se llama al 112. Puedes pedir ayuda aunque no sepas cuánto peligro hay.", "c3-end");
say("c3-school", "Elena", "Lo hablaremos con Laura. Te ayudará a ponerte al día con los deberes, sin contar a la clase lo que te pasa.", "c3-end");
narration("c3-end", "Esa noche, Dani le enseña un dibujo de un dragón. Sara ve una estrella en una esquina y dibuja otra a su lado.", "c3-mesa", { scene: "bedroom-evening", cast: { sara: "smile" } });
// Minijuegos externos: la plataforma los muestra dentro de una nube de pensamiento y luego la historia sigue.
add("c3-mesa", { type: "external", game: "cid-table", text: "Y se quedó pensando en dónde se sentaría dependiendo de la gente que vaya a comer.", next: "c4-card", cast: { sara: "smile" } });

chapter = 4;
card("c4-card", "Mi vida continúa", "Unos días después.", "c4-chat", "patio-day");
chat("c4-chat", "Paula", [
  ["Paula", "hola sara!! te echo de menos en clase", "19:02"],
  ["Paula", "te he guardado los apuntes de mates y de cono", "19:02"],
  ["Sara", "gracias paula", "19:05"],
  ["Sara", "estoy bien. estoy unos días en casa de mi tía", "19:06"],
  ["Paula", "vale. no tienes que contarme nada si no quieres", "19:06"],
  ["Paula", "mañana te los doy en el recreo?", "19:07"],
  ["Sara", "sí. y me siento contigo", "19:08"],
], "c4-01");
say("c4-01", "Paula", "Toma, los apuntes. Los he pasado a limpio con mi mejor letra.", "c4-02");
say("c4-02", "Sara", "Gracias. Me gusta que me hables de otras cosas.", "c4-choice", { cast: { sara: "smile" } });
choice("c4-choice", "Elena le pregunta qué quiere recuperar primero. Sara elige…", [
  option("volleyball", "Volver a entrenar al voleibol.", "c4-volley", { everyday: "volleyball" }),
  option("school", "Ponerse al día en clase.", "c4-school", { everyday: "school" }),
  option("friends", "Quedar con Paula sin hablar siempre de lo mismo.", "c4-friends", { everyday: "friends" }),
]);
say("c4-volley", "Elena", "Podemos empezar con un entrenamiento, sin que tengas que jugar igual que antes. Lo organizaremos con las personas que te cuidan.", "c4-volley2");
say("c4-volley2", "Sara", "Solo quiero oír otra vez el balón contra el suelo. Aunque falle todos los saques.", "c4-dani-route", { cast: { sara: "happy" } });
say("c4-school", "Laura", "Vamos a elegir solo dos tareas para esta semana. Hacerlo todo de golpe sería demasiado. Si un día no te concentras, no pasa nada.", "c4-school2", { scene: "clubroom" });
say("c4-school2", "Sara", "Primero las mates. Si me pierdo en una página, luego no entiendo la siguiente.", "c4-dani-route");
say("c4-friends", "Paula", "Podemos jugar, escuchar música o no decir nada. No tienes que contarme cómo va todo cada vez que quedemos.", "c4-friends2");
say("c4-friends2", "Sara", "Pues hoy quiero que me enseñes la canción nueva que te gusta.", "c4-dani-route", { cast: { sara: "happy" } });
branch("c4-dani-route", { flag: "concernDani" }, "c4-dani", "c4-general");
say("c4-dani", "Elena", "La otra vez te preocupaba mucho Dani. Hay personas que le están escuchando y cuidando. Hoy puedes pensar en ti, y eso no es fallarle.", "c4-info", { learn: ["brother"] });
say("c4-general", "Elena", "Seguimos pendientes de cómo estáis tú, Dani y tu madre. No hace falta que una sola persona cargue con todo.", "c4-info");
explain("c4-info", "Elena", "everyday", "c4-choice2");
choice("c4-choice2", "En clase, un compañero le pregunta por qué ha faltado. ¿Qué quiere hacer Sara?", [
  option("boundary", "Preparar con Paula una respuesta corta.", "c4-boundary", { boundaryWithPaula: true }),
  option("laura", "Pedir a Laura que la ayude a que nadie se entere.", "c4-laura", { schoolPrivacy: true }),
]);
say("c4-boundary", "Paula", "Puedes decir: «He tenido unos asuntos de familia y no quiero hablar de eso». Luego yo cambio de tema. No tienes que explicarle nada a nadie.", "c4-end");
explain("c4-laura", "Laura", "school", "c4-end");
narration("c4-end", "Hay días tranquilos y días más difíciles. Sigue habiendo citas, pero en la agenda de Sara ya hay algo que ha elegido ella.", "c4-perros");
add("c4-perros", { type: "external", game: "caja-arena", text: "Empezó a ver los diferentes perros, y las aventuras que podría vivir con ellos.", next: "c5-card", cast: { sara: "smile" } });

chapter = 5;
card("c5-card", "El tribunal", "Un tiempo después. Saber quién es quién.", "c5-01", "quiet-room");
narration("c5-01", "Después del aviso del instituto y las primeras medidas de protección, una plaza del Tribunal de Instancia sigue investigando lo ocurrido. Llega una carta para que Sara declare. Irene la lee con ella y con su madre.", "c5-02");
say("c5-02", "Sara", "La carta tiene palabras muy raras. No entiendo nada.", "c5-03");
say("c5-03", ABOGADA, "La leemos juntas. Es una citación: dice que tienes que ir al Tribunal de Instancia, qué día y a qué hora. Lo que no entiendas, me lo preguntas.", "c5-justice");
explain("c5-justice", ABOGADA, "justice", "c5-investigation");
explain("c5-investigation", ABOGADA, "investigation", "c5-attend-question");
say("c5-attend-question", "Sara", "¿Tengo que hablar aunque sea mi padre?", "c5-family-rule");
explain("c5-family-rule", ABOGADA, "familyRule", "c5-family-case");
explain("c5-family-case", ABOGADA, "familyCase", "c5-team");
say("c5-team", ABOGADA, "Antes se llamaba juzgado; ahora es el Tribunal de Instancia. Tu caso lo lleva una plaza de su Sección de Violencia contra la Infancia y la Adolescencia. Allí vas a ver a varias personas. Cada una tiene un trabajo distinto. Te las presento para que no te líes.", "c5-oficina");
explain("c5-oficina", ABOGADA, "oficina", "c5-juez");
explain("c5-juez", ABOGADA, "juez", "c5-laj");
explain("c5-laj", ABOGADA, "laj", "c5-fiscal");
explain("c5-fiscal", ABOGADA, "fiscal", "c5-psicosocial");
explain("c5-psicosocial", ABOGADA, "psicosocial", "c5-oavd");
explain("c5-oavd", ABOGADA, "oavd", "c5-choice");
choice("c5-choice", "Antes de ir, ¿qué quiere saber Sara?", [
  option("people", "Quién va a estar en la sala.", "c5-people", { askedProfessionals: true }),
  option("room", "Cómo es la sala y si va a ver a su padre.", "c5-room", { askedRoom: true }),
  option("rights", "Qué puede pedir y a quién se lo dice.", "c5-rights", { askedSupports: true }),
]);
say("c5-people", ABOGADA, "La jueza dirige la declaración y el fiscal cuida también de tus derechos. Yo participo como tu abogada. La defensa de tu padre también puede hacer preguntas, con el control de la jueza. Antes te explicaré cómo.", "c5-people2");
say("c5-people2", "Elena", "Yo no decido nada en el tribunal. Puedo acompañarte si tú quieres, salvo que se explique una razón para que no entre. También podemos acordar que te espere fuera.", "c5-supports");
say("c5-room", ABOGADA, "Tienen que organizar la espera para que no os encontréis. Iremos antes a ver por dónde entras y dónde esperas. Ya hemos hablado con la oficina de víctimas.", "c5-supports");
say("c5-rights", ABOGADA, "Puedes decirme qué te da miedo, preguntar quién va a estar y pedir lo que necesites. Yo se lo diré al tribunal antes de que empiece.", "c5-supports");
explain("c5-supports", ABOGADA, "supports", "c5-company");
explain("c5-company", ABOGADA, "company", "c5-recording-question");
say("c5-recording-question", "Sara", "¿Van a grabarme? ¿Así no tengo que volver?", "c5-recording");
explain("c5-recording", ABOGADA, "recording", "c5-age-rule");
explain("c5-age-rule", ABOGADA, "ageRule", "c5-recording-case");
say("c5-recording-case", ABOGADA, "En tu caso, esta declaración sirve para la investigación. La grabarán, pero eso no sustituye por sí solo declarar en el juicio. Si tienes que volver, te avisaré y prepararemos los apoyos otra vez.", "c5-privacy-route");
branch("c5-privacy-route", { flag: "concernPrivacy" }, "c5-privacy", "c5-pace-route");
say("c5-privacy", "Elena", "Te preocupaba quién se iba a enterar. En la sala solo estarán las personas que tienen que estar. Lo que cuentes allí no se lo dirán a tu clase.", "c5-pace-route");
branch("c5-pace-route", { flag: "shortExplanations" }, "c5-short", "c5-overview");
say("c5-short", "Elena", "Como me pediste, una cosa cada vez. Primero, quién te recibe. Después, qué va a pasar. Entre una cosa y otra, puedes preguntar.", "c5-simulation");
say("c5-overview", "Elena", "Te recibirán y te explicarán qué va a pasar. Luego hablarás con las ayudas que se hayan pedido. Al terminar, veremos juntas qué viene después.", "c5-simulation");
narration("c5-simulation", "Unos días antes, Sara e Irene practican cómo pedir lo que necesita. No hablan de lo que pasó en casa. Solo de cómo decir «no entiendo» o «necesito parar».", "c5-choice2");
choice("c5-choice2", "¿Qué frase quiere recordar Sara para ese día?", [
  option("repeat", "«No lo he entendido. ¿Me lo repites?».", "c5-repeat", { communication: "repeat" }),
  option("memory", "«Eso no me acuerdo bien».", "c5-memory", { communication: "memory" }),
  option("pause", "«Necesito parar un momento».", "c5-pause", { communication: "pause" }),
]);
explain("c5-repeat", ABOGADA, "repeat", "c5-04");
explain("c5-memory", ABOGADA, "memory", "c5-04");
explain("c5-pause", ABOGADA, "pause", "c5-04");
say("c5-04", "Sara", "Pensaba que si me quedaba en blanco lo iba a estropear todo. Me ayuda saber que puedo decir que no entiendo algo.", "c5-communication");
explain("c5-communication", ABOGADA, "communication", "c5-05");
narration("c5-05", "Llega el día. Sara entra por otra puerta, así no se cruza con Javier. Una mujer de la oficina de víctimas la acompaña a una sala con sillones y le explica dónde estará cada persona.", "c5-06");
say("c5-06", "Jueza", "Hola, Sara. Hoy vamos a escucharte para investigar lo que ha pasado. Irene ya te ha explicado por qué tienes que declarar en este caso. Si algo no está claro, lo hablamos antes de empezar.", "c5-07", { scene: "court-friendly" });
narration("c5-07", "Se han acordado los apoyos para Sara. Declara por videoconferencia desde otra sala, sin ver a Javier, con una psicóloga a su lado. La declaración queda grabada. Sara ha preferido que Elena la espere fuera.", "c5-08");
say("c5-08", "Sara", "Estoy cansada. ¿Podemos estar un rato sin hablar de esto?", "c5-09");
say("c5-09", "Elena", "Claro. Otro día Irene te contará lo que quieras saber. Ahora vamos a sentarnos un rato.", "c6-card");

chapter = 6;
card("c6-card", "Después de todo", "Esperar también es parte del camino.", "c6-01", "patio-day");
narration("c6-01", "Pasan las semanas. Algunos días no hay noticias. Mientras, Sara sigue viendo a Elena, y las personas que la ayudan siguen pendientes de que su familia esté a salvo.", "c6-02");
say("c6-02", "Sara", "Todos me dicen «ya te avisaremos». A veces miro el móvil y no sé si quiero que llegue un mensaje o que no llegue.", "c6-choice");
choice("c6-choice", "Hoy, ¿de qué quiere hablar Sara con Elena?", [
  option("news", "Cómo saber qué está pasando en el tribunal.", "c6-news", { waiting: "news" }),
  option("dad", "Que a veces echa de menos a su padre.", "c6-dad", { waiting: "mixed" }),
  option("privacy", "Las preguntas que le hacen en clase.", "c6-school", { waiting: "privacy" }),
]);
explain("c6-news", "Elena", "waiting", "c6-03");
say("c6-dad", "Elena", "Puedes echar de menos los momentos buenos y, a la vez, necesitar estar protegida. No tienes que sentir una sola cosa. Lo que te hizo estuvo mal, aunque le quieras.", "c6-03");
explain("c6-school", "Laura", "school", "c6-03");
chat("c6-msg", "Irene · abogada", [
  ["Irene", "Hola, Sara. Ya ha salido la sentencia.", "17:30"],
  ["Irene", "Mañana te lo explico en persona, con tu madre y con Elena.", "17:30"],
  ["Sara", "vale. tengo un poco de miedo", "17:34"],
  ["Irene", "Es normal. No tienes que hacer nada. Solo venir y preguntar lo que quieras.", "17:35"],
], "resolution-route");
narration("c6-03", "Meses después termina la investigación. Irene se reúne con Sara antes de la siguiente cita.", "c6-investigation-end");
explain("c6-investigation-end", ABOGADA, "investigationEnd", "c6-trial-notice");
say("c6-trial-notice", ABOGADA, "En tu caso, el fiscal y nosotras hemos presentado una acusación contra Javier. Su abogado ha podido defenderlo. Ahora habrá un juicio: otro juez o tribunal escuchará las pruebas antes de decidir.", "c6-trial-question");
say("c6-trial-question", "Sara", "Entonces, la otra vez era para investigar. Ahora van a decidir si hay pruebas para condenarle. ¿Y tengo que volver a hablar?", "c6-trial-supports");
say("c6-trial-supports", ABOGADA, "Sí, te han citado para declarar en el juicio. Hemos vuelto a organizar los apoyos: otra sala, videoconferencia y una psicóloga contigo. También han preparado la espera para que no te cruces con tu padre.", "c6-trial");
narration("c6-trial", "El día del juicio, Sara declara con esos apoyos. El tribunal escucha también las demás pruebas y a las partes. Al terminar, Elena la acompaña a salir. La decisión no depende solo de lo que diga Sara.", "c6-after-trial", { scene: "court-friendly" });
say("c6-after-trial", ABOGADA, "Ahora el tribunal decidirá y lo explicará por escrito. Ese documento es la sentencia. Puede condenar o absolver. Absolver quiere decir que no impone una condena. Cuando llegue, la leeremos juntas.", "c6-sentence-arrives");
narration("c6-sentence-arrives", "Un tiempo después del juicio, el móvil de Sara vibra.", "c6-msg", { scene: "patio-day" });
branch("resolution-route", { eq: [{ flag: "resolution" }, "no-conviction"] }, "c6-no-conviction", "c6-conviction");
say("c6-conviction", ABOGADA, "El tribunal ha condenado a Javier. Te explicaré por qué, qué pena le impone y qué medidas de protección ha decidido. No tienes que entenderlo todo hoy.", "c6-appeal", { learn: ["resolution"] });
say("c6-no-conviction", ABOGADA, "El tribunal ha absuelto a Javier porque no ha encontrado pruebas suficientes para condenarlo. Eso no significa que tú hayas mentido ni que pedir ayuda estuviera mal. Vamos a leer con calma los motivos.", "c6-appeal", { learn: ["resolution"] });
explain("c6-appeal", ABOGADA, "appeal", "c6-protection-after");
explain("c6-protection-after", ABOGADA, "protectionAfter", "c6-human");
say("c6-human", "Sara", "No sé muy bien qué siento. Pensaba que cuando me lo dijeran todo iba a tener sentido de golpe.", "c6-04");
say("c6-04", "Elena", "No tienes que sentirte de ninguna manera concreta. Vamos a ver cómo estás y qué ayuda necesitas. Tu seguridad no depende de cómo te tomes la noticia.", "c6-dani-route");
branch("c6-dani-route", { flag: "concernDani" }, "c6-dani", "c6-home-route");
say("c6-dani", "Elena", "Y sobre Dani: seguimos cuidándole. Tú puedes ser su hermana mayor sin tener que solucionarlo todo.", "c6-home-route");
branch("c6-home-route", { flag: "concernHome" }, "c6-home", "c6-choice2");
say("c6-home", "Elena", "Al principio te preguntabas dónde ibais a vivir. Si algo cambia en casa, lo hablaremos contigo antes. Tu opinión cuenta.", "c6-choice2");
choice("c6-choice2", "Al salir, Sara quiere hacer algo solo para ella. ¿Qué propone?", [
  option("play", "Quedar con Paula y llevar el balón.", "c6-play", { nextPlan: "play" }),
  option("quiet", "Dibujar con Dani y dejar el móvil un rato.", "c6-quiet", { nextPlan: "quiet" }),
]);
say("c6-play", "Paula", "He estado practicando el saque. ¿Jugamos? Y si hoy prefieres solo sentarte a mirar, también me vale.", "epilogue-route");
narration("c6-quiet", "Dani saca el dibujo del dragón. Sara le pide un lápiz azul y pinta el cielo alrededor. Durante un buen rato, solo existen los colores.", "epilogue-route", { scene: "bedroom-evening" });
branch("epilogue-route", { eq: [{ flag: "everyday" }, "volleyball"] }, "epilogue-volley", "epilogue-study-route");
say("epilogue-volley", "Sara", "¿Te acuerdas de que quería volver a entrenar? Hoy el saque ha entrado. Y si mañana no entra, sigo teniendo sitio en el equipo.", "epilogue", { cast: { sara: "happy" } });
branch("epilogue-study-route", { eq: [{ flag: "everyday" }, "school"] }, "epilogue-school", "epilogue-friends");
say("epilogue-school", "Sara", "He terminado aquella página de mates. Parece poca cosa, pero volver a entender algo que había dejado a medias me hace sentir bien.", "epilogue", { cast: { sara: "smile" } });
say("epilogue-friends", "Sara", "Hoy he estado con Paula y no hemos hablado todo el rato de lo mismo. Me ha gustado seguir siendo solo su amiga.", "epilogue", { cast: { sara: "happy" } });
add("epilogue", { type: "ending", kicker: "SARA · MI HISTORIA SIGUE", title: "Todavía tengo planes", text: "Sara sigue siendo hermana, amiga, alumna de tercero y jugadora de voleibol. Habrá días buenos y días difíciles, y no tendrá que pasarlos sola.", scene: "patio-day", cast: { sara: "happy" } });

const titles = ["Algo no va bien", "Alguien escucha", "¿Qué va a pasar conmigo?", "Mi vida continúa", "El tribunal", "Después de todo"];
const guide = {
  version: 1,
  chapters: titles.map((title, i) => ({ id: i + 1, title })),
  steps: [
    [1, "Una señal", "En el instituto se dan cuenta de que algo va mal y escuchan."],
    [2, "Avisar y proteger", "La tutora avisa enseguida a Servicios Sociales y a la Policía. Se organiza un lugar seguro."],
    [3, "Un plan de seguridad", "Se escucha a Sara y a Dani. La jueza acuerda medidas y el equipo revisa cómo están."],
    [3, "Quién defiende a Sara", "Su madre la representa en este caso. Irene es su abogada y actúa como acusación particular."],
    [4, "Seguir viviendo", "Clases, amigas y voleibol también importan."],
    [5, "Investigar lo ocurrido", "Irene explica la citación, quién participa y por qué Sara tiene que declarar en este caso."],
    [5, "Declarar con apoyos", "Se evita el encuentro con Javier. La declaración se graba; eso solo no sustituye hablar en el juicio."],
    [6, "Terminar la investigación", "Puede haber un archivo o una acusación. En esta historia, el caso pasa a juicio."],
    [6, "El juicio", "Otro juez o tribunal escucha las pruebas. Sara vuelve a declarar con apoyos."],
    [6, "La sentencia y después", "Irene explica el resultado, los posibles recursos y qué medidas siguen. El apoyo continúa según sus necesidades."],
  ].map(([chapter, title, text]) => ({ chapter, title, text })),
  people: [
    { name: "Sara", role: "14 años · 3.º de ESO", initial: "S", color: "peach", text: "Le gusta el voleibol, dibuja estrellas en sus cuadernos y su mejor amiga es Paula. Su vida es mucho más que lo que pasa en el tribunal.", sprite: "assets/characters/sara/smile.svg" },
    { name: "Paula", role: "Su mejor amiga", initial: "P", color: "pink", text: "Le hace compañía y le guarda los apuntes. No tiene que investigar ni arreglar nada." },
    { name: "Laura", role: "Tutora", initial: "L", color: "green", text: "Escucha a Sara, se da cuenta de que algo va mal y avisa a quien tiene que avisar." },
    { name: "Elena", role: "Trabajadora social", initial: "E", color: "purple", text: "Acompaña a Sara en su día a día y organiza las ayudas. No decide nada en el tribunal." },
    { name: "Irene", role: "Abogada", initial: "I", color: "blue", text: "Le explica a Sara cada paso y defiende sus intereses. Javier tiene su propio abogado." },
    { name: "Oficina judicial", role: "Tribunal de Instancia", initial: "O", color: "green", text: legal.notes.oficina.text },
    { name: "Jueza", role: "Juez o magistrado", initial: "J", color: "purple", text: legal.notes.juez.text },
    { name: "Letrada (LAJ)", role: "Letrado de la Administración de Justicia", initial: "L", color: "blue", text: legal.notes.laj.text },
    { name: "Fiscal", role: "Ministerio Fiscal", initial: "F", color: "green", text: legal.notes.fiscal.text },
    { name: "Equipo psicosocial", role: "Psicólogos y trabajadores sociales del Tribunal de Instancia", initial: "+", color: "peach", text: legal.notes.psicosocial.text },
    { name: "OAVD", role: "Oficina de Asistencia a las Víctimas del Delito", initial: "V", color: "pink", text: legal.notes.oavd.text },
    { name: "Su familia", role: "Dani, su madre y Javier", initial: "D", color: "peach", text: "Dani tiene diez años. Su madre también recibe ayuda. Javier, el padre, es responsable de lo que hace; Sara no tiene que cambiarle para merecer protección." },
  ],
};
const shared = JSON.parse(await readFile(new URL("../public/content/shared/assets.json", import.meta.url), "utf8"));
for (const [id, bg] of Object.entries(shared.backgrounds)) bg.src = `backgrounds/${id}.svg`;
nodes["c4-choice2"].scene = "hallway-day";
const sceneNames = ["classroom-day", "orientation-office", "bedroom-evening", "patio-day", "quiet-room", "school-exterior", "clubroom", "hallway-day", "court-friendly"];
const scenes = { version: 1, stage: { width: 1920, height: 1080 }, presets: { positions: { center: { x: .5, y: 1, scale: 1 } }, transitions: { fade: { type: "fade", duration: 300 } } }, scenes: {} };
for (const id of sceneNames) scenes.scenes[id] = { layers: [{ id: "background", type: "image", asset: `backgrounds/${id === "school-exterior" ? "patio-day" : id === "court-friendly" ? "quiet-room" : id}`, fit: "cover" }] };
const manifest = { version: 1, id: "sara", title: "Sara · Mi historia sigue", content: { story: "story.json", assets: "assets.json", scenes: "scene.json" }, stage: { width: 1920, height: 1080 }, start: { node: "start", scene: "school-exterior" }, save: { key: "sara.save", version: 1 } };
for (const [name, value] of Object.entries({ "story.json": { version: 1, start: "start", initialFlags: { resolution: "conviction" }, nodes }, "guide.json": guide, "assets.json": shared, "scene.json": scenes, "novel.json": manifest })) await writeFile(new URL(name, dir), JSON.stringify(value, null, 2) + "\n");
console.log(`Sara: ${Object.keys(nodes).length} nodes, six chapters. Legal source: legal.json.`);
