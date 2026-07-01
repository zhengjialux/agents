import { describe, it, expect } from 'vitest';
import { mergeSubagent } from '../src/merge';
import type { SubagentSource } from '../src/types';

function src(over: Partial<SubagentSource['overrides']> = {}, shared: Record<string, unknown> = {}): SubagentSource {
  return { kind: 'subagent', name: 'r', description: 'd', body: 'b', shared, overrides: over };
}

describe('mergeSubagent', () => {
  it('共享字段 + 覆盖块深度合并，覆盖优先', () => {
    const m = mergeSubagent(src({ codex: { model: 'gpt-5.4' } }, { model: 'sonnet', tools: ['Read'] }), 'codex');
    expect(m.meta.model).toBe('gpt-5.4');
    expect(m.meta.tools).toEqual(['Read']);
  });

  it('tools 含写工具 -> codex sandbox_mode=workspace-write', () => {
    const m = mergeSubagent(src({}, { tools: ['Read', 'Edit'] }), 'codex');
    expect(m.meta.sandbox_mode).toBe('workspace-write');
  });

  it('tools 只读 -> codex sandbox_mode=read-only', () => {
    const m = mergeSubagent(src({}, { tools: ['Read', 'Grep'] }), 'codex');
    expect(m.meta.sandbox_mode).toBe('read-only');
  });

  it('显式覆盖块 sandbox_mode 不被 tools 推导覆盖', () => {
    const m = mergeSubagent(src({ codex: { sandbox_mode: 'read-only' } }, { tools: ['Edit'] }), 'codex');
    expect(m.meta.sandbox_mode).toBe('read-only');
  });

  it('tools 含写工具 -> opencode permission.edit=allow', () => {
    const m = mergeSubagent(src({}, { tools: ['Write'] }), 'opencode');
    expect((m.meta.permission as Record<string, string>).edit).toBe('allow');
  });

  it('tools 只读 -> opencode permission.edit=deny', () => {
    const m = mergeSubagent(src({}, { tools: ['Glob'] }), 'opencode');
    expect((m.meta.permission as Record<string, string>).edit).toBe('deny');
  });

  it('claude 不派生 sandbox_mode / permission', () => {
    const m = mergeSubagent(src({}, { tools: ['Edit'] }), 'claude');
    expect(m.meta.sandbox_mode).toBeUndefined();
    expect(m.meta.permission).toBeUndefined();
  });

  it('zcode 不派生 tools 相关字段', () => {
    const m = mergeSubagent(src({}, { tools: ['Edit'] }), 'zcode');
    expect(m.meta.sandbox_mode).toBeUndefined();
  });
});
