import { describe, it, expect } from 'vitest';
import { targetDir, memoryFilename, subagentExt, skillsRoot } from '../src/targets';

describe('targets', () => {
  describe('targetDir', () => {
    it('subagent 各 agent 目录正确（含 codex 在 .codex/agents）', () => {
      expect(targetDir('h', 'claude', 'subagent')).toBe('h/.claude/agents');
      expect(targetDir('h', 'codex', 'subagent')).toBe('h/.codex/agents');
      expect(targetDir('h', 'opencode', 'subagent')).toBe('h/.config/opencode/agents');
      expect(targetDir('h', 'zcode', 'subagent')).toBe('h/.zcode/agents');
    });
    it('memory 目录（文件名另算）', () => {
      expect(targetDir('h', 'claude', 'memory')).toBe('h/.claude');
      expect(targetDir('h', 'codex', 'memory')).toBe('h/.codex');
      expect(targetDir('h', 'opencode', 'memory')).toBe('h/.config/opencode');
      expect(targetDir('h', 'zcode', 'memory')).toBe('h/.zcode');
    });
    it('skill 各 agent 根目录（codex 用 .agents/skills）', () => {
      expect(targetDir('h', 'claude', 'skill')).toBe('h/.claude/skills');
      expect(targetDir('h', 'codex', 'skill')).toBe('h/.agents/skills');
      expect(targetDir('h', 'opencode', 'skill')).toBe('h/.config/opencode/skills');
      expect(targetDir('h', 'zcode', 'skill')).toBe('h/.zcode/skills');
    });
  });

  describe('memoryFilename', () => {
    it('claude 用 CLAUDE.md，其余用 AGENTS.md', () => {
      expect(memoryFilename('claude')).toBe('CLAUDE.md');
      expect(memoryFilename('codex')).toBe('AGENTS.md');
      expect(memoryFilename('opencode')).toBe('AGENTS.md');
      expect(memoryFilename('zcode')).toBe('AGENTS.md');
    });
  });

  describe('subagentExt', () => {
    it('codex 用 toml，其余用 md', () => {
      expect(subagentExt('claude')).toBe('md');
      expect(subagentExt('codex')).toBe('toml');
      expect(subagentExt('opencode')).toBe('md');
      expect(subagentExt('zcode')).toBe('md');
    });
  });

  describe('skillsRoot', () => {
    it('codex 用 .agents/skills，其余用各自点目录下的 skills', () => {
      expect(skillsRoot('h', 'claude')).toBe('h/.claude/skills');
      expect(skillsRoot('h', 'codex')).toBe('h/.agents/skills');
      expect(skillsRoot('h', 'opencode')).toBe('h/.config/opencode/skills');
      expect(skillsRoot('h', 'zcode')).toBe('h/.zcode/skills');
    });
  });
});
