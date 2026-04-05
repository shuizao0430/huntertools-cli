# 安装

## 前置要求

- Node.js >= 20.0.0
- Chrome 正在运行，且已登录 LinkedIn
- 使用 Recruiter 命令时，需要可用的 LinkedIn Recruiter 权限

## 通过 npm 安装

```bash
npm install -g huntertoolscli
```

## 从源码安装

```bash
git clone git@github.com:shuizao0430/huntertools-cli.git HunterToolsCLI
cd HunterToolsCLI
npm install
npm run build
npm link
huntertools list
```

## 更新

```bash
npm install -g huntertoolscli@latest
```

## 验证安装

```bash
huntertools --version
huntertools list
huntertools doctor
```
