import copy
import unittest
from native_input.gates import REQUIRED, require_gates


def records():
    return [{'label': name, 'exit': 1 if name == 'ordinary-pins-refused' else 0,
             'expectedExit': 1 if name == 'ordinary-pins-refused' else 0,
             'afterGuardError': None} for name in REQUIRED]


class GateTests(unittest.TestCase):
    def test_whole_census_has_explicit_ordinary_policy_refusal(self):
        require_gates(records())

    def test_missing_duplicate_reordered_or_other_failed_gate_refuses(self):
        for name in REQUIRED:
            rows = [row for row in records() if row['label'] != name]
            with self.assertRaises(ValueError): require_gates(rows)
        for rows in [records() + [records()[0]], list(reversed(records()))]:
            with self.assertRaises(ValueError): require_gates(rows)
        for key, value in [('exit', 1), ('exit', None), ('exit', False),
                           ('expectedExit', 1), ('afterGuardError', 'source changed')]:
            rows = records(); rows[0][key] = value
            with self.assertRaises(ValueError): require_gates(rows)


if __name__ == '__main__': unittest.main()
