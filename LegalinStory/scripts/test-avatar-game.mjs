import assert from "node:assert/strict";
import { avatarStore } from "../src/services/avatarStore.js";

console.log("=== Testing Avatar Game Logic and Irreversibility ===");

// 1. Initial state
avatarStore.clear();
assert.equal(avatarStore.isPhase1Completed(), false, "Phase 1 should initially be incomplete");
assert.equal(avatarStore.isPhase2Completed(), false, "Phase 2 should initially be incomplete");
assert.equal(avatarStore.isPhase3Completed(), false, "Phase 3 should initially be incomplete");
assert.equal(avatarStore.getActiveAvatar(), null, "Active avatar should initially be null");

// 2. Phase 1: Draw Pre-trauma avatar
const mockAvatar1 = "data:image/png;base64,mockPhase1PreTraumaData";
avatarStore.savePhase1(mockAvatar1);

assert.equal(avatarStore.isPhase1Completed(), true, "Phase 1 should be complete after saving");
assert.equal(avatarStore.getPhase1(), mockAvatar1, "Phase 1 drawing should match stored data");
assert.equal(avatarStore.getActiveAvatar(), mockAvatar1, "Active avatar should be Phase 1 drawing");
assert.equal(avatarStore.isPhase2Completed(), false, "Phase 2 must still be incomplete");

// 3. Phase 2: Post-trauma avatar
const mockAvatar2 = "data:image/png;base64,mockPhase2PostTraumaData";
avatarStore.savePhase2(mockAvatar2);

assert.equal(avatarStore.isPhase2Completed(), true, "Phase 2 should be complete after saving");
assert.equal(avatarStore.getPhase2(), mockAvatar2, "Phase 2 drawing should match stored data");
assert.equal(avatarStore.getActiveAvatar(), mockAvatar2, "Active avatar must now be Phase 2 drawing (profile photo updated)");

// 4. Phase 3: Final Integration & Choice
// Test choosing Phase 1
avatarStore.saveFinalChoice("phase1");
assert.equal(avatarStore.isPhase3Completed(), true, "Phase 3 should be marked complete");
assert.equal(avatarStore.getFinalChoice(), "phase1", "Final choice should be phase1");
assert.equal(avatarStore.getActiveAvatar(), mockAvatar1, "Active avatar should reflect final choice (phase1)");

// Test choosing Phase 2
avatarStore.saveFinalChoice("phase2");
assert.equal(avatarStore.getFinalChoice(), "phase2", "Final choice should be phase2");
assert.equal(avatarStore.getActiveAvatar(), mockAvatar2, "Active avatar should reflect final choice (phase2)");

// 5. Test Persistence and Reset
avatarStore.clear();
assert.equal(avatarStore.isPhase1Completed(), false, "Phase 1 should be reset after clear");
assert.equal(avatarStore.getActiveAvatar(), null, "Active avatar should be null after clear");

console.log("✔ All Avatar Game logic and transition tests passed successfully!");
