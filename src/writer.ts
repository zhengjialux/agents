import fs from 'node:fs';
import path from 'node:path';
import type { WriteOp } from './types';

// 单次写操作的执行结果
export interface WriteResult {
  absPath: string;
  ok: boolean;
  error?: string;
  backedUpTo?: string;
}

/** 执行一批写操作。memory（backupIfExists）覆盖前备份；其余直接覆盖。单条失败不中断整体。 */
export function applyWriteOps(ops: WriteOp[]): WriteResult[] {
  return ops.map((op) => applyOne(op));
}

// 执行单条写操作；任何异常都被捕获并转成失败结果
function applyOne(op: WriteOp): WriteResult {
  try {
    if (op.backupIfExists && fs.existsSync(op.absPath)) {
      const bak = nextBackupName(op.absPath);
      fs.copyFileSync(op.absPath, bak);
      mkdirp(path.dirname(op.absPath));
      fs.writeFileSync(op.absPath, op.content);
      return { absPath: op.absPath, ok: true, backedUpTo: bak };
    }
    mkdirp(path.dirname(op.absPath));
    fs.writeFileSync(op.absPath, op.content);
    return { absPath: op.absPath, ok: true };
  } catch (e) {
    return { absPath: op.absPath, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 找一个不存在的备份名：x.bak → x.bak.1 → x.bak.2 … */
function nextBackupName(absPath: string): string {
  const base = absPath + '.bak';
  if (!fs.existsSync(base)) return base;
  let i = 1;
  while (fs.existsSync(`${base}.${i}`)) i++;
  return `${base}.${i}`;
}

// 递归创建目录（类似 mkdir -p）
function mkdirp(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}
