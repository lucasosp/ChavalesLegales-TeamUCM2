"""Catálogo de nodos genéricos, derivado de la historia actual de Sara (6 capítulos, 5 grupos).

Cada nodo es una pieza reutilizable con etiquetas genéricas. `fuente` apunta a los nodos de
LegalinStory/public/content/stories/sara/story.json en los que se basa (trazabilidad).

Cómo se elige (ver node_swarm.py):
  * `obligatorio`: entra siempre que sea compatible (minijuegos, marco legal, gancho del riesgo).
  * `fase_tags`: etiquetas de fase (antes / durante / después) que FUERZAN el nodo cuando el LLM las
    detecta con confianza >= UMBRAL_CONFIANZA. Si no, el nodo solo entra por azar.
  * `solo_por_etiqueta`: el nodo NO entra por azar, solo cuando una etiqueta de fase lo fuerza.
  * `contextos`: tipos de riesgo (selector de la aplicación) para los que el nodo es compatible.
  * `requiere` / `excluye`: condiciones sobre el estado (edad legal, etiquetas de fase aplicadas).

Marcadores de texto: {nombre} (se sustituye al final y NUNCA se guarda ni se envía al LLM). Los
textos están escritos sin concordancia de género. Los textos legales son un borrador basado en las
notas de la historia actual: pendientes de revisión jurídica antes de usarse con menores reales.

Grupos:  1 contexto inicial · 2 nudo y minijuegos · 3 desarrollo intermedio
         4 LEGALIDAD: enmarcado legal · 5 LEGALIDAD: cierre del proceso
"""
from dataclasses import dataclass, field

from config import TIPOS_RIESGO

# Etiquetas de fase: el LLM elige UNA por fase. Cada una tiene nodos que la expresan en la historia.
ETIQUETAS_FASE = {
    "antes": (
        "convivencia_conflictiva", "aislamiento_social", "ausencias_escolares", "control_del_movil",
        "difusion_de_imagenes", "contacto_con_adulto_desconocido", "cambios_de_conducta",
    ),
    "durante": (
        "citacion_reciente", "declaracion_pendiente", "medidas_de_proteccion",
        "acompanamiento_psicosocial", "sin_denuncia_todavia",
    ),
    "despues": (
        "sentencia_condenatoria", "sentencia_absolutoria", "recurso_pendiente", "archivo_de_la_causa",
        "proteccion_continuada", "vuelta_a_la_rutina",
    ),
}
NINGUNA = "ninguna"
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
    contextos: tuple = ("*",)  # tipos de riesgo en los que aparece ("*" = todos)
    requiere: dict = field(default_factory=dict)   # clave de estado -> valores admitidos
    excluye: dict = field(default_factory=dict)    # clave de estado -> valores que lo descartan
    fija: dict = field(default_factory=dict)       # claves de estado que este nodo sobreescribe
    fase_tags: tuple = ()
    cubre: tuple = ()          # etiquetas de fase que este nodo YA expresa (no se fuerza un duplicado)
    solo_por_etiqueta: bool = False
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


_SIN_DENUNCIA = {"durante": ("sin_denuncia_todavia",)}
_HAY_RESOLUCION = {"despues": ("sentencia_condenatoria", "sentencia_absolutoria", "archivo_de_la_causa")}

