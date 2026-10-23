import type { WorkflowDefinitionV1 } from "./types.js";

export type WorkflowIssueCode =
  | "invalid_schema_version"
  | "invalid_id"
  | "invalid_node_kind"
  | "empty_nodes"
  | "too_many_nodes"
  | "duplicate_node"
  | "invalid_timeout"
  | "invalid_attempts"
  | "invalid_secret_ref"
  | "missing_entry"
  | "missing_edge_node"
  | "self_edge"
  | "duplicate_edge"
  | "cycle_detected"
  | "oversized_definition";

export interface WorkflowValidationIssue {
  readonly code: WorkflowIssueCode;
  readonly path: string;
}

export interface WorkflowValidationOptions {
  readonly maxNodes?: number;
  readonly maxDefinitionBytes?: number;
  readonly maxTimeoutMs?: number;
  readonly maxAttempts?: number;
}

export function validateWorkflow(
  workflow: WorkflowDefinitionV1,
  options: WorkflowValidationOptions = {}
): readonly WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];
  const maxNodes = options.maxNodes ?? 500;
  const maxBytes = options.maxDefinitionBytes ?? 1024 * 1024;
  const maxTimeoutMs = options.maxTimeoutMs ?? 10 * 60 * 1000;
  const maxAttempts = options.maxAttempts ?? 5;

  if (workflow.schemaVersion !== "1") issues.push({ code: "invalid_schema_version", path: "/schemaVersion" });
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(workflow.id) ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,63}$/.test(workflow.version)) {
    issues.push({ code: "invalid_id", path: "/" });
  }
  if (workflow.nodes.length === 0) issues.push({ code: "empty_nodes", path: "/nodes" });
  if (workflow.nodes.length > maxNodes) issues.push({ code: "too_many_nodes", path: "/nodes" });
  if (new TextEncoder().encode(JSON.stringify(workflow)).byteLength > maxBytes) {
    issues.push({ code: "oversized_definition", path: "/" });
  }

  const nodeIds = new Set<string>();
  const adjacency = new Map<string, string[]>();
  workflow.nodes.forEach((node, index) => {
    const path = `/nodes/${index}`;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(node.id)) {
      issues.push({ code: "invalid_id", path: `${path}/id` });
    }
    if (nodeIds.has(node.id)) issues.push({ code: "duplicate_node", path: `${path}/id` });
    nodeIds.add(node.id);
    adjacency.set(node.id, []);
    if (!(["agent", "tool", "condition", "approval", "transform"] as readonly string[]).includes(node.kind)) {
      issues.push({ code: "invalid_node_kind", path: `${path}/kind` });
    }
    if (!Number.isInteger(node.timeoutMs) || node.timeoutMs < 1 || node.timeoutMs > maxTimeoutMs) {
      issues.push({ code: "invalid_timeout", path: `${path}/timeoutMs` });
    }
    if (!Number.isInteger(node.maxAttempts) || node.maxAttempts < 1 || node.maxAttempts > maxAttempts) {
      issues.push({ code: "invalid_attempts", path: `${path}/maxAttempts` });
    }
    for (const [refIndex, ref] of (node.secretRefs ?? []).entries()) {
      if (!/^secret:\/\/[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,247}$/.test(ref)) {
        issues.push({ code: "invalid_secret_ref", path: `${path}/secretRefs/${refIndex}` });
      }
    }
  });

  if (!nodeIds.has(workflow.entryNodeId)) issues.push({ code: "missing_entry", path: "/entryNodeId" });

  const edges = new Set<string>();
  workflow.edges.forEach((edge, index) => {
    const path = `/edges/${index}`;
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      issues.push({ code: "missing_edge_node", path });
      return;
    }
    if (edge.from === edge.to) issues.push({ code: "self_edge", path });
    const key = `${edge.from}\u0000${edge.to}\u0000${edge.label ?? ""}`;
    if (edges.has(key)) issues.push({ code: "duplicate_edge", path });
    edges.add(key);
    adjacency.get(edge.from)?.push(edge.to);
  });

  // Version 1 is a DAG-only contract. Durable loops/retries belong to orchestration policy, not graph cycles.
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycleNodes = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      cycleNodes.add(id);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (visiting.has(next)) cycleNodes.add(next);
      else visit(next);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of nodeIds) visit(id);
  if (cycleNodes.size > 0) issues.push({ code: "cycle_detected", path: "/edges" });

  return issues;
}
