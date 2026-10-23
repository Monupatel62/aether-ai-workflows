# aether-ai-workflows

**Status:** Initial versioned workflow-definition validator implemented on a feature branch. Workflow execution is not implemented.

## Implemented

- [Workflow validator](src/index.js): schema version check, bounded step/edge/payload counts, unique identifiers, known step kinds, dependency-reference checks, self-edge/duplicate-edge checks, cycle detection, and immutable normalized output.
- [Unit tests](test/workflows.test.js): valid DAG, bad versions, duplicate IDs, unknown dependencies, cycles, invalid kinds/config, and size limits.
- Dependency-free Node.js package with Node 20/22 CI.

## Boundaries

This package validates data-only workflow definitions. It does not schedule steps, run agents/tools, persist workflow state, resolve secrets, or define durable retries/cancellation. Those responsibilities belong to orchestration and policy-enforced tool execution.

## Documentation

- [Repository specification](docs/REPOSITORY_SPECIFICATION.md)
- [Project specification](docs/PROJECT_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Dependencies and contracts](docs/DEPENDENCIES_AND_CONTRACTS.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Security review](docs/SECURITY_REVIEW.md)
- [Master catalog](https://github.com/Monupatel62/aether-ai-platform/blob/main/docs/REPOSITORY_CATALOG.md)
