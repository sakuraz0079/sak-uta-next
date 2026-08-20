import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../candidate-add.js", import.meta.url), "utf8");

function api() {
  const context = {
    window: {},
    document: { getElementById() { return null; } }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.SAK_UTA_CANDIDATE_ADD;
}

test("アーティストと曲名の空白・英字大小を無視して重複判定する", () => {
  const { findDuplicate } = api();
  const song = { artist: "LUNA SEA", title: "ROSIER" };
  assert.equal(findDuplicate([song], " luna sea ", "rosier"), song);
});

test("同じ曲名でもアーティストが違えば新規候補として扱う", () => {
  const { findDuplicate } = api();
  assert.equal(findDuplicate([{ artist: "Artist A", title: "Song" }], "Artist B", "Song"), undefined);
});
