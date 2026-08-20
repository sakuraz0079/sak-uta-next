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
      confidence: ix("情報確度"), imageUrl: ix("画像URL"), sourceUrl: ix("情報ソース")
    };
    const v = (r, i) => i < 0 ? "" : (r.c?.[i]?.f ?? r.c?.[i]?.v ?? "");

    return table.rows.filter(r => String(v(r, I.title)).trim()).map(r => ({
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
      sourceUrl: String(v(r, I.sourceUrl) || "").trim()
    }));
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
        if (typeof setSyncStatus === "function") setSyncStatus("同期失敗", "error");
        resolve(false);
      };
      const timer = setTimeout(() => fail(new Error("timeout")), 12000);

      window[cb] = res => {
        try {
          if (!res || res.status === "error") throw new Error("GViz error");
          const next = fromTable(res.table);
          if (!next.length) throw new Error("0 rows");
          data.splice(0, data.length, ...next);
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
