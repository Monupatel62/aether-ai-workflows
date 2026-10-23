# Workflow Definition Validation and Execution Safety Contract

**Status:** proposed contract and acceptance criteria only. This repository describes and validates workflow definitions; it does not execute durable jobs. No validator or runtime controls are claimed implemented.

## Ownership and boundary

A workflow definition is an untrusted, versioned graph. This repository owns the definition schema and static validation contract. Orchestration owns run state, scheduling, durable execution, and transition enforcement. Agents/tools/gateway perform work only through their approved contracts. Workflows must not import orchestration internals, access persistence directly, or treat definition-time validation as execution-time authorization.

A valid definition does not grant permission to execute it. ADR-0021 remains unresolved; tenant/workspace ownership and role-grant authority must come from the approved platform authority, not a new workflow-local membership store.

## Versioned definition contract

A definition should identify:
- schema version and stable workflow ID/version;
- owner reference and tenant/workspace scope from trusted server-side context;
- typed nodes/steps and typed dependency edges;
- input/output schemas and bounded mappings;
- allowed step kind and declared capability requirements;
- timeout, retry, cancellation, and idempotency policies;
- approval gates and required policy references;
- opaque secret-reference IDs (never literal secret values);
- resource bounds and a deterministic validation result.

Unknown schema versions, step kinds, fields with security significance, or unsupported capabilities must be rejected or explicitly quarantined for migration; they must not be silently interpreted as a permissive default. Version migrations must preserve or strengthen security constraints and require revalidation.

## Static validation

Validate the complete graph before it can be published:
- schema and field types, payload size, string lengths, and node/edge count;
- unique node IDs and references to existing nodes;
- no duplicate/conflicting edge definitions;
- cycle detection, with cycles rejected unless a future version explicitly defines bounded loop semantics;
- maximum fan-out, graph depth, total steps, and estimated resource budget;
- allowed step kinds and compatibility between input/output types;
- required input fields and output mappings;
- timeout/retry bounds and valid combinations of retry/idempotency policy;
- approval gates for policy-designated high-impact steps;
- secret references by opaque ID only, with no inline credentials or secret material in expressions;
- tenant/workspace scope consistency across referenced resources;
- rejection of unrecognized executable expressions, arbitrary code, and arbitrary URL/network destinations.

Static validation is not a substitute for live authorization, secret access checks, or target-resource validation immediately before each step executes.

## Publish, approve, and execute lifecycle

1. **Draft:** caller may edit only definitions within the scope authorized by the owning API.
2. **Validate:** run schema and graph validation and return stable, field-specific error categories without echoing secrets.
3. **Publish:** bind approval to the immutable definition version or content digest, validator/schema version, and required policy version.
4. **Start run:** orchestration rechecks current caller permission, workflow ownership/scope, current policy, and referenced-resource access. A previously published definition may be stale or have lost permission.
5. **Before each step:** reauthorize the current principal/run identity and target resource according to the owning security/domain contract; resolve secret references just-in-time and verify their scope.
6. **Transition:** orchestration validates allowed state transitions server-side; client-supplied status/step fields are not authoritative.
7. **Retry/replay:** apply bounded attempt/deadline policies and step-level idempotency; do not repeat a non-idempotent side effect without an approved deduplication strategy.
8. **Cancel:** prevent new steps after cancellation is accepted and propagate cancellation to in-flight work where supported. Record unresolved in-flight side effects as outcome unknown until reconciled.
9. **Audit:** record definition version/digest, run ID, step ID, policy/validator versions, correlation ID, outcome category, and redacted references needed for investigation.

The workflow definition service does not decide canonical membership or implement a second policy engine. It exposes versioned requirements for the execution owner to enforce.

## Secret and expression handling

Definitions contain opaque secret references, not secret values. At execution, the approved secret service resolves a reference only after authorization for the current tenant/workflow/step and only for the intended provider or tool. Never interpolate secrets into workflow names, logs, error messages, telemetry labels, or user-visible output by default.

Expressions must use a documented, bounded expression language. Do not evaluate arbitrary code, dynamically import packages, or allow model output to rewrite executable definitions without validation and explicit approval. Tool output and model-generated step arguments remain untrusted data and require schema validation plus normal authorization.

## Proposed acceptance matrix

These are proposed future tests, not tests already run.

| Scenario | Required result |
|---|---|
| Unknown schema version | Reject or quarantine; never permissively reinterpret |
| Duplicate node ID or dangling edge | Reject definition with stable validation error |
| Cycle where loops are unsupported | Reject definition |
| Fan-out/depth/node count exceeds bound | Reject before publication |
| Unknown step type or capability | Reject; do not execute as a generic step |
| Input/output types are incompatible | Reject or require an explicit reviewed mapping |
| Literal secret appears in definition | Reject and avoid echoing the value |
| Secret reference belongs to another scope | Deny resolution at execution time |
| Tenant/workspace scope is client-tampered | Resolve from trusted context; deny mismatch |
| Permission revoked after publication | Start/step denied by current authorization |
| Approval refers to different definition digest | Require new approval |
| Client submits a later run state directly | Reject invalid transition; server state remains authoritative |
| Duplicate step delivery | Idempotency prevents repeated side effect where supported |
| Timeout after possible side effect | Mark outcome unknown and reconcile safely |
| Cancellation accepted | No subsequent steps start; in-flight state is tracked |
| Model output contains executable expression | Treat as untrusted data; reject unless schema and policy permit |
| Referenced URL targets internal/private address | Block under approved egress/SSRF policy |
| Migration drops an approval or resource limit | Fail migration review/revalidation |
| Validation error contains a secret | Secret absent from error response and ordinary logs |

## Release gate

Before implementation, approve the definition schema/versioning strategy, maximum graph/resource bounds, expression language, publication/approval model, execution-time authorization owner, step idempotency semantics, secret resolver contract, and audit policy. Add executable fixtures for valid/invalid definitions and orchestration contract tests before production use.

## Related references

- [Workflow security review](SECURITY_REVIEW.md)
- [Workflow technical design](TECHNICAL_DESIGN.md)
- [Workflow dependency contracts](DEPENDENCIES_AND_CONTRACTS.md)
- [Gateway routing/fallback safety](https://github.com/Monupatel62/aether-ai-gateway/blob/main/docs/MODEL_ROUTING_AND_FALLBACK_SAFETY.md)
- [Security policy decision contract](https://github.com/Monupatel62/aether-ai-security/blob/main/docs/POLICY_DECISION_CONTRACT_AND_ACCEPTANCE.md)
- [OWASP workflow circumvention testing](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/10-Business_Logic/06-Circumvention_of_Work_Flows)
- [OWASP Business Logic Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Business_Logic_Security_Cheat_Sheet.html)

## Open decisions

Schema version, maximum graph limits, expression language, approval policy vocabulary, execution authorization timing, secret scope format, run-state durability, and audit retention remain open. ADR-0021 remains unresolved.
