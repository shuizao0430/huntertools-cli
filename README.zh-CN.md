# HunterToolsCLI

一个面向招聘工作的浏览器自动化 CLI，聚焦 LinkedIn 与 LinkedIn Recruiter。

这个 fork 正在从旧的 OpenCLI 形态收口成一个更专注的招聘运营工具。当前公开支持的主线能力是：

- 搜索候选人
- 读取候选人资料
- 单发和批量触达
- inbox 跟进
- follow-up queue 排序
- ATS / 表格导出

默认主命令是 `huntertools`，迁移期内仍兼容 `opencli` 别名。

## 安装

```bash
npm install -g huntertoolscli
```

## 核心命令

顶层保留命令：

- `huntertools list`
- `huntertools operate`
- `huntertools doctor`
- `huntertools daemon`
- `huntertools completion`

LinkedIn 命令组：

- `search`
- `timeline`
- `people-search`
- `profile`
- `recruiter-project-list`
- `recruiter-project-members`
- `recruiter-saved-searches`
- `message`
- `save-to-project`
- `tag`
- `notes`
- `batch-message`
- `inbox-list`
- `inbox-msg`
- `inbox-reply`
- `batch-reply`
- `stats`
- `follow-up-queue`
- `follow-up-batch-reply`
- `export-follow-up`

## 快速开始

```bash
huntertools doctor
huntertools list
huntertools linkedin people-search "technical recruiter" --location "Singapore" --limit 5
huntertools linkedin follow-up-queue --limit 5 --inbox-limit 10
```

## 浏览器前置条件

- Chrome 正在运行
- 你已经登录 `linkedin.com`
- Recruiter 工作流需要现成的 LinkedIn Recruiter 登录态
- 已安装 Browser Bridge 扩展

## 项目方向

- 第一阶段：完成 HunterToolsCLI 改名并保留兼容别名
- 第二阶段：把公开 CLI 表面收口到招聘工作流
- 第三阶段：物理清理仓库里的非招聘适配器和旧文档

## 文档

- 英文文档：[docs](./docs)
- LinkedIn 说明页：[docs/adapters/browser/linkedin.md](./docs/adapters/browser/linkedin.md)

## 本地开发

```bash
npm install
npm run build
node dist/main.js list
```

## License

[Apache-2.0](./LICENSE)
