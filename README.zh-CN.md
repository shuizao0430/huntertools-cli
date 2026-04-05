# HunterToolsCLI

一个面向招聘工作的浏览器自动化 CLI，聚焦 LinkedIn 与 LinkedIn Recruiter。

HunterToolsCLI 现在是一个独立维护的招聘运营工具，核心围绕四条工作流：

- 搜索候选人
- 读取候选人资料
- 单发和批量触达
- inbox 跟进、优先级排序与导出

默认主命令是 `huntertools`，迁移期内仍兼容 `opencli` 别名。

## 为什么是 HunterToolsCLI

- 产品表面已经收口到招聘工作流
- 面向真实 Chrome 会话，而不是只做静态 API 包装
- 覆盖 Recruiter 搜索、资料读取、发信、收件箱、follow-up 和导出
- 输出结果适合继续流向 ATS 和表格

## 安装

```bash
npm install -g huntertoolscli
```

## 快速开始

```bash
huntertools doctor
huntertools list
huntertools linkedin people-search "technical recruiter" --location "Singapore" --limit 5
huntertools linkedin profile --profile-url "https://www.linkedin.com/talent/profile/..."
huntertools linkedin follow-up-queue --limit 5 --inbox-limit 10 -f json
```

## 命令范围

顶层保留命令：

- `huntertools list`
- `huntertools operate`
- `huntertools doctor`
- `huntertools daemon`
- `huntertools completion`

LinkedIn 工作流：

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

## 浏览器前置条件

- Chrome 正在运行
- 你已经登录 `linkedin.com`
- Recruiter 工作流需要现成的 LinkedIn Recruiter 登录态
- 已安装 Browser Bridge 扩展

## 首个独立版本

首个独立版本的说明在这里：[RELEASE-v1.6.1.md](./RELEASE-v1.6.1.md)

重点包括：

- 从 OpenCLI 独立为 HunterToolsCLI
- 公开产品面收口到招聘工作流
- 保留经过真实生产验证的 LinkedIn / Recruiter 能力
- 在必要处继续保留兼容层，避免打断迁移

## 文档

- 英文文档：[docs](./docs)
- 快速开始：[docs/guide/getting-started.md](./docs/guide/getting-started.md)
- LinkedIn 说明页：[docs/adapters/browser/linkedin.md](./docs/adapters/browser/linkedin.md)
- 发版清单：[docs/developer/releasing.md](./docs/developer/releasing.md)

## 本地开发

```bash
npm install
npm run build
node dist/main.js list
```

## License

[Apache-2.0](./LICENSE)
