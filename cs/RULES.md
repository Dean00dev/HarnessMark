# Rule catalog

Every finding links to the first-party source used by its adapter. Severity is part of the current ruleset and can change only with a documented release note.

| Rule | Severity | Meaning |
|---|---|---|
| HM001 | error | HarnessMark manifest cannot be parsed or violates its schema. |
| HM003 | error | A claimed host has no artifact in a location that host documents. |
| HM010 | error | Agent Skill frontmatter is missing or malformed. |
| HM011 | error | Agent Skill name violates the shared naming grammar. |
| HM012 | error | Skill name and immediate parent directory differ. |
| HM013 | error | Skill description is absent, empty, or over 1024 characters. |
| HM014 | warning | `SKILL.md` exceeds the 500-line progressive-disclosure guidance. |
| HM015 | error | Copies of the same named skill contain different bytes. |
| HM016 | warning | A relevant symlink was recorded but not followed. |
| HM020 | error/warning | Plugin or MCP metadata is invalid or incomplete. |
| HM021 | error | A component path is absolute or escapes the package. |
| HM022 | error | A declared component path does not exist. |
| HM023 | error | Plugin name violates the documented portable grammar. |
| HM030 | error/warning | Hook JSON, version, shape, or entries are invalid. |
| HM031 | error | Hook event is not documented for that host. |
| HM032 | error | A project-relative hook command names a missing file. |
| HM033 | warning | Hook command contains a likely platform-specific assumption. |
| HM040 | error | Cursor `.mdc` rule frontmatter is malformed. |
| HM041 | warning | A `.md` file under `.cursor/rules` looks like an ignored project rule. |
| HM050 | error | Copilot path instructions omit their required `applyTo` glob. |
| HM051 | error | `excludeAgent` is outside GitHub's documented values. |
| HM060 | error | A discovered instruction body is empty. |

Rules inspect syntax, paths and byte consistency. They do not judge whether prose is correct, useful, safe or followed by a model.
