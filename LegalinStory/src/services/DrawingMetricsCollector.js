/**
 * Real-time Kinematic and Projective Graphometry Collector for Child Psychological Assessment.
 *
 * Captures continuous stroke dynamics, pressure, velocity, tremor/motor jitter,
 * latencies, spatial distribution, chromatic preference, and erasures.
 */

export class DrawingMetricsCollector {
  constructor({ canvasWidth = 400, canvasHeight = 400 } = {}) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.openedAt = performance.now();
    this.firstStrokeAt = null;
    this.lastStrokeEndAt = null;

    this.strokes = [];
    this.currentStroke = null;

    this.currentColor = "#1e1b26";
    this.currentSize = 6;
    this.isEraser = false;
    this.colorSwitches = 0;
    this.colorTimeMap = {}; // color -> active ms

    this.undoCount = 0;
    this.clearCount = 0;
    this.hesitationPauses = []; // durations in ms for air-time > 2000ms
  }

  recordToolChange({ color, size, isEraser }) {
    if (color && color !== this.currentColor && !isEraser) {
      this.colorSwitches += 1;
      this.currentColor = color;
    }
    if (size !== undefined) {
      this.currentSize = size;
    }
    if (isEraser !== undefined) {
      this.isEraser = Boolean(isEraser);
    }
  }

  recordUndo() {
    this.undoCount += 1;
  }

  recordClear() {
    this.clearCount += 1;
    this.strokes = [];
  }

  onPointerDown({ x, y, pressure, width }) {
    const now = performance.now();
    if (!this.firstStrokeAt) {
      this.firstStrokeAt = now;
    }

    if (this.lastStrokeEndAt) {
      const airPause = now - this.lastStrokeEndAt;
      if (airPause >= 2000) {
        this.hesitationPauses.push(airPause);
      }
    }

    this.currentStroke = {
      color: this.isEraser ? "eraser" : this.currentColor,
      size: this.currentSize,
      isEraser: this.isEraser,
      startedAt: now,
      endedAt: null,
      points: [
        {
          x,
          y,
          t: now,
          p: typeof pressure === "number" ? pressure : 0.5,
          w: width || this.currentSize,
        },
      ],
    };
  }

  onPointerMove({ x, y, pressure, width }) {
    if (!this.currentStroke) return;
    const now = performance.now();
    this.currentStroke.points.push({
      x,
      y,
      t: now,
      p: typeof pressure === "number" ? pressure : 0.5,
      w: width || this.currentSize,
    });
  }

  onPointerUp() {
    if (!this.currentStroke) return;
    const now = performance.now();
    this.currentStroke.endedAt = now;
    const duration = now - this.currentStroke.startedAt;

    if (!this.currentStroke.isEraser) {
      const col = this.currentStroke.color;
      this.colorTimeMap[col] = (this.colorTimeMap[col] || 0) + duration;
    }

    this.strokes.push(this.currentStroke);
    this.currentStroke = null;
    this.lastStrokeEndAt = now;
  }

  /** Finalizes metrics compilation into a structured psychological report payload */
  finalize(phaseName) {
    const closedAt = performance.now();
    const totalDurationMs = Math.round(closedAt - this.openedAt);
    const initialLatencyMs = this.firstStrokeAt
      ? Math.round(this.firstStrokeAt - this.openedAt)
      : totalDurationMs;

    // Filter valid drawing points vs eraser
    let activeDrawingMs = 0;
    let eraserDrawingMs = 0;
    let eraserStrokesCount = 0;

    const allPoints = [];
    const drawingPoints = [];
    let totalLengthPx = 0;

    for (const stroke of this.strokes) {
      const strokeDuration = (stroke.endedAt || stroke.startedAt) - stroke.startedAt;
      if (stroke.isEraser) {
        eraserDrawingMs += strokeDuration;
        eraserStrokesCount += 1;
      } else {
        activeDrawingMs += strokeDuration;
      }

      const pts = stroke.points;
      for (let i = 0; i < pts.length; i++) {
        allPoints.push(pts[i]);
        if (!stroke.isEraser) drawingPoints.push(pts[i]);

        if (i > 0) {
          const dx = pts[i].x - pts[i - 1].x;
          const dy = pts[i].y - pts[i - 1].y;
          totalLengthPx += Math.sqrt(dx * dx + dy * dy);
        }
      }
    }

    // 1. Kinetic Pressure Analysis
    const pressures = drawingPoints.map((p) => p.p).filter((p) => typeof p === "number");
    let pressureMean = 0.5;
    let pressureMax = 0.5;
    let pressureStd = 0;
    let highPressureRatio = 0;
    let lowPressureRatio = 0;

    if (pressures.length > 0) {
      const sum = pressures.reduce((acc, v) => acc + v, 0);
      pressureMean = Number((sum / pressures.length).toFixed(3));
      pressureMax = Number(Math.max(...pressures).toFixed(3));
      const variance = pressures.reduce((acc, v) => acc + Math.pow(v - pressureMean, 2), 0) / pressures.length;
      pressureStd = Number(Math.sqrt(variance).toFixed(3));
      highPressureRatio = Number((pressures.filter((p) => p >= 0.75).length / pressures.length).toFixed(3));
      lowPressureRatio = Number((pressures.filter((p) => p <= 0.25).length / pressures.length).toFixed(3));
    }

    // 2. Velocity and Acceleration
    const speeds = [];
    for (const stroke of this.strokes) {
      const pts = stroke.points;
      for (let i = 1; i < pts.length; i++) {
        const dt = pts[i].t - pts[i - 1].t;
        if (dt > 0) {
          const ds = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
          speeds.push(ds / dt); // px per ms
        }
      }
    }

    const velocityMean = speeds.length > 0
      ? Number((speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(3))
      : 0;
    const velocityMax = speeds.length > 0
      ? Number(Math.max(...speeds).toFixed(3))
      : 0;

    // 3. Tremor and Motor Jitter Index
    // Evaluates high-frequency inflection angles in short distances (indicator of acute anxiety/tremor)
    let highFrequencyInflections = 0;
    for (const stroke of this.strokes) {
      const pts = stroke.points;
      if (pts.length < 3) continue;
      for (let i = 1; i < pts.length - 1; i++) {
        const v1x = pts[i].x - pts[i - 1].x;
        const v1y = pts[i].y - pts[i - 1].y;
        const v2x = pts[i + 1].x - pts[i].x;
        const v2y = pts[i + 1].y - pts[i].y;

        const d1 = Math.hypot(v1x, v1y);
        const d2 = Math.hypot(v2x, v2y);

        if (d1 > 0 && d2 > 0 && d1 + d2 < 20) {
          const angle1 = Math.atan2(v1y, v1x);
          const angle2 = Math.atan2(v2y, v2x);
          let diff = Math.abs(angle2 - angle1);
          if (diff > Math.PI) diff = 2 * Math.PI - diff;
          if (diff > Math.PI / 3) { // > 60 degree acute change
            highFrequencyInflections += 1;
          }
        }
      }
    }

    // Normalized jitter score 0 - 100
    const jitterIndex = totalLengthPx > 0
      ? Number(Math.min(100, (highFrequencyInflections / totalLengthPx) * 1000).toFixed(2))
      : 0;

    // 4. Spatial Bounding Box & Occupancy
    let xMin = this.canvasWidth;
    let yMin = this.canvasHeight;
    let xMax = 0;
    let yMax = 0;
    let sumX = 0;
    let sumY = 0;

    if (drawingPoints.length > 0) {
      for (const p of drawingPoints) {
        if (p.x < xMin) xMin = p.x;
        if (p.y < yMin) yMin = p.y;
        if (p.x > xMax) xMax = p.x;
        if (p.y > yMax) yMax = p.y;
        sumX += p.x;
        sumY += p.y;
      }
    } else {
      xMin = 0;
      yMin = 0;
      xMax = 0;
      yMax = 0;
    }

    const boxW = Math.max(0, xMax - xMin);
    const boxH = Math.max(0, yMax - yMin);
    const totalArea = this.canvasWidth * this.canvasHeight;
    const occupancyRatio = Number(Math.min(1, (boxW * boxH) / totalArea).toFixed(3));

    const centroidX = drawingPoints.length > 0 ? Number((sumX / (drawingPoints.length * this.canvasWidth)).toFixed(2)) : 0.5;
    const centroidY = drawingPoints.length > 0 ? Number((sumY / (drawingPoints.length * this.canvasHeight)).toFixed(2)) : 0.5;

    let quadrant = "center";
    if (centroidX < 0.45 && centroidY < 0.45) quadrant = "top-left";
    else if (centroidX > 0.55 && centroidY < 0.45) quadrant = "top-right";
    else if (centroidX < 0.45 && centroidY > 0.55) quadrant = "bottom-left";
    else if (centroidX > 0.55 && centroidY > 0.55) quadrant = "bottom-right";

    // 5. Chromatic Preferences
    const totalColorTime = Object.values(this.colorTimeMap).reduce((a, b) => a + b, 0) || 1;
    const colorDistribution = {};
    for (const [col, timeMs] of Object.entries(this.colorTimeMap)) {
      colorDistribution[col] = Number((timeMs / totalColorTime).toFixed(2));
    }

    const uniqueColorsUsed = Object.keys(this.colorTimeMap);
    const isMonochrome = uniqueColorsUsed.length <= 1;

    // 6. Hesitations & Air-time
    const airHesitationMs = Math.max(0, totalDurationMs - (activeDrawingMs + eraserDrawingMs));
    const airRatio = Number((airHesitationMs / Math.max(1, totalDurationMs)).toFixed(3));
    const maxPauseDurationMs = this.hesitationPauses.length > 0
      ? Math.round(Math.max(...this.hesitationPauses))
      : 0;

    return {
      phase: phaseName,
      captured_at: new Date().toISOString(),
      duration_total_ms: totalDurationMs,
      initial_latency_ms: initialLatencyMs,
      active_drawing_time_ms: Math.round(activeDrawingMs),
      air_hesitation_time_ms: airHesitationMs,
      air_time_ratio: airRatio,
      hesitation_pauses_count: this.hesitationPauses.length,
      max_pause_duration_ms: maxPauseDurationMs,
      strokes_count: this.strokes.length,
      total_path_length_px: Math.round(totalLengthPx),
      pressure: {
        mean: pressureMean,
        max: pressureMax,
        std_dev: pressureStd,
        high_pressure_ratio: highPressureRatio,
        low_pressure_ratio: lowPressureRatio,
      },
      velocity_px_per_ms: {
        mean: velocityMean,
        max: velocityMax,
      },
      tremor: {
        jitter_index: jitterIndex,
        inflections_count: highFrequencyInflections,
      },
      spatial: {
        occupancy_ratio: occupancyRatio,
        bounding_box: {
          x_min: Math.round(xMin),
          y_min: Math.round(yMin),
          x_max: Math.round(xMax),
          y_max: Math.round(yMax),
          width: Math.round(boxW),
          height: Math.round(boxH),
        },
        centroid: { x: centroidX, y: centroidY },
        predominant_quadrant: quadrant,
      },
      chromatic: {
        colors_used: uniqueColorsUsed,
        color_switches: this.colorSwitches,
        distribution: colorDistribution,
        is_monochrome: isMonochrome,
      },
      corrections: {
        eraser_strokes: eraserStrokesCount,
        eraser_time_ms: Math.round(eraserDrawingMs),
        undo_count: this.undoCount,
        clear_count: this.clearCount,
      },
    };
  }
}
