import assert from "node:assert/strict";
import { DrawingMetricsCollector } from "../src/services/DrawingMetricsCollector.js";
import { avatarStore } from "../src/services/avatarStore.js";

console.log("=== Testing DrawingMetricsCollector and Psychological Graphometry ===");

// 1. Test clean line (low tremor)
const cleanCollector = new DrawingMetricsCollector({ canvasWidth: 400, canvasHeight: 400 });
cleanCollector.onPointerDown({ x: 100, y: 100, pressure: 0.5, width: 6 });
for (let i = 1; i <= 20; i++) {
  cleanCollector.onPointerMove({ x: 100 + i * 5, y: 100 + i * 5, pressure: 0.5, width: 6 });
}
cleanCollector.onPointerUp();

const cleanMetrics = cleanCollector.finalize("phase1");
console.log("Clean line tremor index:", cleanMetrics.tremor.jitter_index);
assert.equal(cleanMetrics.tremor.jitter_index, 0, "A straight diagonal line must have 0 high-frequency inflection jitter");
assert.equal(cleanMetrics.strokes_count, 1);
assert.ok(cleanMetrics.duration_total_ms >= 0);
assert.ok(cleanMetrics.spatial.occupancy_ratio > 0);

// 2. Test high-frequency jitter line (simulating acute anxiety/tremor)
const tremorCollector = new DrawingMetricsCollector({ canvasWidth: 400, canvasHeight: 400 });
tremorCollector.onPointerDown({ x: 50, y: 50, pressure: 0.85, width: 6 });
for (let i = 1; i <= 30; i++) {
  const zigzagY = i % 2 === 0 ? 55 : 45;
  tremorCollector.onPointerMove({ x: 50 + i * 3, y: zigzagY, pressure: 0.85, width: 6 });
}
tremorCollector.onPointerUp();

const tremorMetrics = tremorCollector.finalize("phase2");
console.log("Tremor line jitter index:", tremorMetrics.tremor.jitter_index);
assert.ok(tremorMetrics.tremor.jitter_index > 10, "A jagged high-frequency zigzag line must yield an elevated tremor jitter index");
assert.ok(tremorMetrics.pressure.mean > 0.8, "Pressure mean should reflect high pressure");

// 3. Test Delta Analysis & Alerts in avatarStore
avatarStore.clear();
avatarStore.savePhase1("data:image/png;base64,mockPhase1", cleanMetrics);
avatarStore.savePhase2("data:image/png;base64,mockPhase2", tremorMetrics);

const delta = avatarStore.getDeltaMetrics();
console.log("Computed Delta Metrics:", delta);
assert.ok(delta !== null, "Delta metrics must be computed between Phase 1 and Phase 2");
assert.ok(delta.delta_tremor_index > 0, "Delta tremor index must be positive (tremor increased)");
assert.ok(delta.delta_pressure_mean > 0, "Delta pressure must be positive");

const alerts = avatarStore.getAlerts();
console.log("Generated Psychological Alerts:", alerts.map(a => a.title));
assert.ok(alerts.length > 0, "At least one psychological alert (tremor increase) should be triggered");
const tremorAlert = alerts.find(a => a.type === "tremor_increase");
assert.ok(tremorAlert, "Tremor increase alert must be generated");

// 4. Test Session Report Export
const report = avatarStore.exportReport();
assert.equal(report.phase1_metrics.phase, "phase1");
assert.equal(report.phase2_metrics.phase, "phase2");
assert.ok(Array.isArray(report.alerts));

console.log("✔ All Graphometry and Psychological Metrics tests passed successfully!");
