# Configuration

HarnessMark looks for `harnessmark.yml`, `harnessmark.yaml`, or `harnessmark.json` in the scan directory. The deliberately small schema is dependency-free and rejects unknown keys.

```yaml
schema: 1
name: my-portable-extension
root: .
targets:
  - codex
  - claude-code
  - cursor
  - gemini-cli
  - github-copilot
exclude:
  - vendor
fail_on: error
```

| Key | Meaning |
|---|---|
| `schema` | Must be `1`. |
| `name` | Display name in passports and reports. |
| `root` | Scan root, resolved relative to the manifest. |
| `targets` | Hosts the package explicitly claims to support. Omit to auto-detect. |
| `exclude` | Relative directories or files excluded from walking and fingerprinting. |
| `fail_on` | `error`, `warning`, or `none`. |

Unknown hosts and unknown manifest fields are errors. HarnessMark does not infer a support claim merely because a generic `plugin.json` exists; a host must have an artifact in a location documented by that host.

## CLI

```console
node src/cli.js check ./extension --config ./extension/harnessmark.yml
node src/cli.js check ./extension --format json --output result.json
node src/cli.js check ./extension --format junit --output junit.xml
node src/cli.js check ./extension --format sarif --output result.sarif
node src/cli.js check ./extension --format html --output passport.html
```

Exit codes are `0` for a result below the selected failure threshold, `1` when the threshold is met, and `2` for CLI misuse.
