const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const STEP_KINDS = new Set(["agent", "tool", "condition"]);
export class WorkflowValidationError extends Error {
  constructor(issues) { super("Workflow definition is invalid"); this.name = "WorkflowValidationError"; this.issues = Object.freeze(issues); }
}
function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function validId(value) { return typeof value === "string" && ID.test(value) && value.trim() === value; }
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Validate a data-only workflow definition. This does not execute any step. */
export function validateWorkflowDefinition(input, { maxSteps = 100, maxEdges = 500, maxBytes = 1_048_576 } = {}) {
  if (!Number.isSafeInteger(maxSteps) || maxSteps < 1 || maxSteps > 1000) throw new TypeError("maxSteps must be between 1 and 1000");
  if (!Number.isSafeInteger(maxEdges) || maxEdges < 1 || maxEdges > 10_000) throw new TypeError("maxEdges must be between 1 and 10000");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 10_485_760) throw new TypeError("maxBytes must be between 1 and 10485760");
  const issues = [];
  let encoded;
  try { encoded = JSON.stringify(input); } catch { throw new WorkflowValidationError(["definition must be JSON-serializable"]); }
  if (typeof encoded !== "string" || Buffer.byteLength(encoded) > maxBytes) throw new WorkflowValidationError(["definition exceeds the configured size limit"]);
  if (!isRecord(input)) throw new WorkflowValidationError(["definition must be an object"]);
  if (input.schemaVersion !== 1) issues.push("schemaVersion must equal 1");
  if (!validId(input.id)) issues.push("id must be a valid identifier");
  if (!Array.isArray(input.steps) || input.steps.length === 0) issues.push("steps must be a non-empty array");
  if (Array.isArray(input.steps) && input.steps.length > maxSteps) issues.push("step count exceeds the configured limit");
  if (issues.length) throw new WorkflowValidationError(issues);

  const byId = new Map();
  let edgeCount = 0;
  input.steps.forEach((step, index) => {
    if (!isRecord(step)) { issues.push(`steps[${index}] must be an object`); return; }
    if (!validId(step.id)) issues.push(`steps[${index}].id is invalid`);
    else if (byId.has(step.id)) issues.push(`duplicate step id: ${step.id}`);
    else byId.set(step.id, step);
    if (!STEP_KINDS.has(step.kind)) issues.push(`steps[${index}].kind is unsupported`);
    if (step.config !== undefined && !isRecord(step.config)) issues.push(`steps[${index}].config must be an object`);
    if (step.dependsOn !== undefined && (!Array.isArray(step.dependsOn) || step.dependsOn.some((id) => !validId(id)))) {
      issues.push(`steps[${index}].dependsOn must be an array of valid identifiers`);
    }
    if (Array.isArray(step.dependsOn)) edgeCount += step.dependsOn.length;
  });
  if (edgeCount > maxEdges) issues.push("edge count exceeds the configured limit");

  for (const step of input.steps) {
    if (!isRecord(step) || !Array.isArray(step.dependsOn)) continue;
    const seen = new Set();
    for (const dependency of step.dependsOn) {
      if (seen.has(dependency)) issues.push(`step ${step.id} has duplicate dependency ${dependency}`);
      seen.add(dependency);
      if (!byId.has(dependency)) issues.push(`step ${step.id} references unknown dependency ${dependency}`);
      if (dependency === step.id) issues.push(`step ${step.id} cannot depend on itself`);
    }
  }

  if (issues.length === 0) {
    const indegree = new Map([...byId.keys()].map((id) => [id, 0]));
    const outgoing = new Map([...byId.keys()].map((id) => [id, []]));
    for (const step of input.steps) {
      for (const dependency of step.dependsOn ?? []) {
        indegree.set(step.id, indegree.get(step.id) + 1);
        outgoing.get(dependency).push(step.id);
      }
    }
    const ready = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id);
    let visited = 0;
    while (ready.length) {
      const id = ready.pop();
      visited += 1;
      for (const next of outgoing.get(id)) {
        indegree.set(next, indegree.get(next) - 1);
        if (indegree.get(next) === 0) ready.push(next);
      }
    }
    if (visited !== byId.size) issues.push("workflow dependency graph contains a cycle");
  }

  if (issues.length) throw new WorkflowValidationError(issues);
  const normalized = JSON.parse(encoded);
  return deepFreeze(normalized);
}
