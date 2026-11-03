"use strict";
/* AI Usage Guardian — logic giao diện, lưu trữ cục bộ và dữ liệu mẫu */
(function(){
const MOTION=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;

Object.assign(I,{
 tr_tools_label:{vi:"Công cụ trong phiên này",en:"Tools in this session"},
 tr_hint_idle:{vi:"Chọn một hoặc nhiều công cụ bạn sẽ dùng. Lần sau app tự nhớ tổ hợp này.",en:"Pick one or more tools you'll use. The app remembers this combo next time."},
 tr_hint_run:{vi:"Chạm vào công cụ bạn đang dùng để chuyển. Thời gian tự chia cho từng công cụ.",en:"Tap the tool you're using to switch. Time is split per tool automatically."},
 tr_add:{vi:"+ Thêm công cụ",en:"+ Add a tool"},
 tr_flows:{vi:"Quy trình nhanh",en:"Quick workflows"},
 tr_save_flow:{vi:"Lưu tổ hợp này thành quy trình",en:"Save this combo as a workflow"},
 tr_remove:{vi:"Bỏ {x} khỏi phiên",en:"Remove {x}"},
 flow_t:{vi:"Lưu quy trình",en:"Save workflow"}, flow_m:{vi:"Đặt tên cho tổ hợp công cụ này để lần sau chọn một lần là xong.",en:"Name this combo so you can pick it in one tap next time."},
 flow_ph:{vi:"vd: Viết báo cáo nhóm",en:"e.g. Group report"}, save_btn:{vi:"Lưu",en:"Save"},
 end_t:{vi:"Kết thúc phiên",en:"End of session"}, end_sum:{vi:"{n} công cụ · {t}",en:"{n} tools · {t}"},
 end_trust_q:{vi:"Bạn tin kết quả AI trong phiên này ở mức nào?",en:"How much did you trust the AI's results in this session?"},
 end_each:{vi:"Chấm riêng từng công cụ (không bắt buộc)",en:"Rate each tool separately (optional)"},
 end_verify_q:{vi:"Bạn có kiểm tra lại kết quả bằng công cụ hoặc nguồn khác không?",en:"Did you check the results with another tool or source?"},
 verify_yes:{vi:"Có, đã kiểm tra",en:"Yes, I checked"}, verify_no:{vi:"Không",en:"No"},
 end_skip:{vi:"Bỏ qua",en:"Skip"}, end_save:{vi:"Lưu phiên",en:"Save session"},
 col_verified:{vi:"Kiểm chứng",en:"Checked"}, yes_short:{vi:"Có",en:"Yes"}, no_short:{vi:"Không",en:"No"},
 v_title:{vi:"Kiểm chứng trong các phiên",en:"Checking across sessions"},
 v_rate:{vi:"Trong {n} phiên có trả lời, {y} phiên ({p}%) bạn đã kiểm tra lại kết quả bằng công cụ hoặc nguồn khác.",en:"Of {n} sessions answered, you checked the results with another tool or source in {y} ({p}%)."},
 v_trust:{vi:"Mức tin trung bình: {a}/5 khi có kiểm chứng, {b}/5 khi không kiểm chứng.",en:"Average trust: {a}/5 when checked, {b}/5 when not checked."},
 v_multi:{vi:"{m} trên {n} phiên ({p}%) dùng từ 2 công cụ trở lên.",en:"{m} of {n} sessions ({p}%) used 2 or more tools."},
 v_none:{vi:"Chưa có phiên nào trả lời câu hỏi kiểm chứng.",en:"No session has answered the checking question yet."},
 trust_lo:{vi:"Không tin",en:"Not at all"},trust_hi:{vi:"Rất tin",en:"Fully"}});

/* ============================== Storage (localStorage, per user) */
const K_USERS="aug.users", K_CUR="aug.current", K_DATA="aug.data.";
let memStore={};
function sget(k){try{const v=localStorage.getItem(k);return v==null?(memStore[k]??null):JSON.parse(v);}catch(e){return memStore[k]??null;}}
function sset(k,v){memStore[k]=v; try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function sdel(k){delete memStore[k]; try{localStorage.removeItem(k);}catch(e){}}
async function hashPw(pw,salt){
  const data=new TextEncoder().encode(salt+"|"+pw);
  try{ if(crypto&&crypto.subtle){const h=await crypto.subtle.digest("SHA-256",data); return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("");} }catch(e){}
  let h=2166136261; for(const b of data){h^=b; h=Math.imul(h,16777619);} return "f"+(h>>>0).toString(16);
}
function newData(username,profile){return {profile,limit:60,region:profile.region_key,lang:"vi",sessions:[],tasks:[],lastWeek:null,seq:1,running:null};}

let user=null, D=null, page="tracker", selTask=null, warned80=false, warned100=false, timerJob=null, trackerMsg=null;
function save(){ if(user) sset(K_DATA+user,D); }

/* ============================== Helpers */
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const pad=n=>String(n).padStart(2,"0");
const iso=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today=()=>iso(new Date());
const daysAgo=n=>{const d=new Date(); d.setDate(d.getDate()-n); return iso(d);};
const hms=s=>{s=Math.max(0,Math.floor(s)); return pad(Math.floor(s/3600))+":"+pad(Math.floor(s%3600/60))+":"+pad(s%60);};
const clock=d=>pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
const round2=v=>Math.round(v*100)/100;
const avg=a=>a.length?round2(a.reduce((x,y)=>x+y,0)/a.length):null;
const $=s=>document.querySelector(s);
function levelLabel(l){return t("level_"+(["well","moderate","weak"].includes(l)?l:"unknown"));}
function levelShort(l){return t("level_"+(["well","moderate","weak"].includes(l)?l:"unknown")+"_short");}
function choiceLabel(c){return c==="eff"?t("task_choice_effective"):c==="ineff"?t("task_choice_ineffective"):c==="self"?t("task_choice_self"):"-";}
function topicLabel(k){const f=TOPIC_OPTIONS.find(x=>x[0]===k); return f?f[1]:(LEGACY_TOPICS[k]||k);}
function totalToday(){const d=today(); return D.sessions.filter(s=>s.date===d).reduce((a,s)=>a+s.dur,0);}

/* ============================== Dialogs (styled Toplevel) */
function dialog(html,mount){
  return new Promise(res=>{
    const ov=document.createElement("div"); ov.className="ov"; ov.innerHTML='<div class="dlg" role="dialog" aria-modal="true">'+html+'</div>'; document.body.appendChild(ov);
    requestAnimationFrame(()=>requestAnimationFrame(()=>ov.classList.add("show")));
    let closed=false;
    const done=v=>{ if(closed) return; closed=true; document.removeEventListener("keydown",key); ov.classList.remove("show"); ov.classList.add("hide"); setTimeout(()=>ov.remove(),MOTION?260:0); res(v);};
    const key=e=>{if(e.key==="Escape") done(null);}; document.addEventListener("keydown",key);
    mount(ov.firstChild,done); const f=ov.querySelector("[data-focus]")||ov.querySelector("button"); if(f) f.focus();
  });
}
function confirmDlg(title,msg,yes,no,note){
  return dialog('<h3>'+esc(title)+'</h3><p class="msg">'+esc(msg)+'</p>'+(note?'<p class="nt">'+esc(note)+'</p>':'')+
   '<div class="acts"><button class="b blue" data-v="0">'+esc(no)+'</button><button class="b" data-v="1" data-focus>'+esc(yes)+'</button></div>',
   (d,done)=>d.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>done(b.dataset.v==="1"))).then(v=>v===true);
}
function infoDlg(title,msg){
  return dialog('<h3>'+esc(title)+'</h3><p class="msg" style="white-space:pre-line">'+esc(msg)+'</p><div class="acts"><button class="b" data-focus>'+esc(t("ok"))+'</button></div>',(d,done)=>d.querySelector("button").onclick=()=>done(true));
}
function trustDlg(){
  return dialog('<h3>'+esc(t("trust_title"))+'</h3><p class="msg">'+esc(t("trust_msg"))+'</p><div class="scale">'+[1,2,3,4,5].map(i=>'<button class="sc" data-v="'+i+'"><span class="n">'+i+'</span><span class="sl">'+(i===1?esc(t("trust_lo")):i===5?esc(t("trust_hi")):"&nbsp;")+'</span></button>').join("")+'</div><button class="skip" data-v="0">'+esc(t("trust_skip"))+'</button>',
   (d,done)=>d.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>done(+b.dataset.v||null)));
}
function recommendationDlg(it){
  const recs=it.recTools||[], p=recs[0];
  const bcls={well:"bw",moderate:"bm",weak:"bk"}[it.level]||"bu";
  let h='<h3 style="font-size:22px">'+esc(t("task_recommend_title"))+'</h3>'+
   '<div class="ubox"><b style="font-size:14.5px">'+esc(t("task_ai_useful_title"))+'</b><div style="margin:8px 0"><span class="badge '+bcls+'">'+esc(levelShort(it.level))+'</span><span class="muted" style="font-size:13px">'+esc(levelLabel(it.level))+'</span></div><div style="font-size:14.5px">'+esc(t("task_ai_useful_why"))+' '+esc(reasonOf(it))+'</div></div>';
  if(p){ h+='<div class="toolpick">'+esc(t("task_recommended_tool"))+': '+esc(p)+'</div><div style="font-size:14.5px">'+esc(recommendationReason(it.topic,it.overall+" "+it.subtask,p))+'</div>'+
    (recs.length>1?'<div class="muted" style="font-size:13px;margin-top:8px">'+esc(t("task_next"))+': '+recs.slice(1).map(esc).join(" · ")+'</div>':''); }
  else h+='<div class="muted" style="font-size:14.5px">'+esc(t("task_no_recommend"))+'</div>';
  h+='<div class="hitl"><b>'+esc(t("task_hitl_title"))+'</b><div style="margin-top:4px">'+esc(t("task_hitl_note"))+'</div></div>';
  if(p) h+='<p style="font-weight:700;font-size:14.5px;margin:14px 0 8px">'+esc(t("task_feedback_title"))+'</p><div class="acts"><button class="b blue sm" data-v="No">'+esc(t("task_feedback_no"))+'</button><button class="b green sm" data-v="Try">'+esc(t("task_feedback_try"))+'</button><button class="b sm" data-v="Yes" data-focus>'+esc(t("task_feedback_yes"))+'</button></div>';
  else h+='<div class="acts" style="margin-top:14px"><button class="b blue sm" data-v="">'+esc(t("notif_close"))+'</button></div>';
  return dialog(h,(d,done)=>d.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>done(b.dataset.v||null)));
}
function toast(title,lines){
  document.querySelectorAll(".toast").forEach(x=>x.remove());
  const el=document.createElement("div"); el.className="toast"; el.setAttribute("role","status");
  el.innerHTML='<header>'+esc(title)+'</header><div class="tb">'+lines.map(l=>'<p>'+esc(l)+'</p>').join("")+'<div class="acts"><button class="b green sm">'+esc(t("notif_close"))+'</button></div></div>';
  document.body.appendChild(el); requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("show")));
  el.querySelector("button").onclick=()=>{el.classList.remove("show"); setTimeout(()=>el.remove(),MOTION?380:0);};
}

