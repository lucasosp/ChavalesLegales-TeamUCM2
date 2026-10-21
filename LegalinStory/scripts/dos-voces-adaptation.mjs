/**
 * Cohesion pass for "Dos voces".
 *
 * The generator creates the branching graph and then layers reusable
 * post-choice conversations and pacing pauses on top of it. Those layers are
 * useful, but they do not know who is physically in the room, so a few scenes
 * used to change location or bring a character on stage without setting it up.
 *
 * This pass adapts the generated graph so that:
 *   - every room change is either narrated or happens behind a chapter card;
 *   - phone/message voices are marked `remote` and the on-stage listener stays
 *     visible;
 *   - text-message exchanges are shown as chats, not as normal dialogue;
 *   - the safe conversations fit the decision that just happened.
 *
 * It runs after the generator has built every node and before the JSON is
 * written, so `npm run story:build:dos-voces` stays reproducible.
 */

function patch(nodes, id, changes) {
  const node = nodes[id];
  if (!node) throw new Error(`dos-voces adaptation: missing node "${id}"`);
  Object.assign(node, changes);
  return node;
}

function add(nodes, id, node) {
  if (nodes[id]) throw new Error(`dos-voces adaptation: duplicate node "${id}"`);
  nodes[id] = node;
  return node;
}

function remove(nodes, id) {
  if (!nodes[id]) throw new Error(`dos-voces adaptation: cannot remove missing node "${id}"`);
  delete nodes[id];
}

function dialogue({ text, next, scene, cast, remote = false, tone, perspective, mood }) {
  return {
    type: "dialogue",
    speaker: null,
    text,
    next,
    ...(scene ? { scene } : {}),
    ...(cast ? { cast } : {}),
    ...(remote ? { remote: true } : {}),
    ...(tone ? { tone } : {}),
    ...(perspective ? { perspective } : {}),
    ...(mood ? { mood } : {}),
  };
}

function narration(options) {
  return dialogue({ ...options, tone: "narration" });
}

function chat({ title, self, messages, next, scene, cast, perspective, mood }) {
  return {
    type: "chat",
    chatTitle: title,
    self,
    messages,
    next,
    ...(scene ? { scene } : {}),
    ...(cast ? { cast } : {}),
    ...(perspective ? { perspective } : {}),
    ...(mood ? { mood } : {}),
  };
}

