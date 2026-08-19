
const PREP_APP_URL = window.SAK_UTA_CONFIG?.PREP_APP_URL || "";

const data = window.SAK_UTA_CANDIDATES || [];
const state = {status:"すべて", mood:null, query:"", sort:"priority", favOnly:false};
const favs = new Set(JSON.parse(localStorage.getItem("sakUtaNextFavs") || "[]"));
const statuses = ["すべて", ...new Set(data.map(x=>x.status))];

const el = id => document.getElementById(id);
const stars = n => "★".repeat(n)+"☆".repeat(5-n);
const keyOf = x => `${x.artist}||${x.title}`;
const priorityScore = x => (x.status==="⭐有力"?30:0)+(x.identity*4)+(x.fame*2)-(x.load*.6);

function renderFilters(){
  el("statusFilters").innerHTML = statuses.map(s=>`<button class="${state.status===s?"active":""}" data-status="${s}">${s}</button>`).join("");
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
      <div class="keybox">${x.key}</div>
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
    <div class="detailSection"><h3>推奨キー</h3><p>${x.key}</p></div>
    <div class="detailSection"><h3>選曲理由</h3><p>${x.reason||""}</p></div>
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
    alert("準備アプリURLが未設定です。\n曲情報をコピーしました。\n\napp.js の PREP_APP_URL に準備アプリURLを設定すると直接連携できます。");
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

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
render();
