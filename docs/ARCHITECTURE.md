# Architecture: aether-ai-workflows

**Status:** proposed design, not implemented.

## Role in the system

Defines workflow structure and static validation contracts. Durable scheduling, execution, persistence, cancellation and run-state transition enforcement belong to orchestration.

## Dependencies

The workflow-definition contract is consumed by orchestration. This repository has no runtime dependency on orchestration, agents, or database. Any optional shared schema utility must remain low-level and must not introduce a reverse dependency.

## Data and control flow

1. A user or upstream service initiates an operation through an authenticated, documented boundary owned by the appropriate API.
2. Workflow validation checks the definition's schema, graph structure, provisional resource bounds, and recognized contract version.
3. Validation produces a deterministic result with field-specific errors. Errors must not include secret values or untrusted payload dumps.
4. The owning API/orchestration boundary checks current authorization and referenced-resource access. A valid definition itself grants no execution permission.
5. Orchestration owns scheduling and runtime decisions, including timeout, cancellation, retry, idempotency, durability, and transitions.
6. Correlation identifiers and structured, redacted events flow through approved contracts.

## Boundary rules

- No circular imports or runtime dependency on downstream consumers.
- Cross-repository communication uses versioned HTTP/OpenAPI, typed package contracts, or documented event envelopes; no direct reads of another service's private tables.
- Secrets remain opaque references in definitions and are resolved just-in-time by an approved secret owner after current authorization.
- Treat model output, uploaded files, external connector output, MCP metadata, and workflow definitions as untrusted data.
- Definition-time validation is not execution-time authorization. Reauthorize the caller, tenant scope, and target resource at run start and before sensitive steps.
- The graph validator is a structural pilot, not the final public schema. Its provisional limits must be reviewed before being adopted as API contract limits.

## Proposed deployment shape

The first milestone should be a small, testable service/library with one responsibility. Do not split into a separate network service just because a repository exists. Package boundaries and deployment boundaries are different decisions. Prefer a modular runtime first; extract a service only when scaling, isolation, ownership, or operational needs justify it.

## Failure behavior

Document and test timeout, cancellation, retry, duplicate request, dependency outage, malformed upstream response, permission denial, invalid graph, oversized input, and partial-result cases before production use.

## Diagrams

The master end-to-end component graph lives in [the repository catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md). Keep that graph and this document synchronized whenever a dependency changes.