export function adaptDosVoces(nodes) {
  /* ------------------------------------------------ chapter 1 · Maya */

  // The conversation after the first decision happens later that night. Sofi
  // is on the phone, not in the kitchen.
  patch(nodes, "c1-m1-ok-3", { next: "c1-m1-call" });
  add(
    nodes,
    "c1-m1-call",
    narration({
      text: "Más tarde, ya de noche, el móvil de Maya vibra sobre la mesa de la cocina. Es Sofi.",
      next: "c1-m1-safe-talk-1",
      scene: "home-kitchen-cold",
      cast: { maya: "neutral" },
    }),
  );
  patch(nodes, "c1-m1-safe-talk-1", {
    speaker: "Sofi",
    text: "«¿Has podido dormir?»",
    remote: true,
    cast: { maya: "neutral" },
  });
  patch(nodes, "c1-m1-safe-talk-2", { cast: { maya: "neutral" } });
  patch(nodes, "c1-m1-safe-talk-3", {
    speaker: "Sofi",
    text: "«Yo también he estado dando vueltas. Si mañana necesitas hablar, te llamo.»",
    remote: true,
    cast: { maya: "neutral" },
  });
  patch(nodes, "c1-m1-safe-talk-3-pausa", { cast: { maya: "neutral" } });

  // Make the jump to Saturday's living room explicit.
  patch(nodes, "c1-m3-safe-talk-3-pausa", {
    text: "El sábado, Maya baja al salón con la libreta en la mochila. Su padre ha traído flores y sonríe.",
    scene: "home-living-cold",
    cast: { maya: "neutral" },
  });

  patch(nodes, "c1-m4-ok-2", { next: "c1-m4-call" });
  add(
    nodes,
    "c1-m4-call",
    narration({
      text: "Esa noche, Sofi la llama. Maya contesta desde el salón, en voz baja.",
      next: "c1-m4-safe-talk-1",
      scene: "home-living-cold",
      cast: { maya: "neutral" },
    }),
  );
  patch(nodes, "c1-m4-safe-talk-1", {
    speaker: "Sofi",
    text: "«¿Cómo ha ido el sábado?»",
    remote: true,
    cast: { maya: "neutral" },
  });
  patch(nodes, "c1-m4-safe-talk-2", {
    speaker: "Maya",
    text: "«Ha traído flores. Como si nada.»",
    cast: { maya: "neutral" },
  });
  patch(nodes, "c1-m4-safe-talk-3", {
    speaker: "Sofi",
    text: "«Una tregua no es una solución. ¿Quieres que mañana hablemos?»",
    remote: true,
    cast: { maya: "neutral" },
  });

  /* ------------------------------------------------ chapter 1 · Sofi */

  // Sofi's chapter is the same week seen from her side, so the card says so.
  patch(nodes, "persp-sofi-1", {
    text: "Sofi ha notado cambios en Maya. Ahora vuelve a mirar la misma semana desde su lado.",
  });

  // The first Sofi decision happens in the patio, where she has just joined
  // Maya. That also keeps the risky "shout in front of everyone" option honest.
  patch(nodes, "c1-s1", { scene: "patio-day" });
  const c1s1Risk2 = nodes["c1-s1"].options.find((option) => option.id === "c1-s1-risk2");
  c1s1Risk2.label = "Preguntarle a gritos delante de todos.";

  // Replace a Lucía conversation that did not belong to this decision.
  patch(nodes, "c1-s1-safe-talk-1", {
    speaker: "Maya",
    text: "«Gracias por sentarte conmigo.»",
    cast: { maya: "neutral" },
  });
  patch(nodes, "c1-s1-safe-talk-2", {
    speaker: "Sofi",
    text: "«No tienes que contar nada. Solo quería que no estuvieras sola.»",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c1-s1-safe-talk-3", {
    speaker: "Maya",
    text: "«Vale.»",
    cast: { maya: "neutral" },
  });

  // Night falls between the patio and Sofi's bedroom.
  patch(nodes, "c1-s1-safe-talk-3-pausa", {
    text: "Esa noche, ya en su habitación, Sofi mira el móvil antes de llamar a Maya.",
    scene: "bedroom-evening",
    cast: { sofi: "neutral" },
  });

  // Maya is on the other side of the call.
  patch(nodes, "c1-s2-ok-2", { remote: true, cast: { sofi: "neutral" } });

  // Next day, in the patio, before class.
  patch(nodes, "c1-s2-ok-3", { next: "c1-s2-next-day" });
  add(
    nodes,
    "c1-s2-next-day",
    narration({
      text: "Al día siguiente, en el patio, Sofi encuentra a Maya sentada sola en un banco.",
      next: "c1-s2-safe-talk-1",
      scene: "patio-day",
      cast: { sofi: "neutral" },
    }),
  );
  patch(nodes, "c1-s2-safe-talk-3-pausa", {
    text: "Sofi llega a clase y se detiene antes de cruzar la puerta. Las voces llegan desde dentro.",
    scene: "classroom-day",
    cast: { sofi: "neutral" },
  });

  // The pause after the teacher conversation is in the patio, not the classroom.
  patch(nodes, "c1-s3-safe-talk-3-pausa", {
    text: "Al salir de clase, Sofi se queda un momento en el patio, con la mochila colgada de un hombro. El aire huele a lluvia y a bocadillos.",
    scene: "patio-day",
    cast: { sofi: "neutral" },
  });

  // Replace another misplaced Lucía conversation.
  patch(nodes, "c1-s4-safe-talk-1", {
    speaker: "Sofi",
    text: "«Biblioteca y parque. Sin más preguntas.»",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c1-s4-safe-talk-2", {
    speaker: "Maya",
    text: "«Gracias por no insistir en ir a casa.»",
    cast: { maya: "neutral" },
  });
  patch(nodes, "c1-s4-safe-talk-3", {
    speaker: "Sofi",
    text: "«Cuando quieras.»",
    cast: { sofi: "neutral" },
  });

  /* ------------------------------------------------ chapter 2 · Maya */

  patch(nodes, "cap1-talk-5-pausa", {
    text: "Maya se queda un momento en silencio. El salón se queda quieto y, por un instante, no hay nada más que hacer.",
  });

  // Establish why Sofi is in Maya's living room before she speaks.
  patch(nodes, "c2-teen", {
    text:
      "Sofi ha venido a casa de Maya a merendar. Su padre ha salido y su madre las deja solas en el salón. " +
      nodes["c2-teen"].text,
  });
  patch(nodes, "c2-child", {
    text:
      "Sofi ha venido a casa de Maya a merendar. Su padre ha salido. " +
      nodes["c2-child"].text,
  });
  patch(nodes, "c2-teen-4-pausa", {
    text: "El reloj del salón marca los segundos. Maya deja que pasen, sin prisa por decidir lo siguiente.",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c2-child-4-pausa", {
    text: "La luz de la tarde se estira sobre la mesa del salón. Maya respira hondo antes de levantar la vista.",
    cast: { sofi: "neutral" },
  });

  // Lucía is on speakerphone, not sitting in the living room.
  patch(nodes, "c2-m1-ok-3", { next: "c2-m1-call-lucia" });
  add(
    nodes,
    "c2-m1-call-lucia",
    narration({
      text: "Sofi la escucha y, juntas, llaman a Lucía. Maya pone el móvil en altavoz.",
      next: "c2-m1-safe-talk-1",
      scene: "home-living-cold",
      cast: { maya: "neutral" },
    }),
  );
  patch(nodes, "c2-m1-safe-talk-1", { remote: true, cast: { maya: "neutral" } });
  patch(nodes, "c2-m1-safe-talk-2", { cast: { maya: "neutral" } });
  patch(nodes, "c2-m1-safe-talk-3", {
    remote: true,
    cast: { maya: "neutral" },
    next: "c2-m1-to-chat",
  });
  add(
    nodes,
    "c2-m1-to-chat",
    narration({
      text: "Cuando cuelgan, el móvil de Maya vuelve a vibrar. En el grupo de clase hay mensajes nuevos.",
      next: "c2-whatsapp",
      scene: "home-living-cold",
      cast: { maya: "sad" },
    }),
  );

  // WhatsApp has its own register: short, lowercase, no formal punctuation.
  patch(nodes, "c2-whatsapp", {
    messages: [
      { from: "Hugo", text: "chicas habéis visto lo de maya??", time: "17:42" },
      { from: "Dani", text: "qué", time: "17:42" },
      { from: "Hugo", text: "lo que ha subido el nuevo JAJA", time: "17:43" },
      { from: "Maya", text: "¿qué habéis subido?", time: "17:43" },
      { from: "Hugo", text: "Imagen oculta", time: "17:44", hidden: true },
      { from: "Dani", text: "no puede ser real 😭😭", time: "17:44" },
      { from: "Sofi", text: "no os riáis\neso no es ella", time: "17:45" },
      { from: "Hugo", text: "tranqui que es broma", time: "17:45" },
      { from: "Hugo", text: "Mensaje eliminado.", time: "17:46", deleted: true },
      { from: "Maya", text: "borradlo porfa", time: "17:46" },
      { from: "Dani", text: "tía ya lo ha visto todo el mundo", time: "17:47" },
    ],
    next: "c2-whatsapp-pausa",
  });
  add(
    nodes,
    "c2-whatsapp-pausa",
    narration({
      text: "Sofi lee los mensajes por encima del hombro. Maya silencia el grupo, pero el móvil sigue vibrando.",
      next: "c2-m2",
      scene: "home-living-cold",
      cast: { maya: "sad" },
      perspective: "maya",
      mood: "tense",
    }),
  );

  // The kitchen pause belongs to the living room; the next scene is school.
  patch(nodes, "c2-m2-safe-talk-3-pausa", {
    text: "El salón se queda en silencio. El zumbido de la nevera llega desde la cocina y, por un instante, no hay nada más que hacer.",
    scene: "home-living-cold",
    cast: { sofi: "neutral" },
    next: "c2-m2-to-school",
  });
  add(
    nodes,
    "c2-m2-to-school",
    narration({
      text: "Al día siguiente, Maya llega al instituto con la mochila pegada al cuerpo. No quiere volver a casa.",
      next: "c2-m3",
      scene: "hallway-day",
      cast: { maya: "sad" },
      perspective: "maya",
      mood: "tense",
    }),
  );

  // "Dirección" and "orientación" are the same door in this story.
  const c2m3Safe = nodes["c2-m3"].options.find((option) => option.id === "c2-m3-safe");
  c2m3Safe.label = "Acudir a orientación junto a Sofi y pedir hablar con Lucía.";
  patch(nodes, "c2-m3-ok", {
    text: "Sofi coge la mano de Maya y la acompaña a orientación. No la suelta hasta que Lucía abre la puerta.",
  });

  // After orientation, Maya goes home before the father's messages arrive.
  patch(nodes, "c2-m3-safe-talk-3", { next: "c2-m3-to-home" });
  add(
    nodes,
    "c2-m3-to-home",
    narration({
      text: "Esa noche, ya en casa, Maya deja la mochila en el salón. El móvil se ilumina sobre el sofá.",
      next: "c2-m4-whatsapp",
      scene: "home-living-cold",
      cast: { maya: "sad" },
      perspective: "maya",
      mood: "tense",
    }),
  );

  patch(nodes, "c2-m4-whatsapp", {
    messages: [
      { from: "Papá", text: "maya contéstame", time: "21:03" },
      { from: "Papá", text: "sé que has hablado con alguien", time: "21:04" },
      { from: "Papá", text: "si cuentas algo\ntu madre lo va a pasar peor", time: "21:04" },
      { from: "Papá", text: "piénsalo", time: "21:05" },
    ],
    next: "c2-m4-pausa",
  });
  add(
    nodes,
    "c2-m4-pausa",
    narration({
      text: "Maya deja el móvil boca abajo. No responde.",
      next: "c2-m4",
      scene: "home-living-cold",
      cast: { maya: "sad" },
      perspective: "maya",
      mood: "tense",
    }),
  );

  // The screenshot reaches Lucía the next day, in orientation.
  patch(nodes, "c2-m4-ok", {
    text: "Maya no contesta. Hace una captura del mensaje y la guarda en la carpeta protegida.",
    next: "c2-m4-to-lucia",
  });
  add(
    nodes,
    "c2-m4-to-lucia",
    narration({
      text: "Al día siguiente, en orientación, Maya le enseña la captura a Lucía.",
      next: "c2-m4-ok-2",
      scene: "orientation-office",
      cast: { maya: "neutral" },
    }),
  );
  patch(nodes, "c2-m4-safe-talk-1", {
    speaker: "Lucía",
    text: "«Este mensaje también es una prueba. Gracias por no responder.»",
    cast: { lucia: "neutral" },
  });
  patch(nodes, "c2-m4-safe-talk-2", {
    speaker: "Maya",
    text: "«Me daba miedo que dijera la verdad.»",
    cast: { maya: "neutral" },
  });
  patch(nodes, "c2-m4-safe-talk-3", {
    speaker: "Lucía",
    text: "«El miedo no lo convierte en cierto. Vamos a guardarlo.»",
    cast: { lucia: "neutral" },
  });

  /* ------------------------------------------------ chapter 2 · Sofi */

  // Sofi's promise is about not spreading the video in class, not about
  // hiding it from every adult.
  patch(nodes, "persp-sofi-2", {
    text: "Sofi ha prometido no contar lo del vídeo en clase. Mientras Maya habla con Lucía, ella decide hasta dónde puede guardar el secreto.",
  });
  patch(nodes, "persp-sofi-2-talk", {
    text: "Maya le ha pedido a Sofi que no cuente lo del vídeo en clase. Sofi lo lleva en la mochila como si pesara.",
  });
  patch(nodes, "persp-sofi-2-talk-3", {
    text: "«Solo necesito que no se lo cuentes en clase.»",
  });
  patch(nodes, "c2-s1", {
    prompt: "Maya le pide a Sofi que no cuente lo del vídeo en clase. ¿Qué hace Sofi?",
  });
  const c2s1Safe = nodes["c2-s1"].options.find((option) => option.id === "c2-s1-safe");
  c2s1Safe.label = "Respetar el límite y hablar con Lucía si el peligro crece.";
  patch(nodes, "c2-s1-ok", {
    text: "«No voy a contar tu historia en clase. Pero si veo que estás en peligro, te lo digo antes de hablar con Lucía. ¿Vale?»",
  });

  const c2s1Risk1 = nodes["c2-s1"].options.find((option) => option.id === "c2-s1-risk1");
  c2s1Risk1.label = "Guardar el secreto por lealtad y no buscar ayuda cuando el rumor crece.";
  c2s1Risk1.consequence = "Pasan las semanas. El rumor crece y Sofi se siente mal por no hacer nada.";
  c2s1Risk1.lesson =
    "La lealtad no puede significar dejar a una amiga sin protección. Puedes respetar su silencio y, a la vez, buscar ayuda con ella.";
  patch(nodes, "c2-s1-risk1-1", {
    text: "Pasan las semanas. El rumor crece y Sofi se siente mal por no hacer nada.",
  });
  patch(nodes, "c2-s1-risk1-2", { text: "«¿Has visto lo que dicen de mí?»" });
  patch(nodes, "c2-s1-risk1-3", { text: "«No he dicho nada. Te lo prometí.»" });
  patch(nodes, "c2-s1-risk1-4", { text: "«Gracias. Pero me siento sola.»" });
  patch(nodes, "c2-s1-risk1-reconduction", {
    text: "Pasan las semanas. El rumor crece y Sofi se siente mal por no hacer nada.",
    lesson:
      "La lealtad no puede significar dejar a una amiga sin protección. Puedes respetar su silencio y, a la vez, buscar ayuda con ella.",
  });

  // Lucía answers by message; Sofi is the one on stage.
  patch(nodes, "c2-s2-ok-2", { remote: true, cast: { sofi: "neutral" } });
  patch(nodes, "c2-s2-safe-talk-2", { remote: true, cast: { sofi: "neutral" } });
  patch(nodes, "c2-s2-safe-talk-3-pausa", {
    text: "Sofi sale al pasillo y apoya la cabeza en la pared. A veces acompañar empieza por no tener la respuesta perfecta.",
    scene: "hallway-day",
    cast: { sofi: "neutral" },
  });

  patch(nodes, "persp-sofi-3", {
    text: "Mientras Maya llama al 116 111, Sofi busca cómo ayudar sin exponerla. No todo lo que encuentra en internet sirve.",
  });
  patch(nodes, "persp-sofi-4", {
    text: "Ahora que Maya está en un recurso, Sofi aprende a estar cerca sin saberlo todo.",
  });

  // Sofi is on stage and the father is the voice on the phone.
  patch(nodes, "c1-s2-risk2-2", { remote: false });
  for (const id of ["c1-s2-risk2-4", "c1-s2-risk2-6"]) {
    patch(nodes, id, { remote: false, cast: { sofi: "neutral" } });
  }

  /* ------------------------------------------------ chapter 3 · Maya */

  patch(nodes, "c3-m1", {
    prompt: "Lucía le ha dado a Maya el número 116 111 por teléfono. Maya duda. ¿Qué hace?",
  });
  patch(nodes, "c3-m1-ok-2", { remote: true, cast: { maya: "neutral" } });
  patch(nodes, "c3-m1-ok-3", { next: "c3-m1-call-lucia" });
  add(
    nodes,
    "c3-m1-call-lucia",
    narration({
      text: "Cuando termina la llamada, Maya marca el número de Lucía y le cuenta lo que le han dicho.",
      next: "c3-m1-safe-talk-1",
      scene: "home-kitchen-cold",
      cast: { maya: "neutral" },
    }),
  );
  patch(nodes, "c3-m1-safe-talk-1", { remote: true, cast: { maya: "neutral" } });
  patch(nodes, "c3-m1-safe-talk-2", { cast: { maya: "neutral" } });
  patch(nodes, "c3-m1-safe-talk-3", { remote: true, cast: { maya: "neutral" } });
  patch(nodes, "c3-m1-safe-talk-3-pausa", { cast: { maya: "neutral" } });
  for (const id of ["c3-m1-risk1-3", "c3-m1-risk1-5"]) {
    patch(nodes, id, { remote: true, cast: { maya: "neutral" } });
  }
  for (const id of ["c3-m1-risk2-2", "c3-m1-risk2-4"]) {
    patch(nodes, id, { remote: true, cast: { maya: "neutral" } });
  }

  patch(nodes, "c3-m2", {
    prompt: "El tío de Maya la llama: «No arruines a la familia. Retira lo que has contado.» ¿Qué hace?",
  });
  patch(nodes, "c3-m2-ok", {
    text: "Maya le cuenta a Lucía por teléfono lo que ha dicho su tío. Lucía lo apunta y le explica que la presión familiar también es algo que el equipo debe conocer.",
  });
  patch(nodes, "c3-m2-ok-2", { remote: true, cast: { maya: "neutral" } });
  patch(nodes, "c3-m2-ok-3", { cast: { maya: "neutral" } });
  patch(nodes, "c3-m2-safe-talk-3-pausa", {
    next: "c3-m2-to-office",
    cast: { madre: "neutral" },
  });
  add(
    nodes,
    "c3-m2-to-office",
    narration({
      text: "Días después, Maya y su madre acuden a la entrevista en orientación.",
      next: "c3-m3",
      scene: "orientation-office",
      cast: { maya: "neutral" },
      perspective: "maya",
      mood: "tense",
    }),
  );
  patch(nodes, "c3-m2-risk1-1", {
    text: "El tío llama al móvil de Maya. La presión familiar gana tiempo. Maya vuelve a quedarse sin protección.",
  });
  for (const id of ["c3-m2-risk1-2", "c3-m2-risk1-4", "c3-m2-risk2-3", "c3-m2-risk2-5"]) {
    patch(nodes, id, { remote: true, cast: { maya: "neutral" } });
  }
  patch(nodes, "c3-m2-risk2-1", {
    text: "El tío llama al móvil de Maya. La conversación se rompe. Maya se queda con rabia y sin un adulto que interceda.",
  });

  // Sofi waits outside the interview; the conversation happens afterwards.
  patch(nodes, "c3-m3-ok-3", { next: "c3-m3-after-interview" });
  add(
    nodes,
    "c3-m3-after-interview",
    narration({
      text: "Al salir, Sofi la espera fuera. No le pregunta qué ha dicho.",
      next: "c3-m3-safe-talk-1",
      scene: "orientation-office",
      cast: { sofi: "neutral" },
    }),
  );
  patch(nodes, "c3-m3-safe-talk-1", {
    speaker: "Sofi",
    text: "«¿Cómo ha ido?»",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c3-m3-safe-talk-2", {
    speaker: "Maya",
    text: "«Me han escuchado.»",
    cast: { maya: "neutral" },
  });
  patch(nodes, "c3-m3-safe-talk-3", {
    speaker: "Sofi",
    text: "«Me alegro. Yo estaba aquí fuera.»",
    cast: { sofi: "neutral" },
  });

  patch(nodes, "c3-m3-risk1-6", {
    text: "La sala sigue en silencio. Maya ya sabe que hay algo que no puede cargar sola.",
  });

  // The mother is on the phone, not inside the interview room.
  patch(nodes, "c3-m3-risk2-1", {
    text: "Maya llama a su madre desde orientación. Madre e hija se quedan sin un lugar seguro y sin apoyo profesional. El aislamiento crece.",
  });
  for (const id of ["c3-m3-risk2-3", "c3-m3-risk2-5"]) {
    patch(nodes, id, { remote: true, cast: { maya: "neutral" } });
  }
  for (const id of ["c3-m3-risk2-2", "c3-m3-risk2-4"]) {
    patch(nodes, id, { remote: false, cast: { maya: "neutral" } });
  }

  /* ------------------------------------------------ chapter 3 · Sofi */

  // Sofi finds Maya in the hallway; the interview is the next scene.
  patch(nodes, "c3-s1-ok-2", { next: "c3-s1-to-hall" });
  add(
    nodes,
    "c3-s1-to-hall",
    narration({
      text: "Después, Sofi encuentra a Maya en el pasillo.",
      next: "c3-s1-safe-talk-1",
      scene: "hallway-day",
      cast: { sofi: "neutral" },
    }),
  );
  patch(nodes, "c3-s1-safe-talk-3-pausa", {
    scene: "hallway-day",
    next: "c3-s1-to-interview",
  });
  add(
    nodes,
    "c3-s1-to-interview",
    narration({
      text: "El día de la entrevista, Maya espera frente a la puerta de orientación.",
      next: "c3-s2",
      scene: "orientation-office",
      cast: { maya: "neutral" },
      perspective: "sofi",
      mood: "warm",
    }),
  );
  patch(nodes, "c3-s1-risk1-6", {
    text: "La oficina sigue en silencio, pero Sofi ya no escucha las mismas cosas que antes.",
  });

  patch(nodes, "c3-s2-safe-talk-3", {
    speaker: "Sofi",
    text: "«Vale. Se lo cuento ahora.»",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c3-s2-safe-talk-3-pausa", {
    text: "Más tarde, ya en clase, una compañera pasa corriendo. Sofi sonríe sin ganas y vuelve a ordenar sus pensamientos.",
    scene: "classroom-day",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c3-s2-risk1-6", {
    text: "Sofi apoya la espalda en la pared de orientación. No todo está perdido: puede volver a intentarlo de otra manera.",
  });
  patch(nodes, "c3-s2-risk2-6", {
    text: "La puerta de orientación sigue cerrada. La decisión sigue delante, y esta vez Sofi quiere mirarla con más calma.",
  });

  // Maya reads the message on stage; Papá is the removed voice.
  patch(nodes, "c2-m4-risk1-2", { remote: false });
  for (const id of ["c2-m4-risk1-4", "c2-m4-risk1-6"]) {
    patch(nodes, id, { remote: false, cast: { maya: "neutral" } });
  }

  // The class group explodes in a chat, not in spoken dialogue.
  patch(nodes, "c3-s3-safe-talk-3", { next: "c3-s3-to-chat" });
  add(
    nodes,
    "c3-s3-to-chat",
    narration({
      text: "En el grupo de clase empiezan a llegar mensajes. Sofi abre el móvil.",
      next: "c3-s4-whatsapp",
      scene: "classroom-day",
      cast: { sofi: "neutral" },
    }),
  );
  patch(nodes, "c3-s4-whatsapp", {
    messages: [
      { from: "Dani", text: "os habéis enterado de lo de la familia de maya?", time: "12:10" },
      { from: "Hugo", text: "qué ha pasado", time: "12:10" },
      { from: "Dani", text: "que han llamado a la policía\no algo", time: "12:11" },
      { from: "Compañera", text: "en serio??", time: "12:11" },
      { from: "Sofi", text: "no sigáis con eso", time: "12:12" },
      { from: "Dani", text: "solo preguntaba", time: "12:12" },
      { from: "Hugo", text: "yo solo lo he oído de pasada", time: "12:13" },
    ],
    next: "c3-s4-pausa",
  });
  add(
    nodes,
    "c3-s4-pausa",
    narration({
      text: "Sofi silencia el grupo y guarda el móvil. No quiere que el rumor siga creciendo.",
      next: "c3-s4",
      scene: "classroom-day",
      cast: { sofi: "neutral" },
      perspective: "sofi",
      mood: "tense",
    }),
  );

  patch(nodes, "c3-s4-ok", {
    text: "Sofi no responde al mensaje del grupo. Guarda una captura y baja a orientación.",
    next: "c3-s4-to-office",
  });
  add(
    nodes,
    "c3-s4-to-office",
    narration({
      text: "Sofi le enseña los mensajes a Lucía.",
      next: "c3-s4-ok-2",
      scene: "orientation-office",
      cast: { sofi: "neutral" },
    }),
  );
  patch(nodes, "c3-s4-safe-talk-1", {
    speaker: "Lucía",
    text: "«Hablaré con el grupo sin contar su historia.»",
    cast: { lucia: "neutral" },
  });
  patch(nodes, "c3-s4-safe-talk-2", {
    speaker: "Sofi",
    text: "«Gracias. ¿Puedo decirle a Maya que el centro ya lo sabe?»",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c3-s4-safe-talk-3", {
    speaker: "Lucía",
    text: "«Sí. Con cuidado.»",
    cast: { lucia: "neutral" },
  });
  patch(nodes, "c3-s4-risk2-6", {
    text: "El aula sigue llena de voces, pero Sofi ya no escucha las mismas cosas que antes.",
  });

  patch(nodes, "c4-m1-risk1-6", {
    text: "La sala sigue en silencio. Maya respira hondo y vuelve a mirar la situación desde el principio.",
  });

  /* ------------------------------------------------ chapter 4 · Maya */

  patch(nodes, "c4-m1-safe-talk-3", { next: "c4-m1-to-shelter" });
  add(
    nodes,
    "c4-m1-to-shelter",
    narration({
      text: "Esa tarde, Maya y su madre llegan al recurso de acogida. El móvil de mamá se ilumina.",
      next: "c4-m2-whatsapp",
      scene: "shelter-room",
      cast: { maya: "sad" },
      perspective: "maya",
      mood: "tense",
    }),
  );
  patch(nodes, "c4-m2-whatsapp", {
    messages: [
      { from: "Papá", text: "si no retiráis la denuncia\nos quedáis sin nada", time: "10:02" },
      { from: "Papá", text: "lo digo por vosotras", time: "10:03" },
      { from: "Mamá", text: "no me escribas más", time: "10:04" },
      { from: "Papá", text: "tú verás", time: "10:04" },
    ],
    next: "c4-m2-pausa",
  });
  add(
    nodes,
    "c4-m2-pausa",
    narration({
      text: "Maya lee la conversación por encima del hombro de su madre. No dice nada.",
      next: "c4-m2",
      scene: "shelter-room",
      cast: { maya: "sad" },
      perspective: "maya",
      mood: "tense",
    }),
  );
  patch(nodes, "c4-m2-safe-talk-3-pausa", {
    text: "Maya se queda un momento en silencio. En el recurso solo se oye el zumbido de la nevera.",
    scene: "shelter-room",
    cast: { maya: "neutral" },
  });

  patch(nodes, "c4-m3-risk2-1", {
    text: "Sofi llama a Maya. La ubicación del recurso puede quedar expuesta y la seguridad de todas las personas del lugar se resiente.",
  });
  for (const id of ["c4-m3-risk2-2", "c4-m3-risk2-4"]) {
    patch(nodes, id, { remote: true, cast: { maya: "neutral" } });
  }
  patch(nodes, "c4-m3-risk2-6", {
    text: "La habitación del recurso sigue en silencio. La decisión sigue delante, esperando otra respuesta.",
  });

  patch(nodes, "c4-m2-risk2-2", { remote: false });
  for (const id of ["c4-m2-risk2-3", "c4-m2-risk2-5"]) {
    patch(nodes, id, { remote: false, cast: { maya: "neutral" } });
  }
  patch(nodes, "c4-m2-risk2-6", { remote: false, cast: { lucia: "neutral" } });
  patch(nodes, "c4-m2-risk2-7", {
    text: "La sala del recurso sigue en silencio. Maya respira hondo y vuelve a mirar la situación desde el principio.",
  });

  /* ------------------------------------------------ chapter 4 · Sofi */

  // Sofi's contact with Maya is a phone call. Show Sofi listening.
  const c4s1Safe = nodes["c4-s1"].options.find((option) => option.id === "c4-s1-safe");
  c4s1Safe.next = "c4-s1-call";
  add(
    nodes,
    "c4-s1-call",
    narration({
      text: "Esa tarde, Sofi llama a Maya. No le pregunta dónde está.",
      next: "c4-s1-ok",
      scene: "hallway-day",
      cast: { sofi: "neutral" },
    }),
  );
  patch(nodes, "c4-s1-ok-2", { remote: true, cast: { sofi: "neutral" } });
  patch(nodes, "c4-s1-ok-3", { next: "c4-s1-to-lucia" });
  add(
    nodes,
    "c4-s1-to-lucia",
    narration({
      text: "Al día siguiente, Sofi habla con Lucía antes de entrar a clase.",
      next: "c4-s1-safe-talk-1",
      scene: "hallway-day",
      cast: { sofi: "neutral" },
    }),
  );
  patch(nodes, "c4-s1-safe-talk-1", {
    speaker: "Sofi",
    text: "«¿Puedo decirle a Maya que la espero cuando vuelva al colegio?»",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c4-s1-safe-talk-3-pausa", {
    text: "Sofi llega a clase y se detiene antes de cruzar la puerta. Las voces llegan desde dentro.",
    scene: "classroom-day",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c4-s1-risk1-1", {
    text: "Sofi llama a Maya y le pide la dirección. La ubicación se convierte en información compartida y el recurso tiene que intervenir.",
  });
  for (const id of ["c4-s1-risk1-3", "c4-s1-risk1-5"]) {
    patch(nodes, id, { remote: true, cast: { sofi: "neutral" } });
  }
  patch(nodes, "c4-s1-risk2-1", {
    text: "Sofi llama a Maya. Maya siente que tiene que cuidar también el enfado de Sofi. La amistad se llena de culpa.",
  });
  for (const id of ["c4-s1-risk2-3", "c4-s1-risk2-5"]) {
    patch(nodes, id, { remote: true, cast: { sofi: "neutral" } });
  }
  patch(nodes, "c4-s1-risk2-6", {
    text: "El pasillo sigue lleno de voces, pero Sofi ya no escucha las mismas cosas que antes.",
  });

  // The conversation about school materials is a call from the empty class.
  patch(nodes, "c4-s2-ok-3", { next: "c4-s2-call" });
  add(
    nodes,
    "c4-s2-call",
    narration({
      text: "Esa tarde, Sofi llama a Maya desde el aula vacía.",
      next: "c4-s2-safe-talk-1",
      scene: "classroom-day",
      cast: { sofi: "neutral" },
    }),
  );
  patch(nodes, "c4-s2-safe-talk-1", {
    speaker: "Sofi",
    text: "«¿Quieres que te guarde los apuntes de clase?»",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c4-s2-safe-talk-2", {
    speaker: "Maya",
    text: "«Sí. Aunque no sé cuándo volveré.»",
    remote: true,
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c4-s2-safe-talk-3", {
    speaker: "Sofi",
    text: "«Cuando vuelvas, ahí estarán.»",
    cast: { sofi: "neutral" },
  });
  patch(nodes, "c4-s2-safe-talk-3-pausa", { next: "c4-s2-to-return" });
  add(
    nodes,
    "c4-s2-to-return",
    narration({
      text: "Unos días después, Maya vuelve al colegio.",
      next: "c4-s3",
      scene: "classroom-day",
      cast: { sofi: "neutral" },
      perspective: "sofi",
      mood: "warm",
    }),
  );
  patch(nodes, "c4-s2-risk1-6", {
    text: "El aula sigue llena de voces, pero Sofi ya no escucha las mismas cosas que antes.",
  });
  patch(nodes, "c4-s3-risk1-6", {
    text: "Sofi se apoya en la pared del aula. No todo está perdido: puede volver a intentarlo de otra manera.",
  });

  /* ------------------------------------- text messages shown as text */

  // "Send twenty messages" is a chat scene, not spoken dialogue.
  patch(nodes, "c1-s2-risk1-1", { next: "c1-s2-risk1-chat" });
  add(
    nodes,
    "c1-s2-risk1-chat",
    chat({
      title: "Maya",
      self: "Sofi",
      messages: [
        { from: "Sofi", text: "maya??", time: "22:14" },
        { from: "Sofi", text: "maya contéstame", time: "22:14" },
        { from: "Sofi", text: "necesito saber que estás bien", time: "22:15" },
        { from: "Maya", text: "no puedo contestar ahora", time: "22:16" },
        { from: "Sofi", text: "pero estoy preocupada", time: "22:16" },
        { from: "Maya", text: "y yo no puedo cuidarte a ti también", time: "22:17" },
      ],
      next: "c1-s2-risk1-6",
      scene: "bedroom-evening",
      cast: { sofi: "sad" },
      perspective: "sofi",
      mood: "tense",
    }),
  );
  for (const id of ["c1-s2-risk1-2", "c1-s2-risk1-3", "c1-s2-risk1-4", "c1-s2-risk1-5"]) {
    remove(nodes, id);
  }

  // The group-chat threat is also a chat scene.
  patch(nodes, "c2-m2-risk2-1", { next: "c2-m2-risk2-chat" });
  add(
    nodes,
    "c2-m2-risk2-chat",
    chat({
      title: "4.º B · grupo de clase",
      self: "Maya",
      messages: [
        { from: "Maya", text: "si no borráis eso os vais a arrepentir", time: "17:48" },
        { from: "Compañero", text: "¿lo habéis leído? está loca JAJA", time: "17:48" },
        { from: "Maya", text: "he dicho que lo borréis", time: "17:49" },
        { from: "Sofi", text: "maya, para. esto no ayuda", time: "17:49" },
        { from: "Dani", text: "se le ha ido la cabeza", time: "17:50" },
      ],
      next: "c2-m2-risk2-6",
      scene: "home-living-cold",
      cast: { maya: "sad" },
      perspective: "maya",
      mood: "tense",
    }),
  );
  for (const id of ["c2-m2-risk2-2", "c2-m2-risk2-3", "c2-m2-risk2-4", "c2-m2-risk2-5"]) {
    remove(nodes, id);
  }

  /* ------------------------------------- remaining room-text mismatches */

  patch(nodes, "c1-m1-risk2-1", {
    text: "La música no tapa los gritos. Maya se queda en el sofá, con los auriculares puestos y una culpa que no le corresponde.",
  });
  patch(nodes, "c1-m1-risk2-2", { text: "«Maya, ¿estás ahí?»" });
  patch(nodes, "c1-m1-risk2-3", { text: "«Sí. No quiero oír nada.»" });
  patch(nodes, "c1-m1-risk2-4", { text: "«¿Puedes mirarme?»" });

  patch(nodes, "c1-m3-risk1-2", {
    text: "La puerta de la cocina se abre sin llamar. Papá ve la libreta sobre la mesa.",
  });

  // Sofi is not in Maya's kitchen; Mamá is.
  patch(nodes, "c1-m3-risk2-2", {
    speaker: "Mamá",
    text: "«¿Qué haces con esos papeles?»",
    cast: { madre: "neutral" },
  });
  patch(nodes, "c1-m3-risk2-4", {
    speaker: "Mamá",
    text: "«¿No los necesitas?»",
    cast: { madre: "neutral" },
  });

  patch(nodes, "c1-s2-risk2-8", {
    text: "La habitación sigue en silencio. Sofi ya no escucha las mismas cosas que antes.",
  });
  patch(nodes, "c1-s3-risk1-6", {
    text: "El aula sigue en silencio. Sofi ya no escucha las mismas cosas que antes.",
  });
  patch(nodes, "c2-s1-risk2-6", {
    text: "El timbre suena a lo lejos. La decisión sigue delante, y esta vez Sofi quiere mirarla con más calma.",
  });
  patch(nodes, "c2-s3-risk2-6", {
    text: "El pasillo se queda en silencio, pero Sofi ya no escucha las mismas cosas que antes.",
  });
  patch(nodes, "c3-s1-risk1-6", {
    text: "La oficina sigue en silencio, pero Sofi ya no escucha las mismas cosas que antes.",
  });
  patch(nodes, "c3-s4-risk2-6", {
    text: "El aula sigue llena de voces, pero Sofi ya no escucha las mismas cosas que antes.",
  });
  patch(nodes, "c4-m3-risk2-6", {
    text: "La habitación del recurso sigue en silencio. La decisión sigue delante, esperando otra respuesta.",
  });

  // Lucía answers a call, not a face-to-face question in Maya's living room.
  patch(nodes, "c2-m4-risk2-1", {
    text: "Maya borra la prueba antes de que Lucía pueda verla. Cuando Lucía la llama, no sabe qué decir.",
  });
  for (const id of ["c2-m4-risk2-2", "c2-m4-risk2-4"]) {
    patch(nodes, id, { remote: true, cast: { maya: "neutral" } });
  }

  return nodes;
}
