(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
  const stars = n => "★".repeat(Math.max(0, Math.min(5, +n || 0))) +
                     "☆".repeat(Math.max(0, 5 - (+n || 0)));
  const yt = x => "https://www.youtube.com/results?search_query=" +
                  encodeURIComponent(`${x.artist} ${x.title}`);
  const favKey = x => `${x.artist}||${x.title}`;
  const optionTags = (values, current) => values.map(value =>
    `<option value="${esc(value)}"${value === current ? " selected" : ""}>${esc(value)}</option>`
  ).join("");
  const namedOptionTags = (values, current) => values.map(([value, label]) =>
    `<option value="${esc(value)}"${value === current ? " selected" : ""}>${esc(label)}</option>`
  ).join("");
  const sheetEditUrl = (x, start, end) => {
    const base = window.SAK_UTA_CONFIG?.SHEET_EDIT_URL || "";
    const row = Number(x.sheetRow);
    return base && Number.isInteger(row) && row >= 2 ? `${base}&range=${start}${row}:${end}${row}` : "";
  };

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
    const readiness = window.SAK_UTA_READINESS?.judge(x, window.SAK_UTA_CONFIG?.VOCAL_PROFILE || {}) || null;

    favBtn.textContent = (typeof favs !== "undefined" && favs.has(favKey(x))) ? "★" : "☆";
    favBtn.onclick = () => {
      if (typeof toggleFav === "function") toggleFav(favKey(x));
      favBtn.textContent = favs.has(favKey(x)) ? "★" : "☆";
    };

    const noteLabel = x.topNote && x.topNoteIntl ? `${x.topNote}（${x.topNoteIntl}）` : (x.topNote || x.topNoteIntl || "");
    const adjustedLabel = readiness?.adjustedMidi != null
      ? `${window.SAK_UTA_READINESS.midiToKaraoke(readiness.adjustedMidi)}（${window.SAK_UTA_READINESS.midiToIntl(readiness.adjustedMidi)}）`
      : "未設定";
    const readinessCard = readiness ? `
      <section class="sdReadiness ${esc(readiness.level)}">
        <div class="sdReadinessHead">
          <div><small>歌えるか判断</small><strong>${esc(readiness.label)}</strong></div>
          <span>${readiness.source === "trial" ? "試唱結果を優先" : readiness.source === "theory" ? "データから暫定判定" : "追加調査が必要"}</span>
        </div>
        <div class="sdPitchCompare">
          <div><small>原曲キーの最高音</small><b>${esc(noteLabel || "未調査")}</b></div>
          <div><small>想定キーの最高音</small><b>${esc(adjustedLabel)}</b></div>
        </div>
        <ul>${readiness.reasons.map(reason => `<li>${esc(reason)}</li>`).join("")}</ul>
      </section>` : "";
    const highSection = noteLabel ? `
      <section class="sdPitchCard">
        <div class="sdPitchTop">
          <div><small>原曲の高音情報</small><strong>${esc(noteLabel)}</strong></div>
          ${x.confidence ? `<span class="confidence">確度 ${esc(x.confidence)}</span>` : ""}
        </div>
        ${x.highNoteFeature ? `<p>${esc(x.highNoteFeature)}</p>` : ""}
      </section>` : "";
    const trialEditUrl = sheetEditUrl(x, "I", "X");
    const statusEditUrl = sheetEditUrl(x, "A", "AE");
    const isShelved = x.status === "見送り";
    const isSung = x.status === "歌唱済";
    const isHistory = isShelved || isSung;
    const listTag = window.SAK_UTA_LIST_FILTERS?.tag(x.status) || "";
    const tagStatus = window.SAK_UTA_LIST_FILTERS?.toStatus(listTag) || "候補";
    const isFavorite = typeof favs !== "undefined" && favs.has(favKey(x));
    const shelvedInfo = isShelved && (x.shelvedReason || x.shelvedMemo || x.shelvedDate) ? `<article>
      <small>見送り記録</small>
      ${x.shelvedReason ? `<p><b>${esc(x.shelvedReason)}</b></p>` : ""}
      ${x.shelvedMemo ? `<p>${esc(x.shelvedMemo)}</p>` : ""}
      ${x.shelvedDate ? `<p>${esc(x.shelvedDate)}</p>` : ""}
    </article>` : "";
    const sungInfo = isSung && (x.sungMemo || x.sungDate) ? `<article>
      <small>投稿用の歌唱記録</small>
      <p><b>投稿用に歌唱済み</b></p>
      ${x.sungMemo ? `<p>${esc(x.sungMemo)}</p>` : ""}
      ${x.sungDate ? `<p>${esc(x.sungDate)}</p>` : ""}
    </article>` : "";
    const inlineWrite = window.SAK_UTA_SHEET_WRITE?.isReady();
    const manageSection = inlineWrite ? `<section class="sdManage">
      <strong>候補の管理</strong>
      ${isHistory
        ? `<p>「${esc((isSung ? x.sungPreviousStatus : x.previousStatus) || "候補")}」へ戻すと通常一覧に復帰します。これまでの記録は残ります。</p>
           <button class="restore" id="restoreCandidate" type="button">↩ 候補へ戻す</button>
           <span class="sdSaveStatus" id="restoreStatus"></span>`
        : `<details><summary>🏷 一覧タグを変更</summary>
             <form id="tagForm">
               <label>一覧タグ<select name="status">${namedOptionTags([["候補", "タグなし（通常候補）"], ["リクエスト", "リクエスト"], ["再録候補", "再録"], ["コラボ", "コラボ"]], tagStatus)}</select></label>
               <p class="sdFormHint">★お気に入りを付けた曲は「有力」になります。それ以外のタグをここで変更できます。</p>
               <button type="submit">タグを保存する</button><span class="sdSaveStatus"></span>
             </form>
           </details>
           <details><summary>📝 試唱結果を記録</summary>
             <form id="trialForm">
               <label>試唱判定<select name="trialRating">${optionTags(["未試唱", "余裕", "歌える", "苦しい", "不可"], x.trialRating || "未試唱")}</select></label>
               <label>試唱メモ<textarea name="test" rows="3" maxlength="1000" placeholder="サビは出るが後半で苦しい、など">${esc(x.test || "")}</textarea></label>
               <button type="submit">保存する</button><span class="sdSaveStatus"></span>
             </form>
           </details>
           <details><summary>⏸ 今回は見送る</summary>
             <form id="shelveForm">
               <label>見送り理由<select name="reason">${optionTags(["歌えなかった", "高音が厳しい", "曲が合わなかった", "今の気分ではない", "その他"], "歌えなかった")}</select></label>
               <label>メモ<textarea name="memo" rows="3" maxlength="1000" placeholder="キーを下げて再挑戦、など"></textarea></label>
               <button class="shelve" type="submit">見送りにする</button><span class="sdSaveStatus"></span>
             </form>
           </details>
           <details><summary>🎙 投稿用に歌唱済み</summary>
             <form id="completeForm">
               <label>メモ<textarea name="memo" rows="3" maxlength="1000" placeholder="投稿日、仕上がり、再録予定など（任意）"></textarea></label>
               <button class="complete" type="submit">歌唱済みにする</button><span class="sdSaveStatus"></span>
             </form>
           </details>`}
    </section>` : (trialEditUrl || statusEditUrl) ? `<section class="sdManage">
      <strong>候補の管理</strong><p>簡易入力の準備中です。現在はGoogle Sheetsから編集できます。</p>
      ${isHistory
        ? `<a class="restore" href="${esc(statusEditUrl)}" target="_blank" rel="noopener noreferrer">↩ 候補へ戻す・シートを開く</a>`
        : `<a href="${esc(trialEditUrl)}" target="_blank" rel="noopener noreferrer">📝 試唱結果を記録・編集</a><a class="shelve" href="${esc(statusEditUrl)}" target="_blank" rel="noopener noreferrer">⏸ 今回は見送る・シートを開く</a>`}
    </section>` : "";

    body.innerHTML = `
      <section class="sdHero">
        ${imageBlock(x)}
        <div class="sdTitle">
          <div>
            ${isFavorite ? `<span class="badge">★ 有力</span>` : ""}
            ${listTag ? `<span class="badge">${esc(listTag)}</span>` : ""}
            <h1>${esc(x.title)}</h1>
            <p>${esc(x.artist)}</p>
          </div>
          ${x.key ? `<strong>${esc(x.key)}</strong>` : ""}
        </div>
      </section>

      ${readinessCard}

      <section class="sdScores">
        <div>知名度<b>${stars(x.fame)}</b></div>
        <div>音域負荷<b>${stars(x.load)}</b></div>
        <div>自分らしさ<b>${stars(x.identity)}</b></div>
      </section>

      ${highSection}

      ${(x.highFrequency || x.highHold || x.highContinuity || x.chorusLoad) ? `<section class="sdLoadGrid">
        ${x.highFrequency ? `<div><small>高音頻度</small><b>${esc(x.highFrequency)}</b></div>` : ""}
        ${x.highHold ? `<div><small>高音保持</small><b>${esc(x.highHold)}</b></div>` : ""}
        ${x.highContinuity ? `<div><small>高音連続性</small><b>${esc(x.highContinuity)}</b></div>` : ""}
        ${x.chorusLoad ? `<div><small>サビ平均負荷</small><b>${esc(x.chorusLoad)}</b></div>` : ""}
      </section>` : ""}

      <section class="sdRows">
        ${x.originalKey ? `<div><small>原曲キー</small><strong>${esc(x.originalKey)}</strong></div>` : ""}
        ${x.key ? `<div><small>推奨キー</small><strong>${esc(x.key)}</strong></div>` : ""}
        ${x.reason ? `<article><small>選曲理由・おすすめポイント</small><p>${esc(x.reason)}</p></article>` : ""}
        ${x.test ? `<article><small>試唱結果</small><p>${esc(x.test)}</p></article>` : ""}
        ${x.retake ? `<article><small>再録・再挑戦理由</small><p>${esc(x.retake)}</p></article>` : ""}
        ${shelvedInfo}
        ${sungInfo}
      </section>

      <section class="sdActions">
        <a href="${yt(x)}" target="_blank" rel="noopener noreferrer"><i>▶</i>YouTubeで聴く</a>
        <button class="primary" id="prepBtn">🎤 この曲を歌う・準備へ</button>
        <button class="secondary" id="copyBtn">曲情報をコピー</button>
      </section>

      ${manageSection}

      ${x.sourceUrl ? `<p class="sdSource"><a href="${esc(x.sourceUrl)}" target="_blank" rel="noopener noreferrer">情報ソースを開く</a></p>` : ""}
      <p class="sdNote">YouTubeで「${esc(x.artist)} ${esc(x.title)}」を検索します</p>
    `;

    document.getElementById("prepBtn").onclick = () =>
      typeof sendToPrep === "function" && sendToPrep(x);
    document.getElementById("copyBtn").onclick = async e => {
      await navigator.clipboard.writeText(`${x.title} / ${x.artist}\n推奨キー: ${x.key || "—"}${noteLabel ? `\n最高音: ${noteLabel}` : ""}`);
      e.currentTarget.textContent = "コピーしました";
    };
    const save = async (form, payload, verify) => {
      const button = form.querySelector("button");
      const status = form.querySelector(".sdSaveStatus");
      button.disabled = true;
      status.textContent = "保存中…";
      try {
        await window.SAK_UTA_SHEET_WRITE.submit(payload);
        const updated = typeof data !== "undefined" && data.find(song => song.sheetRow === x.sheetRow);
        if (!updated || !verify(updated)) throw new Error("反映を確認できませんでした");
        status.textContent = "保存しました";
        setTimeout(() => document.getElementById("detail").close(), 450);
      } catch (error) {
        status.textContent = "保存できませんでした。再試行してください";
        button.disabled = false;
      }
    };
    const trialForm = document.getElementById("trialForm");
    if (trialForm) trialForm.onsubmit = event => {
      event.preventDefault();
      const values = new FormData(trialForm);
      const trialRating = String(values.get("trialRating") || "未試唱");
      const test = String(values.get("test") || "");
      save(trialForm, { action:"trial", row:x.sheetRow, artist:x.artist, title:x.title, trialRating, test },
        updated => updated.trialRating === trialRating && updated.test === test);
    };
    const tagForm = document.getElementById("tagForm");
    if (tagForm) tagForm.onsubmit = event => {
      event.preventDefault();
      const values = new FormData(tagForm);
      const statusValue = String(values.get("status") || "候補");
      save(tagForm, { action:"tag", row:x.sheetRow, artist:x.artist, title:x.title, status:statusValue },
        updated => updated.status === statusValue);
    };
    const shelveForm = document.getElementById("shelveForm");
    if (shelveForm) shelveForm.onsubmit = event => {
      event.preventDefault();
      const values = new FormData(shelveForm);
      const reason = String(values.get("reason") || "");
      const memo = String(values.get("memo") || "");
      save(shelveForm, { action:"shelve", row:x.sheetRow, artist:x.artist, title:x.title, reason, memo },
        updated => updated.status === "見送り" && updated.shelvedReason === reason && updated.shelvedMemo === memo);
    };
    const restoreButton = document.getElementById("restoreCandidate");
    if (restoreButton) restoreButton.onclick = () => save(restoreButton.parentElement,
      { action:"restore", row:x.sheetRow, artist:x.artist, title:x.title }, updated => updated.status !== "見送り" && updated.status !== "歌唱済");
    const completeForm = document.getElementById("completeForm");
    if (completeForm) completeForm.onsubmit = event => {
      event.preventDefault();
      const values = new FormData(completeForm);
      const memo = String(values.get("memo") || "");
      save(completeForm, { action:"complete", row:x.sheetRow, artist:x.artist, title:x.title, memo },
        updated => updated.status === "歌唱済" && updated.sungMemo === memo);
    };

    window.sakUtaDetailReturnY = window.scrollY;
    document.getElementById("detail").showModal();
  };
})();
