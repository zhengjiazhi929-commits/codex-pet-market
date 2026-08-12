# 投稿指南

感谢向 Codex Pet Market 投稿。为保护安装用户，每个宠物目录只允许声明式数据与媒体，不允许脚本或可执行文件。

## 目录结构

```text
pets/<pet-id>/
├── pet.json
├── market.json
├── spritesheet.webp
├── preview.gif
├── README.md
└── LICENSE-ASSETS.md
```

`pet-id` 只能使用小写英文字母、数字和连字符，并且必须与 `pet.json`、`market.json` 中的 ID 完全一致。

## 必须满足

- `pet.json` 的 `spriteVersionNumber` 必须为 `2`。
- `spritesheet.webp` 必须是 `1536 × 2288`、带透明通道的 WebP 图集。
- 图集必须遵循 8 列 × 11 行、单格 `192 × 208` 的 Codex v2 结构。
- `market.json` 必须填写作者、素材许可证、文件大小与 SHA-256。
- 投稿者必须拥有发布素材所需的权利；不得使用未经授权的商标、角色、人物肖像或版权素材。
- 预览应真实反映宠物，不得包含误导性文字或外链跟踪内容。
- 单只宠物的全部文件总计不得超过 15 MiB；图集不得超过 8 MiB。

## 禁止内容

宠物目录内禁止软链接、隐藏文件、脚本、可执行文件、压缩包、HTML、快捷方式、安装器，以及 `pet.json` 中除 `spritesheet.webp` 以外的路径引用。

## PR 流程

1. Fork 仓库并创建分支 `pet/<pet-id>`。
2. 每个 PR 只新增或更新一只宠物。
3. 运行 `npm run catalog` 与 `npm run validate`。
4. 提交生成后的 `catalog.json`。
5. 创建 PR，填写模板中的权利声明和测试结果。

维护者会根据结构、安全性、视觉完整性与许可证清晰度进行审核。自动检查通过不代表一定合并。
