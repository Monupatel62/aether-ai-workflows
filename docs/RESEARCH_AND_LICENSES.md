# Research and license record — aether-ai-workflows

**Research date:** 2026-10-22. Initial design research only; not legal advice or a complete SBOM.

## Primary sources

- Research sources: https://github.com/epam/ai-dial 
- https://github.com/EliteaAI/elitea-sdk

## Findings

DIAL documents applications and orchestration-related concepts; ELITEA SDK uses project prompts/data sources. Aether's workflow schema and license must be original unless a specific reusable component is cleared.

## Reuse and license policy

- No third-party source code has been copied into this repository as part of this documentation work.
- The inspected WoHo AI DevKit package metadata reports version 0.8.37, Apache-2.0, and Node.js >=20. Verify exact package versions, package-level licenses, exports, and compatibility at implementation time.
- AI DIAL Core's repository includes an Apache-2.0 license. AI DIAL Chat's README notes Apache-2.0 for rewritten code and MIT for portions retained from its original upstream. Check exact files and notices before reuse.
- An open-source license for one repository does not grant rights to another repository, trademark, model, hosted API, dataset, or dependency.
- Do not vendor or fork a component until its LICENSE, NOTICE, copyright headers, transitive dependencies, security posture, and redistribution conditions have been recorded.

## Required release checks

- [ ] Pin exact versions/tags/commits for every reused component.
- [ ] Generate an SBOM and review direct/transitive licenses.
- [ ] Run vulnerability and secret scanning.
- [ ] Preserve required copyright/license notices and document modifications.
- [ ] Confirm model-provider terms, API costs, data processing, and retention requirements separately.

## Open questions

Hosting topology, model provider selection, database, queue, cache, vector store, identity provider, and deployment target remain undecided. They must be resolved in an ADR, not silently assumed.
