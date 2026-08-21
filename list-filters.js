(() => {
  const HISTORY_STATUSES = new Set(["歌唱済", "見送り"]);
  const main = ["すべて", "有力", "リクエスト", "再録", "コラボ"];
  const history = ["見送り", "歌唱済"];
  const all = [...main, ...history];

  const tag = status => {
    if (status === "⭐有力") return "有力";
    if (status === "リクエスト") return "リクエスト";
    if (status === "再録候補" || status === "再挑戦") return "再録";
    if (status === "コラボ") return "コラボ";
    if (status === "見送り") return "見送り";
    if (status === "歌唱済") return "歌唱済";
    return "";
  };

  const toStatus = value => ({
    "有力": "⭐有力", "リクエスト": "リクエスト", "再録": "再録候補", "コラボ": "コラボ"
  }[value] || "候補");

  const matches = (filter, status) => {
    if (filter === "すべて") return !HISTORY_STATUSES.has(status);
    if (filter !== "すべて") return tag(status) === filter;
    return false;
  };

  window.SAK_UTA_LIST_FILTERS = { main, history, all, tag, toStatus, matches };
})();
