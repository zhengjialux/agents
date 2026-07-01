# `agents` 跨 Agent 配置组装器 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一个名为 `agents` 的 npm CLI，按公司内置 subagents / memory / skills，运行 `npx agents` 选公司 + 勾选 agent 种类后，生成对应格式到各 agent 用户级全局目录。

**Architecture:** TypeScript (CommonJS) 编译到 `dist/`。源数据放 `src/companies/<公司>/`，运行时从包内读取。核心 = loader（读公司）→ merge（subagent 合并）→ generators（4 agent × 3 制品）→ writer（写盘 + memory 备份）。memory 与 skill 因 4 家格式一致，各用单一生成器，仅按 targets 表换路径。

**Tech Stack:** Node.js ≥18, TypeScript, CommonJS；依赖 `@inquirer/prompts`、`js-yaml`、`smol-toml`、`chalk`、`commander`；测试 `vitest`。

**重要约束（来自全局规范）：**
- 依赖**只声明不安装**，由用户手动 `npm install`。
- 改动**不要 commit**，由用户评审后手动提交（计划中的 commit 步骤改为「标记可提交」，不执行 git）。
- 测试产物放项目根 `temp/`。

---

## File Structure

| 文件 | 职责 |
|---|---|
| `package.json` | 包元数据、bin、scripts、依赖声明 |
| `tsconfig.json` | TS 编译配置（CommonJS, outDir dist） |
| `src/types.ts` | 所有共享类型 |
| `src/targets.ts` | (agent × 制品) → 全局目录/文件名 |
| `src/loader.ts` | 读取并校验公司目录（subagents/memory/skills） |
| `src/merge.ts` | subagent 共享字段+覆盖块合并 + tools 自动映射 |
| `src/generators/subagent/claude.ts` 等 4 个 | subagent → 各 agent 文件内容 |
| `src/generators/memory.ts` | memory body → 各 agent 文件 |
| `src/generators/skill.ts` | skill 目录 → 各 agent skills 根 |
| `src/generators/index.ts` | 制品×agent 分发，产出 WriteOp[] |
| `src/writer.ts` | 执行 WriteOp（写文件、memory 备份、目录复制） |
| `src/prompts.ts` | inquirer select/checkbox 封装 |
| `src/cli.ts` | 入口：参数解析 + 编排 |
| `src/index.ts` | 程序化 API |
| `src/companies/shuxin/**` | shuxin 公司内置内容 |
| `src/**/*.test.ts` | 单元测试 |
| `vitest.config.ts` | 测试配置 |

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: 创建 `package.json`**

```json
{
  "name": "agents",
  "version": "0.1.0",
  "description": "组装不同 agent (claude code / codex / opencode / zcode) 的 subagents / memory / skills 配置",
  "bin": {
    "agents": "dist/cli.js"
  },
  "main": "dist/index.js",
  "files": [
    "dist",
    "src/companies"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "chalk": "^4.1.2",
    "commander": "^12.1.0",
    "js-yaml": "^4.1.0",
    "smol-toml": "^1.3.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

> 说明：`chalk` 用 v4（CommonJS 友好）。`files` 含 `src/companies` 以便运行时读源；但运行入口用 `dist`，源读取路径需相对 `dist` 解析（见 loader 任务）。

- [ ] **Step 2: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts", "dist", "temp"]
}
```

- [ ] **Step 3: 创建 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: 创建 `.gitignore`**

```
node_modules/
dist/
temp/
*.log
```

- [ ] **Step 5: 创建 `README.md`**（最小占位，后续任务补充用法）

```markdown
# agents

组装 claude code / codex / opencode / zcode 的 subagents / memory / skills 配置。

## 安装与使用

\`\`\`bash
npm install -g agents
# 或
npx agents
\`\`\`

（详细说明见后续任务）
```

- [ ] **Step 6: 提示用户安装依赖**

告知用户运行 `npm install`（遵循「依赖手动安装」规范）。安装完成后验证 `npx tsc --noEmit` 无报错。

---

## Task 2: 共享类型 `src/types.ts`

**Files:**
- Create: `src/types.ts`
- Test: `src/types.test.ts`

- [ ] **Step 1: 写 `src/types.ts`**

```ts
// 支持的 agent 种类
export type AgentKind = 'claude' | 'codex' | 'opencode' | 'zcode';
export const AGENT_KINDS: AgentKind[] = ['claude', 'codex', 'opencode', 'zcode'];

// 制品种类
export type Artifact = 'subagent' | 'memory' | 'skill';

// subagent 源（来自 companies/<公司>/subagents/<name>.md）
export interface SubagentSource {
  kind: 'subagent';
  name: string;
  description: string;
  body: string;
  /** frontmatter 中除 name/description 外的共享字段，如 model、tools */
  shared: Record<string, unknown>;
  /** 按 agent 的覆盖块：frontmatter 中 claude/codex/opencode/zcode */
  overrides: Partial<Record<AgentKind, Record<string, unknown>>>;
}

// memory 源（companies/<公司>/memory.md）
export interface MemorySource {
  kind: 'memory';
  body: string;
}

// skill 内的单个文件（相对 skill 目录的路径）
export interface SkillFile {
  relPath: string;
  content: string;
}

// skill 源（companies/<公司>/skills/<name>/）
export interface SkillSource {
  kind: 'skill';
  name: string;
  description: string;
  files: SkillFile[];
}

// 一家公司
export interface Company {
  name: string;
  subagents: SubagentSource[];
  memory?: MemorySource;
  skills: SkillSource[];
}

// 合并后的 subagent 元数据（供生成器使用）
export interface MergedSubagent {
  name: string;
  description: string;
  body: string;
  /** 该 agent 最终生效的全部元数据字段（含 name/description 之外） */
  meta: Record<string, unknown>;
}

// 生成器产出的单次写操作
export interface WriteOp {
  /** 写入的绝对路径 */
  absPath: string;
  /** 文本内容 */
  content: string;
  /** 为 true 时，覆盖前把已有文件备份为 .bak（memory 用） */
  backupIfExists?: boolean;
}
```

- [ ] **Step 2: 写 `src/types.test.ts`（编译期类型自检 + 常量断言）**

```ts
import { describe, it, expect } from 'vitest';
import { AGENT_KINDS } from './types';

describe('types', () => {
  it('AGENT_KINDS 包含四种且顺序固定', () => {
    expect(AGENT_KINDS).toEqual(['claude', 'codex', 'opencode', 'zcode']);
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run src/types.test.ts`
Expected: PASS（1 passed）

- [ ] **Step 4: 标记可提交**（不执行 git，由用户手动提交）

---

## Task 3: 目标路径 `src/targets.ts`

**Files:**
- Create: `src/targets.ts`
- Test: `src/targets.test.ts`

- [ ] **Step 1: 写失败测试 `src/targets.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { targetDir, memoryFilename, subagentExt } from './targets';

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
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/targets.test.ts`
Expected: FAIL（模块不存在 / 函数未定义）

