"""Catálogo de nodos genéricos, derivado de la historia actual de Sara (6 capítulos, 5 grupos).

Cada nodo es una pieza reutilizable con etiquetas genéricas. `fuente` apunta a los nodos de
LegalinStory/public/content/stories/sara/story.json en los que se basa (trazabilidad).

Marcadores de texto: {nombre} (se sustituye al final y NUNCA se guarda ni se envía al LLM) y
{o} (o/a/e según el sexo). Los textos legales son un borrador basado en las notas de la historia
actual: están pendientes de revisión jurídica antes de usarse con menores reales.

Grupos:  1 contexto inicial · 2 nudo y minijuegos · 3 desarrollo intermedio
         4 LEGALIDAD: enmarcado legal · 5 LEGALIDAD: cierre del proceso
"""
from dataclasses import dataclass, field

# Taxonomía de etiquetas (todo lo que el LLM o el catálogo pueden decir)
CONTEXTOS = ("violencia_familiar", "ciberacoso", "suplantacion", "grooming", "control_pareja", "privacidad", "otro")
DIGITALES = ("ciberacoso", "suplantacion", "grooming", "control_pareja", "privacidad")
TEMAS = (
    "rutina", "colegio", "amistad", "confianza", "escucha", "senales", "privacidad", "movil", "miedo",
    "familia", "casa", "hermanos", "proteccion", "derechos", "apoyo", "autoimagen", "expresion", "distancia",
    "calma", "deporte", "emociones", "futuro", "esperanza", "roles", "tribunal", "declaracion", "apoyos",
    "espera", "proceso", "juicio", "sentencia", "recurso", "legalidad",
)
LUGARES = ("colegio", "despacho", "casa", "casa_segura", "tribunal")
TENSIONES = ("baja", "media", "alta")
FOCOS = ("yo", "familia", "proceso")
APOYOS = ("ninguno", "tutoria", "trabajo_social", "abogacia")
CLAVES_DE_ESTADO = ("lugar", "tension", "foco", "apoyo")  # las que los nodos sobreescriben


@dataclass(frozen=True)
class Opcion:
    id: str
    etiqueta: str
    respuesta: dict           # {"under_11": ..., "over_11": ...}
    fija: dict = field(default_factory=dict)


@dataclass(frozen=True)
class Nodo:
    id: str
    grupo: int
    tipo: str                 # narracion | dialogo | eleccion | minijuego
    orden: int                # posición dentro del grupo
    texto: dict               # {"under_11": ..., "over_11": ...}
    tags: tuple = ()
    contextos: tuple = ("*",)  # contextos legales en los que aparece ("*" = todos)
    requiere: dict = field(default_factory=dict)  # clave de estado -> valores admitidos
    fija: dict = field(default_factory=dict)      # claves de estado que este nodo sobreescribe
    obligatorio: bool = False
    minijuego: str | None = None
    opciones: tuple = ()
    fuente: tuple = ()


def _t(menor_11: str, mayor_11: str) -> dict:
    return {"under_11": menor_11, "over_11": mayor_11}


def _n(id, grupo, tipo, orden, texto, **kw) -> Nodo:
    tags = tuple(kw.pop("tags", ()))
    if grupo in (4, 5) and "legalidad" not in tags:
        tags += ("legalidad",)  # los dos últimos grupos son siempre de legalidad
    return Nodo(id=id, grupo=grupo, tipo=tipo, orden=orden, texto=texto, tags=tags, **kw)