/* ============================== Data operations */
function addSession(o){D.sessions.push(Object.assign({id:D.seq++},o)); save();}
function addTaskItem(overall,topic,subtask,date){
  const c=classifySubtask(subtask,overall);
  const it={id:D.seq++,date:date||today(),overall,topic,subtask,level:c.level,rule:c.rule,recTools:recommendTools(topic,overall+" "+subtask,D.profile.tools),recTool:null,feedback:null,choice:null,created:clock(new Date())};
  D.tasks.push(it); save(); return it;
}
function toolSummary(since){
  const m=new Map();
  for(const s of D.sessions){ if(since&&s.date<since) continue;
    for(const u of sessionTools(s)){ const k=u.name; if(!m.has(k)) m.set(k,{tool:k,sec:0,tr:[]}); const o=m.get(k); o.sec+=u.sec;
      const tv=(s.toolTrust&&s.toolTrust[k]!=null)?s.toolTrust[k]:s.trust; if(tv!=null) o.tr.push(tv); } }
  return [...m.values()].map(o=>({tool:o.tool,sec:o.sec,trust:avg(o.tr)}));
}
function sessionTools(s){ return (s.tools&&s.tools.length)?s.tools:[{name:s.tool||t("tool_other"),sec:s.dur}]; }
function dailySummary(){
  const m=new Map();
  for(const s of D.sessions){ if(!m.has(s.date)) m.set(s.date,{date:s.date,sec:0,tr:[],exc:0}); const o=m.get(s.date); o.sec+=s.dur; if(s.trust!=null) o.tr.push(s.trust); if(s.exceeded) o.exc++; }
  return [...m.values()].map(o=>({date:o.date,sec:o.sec,trust:avg(o.tr),exc:o.exc})).sort((a,b)=>a.date<b.date?1:-1);
}
function weeklyStats(){
  const since=daysAgo(6); const rows=toolSummary(since).filter(r=>r.sec>0); if(!rows.length) return null;
  const most=rows.reduce((a,b)=>b.sec>a.sec?b:a), least=rows.reduce((a,b)=>b.sec<a.sec?b:a);
  const rated=rows.filter(r=>r.trust!=null);
  return {most,least,trusted:rated.length?rated.reduce((a,b)=>b.trust>a.trust?b:a):null,total:rows.reduce((a,r)=>a+r.sec,0),since,until:today()};
}
function showWeekly(){
  const s=weeklyStats(); if(!s){toast(t("notif_title"),[t("notif_no_data")]);return;}
  const L=[t("notif_range",{start:s.since,end:s.until}),t("notif_total_week",{t:hms(s.total)}),t("notif_most_used",{tool:s.most.tool,t:hms(s.most.sec)}),t("notif_least_used",{tool:s.least.tool,t:hms(s.least.sec)})];
  if(s.trusted){ L.push(t("notif_most_trusted",{tool:s.trusted.tool,trust:s.trusted.trust}));
    L.push(s.most.trust!=null&&s.most.trust<3?t("notif_tip_watch",{tool:s.most.tool,trust:s.most.trust}):t("notif_tip_good",{tool:s.most.tool})); }
  toast(t("notif_title"),L);
}
function isoWeek(d){const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=x.getUTCDay()||7; x.setUTCDate(x.getUTCDate()+4-day); const y=new Date(Date.UTC(x.getUTCFullYear(),0,1)); return x.getUTCFullYear()+"-"+Math.ceil(((x-y)/864e5+1)/7);}
function maybeWeekly(){const w=isoWeek(new Date()); if(D.lastWeek===w||!weeklyStats()) return; D.lastWeek=w; save(); setTimeout(showWeekly,400);}

