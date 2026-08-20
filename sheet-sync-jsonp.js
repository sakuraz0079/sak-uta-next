(() => {
  const url = window.SAK_UTA_CONFIG?.SHEET_GVIZ_URL || "";
  if (!url) return;

  const starCount = v => {
    const s = String(v || "");
    const n = (s.match(/★/g) || []).length;
    if (n) return Math.min(5, n);
    const num = parseInt(s, 10);
    return Number.isFinite(num) ? Math.max(0, Math.min(5, num)) : 0;
  };

  const fromTable = table => {
    const headers = table.cols.map(c => String(c.label || "").trim());
    const ix = name => headers.indexOf(name);
    const I = {
      status: ix("ステータス"), artist: ix("アーティスト"), title: ix("曲名"),
      fame: ix("知名度"), load: ix("音域・負荷"), identity: ix("自分らしさ"),
      key: ix("推奨キー"), reason: ix("選曲理由"), test: ix("試唱結果"),
      retake: ix("再録理由"), originalKey: ix("原曲キー"), topNote: ix("最高音"),
      topNoteIntl: ix("最高音(国際式)"), highNoteFeature: ix("高音特徴"),
      confidence: ix("情報確度"), imageUrl: ix("画像URL"), sourceUrl: ix("情報ソース"),
      keyShift: ix("想定キー差"), octaveShift: ix("オクターブ調整"),
      highFrequency: ix("高音頻度"), highHold: ix("高音保持"),
      highContinuity: ix("高音連続性"), chorusLoad: ix("サビ平均負荷"), trialRating: ix("試唱判定"),
      shelvedReason: ix("見送り理由"), shelvedMemo: ix("見送りメモ"),
      shelvedDate: ix("見送り日"), previousStatus: ix("見送り前ステータス"),
      sungMemo: ix("歌唱済みメモ"), sungDate: ix("歌唱済み日"),
      sungPreviousStatus: ix("歌唱済み前ステータス")
    };
    const v = (r, i) => i < 0 ? "" : (r.c?.[i]?.f ?? r.c?.[i]?.v ?? "");

    return table.rows.map((r, rowIndex) => ({
      sheetRow: rowIndex + 2,
      status: String(v(r, I.status) || "候補").trim(),
      artist: String(v(r, I.artist) || "").trim(),
      title: String(v(r, I.title) || "").trim(),
      fame: starCount(v(r, I.fame)),
      load: starCount(v(r, I.load)),
      identity: starCount(v(r, I.identity)),
      key: String(v(r, I.key) || "").trim(),
      reason: String(v(r, I.reason) || "").trim(),
      test: String(v(r, I.test) || "").trim(),
      retake: String(v(r, I.retake) || "").trim(),
      originalKey: String(v(r, I.originalKey) || "").trim(),
      topNote: String(v(r, I.topNote) || "").trim(),
      topNoteIntl: String(v(r, I.topNoteIntl) || "").trim(),
      highNoteFeature: String(v(r, I.highNoteFeature) || "").trim(),
      confidence: String(v(r, I.confidence) || "").trim(),
      imageUrl: String(v(r, I.imageUrl) || "").trim(),
      sourceUrl: String(v(r, I.sourceUrl) || "").trim(),
      keyShift: String(v(r, I.keyShift) ?? "").trim(),
      octaveShift: String(v(r, I.octaveShift) ?? "").trim(),
      highFrequency: String(v(r, I.highFrequency) || "").trim(),
      highHold: String(v(r, I.highHold) || "").trim(),
      highContinuity: String(v(r, I.highContinuity) || "").trim(),
      chorusLoad: String(v(r, I.chorusLoad) || "").trim(),
      trialRating: String(v(r, I.trialRating) || "").trim(),
      shelvedReason: String(v(r, I.shelvedReason) || "").trim(),
      shelvedMemo: String(v(r, I.shelvedMemo) || "").trim(),
      shelvedDate: String(v(r, I.shelvedDate) || "").trim(),
      previousStatus: String(v(r, I.previousStatus) || "").trim(),
      sungMemo: String(v(r, I.sungMemo) || "").trim(),
      sungDate: String(v(r, I.sungDate) || "").trim(),
      sungPreviousStatus: String(v(r, I.sungPreviousStatus) || "").trim()
    })).filter(x => x.title);
  };

  window.syncFromSheet = function () {
    if (typeof setSyncStatus === "function") setSyncStatus("同期中…", "loading");
    return new Promise(resolve => {
      const cb = "__sakUtaGviz_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
      const script = document.createElement("script");
      const cleanup = () => { try { delete window[cb]; } catch (e) {} script.remove(); };
      const fail = err => {
        clearTimeout(timer); cleanup();
        console.warn("Google Sheets JSONP sync failed:", err);
        const cachedCount = Array.isArray(data) ? data.length : 0;
        if (typeof setSyncStatus === "function") {
          setSyncStatus(cachedCount ? `同期失敗・前回データ ${cachedCount}曲` : "同期失敗", "error");
        }
        resolve(false);
      };
      const timer = setTimeout(() => fail(new Error("timeout")), 12000);

      window[cb] = res => {
        try {
          if (!res || res.status === "error") throw new Error("GViz error");
          const next = fromTable(res.table);
          if (!next.length) throw new Error("0 rows");
          data.splice(0, data.length, ...next);
          try { localStorage.setItem("sakUtaNextSheetCacheV1", JSON.stringify(next)); } catch (e) {}
          if (typeof setSyncStatus === "function") setSyncStatus(`同期済 ${next.length}曲`, "ok");
          if (typeof render === "function") render();
          clearTimeout(timer); cleanup(); resolve(true);
        } catch (e) { fail(e); }
      };

      script.src = url + (url.includes("?") ? "&" : "?") +
        "tqx=responseHandler:" + cb + "&_ts=" + Date.now();
      script.onerror = () => fail(new Error("script load error"));
      document.head.appendChild(script);
    });
  };

  const btn = document.getElementById("syncBtn");
  if (btn) btn.onclick = () => window.syncFromSheet();
  window.syncFromSheet();
})();
