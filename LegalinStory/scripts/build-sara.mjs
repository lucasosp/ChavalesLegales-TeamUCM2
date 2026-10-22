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

card("start", "Algo no va bien", "El lunes. Un saque que no sale.", "c1-01", "school-exterior");
narration("c1-01", "Sara tiene quince años, juega al voleibol y dibuja estrellas en los márgenes de sus apuntes. Le queda una por terminar cuando suena el timbre de cuarto de ESO.", "c1-02", { scene: "classroom-day" });
say("c1-02", "Paula", "Esta tarde practicamos el saque. El mío está saliendo más hacia la puerta que hacia la pista.", "c1-03");
say("c1-03", "Sara", "El mío también podría presentarse a delegado de pasillo. Pero hoy… creo que no voy.", "c1-04", { cast: { sara: "smile" } });
narration("c1-04", "En casa, Javier, su padre, revisa sus mensajes y decide a quién puede ver. La insulta cuando algo no le gusta. Algunas veces la ha empujado o golpeado. No mostramos esas escenas.", "c1-05", { cast: { sara: "sad" } });
thought("c1-05", "Ayer me quitó el móvil otra vez. Dani estaba en la otra habitación. Solo tiene diez años. No sé cuánto escuchó.", "c1-06");
say("c1-06", "Paula", "Vale. Si cambias de idea, te guardo sitio. Y si quieres contarme algo, también.", "c1-07");
narration("c1-07", "Al recoger, Sara deja caer su estuche. Laura, su profesora, se agacha a ayudarla. Ha notado sus ausencias y que últimamente se sobresalta con facilidad.", "c1-08");
say("c1-08", "Laura", "Te veo más callada estos días. No sé qué te pasa y no quiero adivinarlo. ¿Te vendría bien hablar un momento en un lugar tranquilo?", "c1-choice");
choice("c1-choice", "A Sara le cuesta empezar. ¿Qué necesita decir primero?", [
  option("partial", "«En casa pasan cosas que me dan miedo».", "c1-partial", { opening: "partial" }),
  option("time", "«Necesito un poco de tiempo».", "c1-time", { opening: "time" }),
  option("what", "«Si te cuento algo, ¿qué va a pasar?».", "c1-what", { opening: "what" }),
]);
say("c1-partial", "Laura", "Gracias por decírmelo. No tienes que explicarlo todo ahora. Lo que te hace daño merece atención, aunque todavía no sepas cómo llamarlo.", "c1-close");
say("c1-time", "Laura", "Podemos ir despacio. Me quedaré aquí contigo. Aunque hoy te cueste hablar, mi responsabilidad es atender las señales que me preocupan y buscar ayuda.", "c1-close");
say("c1-what", "Laura", "Te iré explicando los pasos. Si creo que puedes estar en peligro, tengo que pedir ayuda a quienes pueden protegerte. Puedes preguntarme qué voy a comunicar.", "c1-close");
narration("c1-close", "Sara se sienta. Laura aparta los exámenes para escucharla. Por primera vez esa mañana, nadie parece tener prisa por terminar la conversación.", "c1-choice2", { scene: "orientation-office" });
choice("c1-choice2", "Antes de seguir, ¿qué le ayudaría a Sara?", [
  option("door", "Pedir que no entren compañeros mientras habla.", "c1-door", { schoolPrivacy: true }),
  option("company", "Preguntar si Paula puede esperarla fuera.", "c1-company", { paulaWaiting: true }),
]);
say("c1-door", "Laura", "Buscaremos un espacio donde podamos hablar con intimidad. Si alguien pregunta por ti, no tiene por qué conocer tu historia.", "c2-card");
say("c1-company", "Laura", "Le diremos que estás acompañada y que saldrás cuando terminemos. Tú puedes decidir qué quieres contarle después.", "c2-card");

