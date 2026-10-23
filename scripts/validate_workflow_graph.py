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
import heapq
import json
import sys
from pathlib import Path
from typing import Any

MAX_DEFINITION_BYTES = 2_000_000
MAX_NODES = 10_000
MAX_EDGES = 20_000
MAX_ID_CHARS = 200


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

    # Bound graph sizes before allocating adjacency structures. These are
    # provisional validator-safety limits, not the final public contract.
    if len(nodes) > MAX_NODES:
        errors.append(f"nodes exceeds the draft limit of {MAX_NODES}")
        nodes = nodes[:MAX_NODES]
    if len(edges) > MAX_EDGES:
        errors.append(f"edges exceeds the draft limit of {MAX_EDGES}")
        edges = edges[:MAX_EDGES]

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
        if len(node_id) > MAX_ID_CHARS:
            errors.append(f"nodes[{index}].id exceeds {MAX_ID_CHARS} characters")
            continue
        if node_id in seen:
            errors.append(f"duplicate node id: {node_id}")
            continue
        seen.add(node_id)
        node_ids.append(node_id)
        if not isinstance(node.get("kind"), str) or not node["kind"].strip():
            errors.append(f"nodes[{index}].kind must be a non-empty string")

    adjacency = {node_id: [] for node_id in node_ids}
    edge_pairs: set[tuple[str, str]] = set()
    for index, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append(f"edges[{index}] must be an object")
            continue
        source, target = edge.get("from"), edge.get("to")
        if not isinstance(source, str) or not isinstance(target, str):
            errors.append(f"edges[{index}] must contain string 'from' and 'to' values")
            continue
        if len(source) > MAX_ID_CHARS or len(target) > MAX_ID_CHARS:
            errors.append(f"edges[{index}] endpoint exceeds {MAX_ID_CHARS} characters")
            continue
        if source not in seen:
            errors.append(f"edges[{index}].from references unknown node: {source}")
        if target not in seen:
            errors.append(f"edges[{index}].to references unknown node: {target}")
        if source == target:
            errors.append(f"edges[{index}] must not be a self-edge: {source}")
        pair = (source, target)
        if source in seen and target in seen and source != target:
            if pair in edge_pairs:
                errors.append(f"edges[{index}] duplicates edge: {source} -> {target}")
            else:
                edge_pairs.add(pair)
                adjacency[source].append(target)

    # Kahn's algorithm detects cycles in O(V + E); sorting makes results stable.
    indegree = {node_id: 0 for node_id in node_ids}
    for targets in adjacency.values():
        for target in targets:
            indegree[target] += 1
    ready = [node_id for node_id, degree in indegree.items() if degree == 0]
    heapq.heapify(ready)
    visited = 0
    while ready:
        current = heapq.heappop(ready)
        visited += 1
        for target in sorted(adjacency[current]):
            indegree[target] -= 1
            if indegree[target] == 0:
                heapq.heappush(ready, target)
    if visited != len(node_ids):
        errors.append("workflow graph contains a cycle")

    # Structural entry/terminal checks make disconnected fragments explicit.
    # This is not a final workflow-schema decision and remains open for review.
    incoming = {node_id: 0 for node_id in node_ids}
    for targets in adjacency.values():
        for target in targets:
            incoming[target] += 1
    if node_ids and sum(degree == 0 for degree in incoming.values()) != 1:
        errors.append("workflow graph must have exactly one entry node")
    if node_ids and not any(not targets for targets in adjacency.values()):
        errors.append("workflow graph must have at least one terminal node")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workflow", type=Path, help="Path to a workflow definition JSON file")
    args = parser.parse_args()
    try:
        raw = args.workflow.read_bytes()
        if len(raw) > MAX_DEFINITION_BYTES:
            print(
                f"FAIL: workflow JSON exceeds the {MAX_DEFINITION_BYTES}-byte draft limit",
                file=sys.stderr,
            )
            return 2
        workflow = json.loads(raw.decode("utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
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
