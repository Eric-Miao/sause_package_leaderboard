# 料力榜静态网站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从 `料力榜.xlsx` 生成并发布一个支持搜索、筛选和排序的中文静态排行榜网站。

**Architecture:** Python 标准库在构建时读取 XLSX 的 XML 内容并生成 `dist/data.js`；浏览器端原生 JavaScript 负责搜索、筛选、排序和详情展开。HTML/CSS/JS 全部直接发布到 Sites，不使用框架、数据库或运行时依赖。

**Tech Stack:** Python 标准库（通过 `uv run` 执行）、HTML、CSS、ES modules、Node.js 内置测试、Sites 静态托管

**Spec:** `docs/superpowers/specs/2026-10-06-liaolibang-site-design.md`

## Global Constraints

- 数据源固定为项目根目录的 `料力榜.xlsx`。
- 只展示品牌、料包名和评分完整且无公式错误的记录。
- 主色固定为 `#F0F0C0`、`#E08070`、`#F0E0D0`、`#F0A090`、`#101010`、`#C06060`、`#D0D0D0`。
- 首版不包含数据库、账号、后台编辑、实时同步、商品信息或虚构素材。
- 站点为中文、响应式、键盘可操作，并尊重 `prefers-reduced-motion`。
- 当前目录不是 Git 仓库；本计划不创建仓库，也不包含提交步骤。

## Review Focus

- 空白行或 `#DIV/0!` 记录：构建时跳过，页面不出现空卡片。
- 相同总分：以期数数字升序稳定决定名次，避免刷新后顺序变化。
- 中文与大小写混合搜索：品牌、料包和评语均能匹配。
- 零条筛选结果：显示结果数、空状态和可用的清除筛选按钮。
- 窄屏与减少动态偏好：无横向溢出，位移动画关闭。

---

## File Map

- `scripts/build_data.py`：读取 XLSX、清洗有效记录并生成浏览器数据。
- `tests/test_build_data.py`：验证字段读取、日期转换、错误行过滤和稳定排序输入。
- `dist/data.js`：自动生成的榜单数据，暴露为 `globalThis.LIAOLI_DATA`。
- `dist/index.html`：语义化页面骨架、首屏、控件、榜单和空状态。
- `dist/styles.css`：温柔料理奖台视觉、响应式布局、焦点与减少动态规则。
- `dist/app.mjs`：纯数据操作函数和浏览器渲染、交互绑定。
- `tests/app.test.mjs`：验证搜索、品牌筛选、排序和重置行为。
- `.openai/hosting.json`：Sites 静态目录配置。

### Task 1: Excel 数据构建器

**Files:**
- Create: `scripts/build_data.py`
- Create: `tests/test_build_data.py`
- Create: `dist/data.js`

**Interfaces:**
- Consumes: `料力榜.xlsx`
- Produces: `extract_records(path: Path) -> list[dict]`、`write_data(records: list[dict], output: Path) -> None`，以及 `globalThis.LIAOLI_DATA = [...]`

- [ ] **Step 1: 写失败测试**

在临时目录生成最小 XLSX ZIP fixture，断言有效记录字段完整、Excel 日期转为 `YYYY-MM-DD`、分数保留原始数值、空白与错误记录被过滤，并断言同分记录保留期数顺序。

- [ ] **Step 2: 验证测试失败**

Run: `UV_CACHE_DIR=/private/tmp/uv-cache uv run python -m unittest tests/test_build_data.py -v`

Expected: FAIL，原因是 `scripts.build_data` 尚不存在。

- [ ] **Step 3: 实现最小构建器**

在 `scripts/build_data.py` 使用 `zipfile` 与 `xml.etree.ElementTree` 读取 workbook、关系、shared strings 和首个非空 worksheet；实现上述两个接口。命令行默认从 `料力榜.xlsx` 写入 `dist/data.js`。

- [ ] **Step 4: 运行测试并生成真实数据**

Run: `UV_CACHE_DIR=/private/tmp/uv-cache uv run python -m unittest tests/test_build_data.py -v`