- [ ] **Step 3: 写实现 `src/targets.ts`**

```ts
import path from 'node:path';
import type { AgentKind, Artifact } from './types';

/**
 * 返回某 agent 某 制品 的全局根目录（基于给定 home，便于测试注入）。
 * subagent -> <home>/<dot>/agents
 * memory   -> <home>/<dot>            （文件名见 memoryFilename）
 * skill    -> <home>/<dot>/skills
 */
export function targetDir(home: string, agent: AgentKind, artifact: Artifact): string {
  const base = dotDir(home, agent);
  switch (artifact) {
    case 'subagent':
      return path.join(base, 'agents');
    case 'memory':
      return base;
    case 'skill':
      return path.join(base, 'skills');
  }
}

/** 各 agent 的「点目录」根；codex 的 skills 特殊（.agents）在 skill 分支处理 */
function dotDir(home: string, agent: AgentKind): string {
  switch (agent) {
    case 'claude':
      return path.join(home, '.claude');
    case 'codex':
      return path.join(home, '.codex');
    case 'opencode':
      return path.join(home, '.config', 'opencode');
    case 'zcode':
      return path.join(home, '.zcode');
  }
}

/**
 * skill 根目录：codex 是 ~/.agents/skills（非 .codex），单独处理。
 */
export function skillsRoot(home: string, agent: AgentKind): string {
  if (agent === 'codex') return path.join(home, '.agents', 'skills');
  return path.join(dotDir(home, agent), 'skills');
}

/** memory 文件名 */
export function memoryFilename(agent: AgentKind): 'CLAUDE.md' | 'AGENTS.md' {
  return agent === 'claude' ? 'CLAUDE.md' : 'AGENTS.md';
}

/** subagent 文件扩展名 */
export function subagentExt(agent: AgentKind): 'md' | 'toml' {
  return agent === 'codex' ? 'toml' : 'md';
}
```

> 注：`targetDir` 的 skill 分支与 `skillsRoot` 在 codex 上需一致——修正：让 `targetDir` 的 skill 分支调用 `skillsRoot` 以避免重复。改 `case 'skill': return skillsRoot(home, agent);`

修正后的 `targetDir` skill 分支：

```ts
    case 'skill':
      return skillsRoot(home, agent);
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/targets.test.ts`
Expected: PASS（全部通过；codex skill 为 `h/.agents/skills`）

- [ ] **Step 5: 标记可提交**

---

## Task 4: YAML 解析与 frontmatter 拆分 `src/frontmatter.ts`

**Files:**
- Create: `src/frontmatter.ts`
- Test: `src/frontmatter.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { splitFrontmatter } from './frontmatter';

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
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/frontmatter.test.ts`
Expected: FAIL

- [ ] **Step 3: 写实现 `src/frontmatter.ts`**

```ts
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
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/frontmatter.test.ts`
Expected: PASS

- [ ] **Step 5: 标记可提交**

---

## Task 5: 公司加载器 `src/loader.ts`

**Files:**
- Create: `src/loader.ts`
- Test: `src/loader.test.ts`

