#!/usr/bin/env python3
"""Validate the structural graph of a draft Aether workflow definition.

This is a contract-validation utility, not a workflow runtime. The accepted
minimal JSON shape is intentionally narrow while the full versioned schema is
under review:
{
  "version": 1,
  "nodes": [{"id": "step-a", "kind": "task"}],
  "edges": [{"from": "step-a", "to": "step-b"}]
}
No step kinds, persistence model, tenant owner, or execution policy are chosen here.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def validate_workflow(workflow: Any) -> list[str]:
    """Return deterministic structural errors; an empty list means valid graph shape."""
    errors: list[str] = []
    if not isinstance(workflow, dict):
        return ["workflow must be a JSON object"]
    if type(workflow.get("version")) is not int or workflow.get("version") != 1:
        errors.append("version must be integer 1")

    nodes = workflow.get("nodes")
    edges = workflow.get("edges")
    if not isinstance(nodes, list) or not nodes:
        errors.append("nodes must be a non-empty array")
        nodes = []
    if not isinstance(edges, list):
        errors.append("edges must be an array")
        edges = []

    node_ids: list[str] = []
    seen: set[str] = set()
    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append(f"nodes[{index}] must be an object")
            continue
        node_id = node.get("id")
        if not isinstance(node_id, str) or not node_id.strip():
            errors.append(f"nodes[{index}].id must be a non-empty string")
            continue
        if node_id in seen:
            errors.append(f"duplicate node id: {node_id}")
            continue
        seen.add(node_id)
        node_ids.append(node_id)
        if not isinstance(node.get("kind"), str) or not node["kind"].strip():
            errors.append(f"nodes[{index}].kind must be a non-empty string")

    adjacency = {node_id: [] for node_id in node_ids}
    for index, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append(f"edges[{index}] must be an object")
            continue
        source, target = edge.get("from"), edge.get("to")
        if not isinstance(source, str) or not isinstance(target, str):
            errors.append(f"edges[{index}] must contain string 'from' and 'to' values")
            continue
        if source not in seen:
            errors.append(f"edges[{index}].from references unknown node: {source}")
        if target not in seen:
            errors.append(f"edges[{index}].to references unknown node: {target}")
        if source == target:
            errors.append(f"edges[{index}] must not be a self-edge: {source}")
        if source in adjacency and target in seen and source != target:
            adjacency[source].append(target)

    # Kahn's algorithm detects cycles in O(V + E); sorting makes results stable.
    indegree = {node_id: 0 for node_id in node_ids}
    for source in adjacency:
        for target in adjacency[source]:
            indegree[target] += 1
    ready = sorted(node_id for node_id, degree in indegree.items() if degree == 0)
    visited = 0
    while ready:
        current = ready.pop(0)
        visited += 1
        for target in sorted(adjacency[current]):
            indegree[target] -= 1
            if indegree[target] == 0:
                ready.append(target)
                ready.sort()
    if visited != len(node_ids):
        errors.append("workflow graph contains a cycle")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workflow", type=Path, help="Path to a workflow definition JSON file")
    args = parser.parse_args()
    try:
        workflow = json.loads(args.workflow.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: cannot load workflow JSON: {exc}", file=sys.stderr)
        return 2

    errors = validate_workflow(workflow)
    if errors:
        print(f"FAIL: {len(errors)} workflow validation issue(s)")
        for error in errors:
            print(f"- {error}")
        return 1
    print("PASS: workflow graph is structurally valid.")
    print("NOTE: this does not validate authorization, step semantics, or runtime execution.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
