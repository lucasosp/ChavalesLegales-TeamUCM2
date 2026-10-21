/**
 * Structural simplification for "Dos voces".
 *
 * Focuses the story on domestic violence and removes the leaked-photo subplot,
 * the school-rumour subplot and the post-choice conversation filler. It also
 * removes the notebook minigame. Choices keep their consequence stories, but
 * risky options continue forward after the warning instead of rewinding.
 *
 * Runs after the plain-language pass so the generated story is always the same
 * when `npm run story:build:dos-voces` is executed.
 */

function removeMany(nodes, ids, targetId) {
  const remove = new Set(ids.filter((id) => nodes[id] && id !== targetId));
  if (!nodes[targetId]) {
    throw new Error(`dos-voces simplify: missing target node "${targetId}"`);
  }

  for (const node of Object.values(nodes)) {
    if (remove.has(node.next)) node.next = targetId;
    if (remove.has(node.then)) node.then = targetId;
    if (remove.has(node.else)) node.else = targetId;
    for (const option of node.options ?? []) {
      if (remove.has(option.next)) option.next = targetId;
    }
  }

  for (const id of remove) delete nodes[id];
}

function removeSafeTalk(nodes) {
  const talk = new Set(
    Object.keys(nodes).filter((id) => /-safe-talk-\d+$/.test(id)),
  );

  for (const node of Object.values(nodes)) {
    if (talk.has(node.next)) {
      let next = node.next;
      while (talk.has(next)) next = nodes[next].next;
      node.next = next;
    }
    if (talk.has(node.then)) {
      let next = node.then;
      while (talk.has(next)) next = nodes[next].next;
      node.then = next;
    }
    if (talk.has(node.else)) {
      let next = node.else;
      while (talk.has(next)) next = nodes[next].next;
      node.else = next;
    }
    for (const option of node.options ?? []) {
      if (!talk.has(option.next)) continue;
      let next = option.next;
      while (talk.has(next)) next = nodes[next].next;
      option.next = next;
    }
  }

  for (const id of talk) delete nodes[id];
}

