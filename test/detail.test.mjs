import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const readinessSource = await readFile(new URL("../readiness.js", import.meta.url), "utf8");
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
  vm.runInContext(readinessSource, context);
  vm.runInContext(source, context);
  context.window.openDetail({
    status: "候補", artist: "Artist", title: "Song", fame: 3, load: 3, identity: 3,
    key: "", reason: "", test: "", retake: "", originalKey: "", topNote: "hiA",
    topNoteIntl: "A4", highNoteFeature: "", confidence: "", imageUrl: "", sourceUrl: "",
    ...overrides
  });
  return body.innerHTML;
}

test("最高音は日本式（国際式）と歌唱判断を表示する", () => {
  const html = renderDetail({ keyShift: "0", octaveShift: "0", highFrequency: "少", highHold: "瞬間", highContinuity: "低", chorusLoad: "低" });
  assert.match(html, /hiA（A4）/);
  assert.match(html, /歌えるか判断/);
  assert.match(html, />余裕</);
  assert.doesNotMatch(html, /推奨キー/);
  assert.doesNotMatch(html, /選曲理由・おすすめポイント/);
});

test("B4は現在の上限より1半音高い挑戦判定", () => {
  const html = renderDetail({ topNote: "hiB", topNoteIntl: "B4", keyShift: "0", octaveShift: "0", highFrequency: "少", highHold: "瞬間", highContinuity: "低", chorusLoad: "低" });
  assert.match(html, />挑戦</);
  assert.match(html, /現在の上限より1半音高い/);
});

test("画像URLが壊れても音符プレースホルダーを残す", () => {
  const html = renderDetail({ imageUrl: "https://example.com/missing.jpg" });
  assert.match(html, /<b>♫<\/b>/);
  assert.match(html, /onerror=/);
});
