import { describe, it, expect } from 'vitest';
import { splitFrontmatter } from '../src/frontmatter';

describe('splitFrontmatter', () => {
  it('拆分 frontmatter 与 body', () => {
    const md = `---\nname: x\ndescription: y\n---\n\n# 正文\n`;
    const r = splitFrontmatter(md);
    expect(r.attrs).toEqual({ name: 'x', description: 'y' });
    expect(r.body.trim()).toBe('# 正文');
  });
  it('还原被转义的多行 description（实际文件常见 \\n 字面量）', () => {
    const desc = 'line1\\nline2';
    const md = `---\nname: x\ndescription: "${desc}"\n---\nbody`;
    const r = splitFrontmatter(md);
    expect(r.attrs.description).toBe('line1\nline2');
  });
  it('无 frontmatter 时 attrs 为空对象、body 为原文', () => {
    const r = splitFrontmatter('just body');
    expect(r.attrs).toEqual({});
    expect(r.body).toBe('just body');
  });
});
