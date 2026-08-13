# Codex Pet Market

一个由社区维护的 Codex v2 动态宠物目录。每只宠物都经过结构校验；安装器只下载数据文件，不执行投稿目录中的任何代码。

## 一键安装

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/zhengjiazhi929-commits/codex-pet-market/main/installers/install.sh | bash
```

安装指定宠物：

```bash
curl -fsSL https://raw.githubusercontent.com/zhengjiazhi929-commits/codex-pet-market/main/installers/install.sh | bash -s -- baiyao-mecha
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/zhengjiazhi929-commits/codex-pet-market/main/installers/install.ps1 | iex
```

安装指定宠物：

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/zhengjiazhi929-commits/codex-pet-market/main/installers/install.ps1))) -PetId baiyao-mecha
```

安装器会显示目录、校验 SHA-256、备份同 ID 的旧宠物，再写入用户目录中的 `.codex/pets/<pet-id>`。

## 宠物预览

以下内容由 `npm run catalog` 根据 `pets/` 自动生成。新增宠物时必须提供多帧动态 `preview.gif`，并在宠物详情页直接展示。

<!-- PET_PREVIEWS:START -->
### [白曜机甲](pets/baiyao-mecha/README.md)

一只沉稳克制的原创白色 AI 机甲；所有动作均保持机器人形态。

[![白曜机甲动态预览](pets/baiyao-mecha/preview.gif)](pets/baiyao-mecha/README.md)

[查看白曜机甲详情](pets/baiyao-mecha/README.md)

### [橘慢慢](pets/ju-manman/README.md)

一只始终慵懒淡定、动作很少、头顶小橘子、穿蓝星小裤衩的黄色河马搭档。

[![橘慢慢动态预览](pets/ju-manman/preview.gif)](pets/ju-manman/README.md)

[查看橘慢慢详情](pets/ju-manman/README.md)

### [奶豆](pets/naidou/README.md)

一颗困倦迷糊、总爱歪头发呆的奶白色短绒小豆子。

[![奶豆动态预览](pets/naidou/preview.gif)](pets/naidou/README.md)

[查看奶豆详情](pets/naidou/README.md)
<!-- PET_PREVIEWS:END -->

## 投稿

阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。每个 PR 只新增或更新一个 `pets/<pet-id>/` 目录。提交前运行 `npm run check`，它会验证配置、图集尺寸、透明度、哈希值、许可证和禁止文件。GitHub 自动检查将在仓库工作流权限完成配置后启用。

## 许可证

- 安装器、验证脚本、预备 CI 配置与仓库文档：MIT。
- 每只宠物的美术素材：以其目录内 `LICENSE-ASSETS.md` 为准；首只宠物采用 CC BY 4.0。

本项目与 OpenAI、Codex 及任何汽车品牌均无关联，也未获得其赞助或背书。Codex 的宠物文件格式可能随应用更新而变化。
