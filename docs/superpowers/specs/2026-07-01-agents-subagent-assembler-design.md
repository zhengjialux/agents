# `agents` — 跨 Agent 配置组装器（subagents / memory / skills）设计文档

> 日期：2026-07-01
> 状态：已批准，待实现计划

## 1. 背景与目标

不同的 AI coding agent（codex、claude code、opencode、zcode）各自有 subagent、全局记忆、skills 的配置格式与存放位置，但同一套内容**实际干的活是一致的**。手工为每个 agent 重复维护多份既冗余又易出错。

本包 `agents` 提供 CLI（`npx agents`），按**公司**内置三类制品的「主体 + 元数据」，让用户：

1. 选择**公司**（不同公司的内容不同，按公司分包内置）；
2. 勾选本机**已安装的 agent 种类**；
3. 自动把所选公司的 **subagents + 全局记忆 + skills** 拼成对应格式，写入各 agent 的**用户级全局目录**。

三类制品：

| 制品 | 共享部分 | 各 agent 差异 |
|---|---|---|
| **subagents** | 系统提示词 body | frontmatter 元数据 + 文件格式（md/toml）+ 目录 |
| **memory（全局指令）** | Markdown 正文 | 仅文件名不同（CLAUDE.md / AGENTS.md）+ 目录 |
| **skills** | `SKILL.md`（frontmatter name+description + body）+ 附带文件 | 仅 skills 根目录不同 |

当前首批内置公司：**shuxin**，含 3 个 subagent、1 份全局记忆、2 个 skills。

## 2. 核心理念：主体 + 元数据分离

每个制品的「主体」跨 agent 共享，「元数据/位置」按 agent 不同。一份源 → 4 种目标。

### 2.1 公司源目录结构

```
src/companies/<公司>/
├─ subagents/
│   ├─ <name>.md          # subagent 源：统一 frontmatter + body
│   └─ ...
├─ memory.md              # 全局指令正文（纯 Markdown，所有 agent 共用）
└─ skills/
    └─ <skill-name>/      # 一个 skill 一个目录
        ├─ SKILL.md        # frontmatter name+description + body（4 家格式一致）
        └─ ...             # 可选附带文件（scripts/、references/ 等）
```

### 2.2 subagent 源统一 schema

`subagents/<name>.md`：YAML frontmatter + Markdown body。

```markdown
---
name: code-reviewer
description: <可多行的纯文本描述>
# —— 共享默认值：所有 agent 继承，除非被覆盖 ——
model: sonnet
tools: [Read, Grep, Glob, Bash]
# —— 按 agent 种类的元数据覆盖/补充 ——
claude:
  color: cyan
  memory: user
codex:
  model: gpt-5.4
  sandbox_mode: read-only
opencode:
  model: anthropic/claude-sonnet-4-6
  mode: subagent
  permission:
    edit: deny
zcode: {}            # zcode 仅 name + description
---

<系统提示词主体，所有 agent 共用>
```

**字段合并规则**：取共享顶层字段为基础 → 用该 agent 覆盖块深度合并 → 输出。`name`/`description`/`body` 必需；其余缺失则省略。

**tools 自动映射**（可被覆盖块覆盖）：
- 含写工具（`Edit`/`Write`/`apply_patch`）→ Codex `sandbox_mode=workspace-write`、OpenCode `permission.edit=allow`；否则 → `read-only` / `deny`。
- ZCode 忽略 tools。
- Claude Code 原样输出 `tools`。

### 2.3 memory 源

`memory.md`：纯 Markdown 正文，无 frontmatter。生成时整体作为各 agent 全局记忆文件的内容。

### 2.4 skills 源

`skills/<name>/`：一个目录，必含 `SKILL.md`（YAML frontmatter `name`+`description` + body），可含任意附带文件。4 家的 `SKILL.md` 格式完全一致，**生成时无需转换内容**，按目录整体复制即可。

## 3. 各 agent 的生成目标（依据官方最新文档，2026-07 抓取）

### 3.1 subagents

| Agent | 全局目录 | 文件 | 格式 | 关键字段 |
|---|---|---|---|---|
| Claude Code | `~/.claude/agents/` | `<name>.md` | YAML frontmatter + body | name, description (+ tools, model, color, memory, permissionMode, maxTurns, skills, mcpServers, hooks, effort, isolation, background…) |
| Codex | `~/.codex/agents/` | `<name>.toml` | TOML | name, description, developer_instructions(=body) (+ model, model_reasoning_effort, sandbox_mode, nickname_candidates, mcp_servers) |
| OpenCode | `~/.config/opencode/agents/` | `<name>.md`（文件名即 name） | YAML frontmatter + body | description (+ mode, model, temperature, top_p, permission, tools, steps, disable, hidden, color) |
| ZCode | `~/.zcode/agents/` | `<name>.md` | YAML frontmatter + body | **仅** name, description |

