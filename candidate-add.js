(() => {
  const normalize = value => String(value || "").trim().toLocaleLowerCase();
  const findDuplicate = (songs, artist, title) => (songs || []).find(song =>
    normalize(song.artist) === normalize(artist) && normalize(song.title) === normalize(title)
  );

  window.SAK_UTA_CANDIDATE_ADD = { normalize, findDuplicate };

  const dialog = document.getElementById("addCandidate");
  const openButton = document.getElementById("addCandidateBtn");
  const closeButton = document.getElementById("closeAddCandidate");
  const form = document.getElementById("addCandidateForm");
  const status = document.getElementById("addCandidateStatus");
  if (!dialog || !openButton || !closeButton || !form || !status) return;

  const close = () => dialog.close();
  openButton.onclick = () => {
    form.reset();
    status.textContent = "";
    dialog.showModal();
    requestAnimationFrame(() => form.elements.artist.focus());
  };
  closeButton.onclick = close;
  dialog.addEventListener("click", event => {
    if (event.target !== dialog || !window.matchMedia("(min-width: 541px) and (hover: hover) and (pointer: fine)").matches) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });

  form.onsubmit = async event => {
    event.preventDefault();
    const values = new FormData(form);
    const payload = {
      action: "add",
      artist: String(values.get("artist") || "").trim(),
      title: String(values.get("title") || "").trim(),
      status: String(values.get("status") || "候補"),
      key: String(values.get("key") || "").trim(),
      reason: String(values.get("reason") || "").trim()
    };
    if (!payload.artist || !payload.title) return;

    const existing = findDuplicate(typeof data === "undefined" ? [] : data, payload.artist, payload.title);
    if (existing) {
      status.textContent = "登録済みです。既存の詳細を開きます";
      setTimeout(() => { close(); window.openDetail(existing); }, 450);
      return;
    }

    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    status.textContent = "登録中…";
    try {
      await window.SAK_UTA_SHEET_WRITE.submit(payload);
      const added = findDuplicate(typeof data === "undefined" ? [] : data, payload.artist, payload.title);
      if (!added) throw new Error("反映を確認できませんでした");
      status.textContent = "登録しました";
      setTimeout(() => { close(); window.openDetail(added); }, 450);
    } catch (error) {
      status.textContent = "登録できませんでした。再試行してください";
      button.disabled = false;
    }
  };
})();