Expected: PASS。

Run: `UV_CACHE_DIR=/private/tmp/uv-cache uv run python scripts/build_data.py`

Expected: `dist/data.js` 包含全部有效记录，不含空白待评测行。

### Task 2: 排行榜界面与交互

**Files:**
- Create: `dist/index.html`
- Create: `dist/styles.css`
- Create: `dist/app.mjs`
- Create: `tests/app.test.mjs`

**Interfaces:**
- Consumes: `globalThis.LIAOLI_DATA`
- Produces: `queryRecords(records, {query, brand, sortKey, direction}) -> record[]` 与完整排行榜页面

- [ ] **Step 1: 写失败测试**

用 Node 内置测试断言：中文搜索覆盖品牌、料包和评语；品牌筛选可与搜索组合；五种排序键和升降序正确；同分按期数稳定排序；清空条件返回全部记录。

- [ ] **Step 2: 验证测试失败**

Run: `node --test tests/app.test.mjs`

Expected: FAIL，原因是 `dist/app.mjs` 尚不存在。

- [ ] **Step 3: 实现纯数据函数和页面渲染**

在 `dist/app.mjs` 导出 `queryRecords`，绑定搜索、品牌胶囊、排序和升降序控件；渲染前三名奖台、结果数量、可展开榜单与空状态。使用原生 `details/summary` 保持键盘可用。

- [ ] **Step 4: 实现页面骨架和视觉**

在 `dist/index.html` 加入跳至内容链接、标题、统计、奖台、标记清晰的表单控件和榜单容器。在 `dist/styles.css` 实现指定色板、大圆弧、桌面奖台、手机单列、可见焦点、触控尺寸和 `prefers-reduced-motion`。

- [ ] **Step 5: 运行逻辑和静态检查**

Run: `node --test tests/app.test.mjs`

Expected: PASS。

Run: `rg -n "overflow-x|prefers-reduced-motion|:focus-visible|aria-live|<label" dist`

Expected: 对应规则与语义标记全部存在。

### Task 3: 视觉验收与 Sites 发布

**Files:**
- Create: `.openai/hosting.json`
- Create: `.impeccable/review/desktop.png`
- Create: `.impeccable/review/mobile.png`

**Interfaces:**
- Consumes: 完整 `dist/` 静态站
- Produces: 私有 Sites 预览 URL

- [ ] **Step 1: 配置静态托管**

创建 `.openai/hosting.json`，将静态目录设为 `dist`；Sites 创建后写入返回的 `project_id`。

- [ ] **Step 2: 本地预览并截图检查**

按 Sites 本地预览规范启动静态站，同时截取桌面与手机视口。检查首屏层级、前三名顺序、搜索/筛选/排序、详情展开、空状态、键盘焦点和横向溢出。

- [ ] **Step 3: 运行 Impeccable 棒检测与终审**

Run: `/Users/eric/.agents/skills/impeccable/scripts/impeccable detect --json dist/index.html dist/styles.css dist/app.mjs`

Expected: 无未处理的机械设计问题。将截图、设计方向、规范和检测结果交给 finish reviewer；只修复其列出的实质问题并按限定轮次复验。

- [ ] **Step 4: 发布私有预览站**

使用 Sites 源码工作流打包 `dist/`，保存版本并部署为 private。

Expected: 部署返回成功状态和可访问 URL。

- [ ] **Step 5: 记录完成后的设计系统**

由 Impeccable documenter 生成 `DESIGN.md` 与 `.impeccable/design.json`，记录最终色板、字体、间距、圆角、控件和响应式规则。

## Self-review

- 规范中的数据、视觉、交互、状态、可访问性、响应式和发布要求均有对应任务。
- 数据提取与界面逻辑接口一致；页面只读取 `globalThis.LIAOLI_DATA`。
- 五个高风险输入均在 Task 1、Task 2 或 Task 3 中有明确测试或检查。
- 未加入数据库、框架、图片资产、后台或未请求的功能。
