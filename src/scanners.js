// Stocks on the move widget (Home) + View all — states captured from the SAHI app, 9 Nov 2026.
// Wired from main.js via initScanners(ctx) so it shares the scanner data, filter/sort state and scalper entry.
export const INFO={pvb:["Stocks up 2.5% or more intraday with the volume, VWAP, range position and 15-minute trend already behind the move.","Stocks down 2.5% or more intraday with the volume, VWAP, range position and 15-minute trend already behind the move."],
 em:["Stocks up 1-3% intraday on 2x relative volume, whose latest 5-minute candle traded 2x its time-of-day norm. Each stays listed for an hour after it last qualified.","Stocks down 1-3% intraday on 2x relative volume, whose latest 5-minute candle traded 2x its time-of-day norm. Each stays listed for an hour after it last qualified."],
 orb:["Stocks trading above the 09:15–09:30 opening range after the first 5-minute close beyond it broke out on confirming volume and a trending 15-minute ADX.","Stocks trading below the 09:15–09:30 opening range after the first 5-minute close beyond it broke out on confirming volume and a trending 15-minute ADX."]};

export function initScanners(c){
  const {$,$$,S,SCAN,st,fmt,sign,pct,chgTxt,sorted,enterScalper,openFilter,filterDirty,appliedFilter,inWatch,toggleWatch,openPage}=c;
  // One-tap watchlist (founder feedback): a bookmark on every card/row. The card itself is a div[role=button] so the bookmark isn't a button inside a button.
  const wl=k=>`<button class="wl press" data-wl="${k}" aria-pressed="${inWatch(k)}" aria-label="${inWatch(k)?"Remove from":"Add to"} watchlist"><i class="i" aria-hidden="true">${inWatch(k)?"&#xe144;":"&#xe012;"}</i></button>`;
  const sc={scan:"pvb",dir:"bull"}; // Home widget only; the full page is the shared Stocks on the move component in main.js
  const items=()=>appliedFilter()["Relative volume"]==="≥ 10×"?[]:sorted(SCAN[sc.scan][sc.dir]);

  // deterministic 5-min path open→LTP, 09:15–14:50 (68 of 75 session bars)
  function series(k,range="1D"){
    let h=0; for(const ch of k+(range==="1D"?"":range)) h=(h*31+ch.charCodeAt(0))>>>0; const rnd=()=>((h=(h*1664525+1013904223)>>>0)/2**32);
    const [,l,chg]=S[k], o=l-chg, n=range==="1D"?68:75, p=[0], v=[];
    for(let i=1;i<n;i++) p.push(p[i-1]+(rnd()-.5)*1.6+(i<12?.9:0));
    const e=p[n-1];
    for(let i=0;i<n;i++){ p[i]=o+(p[i]-i/(n-1)*e)/(Math.abs(e)+8)*Math.abs(chg)*.6*Math.sign(chg||1)+i/(n-1)*chg; v.push(rnd()**3*(i<6||i>n-8?1.6:1)) }
    return {p,v,bo:8+Math.floor(rnd()*22)};
  }
  // o = chart-view settings from the Stocks on the move chart view: {type:"line|step|area|candle|heikin|hollow|renko", range:"1D|5D|1M|3M|1Y|5Y"}.
  // Without o (Home widget) it's the original 1D area chart.
  function chart(k,W,H,axis,o={}){
    const type=o.type||"area", range=o.range||"1D";
    const {p,v,bo}=series(k,range), col=S[k][2]>=0?"var(--candle-pos)":"var(--candle-neg)", n=75, aw=axis?W-40:W;
    const mn=Math.min(...p), mx=Math.max(...p), y=q=>8+(mx-q)/(mx-mn||1)*(H*.62), x=i=>i/(n-1)*aw, L=p.length-1, gid="g"+k+W;
    const pts=p.map((q,i)=>`${x(i).toFixed(1)},${y(q).toFixed(1)}`).join(" ");
    const bars=v.map((q,i)=>`<rect x="${(x(i)-1).toFixed(1)}" y="${(H-q*H*.28).toFixed(1)}" width="2" height="${(q*H*.28).toFixed(1)}" fill="${p[i]>=(i?p[i-1]:p[i])?"var(--candle-pos)":"var(--candle-neg)"}" opacity=".35"/>`).join("");
    const bx=x(bo), by=y(p[bo]), ly=y(p[L]);
    const ax=axis?[0,.5,1].map(t=>{const q=mx-(mx-mn)*t;return `<text x="${W-4}" y="${y(q)+4}" text-anchor="end" font-size="10" fill="var(--text-tertiary)">${q.toFixed(0)}</text>`}).join("")
      +`<line x1="${aw}" x2="${aw}" y1="0" y2="${H}" stroke="var(--border-L1)"/><rect x="${aw+2}" y="${ly-8}" width="36" height="16" rx="4" fill="${col}"/><text data-px="${k}" data-pf="1" x="${aw+20}" y="${ly+4}" text-anchor="middle" font-size="10" fill="var(--text-inverse-primary)">${S[k][1].toFixed(1)}</text>`:"";
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" font-family="SAHI Sans"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>${bars}
${marks(type,p,x,y,H,col,gid,pts,L)}
<line x1="${x(L)}" x2="${aw}" y1="${ly}" y2="${ly}" stroke="${col}" stroke-dasharray="4 4"/><circle cx="${x(L)}" cy="${ly}" r="3.5" fill="${col}"/>
${range==="1D"?`<polyline points="${bx},${by} ${bx+8},${by-12} ${bx+19},${by-12}" fill="none" stroke="var(--icon-primary)"/><circle cx="${bx}" cy="${by}" r="2.5" fill="var(--icon-primary)"/>
<circle cx="${bx+28}" cy="${by-12}" r="9" fill="var(--surface-L3)"/><text x="${bx+28}" y="${by-5.5}" text-anchor="middle" font-size="13" font-family="DlsIcons" fill="var(--icon-primary)">&#xe03b;</text>`:""}${ax}</svg>`;
  }
  // Price marks for each chart type. Candles are built from the same close path (open = previous close), so every type tells the same story.
  function marks(type,p,x,y,H,col,gid,pts,L){
    const line=`<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>`;
    if(type==="line") return line;
    if(type==="area") return `<polygon points="0,${H} ${pts} ${x(L)},${H}" fill="url(#${gid})"/>${line}`;
    if(type==="step") return `<polyline points="${p.map((q,i)=>i?`${x(i).toFixed(1)},${y(p[i-1]).toFixed(1)} ${x(i).toFixed(1)},${y(q).toFixed(1)}`:`${x(0)},${y(q).toFixed(1)}`).join(" ")}" fill="none" stroke="${col}" stroke-width="1.6"/>`;
    const sp=(Math.max(...p)-Math.min(...p))||1, cw=Math.max(1.6,(x(1)-x(0))*.62), up="var(--candle-pos)", dn="var(--candle-neg)";
    if(type==="renko"){ // fixed-size bricks, one per box move, spread across the plot
      const b=sp/14, br=[]; let last=p[0];
      for(const q of p){ while(q>=last+b){br.push([last,last+b,1]); last+=b} while(q<=last-b){br.push([last,last-b,0]); last-=b} }
      const n=Math.max(br.length,1), w=(x(L))/n;
      return br.map(([a,c,u],i)=>`<rect x="${(i*w+.5).toFixed(1)}" y="${y(Math.max(a,c)).toFixed(1)}" width="${Math.max(1,w-1).toFixed(1)}" height="${Math.max(1,Math.abs(y(a)-y(c))).toFixed(1)}" fill="${u?up:dn}"/>`).join("");
    }
    let c=p.map((q,i)=>{const o=i?p[i-1]:q, j=sp*.012*(1+((i*7919)%5)/4); return {o,c:q,h:Math.max(o,q)+j,l:Math.min(o,q)-j}});
    if(type==="heikin"){ const ha=[]; c.forEach((k,i)=>{const hc=(k.o+k.h+k.l+k.c)/4, ho=i?(ha[i-1].o+ha[i-1].c)/2:(k.o+k.c)/2; ha.push({o:ho,c:hc,h:Math.max(k.h,ho,hc),l:Math.min(k.l,ho,hc)})}); c=ha }
    return c.map((k,i)=>{const u=k.c>=k.o, f=u?up:dn, cx=x(i), t=y(Math.max(k.o,k.c)), bh=Math.max(1,Math.abs(y(k.o)-y(k.c))), hollow=type==="hollow"&&u;
      return `<line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${y(k.h).toFixed(1)}" y2="${y(k.l).toFixed(1)}" stroke="${f}"/><rect x="${(cx-cw/2).toFixed(1)}" y="${t.toFixed(1)}" width="${cw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${hollow?"var(--surface-L1)":f}"${hollow?` stroke="${f}" stroke-width="1"`:""}/>`}).join("");
  }
  const xAxis=t=>`<div class="sc-x">${t.map(s=>`<span>${s}</span>`).join("")}</div>`;
  const empty=`<div class="empty sc-empty"><span class="bl">No stocks match right now</span><span class="bs sec">Try another scanner or clear your filters.</span></div>`;
  const cls=k=>S[k][2]>=0?"pos":"neg";
  // Intraday scanner chart card (2×2 grid). ONE card for every Stocks on the move chart: Home widget, sheet and full page.
  // Rule: a lone card fills the row (full width, wider chart); two or more split into the 2×2 grid. Called as list.map(gridCard).
  const AXIS={"5D":["5 Nov","7 Nov","10 Nov"],"1M":["13 Oct","27 Oct","10 Nov"],"3M":["Aug","Sep","Oct","Nov"],"1Y":["Dec '25","Apr","Aug","Nov"],"5Y":["2022","2023","2024","2025","2026"]};
  // Heights match prod (SAHI 968 Watchlist chart view: card 264dp, chart + time axis 184dp at 411dp width): wide 340×150, half 160×142.
  const gridCard=(k,i,all,o)=>{const [n,l]=S[k], wide=!all||all.length===1;return `<div class="sc-card press${wide?" wide":""}" role="button" tabindex="0" data-sym="${k}"><span class="bm nm">${n}</span>${wl(k)}<span class="bm num lt" data-px="${k}">${fmt(l)}</span><span class="bs num ch ${cls(k)}" data-ch="${k}">${chgTxt(k)}</span>${wide?chart(k,340,150,false,o):chart(k,160,142,false,o)}${xAxis(o&&AXIS[o.range]?(wide?AXIS[o.range]:AXIS[o.range].slice(0,3)):wide?["Nov","11:15","13:15","15:15"]:["Nov","11:15","13:15"])}</div>`};
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
    $("#scwGrid").innerHTML=it.length?it.slice(0,4).map(gridCard).join(""):empty;
    $("#scwAll").hidden=!it.length;
    // The picked scanner becomes the list the chart's stock strip slides through, and what "Stocks on the move" opens on.
    $$("#scwGrid [data-wl]").forEach(b=>b.onclick=e=>{e.stopPropagation(); const k=b.dataset.wl, on=toggleWatch(k);
      // update in place (no re-render, so scroll and the chart SVGs stay put)
      $$(`[data-wl="${k}"]`).forEach(x=>{x.classList.toggle("on",on); x.setAttribute("aria-pressed",on); x.setAttribute("aria-label",(on?"Remove from":"Add to")+" watchlist"); x.firstElementChild.innerHTML=on?"&#xe144;":"&#xe012;";
        if(!matchMedia("(prefers-reduced-motion:reduce)").matches) x.firstElementChild.animate([{transform:"scale(.8)"},{transform:"scale(1)"}],{duration:200,easing:"cubic-bezier(.23,1,.32,1)"})})});
    $$("#scwGrid [role=button]").forEach(r=>r.onkeydown=e=>{if((e.key==="Enter"||e.key===" ")&&e.target===r){e.preventDefault(); r.click()}});
    $$("#scwGrid [data-sym]").forEach(r=>r.onclick=()=>{st.group=it; st.src="scan"; st.scan=sc.scan; st.dir=sc.dir; c.setBack("#home"); enterScalper(r.dataset.sym)});
  }
  $$(".sc-bb button").forEach(b=>b.onclick=()=>{sc.dir=b.dataset.d; hideTips(); render()});
  $$(".sc-tip .x").forEach(x=>x.onclick=()=>x.parentElement.hidden=true);
  $$("[data-filter]").forEach(b=>b.onclick=openFilter);
  // View all opens the shared Stocks on the move page on the scanner picked here.
  $("#scwAll").onclick=()=>{hideTips(); st.src="scan"; st.scan=sc.scan; st.dir=sc.dir; openPage()};
  render();
  render.chart=chart; render.xAxis=xAxis; render.gridCard=gridCard; // shared with Stocks on the move and the Watchlist chart view
  return render;
}
