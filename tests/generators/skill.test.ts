import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { generateSkill } from '../../src/generators/skill';
import type { SkillSource } from '../../src/types';

const skill: SkillSource = {
  kind: 'skill', dirName: 'demo', name: 'demo', description: 'd',
  files: [
    { relPath: 'SKILL.md', content: '---\nname: demo\ndescription: d\n---\nbody' },
    { relPath: 'refs/a.txt', content: '附件' },
  ],
};

describe('generateSkill', () => {
  it('每个文件产出一个 WriteOp，路径在 skills 根下（claude）', () => {
    const ops = generateSkill(skill, 'h', 'claude');
    expect(ops).toHaveLength(2);
    const paths = ops.map((o) => o.absPath).sort();
    expect(paths[0]).toBe(path.join('h', '.claude', 'skills', 'demo', 'SKILL.md'));
    expect(paths[1]).toBe(path.join('h', '.claude', 'skills', 'demo', 'refs', 'a.txt'));
    expect(ops.every((o) => o.backupIfExists !== true)).toBe(true);
  });
  it('codex skills 根为 .agents/skills', () => {
    const ops = generateSkill(skill, 'h', 'codex');
    expect(ops[0].absPath).toBe(path.join('h', '.agents', 'skills', 'demo', 'SKILL.md'));
  });
  it('输出文件夹用 dirName（与 name 不同时）', () => {
    const sk: SkillSource = { kind: 'skill', dirName: 'skill-generation', name: 'SKILL generation', description: 'd',
      files: [{ relPath: 'SKILL.md', content: '---\nname: x\ndescription: d\n---\nb' }] };
    const ops = generateSkill(sk, 'h', 'claude');
    expect(ops[0].absPath).toBe(path.join('h', '.claude', 'skills', 'skill-generation', 'SKILL.md'));
  });
});
