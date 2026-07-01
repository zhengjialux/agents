import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generate, listCompanies } from '../src/index';

let tmpHome: string;
const pkgRoot = path.resolve(__dirname, '..'); // package root (contains src/ and tests/)
beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-home-'));
});
afterEach(() => { fs.rmSync(tmpHome, { recursive: true, force: true }); });

describe('index API', () => {
  it('listCompanies 包含 shuxin', () => {
    expect(listCompanies(pkgRoot)).toContain('shuxin');
  });

  it('为 claude 在 home 下生成 subagent + memory + skill 文件', () => {
    const res = generate({ company: 'shuxin', agents: ['claude'], home: tmpHome, pkgRoot });
    const written = res.flatMap((r) => r.written);
    expect(written.some((p) => p === path.join(tmpHome, '.claude', 'agents', 'code-reviewer.md'))).toBe(true);
    expect(written.some((p) => p === path.join(tmpHome, '.claude', 'CLAUDE.md'))).toBe(true);
    expect(written.some((p) => p === path.join(tmpHome, '.claude', 'skills', 'frontend-project-create', 'SKILL.md'))).toBe(true);
    // 实际写盘
    expect(fs.existsSync(path.join(tmpHome, '.claude', 'agents', 'code-reviewer.md'))).toBe(true);
  });

  it('memory 已存在时产生备份', () => {
    fs.mkdirSync(path.join(tmpHome, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(tmpHome, '.claude', 'CLAUDE.md'), 'OLD');
    const res = generate({ company: 'shuxin', agents: ['claude'], home: tmpHome, pkgRoot });
    expect(res[0].backed.length).toBe(1);
    expect(fs.readFileSync(path.join(tmpHome, '.claude', 'CLAUDE.md.bak'), 'utf8')).toBe('OLD');
  });

  it('dryRun 不写盘但返回路径', () => {
    const res = generate({ company: 'shuxin', agents: ['codex'], home: tmpHome, pkgRoot, dryRun: true });
    expect(res[0].written.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmpHome, '.codex'))).toBe(false);
  });
});
