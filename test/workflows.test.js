import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkflowDefinition, WorkflowValidationError } from "../src/index.js";

const valid = { schemaVersion: 1, id: "demo", steps: [
  { id: "start", kind: "agent", config: { name: "planner" } },
  { id: "review", kind: "condition", dependsOn: ["start"], config: { expressionRef: "approved" } },
  { id: "finish", kind: "tool", dependsOn: ["review"], config: { toolId: "notes.save" } },
] };

test("accepts and freezes a valid acyclic workflow", () => {
  const result = validateWorkflowDefinition(valid);
  assert.equal(result.steps.length, 3);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.steps[0]), true);
});

test("rejects invalid schema version, duplicate IDs, and unknown dependencies", () => {
  assert.throws(() => validateWorkflowDefinition({ ...valid, schemaVersion: 2 }), WorkflowValidationError);
  assert.throws(() => validateWorkflowDefinition({ ...valid, steps: [valid.steps[0], valid.steps[0]] }), /invalid/);
  assert.throws(() => validateWorkflowDefinition({ ...valid, steps: [{ id: "x", kind: "tool", dependsOn: ["missing"] }] }), /invalid/);
});

test("rejects cycles and self-dependencies", () => {
  assert.throws(() => validateWorkflowDefinition({ ...valid, steps: [
    { id: "a", kind: "agent", dependsOn: ["b"] },
    { id: "b", kind: "tool", dependsOn: ["a"] },
  ] }), (error) => error instanceof WorkflowValidationError && error.issues.some((x) => x.includes("cycle")));
  assert.throws(() => validateWorkflowDefinition({ ...valid, steps: [{ id: "a", kind: "agent", dependsOn: ["a"] }] }), WorkflowValidationError);
});

test("rejects unsupported step kinds, malformed config, and repeated edges", () => {
  assert.throws(() => validateWorkflowDefinition({ ...valid, steps: [{ id: "a", kind: "shell", config: {} }] }), WorkflowValidationError);
  assert.throws(() => validateWorkflowDefinition({ ...valid, steps: [{ id: "a", kind: "tool", config: [] }] }), WorkflowValidationError);
  assert.throws(() => validateWorkflowDefinition({ ...valid, steps: [{ id: "a", kind: "tool" }, { id: "b", kind: "tool", dependsOn: ["a", "a"] }] }), WorkflowValidationError);
});

test("enforces graph and payload limits", () => {
  assert.throws(() => validateWorkflowDefinition(valid, { maxSteps: 2 }), WorkflowValidationError);
  assert.throws(() => validateWorkflowDefinition(valid, { maxBytes: 10 }), WorkflowValidationError);
});


test("rejects unsafe validator limit configuration", () => {
  assert.throws(() => validateWorkflowDefinition(valid, { maxSteps: 0 }), /maxSteps/);
  assert.throws(() => validateWorkflowDefinition(valid, { maxEdges: 10001 }), /maxEdges/);
  assert.throws(() => validateWorkflowDefinition(valid, { maxBytes: 20_000_000 }), /maxBytes/);
});
