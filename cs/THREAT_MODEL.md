# Threat model

HarnessMark treats every inspected repository as untrusted input.

## Protected boundary

The scanner aims to give maintainers a deterministic inventory of portable agent-extension metadata without running that extension.

## Controls

- no runtime dependencies;
- no network requests during analysis;
- inspected scripts, commands, hooks and MCP servers are never launched;
- symbolic links are recorded and not followed;
- component paths are rejected when absolute or outside the scan root;
- generated HTML escapes repository-controlled text;
- deterministic ordering and SHA-256 input fingerprints make reports comparable;
- report language explicitly limits results to documented conformance.

## Out of scope

HarnessMark does not prove:

- that an agent host loaded an artifact;
- that a model obeyed an instruction;
- that a hook or MCP server is benign;
- that a referenced file contains truthful evidence;
- that host documentation has not changed since the evidence date;
- that an ignored or excluded file is safe.

## Hostile repository caveats

Reading a very large regular file can consume memory. The first public alpha inventories file sizes but does not yet impose a byte cap. Run scans with the same filesystem permissions you would grant any other static analyzer, and inspect exclusions before accepting third-party configuration.

