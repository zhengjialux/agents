import path from 'node:path';
import os from 'node:os';
import { loadCompany, listCompanyNames } from './loader';
import { generateForAgent } from './generators';
import { applyWriteOps, type WriteResult } from './writer';
import type { AgentKind } from './types';

export interface GenerateOptions {
  company: string;
  agents: AgentKind[];
  /** 可选，默认 os.homedir() */
  home?: string;
  /** 包根（含 src/）。必填或通过 inferPkgRoot 推断 */
  pkgRoot?: string;
  /** 只计算不写盘 */
  dryRun?: boolean;
}

export interface AgentResult {
  agent: AgentKind;
  written: string[];   // 成功写入的绝对路径
  backed: string[];    // 备份产生的路径
  failed: { path: string; error: string }[];
}

/** 列出可用公司名。pkgRoot 为包根（含 src/）。 */
export function listCompanies(pkgRoot?: string): string[] {
  return listCompanyNames(path.join(pkgRoot ?? inferPkgRoot(), 'src'));
}

export function generate(opts: GenerateOptions): AgentResult[] {
  const home = opts.home ?? os.homedir();
  const pkgRoot = opts.pkgRoot ?? inferPkgRoot();
  // loader 的 pkgRoot 指向「直接包含 companies/ 的目录」= 包根/src
  const company = loadCompany(opts.company, path.join(pkgRoot, 'src'));
  const results: AgentResult[] = [];
  for (const agent of opts.agents) {
    const ops = generateForAgent(company, home, agent);
    if (opts.dryRun) {
      results.push({ agent, written: ops.map((o) => o.absPath), backed: [], failed: [] });
      continue;
    }
    const wr: WriteResult[] = applyWriteOps(ops);
    results.push({
      agent,
      written: wr.filter((r) => r.ok).map((r) => r.absPath),
      backed: wr.filter((r) => r.backedUpTo).map((r) => r.backedUpTo!) as string[],
      failed: wr.filter((r) => !r.ok).map((r) => ({ path: r.absPath, error: r.error ?? 'unknown' })),
    });
  }
  return results;
}

function inferPkgRoot(): string {
  // dist/index.js -> 包根 = ../ ; src/index.ts -> 包根 = ../
  return path.resolve(__dirname, '..');
}
