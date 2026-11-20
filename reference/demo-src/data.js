/* ===== Mock data generator (deterministic) ===== */
const PROVINCES = ['Hà Nội','Huế','Quảng Ninh','Cao Bằng','Lạng Sơn','Lai Châu','Điện Biên','Sơn La','Thanh Hóa','Nghệ An','Hà Tĩnh','Tuyên Quang','Lào Cai','Thái Nguyên','Phú Thọ','Bắc Ninh','Hưng Yên','Hải Phòng','Ninh Bình','Quảng Trị','Đà Nẵng','Quảng Ngãi','Gia Lai','Khánh Hòa','Lâm Đồng','Đắk Lắk','TP. Hồ Chí Minh','Đồng Nai','Tây Ninh','Cần Thơ','Vĩnh Long','Đồng Tháp','Cà Mau','An Giang'];

const MODELS = [
  { id:'SG110CX', sold:9800,    pn:'ASG01229', cat:'inv3', kw:110, w:34 },
  { id:'SG125CX-P2', sold:6200, pn:'ASG01546', cat:'inv3', kw:125, w:14 },
  { id:'SG110CX-P2', sold:5400, pn:'ASG01498', cat:'inv3', kw:110, w:10 },
  { id:'SG50CX', sold:4100,     pn:'ASG01203', cat:'inv3', kw:50,  w:9 },
  { id:'SG33CX', sold:3900,     pn:'ASG01238', cat:'inv3', kw:33,  w:8 },
  { id:'SG20RT', sold:5200,     pn:'ASG01407', cat:'inv3', kw:20,  w:8 },
  { id:'SG10RT', sold:6100,     pn:'ASG01403', cat:'inv3', kw:10,  w:7 },
  { id:'SH10RT', sold:2300,     pn:'ASH00083', cat:'hyb',  kw:10,  w:5 },
  { id:'SG5.0RS', sold:3600,    pn:'ASG01442', cat:'inv1', kw:5,   w:3 },
  { id:'MG6RL', sold:1200,     pn:'A0SH1038', cat:'hyb',  kw:6,   w:2 },
  { id:'MG8RL', sold:900,      pn:'A0SH1039', cat:'hyb',  kw:8,   w:2 },
  { id:'MG10RL', sold:700,     pn:'A0SH1040', cat:'hyb',  kw:10,  w:2 },
  { id:'MG12RL', sold:500,     pn:'A0SH1068', cat:'hyb',  kw:12,  w:1 },
  { id:'SBR096', sold:1400,     pn:'AST02297', cat:'bat',  kw:9.6, w:2 },
];

