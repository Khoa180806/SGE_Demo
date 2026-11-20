/* ===== Minimal SVG charts (theme-aware via CSS classes) ===== */
const Charts = (()=>{
  const e = s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function niceMax(v){ if(v<=0) return 1; const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p; const m=n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10; return m*p; }
  const fmtShort = v => v>=1e9?(v/1e9).toFixed(1).replace('.0','')+'B':v>=1e6?(v/1e6).toFixed(1).replace('.0','')+'M':v>=1e3?(v/1e3).toFixed(v>=1e4?0:1).replace('.0','')+'k':String(Math.round(v*10)/10);

  /* vertical bars. opts: {labels, values, colors?|color, h, rotate, onClickAttr(i), fmt} */
  function bars(o){
    const W=640, H=o.h||260, padL=44, padR=10, padT=22, padB=o.rotate?74:34;
    const n=o.values.length, max=niceMax(Math.max(...o.values,1)), iw=W-padL-padR, ih=H-padT-padB;
    const bw=Math.min(34, iw/n*0.55), step=iw/n;
    let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${e(o.title||'')}">`;
    for(let k=0;k<=4;k++){ const y=padT+ih-ih*k/4; s+=`<line class="grid" x1="${padL}" x2="${W-padR}" y1="${y}" y2="${y}"/><text x="${padL-8}" y="${y+4}" text-anchor="end">${e((o.fmt||fmtShort)(max*k/4))}</text>`; }
    o.values.forEach((v,i)=>{
      const x=padL+step*i+step/2, h=ih*v/max, y=padT+ih-h;
      const col = o.colors? o.colors[i] : (o.color||'var(--blue)');
      const attr = o.attr? o.attr(i) : '';
      s+=`<rect class="bar" x="${x-bw/2}" y="${y}" width="${bw}" height="${Math.max(h,v>0?2:0)}" rx="3" fill="${col}" ${attr}><title>${e(o.labels[i])}: ${e((o.fmtVal||String)(v))}</title></rect>`;
      if(o.showVals!==false) s+=`<text class="val" x="${x}" y="${y-6}" text-anchor="middle">${e((o.fmtVal||fmtShort)(v))}</text>`;
      if(o.rotate) s+=`<text x="${x+4}" y="${padT+ih+14}" text-anchor="end" transform="rotate(-35 ${x+4} ${padT+ih+14})">${e(o.labels[i])}</text>`;
      else s+=`<text x="${x}" y="${padT+ih+18}" text-anchor="middle">${e(o.labels[i])}</text>`;
    });
    s+=`<line class="axis" x1="${padL}" x2="${W-padR}" y1="${padT+ih}" y2="${padT+ih}"/></svg>`;
    return `<div class="chart">${s}</div>`;
  }

  /* stacked vertical bars. o: {labels, series:[{name,color,values}], fmt} */
  function stacked(o){
    const W=o.w||640,H=o.h||280,padL=52,padR=10,padT=16,padB=34;
    const n=o.labels.length, tot=o.labels.map((_,i)=>o.series.reduce((s,se)=>s+se.values[i],0));
    const max=niceMax(Math.max(...tot,1)), iw=W-padL-padR, ih=H-padT-padB, step=iw/n, bw=Math.min(36,step*0.6);
    let s=`<svg viewBox="0 0 ${W} ${H}" role="img">`;
    for(let k=0;k<=4;k++){ const y=padT+ih-ih*k/4; s+=`<line class="grid" x1="${padL}" x2="${W-padR}" y1="${y}" y2="${y}"/><text x="${padL-8}" y="${y+4}" text-anchor="end">${e((o.fmt||fmtShort)(max*k/4))}</text>`; }
    o.labels.forEach((l,i)=>{
      const x=padL+step*i+step/2; let acc=0;
      o.series.forEach(se=>{ const v=se.values[i]; if(!v) return; const h=ih*v/max; const y=padT+ih-ih*(acc+v)/max; acc+=v;
        s+=`<rect class="bar" x="${x-bw/2}" y="${y}" width="${bw}" height="${h}" fill="${se.color}" stroke="var(--surface)" stroke-width="1"><title>${e(l)} · ${e(se.name)}: ${e((o.fmtVal||fmtShort)(v))}</title></rect>`; });
      s+=`<text x="${x}" y="${padT+ih+18}" text-anchor="middle">${e(l)}</text>`;
      if(tot[i]) s+=`<text class="val" x="${x}" y="${padT+ih-ih*tot[i]/max-6}" text-anchor="middle">${e(fmtShort(tot[i]))}</text>`;
    });
    s+=`<line class="axis" x1="${padL}" x2="${W-padR}" y1="${padT+ih}" y2="${padT+ih}"/></svg>`;
    return `<div class="chart">${s}</div><div class="legend" style="margin-top:8px">${o.series.map(se=>`<span><i style="background:${se.color}"></i>${e(se.name)}</span>`).join('')}</div>`;
  }

  /* line chart. o:{labels, series:[{name,color,values}], fmt, area} */
  function line(o){
    const W=640,H=o.h||250,padL=44,padR=16,padT=18,padB=34;
    const all=o.series.flatMap(s=>s.values.filter(v=>v!=null));
    const max=niceMax(Math.max(...all,1)), n=o.labels.length, iw=W-padL-padR, ih=H-padT-padB;
    const X=i=>padL+(n===1?iw/2:iw*i/(n-1)), Y=v=>padT+ih-ih*v/max;
    let s=`<svg viewBox="0 0 ${W} ${H}" role="img">`;
    for(let k=0;k<=4;k++){ const y=padT+ih-ih*k/4; s+=`<line class="grid" x1="${padL}" x2="${W-padR}" y1="${y}" y2="${y}"/><text x="${padL-8}" y="${y+4}" text-anchor="end">${e((o.fmt||fmtShort)(max*k/4))}</text>`; }
    o.labels.forEach((l,i)=>{ s+=`<text x="${X(i)}" y="${padT+ih+18}" text-anchor="middle">${e(l)}</text>`; });
    o.series.forEach((se,si)=>{
      const pts=se.values.map((v,i)=>v==null?null:[X(i),Y(v)]).filter(Boolean);
      if(!pts.length) return;
      if(o.area && si===0) s+=`<path d="M${pts[0][0]},${padT+ih} ${pts.map(p=>'L'+p[0]+','+p[1]).join(' ')} L${pts[pts.length-1][0]},${padT+ih}Z" fill="${se.color}" opacity=".12"/>`;
      s+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${se.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      se.values.forEach((v,i)=>{ if(v==null) return; const last=i===se.values.length-1; s+=`<circle cx="${X(i)}" cy="${Y(v)}" r="${last?4.5:3}" fill="${last?se.color:'var(--surface)'}" stroke="${se.color}" stroke-width="2"><title>${e(o.labels[i])} · ${e(se.name)}: ${e((o.fmtVal||fmtShort)(v))}</title></circle>`; });
    });
    s+=`</svg>`;
    return `<div class="chart">${s}</div>${o.series.length>1?`<div class="legend" style="margin-top:8px">${o.series.map(se=>`<span><i style="background:${se.color}"></i>${e(se.name)}</span>`).join('')}</div>`:''}`;
  }

  /* donut. o:{items:[{label,value,color}], center, sub} */
  function donut(o){
    const tot=o.items.reduce((s,x)=>s+x.value,0)||1, R=80, r=52, C=100;
    let a=-Math.PI/2, s=`<svg viewBox="0 0 200 200" role="img">`;
    o.items.forEach(it=>{
      if(!it.value) return;
      const frac=it.value/tot, a2=a+frac*Math.PI*2-(frac===1?0.0001:0);
      const large=a2-a>Math.PI?1:0;
      const p=(ang,rad)=>[C+rad*Math.cos(ang),C+rad*Math.sin(ang)];
      const [x1,y1]=p(a,R),[x2,y2]=p(a2,R),[x3,y3]=p(a2,r),[x4,y4]=p(a,r);
      s+=`<path d="M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${large} 0 ${x4},${y4}Z" fill="${it.color}" stroke="var(--surface)" stroke-width="2"><title>${e(it.label)}: ${it.value} (${(frac*100).toFixed(1)}%)</title></path>`;
      a=a2;
    });
    s+=`<text class="donut-center" x="100" y="102" text-anchor="middle">${e(o.center!=null?o.center:tot)}</text><text class="donut-sub" x="100" y="120" text-anchor="middle">${e(o.sub||'')}</text></svg>`;
    const leg=o.items.map(it=>`<span><span><i style="background:${it.color}"></i>${e(it.label)}</span><b class="num">${it.value} <small class="muted">${(it.value/tot*100).toFixed(0)}%</small></b></span>`).join('');
    return `<div class="donut-wrap chart">${s}<div class="legend">${leg}</div></div>`;
  }

  /* horizontal bars list (HTML) o:{items:[{label,value,sub}], fmt, color} */
  function hbars(o){
    const max=Math.max(...o.items.map(x=>x.value),0.0001);
    return `<div style="display:flex;flex-direction:column;gap:10px">${o.items.map(it=>`
      <div style="display:grid;grid-template-columns:minmax(90px,150px) minmax(0,1fr) auto;gap:10px;align-items:center;font-size:13px">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e(it.label)}">${e(it.label)}</span>
        <span style="background:var(--surface-3);border-radius:4px;height:10px;overflow:hidden"><span style="display:block;height:100%;width:${Math.max(1.5,it.value/max*100)}%;background:${it.color||o.color||'var(--accent)'};border-radius:4px"></span></span>
        <b class="num" style="font-weight:600;min-width:48px;text-align:right">${e(o.fmt?o.fmt(it.value):it.value)}${it.sub?` <small class="muted" style="font-weight:400">${e(it.sub)}</small>`:''}</b>
      </div>`).join('')}</div>`;
  }
  return { bars, stacked, line, donut, hbars, fmtShort };
})();
