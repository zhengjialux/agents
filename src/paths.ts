import path from 'node:path';

/**
 * 解析包内 companies 目录的绝对路径。
 * - 编译产物（dist/xxx.js）：__dirname=dist，包根=上一级
 * - 测试/开发（src/xxx.ts 经 tsx）：__dirname=src，包根=上一级
 * 两种情况下 companies 都在 包根/src/companies。
 */
export function resolveCompaniesRoot(): string {
  const here = __dirname;
  const pkgRoot = path.resolve(here, '..');
  return path.join(pkgRoot, 'src', 'companies');
}
