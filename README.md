# @aether-ai/workflows

Versioned declarative workflow types and static graph validation for Aether AI. This package validates definitions; it does not schedule jobs, execute agents/tools, or persist durable run state.

## Status

Initial schema/graph validator in review. The workflow contract is a proposal and must be reviewed with orchestration before it is treated as stable. Schema version 1 supports acyclic graphs; loops and retries at runtime belong to orchestration policy, not graph cycles.

## Current validation

- Definition ID/version and schema version.
- Unique node IDs, valid entry node, and valid edge endpoints.
- Duplicate/self edges and graph-cycle rejection.
- Bounded node count, definition size, per-node timeout, and attempt count.
- Secret references use an explicit `secret://` identifier form; literal credentials must never be embedded.

## Example

```ts
import { validateWorkflow } from "@aether-ai/workflows";

const issues = validateWorkflow(workflowDefinition);
if (issues.length) throw new Error(`Invalid workflow: ${issues.map(x => x.code).join(", ")}`);
```

Validation is not authorization. Callers must authorize workflow creation and execution separately, and the orchestration layer must enforce runtime limits and approval gates.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

CI is configured for Node.js 20 and 22. Input/output schema compatibility, workflow migration, orchestration plan compatibility, and dependency/security audits remain future work.
