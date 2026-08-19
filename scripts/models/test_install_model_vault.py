import importlib.util
from pathlib import Path
import unittest


SCRIPT = Path(__file__).with_name("install-model-vault.py")
SPEC = importlib.util.spec_from_file_location("install_model_vault", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class IncludePatternTests(unittest.TestCase):
    def test_globstar_matches_files_at_the_directory_root(self):
        self.assertTrue(MODULE.matches_include(
            "transformer/480p_t2v_distilled/model.safetensors",
            ["transformer/480p_t2v_distilled/**/*"],
        ))
        self.assertTrue(MODULE.matches_include(
            "vae/diffusion_pytorch_model.safetensors",
            ["vae/**/*"],
        ))

    def test_globstar_still_matches_nested_files(self):
        self.assertTrue(MODULE.matches_include(
            "text_encoder/shard/model.safetensors",
            ["text_encoder/**/*.safetensors"],
        ))

    def test_unrelated_artifacts_are_rejected(self):
        self.assertFalse(MODULE.matches_include(
            "transformer/model.bin",
            ["vae/**/*", "*.json"],
        ))


if __name__ == "__main__":
    unittest.main()
