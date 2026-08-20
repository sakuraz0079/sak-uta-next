(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
  const stars = n => "★".repeat(Math.max(0, Math.min(5, +n || 0))) +
                     "☆".repeat(Math.max(0, 5 - (+n || 0)));
  const yt = x => "https://www.youtube.com/results?search_query=" +
                  encodeURIComponent(`${x.artist} ${x.title}`);
  const favKey = x => `${x.artist}||${x.title}`;

  const noteToMidi = note => {
    const m = String(note || "").trim().match(/^([A-Ga-g])([#b]?)(-?\d)$/);
    if (!m) return null;
    const pc = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1].toUpperCase()];
    const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
    return (parseInt(m[3], 10) + 1) * 12 + pc + acc;
  };

  const vocalComparison = x => {
    if (!x.topNoteIntl) return null;
    const note = noteToMidi(x.topNoteIntl);
    const stable = noteToMidi(window.SAK_UTA_CONFIG?.VOCAL_PROFILE?.stableTop || "A4");
    const top = noteToMidi(window.SAK_UTA_CONFIG?.VOCAL_PROFILE?.currentTop || "A#4");
    if (note == null || stable == null || top == null) return null;

    const diff = note - top;
    if (note <= stable) {
      return {cls:"safe", icon:"🟢", label:"安定域内", text:note === stable ? "現在の安定域上限以内" : `現在の安定域上限より${stable-note}半音低い`};
    }
    if (note <= top) {
      return {cls:"edge", icon:"🟡", label:"現在の上限域", text:`現在の上限 ${window.SAK_UTA_CONFIG.VOCAL_PROFILE.currentTop} 以内`};
    }
    if (diff <= 2) {
      return {cls:"challenge", icon:"🟠", label:"チャレンジ域", text:`現在の上限より${diff}半音高い`};
    }
    return {cls:"hard", icon:"🔴", label:"高難度", text:`現在の上限より${diff}半音高い`};
  };

  const imageBlock = x => x.imageUrl
    ? `<div class="sdArt hasImage"><b>♫</b><span>${esc(x.artist)}</span><img src="${esc(x.imageUrl)}" alt="${esc(x.title)}" onerror="this.parentElement.classList.remove('hasImage');this.remove();"></div>`
    : `<div class="sdArt"><b>♫</b><span>${esc(x.artist)}</span></div>`;

  window.openDetail = function(x) {
    if (!x) return;
    const body = document.getElementById("detailBody");
    const favBtn = document.getElementById("favBtn");
    const cmp = vocalComparison(x);

    favBtn.textContent = (typeof favs !== "undefined" && favs.has(favKey(x))) ? "★" : "☆";
    favBtn.onclick = () => {
      if (typeof toggleFav === "function") toggleFav(favKey(x));
      favBtn.textContent = favs.has(favKey(x)) ? "★" : "☆";
    };

    const noteLabel = x.topNote && x.topNoteIntl ? `${x.topNote}（${x.topNoteIntl}）` : (x.topNote || x.topNoteIntl || "");
    const highSection = noteLabel ? `
      <section class="sdPitchCard">
        <div class="sdPitchTop">
          <div><small>最高音</small><strong>${esc(noteLabel)}</strong></div>
          ${x.confidence ? `<span class="confidence">確度 ${esc(x.confidence)}</span>` : ""}
        </div>
        ${cmp ? `<div class="vocalCompare ${cmp.cls}">
          <span>${cmp.icon}</span><div><b>${cmp.label}</b><small>${esc(cmp.text)}</small></div>
        </div>` : ""}
        ${x.highNoteFeature ? `<p>${esc(x.highNoteFeature)}</p>` : ""}
      </section>` : "";

    body.innerHTML = `
      <section class="sdHero">
        ${imageBlock(x)}
        <div class="sdTitle">
          <div>
            <span class="badge">${esc(x.status)}</span>
            <h1>${esc(x.title)}</h1>
            <p>${esc(x.artist)}</p>
          </div>
          ${x.key ? `<strong>${esc(x.key)}</strong>` : ""}
        </div>
      </section>

      <section class="sdScores">
        <div>知名度<b>${stars(x.fame)}</b></div>
        <div>音域負荷<b>${stars(x.load)}</b></div>
        <div>自分らしさ<b>${stars(x.identity)}</b></div>
      </section>

      ${highSection}

      <section class="sdRows">
        ${x.originalKey ? `<div><small>原曲キー</small><strong>${esc(x.originalKey)}</strong></div>` : ""}
        ${x.key ? `<div><small>推奨キー</small><strong>${esc(x.key)}</strong></div>` : ""}
        ${x.reason ? `<article><small>選曲理由・おすすめポイント</small><p>${esc(x.reason)}</p></article>` : ""}
        ${x.test ? `<article><small>試唱結果</small><p>${esc(x.test)}</p></article>` : ""}
        ${x.retake ? `<article><small>再録・再挑戦理由</small><p>${esc(x.retake)}</p></article>` : ""}
      </section>

      <section class="sdActions">
        <a href="${yt(x)}" target="_blank" rel="noopener noreferrer"><i>▶</i>YouTubeで聴く</a>
        <button class="primary" id="prepBtn">🎤 この曲を歌う・準備へ</button>
        <button class="secondary" id="copyBtn">曲情報をコピー</button>
      </section>

      ${x.sourceUrl ? `<p class="sdSource"><a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener noreferrer">情報ソースを開く</a></p>` : ""}
      <p class="sdNote">YouTubeで「${esc(x.artist)} ${esc(x.title)}」を検索します</p>
    `;

    document.getElementById("prepBtn").onclick = () =>
      typeof sendToPrep === "function" && sendToPrep(x);
    document.getElementById("copyBtn").onclick = async e => {
      await navigator.clipboard.writeText(`${x.title} / ${x.artist}\n推奨キー: ${x.key || "—"}${noteLabel ? `\n最高音: ${noteLabel}` : ""}`);
      e.currentTarget.textContent = "コピーしました";
    };

    document.getElementById("detail").showModal();
  };
})();