const PRODUCTS = [{"code": "ASG01194", "name": "光伏并网逆变器_SG3K-D-V343_S"}, {"code": "ASG01037", "name": "光伏并网逆变器_SG5K-D-V343_S"}, {"code": "ASG01162", "name": "光伏并网逆变器_SG8K3-D-V343_S"}, {"code": "ASG01243", "name": "PV Inverter_SG10KTL-M-V15_S"}, {"code": "ASG01040", "name": "光伏并网逆变器_SG10KTL-M-V12_S"}, {"code": "ASG01245", "name": "PV Inverter_SG12KTL-M-V16_S"}, {"code": "ASG01065", "name": "光伏并网逆变器_SG15KTL-M-V12_S"}, {"code": "ASG01246", "name": "光伏并网逆变器_SG15KTL-M-V14_S"}, {"code": "ASG01015", "name": "光伏并网逆变器_SG20KTL-M-V12_S"}, {"code": "ASG01215", "name": "光伏并网逆变器_SG20KTL-M-V14_S"}, {"code": "ASG01247", "name": "PV Inverter_SG20KTL-M-V15_S"}, {"code": "ASG00896", "name": "光伏并网逆变器_SG36KTL-M-V112（国外版）_S"}, {"code": "ASG00800", "name": "光伏并网逆变器_SG50KTL-M-V16_S"}, {"code": "ASG00846", "name": "光伏并网逆变器_SG60KTL-V182_S"}, {"code": "ASG01090", "name": "光伏并网逆变器_SG80KTL-V14_S"}, {"code": "ASG01035", "name": "光伏并网逆变器_SG3K-S-V343_S"}, {"code": "ASG01442", "name": "Single phase PV inverter_SG5.0RS-V11_S"}, {"code": "ASG01444", "name": "Single phase PV inverter_SG8.0RS-V11_S"}, {"code": "ASG01446", "name": "Single phase PV inverter_SG10RS-V11_S"}, {"code": "ASG01399", "name": "光伏并网逆变器_SG5.0RT-V11_S"}, {"code": "ASG01402", "name": "光伏并网逆变器_SG8.0RT-V11_S"}, {"code": "ASG01403", "name": "光伏并网逆变器_SG10RT-V11_S"}, {"code": "ASG01779", "name": "Three phase PV inverter_SG10RT-V115_S"}, {"code": "ASG01405", "name": "光伏并网逆变器_SG15RT-V11_S"}, {"code": "ASG01421", "name": "Photovoltaic inverter_SG15RT-V12_S"}, {"code": "ASG01407", "name": "光伏并网逆变器_SG20RT-V11_S"}, {"code": "ASG01301", "name": "光伏并网逆变器_SG20RT-20-V11_S"}, {"code": "ASG01422", "name": "Photovoltaic inverter_SG20RT-V12_S"}, {"code": "ASG01783", "name": "Three phase PV inverter_SG20RT-V115_S"}, {"code": "ASG01238", "name": "SG33CX-V11_S"}, {"code": "ASG01239", "name": "光伏并网逆变器_SG40CX-V11_S"}, {"code": "ASG01203", "name": "SG50CX-V11_S"}, {"code": "ASG01344", "name": "光伏并网逆变器_SG50CX-V112_S"}, {"code": "ASG01764", "name": "Three phase PV inverter_SG33CX-P2-V12_S"}, {"code": "ASG01766", "name": "Three phase PV inverter_SG40CX-P2-V12_S"}, {"code": "ASG01767", "name": "Three phase PV inverter_SG50CX-P2-V12_S"}, {"code": "ASG01228", "name": "光伏并网逆变器_SG100CX-V11_S"}, {"code": "ASG01229", "name": "SG110CX-V11_S"}, {"code": "ASG01353", "name": "PV Inverter_SG110CX-V112_S"}, {"code": "ASG01498", "name": "PV Inverter_SG110CX-P2-CN-V11_S"}, {"code": "ASG01921", "name": "PV Inverter_SG110CX-P2-CN-V12_S"}, {"code": "ASG01553", "name": "PV Inverter_SG110CX-V115_S"}, {"code": "ASG01546", "name": "PV inverter_SG125CX-P2-V11_S"}, {"code": "ASG01901", "name": "PV inverter SG125CX-P2-V113 _S"}, {"code": "AST01272", "name": "智能通讯箱_COM100 V31_S"}, {"code": "AST01273", "name": "Smart Com. Box_COM100 V312_S"}, {"code": "AST01731", "name": "Smart Communication Box Com100A"}, {"code": "AST01111", "name": "WiFi通信模块_WiFi V31_S"}, {"code": "AST01198", "name": "Wireless Dongle_WiFi V312_S"}, {"code": "ASM00655", "name": "Wireless Com. Module_WiNet-S V11_S"}, {"code": "AST01346", "name": "Wireless Com. Module_EyeM4 V11_S"}, {"code": "AST01348", "name": "Wireless Dongle_EyeM4 V13_S"}, {"code": "ASG01279", "name": "PV Inverter_SG250HX-V11_S"}, {"code": "ASG01328", "name": "光伏并网逆变器_SG250HX-V112_S"}, {"code": "ASG01388", "name": "PV Inverter_SG250HX-V113_S"}, {"code": "ASH00037", "name": "Hybrid Inverter 1P_SH5K-20-V11"}, {"code": "ASH00098", "name": "Hybrid Inverter_SH5.0RS-V11_S"}, {"code": "ASH00057", "name": "光伏储能逆变器_SH5K-30-V11"}, {"code": "ASH00058", "name": "光伏储能逆变器_SH5K-30-V12_S"}, {"code": "ASH00080", "name": "光伏储能逆变器_SH5.0RT-V11_S"}, {"code": "ASH00084", "name": "光伏储能逆变器_SH5.0RT-V12_S"}, {"code": "ASH00082", "name": "光伏储能逆变器_SH8.0RT-V11_S"}, {"code": "ASH00083", "name": "光伏储能逆变器_SH10RT-V11_S"}, {"code": "ASH00085", "name": "光伏储能逆变器_SH10RT-V12_S"}, {"code": "AST00952", "name": "SBP4K8户用储能电池柜_SBP4K8 V11"}, {"code": "AST02297", "name": "户用铁锂电池系统SBR096(IEC版本)_SBR096_V0"}, {"code": "AST02299", "name": "户用铁锂电池系统SBR160(IEC版本)_SBR160_V0"}, {"code": "AST02421", "name": "户用铁锂电池系统-SBR256(IEC版本)_SBR256_V0"}, {"code": "AST03129", "name": "模块化户用电池系统附件(IEC)_SWITCHGEAR/COVER/BAS"},{"code":"A0SH1038","name":"单相光储逆变器_MG6RL-V1_6kW_S"},{"code":"A0SH1039","name":"单相光储逆变器_MG8RL-V1_8kW_S"},{"code":"A0SH1040","name":"单相光储逆变器_MG10RL-V1_10kW_S"},{"code":"A0SH1068","name":"单相光储逆变器_MG12RL-V11_12kW_S"}];
const PARTS = [
  { pn:'BP004541', vi:'Relay AC',              en:'AC relay', models:['SG110CX','SG110CX-P2','SG125CX-P2','SG50CX','SG33CX'] },
  { pn:'BP004718', vi:'Module IGBT',           en:'IGBT module', models:['SG110CX','SG125CX-P2'] },
  { pn:'BP004914', vi:'Bo mạch IGBT',          en:'IGBT board', models:['SG110CX','SG110CX-P2','SG125CX-P2'] },
  { pn:'BP004349', vi:'Bo mạch EMC',           en:'EMC board', models:['SG110CX','SG125CX-P2','SG50CX'] },
  { pn:'BP004242', vi:'Bo mạch tụ DC',         en:'DC capacitor board', models:['SG110CX','SG110CX-P2','SG33CX','SG50CX'] },
  { pn:'BP004540', vi:'Bo mạch relay AC',      en:'AC relay board', models:['SG110CX','SG125CX-P2'] },
  { pn:'BP003422', vi:'Bo mạch điều khiển',    en:'Control board', models:['SG20RT','SG10RT','SH10RT','SG33CX'] },
  { pn:'ES000144', vi:'Chống sét SPD',         en:'SPD surge protector', models:['SG110CX','SG110CX-P2','SG125CX-P2','SG50CX','SG33CX','SG20RT','SG10RT','SH10RT'] },
  { pn:'FN000210', vi:'Quạt tản nhiệt',        en:'Cooling fan', models:['SG110CX','SG125CX-P2','SG110CX-P2','SG50CX'] },
  { pn:'MC400012', vi:'Giắc MC4 (bộ)',         en:'MC4 connector set', models:[] },
];
function productsForModel(id){ const e=id.replace(/[.]/g,'\\.'); const re=new RegExp('(^|[_ ])'+e+'-(V|CN)','i'); return PRODUCTS.filter(p=>re.test(p.name)).map(p=>p.code); }
PARTS.forEach(p=>{ const set=new Set(); (p.models||[]).forEach(m=>productsForModel(m).forEach(c=>set.add(c))); p.products=[...set]; delete p.models; });