chapter = 2;
card("c2-card", "Alguien escucha", "En el instituto. Una conversación, paso a paso.", "c2-01", "orientation-office");
say("c2-01", "Sara", "A veces pienso que si hubiera contestado de otra forma… Pero ayer no hice nada. Y aun así se enfadó.", "c2-02", { cast: { sara: "sad" } });
say("c2-02", "Laura", "Nada de lo que digas justifica que alguien te haga daño. No tienes que encontrar la frase perfecta para que te ayudemos.", "c2-03");
narration("c2-03", "Sara cuenta una parte de lo ocurrido. Laura escucha sin pedirle que repita los detalles. Le pregunta por su seguridad al salir del instituto.", "c2-04");
say("c2-04", "Sara", "No quiero volver a casa y que él se entere de golpe. Me da miedo lo que pueda pasar.", "c2-05");
say("c2-05", "Laura", "Lo tendremos en cuenta antes de contactar con nadie. Voy a hablar con la coordinación de bienestar y a comunicar la situación a los servicios que deben intervenir.", "c2-protection");
explain("c2-protection", "Laura", "protection", "c2-choice");
choice("c2-choice", "¿Qué pregunta Sara mientras Laura organiza la ayuda?", [
  option("privacy", "«¿Se lo contarás a todo el profesorado?».", "c2-privacy", { concernPrivacy: true }),
  option("dad", "«¿Vais a llamar ahora mismo a mi padre?».", "c2-dad", { concernDad: true }),
  option("alone", "«¿Tengo que ir yo a denunciar?».", "c2-alone", { concernAlone: true }),
]);
explain("c2-privacy", "Laura", "privacy", "c2-06");
say("c2-dad", "Laura", "No vamos a improvisar una llamada ignorando tu miedo. Los profesionales coordinarán cómo actuar de forma segura. Te explicaré lo que sepamos.", "c2-06");
say("c2-alone", "Laura", "No tienes que organizarlo tú sola. Pedir ayuda aquí ya permite que las personas responsables actúen. Te acompañarán y te explicarán las actuaciones que correspondan.", "c2-06");
narration("c2-06", "El centro coordina la atención con los servicios de protección. La seguridad se atiende desde el principio. Esta historia reúne varios encuentros; no representa un calendario obligatorio.", "c2-07");
say("c2-07", "Irene", "Hola, Sara. Soy Irene, trabajadora social. Voy a acompañarte junto con el equipo. Mi trabajo también tiene que ver con cómo estás en clase, con tus amigas y en tu día a día.", "c2-08");
say("c2-08", "Sara", "¿Tendré que contarlo entero otra vez? No sé ni por dónde he empezado antes.", "c2-09");
say("c2-09", "Irene", "Intentaremos coordinarnos para que no tengas que repetirlo sin necesidad. Antes de preguntarte algo, puedo explicarte para qué lo necesitamos.", "c2-choice2");
choice("c2-choice2", "Irene acerca una silla. ¿Cómo prefiere Sara que empiecen?", [
  option("short", "Una cosa cada vez, con explicaciones cortas.", "c2-short", { shortExplanations: true }),
  option("overview", "Ver primero el recorrido general.", "c2-overview", { overviewFirst: true }),
]);
say("c2-short", "Irene", "De acuerdo. Primero: atender tu seguridad. Después iremos viendo los siguientes pasos. Si me enrollo, puedes decírmelo.", "c3-card");
say("c2-overview", "Irene", "Miraremos tu situación familiar, organizaremos apoyos y te explicaremos las actuaciones que se inicien. Puedes abrir el mapa cuando necesites ubicarte.", "c3-card");

