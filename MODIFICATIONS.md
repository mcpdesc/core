# Modifications

## Initial core extraction - 2026-08-31

The repository-local Effective Protocol View implementation was rewritten as an
experimental TypeScript package API. Compared with the source implementation,
this extraction:

- exposes a discriminated operation result with structured diagnostic phases;
- supports only projection, excluding merge and semantic comparison;
- retains all components rather than pruning unused components;
- validates source and result through published `@mcpdesc/validator` 0.4.0;
- deduplicates identical diagnostics emitted by source and result validation;
- targets Node.js 22 and browser bundlers; and
- uses self-contained package tests instead of mutable specification fixtures.
