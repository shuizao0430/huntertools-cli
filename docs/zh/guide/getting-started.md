# 快速开始

HunterToolsCLI 现在是一个面向招聘工作的 CLI，重点服务 LinkedIn 与 LinkedIn Recruiter。

## 安装

```bash
npm install -g huntertoolscli
```

## 当前产品范围

- LinkedIn 公共读取命令：`search`、`timeline`
- LinkedIn Recruiter 招聘命令：搜索候选人、读取资料、发送消息、处理 inbox、构建 follow-up queue、导出结果
- 为这些工作流保留的基础命令：`operate`、`doctor`、`daemon`、`completion`

## 快速试跑

```bash
huntertools doctor
huntertools list
huntertools linkedin people-search "technical recruiter" --location "Singapore" --limit 5
huntertools linkedin follow-up-queue --limit 5 --inbox-limit 10
```

## 浏览器前置条件

- Chrome 正在运行
- 你已经登录 `linkedin.com`
- Recruiter 命令需要现成的 LinkedIn Recruiter 登录态
- 已安装 Browser Bridge 扩展

## 自动补全

```bash
echo 'eval "$(huntertools completion zsh)"' >> ~/.zshrc
echo 'eval "$(huntertools completion bash)"' >> ~/.bashrc
echo 'huntertools completion fish | source' >> ~/.config/fish/config.fish
```

## 下一步

- [安装说明](/zh/guide/installation)
- [Browser Bridge 配置](/zh/guide/browser-bridge)
- [LinkedIn 适配器说明](/adapters/browser/linkedin)
