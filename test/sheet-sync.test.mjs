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

function makeReorderedExtendedTable() {
  const entries = [
    ["曲名", "Extended Song"], ["高音保持", "ロング"], ["アーティスト", "Extended Artist"],
    ["試唱判定", "苦しい"], ["想定キー差", -2], ["最高音(国際式)", "B4"],
    ["ステータス", "⭐有力"], ["オクターブ調整", -1], ["高音頻度", "多"],
    ["高音連続性", "高"], ["サビ平均負荷", "中"], ["見送り理由", "高音が厳しい"],
    ["見送りメモ", "半音下げで再挑戦"], ["見送り日", "2026/08/20"], ["見送り前ステータス", "⭐有力"]
  ];
  return {
    cols: entries.map(([label]) => ({ label })),
    rows: [{ c: entries.map(([, value]) => ({ v: value })) }]
  };
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
    sheetRow: 2,
    status: "候補", artist: "Test Artist", title: "Test Song", fame: 4, load: 3, identity: 5,
    key: "-1", reason: "理由", test: "", retake: "", originalKey: "Am", topNote: "hiA",
    topNoteIntl: "A4", highNoteFeature: "瞬間音", confidence: "A",
    imageUrl: "https://example.com/art.jpg", sourceUrl: "https://example.com/source",
    keyShift: "", octaveShift: "", highFrequency: "", highHold: "",
    highContinuity: "", chorusLoad: "", trialRating: "",
    shelvedReason: "", shelvedMemo: "", shelvedDate: "", previousStatus: ""
  });
  assert.equal(JSON.parse(stored.get("sakUtaNextSheetCacheV1")).length, 1);
  assert.deepEqual(status.at(-1), ["同期済 1曲", "ok"]);
});

test("JSONP同期はR:Xを列順ではなくヘッダー名で読み込む", async () => {
  const appended = [];
  const data = [];
  const context = {
    console,
    data,
    render() {},
    setSyncStatus() {},
    localStorage: { setItem() {} },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    window: { SAK_UTA_CONFIG: { SHEET_GVIZ_URL: "https://example.com/gviz?range=A:X" } },
    document: {
      getElementById() { return null; },
      createElement() { return { remove() {}, onerror: null, src: "" }; },
      head: { appendChild(script) { appended.push(script); } }
    }
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(source, context);

  const callbackName = new URL(appended[0].src).searchParams.get("tqx").replace("responseHandler:", "");
  context.window[callbackName]({ status: "ok", table: makeReorderedExtendedTable() });
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(data[0].title, "Extended Song");
  assert.equal(data[0].artist, "Extended Artist");
  assert.equal(data[0].keyShift, "-2");
  assert.equal(data[0].octaveShift, "-1");
  assert.equal(data[0].highFrequency, "多");
  assert.equal(data[0].highHold, "ロング");
  assert.equal(data[0].highContinuity, "高");
  assert.equal(data[0].chorusLoad, "中");
  assert.equal(data[0].trialRating, "苦しい");
  assert.equal(data[0].shelvedReason, "高音が厳しい");
  assert.equal(data[0].shelvedMemo, "半音下げで再挑戦");
  assert.equal(data[0].shelvedDate, "2026/08/20");
  assert.equal(data[0].previousStatus, "⭐有力");
});
