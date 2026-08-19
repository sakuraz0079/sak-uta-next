(() => {
  const url = window.SAK_UTA_CONFIG?.SHEET_GVIZ_URL || "";
  if (!url) return;

  const starCount2 = v => {
    const s=String(v||"");
    const n=(s.match(/★/g)||[]).length;
    if(n) return Math.min(5,n);
    const num=parseInt(s,10);
    return Number.isFinite(num)?Math.max(0,Math.min(5,num)):0;
  };

  const fromTable = table => {
    const h=table.cols.map(c=>String(c.label||"").trim()), ix=n=>h.indexOf(n);
    const I={
      status:ix("ステータス"),
      artist:ix("アーティスト"),
      title:ix("曲名"),
      fame:ix("知名度"),
      load:ix("音域・負荷"),
      identity:ix("自分らしさ"),
      key:ix("推奨キー"),
      reason:ix("選曲理由"),
      test:ix("試唱結果"),
      retake:ix("再録理由")
    };

    const v=(r,i)=>i<0?"":(r.c?.[i]?.f ?? r.c?.[i]?.v ?? "");

    return table.rows
      .filter(r=>String(v(r,I.title)).trim())
      .map(r=>({
        status:String(v(r,I.status)||"候補").trim(),
        artist:String(v(r,I.artist)||"").trim(),
        title:String(v(r,I.title)||"").trim(),
        fame:starCount2(v(r,I.fame)),
        load:starCount2(v(r,I.load)),
        identity:starCount2(v(r,I.identity)),
        key:String(v(r,I.key)||"").trim(),
        reason:String(v(r,I.reason)||"").trim(),
        test:String(v(r,I.test)||"").trim(),
        retake:String(v(r,I.retake)||"").trim()
      }));
  };

  window.syncFromSheet = function(){
    if(typeof setSyncStatus==="function"){
      setSyncStatus("同期中…","loading");
    }

    return new Promise(resolve=>{
      const cb="__sakUtaGviz_"+Date.now()+"_"+Math.floor(Math.random()*9999);
      const s=document.createElement("script");

      const done=(ok,err)=>{
        clearTimeout(timer);
        try{ delete window[cb]; }catch(e){}
        s.remove();

        if(!ok){
          console.warn("Google Sheets JSONP sync failed:", err);
          if(typeof setSyncStatus==="function"){
            setSyncStatus("同期失敗","error");
          }
        }
        resolve(ok);
      };

      const timer=setTimeout(
        ()=>done(false,new Error("timeout")),
        12000
      );

      window[cb]=res=>{
        try{
          if(!res || res.status==="error"){
            throw new Error("GViz error");
          }

          const next=fromTable(res.table);
          if(!next.length){
            throw new Error("0 rows");
          }

          data.splice(0,data.length,...next);

          if(typeof setSyncStatus==="function"){
            setSyncStatus(`同期済 ${next.length}曲`,"ok");
          }

          if(typeof render==="function"){
            render();
          }

          done(true);
        }catch(e){
          done(false,e);
        }
      };

      s.src = url
        + (url.includes("?") ? "&" : "?")
        + "tqx=responseHandler:" + cb
        + "&_ts=" + Date.now();

      s.onerror=()=>done(false,new Error("script load error"));
      document.head.appendChild(s);
    });
  };

  const btn=document.getElementById("syncBtn");
  if(btn){
    btn.onclick=()=>window.syncFromSheet();
  }

  window.syncFromSheet();
})();
