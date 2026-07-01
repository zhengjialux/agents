import { describe, it, expect } from 'vitest';
import { parse } from 'smol-toml';
import { generateClaude } from '../../../src/generators/subagent/claude';
import { generateCodex } from '../../../src/generators/subagent/codex';
import { generateOpencode } from '../../../src/generators/subagent/opencode';
import { generateZcode } from '../../../src/generators/subagent/zcode';
import type { MergedSubagent } from '../../../src/types';

function m(meta: Record<string, unknown> = {}): MergedSubagent {
  return { name: 'reviewer', description: '代码评审', body: '你是评审员。', meta };
}

describe('subagent generators', () => {
  it('claude: 输出 name/description + meta + body', () => {
    const out = generateClaude(m({ tools: ['Read', 'Grep'], model: 'sonnet', color: 'cyan' }));
    expect(out).toContain('name: reviewer');
    expect(out).toContain('description:');
    expect(out).toContain('tools:');
    expect(out).toContain('color: cyan');
    expect(out.trim().endsWith('你是评审员。')).toBe(true);
  });

  it('codex: TOML，含 name/description/developer_instructions/model/sandbox_mode', () => {
    const out = generateCodex(m({ model: 'gpt-5.4', sandbox_mode: 'read-only' }));
    expect(out).toContain('name = "reviewer"');
    expect(out).toContain('description = "代码评审"');
    expect(out).toContain('developer_instructions');
    expect(out).toContain('model = "gpt-5.4"');
    expect(out).toContain('sandbox_mode = "read-only"');
    expect(out).toContain('你是评审员。');
  });

  it('codex: 输出可被 smol-toml 解析，developer_instructions 往返一致（含三引号与引号）', () => {
    const body = '你是评审员。\n含 "引号" 与 """ 三引号 """。';
    const out = generateCodex({ name: 'reviewer', description: '代码评审', body, meta: { model: 'gpt-5.4' } });
    const parsed = parse(out) as Record<string, string>;
    expect(parsed.name).toBe('reviewer');
    expect(parsed.developer_instructions).toBe(body);
  });

  it('opencode: 不输出 name，强制 mode: subagent', () => {
    const out = generateOpencode(m({ model: 'anthropic/claude-sonnet-4-6', permission: { edit: 'deny' } }));
    expect(out).not.toMatch(/^name:/m);
    expect(out).toContain('mode: subagent');
    expect(out).toContain('description:');
    expect(out).toContain('你是评审员。');
  });

  it('zcode: 仅 name + description + body', () => {
    const out = generateZcode(m({ tools: ['Edit'], color: 'red', model: 'x' }));
    const fm = out.split('---')[1];
    expect(fm).toContain('name: reviewer');
    expect(fm).toContain('description:');
    expect(fm).not.toContain('tools');
    expect(fm).not.toContain('color');
    expect(fm).not.toContain('model');
    expect(out).toContain('你是评审员。');
  });
});
