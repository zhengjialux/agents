---
name: frontend-project-create
description: 规范使用脚手架工具创建前端项目，包含微前端主应用、子应用的配置信息说明，通信说明、依赖资源说明
---

## 项目搭建

使用 Umi Max 4 脚手架来初始化项目

创建命令三选一：`pnpm dlx create-umi@latest`、`yarn create umi`、`npx create-umi@latest`

选项：React + Typescript + Ant Design Pro

### 目录结构说明

## 微前端配置

### 主应用

#### 创建 micro-apps.js

配置子应用引用地址，文件放到 config 目录下，跟config.js同级。

**属性说明：**

- name：子应用的名字，要跟子应用 package.json 对应
- dev：本地开发的子应用地址，多个子应用的端口从8001开始叠加
- prod：部署线上的子应用地址

**示例：**
`module.exports = [
  {
    name: 'slave-app1',
    dev: '//localhost:8001',
    prod: '/child/slave-app1/',
  },
  {
    name: 'slave-app2',
    dev: '//localhost:8002',
    prod: '/child/slave-app2/',
  },
];`

#### 导入 micro-apps.js

在 config/config.js 配置中添加配置项

**模板：**
`
const microApps = require('./micro-apps');

// 开启微前端，主应用加载子应用
qiankun: {
master: {
apps: microApps.map((app) => ({
name: app.name,
entry: app[process.env.UMI_ENV || 'dev'],
})),
},
}
`

#### 配置子应用触发路由

修改 config/rules.ts 路由配置文件，添加子应用触发前缀。

**示例：**
`
{
path: "/agent/\*", // 指定触发子应用的前缀
name: "Agent 子应用",
component: "@/layouts/BasicLayout", // 可选，使用主应用布局包裹
microApp: "flexitdl-portal-app", // 指定子应用
}

#### 脚本命令修改

修改 package.json 的 scripts 命令。

- `npm run dev`：本地开发 `cross-env UMI_ENV=dev max dev`
- `npm run build`：生产构建 `cross-env UMI_ENV=prod max build`

### 子应用

在 config/config.js 配置中添加配置项

**模板：**
`// 开启微前端，作为子应用
qiankun: {
  slave: {}
}`