- [ ] **Step 1: 写失败测试 `src/loader.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadCompany, listCompanyNames } from './loader';

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-loader-'));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function write(p: string, content: string) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

describe('loader', () => {
  it('listCompanyNames 列出公司目录', () => {
    fs.mkdirSync(path.join(tmp, 'companies', 'shuxin'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'companies', 'acme'), { recursive: true });
    expect(listCompanyNames(tmp)).toEqual(['acme', 'shuxin']);
  });

  it('loadCompany 加载 subagents + memory + skills', () => {
    const root = path.join(tmp, 'companies', 'shuxin');
    write(path.join(root, 'subagents', 'reviewer.md'),
      `---\nname: reviewer\ndescription: 代码评审\ntools: [Read, Grep]\nclaude:\n  color: cyan\n---\n\n你是评审员。`);
    write(path.join(root, 'memory.md'), `# 全局规范\n\n别动 submodule。`);
    write(path.join(root, 'skills', 'demo', 'SKILL.md'),
      `---\nname: demo\ndescription: 演示技能\n---\n\n技能正文`);
    write(path.join(root, 'skills', 'demo', 'refs.txt'), '附件');

    const c = loadCompany('shuxin', tmp);
    expect(c.name).toBe('shuxin');
    expect(c.subagents).toHaveLength(1);
    expect(c.subagents[0].name).toBe('reviewer');
    expect(c.subagents[0].shared.tools).toEqual(['Read', 'Grep']);
    expect(c.subagents[0].overrides.claude).toEqual({ color: 'cyan' });
    expect(c.subagents[0].body.trim()).toBe('你是评审员。');
    expect(c.memory?.body).toContain('submodule');
    expect(c.skills).toHaveLength(1);
    expect(c.skills[0].name).toBe('demo');
    expect(c.skills[0].files.map((f) => f.relPath).sort()).toEqual(['SKILL.md', 'refs.txt']);
  });

  it('缺 memory.md 时 memory 为 undefined', () => {
    const root = path.join(tmp, 'companies', 'solo');
    write(path.join(root, 'subagents', 'a.md'),
      `---\nname: a\ndescription: a\n---\nbody`);
    const c = loadCompany('solo', tmp);
    expect(c.memory).toBeUndefined();
    expect(c.skills).toEqual([]);
  });

  it('subagent 缺 description 抛错', () => {
    const root = path.join(tmp, 'companies', 'bad');
    write(path.join(root, 'subagents', 'a.md'), `---\nname: a\n---\nbody`);
    expect(() => loadCompany('bad', tmp)).toThrow(/description/);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/loader.test.ts`
Expected: FAIL

- [ ] **Step 3: 写实现 `src/loader.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { splitFrontmatter } from './frontmatter';
import type {
  AgentKind, Company, MemorySource, SkillFile, SkillSource, SubagentSource,
} from './types';

const OVERRIDE_KEYS: AgentKind[] = ['claude', 'codex', 'opencode', 'zcode'];

/** 列出 companiesRoot 下的公司名（排序） */
export function listCompanyNames(companiesRoot: string): string[] {
  if (!fs.existsSync(companiesRoot)) return [];
  return fs.readdirSync(companiesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** 加载一家公司。pkgRoot 为包含 companies/ 的根目录。 */
export function loadCompany(name: string, pkgRoot: string): Company {
  const dir = path.join(pkgRoot, 'companies', name);
  if (!fs.existsSync(dir)) {
    throw new Error(`公司不存在: ${name}（查找路径 ${dir}）`);
  }
  return {
    name,
    subagents: loadSubagents(dir),
    memory: loadMemory(dir),
    skills: loadSkills(dir),
  };
}

function loadSubagents(companyDir: string): SubagentSource[] {
  const subDir = path.join(companyDir, 'subagents');
  if (!fs.existsSync(subDir)) return [];
  const out: SubagentSource[] = [];
  for (const f of fs.readdirSync(subDir).filter((x) => x.endsWith('.md')).sort()) {
    const raw = fs.readFileSync(path.join(subDir, f), 'utf8');
    const { attrs, body } = splitFrontmatter(raw);
    if (!attrs.name || typeof attrs.name !== 'string') {
      throw new Error(`subagent 缺 name: ${f}`);
    }
    if (!attrs.description || typeof attrs.description !== 'string') {
      throw new Error(`subagent 缺 description: ${f}`);
    }
    if (!body.trim()) {
      throw new Error(`subagent 正文为空: ${f}`);
    }
    const overrides: SubagentSource['overrides'] = {};
    const shared: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'name' || k === 'description') continue;
      if ((OVERRIDE_KEYS as string[]).includes(k)) {
        overrides[k as AgentKind] = (v ?? {}) as Record<string, unknown>;
      } else {
        shared[k] = v;
      }
    }
    out.push({
      kind: 'subagent',
      name: attrs.name,
      description: attrs.description,
      body: body.replace(/^\n+/, ''),
      shared,
      overrides,
    });
  }
  return out;
}

function loadMemory(companyDir: string): MemorySource | undefined {
  const p = path.join(companyDir, 'memory.md');
  if (!fs.existsSync(p)) return undefined;
  return { kind: 'memory', body: fs.readFileSync(p, 'utf8') };
}

function loadSkills(companyDir: string): SkillSource[] {
  const skillsDir = path.join(companyDir, 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  const out: SkillSource[] = [];
  for (const d of fs.readdirSync(skillsDir, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    const skillDir = path.join(skillsDir, d.name);
    const files: SkillFile[] = [];
    walkFiles(skillDir, '', files);
    const skillMd = files.find((f) => f.relPath === 'SKILL.md');
    if (!skillMd) {
      console.warn(`[agents] 跳过 skill（无 SKILL.md）: ${d.name}`);
      continue;
    }
    const { attrs } = splitFrontmatter(skillMd.content);
    if (!attrs.name || !attrs.description) {
      console.warn(`[agents] 跳过 skill（SKILL.md 缺 name/description）: ${d.name}`);
      continue;
    }
    out.push({
      kind: 'skill',
      name: String(attrs.name),
      description: String(attrs.description),
      files,
    });
  }
  return out;
}

function walkFiles(absBase: string, relBase: string, acc: SkillFile[]): void {
  for (const entry of fs.readdirSync(absBase, { withFileTypes: true })) {
    const rel = relBase ? path.join(relBase, entry.name) : entry.name;
    const abs = path.join(absBase, entry.name);
    if (entry.isDirectory()) {
      walkFiles(abs, rel, acc);
    } else if (entry.isFile()) {
      acc.push({ relPath: rel.split(path.sep).join('/'), content: fs.readFileSync(abs, 'utf8') });
    }
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/loader.test.ts`
Expected: PASS（4 passed）

- [ ] **Step 5: 标记可提交**

---

## Task 6: subagent 合并与 tools 映射 `src/merge.ts`

**Files:**
- Create: `src/merge.ts`
- Test: `src/merge.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { mergeSubagent } from './merge';
import type { SubagentSource } from './types';

function src(over: Partial<SubagentSource['overrides']> = {}, shared: Record<string, unknown> = {}): SubagentSource {
  return { kind: 'subagent', name: 'r', description: 'd', body: 'b', shared, overrides: over };
}

describe('mergeSubagent', () => {
  it('共享字段 + 覆盖块深度合并，覆盖优先', () => {
    const m = mergeSubagent(src({ codex: { model: 'gpt-5.4' } }, { model: 'sonnet', tools: ['Read'] }), 'codex');
    expect(m.meta.model).toBe('gpt-5.4');
    expect(m.meta.tools).toEqual(['Read']);
  });

  it('tools 含写工具 -> codex sandbox_mode=workspace-write', () => {
    const m = mergeSubagent(src({}, { tools: ['Read', 'Edit'] }), 'codex');
    expect(m.meta.sandbox_mode).toBe('workspace-write');
  });

  it('tools 只读 -> codex sandbox_mode=read-only', () => {
    const m = mergeSubagent(src({}, { tools: ['Read', 'Grep'] }), 'codex');
    expect(m.meta.sandbox_mode).toBe('read-only');
  });

  it('显式覆盖块 sandbox_mode 不被 tools 推导覆盖', () => {
    const m = mergeSubagent(src({ codex: { sandbox_mode: 'read-only' } }, { tools: ['Edit'] }), 'codex');
    expect(m.meta.sandbox_mode).toBe('read-only');
  });

  it('tools 含写工具 -> opencode permission.edit=allow', () => {
    const m = mergeSubagent(src({}, { tools: ['Write'] }), 'opencode');
    expect((m.meta.permission as Record<string, string>).edit).toBe('allow');
  });

  it('tools 只读 -> opencode permission.edit=deny', () => {
    const m = mergeSubagent(src({}, { tools: ['Glob'] }), 'opencode');
    expect((m.meta.permission as Record<string, string>).edit).toBe('deny');
  });

  it('claude 不派生 sandbox_mode / permission', () => {
    const m = mergeSubagent(src({}, { tools: ['Edit'] }), 'claude');
    expect(m.meta.sandbox_mode).toBeUndefined();
    expect(m.meta.permission).toBeUndefined();
  });

  it('zcode 不派生 tools 相关字段', () => {
    const m = mergeSubagent(src({}, { tools: ['Edit'] }), 'zcode');
    expect(m.meta.sandbox_mode).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/merge.test.ts`
Expected: FAIL

- [ ] **Step 3: 写实现 `src/merge.ts`**

```ts
import type { AgentKind, MergedSubagent, SubagentSource } from './types';

const WRITE_TOOLS = new Set(['Edit', 'Write', 'apply_patch', 'NotebookEdit']);

export function mergeSubagent(s: SubagentSource, agent: AgentKind): MergedSubagent {
  // 1) 浅拷贝共享字段
  const meta: Record<string, unknown> = { ...s.shared };
  // 2) 叠加该 agent 的覆盖块
  const ov = s.overrides[agent];
  if (ov) deepAssign(meta, ov);

  // 3) tools 自动映射（仅当未显式指定目标字段时）
  const tools = s.shared.tools;
  if (Array.isArray(tools)) {
    const writable = tools.some((t) => typeof t === 'string' && WRITE_TOOLS.has(t));
    applyToolDefaults(meta, agent, writable);
  }

  return { name: s.name, description: s.description, body: s.body, meta };
}

function applyToolDefaults(meta: Record<string, unknown>, agent: AgentKind, writable: boolean): void {
  if (agent === 'codex' && meta.sandbox_mode === undefined) {
    meta.sandbox_mode = writable ? 'workspace-write' : 'read-only';
  }
  if (agent === 'opencode') {
    const perm = (meta.permission ?? {}) as Record<string, unknown>;
    if (perm.edit === undefined) perm.edit = writable ? 'allow' : 'deny';
    meta.permission = perm;
  }
  // claude / zcode 不派生
}

/** 把 override 深度合并进 target（对象递归，其余直接覆盖） */
function deepAssign(target: Record<string, unknown>, override: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepAssign(target[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      target[k] = v;
    }
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/merge.test.ts`
Expected: PASS

- [ ] **Step 5: 标记可提交**

---

## Task 7: subagent 生成器（4 个）

**Files:**
- Create: `src/generators/subagent/claude.ts`
- Create: `src/generators/subagent/codex.ts`
- Create: `src/generators/subagent/opencode.ts`
- Create: `src/generators/subagent/zcode.ts`
- Test: `src/generators/subagent/subagent.test.ts`

- [ ] **Step 1: 写失败测试 `subagent.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { generateClaude } from './claude';
import { generateCodex } from './codex';
import { generateOpencode } from './opencode';
import { generateZcode } from './zcode';
import type { MergedSubagent } from '../../types';

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

  it('codex: TOML，developer_instructions 用三引号，含 name/description', () => {
    const out = generateCodex(m({ model: 'gpt-5.4', sandbox_mode: 'read-only' }));
    expect(out).toContain('name = "reviewer"');
    expect(out).toContain('description = "代码评审"');
    expect(out).toContain('developer_instructions = """');
    expect(out).toContain('model = "gpt-5.4"');
    expect(out).toContain('sandbox_mode = "read-only"');
    expect(out).toContain('你是评审员。');
  });

  it('codex: developer_instructions 含三引号时正确转义', () => {
    const out = generateCodex({ name: 'x', description: 'd', body: '含 """ 结尾', meta: {} });
    expect(out).toContain('含 ""​"" 结尾'); // 内部三引号被零宽分隔避免提前闭合（实现可改用其他策略，测试随之调整）
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
```

> 注：codex 三引号转义策略测试较脆弱；如实现采用「无三引号冲突时直接三引号，冲突时报错/转义」，可在实现时把该测试调整为更稳的断言（例如 body 不含 `"""` 时正常输出）。下方实现采用：把 body 中 `"""` 替换为 `""" + """""" + """`（TOML 多行字符串转义），测试相应改为检测输出可被 `smol-toml` 解析回原文。**实际实现请用更稳妥方案：用 `smol-toml` 的 `stringify` 序列化整个表，避免手写转义。** 见 Step 3。

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/generators/subagent/subagent.test.ts`
Expected: FAIL

- [ ] **Step 3: 写实现**

`src/generators/subagent/claude.ts`：

```ts
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
```

`src/generators/subagent/codex.ts`：

```ts
import { stringify } from 'smol-toml';
import type { MergedSubagent } from '../../types';

/**
 * Codex: TOML。
 * name/description 为字符串；developer_instructions = body（多行字符串）。
 * 其余 meta 原样输出（smol-toml 负责转义）。
 */
export function generateCodex(m: MergedSubagent): string {
  const table: Record<string, unknown> = {
    name: m.name,
    description: m.description,
    developer_instructions: m.body,
    ...m.meta,
  };
  return stringify(table);
}
```

`src/generators/subagent/opencode.ts`：

```ts
import yaml from 'js-yaml';
import type { MergedSubagent } from '../../types';

/** OpenCode: YAML frontmatter（不含 name，强制 mode: subagent）+ body。文件名即 name。 */
export function generateOpencode(m: MergedSubagent): string {
  const fm: Record<string, unknown> = {
    description: m.description,
    mode: m.meta.mode ?? 'subagent',
    ...stripMetaForOpencode(m.meta),
  };
  return `---\n${yaml.dump(fm, { lineWidth: -1, noRefs: true })}---\n\n${m.body.trimStart()}`;
}

function stripMetaForOpencode(meta: Record<string, unknown>): Record<string, unknown> {
  const { mode: _mode, ...rest } = meta; // mode 已显式置顶
  void _mode;
  return rest;
}
```

`src/generators/subagent/zcode.ts`：

```ts
import yaml from 'js-yaml';
import type { MergedSubagent } from '../../types';

/** ZCode: 仅 name + description + body。 */
export function generateZcode(m: MergedSubagent): string {
  const fm = { name: m.name, description: m.description };
  return `---\n${yaml.dump(fm, { lineWidth: -1, noRefs: true })}---\n\n${m.body.trimStart()}`;
}
```

- [ ] **Step 4: 调整 codex 三引号测试为「可被 smol-toml 解析回原文」**

把 Step 1 中的两个 codex 三引号相关断言替换为基于往返解析的稳定断言：

```ts
import { parse } from 'smol-toml';

it('codex: 输出可被 smol-toml 解析，developer_instructions 往返一致', () => {
  const body = '你是评审员。\n含 "引号" 与 """ 三引号 """。';
  const out = generateCodex({ name: 'reviewer', description: '代码评审', body, meta: { model: 'gpt-5.4' } });
  const parsed = parse(out) as Record<string, string>;
  expect(parsed.name).toBe('reviewer');
  expect(parsed.developer_instructions).toBe(body);
});
```

- [ ] **Step 5: 运行确认通过**

Run: `npx vitest run src/generators/subagent/subagent.test.ts`
Expected: PASS（5 passed）

- [ ] **Step 6: 标记可提交**

---

## Task 8: memory 与 skill 生成器

**Files:**
- Create: `src/generators/memory.ts`
- Create: `src/generators/skill.ts`
- Test: `src/generators/memory.test.ts`
- Test: `src/generators/skill.test.ts`

- [ ] **Step 1: 写失败测试 `memory.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { generateMemory } from './memory';

describe('generateMemory', () => {
  it('内容为 memory body，路径用 targets 计算', () => {
    const op = generateMemory({ kind: 'memory', body: '# 规范\n' }, 'h', 'claude');
    expect(op.absPath).toBe('h/.claude/CLAUDE.md'.replace(/\//g, require('node:path').sep));
    expect(op.content).toBe('# 规范\n');
    expect(op.backupIfExists).toBe(true);
  });
  it('codex 写到 AGENTS.md', () => {
    const op = generateMemory({ kind: 'memory', body: 'x' }, 'h', 'codex');
    expect(op.absPath.endsWith(['.codex', 'AGENTS.md'].join(require('node:path').sep))).toBe(true);
  });
});
```

- [ ] **Step 2: 写失败测试 `skill.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { generateSkill } from './skill';
import type { SkillSource } from '../types';

const skill: SkillSource = {
  kind: 'skill', name: 'demo', description: 'd',
  files: [
    { relPath: 'SKILL.md', content: '---\nname: demo\ndescription: d\n---\nbody' },
    { relPath: 'refs/a.txt', content: '附件' },
  ],
};

describe('generateSkill', () => {
  it('每个文件产出一个 WriteOp，路径在 skills 根下', () => {
    const ops = generateSkill(skill, 'h', 'claude');
    expect(ops).toHaveLength(2);
    const paths = ops.map((o) => o.absPath).sort();
    expect(paths[0]).toBe(path.join('h', '.claude', 'skills', 'demo', 'SKILL.md'));
    expect(paths[1]).toBe(path.join('h', '.claude', 'skills', 'demo', 'refs', 'a.txt'));
    expect(ops.every((o) => o.backupIfExists !== true)).toBe(true);
  });
  it('codex skills 根为 .agents/skills', () => {
    const ops = generateSkill(skill, 'h', 'codex');
    expect(ops[0].absPath).toBe(path.join('h', '.agents', 'skills', 'demo', 'SKILL.md'));
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `npx vitest run src/generators/memory.test.ts src/generators/skill.test.ts`
Expected: FAIL

- [ ] **Step 4: 写实现 `src/generators/memory.ts`**

```ts
import path from 'node:path';
import { targetDir, memoryFilename } from '../targets';
import type { AgentKind, MemorySource, WriteOp } from '../types';

/** memory: body 原样写入各 agent 全局记忆文件；已存在需备份。 */
export function generateMemory(src: MemorySource, home: string, agent: AgentKind): WriteOp {
  return {
    absPath: path.join(targetDir(home, agent, 'memory'), memoryFilename(agent)),
    content: src.body,
    backupIfExists: true,
  };
}
```

- [ ] **Step 5: 写实现 `src/generators/skill.ts`**

```ts
import path from 'node:path';
import { skillsRoot } from '../targets';
import type { AgentKind, SkillSource, WriteOp } from '../types';

/** skill: 目录整体复制到各 agent skills 根；SKILL.md 内容不改。每个文件一个 WriteOp。 */
export function generateSkill(src: SkillSource, home: string, agent: AgentKind): WriteOp[] {
  const root = skillsRoot(home, agent);
  return src.files.map((f) => ({
    absPath: path.join(root, src.name, f.relPath),
    content: f.content,
  }));
}
```

- [ ] **Step 6: 运行确认通过**

Run: `npx vitest run src/generators/memory.test.ts src/generators/skill.test.ts`
Expected: PASS

- [ ] **Step 7: 标记可提交**

---

## Task 9: 生成器分发 `src/generators/index.ts`

**Files:**
- Create: `src/generators/index.ts`
- Test: `src/generators/index.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { generateForAgent } from './index';
import type { Company } from '../types';

const company: Company = {
  name: 'shuxin',
  subagents: [{
    kind: 'subagent', name: 'reviewer', description: '评审', body: '你是评审员。',
    shared: { tools: ['Read'] }, overrides: { claude: { color: 'cyan' } },
  }],
  memory: { kind: 'memory', body: '# 规范' },
  skills: [{
    kind: 'skill', name: 'demo', description: 'd',
    files: [{ relPath: 'SKILL.md', content: '---\nname: demo\ndescription: d\n---\nbody' }],
  }],
};

describe('generateForAgent', () => {
  it('claude: 产出 subagent + memory + skill 文件', () => {
    const ops = generateForAgent(company, 'h', 'claude');
    const ends = ops.map((o) => o.absPath.split(path.sep).slice(-2).join('/')).sort();
    expect(ends).toContain('agents/reviewer.md');
    expect(ends).toContain('.claude/CLAUDE.md'.split('/').slice(-2).join('/'));
    expect(ops.some((o) => o.absPath.endsWith(path.join('skills', 'demo', 'SKILL.md')))).toBe(true);
    // memory 需备份
    expect(ops.find((o) => o.absPath.endsWith('CLAUDE.md'))?.backupIfExists).toBe(true);
  });
  it('codex: subagent 为 toml，skill 在 .agents/skills', () => {
    const ops = generateForAgent(company, 'h', 'codex');
    expect(ops.some((o) => o.absPath.endsWith('reviewer.toml'))).toBe(true);
    expect(ops.some((o) => o.absPath.includes(path.join('.agents', 'skills')))).toBe(true);
  });
  it('无 memory 时跳过 memory', () => {
    const noMem = { ...company, memory: undefined };
    const ops = generateForAgent(noMem, 'h', 'claude');
    expect(ops.find((o) => o.absPath.endsWith('CLAUDE.md'))).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/generators/index.test.ts`
Expected: FAIL

- [ ] **Step 3: 写实现 `src/generators/index.ts`**

```ts
import { mergeSubagent } from '../merge';
import type { AgentKind, Company, WriteOp } from '../types';
import { generateClaude } from './subagent/claude';
import { generateCodex } from './subagent/codex';
import { generateOpencode } from './subagent/opencode';
import { generateZcode } from './subagent/zcode';
import { generateMemory } from './memory';
import { generateSkill } from './skill';
import path from 'node:path';
import { targetDir, subagentExt } from '../targets';

/** 为单个 agent 生成该公司全部制品的 WriteOp 列表。 */
export function generateForAgent(company: Company, home: string, agent: AgentKind): WriteOp[] {
  const ops: WriteOp[] = [];

  // subagents
  const subDir = targetDir(home, agent, 'subagent');
  const ext = subagentExt(agent);
  for (const s of company.subagents) {
    const merged = mergeSubagent(s, agent);
    const content =
      agent === 'claude' ? generateClaude(merged) :
      agent === 'codex' ? generateCodex(merged) :
      agent === 'opencode' ? generateOpencode(merged) :
      generateZcode(merged);
    ops.push({ absPath: path.join(subDir, `${s.name}.${ext}`), content });
  }

  // memory
  if (company.memory) {
    ops.push(generateMemory(company.memory, home, agent));
  }

  // skills
  for (const sk of company.skills) {
    ops.push(...generateSkill(sk, home, agent));
  }

  return ops;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/generators/index.test.ts`
Expected: PASS

- [ ] **Step 5: 标记可提交**

---

## Task 10: 写盘器 `src/writer.ts`

**Files:**
- Create: `src/writer.ts`
- Test: `src/writer.test.ts`

- [ ] **Step 1: 写失败测试 `src/writer.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { applyWriteOps, type WriteResult } from './writer';
import type { WriteOp } from './types';

let tmp: string;
beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-writer-')); });
afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

describe('writer', () => {
  it('写新文件（含递归建目录）', () => {
    const ops: WriteOp[] = [{ absPath: path.join(tmp, 'a', 'b', 'x.md'), content: 'hi' }];
    const res = applyWriteOps(ops);
    expect(fs.readFileSync(ops[0].absPath, 'utf8')).toBe('hi');
    expect(res.every((r) => r.ok)).toBe(true);
  });

  it('普通文件已存在直接覆盖，不备份', () => {
    const p = path.join(tmp, 'x.md');
    fs.writeFileSync(p, 'old');
    applyWriteOps([{ absPath: p, content: 'new' }]);
    expect(fs.readFileSync(p, 'utf8')).toBe('new');
    expect(fs.existsSync(p + '.bak')).toBe(false);
  });

  it('backupIfExists=true 时，覆盖前备份为 .bak', () => {
    const p = path.join(tmp, 'CLAUDE.md');
    fs.writeFileSync(p, 'old');
    applyWriteOps([{ absPath: p, content: 'new', backupIfExists: true }]);
    expect(fs.readFileSync(p, 'utf8')).toBe('new');
    expect(fs.readFileSync(p + '.bak', 'utf8')).toBe('old');
  });

  it('.bak 已存在时备份为 .bak.1、.bak.2', () => {
    const p = path.join(tmp, 'AGENTS.md');
    fs.writeFileSync(p, 'old');
    fs.writeFileSync(p + '.bak', 'older');
    applyWriteOps([{ absPath: p, content: 'new', backupIfExists: true }]);
    expect(fs.readFileSync(p + '.bak.1', 'utf8')).toBe('old');
    expect(fs.readFileSync(p + '.bak', 'utf8')).toBe('older');
  });

  it('写入失败（权限/非法路径）收集到错误而不抛', () => {
    const bad: WriteOp[] = [{ absPath: path.join(tmp, '\0bad'), content: 'x' }];
    const res = applyWriteOps(bad);
    expect(res[0].ok).toBe(false);
    expect(res[0].error).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/writer.test.ts`
Expected: FAIL

- [ ] **Step 3: 写实现 `src/writer.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';
import type { WriteOp } from './types';

export interface WriteResult {
  absPath: string;
  ok: boolean;
  error?: string;
  backedUpTo?: string;
}

/** 执行一批写操作。memory（backupIfExists）覆盖前备份；其余直接覆盖。单条失败不中断整体。 */
export function applyWriteOps(ops: WriteOp[]): WriteResult[] {
  return ops.map((op) => applyOne(op));
}

function applyOne(op: WriteOp): WriteResult {
  try {
    if (op.backupIfExists && fs.existsSync(op.absPath)) {
      const bak = nextBackupName(op.absPath);
      fs.copyFileSync(op.absPath, bak);
      mkdirp(path.dirname(op.absPath));
      fs.writeFileSync(op.absPath, op.content);
      return { absPath: op.absPath, ok: true, backedUpTo: bak };
    }
    mkdirp(path.dirname(op.absPath));
    fs.writeFileSync(op.absPath, op.content);
    return { absPath: op.absPath, ok: true };
  } catch (e) {
    return { absPath: op.absPath, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 找一个不存在的备份名：x.bak → x.bak.1 → x.bak.2 … */
function nextBackupName(absPath: string): string {
  const base = absPath + '.bak';
  if (!fs.existsSync(base)) return base;
  let i = 1;
  while (fs.existsSync(`${base}.${i}`)) i++;
  return `${base}.${i}`;
}

function mkdirp(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/writer.test.ts`
Expected: PASS（5 passed）

- [ ] **Step 5: 标记可提交**

---

## Task 11: 包内公司根目录定位 `src/paths.ts`

**Files:**
- Create: `src/paths.ts`
- Test: `src/paths.test.ts`

> 背景：编译后 `dist/*.js` 运行，需定位到包内的 `src/companies/`（随包发布在 `src/companies`）。从 `dist/` 回退一级即包根。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolveCompaniesRoot } from './paths';

describe('resolveCompaniesRoot', () => {
  it('从 dist 回退到包根的 companies 目录存在', () => {
    const root = resolveCompaniesRoot();
    // 测试在 src 下跑（tsx），__dirname 指向 src；包根 = ../ ；编译后 dist -> 包根 ../
    expect(root.endsWith(path.join('src', 'companies')) || root.endsWith(path.join('companies'))).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/paths.test.ts`
Expected: FAIL

- [ ] **Step 3: 写实现 `src/paths.ts`**

```ts
import path from 'node:path';

/**
 * 解析包内 companies 目录的绝对路径。
 * - 运行编译产物（dist/xxx.js）时：包根 = dirname(dist) 的上一级
 * - 测试/开发（src/xxx.ts 经 tsx 运行）时：__dirname 即 src，包根 = 上一级
 * 两种情况下 companies 都在包根下；优先尝试包根/companies，回退到 src/companies。
 */
export function resolveCompaniesRoot(): string {
  const here = __dirname; // dist 或 src
  const pkgRoot = path.resolve(here, '..');
  const candidates = [
    path.join(pkgRoot, 'companies'),
    path.join(pkgRoot, 'src', 'companies'),
  ];
  return candidates[0]; // 包根/companies（files 字段已发布 src/companies，见下方说明）
}
```

> 说明：`package.json` 的 `files` 当前是 `["dist", "src/companies"]`，发布后包根下有 `dist/` 与 `src/companies/`。因此包根/companies 不存在，正确路径是 `包根/src/companies`。**修正**：把 `resolveCompaniesRoot` 改为返回 `path.join(pkgRoot, 'src', 'companies')`，并同步把 `files` 改为只发 `src/companies`（已是这样）。同时修正 Step 1 测试断言为：

```ts
  it('指向包根/src/companies', () => {
    const root = resolveCompaniesRoot();
    expect(root.endsWith(path.join('src', 'companies'))).toBe(true);
  });
```

修正后的实现：

```ts
export function resolveCompaniesRoot(): string {
  const here = __dirname;
  const pkgRoot = path.resolve(here, '..');
  return path.join(pkgRoot, 'src', 'companies');
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run src/paths.test.ts`
Expected: PASS

- [ ] **Step 5: 标记可提交**

---

## Task 12: 交互封装 `src/prompts.ts`

**Files:**
- Create: `src/prompts.ts`

> 交互层不写自动化单测（inquirer 依赖 TTY）。仅实现，靠集成/手测验证。

- [ ] **Step 1: 写实现 `src/prompts.ts`**

```ts
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
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 标记可提交**

---

## Task 13: 程序化 API `src/index.ts`

**Files:**
- Create: `src/index.ts`
- Test: `src/index.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generate } from './index';

let tmpHome: string;
let pkgRoot: string;
beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-home-'));
  // 用真实包内 shuxin 做只读源
  pkgRoot = path.resolve(__dirname, '..');
});
afterEach(() => { fs.rmSync(tmpHome, { recursive: true, force: true }); });

describe('generate (API)', () => {
  it('为指定 agent 在 home 下生成文件，返回结果清单', () => {
    const res = generate({ company: 'shuxin', agents: ['claude'], home: tmpHome, pkgRoot });
    const paths = res.flatMap((r) => r.written);
    expect(paths.some((p) => p.endsWith(path.join('.claude', 'agents', 'code-reviewer.md')))).toBe(true);
    expect(paths.some((p) => p.endsWith(path.join('.claude', 'CLAUDE.md')))).toBe(true);
    expect(paths.some((p) => p.endsWith(path.join('.claude', 'skills', 'frontend-project-create', 'SKILL.md')))).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run src/index.test.ts`
Expected: FAIL（generate 未导出；若 shuxin 内容尚未就绪会报公司不存在——本测试依赖 Task 14 的 shuxin 内容。**执行顺序：先做 Task 14 再回填此测试，或本测试在 Task 14 后启用。**）

- [ ] **Step 3: 写实现 `src/index.ts`**

```ts
import path from 'node:path';
import os from 'node:os';
import { loadCompany, listCompanyNames } from './loader';
import { generateForAgent } from './generators';
import { applyWriteOps, type WriteResult } from './writer';

export interface GenerateOptions {
  company: string;
  agents: import('./types').AgentKind[];
  /** 可选，默认 os.homedir() */
  home?: string;
  /** 可选，包根（含 companies/）。默认从本模块定位。 */
  pkgRoot?: string;
  /** 只计算不写盘 */
  dryRun?: boolean;
}

export interface AgentResult {
  agent: import('./types').AgentKind;
  written: string[];   // 成功写入的绝对路径
  backed: string[];    // 备份产生的路径
  failed: { path: string; error: string }[];
}

/** 列出可用公司名 */
export function listCompanies(pkgRoot?: string): string[] {
  return listCompanyNames(path.join(pkgRoot ?? inferPkgRoot(), 'src', 'companies'));
}

export function generate(opts: GenerateOptions): AgentResult[] {
  const home = opts.home ?? os.homedir();
  const pkgRoot = opts.pkgRoot ?? inferPkgRoot();
  const company = loadCompany(opts.company, path.join(pkgRoot, 'src'));
  const results: AgentResult[] = [];
  for (const agent of opts.agents) {
    const ops = generateForAgent(company, home, agent);
    if (opts.dryRun) {
      results.push({ agent, written: ops.map((o) => o.absPath), backed: [], failed: [] });
      continue;
    }
    const wr: WriteResult[] = applyWriteOps(ops);
    results.push({
      agent,
      written: wr.filter((r) => r.ok).map((r) => r.absPath),
      backed: wr.filter((r) => r.backedUpTo).map((r) => r.backedUpTo!),
      failed: wr.filter((r) => !r.ok).map((r) => ({ path: r.absPath, error: r.error ?? 'unknown' })),
    });
  }
  return results;
}

function inferPkgRoot(): string {
  // dist/index.js -> 包根 = ../ ; src/index.ts -> 包根 = ../
  return path.resolve(__dirname, '..');
}
```

- [ ] **Step 4: 标记可提交（测试在 Task 14 后启用）**

---

## Task 14: 内置 shuxin 公司内容

**Files:**
- Create: `src/companies/shuxin/subagents/code-reviewer.md`
- Create: `src/companies/shuxin/subagents/docs-reviewer.md`
- Create: `src/companies/shuxin/subagents/agent-teams-orchestrator.md`
- Create: `src/companies/shuxin/memory.md`
- Create: `src/companies/shuxin/skills/frontend-project-create/SKILL.md`
- Create: `src/companies/shuxin/skills/skill-generation/SKILL.md`

> 源：`C:\Users\15879\.claude\agents\*.md`、`C:\Users\15879\.claude\CLAUDE.md`、`C:\Users\15879\.claude\skills\*`。

- [ ] **Step 1: 复制并规范化 3 个 subagent**

对每个 `~/.claude/agents/<name>.md`：
1. 读取原文件，frontmatter 里 description 是带 `\\n` 字面量的转义串 → 用 `splitFrontmatter` 解析后**还原为多行纯文本**，重新写为 YAML（`js-yaml.dump` 会自动处理多行）。
2. 把 `name`、`description` 提到顶层；其余字段（`tools`、`model`、`color`、`memory`）放入**共享区**（这些对 codex/opencode/zcode 需重新映射，tools 走自动映射，model/color/memory 仅 claude 有意义——把 `color`、`memory` 移入 `claude:` 覆盖块，`tools`、`model` 留共享区）。
3. body 原样保留。

执行（用 node 一次性转换，产物写到 `src/companies/shuxin/subagents/`）：

```bash
node -e '
const fs=require("fs"),path=require("path"),yaml=require("js-yaml");
const src="C:/Users/15879/.claude/agents";
const dst="src/companies/shuxin/subagents";
fs.mkdirSync(dst,{recursive:true});
for(const f of fs.readdirSync(src).filter(x=>x.endsWith(".md"))){
  const raw=fs.readFileSync(path.join(src,f),"utf8");
  const m=/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  let attrs=yaml.load(m[1]);
  const body=m[2].replace(/^\n+/,"");
  // 还原 description 字面量换行
  const desc=String(attrs.description).replace(/\\n/g,"\n").replace(/\\\\/g,"\\");
  const fm={name:attrs.name,description:desc};
  if(attrs.tools)fm.tools=attrs.tools;
  if(attrs.model)fm.model=attrs.model;
  fm.claude={};
  if(attrs.color)fm.claude.color=attrs.color;
  if(attrs.memory)fm.claude.memory=attrs.memory;
  const out=`---\n${yaml.dump(fm,{lineWidth:-1,noRefs:true})}---\n\n${body}`;
  fs.writeFileSync(path.join(dst,f),out);
  console.log("wrote",f);
}
'
```

> 该转换脚本仅本任务执行一次，不入库。若 `js-yaml` 未安装，先 `npm install`（用户手动）。

- [ ] **Step 2: 写 `memory.md`**

把 `C:\Users\15879\.claude\CLAUDE.md` 内容原样复制为 `src/companies/shuxin/memory.md`（纯 Markdown 正文，不含 frontmatter）。手测命令：

```bash
cp "C:/Users/15879/.claude/CLAUDE.md" src/companies/shuxin/memory.md
```

- [ ] **Step 3: 复制 2 个 skill 目录**

```bash
mkdir -p src/companies/shuxin/skills
cp -r "C:/Users/15879/.claude/skills/frontend-project-create" src/companies/shuxin/skills/
cp -r "C:/Users/15879/.claude/skills/skill-generation" src/companies/shuxin/skills/
```

校验每个含 `SKILL.md` 且 frontmatter 有 name+description。

- [ ] **Step 4: 启用 Task 13 的 `src/index.test.ts` 并运行**

Run: `npx vitest run src/index.test.ts`
Expected: PASS（claude 下生成 code-reviewer.md / CLAUDE.md / 两个 skills）

- [ ] **Step 5: 标记可提交**

---

## Task 15: CLI 入口 `src/cli.ts`

**Files:**
- Create: `src/cli.ts`

> 入口逻辑用 `commander` 解析参数，走交互或非交互。输出用 `chalk`。CLI 不写自动化单测，靠 Task 16 的构建+手测。

- [ ] **Step 1: 写实现 `src/cli.ts`**

```ts
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { generate, listCompanies } from './index';
import { resolveCompaniesRoot } from './paths';
import { promptCompany, promptAgents, parseAgents } from './prompts';
import { AGENT_KINDS } from './types';
import { loadCompany } from './loader';
import path from 'node:path';

const program = new Command();
program
  .name('agents')
  .description('组装 claude code / codex / opencode / zcode 的 subagents / memory / skills 配置')
  .option('-c, --company <name>', '公司名（跳过公司选择）')
  .option('-a, --agents <list>', 'agent 种类，逗号分隔（跳过选择）')
  .option('-l, --list', '列出可用公司与制品清单')
  .option('-n, --dry-run', '只打印将写入的路径，不写盘')
  .action(async (opts) => {
    const pkgRoot = path.resolve(resolveCompaniesRoot(), '..', '..'); // companies 在 src/companies -> 包根
    try {
      if (opts.list) {
        return runList(pkgRoot);
      }
      await runGenerate(opts, pkgRoot);
    } catch (e) {
      console.error(chalk.red(e instanceof Error ? e.message : String(e)));
      process.exit(1);
    }
  })
  .parse();

function runList(pkgRoot: string): void {
  for (const c of listCompanies(pkgRoot)) {
    const company = loadCompany(c, path.join(pkgRoot, 'src'));
    console.log(chalk.bold(c));
    console.log(`  subagents: ${company.subagents.map((s) => s.name).join(', ') || '(无)'}`);
    console.log(`  memory:    ${company.memory ? '有' : '无'}`);
    console.log(`  skills:    ${company.skills.map((s) => s.name).join(', ') || '(无)'}`);
  }
}

async function runGenerate(opts: { company?: string; agents?: string; dryRun?: boolean }, pkgRoot: string): Promise<void> {
  const companies = listCompanies(pkgRoot);
  if (companies.length === 0) {
    throw new Error('未找到任何公司（companies 目录为空）');
  }
  const company = opts.company ?? await promptCompany(companies);

  let agents = parseAgents(opts.agents);
  if (agents.length === 0) {
    agents = await promptAgents();
  }
  if (agents.length === 0) {
    throw new Error('未选择任何 agent');
  }

  console.log(chalk.cyan(`正在为 ${company} 生成配置…\n`));
  const results = generate({ company, agents, pkgRoot, dryRun: opts.dryRun });

  for (const r of results) {
    console.log(chalk.bold(`[${r.agent}]`));
    for (const w of r.written) console.log(`  写入 ${w}${opts.dryRun ? ' (dry-run)' : ''}`);
    for (const b of r.backed) console.log(chalk.yellow(`  备份旧文件 -> ${b}`));
    for (const f of r.failed) console.log(chalk.red(`  失败 ${f.path}: ${f.error}`));
    console.log();
  }
  const total = results.reduce((n, r) => n + r.written.length, 0);
  console.log(chalk.green(`完成 ✅（共 ${total} 个文件${opts.dryRun ? '，dry-run 未实际写入' : ''}）`));
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 在 `package.json` 确认 bin 指向 `dist/cli.js`（已在 Task 1 配置）。**

- [ ] **Step 4: 标记可提交**

---

## Task 16: 构建、手测与文档

**Files:**
- Modify: `README.md`（补全用法）

- [ ] **Step 1: 构建**

Run: `npm run build`
Expected: 生成 `dist/`，无 TS 错误。

- [ ] **Step 2: 手测 --list**

Run: `node dist/cli.js --list`
Expected: 打印 `shuxin` 及其 subagents/memory/skills 清单。

- [ ] **Step 3: 手测 --dry-run**

Run: `node dist/cli.js --company shuxin --agents claude,codex --dry-run`
Expected: 打印将写入的路径（claude .claude/agents/*.md、CLAUDE.md、skills；codex .codex/agents/*.toml、AGENTS.md、.agents/skills），未实际写盘。

- [ ] **Step 4: 手测交互模式（写盘到 temp 假 home）**

为避免污染真实 home，临时设置 HOME：

```bash
mkdir -p temp/fake-home
HOME="$PWD/temp/fake-home" node dist/cli.js --company shuxin --agents claude,zcode
```

Expected: 在 `temp/fake-home` 下生成 `.claude/` 与 `.zcode/` 结构；memory 若 `CLAUDE.md` 存在则备份。

- [ ] **Step 5: 跑全部单元测试**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 6: 补全 `README.md`**

```markdown
# agents

按公司内置 subagents / 全局记忆 / skills，运行 `npx agents` 选择公司与本机已装的 agent（claude code / codex / opencode / zcode），自动生成对应格式到各 agent 用户级全局目录。

## 安装

\`\`\`bash
npm install -g agents
# 或一次性执行
npx agents
\`\`\`

## 使用

\`\`\`bash
agents                 # 交互：选公司 → 勾选 agent → 生成
agents --list          # 列出可用公司与制品
agents --company shuxin --agents claude,codex   # 非交互
agents --dry-run       # 只打印路径不写盘
\`\`\`

## 生成目标

| Agent | subagents | 全局记忆 | skills |
|---|---|---|---|
| claude code | ~/.claude/agents/*.md | ~/.claude/CLAUDE.md | ~/.claude/skills/ |
| codex | ~/.codex/agents/*.toml | ~/.codex/AGENTS.md | ~/.agents/skills/ |
| opencode | ~/.config/opencode/agents/*.md | ~/.config/opencode/AGENTS.md | ~/.config/opencode/skills/ |
| zcode | ~/.zcode/agents/*.md | ~/.zcode/AGENTS.md | ~/.zcode/skills/ |

## 内置公司

- \`shuxin\`：code-reviewer / docs-reviewer / agent-teams-orchestrator + 全局规范 + frontend-project-create / skill-generation

## 源格式

公司内容位于 \`src/companies/<公司>/\`：\`subagents/*.md\`（统一 frontmatter + body）、\`memory.md\`、\`skills/<名>/\`。subagent frontmatter 支持共享字段（model/tools）与 \`claude/codex/opencode/zcode\` 覆盖块；tools 会自动映射为 codex 的 sandbox_mode 与 opencode 的 permission。
```

- [ ] **Step 7: 提示用户评审并手动提交全部改动**

告知用户：实现完成，依赖已声明、未安装（请先 `npm install`），改动未提交，请评审后手动 commit。

---

## Self-Review 结果

1. **Spec 覆盖**：subagent（T2,3,5,6,7,9）、memory（T8,9）、skills（T8,9）、公司目录（T5,11,14）、CLI 交互（T12,15）、memory 备份（T10）、--list/--dry-run/参数（T13,15）、跨平台路径（T3）、错误处理（T5 loader 校验 + T10 收集错误）、测试产物入 temp（T10/14/16 用 temp 与 os.tmpdir）。✅
2. **占位符扫描**：无 TBD；Task 14 的转换脚本为一次性、完整可执行；Task 11 与 T13 的路径修正已在同任务内闭环。✅
3. **类型一致性**：`WriteOp`、`MergedSubagent`、`Company`、`SkillSource` 在 T2 定义，T6–T10 使用一致；`generateForAgent`/`generate`/`applyWriteOps` 签名贯穿 T9–T13 一致；`skillsRoot`/`targetDir`/`memoryFilename`/`subagentExt` 名字统一。✅
