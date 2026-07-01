#!/usr/bin/env node
import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import { generate, listCompanies } from './index';
import { resolveCompaniesRoot } from './paths';
import { promptCompany, promptAgents, parseAgents } from './prompts';
import { loadCompany } from './loader';

// companiesRoot 在 <pkgRoot>/src/companies；回退两级得到包根
const companiesRoot = resolveCompaniesRoot();
const pkgRoot = path.resolve(companiesRoot, '..', '..');

const program = new Command();
program
  .name('agents')
  .description('组装 claude code / codex / opencode / zcode 的 subagents / memory / skills 配置')
  .option('-c, --company <name>', '公司名（跳过公司选择）')
  .option('-a, --agents <list>', 'agent 种类，逗号分隔（跳过选择）')
  .option('-l, --list', '列出可用公司与制品清单')
  .option('-n, --dry-run', '只打印将写入的路径，不写盘')
  .action(async (opts) => {
    try {
      if (opts.list) {
        runList();
        return;
      }
      await runGenerate(opts);
    } catch (e) {
      console.error(chalk.red(e instanceof Error ? e.message : String(e)));
      process.exit(1);
    }
  })
  .parse();

function runList(): void {
  for (const c of listCompanies(pkgRoot)) {
    const company = loadCompany(c, path.join(pkgRoot, 'src'));
    console.log(chalk.bold(c));
    console.log(`  subagents: ${company.subagents.map((s) => s.name).join(', ') || '(无)'}`);
    console.log(`  memory:    ${company.memory ? '有' : '无'}`);
    console.log(`  skills:    ${company.skills.map((s) => s.name).join(', ') || '(无)'}`);
  }
}

async function runGenerate(opts: { company?: string; agents?: string; dryRun?: boolean }): Promise<void> {
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
