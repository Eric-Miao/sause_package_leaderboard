# 料力榜维护约束

## 数据与移动端离线包

- `料力榜.xlsx` 是本地私有数据源，不能提交到公开仓库。
- 每次更新数据必须同时生成 `dist/data.js` 和 `artifacts/liaolibang-minitool/data.js`。
- 移动端离线 ZIP 的唯一输入目录是 `artifacts/liaolibang-minitool/`。
- **不可省略：`artifacts/liaolibang-minitool/data.js` 必须存在，并与 `index.html` 同级后再打包。**
- 正确打包方式是在该目录内执行 `zip -r ../liaolibang-minitool-版本号.zip . -x '*.DS_Store'`；禁止压缩目录本身，也禁止只压缩 `dist/`。
- 打包后运行 `unzip -l`；输出必须在 ZIP 根目录直接列出 `index.html` 与 `data.js`。
- `artifacts/`、`.codex/` 和最终 ZIP 不提交到公开仓库。

完整步骤见 `README.md` 与 `docs/更新打包指南.md`。
