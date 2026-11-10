import json
import pathlib
import unittest
from figment_site_check import audit_files


class AuditTests(unittest.TestCase):
    def test_shared_cases(self):
        cases = json.loads(pathlib.Path(__file__).with_name("cases.json").read_text())
        for case in cases:
            with self.subTest(name=case["name"]):
                result = audit_files(case["files"], case.get("options"))
                self.assertEqual([i["code"] for i in result["issues"]], case["codes"])
                self.assertEqual(result["ok"], case["ok"])

    def test_invalid(self):
        for value in [None, {}, [None], [{"path":"a","size":-1}], [{"path":"a","size":True}], [{"path":"a","size":0,"kind":"directory"}]]:
            with self.subTest(value=value), self.assertRaises(TypeError):
                audit_files(value)
        for value in [0, -1, 1.5, "10", True]:
            with self.subTest(limit=value), self.assertRaises(TypeError):
                audit_files([], {"maxFileBytes":value})

    def test_limit(self):
        with self.assertRaises(TypeError):
            audit_files([{"path":"x","size":0}] * 10001)


if __name__ == "__main__":
    unittest.main()
