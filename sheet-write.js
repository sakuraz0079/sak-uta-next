(() => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  window.SAK_UTA_SHEET_WRITE = {
    isReady() {
      return Boolean(window.SAK_UTA_CONFIG?.SHEET_WRITE_URL);
    },

    async submit(payload) {
      const url = window.SAK_UTA_CONFIG?.SHEET_WRITE_URL || "";
      if (!url) throw new Error("保存先が未設定です");

      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams(payload)
      });

      await wait(900);
      if (typeof window.syncFromSheet === "function") await window.syncFromSheet();
    }
  };
})();
