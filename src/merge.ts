import type { AgentKind, MergedSubagent, SubagentSource } from './types';

const WRITE_TOOLS = new Set(['Edit', 'Write', 'apply_patch', 'NotebookEdit']);

export function mergeSubagent(s: SubagentSource, agent: AgentKind): MergedSubagent {
  // 1) 浅拷贝共享字段
  const meta: Record<string, unknown> = { ...s.shared };
  // 2) 叠加该 agent 的覆盖块
  const ov = s.overrides[agent];
  if (ov) deepAssign(meta, ov);

  // 3) tools 自动映射（仅当未显式指定目标字段时）
  const tools = s.shared.tools;
  if (Array.isArray(tools)) {
    const writable = tools.some((t) => typeof t === 'string' && WRITE_TOOLS.has(t));
    applyToolDefaults(meta, agent, writable);
  }

  return { name: s.name, description: s.description, body: s.body, meta };
}

function applyToolDefaults(meta: Record<string, unknown>, agent: AgentKind, writable: boolean): void {
  if (agent === 'codex' && meta.sandbox_mode === undefined) {
    meta.sandbox_mode = writable ? 'workspace-write' : 'read-only';
  }
  if (agent === 'opencode') {
    const perm = (meta.permission ?? {}) as Record<string, unknown>;
    if (perm.edit === undefined) perm.edit = writable ? 'allow' : 'deny';
    meta.permission = perm;
  }
  // claude / zcode 不派生
}

/** 把 override 深度合并进 target（对象递归，其余直接覆盖） */
function deepAssign(target: Record<string, unknown>, override: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepAssign(target[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      target[k] = v;
    }
  }
}
