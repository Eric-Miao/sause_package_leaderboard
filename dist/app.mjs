const episodeNumber = (value = "") => Number.parseInt(String(value).replace(/\D/g, ""), 10) || Number.MAX_SAFE_INTEGER;

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function queryRecords(records, options = {}) {
  const query = (options.query || "").trim().toLocaleLowerCase("zh-CN");
  const brand = options.brand || "";
  const sortKey = options.sortKey || "score";
  const direction = options.direction || "desc";

  return records
    .filter((record) => !brand || record.brand === brand)
    .filter((record) => {
      if (!query) return true;
      return [record.brand, record.name, record.comment]
        .some((value) => String(value || "").toLocaleLowerCase("zh-CN").includes(query));
    })
    .sort((left, right) => {
      const leftValue = sortKey === "episode" ? episodeNumber(left.episode) : left[sortKey];
      const rightValue = sortKey === "episode" ? episodeNumber(right.episode) : right[sortKey];
      const difference = direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
      return difference || episodeNumber(left.episode) - episodeNumber(right.episode);
    });
}

const formatScore = (value) => Number(value).toFixed(1);
const formatDate = (value) => new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "long", day: "numeric",
}).format(new Date(`${value}T00:00:00`));

function scoreBreakdown(record) {
  return `
    <dl class="score-breakdown">
      <div><dt>色香味</dt><dd>${formatScore(record.flavor)}</dd></div>
      <div><dt>还原度</dt><dd>${formatScore(record.fidelity)}</dd></div>
      <div><dt>易用性</dt><dd>${formatScore(record.ease)}</dd></div>
    </dl>`;
}

function podiumCard(record, rank) {
  if (!record) return "";
  return `
    <article class="podium-card podium-card--${rank}">
      <div class="rank-medallion" aria-label="第 ${rank} 名"><span>${rank}</span></div>
      <div class="podium-copy">
        <p class="brand-name">${escapeHtml(record.brand)}</p>
        <h2>${escapeHtml(record.name)}</h2>
        <p class="podium-comment">${escapeHtml(record.comment)}</p>
      </div>
      <div class="hero-score"><strong>${formatScore(record.score)}</strong><span>料力评分</span></div>
      ${scoreBreakdown(record)}
    </article>`;
}

function listItem(record, rank) {
  return `
    <details class="rank-row">
      <summary>
        <span class="list-rank" aria-label="第 ${rank} 名">${String(rank).padStart(2, "0")}</span>
        <span class="list-identity"><small>${escapeHtml(record.brand)}</small><strong>${escapeHtml(record.name)}</strong></span>
        <span class="mini-score"><small>色香味</small><strong>${formatScore(record.flavor)}</strong></span>
        <span class="mini-score"><small>还原度</small><strong>${formatScore(record.fidelity)}</strong></span>
        <span class="mini-score"><small>易用性</small><strong>${formatScore(record.ease)}</strong></span>
        <span class="total-score"><strong>${formatScore(record.score)}</strong><small>总分</small></span>
        <span class="details-cue" aria-hidden="true"></span>
      </summary>
      <div class="rank-detail">
        <div>
          <blockquote>${escapeHtml(record.comment)}</blockquote>
          <div class="mobile-breakdown">${scoreBreakdown(record)}</div>
        </div>
        <p>${escapeHtml(record.episode)} · ${formatDate(record.date)}</p>
      </div>
    </details>`;
}

function init() {
  const records = globalThis.LIAOLI_DATA || [];
  const podium = document.querySelector("#podium");
  const list = document.querySelector("#ranking-list");
  const count = document.querySelector("#result-count");
  const empty = document.querySelector("#empty-state");
  const queryInput = document.querySelector("#search");
  const brandSelect = document.querySelector("#brand");
  const sortSelect = document.querySelector("#sort");
  const directionButton = document.querySelector("#direction");
  const clearButton = document.querySelector("#clear-filters");
  let direction = "desc";

  document.querySelector("#tested-count").textContent = records.length;
  podium.innerHTML = records.length
    ? [podiumCard(records[1], 2), podiumCard(records[0], 1), podiumCard(records[2], 3)].join("")
    : '<p class="preparing">榜单正在准备中</p>';

  [...new Set(records.map((record) => record.brand))]
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .forEach((brand) => brandSelect.add(new Option(brand, brand)));

  function render() {
    const result = queryRecords(records, {
      query: queryInput.value,
      brand: brandSelect.value,
      sortKey: sortSelect.value,
      direction,
    });
    count.textContent = `找到 ${result.length} 款料包`;
    list.innerHTML = result.map((record, index) => listItem(record, index + 1)).join("");
    empty.hidden = result.length > 0;
    list.hidden = result.length === 0;
  }

  document.querySelector("#filters").addEventListener("input", render);
  document.querySelector("#filters").addEventListener("change", render);
  directionButton.addEventListener("click", () => {
    direction = direction === "desc" ? "asc" : "desc";
    directionButton.textContent = direction === "desc" ? "降序" : "升序";
    directionButton.setAttribute("aria-pressed", String(direction === "asc"));
    render();
  });
  clearButton.addEventListener("click", () => {
    queryInput.value = "";
    brandSelect.value = "";
    sortSelect.value = "score";
    direction = "desc";
    directionButton.textContent = "降序";
    directionButton.setAttribute("aria-pressed", "false");
    queryInput.focus();
    render();
  });
  render();
}

if (typeof document !== "undefined") init();
