export type WorkflowJsonPrimitive = string | number | boolean | null;
export type WorkflowJsonValue = WorkflowJsonPrimitive | WorkflowJsonValue[] | { [key: string]: WorkflowJsonValue };

export type WorkflowNodeKind = "agent" | "tool" | "condition" | "approval" | "transform";

export interface WorkflowNodeV1 {
  readonly id: string;
  readonly kind: WorkflowNodeKind;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  /** References to named secrets; literal credentials must never be embedded in workflow definitions. */
  readonly secretRefs?: readonly string[];
  readonly config?: { readonly [key: string]: WorkflowJsonValue };
}

export interface WorkflowEdgeV1 {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
}

export interface WorkflowDefinitionV1 {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly version: string;
  readonly entryNodeId: string;
  readonly nodes: readonly WorkflowNodeV1[];
  readonly edges: readonly WorkflowEdgeV1[];
  readonly inputSchema: WorkflowJsonValue;
}
