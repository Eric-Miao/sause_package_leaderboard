# 料力榜

一个中文静态排行榜网站，用于展示料包测评结果。页面提供搜索、品牌筛选、表头排序、前三名精选卡片与移动端适配。

线上站点：[料力榜](https://liaolibang.miaoyx-cnsh.chatgpt.site/)

## 仓库内容

- `dist/`：可直接部署的静态页面资源。
- `scripts/build_data.py`：从本地 Excel 生成网页数据的脚本。
- `tests/`：数据构建和页面交互测试。
- `docs/设计文档.md`：产品、视觉与交互设计说明。
- `docs/更新打包指南.md`：更新表格、生成网页与制作离线包的操作步骤。

## 本地预览

无需安装前端依赖。将本地数据表放在项目根目录并命名为 `料力榜.xlsx`，再运行：

```bash
uv run python scripts/build_data.py
python3 -m http.server 8000 --directory dist
```

随后访问 `http://localhost:8000`。

## 数据与发布原则

测评 Excel 原始数据及离线包压缩文件不会提交到此公开仓库。网页展示所需的静态数据会在构建时写入 `dist/data.js`，以便站点可以独立部署。

详细更新步骤见 [更新打包指南](docs/更新打包指南.md)。