function seedDemo(){
  const pool=D.profile.tools.length?D.profile.tools:DEFAULT_AI_TOOLS;
  const S=[
   [6,"08:10:00","08:45:00",35,4,["Perplexity AI","ChatGPT"],true],
   [6,"13:00:00","13:20:00",20,3,["ChatGPT"],false],
   [5,"09:05:00","10:10:00",65,2,["ChatGPT","Grammarly"],false],
   [4,"20:00:00","20:30:00",30,5,["Perplexity AI","ChatGPT","Grammarly"],true],
   [3,"10:00:00","10:40:00",40,4,["Claude","Perplexity AI"],true],
   [2,"15:30:00","16:25:00",55,3,["ChatGPT","Gamma"],false],
   [1,"09:15:00","09:50:00",35,5,["Perplexity AI","ChatGPT"],true],
   [1,"19:00:00","19:40:00",40,2,["Claude"],false],
   [0,"10:10:00","10:55:00",45,4,["Julius AI","ChatGPT"],true],
   [0,"16:00:00","16:35:00",35,3,["ChatGPT"],false]];
  const acc={};
  for(const [ago,st,en,min,trust,names,verified] of S){ const d=daysAgo(ago), dur=min*60; acc[d]=(acc[d]||0)+dur;
    const w=names.map((_,i)=>i===0&&names.length>1?0.45:(names.length>1?0.55/(names.length-1):1));
    const tools=names.map((n,i)=>({name:n,sec:Math.round(dur*w[i])}));
    const primary=tools.reduce((a,b)=>b.sec>a.sec?b:a).name;
    addSession({date:d,start:st,end:en,dur,trust,region:D.region,tool:primary,tools,toolTrust:null,verified,exceeded:acc[d]>D.limit*60}); }
  const T=[
   ["Bài truyền thông ra mắt CLB","marketing","tìm ref content trên Instagram","eff"],
   ["Bài truyền thông ra mắt CLB","marketing","viết content caption chính","eff"],
   ["Bài truyền thông ra mắt CLB","creative","thiết kế poster chủ đạo","ineff"],
   ["Bài truyền thông ra mắt CLB","writing","dịch caption sang tiếng Anh","eff"],
   ["Bài truyền thông ra mắt CLB","video","lên kịch bản video teaser","eff"],
   ["Bài truyền thông ra mắt CLB","general","đàm phán với nhà tài trợ","self"],
   ["Bài truyền thông ra mắt CLB","general","duyệt bài trước khi đăng","eff"],
   ["Kế hoạch sự kiện quý 3","general","brainstorm ý tưởng chủ đề","eff"],
   ["Kế hoạch sự kiện quý 3","marketing","lập chiến lược nội dung theo target audience","ineff"],
   ["Kế hoạch sự kiện quý 3","academic","phân tích số liệu khảo sát","eff"],
   ["Kế hoạch sự kiện quý 3","general","họp team phân công công việc","self"],
   ["Kế hoạch sự kiện quý 3","general","xác định mục tiêu sự kiện","ineff"],
   ["Kế hoạch sự kiện quý 3","writing","rà soát chính tả bài viết","eff"],
  ];
  for(const [o,tp,s,c] of T){const it=addTaskItem(o,tp,s); it.choice=c; if(it.recTools[0]){it.recTool=it.recTools[0]; it.feedback="Yes";}}
  save();
}


/* ============================== Danh sách công cụ AI (đầy đủ, theo nhóm) */
function catName(c){return lang==="vi"?c.vi:c.en;}
function toolOptions(sel){
  const mine=D.profile.tools.filter(x=>TOOLS[x]); let h="";
  if(mine.length) h+='<optgroup label="'+esc(t("tools_mine"))+'">'+mine.map(x=>'<option'+(x===sel?" selected":"")+'>'+esc(x)+'</option>').join("")+'</optgroup>';
  for(const c of TOOL_CATEGORIES) h+='<optgroup label="'+esc(catName(c))+'">'+c.tools.map(([x])=>'<option'+(x===sel&&!mine.includes(x)?" selected":"")+'>'+esc(x)+'</option>').join("")+'</optgroup>';
  return h+'<option'+(sel===t("tool_other")?" selected":"")+'>'+esc(t("tool_other"))+'</option>';
}
function toolPicker(id,checked){
  return '<div class="picker" id="'+id+'Pick"><input class="inp pk-search" type="search" placeholder="'+esc(t("tools_search"))+'" aria-label="'+esc(t("tools_search"))+'"><p class="pk-count note">'+esc(t("tools_count",{n:TOOL_NAMES.length}))+'</p>'+
   TOOL_CATEGORIES.map((c,ci)=>{const n=c.tools.filter(([x])=>checked.has(x)).length;
     return '<details class="tgroup"'+(ci===0?" open":"")+'><summary><span>'+esc(catName(c))+'</span><span class="tg-n" data-n="'+n+'">'+(n?esc(t("tools_selected",{n})):c.tools.length)+'</span></summary><div class="tg-body">'+
       c.tools.map(([x],i)=>'<label class="cb" data-name="'+esc(norm(x))+'"><input type="checkbox" id="'+id+'-'+c.key+'-'+i+'" value="'+esc(x)+'"'+(checked.has(x)?" checked":"")+'><span>'+esc(x)+'</span></label>').join("")+'</div></details>';}).join("")+'</div>';
}
function wirePicker(id){
  const root=$("#"+id+"Pick"); if(!root) return;
  const sync=()=>root.querySelectorAll(".tgroup").forEach(g=>{const n=g.querySelectorAll("input:checked").length, el=g.querySelector(".tg-n"); el.textContent=n?t("tools_selected",{n}):g.querySelectorAll("input").length; el.classList.toggle("on",n>0);});
  root.addEventListener("change",e=>{ if(e.target.type==="checkbox"){ const v=e.target.value, on=e.target.checked; root.querySelectorAll('input[type=checkbox]').forEach(x=>{if(x.value===v) x.checked=on;}); sync(); } });
  root.querySelector(".pk-search").addEventListener("input",e=>{ const q=norm(e.target.value.trim());
    root.querySelectorAll(".tgroup").forEach(g=>{ let any=false; g.querySelectorAll(".cb").forEach(l=>{const m=!q||l.dataset.name.includes(q); l.hidden=!m; any=any||m;}); g.hidden=!any; if(q&&any) g.open=true; }); });
  sync();
}

