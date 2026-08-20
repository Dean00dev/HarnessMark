# Security policy

HarnessMark treats every inspected repository as untrusted input.

- It reads files but does not execute inspected hooks, scripts, plugins, or model calls.
- It does not follow symbolic links.
- Manifest component paths are rejected when absolute or when they escape the inspected root.
- The default scan excludes `.git`, `node_modules`, build output, coverage output, and HarnessMark's own report directory.

Please report a vulnerability privately through GitHub's security-advisory feature. Do not include real credentials, private prompts, or proprietary extension contents in a public issue.

See [the threat model](docs/THREAT_MODEL.md) for boundaries and non-claims.
