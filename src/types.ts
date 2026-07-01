// 支持的 agent 种类
export type AgentKind = 'claude' | 'codex' | 'opencode' | 'zcode';
export const AGENT_KINDS: AgentKind[] = ['claude', 'codex', 'opencode', 'zcode'];

// 制品种类
export type Artifact = 'subagent' | 'memory' | 'skill';

// subagent 源（来自 companies/<公司>/subagents/<name>.md）
export interface SubagentSource {
  kind: 'subagent';
  name: string;
  description: string;
  body: string;
  /** frontmatter 中除 name/description 外的共享字段，如 model、tools */
  shared: Record<string, unknown>;
  /** 按 agent 的覆盖块：frontmatter 中 claude/codex/opencode/zcode */
  overrides: Partial<Record<AgentKind, Record<string, unknown>>>;
}

// memory 源（companies/<公司>/memory.md）
export interface MemorySource {
  kind: 'memory';
  body: string;
}

// skill 内的单个文件（相对 skill 目录的路径）
export interface SkillFile {
  relPath: string;
  content: string;
}

// skill 源（companies/<公司>/skills/<name>/）
export interface SkillSource {
  kind: 'skill';
  /** 源目录名（canonical skill 身份，用作输出文件夹名） */
  dirName: string;
  /** SKILL.md frontmatter 的 name（仅展示） */
  name: string;
  description: string;
  files: SkillFile[];
}

// 一家公司
export interface Company {
  name: string;
  subagents: SubagentSource[];
  memory?: MemorySource;
  skills: SkillSource[];
}

// 合并后的 subagent 元数据（供生成器使用）
export interface MergedSubagent {
  name: string;
  description: string;
  body: string;
  /** 该 agent 最终生效的全部元数据字段（含 name/description 之外） */
  meta: Record<string, unknown>;
}

// 生成器产出的单次写操作
export interface WriteOp {
  /** 写入的绝对路径 */
  absPath: string;
  /** 文本内容 */
  content: string;
  /** 为 true 时，覆盖前把已有文件备份为 .bak（memory 用） */
  backupIfExists?: boolean;
}
