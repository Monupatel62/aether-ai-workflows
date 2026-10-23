import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from validate_workflow_graph import validate_workflow


def workflow(nodes, edges):
    return {"version": 1, "nodes": nodes, "edges": edges}


class WorkflowGraphValidatorTests(unittest.TestCase):
    def test_accepts_valid_linear_graph(self):
        result = validate_workflow(workflow(
            [{"id": "a", "kind": "task"}, {"id": "b", "kind": "task"}],
            [{"from": "a", "to": "b"}],
        ))
        self.assertEqual([], result)

    def test_rejects_duplicate_node_ids(self):
        errors = validate_workflow(workflow(
            [{"id": "a", "kind": "task"}, {"id": "a", "kind": "task"}], []
        ))
        self.assertTrue(any("duplicate node id" in error for error in errors))

    def test_rejects_unknown_edge_endpoints(self):
        errors = validate_workflow(workflow(
            [{"id": "a", "kind": "task"}], [{"from": "a", "to": "missing"}]
        ))
        self.assertTrue(any("unknown node: missing" in error for error in errors))

    def test_rejects_self_edge(self):
        errors = validate_workflow(workflow(
            [{"id": "a", "kind": "task"}], [{"from": "a", "to": "a"}]
        ))
        self.assertTrue(any("self-edge" in error for error in errors))

    def test_rejects_multi_node_cycle(self):
        errors = validate_workflow(workflow(
            [{"id": "a", "kind": "task"}, {"id": "b", "kind": "task"}],
            [{"from": "a", "to": "b"}, {"from": "b", "to": "a"}],
        ))
        self.assertIn("workflow graph contains a cycle", errors)

    def test_rejects_empty_nodes_and_wrong_version(self):
        errors = validate_workflow({"version": 2, "nodes": [], "edges": []})
        self.assertIn("version must be integer 1", errors)
        self.assertIn("nodes must be a non-empty array", errors)

    def test_rejects_boolean_version(self):
        errors = validate_workflow({"version": True, "nodes": [{"id": "a", "kind": "task"}], "edges": []})
        self.assertIn("version must be integer 1", errors)

    def test_accepts_large_linear_graph(self):
        nodes = [{"id": f"n{i:04d}", "kind": "task"} for i in range(1500)]
        edges = [{"from": f"n{i:04d}", "to": f"n{i + 1:04d}"} for i in range(1499)]
        self.assertEqual([], validate_workflow(workflow(nodes, edges)))

    def test_rejects_non_object_input(self):
        self.assertEqual(["workflow must be a JSON object"], validate_workflow([]))


if __name__ == "__main__":
    unittest.main()
