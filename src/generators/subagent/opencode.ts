import yaml from 'js-yaml';
import type { MergedSubagent } from '../../types';

/** 把 meta 中除 mode 外的字段挑出（mode 单独处理以放在固定位置）。 */
function withoutMode(meta: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (k !== 'mode') rest[k] = v;
  }
  return rest;
}

/**
 * OpenCode: YAML frontmatter（不含 name）+ body。文件名即 name。
 * mode 默认 subagent，可被覆盖块显式覆盖（spec 3.1）。
 */
export function generateOpencode(m: MergedSubagent): string {
  const fm: Record<string, unknown> = {
    description: m.description,
    mode: m.meta.mode ?? 'subagent',
    ...withoutMode(m.meta),
  };
  return `---\n${yaml.dump(fm, { lineWidth: -1, noRefs: true })}---\n\n${m.body.trimStart()}`;
}
