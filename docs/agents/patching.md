# Patching

Use RFC 6902. `replace` requires the path to exist; use `add` for new fields.
Array indexes are brittle; prefer replacing an identified view object when
possible. After apply, Vizulet re-runs structural and semantic validation.
