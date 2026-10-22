# Dependencies and contracts — aether-ai-workflows

**Status:** proposed contract; no API implementation exists yet.

## Contract area

Versioned workflow definition schema and validation errors

## Direct dependencies

No runtime dependency on orchestration, agents, or database. Expose a versioned workflow schema and validation contract that orchestration consumes.

## Required rules

Schema includes version, nodes/steps, input/output types, dependency edges, timeout/retry policy, approval gates, secret references, and cycle detection. Workflow definitions describe execution but do not schedule steps, execute agents, or access persistence.

## Contract governance

- The [master catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md) is the canonical dependency map.
- Public REST endpoints require OpenAPI definitions, versioning, stable error codes, and compatibility tests.
- Events require a schema version, event/run ID, timestamp, correlation ID, tenant/principal scope where appropriate, and explicit retry/idempotency semantics.
- Package interfaces must distinguish public stable exports from internal implementation details.
- No service may read another service's private tables or import downstream application internals.
- Any breaking change must include consumer inventory, migration notes, staged rollout/rollback plan, and an update to affected repository specs.
- Provider/model differences must be surfaced as capabilities; do not claim all models support the same features.
- Never expose provider credentials or raw sensitive upstream errors to browsers or ordinary logs.

## Review checklist

- [ ] Inputs, outputs, errors, payload limits, timeout and rate-limit behavior defined.
- [ ] Authentication, authorization, and tenant boundary defined.
- [ ] Retries, cancellation, duplicate requests, and side effects defined.
- [ ] Correlation IDs and redaction rules defined.
- [ ] Unit and contract tests planned.
- [ ] Direct and transitive dependency licenses checked before reuse.
