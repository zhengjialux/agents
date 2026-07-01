import { stringify } from 'smol-toml';
import type { MergedSubagent } from '../../types';

/**
 * Codex: TOML。
 * name/description 为字符串；developer_instructions = body（多行字符串）。
 * 其余 meta 原样输出（smol-toml 负责转义）。
 *
 * 注意：先把 meta 展开，再写入三个保留键，避免 meta 中同名字段覆盖 body。
 */
export function generateCodex(m: MergedSubagent): string {
  const table: Record<string, unknown> = {
    ...m.meta,
    name: m.name,
    description: m.description,
    developer_instructions: m.body.trimStart(),
  };
  return stringify(table);
}
