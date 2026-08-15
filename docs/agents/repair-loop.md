# Repair loop

1. Keep the invalid document.
2. Send `diagnostics[]` (`code`, `path`, `message`, `hint`) back to the model.
3. Prefer a JSON Patch over a full rewrite.
4. Validate again. Stop after a small number of turns; inspect capabilities if
   the failure is `capability.*`.
