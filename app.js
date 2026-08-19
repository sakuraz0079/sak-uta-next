const PREP_APP_URL = window.SAK_UTA_CONFIG?.PREP_APP_URL || "";
const SHEET_CSV_URL = window.SAK_UTA_CONFIG?.SHEET_CSV_URL || "";

let data = Array.isArray(window.SAK_UTA_CANDIDATES) ? [...window.SAK_UTA_CANDIDATES] : [];
const fallbackData = [...data];
const state = {status:"すべて", mood:null, query:"", sort:"priority", favOnly:false};
const favs = new Set(JSON.parse(localStorage.getItem("sakUtaNextFavs") || "[]"));

const el = id => document.getElementById(id);
const stars = n => "★".repeat(Math.max(0,Math.min(5,n)))+"☆".repeat(Math.max(0,5-n));
const keyOf = x => `${x.artist}||${x.title}`;
const priorityScore = x => (x.status==="⭐有力"?30:0)+(x.identity*4)+(x.fame*2)-(x.load*.6);

function starCount(v){
  const s=String(v||"");
  const n=(s.match(/★/g)||[]).length;
  if(n) return Math.min(5,n);
  const num=parseInt(s,10);
  return Number.isFinite(num)?Math.max(0,Math.min(5,num)):0;
}

function parseCSV(text){
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){
      if(c==='"' && text[i+1]==='"'){ cell+='"'; i++; }
      else if(c==='"'){ quoted=false; }
      else cell+=c;
    }else{
      if(c==='"') quoted=true;
      else if(c===','){ row.push(cell); cell=""; }
      else if(c==='\n'){ row.push(cell); rows.push(row); row=[]; cell=""; }
      else if(c!=='\r') cell+=c;
    }
  }
  row.push(cell);
  if(row.some(v=>v!=="")) rows.push(row);
  return rows;
}

function sheetRowsToData(rows){
  if(!rows.length) return [];
  const header=rows[0].map(v=>String(v).trim());
  const idx=name=>header.indexOf(name);
  const indices={
    status:idx("ステータス"), artist:idx("アーティスト"), title:idx("曲名"),
    fame:idx("知名度"), load:idx("音域・負荷"), identity:idx("自分らしさ"),
    key:idx("推奨キー"), reason:idx("選曲理由"), test:idx("試唱結果"), retake:idx("再録理由")
  };
  return rows.slice(1).filter(r=>String(r[indices.title]||"").trim()).map(r=>({
    status:String(r[indices.status]||"候補").trim(),
    artist:String(r[indices.artist]||"").trim(),
    title:String(r[indices.title]||"").trim(),
    fame:starCount(r[indices.fame]),
    load:starCount(r[indices.load]),
    identity:starCount(r[indices.identity]),
    key:String(r[indices.key]||"").trim(),
    reason:String(r[indices.reason]||"").trim(),
    test:String(r[indices.test]||"").trim(),
    retake:String(r[indices.retake]||"").trim()
  }));
}

function setSyncStatus(text,cls=""){
  const s=el("syncStatus");
  if(!s) return;
  s.textContent=text;
  s.className=`syncStatus ${cls}`.trim();
}

