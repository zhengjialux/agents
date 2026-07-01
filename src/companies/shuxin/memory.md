# 前端开发规范

技术栈：Umi Max 4 + React 19 + TS + Ant Design 6

## 代码生成规则

所有的项目都要遵守这些规则

- `src/commonComponents/` 是 git submodule，**只读**，禁止改动；自定义组件统一放 `src/components/`。
- 工具函数放到 `src/utils`
- 字典常量映射放到 `src/constants`
- 涉及项目依赖不要安装，我会手动安装
- 改动不要提交，我会评审后手动提交
- 代码改动不涉及 .gitignore 内描述的文件夹及文件
- 文件读取不涉及 .gitignore 内描述的文件夹及文件
- 代码的注释要标注清楚
- 测试文件归纳到根目录的 `tests` 目录下
- 测试后的产物放根目录的 `temp` 目录下
- 所有对话都使用中文

## 目录结构

` ├─ config/                                   # UmiJS 配置层
  │  ├─ README.md
  │  ├─ config.dev.js                          # 开发环境覆盖配置
  │  ├─ config.prod.js                         # 生产环境覆盖配置
  │  ├─ config.js                              # 主配置（汇总）
  │  ├─ defaultSettings.js                     # antd-pro 默认设置
  │  ├─ micro-apps.js                          # ★ 主应用才有，qiankun 子应用注册表（dev/prod entry）
  │  ├─ proxyConfig.js                         # 本地代理
  │  └─ routes.js                              # ★ 路由表（path → Layout → microApp）
  ├─ mock/                                     # 本地 mock
  │  ├─ menuAPI.ts
  │  └─ userAPI.ts
  ├─ public/                                   # 静态资源（不经 webpack 打包）
  │  ├─ config.js                              # 运行时配置
  │  ├─ favicon.ico
  │  ├─ flexitdl-portal-sdk.js                 # ★ 全局 SDK，plugin.ts 注入到 window
  │  ├─ icons/                                 # logo、背景图
  │  │  ├─ converted-image.svg
  │  │  ├─ default-bg.svg
  │  │  ├─ logo-simplify.png
  │  │  └─ logo.png
  │  └─ static/
  │     ├─ ckeditor.js                         # 富文本编辑器
  │     └─ content-styles.css
  ├─ src/
  │  ├─ access.ts                              # umi access 权限定义
  │  ├─ app.ts                                 # ★ 运行时入口：useQiankunStateForSlave 等
  │  ├─ global.less                            # 全局样式
  │  ├─ assets/                                # 静态资源（打包入口）
  │  │  └─ .gitkeep
  │  ├─ commonComponents/                      # ★ git submodule：跨应用共享 UI 组件库
  │  ├─ components/                            # 主应用本地组件
  │  ├─ constants/
  │  │  └─ index.ts
  │  ├─ layouts/
  │  │  └─ MainLayout.tsx                      # 主布局
  │  ├─ locales/                               # i18n
  │  │  ├─ en-US.js
  │  │  └─ zh-CN.js
  │  ├─ models/                                # umi model
  │  │  └─ global.ts                           # ★ 全局共享状态（用户上下文等）
  │  ├─ pages/                                 # 主应用页面（当前为空，业务都在子应用）
  │  ├─ services/                              # 业务接口封装
  │  └─ utils/                                 # 工具
  ├─ plugin.ts                                 # ★ umi plugin：把 public/flexitdl-portal-sdk.js 注入 window
  ├─ package.json
  ├─ pnpm-lock.yaml
  ├─ pnpm-workspace.yaml
  ├─ yarn.lock
  ├─ tsconfig.json
  ├─ typings.d.ts
  ├─ verify-structure.ps1                      # 结构校验脚本
  ├─ .env                                      # 环境变量配置，例如：PORT=8000
  ├─ .eslintrc.js
  ├─ .gitignore
  ├─ .gitmodules                               # submodule: src/commonComponents
  ├─ .lintstagedrc
  ├─ .npmrc
  ├─ .prettierignore
  ├─ .prettierrc
  ├─ .stylelintrc.js
  └─ README.md`

## 项目命令

- `npm run dev`：本地开发
- `npm run build`：生产构建

## 强制规则

以下任务默认视为复杂任务，应优先使用专业 Subagent 进行分析：

- 实现新功能
- 重构代码
- 大范围修改
- Code Review
- 调试复杂 Bug
- 文档更新
- 涉及多个模块的修改

根据任务特点主动选择一个或多个 Subagent，例如：

- code-reviewer：负责代码质量、规范和可维护性评审。
- docs-reviewer：负责 README、CLAUDE.md、API 文档等项目文档评审。
- agent-teams：负责复杂任务分析、拆解和协作建议。

如果某项任务没有对应的专业 Subagent，则由主 Agent 自行完成分析和处理。

除非任务非常简单（如修改一行代码、修复错别字、回答简单问题），否则不要独立完成，应优先调用合适的专业 Subagent。
