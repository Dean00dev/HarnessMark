# Contributing

Contributions are welcome when they preserve the central rule: **a pass must name the evidence that earned it**.

1. Open an issue describing the host format or defect.
2. Link first-party documentation and record the date checked.
3. Add a positive fixture and at least one isolated negative fixture.
4. Run `npm run verify` on Node.js 20 or newer.
5. Avoid claims about live host behaviour unless a live adapter actually executed that host.

Adapter changes should never silently widen a pass condition. If documentation is ambiguous, emit a warning or leave the behavior outside the supported subset.
