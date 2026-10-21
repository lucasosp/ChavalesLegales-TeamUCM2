/**
 * Manages the projective avatar drawings across the 3 sequential phases:
 * Phase 1 (Antes): Pre-trauma avatar drawn before the story begins.
 * Phase 2 (Durante/Post-trauma): Re-drawn avatar at the peak crisis, becomes profile picture.
 * Phase 3 (Después): Comparison & choice between Avatar 1 and Avatar 2 at the story ending.
 *
 * Enforces irreversibility and computes continuous graphometric telemetry
 * for psychological and forensic analysis.
 */

const STORAGE_KEY = "legalinstory_avatar_drawings";

class AvatarStore {
  constructor() {
    this.memory = {
      phase1: null,
      phase2: null,
      finalChoice: null, // "phase1" | "phase2"
      phase1Completed: false,
      phase2Completed: false,
      phase3Completed: false,
      phase1Metrics: null,
      phase2Metrics: null,
      deltaMetrics: null,
      alerts: [],
    };
    this.#load();
  }

  #load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.memory = { ...this.memory, ...parsed };
      }
    } catch {
      // localStorage may fail in restricted/sandboxed iframes; memory fallback is maintained
    }
  }

  #persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch {
      // fallback to memory
    }
  }

  savePhase1(dataUrl, metrics = null) {
    this.memory.phase1 = dataUrl;
    this.memory.phase1Completed = true;
    this.memory.phase1Metrics = metrics;
    this.#persist();
    this.#syncTelemetry("phase1", metrics, dataUrl);
  }

  savePhase2(dataUrl, metrics = null) {
    this.memory.phase2 = dataUrl;
    this.memory.phase2Completed = true;
    this.memory.phase2Metrics = metrics;

    if (this.memory.phase1Metrics && metrics) {
      this.memory.deltaMetrics = this.#computeDelta(this.memory.phase1Metrics, metrics);
      this.memory.alerts = this.#generateAlerts(this.memory.phase1Metrics, metrics, this.memory.deltaMetrics);
    }

    this.#persist();
    this.#syncTelemetry("phase2", metrics, dataUrl, this.memory.deltaMetrics, this.memory.alerts);
  }

  saveFinalChoice(choice) {
    if (choice !== "phase1" && choice !== "phase2") return;
    this.memory.finalChoice = choice;
    this.memory.phase3Completed = true;
    this.#persist();
    this.#syncTelemetry("phase3", { final_choice: choice });
  }

  getPhase1() {
    return this.memory.phase1;
  }

  getPhase2() {
    return this.memory.phase2;
  }

  getFinalChoice() {
    return this.memory.finalChoice;
  }

  getPhase1Metrics() {
    return this.memory.phase1Metrics;
  }

  getPhase2Metrics() {
    return this.memory.phase2Metrics;
  }

  getDeltaMetrics() {
    return this.memory.deltaMetrics;
  }

  getAlerts() {
    return this.memory.alerts || [];
  }

  isPhase1Completed() {
    return Boolean(this.memory.phase1Completed && this.memory.phase1);
  }

  isPhase2Completed() {
    return Boolean(this.memory.phase2Completed && this.memory.phase2);
  }

  isPhase3Completed() {
    return Boolean(this.memory.phase3Completed && this.memory.finalChoice);
  }

  /** Returns the active avatar URL to display in profiles and dialogue cards */
  getActiveAvatar() {
    if (this.memory.finalChoice === "phase1") return this.memory.phase1;
    if (this.memory.finalChoice === "phase2") return this.memory.phase2;
    if (this.memory.phase2Completed && this.memory.phase2) return this.memory.phase2;
    if (this.memory.phase1Completed && this.memory.phase1) return this.memory.phase1;
    return null;
  }

  /**
   * Calculates differential delta metrics between Phase 1 and Phase 2.
   */
  #computeDelta(m1, m2) {
    const deltaTremor = Number((m2.tremor.jitter_index - m1.tremor.jitter_index).toFixed(2));
    const tremorChangePct = m1.tremor.jitter_index > 0
      ? Number(((deltaTremor / m1.tremor.jitter_index) * 100).toFixed(1))
      : deltaTremor > 0 ? 100 : 0;

    const deltaPressure = Number((m2.pressure.mean - m1.pressure.mean).toFixed(3));
    const pressureChangePct = m1.pressure.mean > 0
      ? Number(((deltaPressure / m1.pressure.mean) * 100).toFixed(1))
      : 0;

    const deltaOccupancy = Number((m2.spatial.occupancy_ratio - m1.spatial.occupancy_ratio).toFixed(3));
    const occupancyChangePct = m1.spatial.occupancy_ratio > 0
      ? Number(((deltaOccupancy / m1.spatial.occupancy_ratio) * 100).toFixed(1))
      : 0;

    const deltaLatencyMs = m2.initial_latency_ms - m1.initial_latency_ms;
    const deltaAirTimeRatio = Number((m2.air_time_ratio - m1.air_time_ratio).toFixed(3));
    const deltaVelocity = Number((m2.velocity_px_per_ms.mean - m1.velocity_px_per_ms.mean).toFixed(3));
    const deltaErasures = m2.corrections.eraser_strokes - m1.corrections.eraser_strokes;

    return {
      delta_tremor_index: deltaTremor,
      tremor_change_percent: tremorChangePct,
      delta_pressure_mean: deltaPressure,
      pressure_change_percent: pressureChangePct,
      delta_occupancy_ratio: deltaOccupancy,
      occupancy_change_percent: occupancyChangePct,
      delta_initial_latency_ms: deltaLatencyMs,
      delta_air_time_ratio: deltaAirTimeRatio,
      delta_velocity_mean: deltaVelocity,
      delta_eraser_strokes: deltaErasures,
      m1_monochrome: m1.chromatic.is_monochrome,
      m2_monochrome: m2.chromatic.is_monochrome,
    };
  }

  /**
   * Produces clinically informative alerts based on differential thresholds.
   */
  #generateAlerts(m1, m2, delta) {
    const alerts = [];

    // 1. Inestabilidad motora / Temblor agudo
    if (delta.delta_tremor_index > 8 || delta.tremor_change_percent > 35) {
      alerts.push({
        type: "tremor_increase",
        severity: "warning",
        title: "Incremento significativo de temblor / inestabilidad motora",
        detail: `El índice de micro-oscilaciones aumentó un ${delta.tremor_change_percent}% tras el momento traumático (${m1.tremor.jitter_index} → ${m2.tremor.jitter_index}). Sugiere impacto neuromuscular o ansiedad aguda al evocar la situación.`,
      });
    }

    // 2. Micrografismo defensivo (contracción del dibujo)
    if (delta.delta_occupancy_ratio <= -0.15 || delta.occupancy_change_percent <= -30) {
      alerts.push({
        type: "micrographism",
        severity: "warning",
        title: "Retracción espacial / Micrografismo defensivo",
        detail: `La ocupación del lienzo se redujo un ${Math.abs(delta.occupancy_change_percent)}% post-trauma (${(m1.spatial.occupancy_ratio * 100).toFixed(0)}% → ${(m2.spatial.occupancy_ratio * 100).toFixed(0)}%). En pruebas proyectivas suele asociarse a repliegue afectivo, timidez o vivencia de vulnerabilidad.`,
      });
    }

    // 3. Macroescala / Desborde
    if (delta.occupancy_change_percent >= 50 && m2.spatial.occupancy_ratio > 0.7) {
      alerts.push({
        type: "macrographism",
        severity: "info",
        title: "Expansión gráfica acusada",
        detail: `La figura aumentó un ${delta.occupancy_change_percent}% ocupando el ${(m2.spatial.occupancy_ratio * 100).toFixed(0)}% del lienzo. Puede indicar reacción compensatoria o agitación.`,
      });
    }

    // 4. Bloqueo por latencia inicial
    if (m2.initial_latency_ms >= 5000 && delta.delta_initial_latency_ms > 2500) {
      alerts.push({
        type: "latency_block",
        severity: "warning",
        title: "Latencia de reacción prolongada (Bloqueo emocional)",
        detail: `El menor tardó ${(m2.initial_latency_ms / 1000).toFixed(1)}s en realizar el primer trazo tras la consigna post-trauma (+${(delta.delta_initial_latency_ms / 1000).toFixed(1)}s respecto a la Fase 1). Compatible con choque inicial ante la evocación del evento.`,
      });
    }

    // 5. Restricción cromática afectiva
    if (!m1.chromatic.is_monochrome && m2.chromatic.is_monochrome) {
      alerts.push({
        type: "chromatic_constriction",
        severity: "info",
        title: "Restricción afectiva / Monocromatismo",
        detail: `El menor utilizó múltiples colores en la Fase 1, pero se restringió a un único tono (${m2.chromatic.primary_color || "oscuro"}) tras el trauma.`,
      });
    }

    // 6. Hipercrítica / Inseguridad por borrado
    if (m2.corrections.eraser_strokes >= 4 || delta.delta_eraser_strokes >= 3) {
      alerts.push({
        type: "high_erasure",
        severity: "info",
        title: "Elevada frecuencia de borrado / Hipercrítica",
        detail: `Se registraron ${m2.corrections.eraser_strokes} trazos de borrado en el avatar post-trauma. Refleja duda, insatisfacción o rectificación insistente de la propia figura.`,
      });
    }

    return alerts;
  }

  async #syncTelemetry(phase, metrics, previewUrl = null, delta = null, alerts = null) {
    try {
      const payload = {
        phase,
        timestamp: new Date().toISOString(),
        metrics,
        delta,
        alerts,
        preview: previewUrl ? previewUrl.slice(0, 150) + "..." : null, // preview indicator
      };

      // Try sending to the backend if available
      if (typeof fetch === "function") {
        fetch("/api/telemetria/dibujo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {
          // Silent fallback for standalone / offline usage
        });
      }
    } catch {
      // offline safety
    }
  }

  exportReport() {
    return {
      session_summary: "Evaluación Proyectiva del Avatar en 3 Fases (Chavales Legales)",
      exported_at: new Date().toISOString(),
      final_choice: this.memory.finalChoice,
      phase1_metrics: this.memory.phase1Metrics,
      phase2_metrics: this.memory.phase2Metrics,
      differential_delta: this.memory.deltaMetrics,
      alerts: this.memory.alerts || [],
    };
  }

  clear() {
    this.memory = {
      phase1: null,
      phase2: null,
      finalChoice: null,
      phase1Completed: false,
      phase2Completed: false,
      phase3Completed: false,
      phase1Metrics: null,
      phase2Metrics: null,
      deltaMetrics: null,
      alerts: [],
    };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const avatarStore = new AvatarStore();
