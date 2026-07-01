import yaml from 'js-yaml';
import type { MergedSubagent } from '../../types';

/** Claude Code: YAML frontmatter（含 name/description + 全部 meta）+ body */
export function generateClaude(m: MergedSubagent): string {
  const fm: Record<string, unknown> = {
    name: m.name,
    description: m.description,
    ...m.meta,
  };
  return `---\n${yaml.dump(fm, { lineWidth: -1, noRefs: true })}---\n\n${m.body.trimStart()}`;
}
