# 料力榜

料力榜是一个中文静态排行榜网站，用于展示料包测评结果。页面提供搜索、品牌筛选、排序、前三名精选卡片与移动端适配。

线上站点：[料力榜](https://liaolibang.miaoyx-cnsh.chatgpt.site/)

## 给维护者的最短路径

每次收到新 Excel 后，按以下顺序完成：

1. 将数据表放到项目根目录并命名为 `料力榜.xlsx`。
2. 生成网站数据：`uv run python scripts/build_data.py`。
3. 生成移动端包内数据：`uv run python scripts/build_data.py 料力榜.xlsx artifacts/liaolibang-minitool/data.js`。
4. 将移动端 `data.js` 改为经典脚本全局变量，并移除外部视频链接。
5. 审计 `artifacts/liaolibang-minitool/` 后，**进入该目录**再压缩其内容。
6. 对最终 ZIP 再审计，确认 ZIP 根目录直接包含 `index.html` 与 `data.js`。

完整命令见[更新数据并打包移动端资产](#更新数据并打包移动端资产)。最重要的规则是：**`data.js` 必须位于最终 ZIP 内，且与 `index.html` 同级；不能只生成在 `dist/` 或留在 ZIP 外。**

## 仓库结构

```text
.
├── dist/                         # 网站部署目录，提交到公开仓库
│   ├── index.html
│   ├── app.mjs
│   ├── data.js                   # 网站展示数据
│   └── styles.css / 图片资源
├── scripts/build_data.py         # Excel → 静态数据构建脚本
├── tests/                        # 数据构建和页面交互测试
├── docs/
│   ├── 设计文档.md
│   └── 更新打包指南.md
├── artifacts/                    # 本地移动端工作区与 ZIP，已忽略，不提交
│   └── liaolibang-minitool/
│       ├── index.html            # 离线包入口
│       ├── app.js                # 经典脚本
│       ├── styles.css
│       ├── data.js               # 必须随 ZIP 一起打包
│       └── favicon.png / crown.png
└── 料力榜.xlsx                    # 本地数据源，已忽略，不提交
```

`dist/data.js` 只供网站部署使用；`artifacts/liaolibang-minitool/data.js` 只供离线 ZIP 使用。两者都由同一份 Excel 生成，但后者必须随压缩包交付。

## 本地预览网站

将数据表放在项目根目录并命名为 `料力榜.xlsx`，然后运行：

```bash
uv run python scripts/build_data.py
python3 -m http.server 8000 --directory dist
```

访问 `http://localhost:8000`。

## 更新数据并打包移动端资产

### 1. 更新数据

将新表覆盖为根目录的 `料力榜.xlsx`，并执行：

```bash
# 网站：生成 dist/data.js，并刷新 dist/index.html 的无 JS 兜底榜单
uv run python scripts/build_data.py

# 移动端：生成必须放进 ZIP 的 artifacts/.../data.js
uv run python scripts/build_data.py \
  料力榜.xlsx \
  artifacts/liaolibang-minitool/data.js

# 离线包采用经典脚本全局变量，且不能包含外部视频链接
perl -pi -e 's/globalThis\.LIAOLI_DATA/window.LIAOLI_DATA/; s/,"video_url":"[^"]*"//g' \
  artifacts/liaolibang-minitool/data.js
```

### 2. 必做检查

```bash
UV_CACHE_DIR=/private/tmp/uv-cache uv run python -m unittest tests/test_build_data.py -v
node --test tests/app.test.mjs
node --check artifacts/liaolibang-minitool/app.js
```

### 3. 打包：不要把 `data.js` 打在外面

**正确做法：**先审计目录，再进入移动端工作目录，把其中的文件压缩到 ZIP 根目录。

```bash
# 审计打包前目录；此目录中必须有 index.html 和 data.js
python3 .codex/minitool-zip-builder/scripts/audit_artifact.py \
  artifacts/liaolibang-minitool

# 关键：压缩“目录内容”而不是目录本身
cd artifacts/liaolibang-minitool
zip -r ../liaolibang-minitool-版本号.zip . -x '*.DS_Store'
cd ../..

# 审计最终 ZIP，并检查 data.js 位于 ZIP 根目录
python3 .codex/minitool-zip-builder/scripts/audit_artifact.py \
  artifacts/liaolibang-minitool-版本号.zip
unzip -l artifacts/liaolibang-minitool-版本号.zip
```

成功时 `unzip -l` 顶层应直接列出：

```text
index.html
styles.css
app.js
data.js
favicon.png
crown.png
```

**错误做法：**下面任一方式都会造成容器无法读取数据或找不到入口，禁止使用。

```bash
# 错误：data.js 留在 ZIP 外
zip -r artifacts/liaolibang-minitool-版本号.zip dist

# 错误：ZIP 内多套一层 liaolibang-minitool/ 目录
zip -r artifacts/liaolibang-minitool-版本号.zip artifacts/liaolibang-minitool
```

离线包仅可使用包内资源，不能加载外部脚本、图片、字体或视频链接。详情见 [更新打包指南](docs/更新打包指南.md)。

## 安装移动端校验工具

本仓库不包含 `minitool-zip-builder` skill 与审计脚本。需要打包时，下载 1.8.0 版本并解压到项目根目录的 `.codex/`：

```bash
curl -L --fail -o /tmp/minitool-zip-builder-1.8.0.skill \
  https://fe-static.xhscdn.com/minitool/20261015161653/minitool-zip-builder-1.8.0.skill
mkdir -p .codex
unzip -q /tmp/minitool-zip-builder-1.8.0.skill -d .codex
```

读取 `.codex/minitool-zip-builder/SKILL.md` 后再开始打包。`.codex/`、原始 Excel 与 `artifacts/` 都已忽略，不会进入公开仓库。

## 提交与发布

提交网站更新时，提交 `dist/`、代码、测试和文档；不要提交 `料力榜.xlsx`、`.codex/` 或 `artifacts/`。

```bash
git status --short
git diff --check
```

网站发布以 `dist/` 为静态目录。移动端 ZIP 位于 `artifacts/`，上传前应在创服平台模拟器、Android 真机和 iOS 真机验证同一份 ZIP。