/* ============================== Login screen */
function renderLogin(){
  stopTimer();
  $("#root").innerHTML='<div class="login"><div class="rcard lg-card">'+
   '<h1>'+esc(t("login_title"))+'</h1><p class="lg-sub">'+esc(t("login_subtitle"))+'</p>'+
   '<label class="lbl" for="lgU">'+esc(t("login_username"))+'</label><input class="inp" id="lgU" autocomplete="username">'+
   '<label class="lbl" for="lgP">'+esc(t("login_password"))+'</label><input class="inp" id="lgP" type="password" autocomplete="current-password">'+
   '<label class="lbl" for="lgS">'+esc(t("login_school"))+'</label><input class="inp" id="lgS">'+
   '<label class="lbl" for="lgR">'+esc(t("login_region"))+'</label><select class="inp" id="lgR">'+REGION_KEYS.map(k=>'<option value="'+k+'">'+esc(t(k))+'</option>').join("")+'</select>'+
   '<span class="lbl" style="margin-top:2px">'+esc(t("login_tools"))+'</span>'+toolPicker("lg",new Set(["ChatGPT"]))+''+
   '<p class="err" id="lgE"></p>'+
   '<div class="lg-btns"><button class="b blue" id="lgCreate">'+esc(t("login_create"))+'</button><button class="b" id="lgIn">'+esc(t("login_signin"))+'</button></div>'+
   '<button class="lg-demo" id="lgDemo">'+esc(t("login_demo"))+'</button></div></div>';
  wirePicker("lg");
  const err=(k,ok)=>{const e=$("#lgE"); e.textContent=t(k); e.classList.toggle("ok",!!ok);};
  const common=()=>{const u=$("#lgU").value.trim(), p=$("#lgP").value; if(!u){err("login_name_required");return null;} if(!p){err("login_password_required");return null;} return [u,p];};
  $("#lgCreate").onclick=async()=>{ const c=common(); if(!c) return; const users=sget(K_USERS)||{};
    if(users[c[0]]){err("login_account_exists");return;}
    const salt=Math.random().toString(36).slice(2); users[c[0]]={salt,hash:await hashPw(c[1],salt),created:new Date().toISOString()}; sset(K_USERS,users);
    const tools=[...new Set([...document.querySelectorAll("#lgPick input:checked")].map(x=>x.value))];
    sset(K_DATA+c[0],newData(c[0],{name:c[0],school:$("#lgS").value.trim(),region_key:$("#lgR").value,tools:tools.length?tools:["ChatGPT"]}));
    $("#lgP").value=""; err("login_created",true); };
  const signIn=async()=>{ const c=common(); if(!c) return; const users=sget(K_USERS)||{}; const u=users[c[0]];
    if(!u||u.hash!==await hashPw(c[1],u.salt)){err("login_invalid");return;} enter(c[0]); };
  $("#lgIn").onclick=signIn; $("#lgP").onkeydown=e=>{if(e.key==="Enter") signIn();};
  $("#lgDemo").onclick=async()=>{ const users=sget(K_USERS)||{};
    if(!users.demo){const salt=Math.random().toString(36).slice(2); users.demo={salt,hash:await hashPw("demo",salt),created:new Date().toISOString()}; sset(K_USERS,users);}
    let d=sget(K_DATA+"demo"); if(!d){ d=newData("demo",{name:"Demo",school:"",region_key:"region_north",tools:["ChatGPT","Perplexity AI","Claude","Google Gemini"]}); d.limit=120; d.lastCombo=["Perplexity AI","ChatGPT","Grammarly"]; sset(K_DATA+"demo",d); user="demo"; D=d; seedDemo(); }
    enter("demo"); };
}
function enter(u){
  user=u; D=sget(K_DATA+u); if(!D){D=newData(u,{name:u,school:"",region_key:"region_north",tools:["ChatGPT"]}); save();} if(reclassTasks(D)) save();
  lang=D.lang||"vi"; sset(K_CUR,u); page="tracker"; selTask=null; trackerMsg=null; renderShell(); maybeWeekly();
}

/* ============================== Shell: topbar + sidebar */
function renderShell(dir){
  document.documentElement.lang=lang;
  const name=D.profile.name||user;
  $("#root").innerHTML='<div class="win"><div class="chrome">'+
   '<div class="topbar"><div class="tb-left"><div class="tb-title">'+esc(t("app_title"))+'</div></div>'+
    '<div class="tb-right"><span class="greet">'+esc(t("greeting",{name}))+'</span>'+
    '<button class="tb-btn tb-bell" id="bell">'+esc(t("bell_tip"))+'</button>'+
    '<button class="tb-btn tb-lang" id="langB" title="'+esc(t("lang_tip"))+'">'+(lang==="vi"?"EN":"VI")+'</button>'+
    '<button class="tb-btn tb-out" id="outB">'+esc(t("logout_btn"))+'</button></div></div></div>'+
   '<div class="body"><aside class="sidebar"><nav class="nav-in" aria-label="Main"><span class="nav-ind" aria-hidden="true"></span>'+NAV.map(([k,l])=>'<button class="nav-b" data-p="'+k+'"'+(page===k?' aria-current="page"':'')+'>'+esc(t(l))+'</button>').join("")+'</nav></aside>'+
   '<main class="content"><div class="page" id="page"></div></main></div></div>';
  document.querySelectorAll(".nav-b").forEach(b=>b.onclick=()=>go(b.dataset.p));
  $("#bell").onclick=showWeekly;
  $("#langB").onclick=()=>{lang=lang==="vi"?"en":"vi"; D.lang=lang; save(); renderShell();};
  $("#outB").onclick=logout;
  renderPage(true); requestAnimationFrame(()=>moveInd(false));
}
function moveInd(animate){
  const ind=$(".nav-ind"), a=$(".nav-b[aria-current]"); if(!ind||!a) return;
  ind.classList.toggle("noanim",!animate);
  const side=window.matchMedia("(max-width:760px)").matches;
  ind.style.transform=side?"translateX("+a.offsetLeft+"px)":"translateY("+a.offsetTop+"px)";
  ind.style.width=side?a.offsetWidth+"px":""; ind.style.height=side?"":a.offsetHeight+"px";
  if(side) ind.style.top=a.offsetTop+"px"; else ind.style.top="";
}
window.addEventListener("resize",()=>moveInd(false));
function go(k){ if(k===page) return; const dir=NAV.findIndex(n=>n[0]===k)>NAV.findIndex(n=>n[0]===page)?1:-1; page=k;
  document.querySelectorAll(".nav-b").forEach(b=>b.toggleAttribute("aria-current",b.dataset.p===k)); document.querySelectorAll(".nav-b[aria-current]").forEach(b=>b.setAttribute("aria-current","page"));
  moveInd(true);
  const pg=$("#page"); pg.style.setProperty("--dir",dir); pg.classList.add("leaving");
  clearTimeout(go._t); go._t=setTimeout(()=>{ pg.classList.remove("leaving"); const c=$(".content"); if(c) c.scrollTop=0; window.scrollTo({top:0,behavior:MOTION?"smooth":"auto"}); renderPage(true); }, MOTION?170:0); }
