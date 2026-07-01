import { select, checkbox } from '@inquirer/prompts';
import type { AgentKind } from './types';
import { AGENT_KINDS } from './types';

const AGENT_LABEL: Record<AgentKind, string> = {
  claude: 'claude code',
  codex: 'codex',
  opencode: 'opencode',
  zcode: 'zcode',
};

/** 公司单选 */
export async function promptCompany(companies: string[]): Promise<string> {
  return select({
    message: '请选择公司',
    choices: companies.map((c) => ({ name: c, value: c })),
  });
}

/** agent 种类多选（至少一个） */
export async function promptAgents(): Promise<AgentKind[]> {
  const chosen = await checkbox({
    message: '你本机安装了哪些 agent？（空格选择，回车确认）',
    choices: AGENT_KINDS.map((k) => ({ name: AGENT_LABEL[k], value: k, checked: false })),
  });
  return chosen as AgentKind[];
}

/** 把命令行字符串数组解析为合法 AgentKind[] */
export function parseAgents(raw: string | undefined): AgentKind[] {
  if (!raw) return [];
  const out: AgentKind[] = [];
  for (const part of raw.split(',').map((s) => s.trim().toLowerCase())) {
    const k = AGENT_KINDS.find((a) => a === part || AGENT_LABEL[a] === part);
    if (k) out.push(k);
  }
  return out;
}