const FAULTS = [
  { code:'002', vi:'Quá áp lưới',                  en:'Grid overvoltage' },
  { code:'004', vi:'Thấp áp lưới',                 en:'Grid undervoltage' },
  { code:'010', vi:'Mất lưới / chống tách đảo',    en:'Grid loss / islanding' },
  { code:'012', vi:'Dòng rò quá lớn',              en:'Excessive leakage current' },
  { code:'036', vi:'Nhiệt độ module quá cao',      en:'Module over-temperature' },
  { code:'039', vi:'Điện trở cách điện thấp',      en:'Low insulation resistance' },
  { code:'070', vi:'Lỗi quạt tản nhiệt',           en:'Fan fault' },
  { code:'079', vi:'Lỗi phần cứng bo mạch',        en:'Board hardware fault' },
  { code:'204', vi:'Lỗi giao tiếp nội bộ',         en:'Internal communication fault' },
  { code:'SPD', vi:'Hỏng chống sét',               en:'SPD failure' },
  { code:'MC4', vi:'Cháy giắc MC4',                en:'Burnt MC4 connector' },
];

const PROPOSALS = ['repair','workshop','replace_part','replace_unit','swap_other','other'];
const isUnitSwap = p => p==='replace_unit'||p==='swap_other';
const SERVICE_TYPES = [
  { id:'RW', key:'st_RW' },   // Warranty repair
  { id:'OW', key:'st_OW' },   // Out of warranty
  { id:'PR', key:'st_PR' },   // Paid repair
  { id:'OT', key:'st_OT' },   // Other
];

const DISTRIBUTORS = [
  { id:'bke', name:'BKE Việt Nam',  short:'BKE', city:'', color:'#465FFF', aliases:['BKE'] },
  { id:'xb',  name:'XB Solar',      short:'XB',  city:'', color:'#1668DC', aliases:['XBSOLAR','XB SOLAR','XB'] },
  { id:'jgp', name:'JGP',           short:'JGP', city:'', color:'#0E9F9A', aliases:['JGP'] },
  { id:'dat', name:'DAT',           short:'DAT', city:'', color:'#7A5AF8', aliases:['DAT'] },
];
// Trung tâm tiếp nhận: 1 trung tâm SGE + mỗi đại lý 1 trung tâm
function centers(){ return [{id:'sge',name:'SGE Service Center'}].concat(DISTRIBUTORS.map(d=>({id:d.id,name:(d.centerName||((d.aliases&&d.aliases[0]||d.short)+' Center'))}))); }
function centerName(id){ const c=centers().find(c=>c.id===id); return c?c.name:'—'; }
const DIST_REGIONS = { bke:[], xb:[], jgp:[], dat:[] };
DISTRIBUTORS.forEach(d=>d.regions=(DIST_REGIONS[d.id]||[]).slice());
const CATALOG_DEFAULTS = JSON.stringify({ models:MODELS, products:PRODUCTS, parts:PARTS, faults:FAULTS, dists:DISTRIBUTORS });
function bindCatalog(cat){
  [[MODELS,'models'],[PRODUCTS,'products'],[PARTS,'parts'],[FAULTS,'faults'],[DISTRIBUTORS,'dists']].forEach(([arr,k])=>{ const src=cat[k]||[]; arr.length=0; src.forEach(x=>arr.push(x)); cat[k]=arr; });
  return cat;
}

const PERM_GROUPS = [
  { key:'pg_ticket', perms:['ticket_view','ticket_create','ticket_assign','ticket_diagnose','ticket_approve','ticket_opinion','ticket_repair','ticket_transfer','ticket_hold','ticket_cancel','internal_chat','feedback'] },
  { key:'pg_contract', perms:['svc_view','svc_manage','so_view','so_manage','pay_record'] },
  { key:'pg_crm', perms:['crm_view','crm_edit'] },
  { key:'pg_stock', perms:['stock_view','stock_move','stock_edit','po_manage'] },
  { key:'pg_expense', perms:['exp_view','exp_create','exp_approve','cost_view'] },
  { key:'pg_rma',    perms:['rma_view','rma_create','rma_return','rma_ship'] },
  { key:'pg_other',  perms:['reports','export','catalog','catalog_edit'] },
];
const EDITABLE_ROLES = ['manager','engineer','warehouse','accountant','agent','enduser'];
function defaultPerms(){ return {
  manager:['ticket_view','ticket_create','ticket_transfer','ticket_assign','ticket_diagnose','ticket_approve','ticket_repair','ticket_hold','ticket_cancel','internal_chat','svc_view','svc_manage','so_view','so_manage','pay_record','crm_view','crm_edit','stock_view','stock_move','stock_edit','po_manage','exp_view','exp_create','exp_approve','cost_view','rma_view','rma_create','rma_ship','rma_return','reports','export','catalog'],
  engineer:['ticket_view','ticket_create','ticket_transfer','ticket_diagnose','ticket_repair','ticket_opinion','ticket_hold','internal_chat','svc_view','crm_view','stock_view','exp_view','exp_create','cost_view','rma_view','rma_return','reports','export','catalog'],
  warehouse:['ticket_view','stock_view','stock_move','stock_edit','po_manage','so_view','exp_view','exp_create','rma_view','rma_ship','rma_return','export','catalog'],
  accountant:['ticket_view','svc_view','svc_manage','so_view','so_manage','pay_record','crm_view','crm_edit','stock_view','exp_view','exp_create','exp_approve','cost_view','rma_view','reports','export'],
  agent:['ticket_view','ticket_create','ticket_cancel','feedback','svc_view','so_view'],
  enduser:['ticket_view','ticket_create','ticket_cancel','feedback','svc_view','so_view'],
}; }

