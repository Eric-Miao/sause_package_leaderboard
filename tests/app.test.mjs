import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, nextSort, queryRecords } from "../dist/app.mjs";

const records = [
  { episode: "EP2", brand: "加点滋味", name: "肉蟹煲", comment: "鲜香微辣", score: 4.1, flavor: 4.3, fidelity: 4.2, ease: 3.8 },
  { episode: "EP1", brand: "万字", name: "寿喜烧料汁", comment: "汤浓味醇", score: 4.1, flavor: 4.0, fidelity: 4.3, ease: 4.1 },
  { episode: "EP3", brand: "盒马", name: "金汤肥牛", comment: "酸辣突出", score: 3.9, flavor: 3.8, fidelity: 3.8, ease: 4.1 },
];

test("searches brand, product name, and comment", () => {
  assert.deepEqual(queryRecords(records, { query: "万字" }).map((item) => item.episode), ["EP1"]);
  assert.deepEqual(queryRecords(records, { query: "肥牛" }).map((item) => item.episode), ["EP3"]);
  assert.deepEqual(queryRecords(records, { query: "鲜香" }).map((item) => item.episode), ["EP2"]);
});

test("combines brand filter with search", () => {
  const result = queryRecords(records, { query: "肉", brands: ["加点滋味"] });
  assert.deepEqual(result.map((item) => item.episode), ["EP2"]);
  assert.equal(queryRecords(records, { query: "肉", brands: ["万字"] }).length, 0);
  assert.equal(queryRecords(records, { brands: ["万字", "盒马"] }).length, 2);
  assert.equal(queryRecords(records, { brands: [] }).length, 0);
});

test("sorts every score key in both directions", () => {
  for (const key of ["score", "flavor", "fidelity", "ease"]) {
    const descending = queryRecords(records, { sortKey: key, direction: "desc" });
    const ascending = queryRecords(records, { sortKey: key, direction: "asc" });
    assert.ok(descending[0][key] >= descending.at(-1)[key]);
    assert.ok(ascending[0][key] <= ascending.at(-1)[key]);
  }
  assert.deepEqual(
    queryRecords(records, { sortKey: "episode", direction: "asc" }).map((item) => item.episode),
    ["EP1", "EP2", "EP3"],
  );
});

test("breaks tied scores by episode and returns all records with empty controls", () => {
  assert.deepEqual(
    queryRecords(records, { sortKey: "score", direction: "desc" }).map((item) => item.episode),
    ["EP1", "EP2", "EP3"],
  );
  assert.equal(queryRecords(records, {}).length, 3);
});

test("escapes workbook text before rendering HTML", () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(escapeHtml("鲜香 & 温和"), "鲜香 &amp; 温和");
});

test("clicking the same column toggles direction and a new column starts descending", () => {
  assert.deepEqual(nextSort({ key: "score", direction: "desc" }, "score"), { key: "score", direction: "asc" });
  assert.deepEqual(nextSort({ key: "score", direction: "asc" }, "flavor"), { key: "flavor", direction: "desc" });
});