async function syncFromSheet({silent=false}={}){
  if(!SHEET_CSV_URL){
    setSyncStatus("固定データ");
    return false;
  }
  if(!silent) setSyncStatus("同期中…","loading");
  try{
    const url=SHEET_CSV_URL + (SHEET_CSV_URL.includes("?")?"&":"?") + "_ts=" + Date.now();
    const res=await fetch(url,{cache:"no-store"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const text=await res.text();
    const next=sheetRowsToData(parseCSV(text));
    if(!next.length) throw new Error("データ0件");
    data=next;
    setSyncStatus(`同期済 ${next.length}曲`,"ok");
    render();
    return true;
  }catch(err){
    console.warn("Google Sheets sync failed:",err);
    if(!data.length) data=[...fallbackData];
    setSyncStatus("同期失敗","error");
    render();
    return false;
  }
}

function statuses(){
  return ["すべて", ...new Set(data.map(x=>x.status).filter(Boolean))];
}

function renderFilters(){
  el("statusFilters").innerHTML = statuses().map(s=>`<button class="${state.status===s?"active":""}" data-status="${s}">${s}</button>`).join("");
  el("statusFilters").querySelectorAll("button").forEach(b=>b.onclick=()=>{state.status=b.dataset.status;render();});
}

function matchesMood(x){
  if(!state.mood) return true;
  if(state.mood==="hot") return x.load>=4 && x.identity>=4;
  if(state.mood==="challenge") return x.load===4;
  if(state.mood==="easy") return x.load<=2;
  if(state.mood==="famous") return x.fame>=5;
  if(state.mood==="identity") return x.identity>=5;
  return true;
}

function filtered(){
  let arr = data.filter(x=>{
    const q = state.query.toLowerCase();
    const qok = !q || `${x.artist} ${x.title}`.toLowerCase().includes(q);
    const sok = state.status==="すべて" || x.status===state.status;
    const fok = !state.favOnly || favs.has(keyOf(x));
    return qok && sok && fok && matchesMood(x);
  });
  arr.sort((a,b)=>{
    if(state.sort==="fame") return b.fame-a.fame;
    if(state.sort==="loadAsc") return a.load-b.load;
    if(state.sort==="loadDesc") return b.load-a.load;
    if(state.sort==="identity") return b.identity-a.identity;
    return priorityScore(b)-priorityScore(a);
  });
  return arr;
}

function badgeClass(s){
  if(s.includes("挑戦")) return "challenge";
  if(s==="リクエスト") return "request";
  if(s.includes("再")) return "retry";
  return "";
}

function card(x){
  const f = favs.has(keyOf(x));
  return `<article class="card" data-k="${encodeURIComponent(keyOf(x))}">
    <div class="cardTop">
      <div>
        <span class="badge ${badgeClass(x.status)}">${x.status}</span>
        <div class="title">${x.title}</div>
        <div class="artist">${x.artist}</div>
      </div>
      <button class="favMini" data-fav="${encodeURIComponent(keyOf(x))}">${f?"★":"☆"}</button>
    </div>
    <div class="metrics">
      <div class="metric"><label>知名度</label><div class="stars">${stars(x.fame)}</div></div>
      <div class="metric"><label>音域負荷</label><div class="stars">${stars(x.load)}</div></div>
      <div class="metric"><label>自分らしさ</label><div class="stars">${stars(x.identity)}</div></div>
      <div class="keybox">${x.key||"—"}</div>
    </div>
  </article>`;
}

function render(){
  renderFilters();
  document.querySelectorAll(".mood button").forEach(b=>b.classList.toggle("active",b.dataset.mood===state.mood));
  const arr = filtered();
  el("count").textContent = `${arr.length}曲`;
  el("list").innerHTML = arr.map(card).join("") || `<div class="card">条件に合う曲がありません</div>`;
  el("list").querySelectorAll(".card").forEach(c=>c.onclick=e=>{
    if(e.target.closest(".favMini")) return;
    const k = decodeURIComponent(c.dataset.k); openDetail(data.find(x=>keyOf(x)===k));
  });
  el("list").querySelectorAll(".favMini").forEach(b=>b.onclick=e=>{e.stopPropagation();toggleFav(decodeURIComponent(b.dataset.fav));});
}

function toggleFav(k){
  favs.has(k)?favs.delete(k):favs.add(k);
  localStorage.setItem("sakUtaNextFavs",JSON.stringify([...favs]));
  render();
}

function openDetail(x){
  const f=favs.has(keyOf(x));
  el("favBtn").textContent=f?"★":"☆";
  el("favBtn").onclick=()=>{toggleFav(keyOf(x));el("favBtn").textContent=favs.has(keyOf(x))?"★":"☆";};
  el("detailBody").innerHTML=`
    <div class="detailHero">
      <span class="badge ${badgeClass(x.status)}">${x.status}</span>
      <h1>${x.title}</h1>
      <div class="artist">${x.artist}</div>
    </div>
    <div class="detailMetrics">
      <div class="metric"><label>知名度</label><div class="stars">${stars(x.fame)}</div></div>
      <div class="metric"><label>音域負荷</label><div class="stars">${stars(x.load)}</div></div>
      <div class="metric"><label>自分らしさ</label><div class="stars">${stars(x.identity)}</div></div>
    </div>
    <div class="detailSection"><h3>推奨キー</h3><p>${x.key||"—"}</p></div>
    <div class="detailSection"><h3>選曲理由</h3><p>${x.reason||"—"}</p></div>
    ${x.test?`<div class="detailSection"><h3>試唱結果</h3><p>${x.test}</p></div>`:""}
    ${x.retake?`<div class="detailSection"><h3>再録・再挑戦理由</h3><p>${x.retake}</p></div>`:""}
    <div class="actions">
      <button class="primary" id="prepBtn">▶ 歌うと決めた・準備アプリへ</button>
      <button class="secondary" id="copyBtn">曲情報をコピー</button>
    </div>`;
  el("prepBtn").onclick=()=>sendToPrep(x);
  el("copyBtn").onclick=async()=>{await navigator.clipboard.writeText(`${x.title} / ${x.artist}\n推奨キー: ${x.key}`);el("copyBtn").textContent="コピーしました";};
  el("detail").showModal();
}

function sendToPrep(x){
  const params=new URLSearchParams({title:x.title,artist:x.artist,key:x.key,status:x.status});
  if(PREP_APP_URL){ location.href = `${PREP_APP_URL}${PREP_APP_URL.includes("?")?"&":"?"}${params}`; }
  else{
    navigator.clipboard?.writeText(`${x.title} / ${x.artist}\n推奨キー: ${x.key}`);
    alert("準備アプリURLが未設定です。\n曲情報をコピーしました。");
  }
}

el("search").oninput=e=>{state.query=e.target.value;render();};
el("sort").onchange=e=>{state.sort=e.target.value;render();};
document.querySelectorAll(".mood button").forEach(b=>b.onclick=()=>{state.mood=state.mood===b.dataset.mood?null:b.dataset.mood;render();});
el("favOnly").onclick=()=>{state.favOnly=!state.favOnly;el("favOnly").classList.toggle("active",state.favOnly);render();};
el("filterJump").onclick=()=>el("statusFilters").scrollIntoView({behavior:"smooth",block:"center"});
el("moodJump").onclick=()=>document.querySelector(".mood").scrollIntoView({behavior:"smooth",block:"center"});
el("closeDetail").onclick=()=>el("detail").close();
el("infoBtn").onclick=()=>el("info").showModal();
el("closeInfo").onclick=()=>el("info").close();
el("syncBtn").onclick=()=>syncFromSheet();

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
render();
syncFromSheet();