chapter = 3;
card("c3-card", "¿Qué va a pasar conmigo?", "Servicios Sociales. Poner nombre a las preocupaciones.", "c3-01", "orientation-office");
say("c3-01", "Sara", "¿Valorar mi situación significa que me vais a poner una nota? Porque últimamente no saco muy buenas.", "c3-02");
say("c3-02", "Irene", "Ninguna nota. Queremos conocer qué está pasando, qué riesgos hay y qué ayuda necesitáis. También escucharemos a tu madre y valoraremos cómo está Dani.", "c3-social");
explain("c3-social", "Irene", "social", "c3-choice");
choice("c3-choice", "Sara tiene muchas preguntas. ¿Cuál hace primero?", [
  option("dani", "«¿Qué va a pasar con Dani?».", "c3-dani", { concernDani: true }),
  option("privacy", "«¿Quién va a conocer mi historia?».", "c3-privacy", { concernPrivacy: true }),
  option("home", "«¿Tendré que abandonar mi casa?».", "c3-home", { concernHome: true }),
]);
explain("c3-dani", "Irene", "brother", "c3-03");
explain("c3-privacy", "Irene", "privacy", "c3-03");
explain("c3-home", "Irene", "housing", "c3-03");
say("c3-03", "Sara", "Mi madre sabe algunas cosas, pero no todas. A veces me dice que intente no discutir. No sé qué espera que haga.", "c3-04");
say("c3-04", "Irene", "Tú no eres responsable de controlar la conducta de Javier. Tu madre también necesita apoyo. La seguridad de cada uno se valora por separado y en conjunto.", "c3-05");
narration("c3-05", "En este caso ficticio se organiza una estancia segura con su madre y Dani, en casa de una tía, mientras los profesionales valoran las medidas. Sara conserva el contacto con su instituto.", "c3-06");
say("c3-06", "Sara", "He metido las zapatillas de voleibol en la mochila. No sé si las voy a usar, pero no quería dejarlas.", "c3-07");
say("c3-07", "Irene", "Me parece importante que las hayas traído. Podemos hablar de lo que necesitas esta semana, además de las citas.", "c3-choice2");
choice("c3-choice2", "¿Qué le gustaría acordar a Sara para los próximos días?", [
  option("contact", "Saber a quién avisar si cambia algo o siente miedo.", "c3-contact", { wantsContact: true }),
  option("school", "Organizar las faltas y las tareas del instituto.", "c3-school", { wantsSchoolPlan: true }),
]);
say("c3-contact", "Irene", "Dejaremos claros los contactos del equipo y qué hacer si cambia la situación. Si hay peligro inmediato, se pide ayuda de emergencia. No tienes que valorar tú sola si todo está bien.", "c3-end");
say("c3-school", "Irene", "Lo coordinaremos con Laura. Pediremos ajustes concretos, como organizar entregas y recuperar apuntes, sin explicar tu historia a toda la clase.", "c3-end");
narration("c3-end", "Esa noche Dani le pide que mire un dibujo de un dragón. Sara encuentra una estrella en la esquina y dibuja otra al lado. Todavía hay sitio para cosas pequeñas.", "c3-mesa", { scene: "bedroom-evening", cast: { sara: "smile" } });
// Minijuegos externos: la plataforma los muestra dentro de una nube de pensamiento y luego la historia sigue.
add("c3-mesa", { type: "external", game: "cid-table", text: "Y se quedó pensando en dónde se sentaría dependiendo de la gente que vaya a comer.", next: "c4-card", cast: { sara: "smile" } });

