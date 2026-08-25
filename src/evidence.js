export const TOOL_VERSION = "1.0.0";
export const EVIDENCE_CHECKED_AT = "2026-08-25";

export const HOST_ORDER = ["codex", "claude-code", "cursor", "github-copilot"];

export const HOSTS = Object.freeze({
  codex: {
    label: "Codex",
    sources: [
      "https://developers.openai.com/codex/agent-configuration/agents-md",
      "https://developers.openai.com/codex/build-skills",
      "https://developers.openai.com/codex/build-plugins",
      "https://developers.openai.com/codex/hooks"
    ],
    hookEvents: new Set([
      "SessionStart", "SessionEnd", "PreToolUse", "PermissionRequest",
      "PostToolUse", "PreCompact", "PostCompact", "UserPromptSubmit",
      "SubagentStart", "SubagentStop", "Stop"
    ])
  },
  "claude-code": {
    label: "Claude Code",
    sources: [
      "https://docs.anthropic.com/en/docs/claude-code/skills",
      "https://docs.anthropic.com/en/docs/claude-code/hooks",
      "https://docs.anthropic.com/en/docs/claude-code/plugin-marketplaces"
    ],
    hookEvents: new Set([
      "SessionStart", "Setup", "UserPromptSubmit", "UserPromptExpansion",
      "PreToolUse", "PermissionRequest", "PermissionDenied", "PostToolUse",
      "PostToolUseFailure", "PostToolBatch", "Notification", "MessageDisplay",
      "SubagentStart", "SubagentStop", "TaskCreated", "TaskCompleted", "Stop",
      "StopFailure", "TeammateIdle", "InstructionsLoaded", "ConfigChange",
      "CwdChanged", "DirectoryAdded", "FileChanged", "WorktreeCreate",
      "WorktreeRemove", "PreCompact", "PostCompact", "Elicitation",
      "ElicitationResult", "SessionEnd"
    ])
  },
  cursor: {
    label: "Cursor",
    sources: [
      "https://cursor.com/docs/rules",
      "https://cursor.com/docs/skills",
      "https://cursor.com/docs/hooks",
      "https://cursor.com/docs/reference/plugins"
    ],
    hookEvents: new Set([
      "sessionStart", "sessionEnd", "preToolUse", "postToolUse",
      "postToolUseFailure", "subagentStart", "subagentStop",
      "beforeShellExecution", "afterShellExecution", "beforeMCPExecution",
      "afterMCPExecution", "beforeReadFile", "afterFileEdit", "beforeSubmitPrompt",
      "preCompact", "stop", "afterAgentResponse", "afterAgentThought",
      "beforeTabFileRead", "afterTabFileEdit", "workspaceOpen"
    ])
  },
  "github-copilot": {
    label: "GitHub Copilot",
    sources: [
      "https://docs.github.com/en/copilot/concepts/agents/about-agent-skills",
      "https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions",
      "https://docs.github.com/en/copilot/reference/custom-instructions-support"
    ],
    hookEvents: new Set()
  }
});

export const SKILL_SOURCE = "https://agentskills.io/specification";

export const RULES = Object.freeze({
  HM001: "Invalid HarnessMark manifest",
  HM003: "Claimed host has no discoverable artifact",
  HM010: "Invalid Agent Skill frontmatter",
  HM011: "Invalid Agent Skill name",
  HM012: "Agent Skill name does not match its directory",
  HM013: "Agent Skill description is invalid",
  HM014: "Agent Skill exceeds progressive-disclosure guidance",
  HM015: "Mirrored Agent Skill content has drifted",
  HM016: "Symbolic link is not followed",
  HM020: "Plugin manifest is invalid",
  HM021: "Plugin component path escapes the package",
  HM022: "Plugin component path does not exist",
  HM023: "Plugin name is invalid",
  HM030: "Hook configuration is invalid",
  HM031: "Hook event is unsupported for the host",
  HM032: "Hook command references a missing project file",
  HM033: "Hook command contains a platform-specific assumption",
  HM040: "Cursor rule has invalid frontmatter",
  HM041: "Cursor rule uses an ignored extension",
  HM050: "Copilot path instruction is missing applyTo",
  HM051: "Copilot path instruction has invalid excludeAgent",
  HM060: "Instruction file is empty"
});
