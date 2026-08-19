(() => {
const E=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const S=n=>"★".repeat(Math.max(0,Math.min(5,+n||0)))+"☆".repeat(Math.max(0,5-(+n||0)));
const Y=x=>"https://www.youtube.com/results?search_query="+encodeURIComponent(`${x.artist} ${x.title}`);
const K=x=>`${x.artist}||${x.title}`;
window.openDetail=function(x){
 if(!x)return;
 const b=document.getElementById("detailBody"),f=document.getElementById("favBtn");
 f.textContent=(typeof favs!=="undefined"&&favs.has(K(x)))?"★":"☆";
 f.onclick=()=>{if(typeof toggleFav==="function")toggleFav(K(x));f.textContent=favs.has(K(x))?"★":"☆"};
 b.innerHTML=`<section class="sdHero"><div class="sdArt"><b>♫</b><span>${E(x.artist)}</span></div>
 <div class="sdTitle"><div><span class="badge">${E(x.status)}</span><h1>${E(x.title)}</h1><p>${E(x.artist)}</p></div><strong>${E(x.key||"—")}</strong></div></section>
 <section class="sdScores"><div>知名度<b>${S(x.fame)}</b></div><div>音域負荷<b>${S(x.load)}</b></div><div>自分らしさ<b>${S(x.identity)}</b></div></section>
 <section class="sdRows"><div><small>推奨キー</small><strong>${E(x.key||"—")}</strong></div>
 <article><small>選曲理由・おすすめポイント</small><p>${E(x.reason||"—")}</p></article>
 ${x.test?`<article><small>試唱結果</small><p>${E(x.test)}</p></article>`:""}
 ${x.retake?`<article><small>再録・再挑戦理由</small><p>${E(x.retake)}</p></article>`:""}</section>
 <section class="sdActions"><a href="${Y(x)}" target="_blank" rel="noopener noreferrer"><i>▶</i>YouTubeで聴く</a>
 <button class="primary" id="prepBtn">🎤 この曲を歌う・準備へ</button><button class="secondary" id="copyBtn">曲情報をコピー</button></section>
 <p class="sdNote">YouTubeで「${E(x.artist)} ${E(x.title)}」を検索します</p>`;
 document.getElementById("prepBtn").onclick=()=>typeof sendToPrep==="function"&&sendToPrep(x);
 document.getElementById("copyBtn").onclick=async e=>{await navigator.clipboard.writeText(`${x.title} / ${x.artist}\n推奨キー: ${x.key||"—"}`);e.currentTarget.textContent="コピーしました"};
 document.getElementById("detail").showModal();
};
})();