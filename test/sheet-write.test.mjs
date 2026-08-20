import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../sheet-write.js", import.meta.url), "utf8");

test("Sheet書き込みはフォーム形式のPOST後に再同期する", async () => {
  const calls = [];
  let synced = 0;
  const context = {
    URLSearchParams,
    setTimeout(resolve) { resolve(); },
    fetch: async (url, options) => { calls.push([url, options]); },
    window: {
      SAK_UTA_CONFIG: { SHEET_WRITE_URL: "https://script.google.com/macros/s/test/exec" },
      async syncFromSheet() { synced += 1; }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  await context.window.SAK_UTA_SHEET_WRITE.submit({ action: "trial", row: 30, trialRating: "歌える" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "https://script.google.com/macros/s/test/exec");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].mode, "no-cors");
  assert.equal(calls[0][1].body.get("trialRating"), "歌える");
  assert.equal(synced, 1);
});
