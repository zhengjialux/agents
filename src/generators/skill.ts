import path from 'node:path';
import { skillsRoot } from '../targets';
import type { AgentKind, SkillSource, WriteOp } from '../types';

/** skill: 目录整体复制到各 agent skills 根；SKILL.md 内容不改。每个文件一个 WriteOp。 */
export function generateSkill(src: SkillSource, home: string, agent: AgentKind): WriteOp[] {
  const root = skillsRoot(home, agent);
  return src.files.map((f) => ({
    absPath: path.join(root, src.dirName, ...f.relPath.split('/')),
    content: f.content,
  }));
}
