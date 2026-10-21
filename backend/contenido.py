"""Contenido de los tres modos de juego (historia, preguntas, cooperativo)."""

# Modo historieta: casos narrativos interactivos para debate y toma de decisiones colectiva en clase
HISTORIETA = [
    {
        "id": "h_1",
        "titulo": "Historieta 1: El enlace trampa en WhatsApp",
        "hechos": "Te llega un WhatsApp de un número desconocido: «¡Has ganado un smartphone de última generación! Pulsa en este enlace oficial e introduce tu contraseña y número de teléfono para recibirlo gratis».",
        "pregunta": "¿Qué decisión toma la clase?",
        "opciones": [
            "Pulsar el enlace rápido: ¡no queremos perder el regalo!",
            "No pulsar nada, bloquear el número y avisar a un adulto responsable",
            "Reenviarlo al grupo de amigos para comprobar si a ellos les funciona",
        ],
        "correcta": 1,
        "sentencia": "¡Decisión acertada! Se trataba de un ataque de phishing. El engaño con ánimo de lucro para obtener datos personales o dinero constituye un delito de estafa (art. 249 CP).",
        "articulo": "Art. 249 del Código Penal (Estafa)",
    },
    {
        "id": "h_2",
        "titulo": "Historieta 2: La foto falsa creada con IA",
        "hechos": "Un compañero de clase crea y comparte una imagen manipulada con inteligencia artificial para ridiculizar a otro estudiante, y os pide que la difundáis por redes.",
        "pregunta": "¿Cómo debe actuar el grupo?",
        "opciones": [
            "Reenviarla a más grupos porque es solo humor y una broma",
            "No difundirla, denunciar la publicación y avisar al profesorado",
            "Guardarla en privado para amenazar con publicarla si no obedece",
        ],
        "correcta": 1,
        "sentencia": "¡Muy bien resuelto! Crear o difundir montajes para humillar a otra persona vulnera la intimidad y la integridad moral (arts. 173 y 197.7 CP). Frenar la difusión evita un daño irreparable.",
        "articulo": "Arts. 173 y 197.7 del Código Penal",
    },
    {
        "id": "h_3",
        "titulo": "Historieta 3: El chantaje del desconocido en redes",
        "hechos": "Una persona que conociste en un videojuego online comienza a exigir que le envíes dinero o fotos íntimas, amenazando con publicar tus datos personales si no lo haces.",
        "pregunta": "¿Cuál es la respuesta legal y segura?",
        "opciones": [
            "Ceder y enviarle lo que pide para que no cumpla sus amenazas",
            "Cortar comunicación, guardar capturas como prueba y llamar al 017 o a la Policía",
            "Quedar con él en persona para devolverle las amenazas",
        ],
        "correcta": 1,
        "sentencia": "¡Excelente! Jamás se debe ceder ante el chantaje o sextorsión (arts. 171 y 172 CP). Guardar pruebas y solicitar ayuda inmediata al 017 o a las fuerzas de seguridad es la vía correcta.",
        "articulo": "Arts. 171 y 172 del Código Penal (Extorsión y Coacciones)",
    },
]

# Modo historia: escenas con decisiones. Cada opción lleva a otra escena.
HISTORIA = {
    "inicio": "mensaje",
    "escenas": {
        "mensaje": {
            "texto": "Te llega un WhatsApp: «¡Has ganado un móvil! Pulsa aquí y pon tu contraseña». ¿Qué haces?",
            "opciones": [
                {"texto": "Pulso el enlace, ¡quiero el móvil!", "va_a": "trampa"},
                {"texto": "No pulso y se lo cuento a un adulto", "va_a": "foto"},
            ],
        },
        "trampa": {
            "texto": "¡Era phishing! Te han robado la cuenta. Engañar así es un delito de estafa (art. 249 del Código Penal).",
            "final": True, "bien": False,
        },
        "foto": {
            "texto": "¡Bien hecho! Más tarde, alguien de clase comparte una foto falsa de un compañero hecha con IA. ¿Qué haces?",
            "opciones": [
                {"texto": "La reenvío al grupo, es graciosa", "va_a": "reenvio"},
                {"texto": "No la reenvío y aviso a un profe", "va_a": "heroe"},
            ],
        },
        "reenvio": {
            "texto": "Reenviar fotos falsas que humillan a alguien también es delito (art. 197.7 CP). ¡Y le hace mucho daño!",
            "final": True, "bien": False,
        },
        "heroe": {
            "texto": "¡Eres un Chaval Legal! Has protegido tu cuenta y a tu compañero. Si necesitas ayuda, llama al 017.",
            "final": True, "bien": True,
        },
    },
}