chapter = 4;
card("c4-card", "Mi vida continúa", "Días después. Fuera de las entrevistas.", "c4-perros", "patio-day");
add("c4-perros", { type: "external", game: "caja-arena", text: "Empezó a ver los diferentes perros, y las aventuras que podría vivir con ellos.", next: "c4-01", cast: { sara: "smile" } });
say("c4-01", "Paula", "He guardado tus apuntes. También un vídeo de mi peor saque, pero eso requiere un pacto de silencio.", "c4-02");
say("c4-02", "Sara", "Los apuntes sí. El vídeo… me lo pienso. Me viene bien que me hables de otras cosas.", "c4-choice", { cast: { sara: "smile" } });
choice("c4-choice", "Irene pregunta qué parte de su vida quiere recuperar primero. Sara elige…", [
  option("volleyball", "Volver a entrenar al voleibol.", "c4-volley", { everyday: "volleyball" }),
  option("school", "Recuperar el ritmo de las clases.", "c4-school", { everyday: "school" }),
  option("friends", "Quedar con Paula sin hablar siempre del proceso.", "c4-friends", { everyday: "friends" }),
]);
say("c4-volley", "Irene", "Podemos empezar por un entrenamiento, sin exigirte que juegues como antes. Acordaremos los detalles prácticos con las personas que te cuidan.", "c4-volley2");
say("c4-volley2", "Sara", "Solo quiero volver a escuchar el balón contra el suelo y pensar en dónde colocarme. Aunque falle todos los saques.", "c4-dani-route", { cast: { sara: "happy" } });
say("c4-school", "Laura", "Vamos a elegir dos tareas para esta semana. Recuperarlo todo de golpe sería demasiado. Que un día no puedas concentrarte no significa que hayas dejado de saber.", "c4-school2", { scene: "clubroom" });
say("c4-school2", "Sara", "Las mates primero. Si dejo de entender una página, la siguiente parece escrita en otro idioma.", "c4-dani-route");
say("c4-friends", "Paula", "Podemos pasear, hablar de música o no decir mucho. No hace falta que cada vez que quedemos me pongas al día de todo.", "c4-friends2");
say("c4-friends2", "Sara", "Entonces hoy quiero discutir contigo sobre esa playlist. En eso sí me siento preparada.", "c4-dani-route", { cast: { sara: "happy" } });
branch("c4-dani-route", { flag: "concernDani" }, "c4-dani", "c4-general");
say("c4-dani", "Irene", "La última vez te preocupaba mucho Dani. El equipo también está escuchando lo que él necesita. Hoy puedes ocuparte de tu plan sin sentir que le estás fallando.", "c4-info", { learn: ["brother"] });
say("c4-general", "Irene", "Seguimos revisando cómo estáis tú, Dani y tu madre. No hace falta que una sola persona se encargue de las preocupaciones de toda la familia.", "c4-info");
explain("c4-info", "Irene", "everyday", "c4-choice2");
choice("c4-choice2", "En el instituto alguien pregunta por sus ausencias. ¿Qué quiere Sara?", [
  option("boundary", "Preparar una respuesta breve con Paula.", "c4-boundary", { boundaryWithPaula: true }),
  option("laura", "Pedir a Laura que la ayude a cuidar su privacidad.", "c4-laura", { schoolPrivacy: true }),
]);
say("c4-boundary", "Paula", "Puedes decir: «Estoy resolviendo unas cosas con ayuda y no quiero hablar de ello». Si quieres, cambio de tema después. No tienes que dar explicaciones para estar con nosotras.", "c4-end");
explain("c4-laura", "Laura", "school", "c4-end");
narration("c4-end", "Hay días tranquilos y otros que cuestan más. Las citas continúan, pero Sara ya tiene algo en la agenda que no es una entrevista: un plan que ha elegido ella.", "c5-card");

