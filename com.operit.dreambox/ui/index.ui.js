function Screen(ctx) {
  var panelController = ctx.createWebViewController("dreambox_panel");

  var STORE_DIR = "/sdcard/Download/Operit/dreambox/";
  var STORE_PATH = STORE_DIR + "store.json";
  var __dirReady = false;

  // ===== 宿主侧统一读 store =====
  async function __dbReadStore() {
    try {
      var raw = await Tools.Files.read(STORE_PATH);
      return (raw && typeof raw.content === "string") ? raw.content : "";
    } catch (e) {
      return "";
    }
  }

  // ===== 宿主侧统一写 store =====
  async function __dbWriteStore(json) {
    try {
      var obj = JSON.parse(json);
      if (!obj || typeof obj !== "object") throw new Error("invalid store object");
      if (!__dirReady) {
        await Tools.Files.mkdir(STORE_DIR, true);
        __dirReady = true;
      }
      await Tools.Files.write(STORE_PATH, JSON.stringify(obj));
      return JSON.stringify({ success: true });
    } catch (e) {
      return JSON.stringify({ success: false, message: "" + (e && e.message) });
    }
  }

  // WebView 侧拿不到宿主 Promise 的 .then，统一返回普通字符串，WebView 再包 Promise
  panelController.addJavascriptInterface("NativeDreambox", {
    load: async function () {
      try { return await __dbReadStore(); } catch (e) { return ""; }
    },
    save: async function (json) {
      try { return await __dbWriteStore(json); } catch (e) { return ""; }
    },
    ping: function () { return "pong"; }
  });

  var __DB_JS = `
  // ===== WebView 侧：把宿主返回值包成可用 Promise =====
  function nativeLoad(){ return Promise.resolve(NativeDreambox.load()); }
  function nativeSave(json){ return Promise.resolve(NativeDreambox.save(json)); }

  // 三面板定义（纵向堆叠，各存各的，不扁平混）
  var PANELS = [
    { id:"dreamcore",  name:"Dreamcore",    sub:"Anglen-Comnum · 记你的梦",      accent:"#6b5aa8" },
    { id:"angels",     name:"天使集",        sub:"家机动听的时刻",                 accent:"#b78aa0" },
    { id:"neverforget",name:"Never Forget",  sub:"Love & Sin · 不想忘的事",       accent:"#8a4a52" }
  ];

  // 冬色の吐息 主色卡（一期定死，后续可加可切换）
  var WINTER = {
    bg:"linear-gradient(160deg,#313c45,#4f6271 42%,#778ca4 74%,#b3bfcb)",
    ink:"#2a333c",
    glass:"rgba(213,219,226,.42)",
    glassLine:"rgba(255,255,255,.35)",
    sh1:"rgba(24,30,38,.42)",
    sh2:"rgba(255,255,255,.55)",
    btn:"#4f6271",
    btn2:"#778ca4"
  };

  var state = {
    palette:"winter",
    name:"",
    avatarImg:"",
    bgImg:"",
    collections:{dreamcore:[],angels:[],neverforget:[]},
    todayMsg:"",
    todayDate:"",
    settings:{}
  };

  function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,""").replace(/'/g,"&#39;");}
  function fmtTime(ts){var d=new Date(ts);return (d.getMonth()+1)+"月"+d.getDate()+"日 "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);}

  var AC=null;
  function beep(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();var o=AC.createOscillator(),g=AC.createGain();o.type="sine";o.frequency.value=660;g.gain.setValueAtTime(.06,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+.12);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+.13);}catch(e){}}

  function toast(m){var t=document.getElementById("toast");t.textContent=m;t.classList.add("show");clearTimeout(t.__tm);t.__tm=setTimeout(function(){t.classList.remove("show");},1800);}

  function applyTheme(){
    document.body.style.background=WINTER.bg;
    var bl=document.getElementById("bgLayer");
    if(bl)bl.style.backgroundImage=state.bgImg?("url("+state.bgImg+")"):"";
    var ids=["avAv","meAv"];
    for(var i=0;i<ids.length;i++){
      var el=document.getElementById(ids[i]);
      if(!el)continue;
      el.style.backgroundImage=state.avatarImg?("url("+state.avatarImg+")"):"";
      el.textContent=state.avatarImg?"":((state.name||"机").charAt(0)||"机");
    }
    var avn=document.getElementById("avName");
    if(avn)avn.textContent=state.name?state.name:"来信";
    var mn=document.getElementById("meName");
    if(mn)mn.value=state.name||"";
  }

  function saveAll(){
    try{localStorage.setItem("dreambox_state",JSON.stringify(state));}catch(e){}
    try{nativeSave(JSON.stringify(state)).catch(function(){});}catch(e){}
  }

  function getColl(id){ return state.collections[id] = state.collections[id] || []; }

  // ===== 三面板纵向堆叠渲染 =====
  function showLoading(){
    var wrap=document.getElementById("panels");
    if(wrap)wrap.innerHTML='<div class="glass" style="text-align:center;padding:30px 0;opacity:.6">加载中…</div>';
  }

  function panelByid(id){ return PANELS.filter(function(p){return p.id===id;})[0]; }

  function renderPanels(){
    var wrap=document.getElementById("panels");
    if(!wrap)return;
    var html="";
    PANELS.forEach(function(p){
      var all=getColl(p.id);
      var items=all.slice().reverse().slice(0,100);
      var body="";
      if(!items.length){
        body='<div class="empty">'+esc(p.name)+' 还空着<br>去「写一封信」给它一封信</div>';
      }else{
        items.forEach(function(l){
          var cs=(l.comments||[]).map(function(c){return '<div class="cmtItem"><b>'+esc(c.by)+'</b>：'+esc(c.text)+'</div>';}).join("");
          var ai=(l.aiReply)?('<div class="aiReply"><b>机</b>：'+esc(l.aiReply)+'</div>'):'';
          body+='<div class="glass card" data-pid="'+p.id+'" data-id="'+l.id+'">'
            +'<div class="cardHead"><span class="cardTag" style="background:'+p.accent+'">'+esc(p.name)+'</span><span class="cardTime">'+fmtTime(l.ts)+'</span></div>'
            +'<div class="cardBody">'+esc(l.content)+'</div>'
            +'<div class="cardCmt">'+cs+ai
            +'<div class="cmtRow"><input type="text" class="cmtIn" placeholder="评论一句…">'
            +'<span class="miniBtn" data-act="cmt">留言</span></div></div>'
            +'</div>';
        });
        if(all.length>100) body+='<div class="moreNote">…更早的 '+(all.length-100)+' 封收进档案了，这里只显示最近 100 封</div>';
      }
      html+='<section class="panel" data-panel="'+p.id+'" style="--accent:'+p.accent+'">'
        +'<div class="panelHead"><span class="panelName">'+esc(p.name)+'</span><span class="panelSub">'+esc(p.sub)+'</span></div>'
        +'<div class="panelBody">'+body+'</div>'
        +'</section>';
    });
    wrap.innerHTML=html;
    wrap.querySelectorAll(".card").forEach(function(el){
      var pid=el.getAttribute("data-pid"), lid=parseInt(el.getAttribute("data-id"),10);
      var inp=el.querySelector(".cmtIn"), btn=el.querySelector('[data-act="cmt"]');
      function add(){
        var v=inp.value.trim(); if(!v)return;
        var L=getColl(pid).filter(function(x){return x.id===lid;})[0]; if(!L)return;
        if(!L.comments)L.comments=[];
        L.comments.push({by:state.name||"你",text:v,ts:Date.now()});
        inp.value=""; saveAll(); renderPanels(); toast("评论贴上去了");
      }
      if(btn)btn.onclick=function(){beep();add();};
      if(inp)inp.addEventListener("keydown",function(e){if(e.key==="Enter"){beep();add();}});
    });
  }

  // ===== 写一封信 =====
  var curPanel="dreamcore";
  function renderWriteChips(){
    var box=document.getElementById("writeChips"); if(!box)return;
    var html="";
    PANELS.forEach(function(p){html+='<span class="chip'+(curPanel===p.id?" on":"")+'" data-p="'+p.id+'" style="--accent:'+p.accent+'">'+esc(p.name)+'</span>';});
    box.innerHTML=html;
    box.querySelectorAll(".chip").forEach(function(c){c.onclick=function(){beep();curPanel=c.getAttribute("data-p");renderWriteChips();};});
  }

  function bindWrite(){
    var btn=document.getElementById("writeSave"); if(!btn)return;
    btn.onclick=function(){beep();
      var ta=document.getElementById("writeText");
      var t=ta.value.trim();
      if(!t){toast("先写点什么吧");return;}
      getColl(curPanel).push({id:Date.now(),content:t,ts:Date.now(),comments:[],aiReply:""});
      ta.value="";saveAll();renderPanels();
      toast("收进「"+panelByid(curPanel).name+"」了");
      switchPage("pInbox");
    };
  }

  // ===== 切页 =====
  function switchPage(id){
    document.querySelectorAll(".page").forEach(function(p){p.classList.remove("active");});
    var pg=document.getElementById(id);
    if(pg)pg.classList.add("active");
    document.querySelectorAll(".tabbar .tb").forEach(function(x){
      x.classList.toggle("on",x.getAttribute("data-p")===id);
    });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  // ===== 图片选择（压缩后存 base64）=====
  function wpImg(key){
    var input=document.createElement("input");input.type="file";input.accept="image/*";
    input.onchange=function(){
      var file=input.files[0];if(!file)return;
      var reader=new FileReader();
      reader.onload=function(e){
        var raw=e.target.result;var img=new Image();
        img.onload=function(){
          var w=img.width,h=img.height,maxW=500;
          if(w>maxW||h>maxW){var s=maxW/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);}
          var c=document.createElement("canvas");c.width=w;c.height=h;
          c.getContext("2d").drawImage(img,0,0,w,h);
          state[key]=c.toDataURL("image/jpeg",0.82);saveAll();applyTheme();
          toast(key==="avatarImg"?"头像换上了":"背景换上了");
        };
        img.onerror=function(){state[key]=raw;saveAll();applyTheme();toast(key==="avatarImg"?"头像换上了":"背景换上了");};
        img.src=raw;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  // ===== 今日来信 =====
  function showToday(){
    var d=document.getElementById("todayDate");if(d)d.textContent=fmtTime(Date.now());
    var m=document.getElementById("todayTextM");if(m)m.textContent=state.todayMsg||"（空着 —— 机 还没在今天写下今日来信）";
    var mask=document.getElementById("todayMask");if(mask)mask.classList.add("show");
  }

  // ===== 宿主推来的 store → 合并进 state =====
  window.__DB_APPLY_STORE=function(d){
    if(!d||typeof d!=="object")return;
    if(d.collections&&typeof d.collections==="object"){
      PANELS.forEach(function(p){
        if(Array.isArray(d.collections[p.id])){
          var a=(state.collections[p.id]||[]).map(function(x){return x.id+":"+(x.aiReply||"");}).join("|");
          var b=d.collections[p.id].map(function(x){return x.id+":"+(x.aiReply||"");}).join("|");
          if(d.collections[p.id].length>(state.collections[p.id]||[]).length||a!==b){
            state.collections[p.id]=d.collections[p.id];
          }
        }
      });
    }
    if(d.name!==undefined)state.name=d.name;
    if(d.todayMsg!==undefined)state.todayMsg=d.todayMsg||"";
    if(d.todayDate!==undefined)state.todayDate=d.todayDate||"";
    if(d.avatarImg)state.avatarImg=d.avatarImg;
    if(d.bgImg)state.bgImg=d.bgImg;
    if(d.settings&&typeof d.settings==="object")state.settings=d.settings;
    applyTheme();renderPanels();
    var tt=document.getElementById("todayText");
    if(tt)tt.textContent=state.todayMsg||"（空着 —— 机 还没在今天写下今日来信）";
  };

  function pullOnce(){
    return nativeLoad().then(function(r){
      if(typeof r==="string"&&r.length){
        var d;try{d=JSON.parse(r);}catch(e2){d=null;}
        if(d&&typeof d==="object")window.__DB_APPLY_STORE(d);
      }
    }).catch(function(){});
  }

  function startPolling(){
    if(startPolling.__timer)return;
    startPolling.__timer=setInterval(function(){
      if(startPolling.__busy)return;
      startPolling.__busy=true;
      nativeLoad().then(function(r){
        if(typeof r==="string"&&r.length){
          var d;try{d=JSON.parse(r);}catch(e2){d=null;}
          if(d&&typeof d==="object")window.__DB_APPLY_STORE(d);
        }
        startPolling.__busy=false;
      }).catch(function(){startPolling.__busy=false;});
    },8000);
  }

  // ===== 事件绑定（不依赖 store 加载完成）=====
  document.getElementById("avAv").onclick=function(){beep();showToday();};
  document.getElementById("avCard").onclick=function(){beep();showToday();};
  document.getElementById("avatarChange").onclick=function(e){e.stopPropagation();beep();wpImg("avatarImg");};
  document.getElementById("bgChange").onclick=function(){beep();wpImg("bgImg");};
  document.getElementById("todayCard").onclick=function(){beep();showToday();};
  document.getElementById("todayClose").onclick=function(){beep();document.getElementById("todayMask").classList.remove("show");};
  document.getElementById("todayMask").addEventListener("click",function(e){if(e.target===this)this.classList.remove("show");});
  document.getElementById("meName").addEventListener("change",function(){state.name=this.value.trim();applyTheme();saveAll();});
  document.querySelectorAll(".tabbar .tb").forEach(function(b){
    b.onclick=function(){beep();switchPage(b.getAttribute("data-p"));};
  });

  // 切回前台立即拉一次（防切后台期间数据没跟上）
  document.addEventListener("visibilitychange",function(){
    if(!document.hidden)pullOnce();
  });

  // ===== 启动 =====
  (function init(){
    showLoading();
    try{
      var ls=localStorage.getItem("dreambox_state");
      if(ls){var d=JSON.parse(ls);if(d&&typeof d==="object"){state=Object.assign(state,d);if(!state.collections)state.collections={dreamcore:[],angels:[],neverforget:[]};}}
    }catch(e){}
    if(!state.collections)state.collections={dreamcore:[],angels:[],neverforget:[]};
    if(!state.settings)state.settings={};
    applyTheme();
    renderWriteChips();
    bindWrite();
    pullOnce().then(function(){renderPanels();});
    startPolling();
  })();
  `;

  function buildHtml() {
    return `<!DOCTYPE html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{min-height:100%}
body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;min-height:100vh;position:relative;
color:#2a333c;padding:16px 14px 96px;overflow-x:hidden;
--ink:#2a333c;--glass:rgba(213,219,226,.42);--glassLine:rgba(255,255,255,.35);
--sh1:rgba(24,30,38,.42);--sh2:rgba(255,255,255,.55);--btn:#4f6271;--btn2:#778ca4;
background:linear-gradient(160deg,#313c45,#4f6271 42%,#778ca4 74%,#b3bfcb);transition:background .6s ease}
#bgLayer{position:fixed;inset:0;background-size:cover;background-position:center;opacity:.28;z-index:0;pointer-events:none}
.wrap{position:relative;z-index:1}
.page{display:none;animation:fadein .4s ease}
.page.active{display:block}
@keyframes fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.glass{background:var(--glass);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
border:1px solid var(--glassLine);border-radius:20px;
box-shadow:9px 9px 18px var(--sh1),-9px -9px 18px var(--sh2);padding:16px;margin-bottom:14px}
h1{font-size:17px;letter-spacing:2px;margin-bottom:4px;font-weight:600}
.sub{font-size:11px;opacity:.6;margin-bottom:10px}
/* 面板（纵向堆叠） */
.panel{margin-bottom:18px}
.panelHead{display:flex;align-items:baseline;gap:10px;margin:4px 2px 10px}
.panelName{font-size:15px;font-weight:700;letter-spacing:1px;position:relative;padding-left:14px}
.panelName::before{content:"";position:absolute;left:0;top:50%;transform:translateY(-50%);
width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent)}
.panelSub{font-size:10px;opacity:.6;letter-spacing:.5px}
.card{margin-top:12px}
.cardHead{font-size:11px;opacity:.85;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.cardTag{display:inline-block;font-size:9px;padding:2px 8px;border-radius:999px;color:#fff;letter-spacing:.5px}
.cardTime{font-size:10px;opacity:.6}
.cardBody{font-size:12.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word}
.empty{font-size:12px;opacity:.55;text-align:center;padding:18px 0;line-height:1.8}
.moreNote{font-size:10px;opacity:.5;text-align:center;padding:6px 0}
.cardCmt{margin-top:10px;border-top:1px dashed rgba(255,255,255,.25);padding-top:10px}
.cmtItem{font-size:12px;margin:6px 0;line-height:1.6}
.aiReply{background:rgba(255,255,255,.35);border-radius:12px;padding:10px;font-size:12px;line-height:1.7;margin-top:8px}
.cmtRow{display:flex;gap:8px;margin-top:8px}
.cmtIn{flex:1;min-height:auto;border:none;outline:none;background:rgba(255,255,255,.4);border-radius:12px;
padding:9px 12px;font-size:12px;color:var(--ink);font-family:inherit;
box-shadow:inset 2px 2px 6px var(--sh1),inset -2px -2px 6px var(--sh2)}
.miniBtn{align-self:center;padding:9px 14px;border:none;outline:none;border-radius:999px;background:var(--btn);
color:#fff;font-size:11px;letter-spacing:1px;cursor:pointer;
box-shadow:4px 4px 10px var(--sh1),-4px -4px 10px var(--sh2)}
.miniBtn:active{box-shadow:inset 2px 2px 6px rgba(0,0,0,.2);transform:scale(.96)}
/* 写一封信 */
.chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.chip{padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.5);border:1px solid var(--glassLine);
box-shadow:4px 4px 8px var(--sh1),-4px -4px 8px var(--sh2);font-size:12px;cursor:pointer;user-select:none;opacity:.85}
.chip.on{background:var(--accent,var(--btn));color:#fff;opacity:1;box-shadow:inset 3px 3px 6px rgba(0,0,0,.18)}
.disabled{opacity:.45;pointer-events:none}
textarea{width:100%;min-height:90px;border:none;outline:none;resize:none;background:rgba(255,255,255,.42);
border-radius:14px;padding:12px;font-size:13px;color:var(--ink);font-family:inherit;
box-shadow:inset 3px 3px 8px var(--sh1),inset -3px -3px 8px var(--sh2)}
.btn{display:inline-block;padding:10px 20px;border:none;outline:none;border-radius:999px;background:var(--btn);
color:#fff;font-size:13px;letter-spacing:1px;cursor:pointer;
box-shadow:5px 5px 12px var(--sh1),-5px -5px 12px var(--sh2);transition:all .15s ease}
.btn:active{box-shadow:inset 3px 3px 8px rgba(0,0,0,.2);transform:scale(.97)}
.btn.ghost{background:rgba(255,255,255,.55);color:var(--ink)}
/* 我的 */
.meHead{display:flex;gap:14px;align-items:center}
.avatar{width:56px;height:56px;min-width:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;
font-size:24px;font-weight:700;color:#fff;cursor:pointer;user-select:none;
background-image:radial-gradient(circle at 32% 30%,rgba(255,255,255,.8),rgba(255,255,255,.12) 45%),var(--btn);
background-size:cover;background-position:center;
box-shadow:6px 6px 14px var(--sh1),-6px -6px 14px var(--sh2)}
.idBox{flex:1;min-width:0}
.avName{font-size:14px;font-weight:600;margin-bottom:6px}
input[type=text]{width:100%;min-height:auto;border:none;outline:none;background:rgba(255,255,255,.4);
border-radius:12px;padding:9px 12px;font-size:13px;color:var(--ink);font-family:inherit;
box-shadow:inset 2px 2px 6px var(--sh1),inset -2px -2px 6px var(--sh2)}
.note{font-size:10.5px;opacity:.6;margin-top:8px;line-height:1.6}
/* 今日来信弹层 */
.modalMask{position:fixed;inset:0;background:rgba(30,38,46,.4);backdrop-filter:blur(6px);
display:none;align-items:center;justify-content:center;z-index:50}
.modalMask.show{display:flex}
.modal{width:84%;max-width:340px;background:rgba(255,255,255,.82);backdrop-filter:blur(24px);border-radius:22px;
box-shadow:12px 12px 26px var(--sh1),-12px -12px 26px var(--sh2);padding:18px;animation:fadein .3s ease}
/* 底部 tab */
.tabbar{position:fixed;left:0;right:0;bottom:0;padding:10px 14px calc(12px + env(safe-area-inset-bottom));
background:rgba(213,219,226,.72);backdrop-filter:blur(20px);display:flex;justify-content:space-around;
border-top:1px solid var(--glassLine);z-index:40}
.tabbar .tb{font-size:11px;padding:8px 16px;border-radius:999px;cursor:pointer;user-select:none;opacity:.75;color:var(--ink)}
.tabbar .tb.on{background:var(--btn);color:#fff;opacity:1;box-shadow:4px 4px 10px var(--sh1)}
#toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:rgba(255,255,255,.85);
color:var(--ink);font-size:12px;padding:8px 18px;border-radius:999px;z-index:60;opacity:0;
box-shadow:5px 5px 12px var(--sh1);pointer-events:none;transition:opacity .3s;max-width:80%;text-align:center}
#toast.show{opacity:.95}
</style></head>
<body>
<div id="bgLayer"></div>
<div class="wrap">

  <div class="page active" id="pInbox">
    <div class="glass meHead">
      <div class="avatar" id="avAv">机</div>
      <div class="idBox">
        <div class="avName" id="avName">来信</div>
        <div class="note" style="margin:0">点头像 · 看「今日来信」</div>
      </div>
    </div>
    <div class="glass" id="avCard">
      <h1>今日来信</h1><div class="sub">机 想在今天说的话</div>
      <div id="todayText" style="font-size:13px;line-height:1.8;white-space:pre-wrap">（空着 —— 机 还没在今天写下今日来信）</div>
    </div>
    <div id="panels"><div class="glass" style="text-align:center;padding:30px 0;opacity:.6">加载中…</div></div>
    <div class="glass">
      <h1>声音位</h1><div class="sub">语音条 · 一起听音乐（二期接入）</div>
      <span class="btn ghost disabled" style="margin-top:4px">♪ 播放位 · 二期接入</span>
    </div>
  </div>

  <div class="page" id="pWrite">
    <div class="glass">
      <h1>写一封信</h1><div class="sub">收进哪块面板，挑一个</div>
      <div class="chips" id="writeChips"></div>
      <textarea id="writeText" placeholder="写点东西…梦也好，动听时刻也好，不想忘的事也好"></textarea>
      <div style="text-align:right;margin-top:10px"><span class="btn" id="writeSave">收进去</span></div>
    </div>
  </div>

  <div class="page" id="pMe">
    <div class="glass meHead">
      <div class="avatar" id="meAv">机</div>
      <div class="idBox">
        <input type="text" id="meName" placeholder="你的 ID">
        <div style="display:flex;gap:8px;margin-top:8px">
          <span class="btn ghost" id="avatarChange" style="padding:6px 12px;font-size:11px">换头像</span>
          <span class="btn ghost" id="bgChange" style="padding:6px 12px;font-size:11px">换背景</span>
        </div>
      </div>
    </div>
    <div class="glass" id="todayCard">
      <h1>今日来信</h1><div class="sub">点我看弹卡</div>
    </div>
    <div class="glass">
      <h1>色卡</h1><div class="sub">一期定死「冬色の吐息」，二期做可切换</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span class="chip on" style="opacity:1">冬色の吐息</span>
        <span class="chip disabled">莫兰迪 · 二期</span>
        <span class="chip disabled">美拉德 · 二期</span>
        <span class="chip disabled">雾感弥散 · 二期</span>
      </div>
    </div>
  </div>

</div>

<div class="modalMask" id="todayMask">
  <div class="modal">
    <h1>今日来信</h1><div class="sub" id="todayDate"></div>
    <div id="todayTextM" style="font-size:13px;line-height:1.8;white-space:pre-wrap"></div>
    <div style="text-align:right;margin-top:12px"><span class="btn ghost" id="todayClose">收好</span></div>
  </div>
</div>

<div class="tabbar">
  <span class="tb on" data-p="pInbox">来信</span>
  <span class="tb" data-p="pWrite">写一封信</span>
  <span class="tb" data-p="pMe">我的</span>
</div>
<div id="toast"></div>
<script>
${__DB_JS}
</script>
</body></html>`;
  }

  return ctx.UI.WebView({
    html: buildHtml(),
    baseUrl: "about:blank",
    javaScriptEnabled: true,
    domStorageEnabled: true,
    controller: panelController
  });
}
exports.default = Screen;