import { describe, expect, it } from "vitest";
import { validateWorkflow } from "../src/index.js";
import type { WorkflowDefinitionV1 } from "../src/index.js";

const validWorkflow: WorkflowDefinitionV1 = {
  schemaVersion: "1",
  id: "synthetic-flow",
  version: "1.0.0",
  entryNodeId: "start",
  inputSchema: { type: "object" },
  nodes: [
    { id: "start", kind: "transform", timeoutMs: 1000, maxAttempts: 1 },
    { id: "finish", kind: "agent", timeoutMs: 5000, maxAttempts: 2, secretRefs: ["provider/mock"] }
  ],
  edges: [{ from: "start", to: "finish" }]
};

describe("workflow definition validation", () => {
  it("accepts a valid acyclic definition", () => {
    expect(validateWorkflow(validWorkflow)).toEqual([]);
  });

  it("rejects duplicate nodes, missing entry points, and unknown edge endpoints", () => {
    const invalid = {
      ...validWorkflow,
      entryNodeId: "missing",
      nodes: [validWorkflow.nodes[0]!, validWorkflow.nodes[0]!],
      edges: [{ from: "start", to: "absent" }]
    } satisfies WorkflowDefinitionV1;
    const codes = validateWorkflow(invalid).map(issue => issue.code);
    expect(codes).toContain("duplicate_node");
    expect(codes).toContain("missing_entry");
    expect(codes).toContain("missing_edge_node");
  });

  it("rejects graph cycles in schema version 1", () => {
    const cyclic = { ...validWorkflow, edges: [{ from: "start", to: "finish" }, { from: "finish", to: "start" }] };
    expect(validateWorkflow(cyclic).map(issue => issue.code)).toContain("cycle_detected");
  });

  it("bounds timeout, retry attempts, secret references, and definition size", () => {
    const invalid: WorkflowDefinitionV1 = {
      ...validWorkflow,
      nodes: [{ id: "start", kind: "tool", timeoutMs: 99_999_999, maxAttempts: 99, secretRefs: ["bad ref"] }]
    };
    const codes = validateWorkflow(invalid, { maxDefinitionBytes: 100 }).map(issue => issue.code);
    expect(codes).toContain("invalid_timeout");
    expect(codes).toContain("invalid_attempts");
    expect(codes).toContain("invalid_secret_ref");
    expect(codes).toContain("oversized_definition");
  });
});
