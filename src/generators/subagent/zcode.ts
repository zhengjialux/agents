import yaml from 'js-yaml';
import type { MergedSubagent } from '../../types';

/** ZCode: 仅 name + description + body。 */
export function generateZcode(m: MergedSubagent): string {
  const fm = { name: m.name, description: m.description };
  return `---\n${yaml.dump(fm, { lineWidth: -1, noRefs: true })}---\n\n${m.body.trimStart()}`;
}