_CATALOGO = (
    # ===== Grupo 1 · Contexto inicial · capítulo 1 =================================================
    _n("g1-dia-normal", 1, "narracion", 1,
       _t("{nombre} está en el cole. Hoy le cuesta atender y mira el reloj una y otra vez.",
          "{nombre} está en clase, pero hoy no consigue concentrarse. Se le va la mirada a la ventana y el tiempo no pasa."),
       tags=("rutina", "colegio"), fija={"lugar": "colegio", "tension": "baja", "foco": "yo"}, fuente=("c1-01",)),
    _n("g1-amistad", 1, "dialogo", 2,
       _t("Una amiga le guarda sitio en el recreo y le dice: «Si quieres contarme algo, aquí estoy».",
          "Una amiga le propone quedar después de clase y añade: «Si algún día quieres hablar, solo tienes que decírmelo»."),
       tags=("amistad", "confianza"), fuente=("c1-02", "c1-06")),
    _n("g1-senales", 1, "narracion", 3,
       _t("La tutora se ha dado cuenta de que {nombre} falta más a clase y se asusta con los ruidos fuertes.",
          "Su tutora nota que {nombre} falta más a clase, habla menos y se sobresalta con facilidad."),
       tags=("senales", "escucha", "colegio"), fase_tags=("ausencias_escolares",), fija={"apoyo": "tutoria"},
       fuente=("c1-07",)),

    # Gancho del tipo de riesgo elegido en el selector: entra siempre el del tipo seleccionado
    _n("g1-hook-ciberacoso", 1, "narracion", 3,
       _t("Los mensajes de un grupo de clase no paran. A {nombre} le da miedo abrir el móvil.",
          "El grupo de clase se ha llenado de mensajes que hacen daño. {nombre} ya no sabe si abrir el móvil o apagarlo."),
       tags=("movil", "miedo"), contextos=("ciberacoso",), obligatorio=True, fuente=("c1-04", "c1-05")),
    _n("g1-hook-suplantacion", 1, "narracion", 3,
       _t("Alguien ha creado una cuenta con el nombre y la foto de {nombre}. Dice cosas que {nombre} nunca diría.",
          "Una cuenta falsa usa el nombre y las fotos de {nombre} y publica cosas que nunca diría. Cada vez lo ve más gente."),
       tags=("movil", "privacidad"), contextos=("suplantacion",), obligatorio=True, fuente=("c1-04", "c1-05")),
    _n("g1-hook-grooming", 1, "narracion", 3,
       _t("Una persona mayor a la que {nombre} no conoce le escribe mucho y le pide que no se lo cuente a nadie.",
          "Una persona adulta a la que {nombre} conoció por internet le escribe a todas horas y le pide que guarde el secreto."),
       tags=("movil", "miedo"), contextos=("grooming",), obligatorio=True,
       cubre=("contacto_con_adulto_desconocido",), fuente=("c1-04", "c1-05")),
    _n("g1-hook-control_pareja", 1, "narracion", 3,
       _t("Alguien muy cercano se enfada cuando {nombre} habla con sus amigos y le mira el móvil.",
          "Su pareja le revisa el móvil y se enfada cada vez que {nombre} habla con sus amistades."),
       tags=("movil", "miedo"), contextos=("control_pareja",), obligatorio=True,
       cubre=("control_del_movil",), fuente=("c1-04", "c1-05")),
    _n("g1-hook-privacidad", 1, "narracion", 3,
       _t("Se han compartido fotos de {nombre} sin preguntarle. A {nombre} no le ha gustado nada.",
          "Fotos y datos de {nombre} se han compartido sin su permiso, y ahora no sabe quién los tiene."),
       tags=("privacidad", "movil"), contextos=("privacidad",), obligatorio=True,
       cubre=("difusion_de_imagenes",), fuente=("c1-04", "c1-05")),

    # Etiquetas "antes": solo entran si el LLM las detecta con confianza suficiente
    _n("g1-casa-tension", 1, "narracion", 3,
       _t("En casa, a veces hay gritos. {nombre} se va a su cuarto y espera a que pase.",
          "En casa el ambiente está tenso. {nombre} ha aprendido a medir cada palabra para no provocar un enfado."),
       tags=("familia", "miedo", "casa"), fase_tags=("convivencia_conflictiva",), solo_por_etiqueta=True,
       fija={"foco": "familia"}, fuente=("c1-04", "c1-05")),
    _n("g1-aislamiento", 1, "narracion", 3,
       _t("En el recreo, {nombre} se queda a un lado. Prefiere no unirse a los juegos.",
          "En los recreos, {nombre} se aparta del grupo. Ya no le apetece dar explicaciones."),
       tags=("amistad", "emociones"), fase_tags=("aislamiento_social",), solo_por_etiqueta=True, fuente=("c1-03", "c1-06")),
    _n("g1-cambios", 1, "narracion", 3,
       _t("Últimamente {nombre} duerme mal y se enfada por cosas pequeñas. Ya no tiene ganas de jugar como antes.",
          "Últimamente {nombre} duerme mal, se irrita con facilidad y ha perdido las ganas de lo que antes le gustaba."),
       tags=("emociones", "senales"), fase_tags=("cambios_de_conducta",), solo_por_etiqueta=True, fuente=("c1-07",)),
    _n("g1-movil-controlado", 1, "narracion", 3,
       _t("Alguien mira el móvil de {nombre} y decide con quién puede hablar.",
          "Alguien revisa el móvil de {nombre} y decide con quién puede hablar y con quién no."),
       tags=("movil", "privacidad", "miedo"), fase_tags=("control_del_movil",), solo_por_etiqueta=True, fuente=("c1-04",)),
    _n("g1-imagen", 1, "narracion", 3,
       _t("Una foto de {nombre} circula por un grupo sin permiso. Mirar el móvil se ha vuelto difícil.",
          "Una imagen de {nombre} circula por un grupo sin su permiso, y cada notificación le hace temer lo peor."),
       tags=("movil", "privacidad"), fase_tags=("difusion_de_imagenes",), solo_por_etiqueta=True, fuente=("c1-04",)),
    _n("g1-adulto-desconocido", 1, "narracion", 3,
       _t("Una persona mayor a la que {nombre} no conoce le escribe y le pide que no se lo cuente a nadie.",
          "Una persona adulta a la que {nombre} no conoce le escribe a todas horas y le pide que guarde el secreto."),
       tags=("movil", "miedo"), fase_tags=("contacto_con_adulto_desconocido",), solo_por_etiqueta=True, fuente=("c1-04",)),

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
       tags=("privacidad", "movil", "proteccion"),
       fase_tags=("control_del_movil", "difusion_de_imagenes", "contacto_con_adulto_desconocido"), fuente=("c3-contact",)),
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
                     "«No vamos a llamar sin pensar en tu miedo. Los profesionales decidirán cómo hacerlo para que estés a salvo»."),
                  {"foco": "familia"}),
       )),
    _n("g2-trabajo-social", 2, "dialogo", 4,
       _t("Llega una persona nueva: es trabajadora social. Le explica que está allí para ayudar a {nombre} y a su familia.",
          "Llega una trabajadora social. Se presenta y explica que su trabajo es acompañar a {nombre}: cómo está en clase, con sus amistades y en su día a día."),
       tags=("apoyo", "proteccion", "escucha"), fija={"apoyo": "trabajo_social", "lugar": "despacho"},
       fuente=("c2-07", "c2-09")),
    _n("g2-dibujo", 2, "minijuego", 5,
       _t("{nombre} coge un lápiz y dibuja cómo se ve ahora. No tiene que quedar perfecto.",
          "Antes de seguir, {nombre} hace un dibujo de cómo se ve y de cómo se imagina. No tiene que quedar perfecto: es un dibujo suyo."),
       tags=("autoimagen", "expresion"), obligatorio=True, minijuego="dibujo-avatar", fuente=("c2-card", "c3-card")),
    _n("g2-mesa", 2, "minijuego", 6,
       _t("{nombre} imagina una mesa donde se sienta la familia. Elige dónde le gustaría sentarse.",
          "{nombre} se imagina una cena familiar y elige dónde se sentaría en cada momento: un día normal, una celebración y una elección libre."),
       tags=("familia", "distancia", "expresion"), obligatorio=True, minijuego="mesa-familia", fuente=("c3-mesa",)),

    # ===== Grupo 3 · Desarrollo intermedio · capítulos 3 y 4 =======================================
    _n("g3-lugar-seguro", 3, "narracion", 1,
       _t("Por unos días, {nombre} duerme en un sitio seguro con una persona de confianza. Los adultos organizan todo.",
          "Durante unos días, {nombre} se queda en un lugar seguro con una persona de confianza mientras los profesionales valoran qué medidas hacen falta."),
       tags=("proteccion", "casa"), fase_tags=("medidas_de_proteccion",), solo_por_etiqueta=True,
       fija={"lugar": "casa_segura", "tension": "media", "foco": "familia"}, fuente=("c3-05",)),
    _n("g3-medidas", 3, "narracion", 2,
       _t("Los adultos piden que esa persona no se acerque ni escriba a {nombre}. Así estará más a salvo.",
          "Para proteger a {nombre}, una autoridad puede acordar medidas como que esa persona no se acerque ni se ponga en contacto. Son decisiones que se revisan."),
       tags=("proteccion", "derechos"), fase_tags=("medidas_de_proteccion",), solo_por_etiqueta=True,
       fija={"foco": "proceso"}, fuente=("c3-measures", "c3-safety-plan")),
    _n("g3-peques", 3, "narracion", 2,
       _t("{nombre} se preocupa por las personas pequeñas de su familia. Los adultos le dicen: «De eso nos encargamos nosotros».",
          "{nombre} piensa en las personas más pequeñas de su familia. Los profesionales le explican que también las escucharán y que eso no es responsabilidad suya."),
       tags=("hermanos", "familia", "proteccion"), fase_tags=("convivencia_conflictiva",), solo_por_etiqueta=True,
       fuente=("c3-dani",)),
    _n("g3-psicosocial", 3, "narracion", 2,
       _t("Una psicóloga se sienta con {nombre} y le enseña formas de calmarse cuando se agobia.",
          "Una psicóloga del equipo acompaña a {nombre} y le enseña estrategias para calmarse cuando la ansiedad aprieta."),
       tags=("apoyo", "calma", "emociones"), fase_tags=("acompanamiento_psicosocial",), solo_por_etiqueta=True,
       fuente=("c5-07",)),
    _n("g3-sin-denuncia", 3, "narracion", 2,
       _t("Todavía no hay ninguna denuncia. Pedir ayuda no obliga a {nombre} a denunciar.",
          "Por ahora no hay denuncia. Contar lo que pasa y recibir ayuda no obliga a {nombre} a denunciar: los adultos que acompañan a {nombre} explican cada paso."),
       tags=("derechos", "proceso"), fase_tags=("sin_denuncia_todavia",), solo_por_etiqueta=True, fuente=("c2-protection",)),
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
       tags=("tribunal", "proceso"), obligatorio=True, excluye=_SIN_DENUNCIA,
       fija={"lugar": "tribunal", "tension": "media", "foco": "proceso", "apoyo": "abogacia"}, fuente=("c5-01", "c5-03")),
    _n("g4-sin-citacion", 4, "narracion", 1,
       _t("Todavía no hay ninguna citación. Si algún día la hubiera, una abogada se la explicaría a {nombre} con palabras sencillas.",
          "Por ahora no hay citación. Si más adelante hay un proceso, su abogada le explicará cada paso con antelación."),
       tags=("tribunal", "proceso"), obligatorio=True, requiere=_SIN_DENUNCIA,
       fija={"lugar": "despacho", "tension": "media", "foco": "proceso", "apoyo": "abogacia"}, fuente=("c5-03",)),
    _n("g4-personas", 4, "dialogo", 2,
       _t("En el tribunal hay personas con trabajos distintos: quien dirige y decide, quien cuida de que se cumpla la ley, quien deja todo por escrito y quienes ayudan a las víctimas.",
          "Cada persona del tribunal tiene un papel: la oficina judicial organiza el caso; la jueza dirige y decide; la letrada de la Administración de Justicia da fe de lo que ocurre; el fiscal vela por la ley y por los derechos de los menores; el equipo psicosocial ayuda a escuchar a los menores; y la Oficina de Asistencia a las Víctimas informa y apoya."),
       tags=("roles", "tribunal"), obligatorio=True, fuente=("c5-team", "c5-oficina", "c5-juez", "c5-laj", "c5-fiscal", "c5-oavd")),
    _n("g4-declara-menor14", 4, "dialogo", 3,
       _t("Como {nombre} tiene menos de 14 años, en algunos casos su declaración se graba una sola vez en una sala tranquila, para no repetirla muchas veces.",
          "Con menos de 14 años, en ciertos delitos la ley prevé grabar la declaración una sola vez, con apoyo de profesionales y con garantías, para que {nombre} no tenga que repetirla."),
       tags=("declaracion", "apoyos", "derechos"), obligatorio=True,
       requiere={"edad_legal": ("menor_14",)}, excluye=_SIN_DENUNCIA, fuente=("c5-age-rule", "c5-recording")),
    _n("g4-declara-14mas", 4, "dialogo", 3,
       _t("Como {nombre} ya tiene 14 años o más, puede que tenga que contar lo ocurrido también en el juicio. Pedirán otra sala y una persona que acompañe a {nombre}.",
          "Con 14 años o más, puede que {nombre} tenga que declarar también en el juicio. Se pedirá otra sala, videoconferencia y compañía para que no coincida con esa persona."),
       tags=("declaracion", "apoyos", "derechos"), obligatorio=True,
       requiere={"edad_legal": ("14_mas",)}, excluye=_SIN_DENUNCIA, fuente=("c5-age-rule", "c5-supports")),
    _n("g4-apoyos", 4, "dialogo", 4,
       _t("Los adultos organizan que {nombre} no se cruce con esa persona. Habrá una sala aparte y alguien de confianza cerca.",
          "Se organiza todo para evitar que {nombre} coincida con esa persona: entrada distinta, sala aparte, videoconferencia y apoyo de una psicóloga."),
       tags=("apoyos", "derechos", "proteccion"), fase_tags=("declaracion_pendiente",), excluye=_SIN_DENUNCIA,
       fuente=("c5-supports", "c5-room")),
    _n("g4-derechos-declarar", 4, "dialogo", 5,
       _t("Antes de ir, {nombre} aprende tres frases: «No lo he entendido», «No me acuerdo» y «Necesito parar».",
          "{nombre} practica cómo pedir lo que necesita: que le repitan una pregunta con otras palabras, decir que no recuerda algo y pedir una pausa. No hace falta inventar nada."),
       tags=("derechos", "expresion"), fase_tags=("declaracion_pendiente",), excluye=_SIN_DENUNCIA,
       fuente=("c5-communication", "c5-repeat", "c5-memory", "c5-pause")),
    _n("g4-citacion-fecha", 4, "narracion", 2,
       _t("Mientras llega el día, {nombre} sabe que puede preguntar todo lo que quiera.",
          "Hasta que llegue la fecha, {nombre} puede hacer todas las preguntas que necesite: nada de lo que no entienda es una tontería."),
       tags=("tribunal", "derechos"), fase_tags=("citacion_reciente",), solo_por_etiqueta=True, excluye=_SIN_DENUNCIA,
       fuente=("c5-03",)),
    _n("g4-pregunta-tribunal", 4, "eleccion", 4,
       _t("Antes de ir, {nombre} quiere saber una cosa. ¿Cuál?",
          "Antes de la declaración, {nombre} necesita aclarar una duda. ¿Cuál?"),
       tags=("tribunal", "miedo", "derechos"), excluye=_SIN_DENUNCIA, fuente=("c5-choice",),
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
       tags=("espera", "proceso", "apoyo"), obligatorio=True, excluye=_SIN_DENUNCIA,
       fija={"tension": "media", "foco": "proceso"}, fuente=("c6-01",)),
    _n("g5-juicio", 5, "narracion", 2,
       _t("Llega el día del juicio. {nombre} cuenta lo que recuerda, con ayuda y sin ver a esa persona. Después, el tribunal escucha lo demás.",
          "El día del juicio, {nombre} declara con los apoyos acordados. El tribunal también escucha a las demás partes y analiza todas las pruebas, así que la decisión no depende solo de lo que diga {nombre}."),
       tags=("juicio", "declaracion"), excluye={**_SIN_DENUNCIA, "despues": ("archivo_de_la_causa",)},
       fuente=("c6-trial", "c6-trial-notice")),
    # Cierre de la sentencia: exactamente UNA de estas cuatro variantes entra (según la etiqueta "después")
    _n("g5-sentencia", 5, "dialogo", 3,
       _t("Al final, el tribunal decide y lo escribe en un documento llamado sentencia. Puede decidir que hay una condena o que no la hay, y la abogada lo explica con calma.",
          "El tribunal explica su decisión por escrito: es la sentencia. Puede condenar o absolver. Absolver no significa que {nombre} haya mentido: puede que las pruebas no bastaran. La abogada lo explica paso a paso."),
       tags=("sentencia", "proceso"), obligatorio=True,
       excluye={"durante": ("sin_denuncia_todavia",), **_HAY_RESOLUCION}, fuente=("c6-after-trial",)),
    _n("g5-sentencia-condena", 5, "dialogo", 3,
       _t("El tribunal ha decidido que hay una condena. La abogada se lo explica a {nombre} con calma y le dice que no tiene que entenderlo todo hoy.",
          "El tribunal ha dictado una sentencia condenatoria. La abogada explica a {nombre} qué significa, qué medidas de protección se han acordado y qué opciones hay a partir de ahora."),
       tags=("sentencia", "proceso"), obligatorio=True, requiere={"despues": ("sentencia_condenatoria",)},
       excluye=_SIN_DENUNCIA, fuente=("c6-conviction",)),
    _n("g5-sentencia-absolucion", 5, "dialogo", 3,
       _t("El tribunal ha decidido que no hay condena. Eso no quiere decir que {nombre} haya mentido ni que pedir ayuda estuviera mal.",
          "La sentencia es absolutoria: las pruebas no han bastado para condenar. Eso no significa que {nombre} haya mentido ni que pedir ayuda estuviera mal, y la abogada explicará los motivos con calma."),
       tags=("sentencia", "proceso"), obligatorio=True, requiere={"despues": ("sentencia_absolutoria",)},
       excluye=_SIN_DENUNCIA, fuente=("c6-no-conviction",)),
    _n("g5-archivo", 5, "dialogo", 3,
       _t("A veces el caso se cierra sin juicio porque no se puede seguir investigando. La abogada explica a {nombre} qué quiere decir eso.",
          "La causa se ha archivado: a veces ocurre cuando no hay datos suficientes para continuar. La abogada explica a {nombre} qué significa y si se puede recurrir."),
       tags=("sentencia", "proceso"), obligatorio=True, requiere={"despues": ("archivo_de_la_causa",)},
       excluye=_SIN_DENUNCIA, fuente=("c6-investigation-end",)),
    _n("g5-sin-proceso", 5, "dialogo", 3,
       _t("No hay juicio ni sentencia. La ayuda sigue igual, y si algo cambia, los adultos se lo explicarán a {nombre} paso a paso.",
          "No hay juicio ni sentencia: la protección y el apoyo continúan. Si algo cambiara, los profesionales lo explicarían a {nombre} con tiempo y paso a paso."),
       tags=("proceso", "apoyo"), obligatorio=True, requiere=_SIN_DENUNCIA, fuente=("c6-01",)),
    _n("g5-recurso", 5, "dialogo", 4,
       _t("Si alguien no está de acuerdo, puede pedir a otro tribunal que revise la decisión. Eso se llama recurrir.",
          "Recurrir es pedir a otro tribunal que revise la decisión. Las partes pueden hacerlo dentro de un plazo, y la sentencia es firme cuando ya no se puede recurrir."),
       tags=("recurso", "proceso"), fase_tags=("recurso_pendiente",), excluye={**_SIN_DENUNCIA, "despues": ("archivo_de_la_causa",)},
       fuente=("c6-appeal",)),
    _n("g5-proteccion-despues", 5, "dialogo", 5,
       _t("Aunque el juicio haya terminado, la ayuda sigue: los adultos revisan qué cuidados necesita {nombre} ahora.",
          "La ayuda no termina con la sentencia: se revisa qué medidas siguen, cuáles cambian y qué apoyo necesita {nombre}, según cómo se encuentre."),
       tags=("proteccion", "apoyo"), fase_tags=("proteccion_continuada",), fuente=("c6-protection-after",)),
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
    _n("g5-rutina", 5, "narracion", 7,
       _t("Poco a poco, las mañanas se parecen más a las de antes: clase, amigas y amigos, y un rato para lo que a {nombre} le gusta.",
          "Poco a poco, la rutina vuelve: las clases, las amistades y un rato para lo que a {nombre} le gusta. Algunos días cuestan más que otros."),
       tags=("rutina", "esperanza"), fase_tags=("vuelta_a_la_rutina",), solo_por_etiqueta=True, fuente=("c6-choice2",)),
    _n("g5-cierre-vida", 5, "narracion", 9,
       _t("{nombre} sigue siendo mucho más que esta historia: amigas, juegos, dibujos y planes. No tiene que pasar por esto sin compañía: hay personas cerca.",
          "{nombre} sigue siendo mucho más que este proceso: sus amistades, lo que le gusta y lo que quiere hacer. Habrá días buenos y días difíciles, y no tendrá que pasarlos sin compañía."),
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


def etiquetas_de_fase() -> dict:
    return ETIQUETAS_FASE


# Comprobación de coherencia del propio catálogo al importar: cada etiqueta de fase y cada tipo
# de riesgo tienen al menos un nodo que los expresa.
def _comprobar() -> None:
    usadas = {t for n in _CATALOGO for t in n.fase_tags}
    for fase, etiquetas in ETIQUETAS_FASE.items():
        for etiqueta in etiquetas:
            # Las que se expresan con un nodo obligatorio-variante (condena, absolución, archivo) cuentan por 'requiere'
            variante = any(etiqueta in n.requiere.get(fase, ()) or etiqueta in n.cubre for n in _CATALOGO)
            if etiqueta not in usadas and not variante:
                raise ValueError(f"La etiqueta de fase '{etiqueta}' no tiene ningún nodo")
    for tipo in TIPOS_RIESGO:
        if not any(n.obligatorio and tipo in n.contextos for n in _CATALOGO):
            raise ValueError(f"El tipo de riesgo '{tipo}' no tiene gancho en el grupo 1")


_comprobar()
