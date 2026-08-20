import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../readiness.js", import.meta.url), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const readiness = context.window.SAK_UTA_READINESS;
const profile = { stableTop: "A4", currentTop: "A#4" };
const complete = {
  topNoteIntl: "A4", keyShift: "0", octaveShift: "0", highFrequency: "少",
  highHold: "瞬間", highContinuity: "低", chorusLoad: "低", trialRating: "未試唱"
};

test("A4は負荷要素がなければ余裕", () => {
  assert.equal(readiness.judge(complete, profile).label, "余裕");
});

test("A#4は要注意、B4は挑戦", () => {
  assert.equal(readiness.judge({ ...complete, topNoteIntl: "A#4" }, profile).label, "要注意");
  assert.equal(readiness.judge({ ...complete, topNoteIntl: "B4" }, profile).label, "挑戦");
});

test("オク下は想定最高音に反映する", () => {
  const result = readiness.judge({ ...complete, topNoteIntl: "A5", octaveShift: "-1" }, profile);
  assert.equal(readiness.midiToIntl(result.adjustedMidi), "A4");
  assert.equal(result.label, "余裕");
});

test("試唱判定は理論判定より優先する", () => {
  const result = readiness.judge({ ...complete, topNoteIntl: "C5", trialRating: "歌える" }, profile);
  assert.equal(result.label, "歌える");
  assert.equal(result.source, "trial");
});

test("未入力項目を推測せず列挙する", () => {
  const result = readiness.judge({ topNoteIntl: "A4" }, profile);
  assert.equal(result.label, "判定材料不足");
  assert.ok(result.missing.includes("想定キー差"));
  assert.ok(result.missing.includes("サビ平均負荷"));
});