_CATALOGO = (
    # ===== Grupo 1 · Contexto inicial (aleatorio) · capítulo 1 =====================================
    _n("g1-dia-normal", 1, "narracion", 1,
       _t("{nombre} está en el cole. Hoy le cuesta atender y mira el reloj una y otra vez.",
          "{nombre} está en clase, pero hoy no consigue concentrarse. Se le va la mirada a la ventana y el tiempo no pasa."),
       tags=("rutina", "colegio"), fija={"lugar": "colegio", "tension": "baja", "foco": "yo"}, fuente=("c1-01",)),
    _n("g1-amistad", 1, "dialogo", 2,
       _t("Una amiga le guarda sitio en el recreo y le dice: «Si quieres contarme algo, aquí estoy».",
          "Una amiga le propone quedar después de clase y añade: «Si algún día quieres hablar, solo tienes que decírmelo»."),
       tags=("amistad", "confianza"), fuente=("c1-02", "c1-06")),
    _n("g1-senales", 1, "narracion", 3,
       _t("La tutora se ha dado cuenta de que {nombre} está más callad{o} y se asusta con los ruidos fuertes.",
          "Su tutora nota que {nombre} falta más a clase, habla menos y se sobresalta con facilidad."),
       tags=("senales", "escucha", "colegio"), fija={"apoyo": "tutoria"}, fuente=("c1-07",)),
    _n("g1-movil", 1, "narracion", 3,
       _t("El móvil de {nombre} vibra otra vez y le da un vuelco el corazón. No quiere mirarlo delante de nadie.",
          "El móvil no deja de vibrar. {nombre} le da la vuelta sobre la mesa: prefiere no leer esos mensajes delante de nadie."),
       tags=("privacidad", "movil", "miedo"), contextos=DIGITALES, fuente=("c1-04", "c1-05")),
    _n("g1-casa-tension", 1, "narracion", 3,
       _t("En casa, a veces hay gritos. {nombre} se va a su cuarto y espera a que pase.",
          "En casa el ambiente está tenso. {nombre} ha aprendido a medir cada palabra para no provocar un enfado."),
       tags=("familia", "miedo", "casa"), contextos=("violencia_familiar", "otro"), fija={"foco": "familia"},
       fuente=("c1-04", "c1-05")),
    _n("g1-tutora-invita", 1, "eleccion", 5,
       _t("La tutora le pregunta con calma si quiere hablar un ratito en un sitio tranquilo. ¿Qué responde {nombre}?",
          "Su tutora le pregunta si le apetece hablar en un sitio tranquilo. A {nombre} le cuesta empezar. ¿Qué dice primero?"),
       tags=("escucha", "confianza", "miedo"), obligatorio=True,
       fija={"lugar": "despacho", "tension": "media", "apoyo": "tutoria"}, fuente=("c1-08", "c1-choice"),
       opciones=(
           Opcion("tiempo", "Necesito un poco de tiempo.",
                  _t("La tutora sonríe: «Vamos despacio. Yo me quedo contigo».",
                     "«Podemos ir despacio. Me quedo aquí contigo y, cuando quieras, empezamos»."), {"tension": "media"}),
           Opcion("miedo", "Me pasan cosas que me dan miedo.",
                  _t("«Gracias por contármelo. No tienes que explicarlo todo hoy».",
                     "«Gracias por decírmelo. No tienes que contarlo todo ahora: lo que te hace daño importa, aunque aún no sepas cómo explicarlo»."),
                  {"tension": "media", "foco": "familia"}),
       )),

    # ===== Grupo 2 · Nudo y minijuegos · capítulos 2 y 3 ===========================================
    _n("g2-escucha", 2, "dialogo", 1,
       _t("La tutora escucha sin interrumpir. Le dice que nada de lo que pase es culpa de {nombre}.",
          "Su tutora escucha sin interrumpir y le repite que nada de lo que haga o diga justifica que alguien le haga daño."),
       tags=("escucha", "confianza"), fuente=("c2-01", "c2-02")),
    _n("g2-privacidad", 2, "dialogo", 2,
       _t("La tutora explica que no puede guardar un secreto total: avisará a personas que ayudan y antes se lo contará a {nombre}.",
          "Su tutora le explica que no puede prometer un secreto absoluto: tiene que avisar a quien puede proteger, y le dirá a quién y para qué."),
       tags=("privacidad", "confianza"), fuente=("c2-privacy",)),
    _n("g2-ayuda-digital", 2, "dialogo", 2,
       _t("La persona adulta le dice: «No contestes ni borres nada. Guardamos los mensajes y pedimos ayuda».",
          "La persona adulta le explica que no hace falta responder ni borrar nada: guardar capturas y pedir ayuda es lo más seguro."),
       tags=("privacidad", "movil", "proteccion"), contextos=DIGITALES, fuente=("c3-contact",)),
    _n("g2-pregunta-miedo", 2, "eleccion", 3,
       _t("{nombre} tiene muchas preguntas. ¿Cuál hace primero?",
          "{nombre} tiene demasiadas preguntas en la cabeza. ¿Cuál se atreve a hacer primero?"),
       tags=("miedo", "privacidad", "familia"), fuente=("c2-choice",),
       opciones=(
           Opcion("clase", "¿Se lo vais a contar a todo el cole?",
                  _t("«No. Solo lo sabrán las personas que tienen que ayudar».",
                     "«Solo lo sabrá quien necesite saberlo para protegerte. Tu clase no tiene por qué enterarse»."),
                  {"tension": "media"}),
           Opcion("familia", "¿Vais a llamar ahora a mi familia?",
                  _t("«No sin pensar en tu miedo. Primero lo organizamos con cuidado».",
                     "«No vamos a llamar sin pensar en tu miedo. Los profesionales decidirán cómo hacerlo para que estés segur{o}»."),
                  {"foco": "familia"}),
       )),
    _n("g2-trabajo-social", 2, "dialogo", 4,
       _t("Llega una persona nueva: es trabajadora social. Le explica que está allí para ayudar a {nombre} y a su familia.",
          "Llega una trabajadora social. Se presenta y explica que su trabajo es acompañar a {nombre}: cómo está en clase, con sus amistades y en su día a día."),
       tags=("apoyo", "proteccion", "escucha"), fija={"apoyo": "trabajo_social", "lugar": "despacho"},
       fuente=("c2-07", "c2-09")),
    _n("g2-dibujo", 2, "minijuego", 5,
       _t("{nombre} coge un lápiz y dibuja cómo se ve ahora. No tiene que quedar perfecto.",
          "Antes de seguir, {nombre} dibuja cómo se imagina a sí mism{o}. No tiene que quedar perfecto: es un dibujo suyo."),
       tags=("autoimagen", "expresion"), obligatorio=True, minijuego="dibujo-avatar", fuente=("c2-card", "c3-card")),
    _n("g2-mesa", 2, "minijuego", 6,
       _t("{nombre} imagina una mesa donde se sienta la familia. Elige dónde le gustaría sentarse.",
          "{nombre} se imagina una cena familiar y elige dónde se sentaría en cada momento: un día normal, una celebración y una elección libre."),
       tags=("familia", "distancia", "expresion"), obligatorio=True, minijuego="mesa-familia", fuente=("c3-mesa",)),

    # ===== Grupo 3 · Desarrollo intermedio · capítulos 3 y 4 =======================================
    _n("g3-lugar-seguro", 3, "narracion", 1,
       _t("Por unos días, {nombre} duerme en un sitio seguro con una persona de confianza. Los adultos organizan todo.",
          "Durante unos días, {nombre} se queda en un lugar seguro con una persona de confianza mientras los profesionales valoran qué medidas hacen falta."),
       tags=("proteccion", "casa"), contextos=("violencia_familiar", "grooming", "control_pareja", "otro"),
       fija={"lugar": "casa_segura", "tension": "media", "foco": "familia"}, fuente=("c3-05",)),
    _n("g3-medidas", 3, "narracion", 2,
       _t("Los adultos piden que esa persona no se acerque ni escriba a {nombre}. Así estará más segur{o}.",
          "Para proteger a {nombre}, una autoridad puede acordar medidas como que esa persona no se acerque ni se ponga en contacto. Son decisiones que se revisan."),
       tags=("proteccion", "derechos"), contextos=("violencia_familiar", "grooming", "control_pareja", "otro"),
       fija={"foco": "proceso"}, fuente=("c3-measures", "c3-safety-plan")),
    _n("g3-peques", 3, "narracion", 2,
       _t("{nombre} se preocupa por las personas pequeñas de su familia. Los adultos le dicen: «De eso nos encargamos nosotros».",
          "{nombre} piensa en las personas más pequeñas de su familia. Los profesionales le explican que también las escucharán y que eso no es responsabilidad suya."),
       tags=("hermanos", "familia", "proteccion"), contextos=("violencia_familiar", "otro"), fuente=("c3-dani",)),
    _n("g3-chat", 3, "dialogo", 3,
       _t("Una amiga le escribe: «¡Te echo de menos! Te he guardado los apuntes».",
          "Una amiga le manda un mensaje: «Te echo de menos en clase. Te he guardado los apuntes. No tienes que contarme nada»."),
       tags=("amistad", "movil", "rutina"), fuente=("c4-chat",)),
    _n("g3-vida-sigue", 3, "narracion", 3,
       _t("{nombre} vuelve a jugar un ratito con sus amigas y amigos. Por un momento, todo parece normal.",
          "{nombre} vuelve a una actividad que le gusta. No es como antes, pero durante ese rato siente que su vida es más grande que todo esto."),
       tags=("rutina", "amistad", "deporte"), fija={"tension": "baja", "lugar": "colegio"}, fuente=("c4-choice", "c4-volley")),
    _n("g3-clase-pregunta", 3, "eleccion", 4,
       _t("Un compañero pregunta por qué faltó a clase. ¿Qué hace {nombre}?",
          "En clase, alguien pregunta por qué ha faltado {nombre}. ¿Qué hace?"),
       tags=("privacidad", "amistad", "colegio"), fuente=("c4-choice2",),
       opciones=(
           Opcion("respuesta-corta", "Preparar una respuesta corta con una amiga.",
                  _t("La amiga propone: «Di que has tenido cosas de familia. No tienes que dar más explicaciones».",
                     "Su amiga propone: «Puedes decir que estás resolviendo unas cosas con ayuda y que no quieres hablar de ello»."),
                  {"tension": "baja"}),
           Opcion("pedir-ayuda", "Pedir ayuda a la tutora.",
                  _t("La tutora dice: «Yo me encargo de que nadie te agobie».",
                     "La tutora responde que acordarán qué necesita saber el profesorado y cómo cuidar su intimidad."),
                  {"apoyo": "tutoria"}),
       )),
    _n("g3-caja-arena", 3, "minijuego", 5,
       _t("{nombre} se imagina un mundo lleno de perros. ¿Dónde vive cada uno? ¿Qué pasa cuando llega una tormenta?",
          "{nombre} construye con perros un mundo propio: dónde vive cada uno, quién está cerca de quién y qué ocurre cuando llega una tormenta."),
       tags=("expresion", "proteccion", "calma"), obligatorio=True, minijuego="caja-arena", fuente=("c4-perros",)),

    # ===== Grupo 4 · LEGALIDAD: enmarcado legal (obligatorio) · capítulo 5 ===========================
    _n("g4-citacion", 4, "narracion", 1,
       _t("Llega una carta del tribunal. Dice a dónde y cuándo tiene que ir {nombre}. Una abogada se la lee y se la explica con palabras sencillas.",
          "Llega una citación del Tribunal de Instancia: indica a dónde, cuándo y para qué tiene que acudir {nombre}. Su abogada la lee con la familia y resuelve cada duda."),
       tags=("tribunal", "proceso"), obligatorio=True,
       fija={"lugar": "tribunal", "tension": "media", "foco": "proceso", "apoyo": "abogacia"}, fuente=("c5-01", "c5-03")),
    _n("g4-personas", 4, "dialogo", 2,
       _t("En el tribunal hay personas con trabajos distintos: quien dirige y decide, quien cuida de que se cumpla la ley, quien deja todo por escrito y quienes ayudan a las víctimas.",
          "Cada persona del tribunal tiene un papel: la oficina judicial organiza el caso; la jueza dirige y decide; la letrada de la Administración de Justicia da fe de lo que ocurre; el fiscal vela por la ley y por los derechos de los menores; el equipo psicosocial ayuda a escuchar a los menores; y la Oficina de Asistencia a las Víctimas informa y apoya."),
       tags=("roles", "tribunal"), obligatorio=True, fuente=("c5-team", "c5-oficina", "c5-juez", "c5-laj", "c5-fiscal", "c5-oavd")),
    _n("g4-declara-menor14", 4, "dialogo", 3,
       _t("Como {nombre} tiene menos de 14 años, en algunos casos su declaración se graba una sola vez en una sala tranquila, para no repetirla muchas veces.",
          "Con menos de 14 años, en ciertos delitos la ley prevé grabar la declaración una sola vez, con apoyo de profesionales y con garantías, para que {nombre} no tenga que repetirla."),
       tags=("declaracion", "apoyos", "derechos"), obligatorio=True, requiere={"edad_legal": ("menor_14",)},
       fuente=("c5-age-rule", "c5-recording")),
    _n("g4-declara-14mas", 4, "dialogo", 3,
       _t("Como {nombre} ya tiene 14 años o más, puede que tenga que contar lo ocurrido también en el juicio. Pedirán otra sala y una persona que acompañe a {nombre}.",
          "Con 14 años o más, puede que {nombre} tenga que declarar también en el juicio. Se pedirá otra sala, videoconferencia y compañía para que no coincida con esa persona."),
       tags=("declaracion", "apoyos", "derechos"), obligatorio=True, requiere={"edad_legal": ("14_mas",)},
       fuente=("c5-age-rule", "c5-supports")),
    _n("g4-apoyos", 4, "dialogo", 4,
       _t("Los adultos organizan que {nombre} no se cruce con esa persona. Habrá una sala aparte y alguien de confianza cerca.",
          "Se organiza todo para evitar que {nombre} coincida con esa persona: entrada distinta, sala aparte, videoconferencia y apoyo de una psicóloga."),
       tags=("apoyos", "derechos", "proteccion"), fuente=("c5-supports", "c5-room")),
    _n("g4-derechos-declarar", 4, "dialogo", 5,
       _t("Antes de ir, {nombre} aprende tres frases: «No lo he entendido», «No me acuerdo» y «Necesito parar».",
          "{nombre} practica cómo pedir lo que necesita: que le repitan una pregunta con otras palabras, decir que no recuerda algo y pedir una pausa. No hace falta inventar nada."),
       tags=("derechos", "expresion"), fuente=("c5-communication", "c5-repeat", "c5-memory", "c5-pause")),
    _n("g4-pregunta-tribunal", 4, "eleccion", 4,
       _t("Antes de ir, {nombre} quiere saber una cosa. ¿Cuál?",
          "Antes de la declaración, {nombre} necesita aclarar una duda. ¿Cuál?"),
       tags=("tribunal", "miedo", "derechos"), fuente=("c5-choice",),
       opciones=(
           Opcion("quien", "¿Quién va a estar en la sala?",
                  _t("«Estarán la jueza, el fiscal y quien escribe lo que se dice. Yo iré contigo».",
                     "«Estarán la jueza, el fiscal y la letrada que da fe de lo que se dice. Yo estaré contigo y antes te digo quién es cada uno»."),
                  {"tension": "media"}),
           Opcion("ver", "¿Voy a ver a esa persona?",
                  _t("«No. Hemos pedido que no os crucéis».",
                     "«Hemos pedido que no os crucéis en ningún momento. La jueza decidirá cómo organizarlo»."),
                  {"tension": "baja"}),
       )),

    # ===== Grupo 5 · LEGALIDAD: cierre del proceso (obligatorio) · capítulo 6 ========================
    _n("g5-espera", 5, "narracion", 1,
       _t("Pasan las semanas. A veces no hay noticias, y esperar cuesta. Las personas que ayudan a {nombre} siguen cerca.",
          "Pasan las semanas y hay días sin novedades. Esperar también forma parte del proceso, y los apoyos de {nombre} continúan mientras tanto."),
       tags=("espera", "proceso", "apoyo"), obligatorio=True, fija={"tension": "media", "foco": "proceso"}, fuente=("c6-01",)),
    _n("g5-juicio", 5, "narracion", 2,
       _t("Llega el día del juicio. {nombre} cuenta lo que recuerda, con ayuda y sin ver a esa persona. Después, el tribunal escucha lo demás.",
          "El día del juicio, {nombre} declara con los apoyos acordados. El tribunal también escucha a las demás partes y analiza todas las pruebas, así que la decisión no depende solo de lo que diga {nombre}."),
       tags=("juicio", "declaracion"), fuente=("c6-trial", "c6-trial-notice")),
    _n("g5-sentencia", 5, "dialogo", 3,
       _t("Al final, el tribunal decide y lo escribe en un documento llamado sentencia. Puede decidir que hay una condena o que no la hay, y la abogada lo explica con calma.",
          "El tribunal explica su decisión por escrito: es la sentencia. Puede condenar o absolver. Absolver no significa que {nombre} haya mentido: puede que las pruebas no bastaran. La abogada lo explica paso a paso."),
       tags=("sentencia", "proceso"), obligatorio=True, fuente=("c6-after-trial", "c6-conviction", "c6-no-conviction")),
    _n("g5-recurso", 5, "dialogo", 4,
       _t("Si alguien no está de acuerdo, puede pedir a otro tribunal que revise la decisión. Eso se llama recurrir.",
          "Recurrir es pedir a otro tribunal que revise la decisión. Las partes pueden hacerlo dentro de un plazo, y la sentencia es firme cuando ya no se puede recurrir."),
       tags=("recurso", "proceso"), fuente=("c6-appeal",)),
    _n("g5-proteccion-despues", 5, "dialogo", 5,
       _t("Aunque el juicio haya terminado, la ayuda sigue: los adultos revisan qué cuidados necesita {nombre} ahora.",
          "La ayuda no termina con la sentencia: se revisa qué medidas siguen, cuáles cambian y qué apoyo necesita {nombre}, según cómo se encuentre."),
       tags=("proteccion", "apoyo"), fuente=("c6-protection-after",)),
    _n("g5-sentimientos", 5, "eleccion", 6,
       _t("{nombre} siente muchas cosas a la vez. ¿De qué quiere hablar hoy?",
          "No es fácil poner nombre a lo que siente {nombre}. ¿De qué le gustaría hablar hoy?"),
       tags=("emociones", "apoyo"), fuente=("c6-choice", "c6-dad", "c6-news"),
       opciones=(
           Opcion("mezcla", "De que siento cosas mezcladas.",
                  _t("«Puedes sentir muchas cosas a la vez. Todas valen».",
                     "«Puedes echar de menos lo bueno y necesitar protección a la vez. No tienes que sentir una sola cosa»."),
                  {"tension": "baja"}),
           Opcion("informacion", "De cómo saber qué pasa ahora.",
                  _t("«Te iremos contando cada paso».",
                     "«Podemos consultar qué información te corresponde y con quién hablar cuando tengas dudas»."),
                  {"foco": "proceso"}),
       )),
    _n("g5-cierre-vida", 5, "narracion", 9,
       _t("{nombre} sigue siendo mucho más que esta historia: amigas, juegos, dibujos y planes. No está sol{o}.",
          "{nombre} sigue siendo mucho más que este proceso: sus amistades, lo que le gusta y lo que quiere hacer. Habrá días buenos y días difíciles, y no tendrá que pasarlos sol{o}."),
       tags=("futuro", "esperanza", "apoyo"), obligatorio=True, fija={"tension": "baja", "foco": "yo", "lugar": "colegio"},
       fuente=("c6-choice2", "epilogue")),
)

# Cambios que se aplican al cerrar cada grupo si los nodos elegidos no han sobreescrito bastantes
# etiquetas. Cada clave lleva alternativas y se toma la primera que DIFIERA del valor actual, así
# siempre se puede cumplir MIN_OVERRIDDEN_TAGS en el paso de un grupo al siguiente.
CAMBIOS_DE_GRUPO = {
    1: {"tension": ("media", "alta"), "foco": ("familia", "yo"), "apoyo": ("tutoria", "trabajo_social"), "lugar": ("despacho", "colegio")},
    2: {"apoyo": ("trabajo_social", "abogacia"), "lugar": ("despacho", "casa_segura"), "foco": ("familia", "proceso"), "tension": ("media", "baja")},
    3: {"lugar": ("casa_segura", "tribunal"), "foco": ("proceso", "familia"), "tension": ("media", "alta"), "apoyo": ("abogacia", "trabajo_social")},
    4: {"apoyo": ("abogacia", "trabajo_social"), "foco": ("proceso", "yo"), "lugar": ("tribunal", "colegio"), "tension": ("media", "baja")},
}


def catalogo() -> tuple:
    return _CATALOGO


def por_id(id: str) -> Nodo:
    return next(n for n in _CATALOGO if n.id == id)
