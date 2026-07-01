import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadCompany, listCompanyNames } from '../src/loader';

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-loader-'));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function write(p: string, content: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

describe('loader', () => {
  it('listCompanyNames 列出公司目录', () => {
    fs.mkdirSync(path.join(tmp, 'companies', 'shuxin'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'companies', 'acme'), { recursive: true });
    expect(listCompanyNames(tmp)).toEqual(['acme', 'shuxin']);
  });

  it('loadCompany 加载 subagents + memory + skills', () => {
    const root = path.join(tmp, 'companies', 'shuxin');
    write(path.join(root, 'subagents', 'reviewer.md'),
      `---\nname: reviewer\ndescription: 代码评审\ntools: [Read, Grep]\nclaude:\n  color: cyan\n---\n\n你是评审员。`);
    write(path.join(root, 'memory.md'), `# 全局规范\n\n别动 submodule。`);
    write(path.join(root, 'skills', 'demo', 'SKILL.md'),
      `---\nname: demo\ndescription: 演示技能\n---\n\n技能正文`);
    write(path.join(root, 'skills', 'demo', 'refs.txt'), '附件');

    const c = loadCompany('shuxin', tmp);
    expect(c.name).toBe('shuxin');
    expect(c.subagents).toHaveLength(1);
    expect(c.subagents[0].name).toBe('reviewer');
    expect(c.subagents[0].shared.tools).toEqual(['Read', 'Grep']);
    expect(c.subagents[0].overrides.claude).toEqual({ color: 'cyan' });
    expect(c.subagents[0].body.trim()).toBe('你是评审员。');
    expect(c.memory?.body).toContain('submodule');
    expect(c.skills).toHaveLength(1);
    expect(c.skills[0].name).toBe('demo');
    expect(c.skills[0].dirName).toBe('demo');
    expect(c.skills[0].files.map((f) => f.relPath).sort()).toEqual(['SKILL.md', 'refs.txt']);
  });

  it('缺 memory.md 时 memory 为 undefined', () => {
    const root = path.join(tmp, 'companies', 'solo');
    write(path.join(root, 'subagents', 'a.md'),
      `---\nname: a\ndescription: a\n---\nbody`);
    const c = loadCompany('solo', tmp);
    expect(c.memory).toBeUndefined();
    expect(c.skills).toEqual([]);
  });

  it('subagent 缺 description 跳过并警告（不抛错、不中断）', () => {
    const root = path.join(tmp, 'companies', 'bad');
    // 一个缺 description（应跳过），一个正常（应保留）
    write(path.join(root, 'subagents', 'bad.md'), `---\nname: bad\n---\nbody`);
    write(path.join(root, 'subagents', 'good.md'), `---\nname: good\ndescription: ok\n---\nbody`);
    const c = loadCompany('bad', tmp);
    expect(c.subagents.map((s) => s.name)).toEqual(['good']);
  });
});
