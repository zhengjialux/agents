import path from 'node:path';
import { mergeSubagent } from '../merge';
import { targetDir, subagentExt } from '../targets';
import type { AgentKind, Company, WriteOp } from '../types';
import { generateClaude } from './subagent/claude';
import { generateCodex } from './subagent/codex';
import { generateOpencode } from './subagent/opencode';
import { generateZcode } from './subagent/zcode';
import { generateMemory } from './memory';
import { generateSkill } from './skill';

/** 为单个 agent 生成该公司全部制品的 WriteOp 列表。 */
export function generateForAgent(company: Company, home: string, agent: AgentKind): WriteOp[] {
  const ops: WriteOp[] = [];

  // subagents
  const subDir = targetDir(home, agent, 'subagent');
  const ext = subagentExt(agent);
  for (const s of company.subagents) {
    const merged = mergeSubagent(s, agent);
    const content =
      agent === 'claude' ? generateClaude(merged) :
      agent === 'codex' ? generateCodex(merged) :
      agent === 'opencode' ? generateOpencode(merged) :
      generateZcode(merged);
    ops.push({ absPath: path.join(subDir, `${s.name}.${ext}`), content });
  }

  // memory
  if (company.memory) {
    ops.push(generateMemory(company.memory, home, agent));
  }

  // skills
  for (const sk of company.skills) {
    ops.push(...generateSkill(sk, home, agent));
  }

  return ops;
}
