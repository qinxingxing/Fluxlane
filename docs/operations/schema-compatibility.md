# model/ tree hash vs schema change

`schema_code_sha256` is a SHA-256 over every `model/` path and blob at a
commit (see `scripts/release/build-release.sh`). It is a **compatibility
review trigger**, not a schema verdict.

A hash change means “the `model/` tree is not byte-identical.” It does **not**
mean AutoMigrate will run, columns will be added, or a rollback is unsafe.
Equating a hash mismatch with a schema change, or failing a Test Agent gate
solely because the hash changed, is incorrect.

## Review (required when the hash differs)

Compare `model/` between the live/previous tag and the candidate. Record all
of the following:

| Field | Meaning |
|---|---|
| `schema_changed` | `true` only when the review finds a Struct field, GORM tag, AutoMigrate, or DDL/`model/main.go` migration change that can alter tables. Otherwise `false`. |
| `rollback_database_compatible` | `true` when the previous binary can run against the database the candidate would leave (no forward-only column/table requirement). |

Proof for `schema_changed=false` and `rollback_database_compatible=true` must
be explicit: no GORM model struct change, no `gorm` tag change, no AutoMigrate
target change, no DDL. OptionMap registration, in-memory option keys, comments,
and other non-schema Go in `model/` change the hash and still count as
**OptionMap-only** (or equivalent) code changes.

If that proof cannot be produced, Test Agent **FAIL**. Do not guess.

`deploy/*/rollback.sh` still stops when the two manifests’ hashes differ,
unless `FLUXLANE_SCHEMA_APPROVED=yes`. That env var records that the operator
accepted the **reviewed** risk (including “hash differs, schema_changed=false”).
It is not evidence that tables migrated.

## Recorded review: FrontendBaseURL OptionMap

| Item | Value |
|---|---|
| Change | `model/option.go`: register `FrontendBaseURL` on `OptionMap` and handle it in `updateOptionMap` |
| vs live | `prod-20260831-2612f77` / `2612f77b5f3123ac32870b99ea9e0782c54554d6` |
| `schema_code_sha256` | differs because the `model/option.go` blob changed |
| `schema_changed` | `false` |
| `rollback_database_compatible` | `true` |
| Basis | no Struct / GORM tag / AutoMigrate / DDL change |

Fill the same two fields on the release manifest (`schema_notes` plus these
booleans) when tagging. Forward deploy does not use the rollback schema gate.
