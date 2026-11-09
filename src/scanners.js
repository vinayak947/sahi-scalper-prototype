// Stocks on the move widget (Home) + View all — states captured from the SAHI app, 9 Nov 2026.
// Wired from main.js via initScanners(ctx) so it shares the scanner data, filter/sort state and scalper entry.
const INFO={pvb:["Stocks up 2.5% or more intraday with the volume, VWAP, range position and 15-minute trend already behind the move.","Stocks down 2.5% or more intraday with the volume, VWAP, range position and 15-minute trend already behind the move."],
 em:["Stocks up 1-3% intraday on 2x relative volume, whose latest 5-minute candle traded 2x its time-of-day norm. Each stays listed for an hour after it last qualified.","Stocks down 1-3% intraday on 2x relative volume, whose latest 5-minute candle traded 2x its time-of-day norm. Each stays listed for an hour after it last qualified."],
 orb:["Stocks trading above the 09:15–09:30 opening range after the first 5-minute close beyond it broke out on confirming volume and a trending 15-minute ADX.","Stocks trading below the 09:15–09:30 opening range after the first 5-minute close beyond it broke out on confirming volume and a trending 15-minute ADX."]};

export function initScanners(c){
  const {$,$$,S,SCAN,st,fmt,sign,pct,chgTxt,sorted,bindSeg,placeThumb,enterScalper,openFilter,filterDirty,appliedFilter,inWatch,toggleWatch}=c;
  // One-tap watchlist (founder feedback): a bookmark on every card/row. The card itself is a div[role=button] so the bookmark isn't a button inside a button.
  const wl=k=>`<button class="wl press" data-wl="${k}" aria-pressed="${inWatch(k)}" aria-label="${inWatch(k)?"Remove from":"Add to"} watchlist"><i class="i" aria-hidden="true">${inWatch(k)?"&#xe144;":"&#xe012;"}</i></button>`;
  const sc={scan:"pvb",dir:"bull",view:"chart"};
  const items=()=>appliedFilter()["Relative volume"]==="≥ 10×"?[]:sorted(SCAN[sc.scan][sc.dir]);

  // deterministic 5-min path open→LTP, 09:15–14:50 (68 of 75 session bars)
  function series(k){
    let h=0; for(const ch of k) h=(h*31+ch.charCodeAt(0))>>>0; const rnd=()=>((h=(h*1664525+1013904223)>>>0)/2**32);
    const [,l,chg]=S[k], o=l-chg, n=68, p=[0], v=[];
    for(let i=1;i<n;i++) p.push(p[i-1]+(rnd()-.5)*1.6+(i<12?.9:0));
    const e=p[n-1];
    for(let i=0;i<n;i++){ p[i]=o+(p[i]-i/(n-1)*e)/(Math.abs(e)+8)*Math.abs(chg)*.6*Math.sign(chg||1)+i/(n-1)*chg; v.push(rnd()**3*(i<6||i>n-8?1.6:1)) }
    return {p,v,bo:8+Math.floor(rnd()*22)};
  }
  function chart(k,W,H,axis){
    const {p,v,bo}=series(k), col=S[k][2]>=0?"var(--candle-pos)":"var(--candle-neg)", n=75, aw=axis?W-40:W;
    const mn=Math.min(...p), mx=Math.max(...p), y=q=>8+(mx-q)/(mx-mn||1)*(H*.62), x=i=>i/(n-1)*aw, L=p.length-1, gid="g"+k+W;
    const pts=p.map((q,i)=>`${x(i).toFixed(1)},${y(q).toFixed(1)}`).join(" ");
    const bars=v.map((q,i)=>`<rect x="${(x(i)-1).toFixed(1)}" y="${(H-q*H*.28).toFixed(1)}" width="2" height="${(q*H*.28).toFixed(1)}" fill="${p[i]>=(i?p[i-1]:p[i])?"var(--candle-pos)":"var(--candle-neg)"}" opacity=".35"/>`).join("");
    const bx=x(bo), by=y(p[bo]), ly=y(p[L]);
    const ax=axis?[0,.5,1].map(t=>{const q=mx-(mx-mn)*t;return `<text x="${W-4}" y="${y(q)+4}" text-anchor="end" font-size="10" fill="var(--text-tertiary)">${q.toFixed(0)}</text>`}).join("")
      +`<line x1="${aw}" x2="${aw}" y1="0" y2="${H}" stroke="var(--border-L1)"/><rect x="${aw+2}" y="${ly-8}" width="36" height="16" rx="4" fill="${col}"/><text x="${aw+20}" y="${ly+4}" text-anchor="middle" font-size="10" fill="var(--text-inverse-primary)">${p[L].toFixed(1)}</text>`:"";
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" font-family="SAHI Sans"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>${bars}
<polygon points="0,${H} ${pts} ${x(L)},${H}" fill="url(#${gid})"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>
<line x1="${x(L)}" x2="${aw}" y1="${ly}" y2="${ly}" stroke="${col}" stroke-dasharray="4 4"/><circle cx="${x(L)}" cy="${ly}" r="3.5" fill="${col}"/>
<polyline points="${bx},${by} ${bx+8},${by-12} ${bx+19},${by-12}" fill="none" stroke="var(--icon-primary)"/><circle cx="${bx}" cy="${by}" r="2.5" fill="var(--icon-primary)"/>
<circle cx="${bx+28}" cy="${by-12}" r="9" fill="var(--surface-L3)"/><text x="${bx+28}" y="${by-5.5}" text-anchor="middle" font-size="13" font-family="DlsIcons" fill="var(--icon-primary)">&#xe03b;</text>${ax}</svg>`;
  }
  const xAxis=t=>`<div class="sc-x">${t.map(s=>`<span>${s}</span>`).join("")}</div>`;
  const empty=`<div class="empty sc-empty"><span class="bl">No stocks match right now</span><span class="bs sec">Try another scanner or clear your filters.</span></div>`;
  const cls=k=>S[k][2]>=0?"pos":"neg";
  const hideTips=()=>$$(".sc-tip").forEach(x=>x.hidden=true);

  function render(){
    const it=items(), dirty=filterDirty();
    $$(".sc-tabs").forEach(el=>{
      el.innerHTML=Object.entries(SCAN).map(([k,v])=>`<button class="tab${k===sc.scan?" on":""}" data-k="${k}">${v.name}${k===sc.scan?'<i class="i info" data-info="1" aria-label="About this scanner">&#xe065;</i>':""}</button>`).join("");
      el.querySelectorAll(".tab").forEach(t=>t.onclick=e=>{
        const tip=el.parentElement.querySelector(".sc-tip");
        if(e.target.dataset.info){ tip.querySelector(".tx").innerHTML=INFO[sc.scan][sc.dir==="bull"?0:1]+`<br><br>Sorted by intraday change, biggest ${sc.dir==="bull"?"gainers":"losers"} first.`; tip.style.top=(el.offsetTop+el.offsetHeight+4)+"px"; tip.hidden=false; return }
        sc.scan=t.dataset.k; hideTips(); render(); el.querySelector(".tab.on").scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"});
      });
    });
    $$(".sc-bb button").forEach(b=>b.classList.toggle("on",b.dataset.d===sc.dir));
    $$("[data-filter] .dot").forEach(d=>d.hidden=!dirty);
    $("#scwGrid").innerHTML=it.length?it.slice(0,4).map(k=>{const [n,l]=S[k];return `<div class="sc-card press" role="button" tabindex="0" data-sym="${k}"><span class="bl nm">${n}</span>${wl(k)}<span class="bm num lt">${fmt(l)}</span><span class="bm num ch ${cls(k)}">${chgTxt(k)}</span>${chart(k,160,150)}${xAxis(["Nov","11:15","13:15"])}</div>`}).join(""):empty;
    $("#scwAll").hidden=!it.length;
    $$("[data-chartonly]").forEach(e=>e.hidden=sc.view!=="chart");
    $("#saBody").innerHTML=!it.length?empty
      :sc.view==="chart"?it.map(k=>{const [n,l]=S[k];return `<div class="sa-card press" role="button" tabindex="0" data-sym="${k}"><span class="hd"><span class="bl">${n}</span><span class="tags"><span class="bxx tf">5m</span>${wl(k)}</span></span><span class="bl num">${fmt(l)} <span class="bm ${cls(k)}">${chgTxt(k)}</span> <span class="bm sec">today</span></span>${chart(k,340,170,1)}${xAxis(["Nov","11:15","13:15","15:15"])}</div>`}).join("")
      :sc.view==="list"?it.map(k=>{const [n,l]=S[k];return `<div class="row" role="button" tabindex="0" data-sym="${k}"><span class="l"><span class="bm">${n}</span><span class="bs ter">NSE</span></span><span class="r"><span class="bmb num">${fmt(l)}</span><span class="bs num ${cls(k)}">${chgTxt(k)}</span></span>${wl(k)}</div>`}).join("")
      :`<div style="overflow-x:auto"><table class="sa-tbl bm"><tr class="bs"><th>Instrument</th><th>LTP</th><th>Change</th><th>Change %</th></tr>${it.map(k=>`<tr data-sym="${k}"><td>${k}</td><td class="num">${fmt(S[k][1])}</td><td class="num ${cls(k)}">${sign(S[k][2])}</td><td class="num ${cls(k)}">${S[k][2]<0?"-":""}${pct(k).toFixed(2)}%</td></tr>`).join("")}</table></div>`;
    // The picked scanner becomes the list the chart's stock strip slides through, and what "Stocks on the move" opens on.
    $$("#scwGrid [data-wl],#saBody [data-wl]").forEach(b=>b.onclick=e=>{e.stopPropagation(); const k=b.dataset.wl, on=toggleWatch(k);
      // update in place (no re-render, so scroll and the chart SVGs stay put)
      $$(`[data-wl="${k}"]`).forEach(x=>{x.classList.toggle("on",on); x.setAttribute("aria-pressed",on); x.setAttribute("aria-label",(on?"Remove from":"Add to")+" watchlist"); x.firstElementChild.innerHTML=on?"&#xe144;":"&#xe012;";
        if(!matchMedia("(prefers-reduced-motion:reduce)").matches) x.firstElementChild.animate([{transform:"scale(.8)"},{transform:"scale(1)"}],{duration:200,easing:"cubic-bezier(.23,1,.32,1)"})})});
    $$("#scwGrid [role=button],#saBody [role=button]").forEach(r=>r.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&e.target===r){e.preventDefault(); r.click()}});
    $$("#scwGrid [data-sym],#saBody [data-sym]").forEach(r=>r.onclick=()=>{st.group=it; st.src="scan"; st.scan=sc.scan; st.dir=sc.dir; c.setBack($("#scanAll").hidden?"#home":"#scanAll"); enterScalper(r.dataset.sym)});
  }
  $$(".sc-bb button").forEach(b=>b.onclick=()=>{sc.dir=b.dataset.d; hideTips(); render()});
  $$(".sc-tip .x").forEach(x=>x.onclick=()=>x.parentElement.hidden=true);
  $$("[data-filter]").forEach(b=>b.onclick=openFilter);
  // One full page, two entry points, both titled "Stocks on the move": Home "View all" and Trade → Stock Scalper.
  function openAll(from){
    hideTips();
    $("#saTitle").textContent="Stocks on the move";
    $("#home").hidden=true; $("#scanAll").hidden=false; $("#saBody").scrollTop=0; render(); placeThumb($("#saView"));
  }
  $("#scwAll").onclick=()=>openAll("home");
  $("#saBack").onclick=()=>{hideTips(); $("#scanAll").hidden=true; $("#home").hidden=false};
  bindSeg($("#saView"),v=>{sc.view=v; render()});
  render();
  render.openAll=openAll;
  // Coming back from the chart: if the scanner was changed in "Stocks on the move", show that one here too.
  render.syncFromScalper=()=>{ if(st.src==="scan"&&(st.scan!==sc.scan||st.dir!==sc.dir)){sc.scan=st.scan; sc.dir=st.dir; render()} };
  return render;
}