chapter = 5;
card("c5-card", "El juzgado", "Tiempo después. Saber dónde estoy.", "c5-01", "quiet-room");
narration("c5-01", "Se ha abierto una investigación penal sobre lo ocurrido. La abogada explica una citación a Sara y a quienes la acompañan. Esta escena resume distintas actuaciones, sin fijar sus plazos.", "c5-02");
say("c5-02", "Sara", "La carta parecía escrita para alguien que ya sabe cómo funciona todo. Yo no sé ni dónde sentarme.", "c5-03");
say("c5-03", "Elena · abogada", "La leemos juntas. Una citación indica que debes acudir a una actuación: hay que comprobar para qué, dónde y con qué apoyos. Si algo no se entiende, lo preguntamos antes.", "c5-justice");
explain("c5-justice", "Elena · abogada", "justice", "c5-choice");
choice("c5-choice", "Antes de la actuación, ¿qué quiere conocer Sara?", [
  option("people", "Quién estará y qué hace cada profesional.", "c5-people", { askedProfessionals: true }),
  option("room", "Cómo es el espacio y si tendrá que ver a su padre.", "c5-room", { askedRoom: true }),
  option("rights", "Qué apoyos puede pedir y a quién se los dice.", "c5-rights", { askedSupports: true }),
]);
say("c5-people", "Elena · abogada", "La jueza dirige la actuación. Fiscalía interviene para promover la acción de la justicia. Las abogadas y abogados defienden los intereses de sus representados. Yo te explicaré quién está y por qué.", "c5-people2");
say("c5-people2", "Irene", "Mi función es acompañarte en lo socioeducativo y coordinar apoyos. No decido la sentencia. Puedes abrir las fichas de profesionales cuando se te mezclen los nombres.", "c5-supports");
say("c5-room", "Elena · abogada", "Antes de ir comprobaremos dónde esperarás y cómo será la actuación. Plantearemos lo que te preocupa sobre encontrarte con tu padre para que se valoren las medidas adecuadas.", "c5-supports");
say("c5-rights", "Elena · abogada", "Puedes explicarme qué necesitas, preguntar quién estará y avisar de lo que te hace sentir insegura. Lo comunicaremos para que se valore antes de la actuación.", "c5-supports");
explain("c5-supports", "Elena · abogada", "supports", "c5-privacy-route");
branch("c5-privacy-route", { flag: "concernPrivacy" }, "c5-privacy", "c5-pace-route");
say("c5-privacy", "Irene", "Te preocupaba quién iba a conocer tu historia. Por eso hoy repasamos quién puede estar en esta actuación. La intimidad se cuida también al organizar el espacio y la información.", "c5-pace-route");
branch("c5-pace-route", { flag: "shortExplanations" }, "c5-short", "c5-overview");
say("c5-short", "Irene", "Como me pediste, una cosa cada vez: primero vemos quién te recibe. Después, qué va a pasar. Y podemos parar para preguntar entre una cosa y otra.", "c5-simulation");
say("c5-overview", "Irene", "Primero te recibirán y explicarán la actuación; después podrás intervenir con los apoyos que se hayan acordado. Al terminar, revisaremos qué viene después.", "c5-simulation");
narration("c5-simulation", "Antes de la actuación, practican cómo comunicar una necesidad. No ensayan lo que Sara contará ni hacen preguntas sobre la violencia. En este pequeño ejercicio no hay respuestas que den más puntos.", "c5-choice2");
choice("c5-choice2", "¿Qué frase quiere recordar Sara para expresar lo que necesita durante la actuación?", [
  option("repeat", "«No lo he entendido. ¿Puedes repetirlo?».", "c5-repeat", { communication: "repeat" }),
  option("memory", "«Ese dato no lo recuerdo con exactitud».", "c5-memory", { communication: "memory" }),
  option("pause", "«Necesito una pausa».", "c5-pause", { communication: "pause" }),
]);
explain("c5-repeat", "Elena · abogada", "repeat", "c5-04");
explain("c5-memory", "Elena · abogada", "memory", "c5-04");
explain("c5-pause", "Elena · abogada", "pause", "c5-04");
say("c5-04", "Sara", "Pensaba que si me quedaba en blanco iba a estropearlo todo. Me ayuda saber que puedo decir que no entiendo algo.", "c5-05");
narration("c5-05", "Llega el día. En este caso, se ha acordado una organización para evitar que Sara se encuentre con Javier en la espera y durante su intervención. El personal le explica dónde estará cada persona.", "c5-06");
say("c5-06", "Jueza", "Antes de empezar, vamos a comprobar que entiendes para qué estamos aquí. Si no comprendes algo, puedes decirlo.", "c5-07", { scene: "court-friendly" });
narration("c5-07", "Sara participa en la actuación con las medidas acordadas. La historia deja fuera las preguntas sobre lo sucedido. Al terminar, Irene la espera para acompañarla.", "c5-08");
say("c5-08", "Sara", "Estoy cansada. ¿Podemos estar un rato sin hablar de esto?", "c5-09");
say("c5-09", "Irene", "Sí. Después revisaremos con Elena la información que necesites. Ahora podemos sentarnos un momento.", "c6-card");

