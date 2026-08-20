import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../detail-enhance.js", import.meta.url), "utf8");

function renderDetail(overrides = {}) {
  const body = { innerHTML: "" };
  const elements = {
    detailBody: body,
    favBtn: { textContent: "", onclick: null },
    prepBtn: { onclick: null },
    copyBtn: { onclick: null },
    detail: { showModal() {} }
  };
  const context = {
    window: { SAK_UTA_CONFIG: { VOCAL_PROFILE: { stableTop: "A4", currentTop: "A#4" } } },
    document: { getElementById(id) { return elements[id]; } },
    navigator: { clipboard: { writeText: async () => {} } }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.window.openDetail({
    status: "候補", artist: "Artist", title: "Song", fame: 3, load: 3, identity: 3,
    key: "", reason: "", test: "", retake: "", originalKey: "", topNote: "hiA",
    topNoteIntl: "A4", highNoteFeature: "", confidence: "", imageUrl: "", sourceUrl: "",
    ...overrides
  });
  return body.innerHTML;
}

test("最高音は日本式（国際式）と安定域内を表示する", () => {
  const html = renderDetail();
  assert.match(html, /hiA（A4）/);
  assert.match(html, /現在の安定域上限以内/);
  assert.doesNotMatch(html, /推奨キー/);
  assert.doesNotMatch(html, /選曲理由・おすすめポイント/);
});

test("B4は現在の上限より1半音高いチャレンジ域", () => {
  const html = renderDetail({ topNote: "hiB", topNoteIntl: "B4" });
  assert.match(html, /チャレンジ域/);
  assert.match(html, /現在の上限より1半音高い/);
});

test("画像URLが壊れても音符プレースホルダーを残す", () => {
  const html = renderDetail({ imageUrl: "https://example.com/missing.jpg" });
  assert.match(html, /<b>♫<\/b>/);
  assert.match(html, /onerror=/);
});
