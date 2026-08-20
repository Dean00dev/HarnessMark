# HarnessMark contributor instructions

- Run `npm run verify` after changing code, fixtures, adapters, or documentation claims.
- Add an isolated negative fixture for every new rejection path.
- Keep the runtime dependency-free unless a documented parser defect cannot be fixed safely without one.
- Never describe static validation as proof that a model followed instructions.
- Update `src/evidence.js` and `docs/EVIDENCE.md` together when host documentation changes.
