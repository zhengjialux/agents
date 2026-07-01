import { describe, it, expect } from 'vitest';
import { AGENT_KINDS } from '../src/types';

describe('types', () => {
  it('AGENT_KINDS 包含四种且顺序固定', () => {
    expect(AGENT_KINDS).toEqual(['claude', 'codex', 'opencode', 'zcode']);
  });
});