生成器要点：
- **Claude Code**：`---\n<yaml>\n---\n\n<body>`，description 用 YAML 多行字符串。
- **Codex**：TOML，`developer_instructions` 用三引号多行字符串，注意转义。
- **OpenCode**：frontmatter+body，**不输出 `name`**，强制 `mode: subagent`（除非覆盖块指定）。
- **ZCode**：仅 `name`、`description` + body。

### 3.2 memory（全局指令）

| Agent | 路径 | 格式 |
|---|---|---|
| Claude Code | `~/.claude/CLAUDE.md` | 纯 Markdown，无 frontmatter |
| Codex | `~/.codex/AGENTS.md` | 纯 Markdown |
| OpenCode | `~/.config/opencode/AGENTS.md` | 纯 Markdown |
| ZCode | `~/.zcode/AGENTS.md` | 纯 Markdown |

生成器：把 `memory.md` 正文写到对应文件名。

### 3.3 skills

| Agent | skills 根目录 | SKILL.md 格式 |
|---|---|---|
| Claude Code | `~/.claude/skills/` | frontmatter name+description + body |
| Codex | `~/.agents/skills/` ⚠️（非 `.codex/`） | 同上 |
| OpenCode | `~/.config/opencode/skills/` | 同上 |
| ZCode | `~/.zcode/skills/` | 同上 |

生成器：把 `skills/<name>/` 整个目录复制到对应根目录下。内容不改。

> 文档来源：
> - Claude Code: https://code.claude.com/docs/zh-CN/sub-agents
> - Codex subagents: https://developers.openai.com/codex/subagents ｜ memory: https://developers.openai.com/codex/guides/agents-md ｜ skills: https://developers.openai.com/codex/skills
> - OpenCode agents: https://opencode.ai/docs/agents ｜ memory: https://opencode.ai/docs/rules/ ｜ skills: https://opencode.ai/docs/skills/
> - ZCode: https://zcode.z.ai/en/docs/agents ｜ skills: https://zcode.z.ai/en/docs/skill

## 4. CLI 交互流程

```
$ npx agents

? 请选择公司（单选）
❯ shuxin

? 你本机安装了哪些 agent？（多选勾选，空格选择，回车确认）
◉ claude code
◉ codex
◯ opencode
◯ zcode

✔ 正在为 shuxin 生成配置…

[claude code]
  subagents → ~/.claude/agents/code-reviewer.md (+2)
  memory    → ~/.claude/CLAUDE.md        ⚠ 已备份旧文件为 CLAUDE.md.bak
  skills    → ~/.claude/skills/frontend-project-create (+1)

[codex]
  subagents → ~/.codex/agents/code-reviewer.toml (+2)
  memory    → ~/.codex/AGENTS.md
  skills    → ~/.agents/skills/frontend-project-create (+1)

完成 ✅（共 N 个文件）
```

### 4.1 行为约定

- **公司选择**：单选，列出 `src/companies/` 下目录（当前仅 `shuxin`）。
- **agent 种类**：多选勾选；至少一个，否则提示重问。
- **生成范围**：对所选公司，生成 **subagents + memory + skills** 全部三类到每个勾选的 agent。
- **覆盖策略**：
  - **subagents / skills 文件**：已存在直接覆盖（离散文件，工具管理）。
  - **memory 文件**：已存在则**先备份**为 `<原名>.bak`（若 `.bak` 已存在则追加序号），再覆盖，并打印警告。
- **缺失制品**：公司某类制品不存在（如无 `memory.md`）则跳过该类，不报错。
- **目录创建**：目标目录不存在则递归创建。
- **路径**：跨平台，`os.homedir()` 解析 `~`（Windows 下 `~` = `C:\Users\<用户>`）。
- **退出码**：成功 0；未选 agent 或公司读取失败 1。

### 4.2 命令行参数（可选，脚本化）

- `agents`：交互（默认）。
- `agents --company <name> --agents claude,codex`：跳过交互直接生成。
- `agents --list`：列出可用公司与三类制品清单。
- `agents --dry-run`：只打印将写入的路径，不写盘。

## 5. 技术栈与依赖

- **运行时**：Node.js ≥ 18；**TypeScript** 编译到 `dist/`；**CommonJS**（最大化 `npx` 兼容）。
- **package.json**：
  - `name: "agents"`、`bin: { "agents": "dist/cli.js" }`
  - `files: ["dist", "src/companies"]`（companies 的 .md 需随包发布；运行时从包内读取，用 `__dirname`/`import.meta` 定位）。
  - `prepublishOnly: "tsc"`。
- **依赖**（仅声明，用户手动安装）：`@inquirer/prompts`、`js-yaml`、`smol-toml`、`chalk`、`commander`。
- **devDependencies**：`typescript`、`@types/node`、`@types/js-yaml`。

