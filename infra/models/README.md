# Bellas Artes model vault

This directory contains metadata only. Model weights must never be committed.

- `model-vault.json` pins repositories, revisions and selected artifacts.
- `model-install-state.json` is the sanitized state displayed to the private
  administrator; it contains no local paths, tokens or checksums.
- `scripts/models/install-model-vault.py` downloads one or more entries and
  writes local SHA-256 inventories under the external vault.
- `scripts/models/verify-model-vault.py` verifies those inventories.
- `scripts/models/install-public-model-waves.sh` installs the prepared waves
  across the primary and secondary local disks.

An installed artifact is not an operational workflow. Promotion still requires
an environment, a versioned workflow, a private smoke test, cost evidence and a
private R2 output.