chapter = 6;
card("c6-card", "Después de todo", "La espera también forma parte del camino.", "c6-01", "patio-day");
narration("c6-01", "El procedimiento sigue su curso. Hay días sin novedades. Mientras se practican las actuaciones necesarias, continúan las citas de apoyo y la atención a la seguridad de la familia.", "c6-02");
say("c6-02", "Sara", "Todo el mundo dice «te avisaremos». A veces miro el móvil y no sé si quiero un mensaje o que no haya ninguno.", "c6-choice");
choice("c6-choice", "Hoy, ¿qué quiere poner Sara sobre la mesa?", [
  option("news", "Preguntar cómo puede saber en qué punto está el procedimiento.", "c6-news", { waiting: "news" }),
  option("dad", "Decir que a veces echa de menos a su padre.", "c6-dad", { waiting: "mixed" }),
  option("privacy", "Pedir ayuda con las preguntas que le hacen en el instituto.", "c6-school", { waiting: "privacy" }),
]);
explain("c6-news", "Irene", "waiting", "c6-03");
say("c6-dad", "Irene", "Puedes echar de menos momentos buenos y, a la vez, necesitar estar protegida. No tienes que sentir una sola cosa por tu padre. Hablarlo no cambia que lo que te hizo estuvo mal.", "c6-03");
explain("c6-school", "Laura", "school", "c6-03");
narration("c6-03", "Tiempo después, tras las actuaciones y el juicio, Elena se reúne con Sara para explicar una sentencia simulada. El resultado de esta demo está fijado antes de jugar: ninguna elección emocional decide la resolución.", "resolution-route");
branch("resolution-route", { eq: [{ flag: "resolution" }, "no-conviction"] }, "c6-no-conviction", "c6-conviction");
say("c6-conviction", "Elena · abogada", "En este caso ficticio, el tribunal ha considerado probados hechos de violencia y ha dictado una sentencia condenatoria contra Javier. Vamos a explicar su alcance, las medidas acordadas y si cabe recurrir.", "c6-human", { learn: ["resolution"] });
say("c6-no-conviction", "Elena · abogada", "En esta variante ficticia, el tribunal ha dictado una sentencia absolutoria: la prueba no ha permitido una condena con las garantías necesarias. Te explicaré la resolución y las posibilidades de recurso que correspondan.", "c6-human", { learn: ["resolution"] });
say("c6-human", "Sara", "No sé muy bien qué siento. Pensaba que al leer una resolución todo iba a encajar de golpe.", "c6-04");
say("c6-04", "Irene", "No tienes que sentirte de una manera concreta. Vamos a revisar cómo estás y qué apoyo necesitas. La protección y la convivencia se valoran por vuestra seguridad, no por cómo recibas la noticia.", "c6-dani-route");
branch("c6-dani-route", { flag: "concernDani" }, "c6-dani", "c6-home-route");
say("c6-dani", "Irene", "Y retomaremos lo que preguntaste por Dani: el equipo sigue pendiente de él. Puedes ser su hermana sin tener que convertirte en la persona adulta que resuelve todo.", "c6-home-route");
branch("c6-home-route", { flag: "concernHome" }, "c6-home", "c6-choice2");
say("c6-home", "Irene", "Al principio te preguntabas dónde ibais a vivir. Cualquier cambio de convivencia se revisará contigo y con el equipo responsable. La sentencia no sustituye esa valoración.", "c6-choice2");
choice("c6-choice2", "Al salir, Sara quiere reservar espacio para algo suyo. ¿Qué propone?", [
  option("play", "Quedar con Paula y llevar el balón.", "c6-play", { nextPlan: "play" }),
  option("quiet", "Ir con Dani a dibujar y dejar el móvil un rato.", "c6-quiet", { nextPlan: "quiet" }),
]);
say("c6-play", "Paula", "He practicado el saque. Ahora ya casi nunca sale por la puerta. Pero si hoy prefieres solo sentarte en la grada, también me sirve.", "epilogue-route");
narration("c6-quiet", "Dani saca el dibujo del dragón. Sara le pide un lápiz azul. Durante un rato, lo más urgente es decidir si los dragones pueden llevar zapatillas.", "epilogue-route", { scene: "bedroom-evening" });
branch("epilogue-route", { eq: [{ flag: "everyday" }, "volleyball"] }, "epilogue-volley", "epilogue-study-route");
say("epilogue-volley", "Sara", "¿Te acuerdas de cuando dije que quería volver a entrenar? Hoy el saque ha entrado. Y si mañana no entra, sigo teniendo sitio en el equipo.", "epilogue", { cast: { sara: "happy" } });
branch("epilogue-study-route", { eq: [{ flag: "everyday" }, "school"] }, "epilogue-school", "epilogue-friends");
say("epilogue-school", "Sara", "He terminado aquella página de mates. Parece una tontería, pero volver a entender algo que había dejado a medias también cuenta.", "epilogue", { cast: { sara: "smile" } });
say("epilogue-friends", "Sara", "Hoy he estado con Paula y no hemos hablado todo el rato de lo mismo. Me ha sentado bien seguir siendo su amiga, con todas las cosas que eso significa.", "epilogue", { cast: { sara: "happy" } });
add("epilogue", { type: "ending", kicker: "SARA · MI HISTORIA SIGUE", title: "Todavía tengo planes", text: "Sara sigue siendo hermana, amiga, estudiante y jugadora de voleibol. Habrá días distintos y el apoyo puede continuar. No tiene que recorrerlos sola.", scene: "patio-day", cast: { sara: "happy" } });

