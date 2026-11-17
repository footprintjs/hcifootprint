import unittest
from native_input.tool_patch import patched_bytes


class PatchTests(unittest.TestCase):
    original = b'one\ntwo\nthree\nfour\nfive\n'
    patch = ('diff --git a/leaf.js b/leaf.js\n--- a/leaf.js\n+++ b/leaf.js\n'
             '@@ -1,2 +1,3 @@\n one\n+inserted\n two\n'
             '@@ -4,2 +5,1 @@\n-four\n five\n')

    def test_complete_byte_projection_with_multiple_hunks(self):
        self.assertEqual(patched_bytes(self.original, self.patch, 'leaf.js'), b'one\ninserted\ntwo\nthree\nfive\n')

    def test_wrong_source_target_context_or_lengths_refuse(self):
        for patch in [self.patch.replace('--- a/leaf.js', '--- a/other.js'),
                      self.patch.replace('+++ b/leaf.js', '+++ b/other.js'),
                      self.patch.replace(' one\n', ' wrong\n'),
                      self.patch.replace('-1,2', '-1,3'), 'no hunk\n']:
            with self.subTest(patch=patch):
                with self.assertRaises(ValueError): patched_bytes(self.original, patch, 'leaf.js')


if __name__ == '__main__': unittest.main()