export function simplifyDosVoces(nodes) {
  // Post-choice conversations are pacing filler. The story keeps the
  // consequence of each decision and moves straight to the next beat.
  removeSafeTalk(nodes);

  // The leaked-photo plot: messages, image decision and Sofi's forwarding
  // dilemma. Keep the transition to the next school day.
  removeMany(
    nodes,
    Object.keys(nodes).filter(
      (id) => /^c2-m1-to-chat$|^c2-whatsapp|^c2-m2(?!-to-school)/.test(id),
    ),
    "c2-m2-to-school",
  );

  // Sofi's photo-forwarding branch.
  removeMany(
    nodes,
    Object.keys(nodes).filter(
      (id) => /^c2-s2/.test(id) && id !== "c2-s2-safe-talk-3-pausa",
    ),
    "c2-s2-safe-talk-3-pausa",
  );

  // Class-rumour branch and the group chat about Maya's family.
  removeMany(
    nodes,
    Object.keys(nodes).filter(
      (id) => /^c3-s3|^c3-s4|^c3-s2-safe-talk-3-pausa$/.test(id),
    ),
    "cap4",
  );

  // Sofi's online-research branch is useful but not essential for the
  // domestic-violence focus. Keep her support before the interview.
  removeMany(
    nodes,
    Object.keys(nodes).filter((id) => /^c3-s1/.test(id)),
    "c3-s2",
  );

  // School-rumour branch in chapter 4.
  removeMany(
    nodes,
    Object.keys(nodes).filter(
      (id) =>
        (/^c4-s2/.test(id) && id !== "c4-s2-to-return") ||
        id === "c4-s1-safe-talk-3-pausa",
    ),
    "c4-s2-to-return",
  );

  // Weekend plan and the teacher scene: they do not move the domestic-violence
  // plot forward. The Sofi chapter keeps the night call and the patio scene.
  removeMany(
    nodes,
    Object.keys(nodes).filter(
      (id) => /^c1-s3|^c1-s4|^c1-s2-safe-talk-3-pausa$/.test(id),
    ),
    "cap2",
  );

  // Sofi's final school-return scene is a quiet coda; the workshop card closes
  // the story instead.
  removeMany(
    nodes,
    Object.keys(nodes).filter((id) => /^c4-s3/.test(id)),
    "cap5",
  );

  // These beats only introduced post-choice conversations that are now gone.
  removeMany(nodes, ["c1-m1-call"], "c1-m2");
  removeMany(nodes, ["c1-m4-call"], "persp-sofi-1");
  removeMany(nodes, ["c1-s2-next-day"], "cap2");
  removeMany(nodes, ["c3-m1-call-lucia"], "c3-m2");
  removeMany(nodes, ["c4-s1-to-lucia"], "c4-s2-to-return");

  // The notebook minigame adds reading and interaction without moving the
  // narrative. Keep a short quiz focused on domestic violence.
  if (nodes["libreta-minigame"]) {
    nodes["c5-intro-3"].next = "c5-quiz-intro";
    delete nodes["libreta-minigame"];
  }

  // The quiz keeps the two core ideas about domestic violence. The digital
  // image question belonged to the removed photo plot; the justice question is
  // covered by the rights panel.
  const quiz = nodes["final-quiz"];
  if (quiz) {
    quiz.questions = (quiz.questions ?? []).filter((question) =>
      ["q-violencia", "q-culpa"].includes(question.id),
    );
  }

  // Risky options now move forward. Their mini-story ends in a reconduction
  // node that shows the warning and then continues to the same place as the
  // safe branch. Compute that continuation after all structural removals.
  for (const node of Object.values(nodes)) {
    if (node.type !== "reconduction") continue;
    const choice = nodes[node.returnTo];
    if (!choice || choice.type !== "choice") {
      throw new Error(`dos-voces simplify: reconduction ${node.title} has no choice`);
    }
    const safe = (choice.options ?? []).find((option) => option.safe !== false);
    if (!safe?.next) {
      throw new Error(`dos-voces simplify: choice ${node.returnTo} has no safe option`);
    }

    // Follow the safe branch through its dialogue beats until the next
    // presentation node (choice, chat, chapter card, quiz, ending).
    let continuation = safe.next;
    const seen = new Set();
    while (continuation && nodes[continuation]?.type === "dialogue") {
      if (seen.has(continuation)) {
        throw new Error(`dos-voces simplify: loop in safe branch ${node.returnTo}`);
      }
      seen.add(continuation);
      continuation = nodes[continuation].next;
    }
    if (!continuation || !nodes[continuation]) {
      throw new Error(`dos-voces simplify: missing continuation for ${node.returnTo}`);
    }
    node.continueTo = continuation;
  }

  // Four endings: the decisions and the final quiz change the outcome, but a
  // risky option never sends the player back to the same choice.
  if (nodes["final-router"]) {
    nodes["final-router"].when = {
      all: [
        { gte: [{ flag: "quizScore" }, 2] },
        { lte: [{ flag: "errores" }, 1] },
      ],
    };
    nodes["final-router"].then = "final1";
    nodes["final-router"].else = "final-router2";
  }
  nodes["final-router2"] = {
    type: "branch",
    when: { lte: [{ flag: "errores" }, 3] },
    then: "final-router3",
    else: "final4",
  };
  nodes["final-router3"] = {
    type: "branch",
    when: { gte: [{ flag: "quizScore" }, 1] },
    then: "final2",
    else: "final3",
  };
  nodes["final4"] = {
    type: "ending",
    kicker: "Final 4",
    title: "La puerta no se cierra",
    text: "Maya ha tomado decisiones que la han acercado al miedo y ha necesitado más de un aviso. Aun así, Sofi, Lucía y los servicios de protección siguen ahí. Pedir ayuda otra vez sigue siendo posible.",
    scene: "orientation-office",
    cast: { maya: "neutral" },
    perspective: "red",
    mood: "safe",
  };

  return nodes;
}