## 6. 目录结构

```
agents/
├─ package.json
├─ tsconfig.json
├─ README.md
├─ src/
│  ├─ cli.ts                 # 入口：参数 → 公司单选 → agent 多选 → 生成
│  ├─ index.ts               # 程序化 API
│  ├─ types.ts               # Company, ArtifactKind, SubagentSource, AgentKind
│  ├─ loader.ts              # 读公司目录：subagents/ + memory.md + skills/
│  ├─ targets.ts             # 各 agent × 各制品 的全局目录/文件名
│  ├─ merge.ts               # subagent 共享字段+覆盖块+tools 映射
│  ├─ prompts.ts             # select / checkbox
│  ├─ writer.ts              # 写文件/复制目录/备份 memory
│  ├─ generators/
│  │   ├─ index.ts           # 制品×agent 分发
│  │   ├─ subagent/{claude,codex,opencode,zcode}.ts
│  │   ├─ memory.ts          # 单一：body→各 agent 文件名（4 家共享）
│  │   └─ skill.ts           # 单一：目录复制到各 agent skills 根（4 家共享）
│  └─ companies/
│      └─ shuxin/
│          ├─ subagents/{code-reviewer,docs-reviewer,agent-teams-orchestrator}.md
│          ├─ memory.md
│          └─ skills/{frontend-project-create,skill-generation}/SKILL.md
```

### 6.1 关键模块职责

- `loader.ts`：给定公司名，读 `subagents/*.md`（拆 frontmatter+body，校验 name/description/非空body）、`memory.md`（可选）、`skills/*/`（含 SKILL.md 校验）。
- `targets.ts`：返回 `{ agentKind, artifact } -> { dir, filename? }`，统一 `path.join(os.homedir(), ...)`。
- `merge.ts`：subagent 专用，共享+覆盖块+tools 自动映射。
- `generators/memory.ts`、`generators/skill.ts`：因 4 家格式一致，单文件实现，按 `targets` 给的目录输出。
- `writer.ts`：封装 `fs`：写文本、递归复制目录（skill）、memory 备份逻辑。

## 7. 数据流

```
npx agents
  ▼
prompts: 选公司 ──► loader 读 companies/<公司>/ ──► { subagents[], memory?, skills[] }
  ▼
prompts: 勾选 agent 种类 ──► AgentKind[]
  ▼
对每个 agentKind：
  subagents: merge(src,kind) → generators/subagent/<kind> → writer 写文件（覆盖）
  memory:    generators/memory → writer 写 <homedir>/<file>（存在先备份）
  skills:    generators/skill → writer 递归复制目录到 <skills根>/（覆盖）
  ▼
cli 按 agent 分组打印写入清单 + 统计
```

## 8. 错误处理

- 公司目录不存在 / 无任何制品：报错退出 1，提示可用公司。
- subagent 源缺 name/description/空 body：跳过该文件并警告，不中断。
- skill 目录缺 SKILL.md 或 frontmatter 缺 name/description：跳过并警告。
- 目标目录无写权限：捕获，打印该文件失败，继续其余；最后汇总失败数。
- 未选 agent：交互模式重问，参数模式退出 1。

## 9. 测试策略

- 产物放项目根 `temp/`（遵循全局规范）。
- 单元测试：
  - `loader`：subagent/memory/skills 三类正确加载与缺字段报错。
  - `merge`：覆盖块优先、tools 自动映射（只读/可写）。
  - subagent generators：frontmatter 结构、TOML 三引号、opencode 不含 name、zcode 仅两字段。
  - memory generator：4 家文件名正确。
  - skill generator：目录递归复制完整、内容不改。
  - `targets`：跨平台路径（含 codex 的 `~/.agents/skills`）。
  - `writer`：memory 备份逻辑（无文件/有文件/.bak 已存在）。
- 集成测试：`temp/` 下 mock homedir，跑完整流程，断言文件集合与内容。

## 10. 范围与非目标（YAGNI）

- **不做**：远端拉取、热更新字段、GUI、i18n、自动检测已装 agent、memory 智能合并（仅备份+覆盖）。
- 公司与内容随包内置；新增公司 = 在 `src/companies/` 加目录 + 发版。

## 11. 风险

- **包名 `agents` 可能已被 npm 占用**：发布前 `npm view agents` 确认；冲突则改名（`@<scope>/agents` 或加前缀）。
- **memory 覆盖风险**：已用「先备份再覆盖」缓解；CLI 输出明确标注备份路径。
- **Codex skills 目录是 `~/.agents/skills`（非 `.codex`）**：易写错，`targets.ts` 集中管理并加测试。
- **官方字段演进**：字段表集中在各 generator，便于跟随更新。
- **model 命名差异**（alias vs `provider/model-id`）：靠覆盖块显式指定，不自动转换。
