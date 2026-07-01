import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { applyWriteOps } from '../src/writer';
import type { WriteOp } from '../src/types';

let tmp: string;
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-writer-')); });
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

describe('writer', () => {
  it('写新文件（含递归建目录）', () => {
    const ops: WriteOp[] = [{ absPath: path.join(tmp, 'a', 'b', 'x.md'), content: 'hi' }];
    const res = applyWriteOps(ops);
    expect(fs.readFileSync(ops[0].absPath, 'utf8')).toBe('hi');
    expect(res.every((r) => r.ok)).toBe(true);
  });

  it('普通文件已存在直接覆盖，不备份', () => {
    const p = path.join(tmp, 'x.md');
    fs.writeFileSync(p, 'old');
    applyWriteOps([{ absPath: p, content: 'new' }]);
    expect(fs.readFileSync(p, 'utf8')).toBe('new');
    expect(fs.existsSync(p + '.bak')).toBe(false);
  });

  it('backupIfExists=true 时，覆盖前备份为 .bak', () => {
    const p = path.join(tmp, 'CLAUDE.md');
    fs.writeFileSync(p, 'old');
    applyWriteOps([{ absPath: p, content: 'new', backupIfExists: true }]);
    expect(fs.readFileSync(p, 'utf8')).toBe('new');
    expect(fs.readFileSync(p + '.bak', 'utf8')).toBe('old');
  });

  it('.bak 已存在时备份为 .bak.1、.bak.2', () => {
    const p = path.join(tmp, 'AGENTS.md');
    fs.writeFileSync(p, 'old');
    fs.writeFileSync(p + '.bak', 'older');
    applyWriteOps([{ absPath: p, content: 'new', backupIfExists: true }]);
    expect(fs.readFileSync(p + '.bak.1', 'utf8')).toBe('old');
    expect(fs.readFileSync(p + '.bak', 'utf8')).toBe('older');
  });

  it('写入失败（非法路径）收集到错误而不抛', () => {
    const bad: WriteOp[] = [{ absPath: path.join(tmp, '\0bad'), content: 'x' }];
    const res = applyWriteOps(bad);
    expect(res[0].ok).toBe(false);
    expect(res[0].error).toBeTruthy();
  });
});
