import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../sheet-sync-jsonp.js", import.meta.url), "utf8");

function makeTable() {
  const headers = [
    "ステータス", "アーティスト", "曲名", "知名度", "音域・負荷", "自分らしさ",
    "推奨キー", "選曲理由", "試唱結果", "再録理由", "原曲キー", "最高音",
    "最高音(国際式)", "高音特徴", "情報確度", "画像URL", "情報ソース"
  ];
  const values = [
    "候補", "Test Artist", "Test Song", "★★★★", "★★★", "★★★★★",
    "-1", "理由", "", "", "Am", "hiA", "A4", "瞬間音", "A", "https://example.com/art.jpg", "https://example.com/source"
  ];
  return { cols: headers.map(label => ({ label })), rows: [{ c: values.map(v => ({ v })) }] };
}

test("JSONP同期はヘッダー名からA:Qを変換し、前回データを保存する", async () => {
  const appended = [];
  const stored = new Map();
  const status = [];
  const data = [];
  const context = {
    console,
    data,
    render() {},
    setSyncStatus(text, cls) { status.push([text, cls]); },
    localStorage: { setItem(k, v) { stored.set(k, v); } },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    window: { SAK_UTA_CONFIG: { SHEET_GVIZ_URL: "https://example.com/gviz?range=A:Q" } },
    document: {
      getElementById() { return null; },
      createElement() { return { remove() {}, onerror: null, src: "" }; },
      head: { appendChild(script) { appended.push(script); } }
    }
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(source, context);

  const script = appended[0];
  const callbackName = new URL(script.src).searchParams.get("tqx").replace("responseHandler:", "");
  context.window[callbackName]({ status: "ok", table: makeTable() });
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(data.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(data[0])), {
    status: "候補", artist: "Test Artist", title: "Test Song", fame: 4, load: 3, identity: 5,
    key: "-1", reason: "理由", test: "", retake: "", originalKey: "Am", topNote: "hiA",
    topNoteIntl: "A4", highNoteFeature: "瞬間音", confidence: "A",
    imageUrl: "https://example.com/art.jpg", sourceUrl: "https://example.com/source"
  });
  assert.equal(JSON.parse(stored.get("sakUtaNextSheetCacheV1")).length, 1);
  assert.deepEqual(status.at(-1), ["同期済 1曲", "ok"]);
});
