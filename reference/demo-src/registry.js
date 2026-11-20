/* ===== Official warranty registry (All SN list from "Tra cứu tình trạng bảo hành 20July2026.xlsx") ===== */
const REG = { ready:false, failed:false, map:null, meta:null, count:0, list:null };
const REG_SAMPLES = ['A2460702017','A1911110689','A2010043174'];
async function loadRegistry(){
  if(!REGISTRY_B64){ REG.ready=true; REG.map=new Map(); REG.meta={src:'',c:[],p:[],n:[],k:[],t:[]}; REG.count=0; return; }
  try{
    const bin=Uint8Array.from(atob(REGISTRY_B64),c=>c.charCodeAt(0));
    const txt=await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const o=JSON.parse(txt); const map=new Map();
    o.rows.split('\n').forEach(l=>{ const i=l.indexOf('\t'); map.set(l.slice(0,i), l); });
    delete o.rows; REG.meta=o; REG.map=map; REG.count=map.size; REG.ready=true;
  }catch(e){ REG.failed=true; console.warn('registry load failed',e); }
  if(S && (S.active==='lookup'||S.active==='catalog'||S.publicView==='lookup'||S.active==='new')) rerender();
}
function modelFromName(name){
  const m=String(name||'').match(/(SG|SH|MG|SR|SBR|SBP|PVS|MVS|COM|WiNet|EyeM|WiFi)[A-Za-z0-9.]*(?:-[A-Za-z0-9.]+)*/);
  if(!m) return String(name||'').split('_').pop()||'—';
  return m[0].replace(/-V\d.*$/,'').replace(/-CN$/,'');
}
function addYears(ts,y){ const d=new Date(ts); d.setFullYear(d.getFullYear()+y); return d.getTime(); }
function regRecord(line){
  const [sn,c,p,n,st,bl,y,k,tt]=line.split('\t'); const M=REG.meta; const base=Date.UTC(2015,0,1), DAY=864e5;
  const name=M.n[+n]||''; const start=st?base+(+st)*DAY:null; const ship=bl?base+(+bl)*DAY:(start?start-92*DAY:null);
  return { sn, source:'registry', company:M.c[+c]||'', pn:M.p[+p]||'', productName:name, model:modelFromName(name), startDate:start, shipDate:ship, installDate:null,
    warrantyYears:+y||5, extended:(+y||5)>=10, pkg:M.k[+k]||'', note:tt?(M.t[+tt]||''):'', distributorId:distForCompany(M.c[+c]||''), customerId:null, project:'', province:'' };
}
function distForCompany(name){ const n=' '+String(name||'').toUpperCase()+' '; const d=DISTRIBUTORS.find(d=>(d.aliases||[]).some(a=>{ const k=String(a||'').trim().toUpperCase(); return k && (n.includes(' '+k+' ')||n.startsWith(' '+k)); })); return d?d.id:null; }
function regBySn(sn){ if(!REG.ready||!sn) return null; const l=REG.map.get(String(sn).trim().toUpperCase()); return l?regRecord(l):null; }
function regAll(){ if(!REG.ready) return []; if(!REG.list){ REG.list=[]; REG.map.forEach(l=>REG.list.push(regRecord(l))); } return REG.list; }
