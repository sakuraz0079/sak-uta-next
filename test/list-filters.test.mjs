import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../list-filters.js", import.meta.url), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const filters = context.window.SAK_UTA_LIST_FILTERS;

test("通常フィルターは指定した5区分だけを表示する", () => {
  assert.deepEqual(Array.from(filters.main), ["すべて", "有力", "リクエスト", "再録", "コラボ"]);
  assert.deepEqual(Array.from(filters.history), ["見送り", "歌唱済"]);
});

test("すべてから履歴を除外し、再録へ再挑戦もまとめる", () => {
  assert.equal(filters.matches("すべて", "候補"), true);
  assert.equal(filters.matches("すべて", "見送り"), false);
  assert.equal(filters.matches("すべて", "歌唱済"), false);
  assert.equal(filters.matches("有力", "⭐有力"), true);
  assert.equal(filters.matches("再録", "再録候補"), true);
  assert.equal(filters.matches("再録", "再挑戦"), true);
});