# Modo preguntas: quiz con explicación.
PREGUNTAS = [
    {
        "pregunta": "Un mensaje te pide tu contraseña para darte un premio. ¿Es seguro?",
        "opciones": ["Sí, si el premio es bueno", "No, nunca se da la contraseña", "Solo si es de un amigo"],
        "correcta": 1,
        "explica": "Nadie de confianza te pedirá tu contraseña. Eso es phishing.",
    },
    {
        "pregunta": "Alguien te escribe todo el rato, sabe dónde estás y te da miedo. ¿Qué es?",
        "opciones": ["Acoso o acecho", "Una broma", "Algo normal en redes"],
        "correcta": 0,
        "explica": "Vigilar y perseguir a alguien es delito (art. 172 ter CP). Cuéntaselo a un adulto.",
    },
    {
        "pregunta": "¿Qué es un deepfake?",
        "opciones": ["Un videojuego", "Una foto o vídeo falso hecho con IA", "Un tipo de virus"],
        "correcta": 1,
        "explica": "Parecen reales, pero son falsos. Compartirlos para humillar a alguien es delito.",
    },
    {
        "pregunta": "¿A qué número puedes llamar si tienes un problema en internet?",
        "opciones": ["112 solo", "017", "No hay ninguno"],
        "correcta": 1,
        "explica": "El 017 es la línea de ayuda en ciberseguridad. ¡Es gratis!",
    },
]

# Modo cooperativo: dos jugadores se turnan; el equipo suma puntos juntos.
COOPERATIVO = [
    {
        "caso": "Un compañero recibe insultos en un grupo de clase.",
        "opciones": ["Nos reímos", "Le apoyamos y avisamos a un profe", "Salimos del grupo sin decir nada"],
        "correcta": 1,
    },
    {
        "caso": "Una amiga recibe un enlace raro de su «banco».",
        "opciones": ["Le decimos que no lo abra", "Que pruebe a ver qué pasa", "Que ponga sus datos rápido"],
        "correcta": 0,
    },
    {
        "caso": "Vemos un vídeo falso de un profe circulando.",
        "opciones": ["Lo compartimos", "Lo denunciamos y no lo reenviamos", "Hacemos otro"],
        "correcta": 1,
    },
    {
        "caso": "Alguien desconocido quiere quedar con un amigo que conoció online.",
        "opciones": ["Que vaya solo", "Que se lo cuente a sus padres", "Que no diga nada"],
        "correcta": 1,
    },
]

# Modo juicio: simulación de casos jurídicos reales adaptados para aula.
JUICIO = [
    {
        "id": "difusion_fotos",
        "titulo": "Caso 1: El sticker privado en el grupo de clase",
        "hechos": "Un alumno recibe en confianza una fotografía de un compañero en el baño del colegio y decide convertirla en sticker y compartirla en el grupo de WhatsApp de 30 alumnos de la clase.",
        "pregunta": "¿Qué determina la ley sobre este comportamiento?",
        "opciones": [
            "Es delito de difusión no consentida de imágenes íntimas (art. 197.7 CP)",
            "No es nada porque el grupo es privado y solo era una broma entre amigos",
            "Solo hay falta si el afectado pide dinero",
        ],
        "correcta": 0,
        "sentencia": "¡Culpable según la ley! Difundir imágenes íntimas o que menoscaben la intimidad de otra persona sin su consentimiento es delito tipificado en el art. 197.7 del Código Penal, con especial gravedad al tratarse de menores.",
        "articulo": "Art. 197.7 Código Penal",
    },
    {
        "id": "cuenta_falsa",
        "titulo": "Caso 2: El perfil falso del profesor en TikTok",
        "hechos": "Dos estudiantes crean una cuenta falsa usando la fotografía real y el nombre de un profesor del centro para publicar vídeos satíricos e insultos hacia otros profesores.",
        "pregunta": "¿Existe infracción o delito en este caso?",
        "opciones": [
            "Es libertad de expresión y humor en redes sociales",
            "Puede constituir delito de usurpación de estado civil (art. 401 CP) e injurias",
            "Solo se sanciona si la cuenta consigue más de 10.000 seguidores",
        ],
        "correcta": 1,
        "sentencia": "¡Delito! Hacerse pasar por otra persona de forma continuada vulnera el art. 401 del Código Penal (usurpación de identidad), y si además se insulta o calumnia, se incurre en delitos contra el honor.",
        "articulo": "Art. 401 y 205-208 Código Penal",
    },
    {
        "id": "amenazas_online",
        "titulo": "Caso 3: Mensajes amenazantes tras una partida de videojuegos",
        "hechos": "Tras perder una partida online, un usuario envía mensajes reiterados amenazando con revelar la dirección real de un menor y acudir a pegarle si no le entrega su cuenta.",
        "pregunta": "¿Cómo califica la justicia esta conducta de hostigamiento?",
        "opciones": [
            "Es delito de amenazas graves y coacciones (arts. 169 y 172 CP)",
            "En los videojuegos no rige el Código Penal, solo las normas del juego",
            "Solo es delito si el agresor vive en la misma ciudad",
        ],
        "correcta": 0,
        "sentencia": "¡Delito grave! Las amenazas y coacciones cometidas a través de internet o videojuegos tienen plena validez penal. Protegerse guardando pruebas y denunciando ante la policía o llamando al 017 es fundamental.",
        "articulo": "Arts. 169 y 172 Código Penal",
    },
]

