import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { generateMemory } from '../../src/generators/memory';

describe('generateMemory', () => {
  it('内容为 memory body，claude 路径为 ~/.claude/CLAUDE.md，需备份', () => {
    const op = generateMemory({ kind: 'memory', body: '# 规范\n' }, 'h', 'claude');
    expect(op.absPath).toBe(path.join('h', '.claude', 'CLAUDE.md'));
    expect(op.content).toBe('# 规范\n');
    expect(op.backupIfExists).toBe(true);
  });
  it('codex 写到 ~/.codex/AGENTS.md', () => {
    const op = generateMemory({ kind: 'memory', body: 'x' }, 'h', 'codex');
    expect(op.absPath).toBe(path.join('h', '.codex', 'AGENTS.md'));
    expect(op.backupIfExists).toBe(true);
  });
});