async function logout(){
  if(D.running){infoDlg(t("logout_run_t"),t("logout_run_m"));return;}
  if(!await confirmDlg(t("logout_t"),t("logout_m"),t("yes_logout"),t("cancel"))) return;
  sdel(K_CUR); user=null; D=null; document.querySelectorAll(".toast").forEach(x=>x.remove()); renderLogin();
}
function renderPage(anim){
  stopTimer();
  const pg=$("#page");
  pg.classList.toggle("still",!anim); pg.classList.remove("enter"); void pg.offsetWidth; pg.classList.add("enter");
  pg.innerHTML=({tracker:pTracker,dashboard:pDashboard,task:pTask,stats:pStats,history:pHistory,settings:pSettings}[page])();
  [...pg.children].forEach((c,i)=>c.style.setProperty("--i",Math.min(i,8)));
  pg.querySelectorAll("tbody tr").forEach((r,i)=>r.style.setProperty("--r",Math.min(i,14)));
  ({tracker:wTracker,dashboard:()=>{},task:wTask,stats:wStats,history:wHistory,settings:wSettings}[page])();
}

/* ============================== Page: Theo dõi */
const BUILTIN_FLOWS=[
 {name:{vi:"Viết báo cáo",en:"Write a report"},tools:["Perplexity AI","ChatGPT","Grammarly"]},
 {name:{vi:"Làm slide",en:"Make slides"},tools:["ChatGPT","Gamma"]},
 {name:{vi:"Phân tích số liệu",en:"Analyse data"},tools:["Julius AI","ChatGPT"]},
 {name:{vi:"Video ngắn",en:"Short video"},tools:["ChatGPT","CapCut AI"]},
];
let picked=null;
function flowName(f){return typeof f.name==="string"?f.name:(f.name[lang]||f.name.vi);}
function allFlows(){return (D.workflows||[]).concat(BUILTIN_FLOWS);}
function normRunning(){ const r=D.running; if(r&&!r.tools){ D.running={start:r.start,tools:[r.tool||"ChatGPT"],active:r.tool||"ChatGPT",segStart:r.start,acc:{}}; save(); } }
function currentTools(){ normRunning(); if(D.running) return D.running.tools;
  if(!picked) picked=((D.lastCombo&&D.lastCombo.length)?D.lastCombo:[D.profile.tools[0]||"ChatGPT"]).slice(); return picked; }
function liveSecs(r){ const acc=Object.assign({},r.acc); acc[r.active]=(acc[r.active]||0)+(Date.now()-r.segStart)/1000; return acc; }
const mmss=s=>{s=Math.floor(s); return (s>=3600?pad(Math.floor(s/3600))+":":"")+pad(Math.floor(s%3600/60))+":"+pad(s%60);};

