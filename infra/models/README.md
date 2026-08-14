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

## Local storage layout

The primary vault lives on the dedicated 1 TB disk mounted at
`/mnt/cesar`:

```text
/mnt/cesar/BellasArtes_ModelVault
```

The secondary vault for the heavier HunyuanVideo artifacts remains on
`/mnt/disco_500gb/BellasArtes_ModelVault`. The SSD is reserved for the
application, caches and tooling; it must not receive model weights by default.
Set `BELLAS_ARTES_MODEL_VAULT` or
`BELLAS_ARTES_MODEL_VAULT_SECONDARY` only for an intentional override.

The installer is guarded by a user service and a script preflight that require
both `/mnt/cesar` and `/mnt/disco_500gb` to be mounted. If either disk is
unavailable, the service does not fall back to the SSD.

An installed artifact is not an operational workflow. Promotion still requires
an environment, a versioned workflow, a private smoke test, cost evidence and a
private R2 output.
