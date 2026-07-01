import yaml from 'js-yaml';

export interface Parsed {
  attrs: Record<string, unknown>;
  body: string;
}

/**
 * 拆分 YAML frontmatter 与 markdown body。
 * 同时把字符串里字面量 "\n"（两个字符）还原为真正换行，处理现有文件中转义过的 description。
 */
export function splitFrontmatter(md: string): Parsed {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(md);
  if (!match) {
    return { attrs: {}, body: md };
  }
  let attrs = yaml.load(match[1]) as Record<string, unknown>;
  if (attrs == null || typeof attrs !== 'object') attrs = {};
  attrs = unescapeNewlines(attrs) as Record<string, unknown>;
  return { attrs, body: match[2] };
}

/** 把对象内字符串值中的字面量 \n / \\ 还原为换行与反斜杠 */
function unescapeNewlines(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  }
  if (Array.isArray(obj)) return obj.map(unescapeNewlines);
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = unescapeNewlines(v);
    return out;
  }
  return obj;
}