function pTracker(){
  const run=D.running&&D.running.tools?D.running:null, tools=currentTools();
  const chips=tools.map(x=>run
    ?'<button class="tchip'+(run.active===x?' active':'')+'" data-sw="'+esc(x)+'" aria-pressed="'+(run.active===x)+'"><span class="tn">'+esc(x)+'</span><span class="tt num" data-tt="'+esc(x)+'">00:00</span></button>'
    :'<span class="tchip idle"><span class="tn">'+esc(x)+'</span>'+(tools.length>1?'<button class="tx" data-rm="'+esc(x)+'" aria-label="'+esc(t("tr_remove",{x}))+'">×</button>':'')+'</span>').join("");
  const flows=run?'':'<div class="flows"><span class="lbl-s">'+esc(t("tr_flows"))+'</span><div class="flow-row">'+allFlows().map((f,i)=>{const on=f.tools.join("|")===tools.join("|");
      return '<button class="flow'+(on?' on':'')+'" data-flow="'+i+'" title="'+esc(f.tools.join(" → "))+'">'+esc(flowName(f))+'<span>'+f.tools.length+'</span></button>';}).join("")+'</div>'+
    (tools.length>1&&!allFlows().some(f=>f.tools.join("|")===tools.join("|"))?'<button class="linkbtn" id="trSaveFlow">'+esc(t("tr_save_flow"))+'</button>':'')+'</div>';
  return '<div class="tr-wrap"><p class="tr-hint">'+esc(t("tracker_hint"))+'</p><div class="rcard tr-card">'+
   '<span class="lbl" style="text-align:center">'+esc(t("tr_tools_label"))+'</span>'+
   '<div class="chips-row">'+chips+'<select class="inp add-tool" id="trAdd" aria-label="'+esc(t("tr_add"))+'"><option value="">'+esc(t("tr_add"))+'</option>'+toolOptions("\u0000")+'</select></div>'+
   '<p class="tr-sub">'+esc(t(run?"tr_hint_run":"tr_hint_idle"))+'</p>'+flows+
   '<div class="timer" id="trTimer">00:00:00</div><div class="status" id="trStatus"></div>'+
   '<div class="tr-btns"><button class="b" id="trStart">'+esc(t("tracker_start"))+'</button><button class="b blue" id="trStop">'+esc(t("tracker_stop"))+'</button></div>'+
   '<div class="pbar" id="trBar"><i style="width:0"></i></div><div class="plabel num" id="trProg"></div></div></div>';
}
function wTracker(){
  const run=D.running;
  $("#trStart").disabled=!!run; $("#trStop").disabled=!run;
  $("#trStart").onclick=async()=>{ if(D.running) return;
    const want=await confirmDlg(t("start_popup_title"),t("start_popup_msg"),t("yes"),t("no"),t("start_popup_note"));
    if(want){go("task");return;}
    const tl=currentTools().slice(), now=Date.now();
    D.running={start:now,tools:tl,active:tl[0],segStart:now,acc:{}}; D.lastCombo=tl.slice();
    warned80=false; warned100=false; trackerMsg=null; save(); renderPage(); };
  $("#trStop").onclick=stopSession;
  document.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{ picked=currentTools().filter(x=>x!==b.dataset.rm); renderPage(); });
  document.querySelectorAll("[data-sw]").forEach(b=>b.onclick=()=>switchTool(b.dataset.sw));
  document.querySelectorAll("[data-flow]").forEach(b=>b.onclick=()=>{ picked=allFlows()[+b.dataset.flow].tools.slice(); renderPage(); });
  $("#trAdd").onchange=e=>{ const v=e.target.value; if(!v) return;
    if(D.running){ if(!D.running.tools.includes(v)) D.running.tools.push(v); switchTool(v); }
    else { const tl=currentTools(); if(!tl.includes(v)) tl.push(v); renderPage(); } };
  const sf=$("#trSaveFlow"); if(sf) sf.onclick=saveFlow;
  tick();
}
function switchTool(x){
  const r=D.running; if(!r||r.active===x) return;
  const now=Date.now(); r.acc[r.active]=(r.acc[r.active]||0)+(now-r.segStart)/1000; r.active=x; r.segStart=now; save();
  document.querySelectorAll("[data-sw]").forEach(b=>{const on=b.dataset.sw===x; b.classList.toggle("active",on); b.setAttribute("aria-pressed",on);});
  if(!document.querySelector('[data-sw="'+CSS.escape(x)+'"]')) renderPage();
}
async function saveFlow(){
  const tl=currentTools().slice();
  const name=await dialog('<h3>'+esc(t("flow_t"))+'</h3><p class="msg">'+esc(t("flow_m"))+'</p><p class="note" style="margin:-8px 0 12px">'+esc(tl.join(" → "))+'</p><input class="inp" id="flowName" placeholder="'+esc(t("flow_ph"))+'" data-focus><div class="acts" style="margin-top:16px"><button class="b blue" data-v="0">'+esc(t("cancel"))+'</button><button class="b" data-v="1">'+esc(t("save_btn"))+'</button></div>',
    (d,done)=>{ const inp=d.querySelector("#flowName"); const ok=()=>done(inp.value.trim()||null);
      d.querySelector('[data-v="0"]').onclick=()=>done(null); d.querySelector('[data-v="1"]').onclick=ok; inp.onkeydown=e=>{if(e.key==="Enter") ok();}; });
  if(!name) return; D.workflows=(D.workflows||[]); D.workflows.unshift({name,tools:tl}); save(); renderPage();
}
function stopTimer(){clearTimeout(timerJob); timerJob=null;}
function tick(){
  stopTimer(); if(page!=="tracker"||!$("#trTimer")) return;
  const r=D.running, el=r?Math.floor((Date.now()-r.start)/1000):0;
  $("#trTimer").textContent=hms(el);
  if(r&&r.tools){ const acc=liveSecs(r); document.querySelectorAll("[data-tt]").forEach(x=>x.textContent=mmss(acc[x.dataset.tt]||0)); }
  const st=$("#trStatus"); st.textContent=r?t("tracker_status_running"):(trackerMsg||t("tracker_status_idle")); st.classList.toggle("on",!!r);
  const total=totalToday()+el, lim=D.limit*60, ratio=lim?Math.min(total/lim,1):0;
  $("#trBar i").style.width=ratio*100+"%";
  $("#trProg").textContent=t("tracker_progress",{used:Math.floor(total/60),limit:D.limit,pct:Math.round(ratio*100)});
  if(r){
    const q=lim?total/lim:0;
    if(q>=1&&!warned100){warned100=true; warned80=true; infoDlg(t("warn_100_title"),t("warn_100_msg",{limit:D.limit}));}
    else if(q>=.8&&!warned80){warned80=true; infoDlg(t("warn_80_title"),t("warn_80_msg",{pct:Math.round(q*100)}));}
    timerJob=setTimeout(tick,1000);
  }
}
function endDlg(tools,dur){
  const scale=(name)=>'<div class="scale'+(name?' sm':'')+'" data-scale="'+esc(name||"")+'">'+[1,2,3,4,5].map(i=>'<button type="button" class="sc" data-s="'+i+'"><span class="n">'+i+'</span>'+(name?'':'<span class="sl">'+(i===1?esc(t("trust_lo")):i===5?esc(t("trust_hi")):"&nbsp;")+'</span>')+'</button>').join("")+'</div>';
  let h='<h3>'+esc(t("end_t"))+'</h3><p class="note" style="margin:4px 0 12px">'+esc(t("end_sum",{n:tools.length,t:hms(dur)}))+'</p>'+
   '<div class="end-tools">'+tools.map(u=>'<span>'+esc(u.name)+' <b class="num">'+mmss(u.sec)+'</b></span>').join("")+'</div>'+
   '<p class="q">'+esc(t("end_trust_q"))+'</p>'+scale("");
  if(tools.length>1) h+='<details class="each"><summary>'+esc(t("end_each"))+'</summary><div class="each-body">'+tools.map(u=>'<div class="each-row"><span>'+esc(u.name)+'</span>'+scale(u.name)+'</div>').join("")+'</div></details>';
  h+='<p class="q">'+esc(t("end_verify_q"))+'</p><div class="seg" data-verify><button type="button" data-vv="1">'+esc(t("verify_yes"))+'</button><button type="button" data-vv="0">'+esc(t("verify_no"))+'</button></div>'+
   '<div class="acts" style="margin-top:20px"><button class="b blue" data-act="skip">'+esc(t("end_skip"))+'</button><button class="b" data-act="save" data-focus>'+esc(t("end_save"))+'</button></div>';
  return dialog(h,(d,done)=>{
    const st={trust:null,per:{},verified:null};
    d.querySelectorAll("[data-scale]").forEach(sc=>sc.querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{
      sc.querySelectorAll("[data-s]").forEach(x=>x.classList.toggle("on",x===b)); const v=+b.dataset.s, n=sc.dataset.scale; if(n) st.per[n]=v; else st.trust=v; }));
    d.querySelectorAll("[data-vv]").forEach(b=>b.onclick=()=>{ d.querySelectorAll("[data-vv]").forEach(x=>x.classList.toggle("on",x===b)); st.verified=b.dataset.vv==="1"; });
    d.querySelector('[data-act="skip"]').onclick=()=>done({trust:null,per:{},verified:null});
    d.querySelector('[data-act="save"]').onclick=()=>done(st);
  });
}
async function stopSession(){
  normRunning(); if(!D.running) return;
  const r=D.running, end=new Date(), dur=Math.max(1,Math.round((end-r.start)/1000));
  const acc=liveSecs(r); let tools=r.tools.map(n=>({name:n,sec:Math.round(acc[n]||0)})).filter(u=>u.sec>0);
  if(!tools.length) tools=[{name:r.active,sec:dur}];
  const exceeded=totalToday()+dur>D.limit*60; D.running=null; save(); stopTimer();
  const res=(await endDlg(tools,dur))||{trust:null,per:{},verified:null};
  const primary=tools.reduce((a,b)=>b.sec>a.sec?b:a).name;
  addSession({date:today(),start:clock(new Date(r.start)),end:clock(end),dur,trust:res.trust,region:D.region,tool:primary,tools,
    toolTrust:Object.keys(res.per).length?res.per:null,verified:res.verified,exceeded});
  trackerMsg=t("tracker_status_done"); renderPage();
}

