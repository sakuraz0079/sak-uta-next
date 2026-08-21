(() => {
  const HISTORY_STATUSES = new Set(["歌唱済", "見送り"]);
  const main = ["すべて", "有力", "リクエスト", "再録", "コラボ"];
  const history = ["見送り", "歌唱済"];

  const matches = (filter, status) => {
    if (filter === "すべて") return !HISTORY_STATUSES.has(status);
    if (filter === "有力") return status === "⭐有力";
    if (filter === "リクエスト") return status === "リクエスト";
    if (filter === "再録") return status === "再録候補" || status === "再挑戦";
    if (filter === "コラボ") return status === "コラボ";
    if (filter === "見送り") return status === "見送り";
    if (filter === "歌唱済") return status === "歌唱済";
    return false;
  };

  window.SAK_UTA_LIST_FILTERS = { main, history, matches };
})();