const titles = ["Algo no va bien", "Alguien escucha", "¿Qué va a pasar conmigo?", "Mi vida continúa", "El juzgado", "Después de todo"];
const guide = {
  version: 1,
  chapters: titles.map((title, i) => ({ id: i + 1, title })),
  steps: [
    [1, "Una señal", "El centro escucha y atiende indicios de violencia."],
    [2, "Pedir ayuda", "El personal coordina la comunicación y los apoyos para proteger."],
    [3, "Valorar y proteger", "Servicios Sociales y protección de menores valoran necesidades y seguridad."],
    [4, "Seguir viviendo", "Acompañamiento socioeducativo: clases, vínculos y actividades."],
    [5, "Entender la citación", "Se explica para qué es la actuación y quién interviene."],
    [5, "Participar con apoyos", "Se valoran medidas para la declaración. La demo omite las preguntas sobre violencia."],
    [6, "Esperar información", "El procedimiento continúa. Los tiempos y actuaciones varían."],
    [6, "Resolución y continuidad", "Se explica la resolución. Los apoyos se revisan según las necesidades."],
  ].map(([chapter, title, text]) => ({ chapter, title, text })),
  people: [
    { name: "Sara", role: "15 años · 4.º de ESO", initial: "S", color: "peach", text: "Le gusta el voleibol, dibuja en los márgenes y tiene una amiga llamada Paula. Su vida es más amplia que el procedimiento.", sprite: "assets/characters/sara/smile.svg" },
    { name: "Paula", role: "Su mejor amiga", initial: "P", color: "pink", text: "Ofrece compañía y conserva los planes compartidos. No tiene que investigar ni resolver la situación." },
    { name: "Laura", role: "Profesora", initial: "L", color: "green", text: "Escucha, atiende señales y coordina la comunicación mediante el protocolo del centro. No investiga delitos." },
    { name: "Irene", role: "Trabajadora social", initial: "I", color: "purple", text: "Acompaña la vida cotidiana y coordina apoyos con el equipo. No dicta medidas judiciales ni sentencias." },
    { name: "Elena", role: "Abogada", initial: "E", color: "blue", text: "Asesora a Sara, explica las actuaciones y defiende sus intereses. La defensa de Javier corresponde a otro profesional." },
    { name: "Jueza", role: "Autoridad judicial", initial: "J", color: "purple", text: "Dirige las actuaciones que le corresponden y adopta decisiones con las garantías del procedimiento." },
    { name: "Fiscalía", role: "Ministerio Fiscal", initial: "F", color: "green", text: "Promueve la acción de la justicia y vela por la legalidad y los derechos. Que Sara sea menor no convierte la causa contra su padre en justicia penal de menores." },
    { name: "Equipo de apoyo", role: "Servicios Sociales y atención a víctimas", initial: "+", color: "blue", text: "Sus funciones son distintas: la protección de menores valora la seguridad familiar; la asistencia a víctimas informa y ofrece apoyos en el proceso." },
    { name: "Su familia", role: "Dani, su madre y Javier", initial: "D", color: "peach", text: "Dani tiene diez años. Su madre también recibe apoyo. Javier, el padre, es responsable de su conducta; Sara no tiene que cambiarla para merecer protección." },
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
