# Browser Bridge 配置

> 重要：浏览器命令会复用你当前 Chrome 的登录态。运行 HunterToolsCLI 前，请先在 Chrome 中登录 LinkedIn 和 LinkedIn Recruiter。

HunterToolsCLI 默认通过 Browser Bridge 扩展和本地 daemon 连接 Chrome。这也是当前招聘工作流的标准接入方式。

## 安装扩展

### 方式 1：直接加载仓库里的 `extension/`

1. 打开 `chrome://extensions`
2. 打开右上角开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择仓库中的 `extension/` 目录

### 方式 2：加载发布包

1. 打开项目的 [Releases](https://github.com/shuizao0430/huntertools-cli/releases) 页面
2. 下载最新扩展压缩包
3. 解压到本地
4. 在 `chrome://extensions` 中加载

## 连通性验证

```bash
huntertools doctor
```

只要扩展连上，HunterToolsCLI 就可以复用你已经打开的 Chrome 标签页和 Recruiter 会话。

## 工作方式

```text
huntertools CLI <-> 本地 daemon <-> Browser Bridge 扩展 <-> Chrome 标签页
```

当浏览器命令首次运行时，daemon 会自动拉起。扩展在 Chrome 内执行页面操作，因此可以直接使用你现有的登录态。

## Daemon 生命周期

```bash
huntertools daemon status
huntertools daemon stop
huntertools daemon restart
```

默认空闲 4 小时后自动退出；如果没有 CLI 请求且扩展也未连接，就会结束。

- 首选环境变量：`HUNTERTOOLS_DAEMON_TIMEOUT`
- 兼容旧变量：`OPENCLI_DAEMON_TIMEOUT`
- 单位为毫秒
- 设为 `0` 表示永不超时
