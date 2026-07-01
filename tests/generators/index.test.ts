import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { generateForAgent } from '../../src/generators/index';
import type { Company } from '../../src/types';

const company: Company = {
  name: 'shuxin',
  subagents: [{
    kind: 'subagent', name: 'reviewer', description: '评审', body: '你是评审员。',
    shared: { tools: ['Read'] }, overrides: { claude: { color: 'cyan' } },
  }],
  memory: { kind: 'memory', body: '# 规范' },
  skills: [{
    kind: 'skill', dirName: 'demo', name: 'demo', description: 'd',
    files: [{ relPath: 'SKILL.md', content: '---\nname: demo\ndescription: d\n---\nbody' }],
  }],
};

describe('generateForAgent', () => {
  it('claude: 产出 subagent + memory + skill 文件', () => {
    const ops = generateForAgent(company, 'h', 'claude');
    // subagent
    expect(ops.some((o) => o.absPath === path.join('h', '.claude', 'agents', 'reviewer.md'))).toBe(true);
    // memory
    const mem = ops.find((o) => o.absPath === path.join('h', '.claude', 'CLAUDE.md'));
    expect(mem).toBeDefined();
    expect(mem!.backupIfExists).toBe(true);
    // skill
    expect(ops.some((o) => o.absPath === path.join('h', '.claude', 'skills', 'demo', 'SKILL.md'))).toBe(true);
  });
  it('codex: subagent 为 toml，skill 在 .agents/skills', () => {
    const ops = generateForAgent(company, 'h', 'codex');
    expect(ops.some((o) => o.absPath === path.join('h', '.codex', 'agents', 'reviewer.toml'))).toBe(true);
    expect(ops.some((o) => o.absPath === path.join('h', '.agents', 'skills', 'demo', 'SKILL.md'))).toBe(true);
    const mem = ops.find((o) => o.absPath === path.join('h', '.codex', 'AGENTS.md'));
    expect(mem?.backupIfExists).toBe(true);
  });
  it('无 memory 时跳过 memory', () => {
    const noMem = { ...company, memory: undefined };
    const ops = generateForAgent(noMem, 'h', 'claude');
    expect(ops.find((o) => o.absPath.endsWith('CLAUDE.md'))).toBeUndefined();
  });
});
