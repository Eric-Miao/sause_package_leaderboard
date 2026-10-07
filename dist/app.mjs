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
  const brands = options.brands;
  const sortKey = options.sortKey || "score";
  const direction = options.direction || "desc";

  return records
    .filter((record) => brands === undefined || brands.includes(record.brand))
    .filter((record) => {
      if (!query) return true;
      return [record.brand, record.name, record.comment]
        .some((value) => String(value || "").toLocaleLowerCase("zh-CN").includes(query));
    })
    .sort((left, right) => {
      const leftValue = sortKey === "episode" ? episodeNumber(left.episode) : left[sortKey];
      const rightValue = sortKey === "episode" ? episodeNumber(right.episode) : right[sortKey];
      const rawDifference = typeof leftValue === "string"
        ? leftValue.localeCompare(rightValue, "zh-CN")
        : leftValue - rightValue;
      const difference = direction === "asc" ? rawDifference : -rawDifference;
      return difference || episodeNumber(left.episode) - episodeNumber(right.episode);
    });
}

export function nextSort(current, key) {
  return current.key === key
    ? { key, direction: current.direction === "desc" ? "asc" : "desc" }
    : { key, direction: "desc" };
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
  const videoLink = record.video_url
    ? `<a class="video-link" href="${escapeHtml(record.video_url)}" target="_blank" rel="noopener noreferrer">观看视频</a>`
    : "";
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
        ${videoLink}
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
  const brandOptions = document.querySelector("#brand-options");
  const clearButton = document.querySelector("#clear-filters");
  let sort = { key: "score", direction: "desc" };

  document.querySelector("#tested-count").textContent = records.length;
  podium.innerHTML = records.length
    ? [podiumCard(records[0], 1), podiumCard(records[1], 2), podiumCard(records[2], 3)].join("")
    : '<p class="preparing">榜单正在准备中</p>';

  const brands = [...new Set(records.map((record) => record.brand))]
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
  brandOptions.innerHTML = brands.map((brand) => `
    <label class="brand-check"><input type="checkbox" value="${escapeHtml(brand)}" checked><span>${escapeHtml(brand)}</span></label>
  `).join("");

  function render() {
    const selectedBrands = [...brandOptions.querySelectorAll("input:checked")].map((input) => input.value);
    const result = queryRecords(records, {
      query: queryInput.value,
      brands: selectedBrands,
      sortKey: sort.key,
      direction: sort.direction,
    });
    count.textContent = `找到 ${result.length} 款料包`;
    list.innerHTML = result.map((record, index) => listItem(record, index + 1)).join("");
    empty.hidden = result.length > 0;
    list.hidden = result.length === 0;
  }

  document.querySelector("#filters").addEventListener("input", render);
  document.querySelector("#filters").addEventListener("change", render);
  document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => {
    sort = nextSort(sort, button.dataset.sort);
    document.querySelectorAll("[data-sort]").forEach((item) => {
      const active = item.dataset.sort === sort.key;
      item.dataset.direction = active ? sort.direction : "";
      item.setAttribute("aria-pressed", String(active));
    });
    render();
  }));
  document.querySelector("#select-all").addEventListener("click", () => {
    brandOptions.querySelectorAll("input").forEach((input) => { input.checked = true; });
    render();
  });
  document.querySelector("#deselect-all").addEventListener("click", () => {
    brandOptions.querySelectorAll("input").forEach((input) => { input.checked = false; });
    render();
  });
  clearButton.addEventListener("click", () => {
    queryInput.value = "";
    brandOptions.querySelectorAll("input").forEach((input) => { input.checked = true; });
    sort = { key: "score", direction: "desc" };
    queryInput.focus();
    render();
  });
  render();
}

if (typeof document !== "undefined") init();
