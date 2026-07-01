import type { AgentKind, Artifact } from './types';

/** 各 agent 的「点目录」根（逻辑路径，用 / 分隔） */
function dotDir(home: string, agent: AgentKind): string {
  switch (agent) {
    case 'claude':
      return `${home}/.claude`;
    case 'codex':
      return `${home}/.codex`;
    case 'opencode':
      return `${home}/.config/opencode`;
    case 'zcode':
      return `${home}/.zcode`;
  }
}

/** skill 根目录：codex 是 ~/.agents/skills（非 .codex），其余在各自点目录下 */
export function skillsRoot(home: string, agent: AgentKind): string {
  if (agent === 'codex') return `${home}/.agents/skills`;
  return `${dotDir(home, agent)}/skills`;
}

/** 某 agent 某 制品 的全局根目录（逻辑路径，/ 分隔） */
export function targetDir(
  home: string,
  agent: AgentKind,
  artifact: Artifact,
): string {
  switch (artifact) {
    case 'subagent':
      return `${dotDir(home, agent)}/agents`;
    case 'memory':
      return dotDir(home, agent);
    case 'skill':
      return skillsRoot(home, agent);
  }
}

/** memory 文件名 */
export function memoryFilename(agent: AgentKind): 'CLAUDE.md' | 'AGENTS.md' {
  return agent === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
}

/** subagent 文件扩展名 */
export function subagentExt(agent: AgentKind): 'md' | 'toml' {
  return agent === 'codex' ? 'toml' : 'md';
}
