# Security Policy

## 安装器安全模型

- 安装器只从本仓库的固定 `main` 分支读取 `catalog.json`、`pet.json` 和 `spritesheet.webp`。
- 每个下载文件都必须匹配目录中记录的 SHA-256 与字节数。
- 宠物目录中的任何代码都不会被执行。
- 安装目标固定在当前用户的 `.codex/pets/<pet-id>` 下。
- 已存在的同 ID 宠物会先复制到带时间戳的备份目录。

发现漏洞时，请通过仓库的 Security Advisory 私下报告，不要先建立公开 Issue。
