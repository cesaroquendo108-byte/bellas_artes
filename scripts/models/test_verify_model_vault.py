import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("verify-model-vault.py")


class VerifyModelVaultTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        (self.root / "manifests").mkdir()
        model_root = self.root / "demo"
        model_root.mkdir()
        artifact = model_root / "model.bin"
        artifact.write_bytes(b"bellas-artes")
        manifest = {
            "modelId": "demo",
            "files": [{
                "path": "model.bin",
                "bytes": artifact.stat().st_size,
                "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
            }],
        }
        (self.root / "manifests" / "demo.json").write_text(json.dumps(manifest), encoding="utf-8")

    def tearDown(self):
        self.temporary_directory.cleanup()

    def run_verifier(self, *arguments: str):
        return subprocess.run(
            [sys.executable, "-B", str(SCRIPT), "--root", str(self.root), *arguments],
            check=False,
            capture_output=True,
            text=True,
        )

    def test_verifies_a_selected_model_and_reports_progress(self):
        result = self.run_verifier("--model", "demo", "--progress")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["verifiedModels"], ["demo"])
        self.assertIn("verificando demo", result.stderr)

    def test_rejects_an_unknown_model(self):
        result = self.run_verifier("--model", "missing")
        self.assertEqual(result.returncode, 2)
        self.assertIn("modelId sin manifest: missing", result.stderr)


if __name__ == "__main__":
    unittest.main()