/* ============================== Page: Hôm nay */
function pDashboard(){
  const d=today(), rows=D.sessions.filter(s=>s.date===d).slice().reverse();
  return '<div class="rcard lift" style="border-radius:20px;padding:18px"><div class="dash-total num">'+esc(t("dash_total_today",{t:hms(totalToday())}))+'</div><div class="muted" style="font-size:14px;margin-top:2px">'+esc(t("dash_limit",{limit:D.limit}))+'</div></div>'+
   '<div class="sect">'+esc(t("dash_sessions_today"))+'</div><div class="tv c"><div class="scroll"><table><thead><tr><th>'+esc(t("col_start"))+'</th><th>'+esc(t("col_end"))+'</th><th>'+esc(t("col_duration"))+'</th><th>'+esc(t("col_trust"))+'</th><th>'+esc(t("col_tool"))+'</th><th>'+esc(t("col_verified"))+'</th><th>'+esc(t("col_region"))+'</th></tr></thead><tbody>'+
   (rows.length?rows.map(s=>'<tr><td class="num">'+s.start+'</td><td class="num">'+s.end+'</td><td class="num">'+hms(s.dur)+'</td><td>'+(s.trust==null?"-":s.trust)+'</td><td>'+esc(sessionTools(s).map(u=>u.name).join(" → "))+'</td><td>'+(s.verified==null?"-":esc(t(s.verified?"yes_short":"no_short")))+'</td><td>'+esc(t(s.region||"region_other"))+'</td></tr>').join(""):'<tr class="empty"><td colspan="7">—</td></tr>')+'</tbody></table></div></div>';
}

/* ============================== Page: Phân tích Task */
let draft={overall:"",topic:"general"};
function pTask(){
  const rows=D.tasks.filter(x=>x.date===today());
  return '<label class="lbl" for="tkO">'+esc(t("task_overall_label"))+'</label><input class="inp tk-in" id="tkO" value="'+esc(draft.overall)+'" style="margin-bottom:10px">'+
   '<label class="lbl" for="tkT">'+esc(t("task_topic_label"))+'</label><select class="inp" id="tkT" style="max-width:380px;margin-bottom:14px">'+TOPIC_OPTIONS.map(([k,l])=>'<option value="'+k+'"'+(k===draft.topic?" selected":"")+'>'+esc(l)+'</option>').join("")+'</select>'+
   '<div class="tk-row" style="margin-bottom:10px"><label class="lbl" for="tkS" style="margin:0">'+esc(t("task_sub_label"))+'</label><input class="inp" id="tkS" style="flex:1 1 260px;max-width:520px"><button class="b green sm" id="tkAdd">'+esc(t("task_add_btn"))+'</button></div>'+
   '<div class="tv l"><div class="scroll"><table><thead><tr><th>'+esc(t("task_topic_label"))+'</th><th>'+esc(t("task_col_subtask"))+'</th><th>'+esc(t("task_col_level"))+'</th><th>'+esc(t("task_recommend_title"))+'</th><th>'+esc(t("task_col_choice"))+'</th></tr></thead><tbody>'+
   (rows.length?rows.map(x=>{const rec=(x.recTool||"-")+(x.feedback?" ("+x.feedback+")":""); return '<tr class="pick lv-'+x.level+(selTask===x.id?" sel":"")+'" data-id="'+x.id+'" tabindex="0"><td>'+esc(topicLabel(x.topic))+'</td><td>'+esc(x.subtask)+'</td><td>'+esc(levelLabel(x.level))+'</td><td>'+esc(rec)+'</td><td>'+esc(choiceLabel(x.choice))+'</td></tr>';}).join(""):'<tr class="empty"><td colspan="5">—</td></tr>')+
   '</tbody></table></div></div>'+
   '<div style="margin:10px 0 8px"><div style="font-size:14.5px;margin-bottom:6px">'+esc(t("task_choice_label"))+'</div><div class="tk-row"><select class="inp" id="tkC" style="width:auto;min-width:220px"><option value="eff">'+esc(t("task_choice_effective"))+'</option><option value="ineff">'+esc(t("task_choice_ineffective"))+'</option><option value="self">'+esc(t("task_choice_self"))+'</option></select>'+
   '<button class="b sm" id="tkRec">'+esc(t("task_record_btn"))+'</button></div></div>'+
   '<p class="legend">'+["well","moderate","weak"].map(l=>'<span><i class="dot d-'+l+'"></i>'+esc(levelLabel(l))+'</span>').join("")+'</p>';
}
function wTask(){
  const o=$("#tkO"), tp=$("#tkT"), s=$("#tkS");
  o.oninput=()=>draft.overall=o.value; tp.onchange=()=>draft.topic=tp.value;
  const add=async()=>{
    const ov=o.value.trim(), sb=s.value.trim();
    if(!ov){await infoDlg(t("task_missing_title"),t("task_missing_overall")); o.focus(); return;}
    if(!sb){await infoDlg(t("task_missing_title"),t("task_missing_subtask")); s.focus(); return;}
    const it=addTaskItem(ov,tp.value,sb); selTask=it.id; renderPage();
    const fb=await recommendationDlg(it); if(fb&&it.recTools[0]){it.recTool=it.recTools[0]; it.feedback=fb; save();}
    renderPage(); const n=$("#tkS"); if(n) n.focus();
  };
  $("#tkAdd").onclick=add; s.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault(); add();}};
  document.querySelectorAll("tr.pick").forEach(r=>{const f=()=>{selTask=+r.dataset.id; document.querySelectorAll("tr.pick").forEach(x=>x.classList.toggle("sel",x===r));}; r.onclick=f; r.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault(); f();}};});
  $("#tkRec").onclick=()=>{const it=D.tasks.find(x=>x.id===selTask&&x.date===today()); if(!it){infoDlg(t("task_none_title"),t("task_no_selection"));return;} it.choice=$("#tkC").value; save(); renderPage();};
}

