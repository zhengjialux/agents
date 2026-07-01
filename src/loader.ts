import fs from 'node:fs';
import path from 'node:path';
import { splitFrontmatter } from './frontmatter';
import type {
  AgentKind, Company, MemorySource, SkillFile, SkillSource, SubagentSource,
} from './types';

const OVERRIDE_KEYS: AgentKind[] = ['claude', 'codex', 'opencode', 'zcode'];

/** 列出 pkgRoot 下 companies 目录的公司名（排序） */
export function listCompanyNames(pkgRoot: string): string[] {
  const dir = path.join(pkgRoot, 'companies');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** 加载一家公司。pkgRoot 为包含 companies/ 的目录。 */
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

/** 加载 subagents 目录下所有 .md 文件 */
function loadSubagents(companyDir: string): SubagentSource[] {
  const subDir = path.join(companyDir, 'subagents');
  if (!fs.existsSync(subDir)) return [];
  const out: SubagentSource[] = [];
  for (const f of fs.readdirSync(subDir).filter((x) => x.endsWith('.md')).sort()) {
    const raw = fs.readFileSync(path.join(subDir, f), 'utf8');
    const { attrs, body } = splitFrontmatter(raw);
    // 校验必填字段：缺则跳过该文件并警告，不中断整体（与 skill 一致，spec 8）
    if (!attrs.name || typeof attrs.name !== 'string') {
      console.warn(`[agents] 跳过 subagent（缺 name）: ${f}`);
      continue;
    }
    if (!attrs.description || typeof attrs.description !== 'string') {
      console.warn(`[agents] 跳过 subagent（缺 description）: ${f}`);
      continue;
    }
    if (!body.trim()) {
      console.warn(`[agents] 跳过 subagent（正文为空）: ${f}`);
      continue;
    }
    // 拆分共享字段与按 agent 覆盖块
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

/** 加载 memory.md（可选） */
function loadMemory(companyDir: string): MemorySource | undefined {
  const p = path.join(companyDir, 'memory.md');
  if (!fs.existsSync(p)) return undefined;
  return { kind: 'memory', body: fs.readFileSync(p, 'utf8') };
}

/** 加载 skills 目录下所有 skill（每个含 SKILL.md 的子目录） */
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
      dirName: d.name,
      name: String(attrs.name),
      description: String(attrs.description),
      files,
    });
  }
  return out;
}

/** 递归收集目录下所有文件的相对路径与内容 */
function walkFiles(absBase: string, relBase: string, acc: SkillFile[]): void {
  for (const entry of fs.readdirSync(absBase, { withFileTypes: true })) {
    const rel = relBase ? path.join(relBase, entry.name) : entry.name;
    const abs = path.join(absBase, entry.name);
    if (entry.isDirectory()) {
      walkFiles(abs, rel, acc);
    } else if (entry.isFile()) {
      // 统一用正斜杠作为 relPath，跨平台一致
      acc.push({ relPath: rel.split(path.sep).join('/'), content: fs.readFileSync(abs, 'utf8') });
    }
  }
}