function toISO(ts){ const d=new Date(ts); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function buildMockDB(){
  const R = mulberry32(20260925);
  const rnd=(a,b)=>a+Math.floor(R()*(b-a+1));
  const pick=a=>a[Math.floor(R()*a.length)];
  const wpick=(arr,wf)=>{const tot=arr.reduce((s,x)=>s+wf(x),0);let r=R()*tot;for(const x of arr){r-=wf(x);if(r<=0)return x}return arr[arr.length-1]};
  const H=3600e3, D=24*H;
  const NOW = Math.floor(Date.now()/3600e3)*3600e3;

  /* ---- users ---- */
  const users = [
    { id:'u_mgr', role:'manager',  name:'Manager', title:'after_sales_manager', email:'manager@sge-demo.vn', login:'manager' },
    { id:'u_eng', role:'engineer', name:'Engineer 1', title:'service_engineer', email:'engineer1@sge-demo.vn',  login:'engineer' },
    { id:'u_eng2',role:'engineer', name:'Engineer 2', title:'service_engineer', email:'engineer2@sge-demo.vn',  login:'engineer2' },
  ];
  const techNames = {
    bke:['Distributor BKE 1','Distributor BKE 2'],
    xb:['Distributor XB 1','Distributor XB 2'],
    jgp:['Distributor JGP 1','Distributor JGP 2'],
    dat:['Distributor DAT 1','Distributor DAT 2'],
  };
  for(const d of DISTRIBUTORS){
    techNames[d.id].forEach((n,i)=>users.push({ id:`u_${d.id}${i}`, role:'distributor', distributorId:d.id, name:n, title:i===0?'npp_lead':'npp_tech', email:`tech${i+1}@${d.id}-demo.vn`, login: d.id==='bke'&&i===0?'distributor':`distributor-${d.id}${i}` }));
  }

  /* ---- customers (fictional) ---- */
  const custNames = ['Dệt may Phú Thịnh','Thực phẩm Hải Âu','Gỗ Nội Thất Tân Phát','Cơ khí Minh Long','Bao bì Việt Hưng','Nhựa Kim Sơn','Logistics Sông Hồng','Gạch men Đông Á','Thủy sản Mekong Xanh','Cà phê Buôn Đôn','Chè Lâm Viên','Điện tử An Khang','Giày da Thuận Phong','Sữa Đồng Xanh','Kho lạnh Nam Bộ','Trang trại Bình Minh','Khu công nghiệp Hòa Bình','Resort Biển Ngọc','Siêu thị Hương Việt','Bệnh viện Hoàn Mỹ Tâm','Trường Quốc tế Sao Mai','Nông sản Cao Nguyên','Xi măng Thành Công','Vật liệu Phước An'];
  const contacts = Array.from({length:12},(_,i)=>'Contact '+(i+1));
  const customers = custNames.slice(0,12).map((n,i)=>{
    const d = DISTRIBUTORS[i%4];
    const prov = pick(d.regions&&d.regions.length?d.regions:PROVINCES);
    return { id:'c'+(i+1), company:'Công ty '+n, contact:contacts[i%contacts.length], phone:'09'+rnd(10,99)+' '+rnd(100,999)+' '+rnd(100,999), email:`contact${i+1}@khachhang-demo.vn`, province:prov, distributorId:d.id, address:`KCN ${prov}, lô ${rnd(1,40)}${pick(['A','B','C'])}` };
  });
  users.push({ id:'u_dev', role:'dev', name:'Administrator', title:'dev_admin', email:'admin@sge-demo.vn', login:'admin' });
  users.push({ id:'u_end', role:'enduser', customerId:'c1', name:'Customer', title:'end_user', email:'contact1@khachhang-demo.vn', login:'customer' });

  /* ---- devices ---- */
  const devices = [];
  const usedSN = new Set();
  function mkSN(ship){const dt=new Date(ship);const yy=String(dt.getFullYear()).slice(2);const mm=String(dt.getMonth()+1).padStart(2,'0');let s;do{s='A'+yy+mm+String(rnd(0,999999)).padStart(6,'0')}while(usedSN.has(s));usedSN.add(s);return s}
  const RB=Date.UTC(2015,0,1);
  DISTRIBUTORS.forEach(d=>{
    const cs=customers.filter(c=>c.distributorId===d.id); if(!cs.length) return;
    (REAL_SN[d.id]||[]).slice(0,30).forEach((r,i)=>{
      const [sn,model,pn,st,bl,yrs]=r; const c=cs[i%cs.length]; const start=RB+st*D; const ship=bl!=null?RB+bl*D:start-92*D;
      usedSN.add(sn);
      devices.push({ sn, model, pn, customerId:c.id, distributorId:d.id, project:c.company.replace('Công ty ','')+' – '+pick(['Mái nhà xưởng','Nhà kho','Văn phòng','Khu B','Khu A']), province:c.province, shipDate:ship, startDate:start, installDate:start-rnd(20,80)*D, warrantyYears:yrs, extended:yrs>=10 });
    });
  });

  /* ---- tickets ---- */
  const tickets=[]; const rmas=[]; const notifs=[];
  const seqByDay={};
  function mkNo(prefix,ts){const d=new Date(ts);const k=String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');seqByDay[k]=(seqByDay[k]||0)+rnd(1,4);return prefix+k+String(seqByDay[k]).padStart(4,'0')}
  const faultWeightsByModel = { 'SG110CX':3.2,'SG125CX-P2':2.1,'SG110CX-P2':1.4,'SG50CX':1.0,'SG33CX':1.1,'SG20RT':0.9,'SG10RT':0.8,'SH10RT':1.3,'SG5.0RS':0.7,'SBR096':0.5,'MG6RL':0.9,'MG8RL':0.9,'MG10RL':0.9,'MG12RL':0.9 };
  const start = new Date('2026-07-01T08:00:00+07:00').getTime();
  const span = NOW - 6*H - start;
  const N = 30;
  const diagTexts = [
    ['Đo kiểm thấy relay AC không đóng, nghi hỏng relay.','AC relay does not close, relay suspected faulty.', ['BP004541']],
    ['IGBT chập, máy báo lỗi 036 liên tục, cần thay bo IGBT.','IGBT short circuit, repeated fault 036, IGBT board replacement needed.', ['BP004914']],
    ['Cháy giắc MC4 đầu vào DC, kiểm tra thêm bo EMC.','Burnt DC input MC4 connector, EMC board to be checked.', ['MC400012','BP004349']],
    ['Quạt tản nhiệt không quay, nhiệt độ module cao.','Cooling fan not spinning, module temperature high.', ['FN000210']],
    ['SPD hỏng sau sét, máy vẫn chạy chập chờn.','SPD damaged after lightning, unit running intermittently.', ['ES000144']],
    ['Điện trở cách điện thấp, đã loại trừ phía string, nghi bo tụ DC.','Low insulation resistance, strings ruled out, DC capacitor board suspected.', ['BP004242']],
    ['Máy không lên nguồn, bo điều khiển không phản hồi.','Unit does not power on, control board unresponsive.', ['BP003422']],
    ['Nhiều bo hư hỏng do cháy nổ, đề xuất đổi máy.','Multiple boards damaged by burn-out, unit replacement proposed.', []],
  ];
  const faultForDiag = ['010','036','MC4','070','SPD','039','204','079'];
  const convoLines = [
    ['Máy dừng từ sáng nay, nhờ bên mình hỗ trợ sớm.','The unit stopped this morning, please support soon.'],
    ['Đã nhận thông tin, kỹ thuật sẽ liên hệ trong hôm nay.','Received, a technician will contact you today.'],
  ];

  for(let i=0;i<N;i++){
    const created = R()<0.4 ? NOW - 2*H - Math.floor(R()*6*D) : start + Math.floor(R()*span);
    const r0=R();
    const wantW = r0>=0.22;
    let dev = wpick(devices, d=>faultWeightsByModel[d.model]||1);
    for(let k=0;k<60 && (created < (dev.startDate||dev.shipDate) || (wantW && created >= (dev.startDate||dev.shipDate)+dev.warrantyYears*365*D));k++) dev = wpick(devices, d=>faultWeightsByModel[d.model]||1);
    const cust = customers.find(c=>c.id===dev.customerId);
    const dist = dev.distributorId;
    const techs = users.filter(u=>u.distributorId===dist);
    const tech = pick(techs);
    const wEnd = (dev.startDate||dev.shipDate) + dev.warrantyYears*365*D;
    const inWarranty = created < wEnd;
    let type;
    if(r0<0.08) type='OT'; else if(r0<0.15) type='PR'; else if(r0<0.22) type='OW'; else type = inWarranty ? 'RW':'OW';
    const di = diagTexts.indexOf(wpick(diagTexts,x=>[3,3,2,2,2,2,2,0.5][diagTexts.indexOf(x)]));
    const diag = diagTexts[di];
    const age = NOW - created;
    const source = R()<0.18 ? 'enduser':'npp';
    // decide final status
    let status;
    const r=R();
    if(age > 30*D){ status = r<0.86?'closed': r<0.91?'rejected': r<0.95?'cancelled':'delivered'; }
    else if(age > 12*D){ status = r<0.55?'closed': r<0.68?'delivered': r<0.78?'testing': r<0.88?'in_service': r<0.93?'on_hold':'rejected'; }
    else if(age > 4*D){ status = r<0.18?'closed': r<0.3?'delivered': r<0.45?'testing': r<0.65?'in_service': r<0.8?'approved': r<0.9?'pending':'returned'; }
    else { status = r<0.12?'in_service': r<0.3?'approved': r<0.62?'pending': r<0.72?'returned': r<0.8?'diagnosing': r<0.92?'unassigned':'draft'; }
    if(type==='OT' && !['draft','unassigned','pending'].includes(status)) status = age>6*D?'closed':'in_service';
    if(age<5*D && source==='enduser' && R()<0.55) status='unassigned';
    if(status==='unassigned' && source!=='enduser') status='pending';

    const t = {
      id:'t'+(i+1), no:'', type, status, source,
      priority: diag[2].length===0||R()<0.15?'high':(R()<0.6?'medium':'low'),
      vital: di===7 || R()<0.08,
      distributorId: status==='unassigned'?null:dist,
      assigneeId: status==='unassigned'?null:tech.id,
      createdBy: source==='enduser'? (cust.id==='c1'?'u_end':null) : tech.id,
      customerId: cust.id,
      customer:{ company:cust.company, contact:cust.contact, phone:cust.phone, email:cust.email },
      project: dev.project, province: dev.province, address: cust.address,
      products:[{ sn:dev.sn, model:dev.model, qty:1 }],
      faultCode: type==='OT'?'':faultForDiag[di], faultTime: created - rnd(2,48)*H,
      description: type==='OT' ? {vi:'Khách hàng cần tư vấn cấu hình giám sát và cài đặt giới hạn phát lưới.',en:'Customer needs advice on monitoring setup and export limitation settings.'} : {vi:'Máy báo lỗi '+faultForDiag[di]+', dừng phát điện. '+diag[0],en:'Unit reports fault '+faultForDiag[di]+' and stopped generating. '+diag[1]},
      diagnosis: type==='OT'?null:{ text:{vi:diag[0],en:diag[1]}, proposal: di===7?'replace_unit':(diag[2].length?'replace_part':(i%2?'workshop':'repair')), estParts: diag[2].map(pn=>({pn,qty:1})) },
      parts:[],
      test:null, delivery:null, approval:null,
      attachments:[], internal:[], conversation:[], history:[], feedback:null, rmaId:null,
      createdAt: created, closedAt:null, customerTicketNo: R()<0.3?'KH-'+rnd(1000,9999):'',
    };
    t.title = `${dev.project.split(' – ')[0]} ${t.products[0].model}`;
    const pref = t.type;
    t.no = mkNo(pref==='RW'?'RW':pref, created);
    // history
    let at = created;
    const ev=(action,by,from,to,note)=>{ t.history.push({at,by,action,from,to,note:note||''}) };
    const creator = source==='enduser' ? (t.createdBy||'guest') : tech.id;
    ev('created',creator,null, source==='enduser'?'unassigned':'draft');
    if(source==='enduser' && status!=='unassigned'){ at+=rnd(1,10)*H; ev('claimed',tech.id,'unassigned','diagnosing'); }
    t.conversation.push({at:created+H, by:source==='enduser'?(t.createdBy||'guest'):tech.id, text:{vi:convoLines[0][0],en:convoLines[0][1]}});
    if(source==='enduser') t.conversation.push({at:created+3*H, by:tech.id, text:{vi:convoLines[1][0],en:convoLines[1][1]}});
    const order=['draft','unassigned','diagnosing','pending','returned','approved','in_service','testing','delivered','closed'];
    const reach = s=>{ const idx={draft:0,unassigned:0,diagnosing:1,pending:2,returned:2,rejected:3,approved:3,in_service:4,on_hold:4,testing:5,delivered:6,closed:7,cancelled:2}[s]; return idx; };
    const lvl = reach(status);
    if(lvl>=2 && status!=='diagnosing'){
      at+=rnd(1,8)*H; ev('submitted',tech.id,'diagnosing','pending');
      if(R()<0.2 && lvl>=3){ at+=rnd(3,20)*H; ev('returned','u_mgr','pending','returned',{vi:'Bổ sung ảnh tem serial và log lỗi.',en:'Please add serial label photo and fault log.'}); at+=rnd(3,30)*H; ev('submitted',tech.id,'returned','pending'); }
      if(R()<0.35){ t.internal.push({at:at+rnd(1,6)*H, by:pick(['u_eng','u_eng2']), text:{vi:'Ý kiến kỹ thuật: chẩn đoán hợp lý, đồng ý phương án của NPP.',en:'Technical opinion: diagnosis is sound, agree with distributor proposal.'}, tag:'opinion'}); }
    }
    if(status==='returned'){ at+=rnd(3,20)*H; ev('returned','u_mgr','pending','returned',{vi:'Thiếu ảnh hiện trường và mã lỗi trên màn hình.',en:'Missing site photos and on-screen fault code.'}); }
    if(status==='rejected'){ at+=rnd(4,30)*H; ev('rejected','u_mgr','pending','rejected',{vi:'Lỗi do lắp đặt sai (đấu ngược cực DC), không thuộc phạm vi bảo hành.',en:'Caused by incorrect installation (reversed DC polarity), not covered by warranty.'}); t.approval={by:'u_mgr',at,decision:'rejected'}; }
    if(status==='cancelled'){ at+=rnd(2,20)*H; ev('cancelled',tech.id,'pending','cancelled',{vi:'Khách tự khắc phục được.',en:'Customer resolved it themselves.'}); }
    if(lvl>=3 && !['rejected','cancelled'].includes(status)){
      at+=rnd(3,40)*H; ev('approved','u_mgr','pending','approved'); { const d=new Date(at); const ymd=String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'); t.approval={by:'u_mgr',at,decision:'approved',note:{vi:'Đồng ý phương án.',en:'Proposal approved.'},gspNo:'RW'+ymd+String(rnd(100,9999)).padStart(4,'0'),maNo:R()<0.6?'MA'+ymd.slice(0,4)+String(rnd(1,9999)).padStart(4,'0'):''}; }
    }
    if(lvl>=4 && !['rejected','cancelled'].includes(status)){
      at+=rnd(2,30)*H; ev('started',tech.id,'approved','in_service');
      if(t.type!=='OT'){
        const ps = (t.diagnosis.estParts.length?t.diagnosis.estParts:[{pn:pick(PARTS).pn,qty:1}]).map(p=>({...p}));
        if(R()<0.3) ps.push({pn:pick(PARTS).pn,qty:rnd(1,2)});
        t.parts = ps;
        if(isUnitSwap(t.diagnosis.proposal)){ t.parts=[]; }
      }
      if(status==='on_hold'){ at+=rnd(10,50)*H; ev('hold','u_mgr','in_service','on_hold',{vi:'Chờ linh kiện từ kho SGE.',en:'Waiting for spare parts from SGE warehouse.'}); }
    }
    if(lvl>=5 && status!=='on_hold'){ at+=rnd(12,72)*H; ev('to_testing',tech.id,'in_service','testing'); }
    if(lvl>=6 && status!=='on_hold'){
      at+=rnd(4,30)*H; t.test={at, by:tech.id, result:'pass', note:{vi:'Chạy thử 4 giờ ổn định, không báo lỗi.',en:'4-hour test run stable, no faults.'}};
      t.delivery={at, carrier:pick(['Viettel Post','GHN','Xe của NPP']), tracking:String(rnd(1e9,9e9)), note:''};
      ev('delivered',tech.id,'testing','delivered');
    }
    if(lvl>=7){ at+=rnd(4,24)*H; ev('closed',tech.id,'delivered','closed'); t.closedAt=at; if(R()<0.72) t.feedback={score:wpick([3,4,5],x=>({3:1,4:3,5:5})[x]),comment:'',at:at+D}; }
    if(at>NOW-H){ const shift=at-(NOW-H); t.history.forEach(h=>h.at-=shift); if(t.closedAt)t.closedAt-=shift; if(t.test)t.test.at-=shift; if(t.delivery)t.delivery.at-=shift; if(t.approval)t.approval.at-=shift; t.createdAt-=shift; }
    t.updatedAt = t.history[t.history.length-1].at;
    t.attachments.push({id:'fa'+i+'a',kind:'image',name:`tem_serial_${dev.sn}.jpg`, size:rnd(180,900)*1024, by:tech.id, at:created+2*H});
    if(t.faultCode&&R()<0.7) t.attachments.push({id:'fa'+i+'b',kind:'image',name:`man_hinh_loi_${dev.sn}.jpg`, size:rnd(150,700)*1024, by:tech.id, at:created+2*H});
    if(R()<0.4) t.attachments.push({id:'fa'+i+'c',kind:'image',name:`inverter_${dev.sn}.jpg`, size:rnd(300,1200)*1024, by:tech.id, at:created+2*H});
    if(R()<0.6) t.attachments.push({id:'fa'+i+'d',kind:'log',name:`log_${dev.sn}.zip`, size:rnd(20,120)*1024, by:tech.id, at:created+3*H});
    // RMA
    const mkRma=(kind,parts,at0)=>{
      const rs = ['closed','delivered'].includes(status)?'shipped': lvl>=5?'repairing': lvl>=4?'collected':'requested';
      const order=['requested','collected','repairing','shipped']; const k=order.indexOf(rs);
      const hist=[{at:at0,by:'u_mgr',to:'requested'}]; let tt=at0;
      if(k>=1){ tt+=rnd(12,60)*H; hist.push({at:tt,by:tech.id,to:'collected'}); }
      if(k>=2){ tt+=rnd(4,30)*H; hist.push({at:tt,by:'u_mgr',to:'repairing'}); }
      if(k>=3){ tt+=rnd(24,96)*H; hist.push({at:tt,by:'u_mgr',to:'shipped'}); }
      const rma={ id:'r'+(rmas.length+1), no:'RMA'+t.no.slice(2), ticketId:t.id, kind, sn:dev.sn, model:dev.model, parts, status:rs, distributorId:dist, createdAt:at0,
        inTracking: k>=1?String(rnd(1e9,9e9)):'', collectedAt: k>=1?hist[1].at:null, repairNote: k>=2?{vi:'Thay bo mạch hỏng, test tải 4 giờ đạt.',en:'Faulty board replaced, 4-hour load test passed.'}:'',
        outSn: k>=3?(kind==='unit'?mkSN(NOW):dev.sn):'', carrier: k>=3?pick(['Viettel Post','GHN','GHTK']):'', outTracking: k>=3?String(rnd(1e9,9e9)):'', shippedAt: k>=3?hist[3].at:null, history:hist };
      rmas.push(rma); t.rmaId=rma.id;
    };
    if(t.diagnosis && isUnitSwap(t.diagnosis.proposal) && lvl>=3 && !['rejected','cancelled'].includes(status)) mkRma('unit',[],t.approval.at);
    else if(t.parts.length && lvl>=4 && R()<0.4) mkRma('part',t.parts.map(p=>({...p})),t.approval.at+H);
    t.centerId=t.distributorId||'sge'; t.centerHistory=[];
    { const hh=t.history.find(h=>h.action==='hold'); t.slaPauses = hh?[{reason:'wait_parts',note:'',from:hh.at,to:null,by:hh.by}]:[]; }
    if(t.distributorId && lvl>=2 && R()<0.18){ const at=t.createdAt+rnd(1,48)*H; t.centerHistory.push({from:t.distributorId,to:'sge',at,by:t.assigneeId||null,note:''}); t.history.push({at,by:t.assigneeId||null,action:'transfer',from:null,to:null,note:centerName(t.distributorId)+' → SGE Service Center'}); t.centerId='sge'; }
    tickets.push(t);
  }
  // a guaranteed fresh ticket for the demo end-user + demo in-warranty serial
  tickets.sort((a,b)=>b.createdAt-a.createdAt);

  // seed notifications
  tickets.filter(t=>t.status==='pending').slice(0,4).forEach((t,i)=>notifs.push({id:'n'+i, at:t.updatedAt, toRole:'manager', key:'n_submitted', vars:{no:t.no}, ticketId:t.id, read:false}));
  tickets.filter(t=>t.status==='returned').slice(0,3).forEach((t,i)=>notifs.push({id:'nr'+i, at:t.updatedAt, toDist:t.distributorId, key:'n_returned', vars:{no:t.no}, ticketId:t.id, read:false}));
  tickets.filter(t=>t.status==='approved').slice(0,3).forEach((t,i)=>notifs.push({id:'na'+i, at:t.updatedAt, toDist:t.distributorId, key:'n_approved', vars:{no:t.no}, ticketId:t.id, read:false}));
  tickets.filter(t=>t.status==='unassigned').slice(0,3).forEach((t,i)=>notifs.push({id:'nu'+i, at:t.createdAt, toRole:'distributor', key:'n_unassigned', vars:{no:t.no}, ticketId:t.id, read:false}));

  users.forEach(u=>u.active=true);
  /* ---- technical support requests ---- */
  const support=[]; let spSeq=100;
  const causes=[['Inverter báo lỗi cách điện thấp vào buổi sáng, sau 10h tự chạy lại.','Low insulation fault in the morning, recovers after 10am.'],['Máy dừng phát, màn hình báo lỗi 036, quạt không chạy.','Unit stopped, fault 036 on screen, fan not running.'],['Mất kết nối iSolarCloud từ 3 ngày nay, COM100 vẫn sáng đèn.','No iSolarCloud connection for 3 days, COM100 LEDs still on.'],['Chạm đất PV gây hỏng biến tần, có mùi khét.','PV ground fault damaged the inverter, burning smell.'],['Công suất thấp hơn các máy cùng trạm khoảng 30%.','Output about 30% lower than other units on site.'],['Không cập nhật được firmware qua WiNet-S.','Firmware update via WiNet-S fails.']];
  const sols=[['Hướng dẫn đo cách điện từng string, phát hiện 1 string rò điện, khách đã xử lý.','Guided per-string insulation test; one leaking string found and fixed by customer.'],['Reset cấu hình WiNet-S và cập nhật firmware từ xa, đã kết nối lại.','Reset WiNet-S config and updated firmware remotely, reconnected.'],['Điều chỉnh tham số giới hạn công suất, máy chạy bình thường.','Adjusted power limit parameters, unit running normally.']];
  for(let i=0;i<0;i++){
    const SPST=['new','new','in_progress','in_progress','in_progress','resolved','resolved','resolved','converted','converted','resolved','in_progress'];
    const st0=SPST[i%SPST.length]; const age= st0==='new'? Math.floor(R()*36*H)+2*H : st0==='in_progress'? Math.floor((2+R()*6)*D) : Math.floor((10+R()*50)*D); const at=NOW-age;
    const d=pick(DISTRIBUTORS); const ag=pick(users.filter(u=>u.distributorId===d.id)); const dv=pick(devices.filter(x=>x.distributorId===d.id)) || devices[0];
    const ci=Math.floor(R()*causes.length); const type= ci===2||ci===5 ? (R()<0.5?'isolarcloud':'comm') : (R()<0.9?'inverter':'other');
    const cust=customers.find(c=>c.id===dv.customerId)||customers[0];
    let status = st0;
    const eng=pick(users.filter(u=>u.role==='engineer'));
    const s={ id:'spm'+i, no:'HT'+(()=>{const x=new Date(at);return String(x.getFullYear()).slice(2)+String(x.getMonth()+1).padStart(2,'0')+String(x.getDate()).padStart(2,'0');})()+String(++spSeq).padStart(4,'0'),
      status, createdBy:ag.id, distributorId:d.id, handlerId: status==='new'?null:eng.id, createdAt:at, updatedAt:at,
      type, model:type==='comm'?'COM100':dv.model, faultDate:toISO(at-rnd(1,5)*D), serials:dv.sn, gridDate:toISO(dv.startDate-60*D), station:dv.project, faultCodes: ['036','039','010','070',''][ci%5].replace(/^0/,''), remoteLink: type==='comm'?'https://isolarcloud.example/remote/'+rnd(1000,9999):'', cause:{vi:causes[ci][0],en:causes[ci][1]}, when:pick(['morning','noon','afternoon','random','continuous']), burn:ci===3, insulation:R()<0.5,
      company:d.name, email:ag.email, contact:ag.name, phone:'09'+rnd(10,99)+' '+rnd(100,999)+' '+rnd(100,999), images:[{id:'fi'+i,kind:'image',name:'inverter_'+dv.sn+'.jpg',size:rnd(200,900)*1024,by:ag.id,at,up:'local'}], messages:[], solution:'', ticketId:null,
      history:[{at,by:ag.id,action:'sp_created'}] };
    if(status!=='new'){ s.history.push({at:at+rnd(1,8)*H,by:eng.id,action:'sp_claimed'}); s.messages.push({at:at+rnd(2,10)*H,by:eng.id,text:{vi:'Anh/chị gửi giúp ảnh màn hình báo lỗi và kết quả đo cách điện.',en:'Please send the fault screen photo and insulation test result.'}}); s.messages.push({at:at+rnd(11,30)*H,by:ag.id,text:{vi:'Đã gửi bổ sung hình ảnh.',en:'Photos added.'}}); }
    if(status==='resolved'){ const so=pick(sols); s.solution={vi:so[0],en:so[1]}; s.history.push({at:at+rnd(30,120)*H,by:eng.id,action:'sp_resolved'}); }
    if(status==='converted'){ const tk=tickets.find(x=>x.distributorId===d.id && !x.supportId && x.createdAt>at && x.createdAt<at+6*D); if(tk){ s.ticketId=tk.id; tk.supportId=s.id; s.history.push({at:tk.createdAt,by:tk.createdBy||ag.id,action:'sp_converted',note:tk.no}); } else { s.status='resolved'; const so=pick(sols); s.solution={vi:so[0],en:so[1]}; s.history.push({at:at+rnd(30,120)*H,by:eng.id,action:'sp_resolved'}); } }
    s.updatedAt=s.history[s.history.length-1].at; if(s.updatedAt>NOW){ s.updatedAt=NOW-H; }
    support.push(s);
  }
  support.sort((a,b)=>b.createdAt-a.createdAt);
  tickets.filter(x=>x.status==='pending').slice(0,0);
  const db={ version:36, support, spSeq, catalog:{models:MODELS,products:PRODUCTS,parts:PARTS,faults:FAULTS,dists:DISTRIBUTORS}, perms:defaultPerms(), users, customers, devices, tickets, rmas, notifs, seq:1000 };
  upgradeRoles(db); buildErp(db);
  return db;
}
