# micro-agents

按公司内置 subagents / 全局记忆 / skills，运行 `npx agents` 选择公司与本机已装的 agent（claude code / codex / opencode / zcode），自动生成对应格式到各 agent 的用户级全局目录。

同一份「主体（body）」+ 各 agent 的「元数据」会被拼成不同格式，避免为每个 agent 重复维护配置。

## 安装

```bash
npm install -g agents
# 或一次性执行（无需全局安装）
npx agents
```

## 使用

```bash
agents                                      # 交互：选公司 → 勾选 agent → 生成
agents --list                               # 列出可用公司及其制品清单
agents --company shuxin --agents claude,codex   # 非交互直接生成
agents --dry-run                            # 只打印将写入的路径，不写盘
```

交互模式下：先**单选公司**，再**多选勾选**本机已安装的 agent（claude code / codex / opencode / zcode），回车后批量生成。

## 生成目标

| Agent       | subagents                        | 全局记忆                       | skills                              |
| ----------- | -------------------------------- | ------------------------------ | ----------------------------------- |
| claude code | `~/.claude/agents/*.md`          | `~/.claude/CLAUDE.md`          | `~/.claude/skills/<name>/`          |
| codex       | `~/.codex/agents/*.toml`         | `~/.codex/AGENTS.md`           | `~/.agents/skills/<name>/`          |
| opencode    | `~/.config/opencode/agents/*.md` | `~/.config/opencode/AGENTS.md` | `~/.config/opencode/skills/<name>/` |
| zcode       | `~/.zcode/agents/*.md`           | `~/.zcode/AGENTS.md`           | `~/.zcode/skills/<name>/`           |

> ⚠️ codex 的 skills 在 `~/.agents/skills/`（不是 `.codex`）。

**覆盖策略**：subagents 与 skills 文件已存在则直接覆盖；**全局记忆文件（CLAUDE.md / AGENTS.md）覆盖前会自动备份**为 `.bak`（若 `.bak` 已存在则递增 `.bak.1`、`.bak.2`），并在输出中标注备份路径。

## 内置公司

- **shuxin**：
  - subagents：`code-reviewer`、`docs-reviewer`、`agent-teams-orchestrator`
  - 全局记忆：前端工程规范（Umi Max 4 + React 19 + TS + Ant Design 6）
  - skills：`frontend-project-create`、`skill-generation`

## 源格式（新增 / 维护公司内容）

公司内容位于 `src/companies/<公司>/`：

```
src/companies/<公司>/
├─ subagents/<name>.md     # 统一 frontmatter + body
├─ memory.md               # 全局指令正文（纯 Markdown）
└─ skills/<name>/SKILL.md  # 一个 skill 一个目录（可含附带文件）
```

### subagent 源 frontmatter

```yaml
---
name: code-reviewer
description: <可多行描述>
# 共享字段（所有 agent 继承，除非被覆盖）
model: sonnet
tools: [Read, Grep, Glob, Bash]
# 按 agent 的覆盖块
claude:
  color: cyan
  memory: user
codex:
  model: gpt-5.4
  sandbox_mode: read-only # 不写则由 tools 自动推导
opencode:
  model: anthropic/claude-sonnet-4-6
  mode: subagent # 默认即 subagent
  permission:
    edit: deny # 不写则由 tools 自动推导
zcode: {} # 仅用 name + description
---
<系统提示词主体，所有 agent 共用>
```

**tools 自动映射**：当未显式指定时，按 tools 是否含写工具（`Edit`/`Write`/`apply_patch`）推导 ——
codex `sandbox_mode`（`workspace-write` / `read-only`）、opencode `permission.edit`（`allow` / `deny`）；claude 原样输出 tools；zcode 忽略 tools。

### skills

每个 skill 是 `skills/<name>/` 目录，必含 `SKILL.md`（frontmatter `name` + `description` + body），可含任意附带文件。**输出文件夹名取自源目录名**（跨工具的 skill 身份），SKILL.md 内容原样复制。

## 开发

```bash
npm install          # 安装依赖
npm test             # 运行单元测试（vitest）
npm run build        # 编译到 dist/
node dist/cli.js --list
```

技术栈：Node.js ≥ 18 + TypeScript（CommonJS）。依赖：`@inquirer/prompts`、`js-yaml`、`smol-toml`、`commander`、`chalk`。