/* ============================== Page: Thống kê */
function chart(items,max,fmt,colors,emptyKey){
  if(!items.length) return '<div class="chart"><div class="none">'+esc(t(emptyKey))+'</div></div>';
  return '<div class="chart"><div class="bars">'+items.map((it,i)=>'<div class="col"><span class="v">'+esc(fmt(it.v))+'</span><span class="bar" style="--j:'+i+';height:'+(max?Math.max(1,it.v/max*100):0)+'%;background:'+(it.c||colors[i%colors.length])+'"></span></div>').join("")+'</div><div class="xs">'+items.map(it=>'<span title="'+esc(it.l)+'">'+esc(it.l)+'</span>').join("")+'</div></div>';
}
function pStats(){
  const rows=D.tasks, cnt={well:0,moderate:0,weak:0,unknown:0}; rows.forEach(r=>cnt[r.level]++);
  const lvl=rows.length?[["well","Well","var(--chart-green)"],["moderate","Moderate","var(--chart-yellow)"],["weak","Weak","var(--chart-pink)"],["unknown","?","var(--chart-grey)"]].map(([k,l,c])=>({l,v:cnt[k],c})):[];
  const trend=dailySummary().filter(x=>x.trust!=null).slice(0,7).reverse().map(x=>({l:x.date.slice(5),v:x.trust}));
  const tools=toolSummary().sort((a,b)=>b.sec-a.sec).slice(0,5); const pal=["var(--chart-pink)","var(--chart-blue)","var(--chart-green)","var(--chart-yellow)","var(--chart-purple)"];
  const maxMin=Math.max(1,...tools.map(x=>Math.floor(x.sec/60)));
  // match summary
  let m="";
  if(!rows.length) m='<p class="muted">'+esc(t("stats_no_task_data").replace("\n"," "))+'</p>';
  else{
    const wT=rows.filter(r=>r.level==="well").length, wE=rows.filter(r=>r.level==="well"&&r.choice==="eff").length;
    const kT=rows.filter(r=>r.level==="weak").length, kS=rows.filter(r=>r.level==="weak"&&r.choice==="self").length, kA=rows.filter(r=>r.level==="weak"&&(r.choice==="eff"||r.choice==="ineff")).length;
    const rated=rows.filter(r=>r.choice).length;
    m+='<ul class="mlist">'; if(wT) m+='<li>'+esc(t("m_well",{t:wT,e:wE,p:Math.round(wE/wT*100),c:t("task_choice_effective")}))+'</li>';
    if(kT){ m+='<li>'+esc(t("m_weak",{t:kT,e:kS,p:Math.round(kS/kT*100),c:t("task_choice_self")}))+'</li>'; if(kA) m+='<li class="warn">'+esc(t("m_over",{n:kA}))+'</li>'; }
    m+='</ul><p class="mtotal">'+esc(t("m_total",{n:rows.length,r:rated}))+'</p>';
  }
  return '<div class="st-title">'+esc(t("stats_title"))+'</div><div class="st-grid">'+
   '<div class="rcard st-card"><h3>'+esc(t("stats_level_dist"))+'</h3>'+chart(lvl,Math.max(...Object.values(cnt)),v=>String(v),[],"stats_no_task_data")+'</div>'+
   '<div class="rcard st-card"><h3>'+esc(t("stats_trust_trend"))+'</h3>'+chart(trend,5,v=>String(v),["var(--chart-blue)"],"stats_no_trust_data")+'</div>'+
   '<div class="rcard st-card"><h3>'+esc(t("stats_tool_dist"))+'</h3>'+chart(tools.map(x=>({l:x.tool,v:Math.floor(x.sec/60)})),maxMin,v=>v+"m",pal,"stats_no_tool_data")+'</div>'+
   '<div class="rcard st-card"><h3>'+esc(t("stats_tool_trust"))+'</h3>'+chart(tools.map(x=>({l:x.tool,v:x.trust||0})),5,v=>String(v),pal,"stats_no_tool_data")+'</div></div>'+
   '<div class="st-title" style="font-size:14.5px;margin:16px 0 6px">'+esc(t("stats_match_title"))+'</div><div class="rcard match">'+m+'</div>'+
   '<div class="st-title" style="font-size:14.5px;margin:16px 0 6px">'+esc(t("v_title"))+'</div><div class="rcard match">'+verifyBlock()+'</div>';
}
function wStats(){}
function verifyBlock(){
  const S=D.sessions, n=S.length; if(!n) return '<p class="muted">'+esc(t("v_none"))+'</p>';
  const ans=S.filter(s=>s.verified!=null), y=ans.filter(s=>s.verified);
  const multi=S.filter(s=>sessionTools(s).length>1).length;
  const ta=avg(y.filter(s=>s.trust!=null).map(s=>s.trust)), tb=avg(ans.filter(s=>!s.verified&&s.trust!=null).map(s=>s.trust));
  let h='<ul class="mlist">';
  h+=ans.length?'<li>'+esc(t("v_rate",{n:ans.length,y:y.length,p:Math.round(y.length/ans.length*100)}))+'</li>':'<li>'+esc(t("v_none"))+'</li>';
  if(ta!=null&&tb!=null) h+='<li>'+esc(t("v_trust",{a:ta,b:tb}))+'</li>';
  h+='<li>'+esc(t("v_multi",{m:multi,n,p:Math.round(multi/n*100)}))+'</li></ul>';
  return h;
}

/* ============================== Page: Lịch sử */
function pHistory(){
  const rows=dailySummary();
  return '<div class="tv c"><div class="scroll"><table><thead><tr><th>'+esc(t("history_col_date"))+'</th><th>'+esc(t("history_col_total"))+'</th><th>'+esc(t("history_col_trust"))+'</th><th>'+esc(t("history_col_exceeded"))+'</th></tr></thead><tbody>'+
   (rows.length?rows.map(r=>'<tr><td class="num">'+r.date+'</td><td class="num">'+hms(r.sec)+'</td><td>'+(r.trust==null?"-":r.trust)+'</td><td>'+r.exc+'</td></tr>').join(""):'<tr class="empty"><td colspan="4">—</td></tr>')+
   '</tbody></table></div></div>';
}
function wHistory(){}

/* ============================== Page: Cài đặt */
function pSettings(){
  const ch=new Set(D.profile.tools);
  return '<div class="set-wrap"><div class="rcard" style="padding:16px"><div style="font-weight:700;font-size:17px;margin-bottom:8px">'+esc(t("settings_profile_section"))+'</div>'+
   '<label class="lbl" for="seN" style="font-weight:400">'+esc(t("login_name"))+'</label><input class="inp" id="seN" style="max-width:320px;margin-bottom:10px" value="'+esc(D.profile.name)+'">'+
   '<span class="lbl" style="font-weight:400">'+esc(t("settings_tools_label"))+'</span>'+toolPicker("se",ch)+'</div>'+
   '<div class="rcard" style="padding:16px"><label class="lbl" for="seL">'+esc(t("settings_limit_label"))+'</label><input class="inp num" id="seL" inputmode="numeric" style="width:100px;margin-bottom:14px" value="'+D.limit+'">'+
   '<label class="lbl" for="seR">'+esc(t("settings_region_label"))+'</label><select class="inp" id="seR" style="max-width:320px">'+REGION_KEYS.map(k=>'<option value="'+k+'"'+(k===D.region?" selected":"")+'>'+esc(t(k))+'</option>').join("")+'</select></div>'+
   '<div><button class="b" id="seS">'+esc(t("settings_save"))+'</button></div></div>';
}
function wSettings(){
  wirePicker("se");
  $("#seS").onclick=()=>{
    const v=$("#seL").value.trim(), n=parseInt(v,10); if(!(n>0)||String(n)!==v){infoDlg(t("settings_error_title"),t("settings_limit_error"));return;}
    D.limit=n; D.region=$("#seR").value; D.profile.region_key=D.region;
    const tl=[...new Set([...document.querySelectorAll("#sePick input:checked")].map(x=>x.value))]; if(tl.length) D.profile.tools=tl;
    D.profile.name=$("#seN").value.trim()||D.profile.name; save(); renderShell(); infoDlg(t("settings_saved_title"),t("settings_saved_msg"));
  };
}

/* ============================== Boot */
const cur=sget(K_CUR);
if(cur&&sget(K_DATA+cur)) enter(cur); else renderLogin();
})();
