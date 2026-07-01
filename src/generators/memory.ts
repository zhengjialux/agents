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
