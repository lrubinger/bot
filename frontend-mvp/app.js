const API = `${location.origin}/api`;
const state = {
  token: localStorage.getItem("pp_token") || "",
  user: JSON.parse(localStorage.getItem("pp_user") || "null"),
  page: "dashboard",
  sidebarCollapsed: localStorage.getItem("pp_sidebar_collapsed") === "1"
};

const activeItems = [
  ["dashboard","Dashboard","dashboard"],
  ["connections","Conexões WhatsApp","link"],
  ["tickets","Atendimentos","chat"],
  ["contacts","Contatos","contacts"],
  ["queues","Filas","layers"],
  ["kanban","Kanban","columns"],
  ["users","Usuários","users"],
  ["chat","Chat interno","bell"]
];
const pendingItems = [
  ["Mensagens rápidas","bolt"],["Tarefas","check"],["Agendamentos","calendar"],["Tags","tag"],
  ["Ajuda","help"],["Campanhas","megaphone"],["Avisos","bell"],
  ["Integrações","puzzle"],["Arquivos","folder"],["API externa","code"],["Financeiro","wallet"],
  ["Configurações avançadas","sliders"]
];

function menuIcon(name){
  const paths={
    dashboard:'<path d="M4 13h6V4H4v9Zm10 7h6V11h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z"/>',
    link:'<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/>',
    chat:'<path d="M4 5h16v11H9l-5 4V5Zm4 4h8M8 12h5"/>',
    contacts:'<path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-1a2.5 2.5 0 1 0 0-5M3 19a5 5 0 0 1 10 0M14 14a4 4 0 0 1 7 3"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
    columns:'<path d="M4 4h5v16H4V4Zm11 0h5v10h-5V4Zm0 14h5v2h-5v-2Z"/>',
    users:'<path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-1a3 3 0 1 0 0-6M3 20a6 6 0 0 1 12 0M14 14a5 5 0 0 1 7 4.5"/>',
    bolt:'<path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z"/>',
    check:'<path d="M4 12l5 5L20 6"/>',
    calendar:'<path d="M5 4h14v16H5V4Zm0 5h14M8 2v4M16 2v4"/>',
    tag:'<path d="M3 12V5h7l10 10-7 7L3 12Zm5-4h.01"/>',
    messages:'<path d="M4 5h12v9H9l-5 4V5Zm7 2h9v9l-3-2"/>',
    help:'<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2-12a2.4 2.4 0 1 1 3 2.3c-.7.2-1 .8-1 1.7v.5M12 17h.01"/>',
    megaphone:'<path d="M4 10v4h4l8 4V6l-8 4H4Zm4 4 1 5h3l-1-4"/>',
    bell:'<path d="M6 9a6 6 0 0 1 12 0v5l2 2H4l2-2V9Zm4 9h4"/>',
    puzzle:'<path d="M4 4h6a2 2 0 1 0 4 0h6v6a2 2 0 1 1 0 4v6h-6a2 2 0 1 0-4 0H4v-6a2 2 0 1 1 0-4V4Z"/>',
    folder:'<path d="M3 6h7l2 2h9v11H3V6Z"/>',
    code:'<path d="m8 8-4 4 4 4m8-8 4 4-4 4m-2-10-4 12"/>',
    wallet:'<path d="M4 6h15v13H4V6Zm0 3h15m-4 4h6v4h-6v-4Z"/>',
    sliders:'<path d="M4 6h7m4 0h5M11 4v4M4 12h3m4 0h9M7 10v4M4 18h10m4 0h2m-6-2v4"/>'
  };
  return `<svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.dashboard}</svg>`;
}

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

let metaSignupConfig = null;
let metaSessionInfo = {};

function ensureMetaSdk(config){
  return new Promise((resolve,reject)=>{
    if(!config?.enabled) return reject(new Error("Integração Meta ainda não configurada."));
    if(window.FB){
      FB.init({appId:config.appId,cookie:true,xfbml:false,version:config.graphVersion||"v25.0"});
      return resolve();
    }
    const previous=window.fbAsyncInit;
    window.fbAsyncInit=function(){
      if(typeof previous==="function") previous();
      FB.init({appId:config.appId,cookie:true,xfbml:false,version:config.graphVersion||"v25.0"});
      resolve();
    };
    if(document.getElementById("facebook-jssdk")) return;
    const js=document.createElement("script");
    js.id="facebook-jssdk";
    js.async=true;
    js.defer=true;
    js.crossOrigin="anonymous";
    js.src="https://connect.facebook.net/pt_BR/sdk.js";
    js.onerror=()=>reject(new Error("Não foi possível carregar o SDK da Meta."));
    document.head.appendChild(js);
  });
}

window.addEventListener("message",event=>{
  if(!String(event.origin||"").includes("facebook.com")) return;
  let payload=event.data;
  try{ if(typeof payload==="string") payload=JSON.parse(payload); }catch(_){}
  if(payload?.type!=="WA_EMBEDDED_SIGNUP") return;
  const eventName=String(payload.event||"");
  if(eventName.startsWith("FINISH")){
    metaSessionInfo=payload.data||{};
  }
});

async function startMetaSignup(){
  const status=$("#metaConnectStatus");
  try{
    if(!metaSignupConfig?.enabled) throw new Error("A integração oficial da Meta ainda não está configurada.");
    await ensureMetaSdk(metaSignupConfig);
    if(status) status.textContent="Abrindo cadastro oficial da Meta...";
    metaSessionInfo={};

    FB.login(async response=>{
      try{
        const code=response?.authResponse?.code;
        if(!code){
          if(status) status.textContent="Conexão cancelada ou não autorizada.";
          return;
        }

        if(status) status.textContent="Finalizando conexão com a Meta...";
        const data=metaSessionInfo||{};
        await api("/meta/whatsapp/complete",{
          method:"POST",
          body:JSON.stringify({
            code,
            wabaId:data.waba_id||data.wabaId||"",
            phoneNumberId:data.phone_number_id||data.phoneNumberId||"",
            businessId:data.business_id||data.businessId||""
          })
        });

        if(status) status.textContent="WhatsApp conectado oficialmente pela Meta.";
        setTimeout(()=>loadSettings(),700);
      }catch(err){
        if(status) status.textContent=err.message||"Falha ao finalizar a conexão.";
      }
    },{
      config_id:metaSignupConfig.configId,
      response_type:"code",
      override_default_response_type:true,
      extras:{
        setup:{},
        featureType:"whatsapp_business_app_onboarding"
      }
    });
  }catch(err){
    if(status) status.textContent=err.message||"Falha ao iniciar a conexão Meta.";
  }
}

async function showWapiQr(connectionId){
  modal(`<div class="qr-modal-head"><div class="eyebrow">CONEXÃO WHATSAPP</div><h2>Conectar meu WhatsApp</h2></div><p class="qr-instructions">No celular, abra o WhatsApp e acesse <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>. Depois escaneie o QR Code abaixo.</p><div id="qrStatus" class="qr-status">Gerando QR Code...</div><div id="qr" class="qr-box"><div class="qr-loading"></div></div><div class="qr-meta"><span id="qrHint">O QR Code será renovado automaticamente.</span><span id="qrCountdown"></span></div><button id="qrRestart" class="ghost qr-restart" type="button">Gerar novo QR Code</button>`);
  let stopped=false; let born=Date.now();
  const renderQr=async()=>{
    const data=await api("/wapi/connection/"+connectionId+"/qr");
    const box=$("#qr");
    if(data&&data.qrcode){box.innerHTML=`<img src="${data.qrcode}" alt="QR Code do WhatsApp" class="wapi-qr-image" />`;$("#qrStatus").textContent="QR Code pronto para leitura.";born=Date.now();}
    else{box.innerHTML=`<div class="error">A W-API não retornou um QR Code.</div>`;$("#qrStatus").textContent="Não foi possível gerar o QR Code.";}
  };
  const checkStatus=async()=>{
    if(stopped||$("#modal").classList.contains("hidden"))return;
    try{const s=await api("/wapi/connection/"+connectionId+"/status");if(s.connected){stopped=true;$("#qrStatus").textContent="WhatsApp conectado com sucesso.";setTimeout(()=>{closeModal();loadSettings();},900);return;}}catch(err){$("#qrStatus").textContent=err.message;}
    setTimeout(checkStatus,1800);
  };
  $("#qrRestart").onclick=async()=>{try{$("#qrStatus").textContent="Gerando novo QR Code...";await api("/wapi/connection/"+connectionId+"/restart",{method:"POST"});await renderQr();}catch(err){$("#qrStatus").textContent=err.message;}};
  const timer=setInterval(()=>{if(stopped||$("#modal").classList.contains("hidden")){clearInterval(timer);return;}const left=Math.max(0,30-(Math.floor((Date.now()-born)/1000)%30));const el=$("#qrCountdown");if(el)el.textContent="Atualização em ~"+left+"s";},1000);
  try{await renderQr();setTimeout(checkStatus,700);}catch(err){$("#qrStatus").textContent=err.message||"Falha ao gerar QR Code.";$("#qr").innerHTML=`<div class="error">Verifique a instância e o token da W-API.</div>`;}
}
async function api(path, options={}) {
  const headers = { ...(options.headers||{}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = headers["Content-Type"] || "application/json";
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(API + path, { credentials:"include", ...options, headers });
  if (res.status === 401 || res.status === 403) {
    if (!path.includes("/auth/login")) logout();
  }
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
  return data;
}

function loginView(show=true){ $("#login").classList.toggle("hidden",!show); $("#app").classList.toggle("hidden",show); }
function logout(){ state.token=""; state.user=null; localStorage.removeItem("pp_token"); localStorage.removeItem("pp_user"); loginView(true); }
$("#logoutBtn").onclick = logout;
const togglePassword = $("#togglePassword");
if (togglePassword) {
  togglePassword.onclick = () => {
    const input = $("#password");
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    togglePassword.querySelector(".eye-open")?.classList.toggle("hidden", !showing);
    togglePassword.querySelector(".eye-closed")?.classList.toggle("hidden", showing);
    togglePassword.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
    togglePassword.title = showing ? "Mostrar senha" : "Ocultar senha";
  };
}
$("#loginForm").onsubmit = async e => {
  e.preventDefault(); $("#loginError").textContent="";
  try{
    const data = await api("/auth/login",{method:"POST",body:JSON.stringify({email:$("#email").value,password:$("#password").value})});
    state.token=data.token; state.user=data.user; localStorage.setItem("pp_token",state.token); localStorage.setItem("pp_user",JSON.stringify(state.user));
    loginView(false); initApp();
  }catch(err){ $("#loginError").textContent=err.message; }
};

function renderMenu(){
  $("#menu").innerHTML = '<div class="menu-title">MVP em teste</div>' +
    activeItems.map(([id,label,icon])=>`<div class="menu-item ${state.page===id?"active":""}" data-page="${id}" title="${label}">${menuIcon(icon)}<span class="menu-label">${label}</span></div>`).join("") +
    '<div class="menu-title">Próximas etapas</div>' +
    pendingItems.map(([label,icon])=>`<div class="menu-item pending" title="${label}">${menuIcon(icon)}<span class="menu-label">${label}</span><span class="badge">Em Breve</span></div>`).join("");
  document.querySelectorAll("[data-page]").forEach(el=>el.onclick=()=>navigate(el.dataset.page));
}
function navigate(page){state.page=page;renderMenu();loadPage();}
function setTitle(t){
  $("#pageTitle").textContent=t;
  const browserTitle = t === "Dashboard" ? "Bot" : t;
  document.title = `${browserTitle} | PortoPlan`;
}
function content(html){$("#content").innerHTML=html}
function modal(html){$("#modalBody").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){ $("#modal").classList.add("hidden"); $("#modalBody").innerHTML="" }
$("#modalClose").onclick=closeModal; $("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()}

async function loadPage(){
  try{
    if(state.page==="dashboard") return dashboard();
    if(state.page==="connections") return connections();
    if(state.page==="contacts") return contacts();
    if(state.page==="queues") return queues();
    if(state.page==="tickets") return tickets();
    if(state.page==="kanban") return kanban();
    if(state.page==="users") return users();
    if(state.page==="internal-chat") return internalChat();
    if(state.page==="chat") return internalChat();
  }catch(err){ content(`<div class="card"><div class="error">${esc(err.message)}</div></div>`) }
}

async function dashboard(){
  setTitle("Dashboard");
  const results = await Promise.allSettled([api("/whatsapp/?session=0"),api("/contacts?pageNumber=1&searchParam="),api("/queue"),api('/tickets?pageNumber=1&status=open&showAll=true&queueIds=[]&tags=[]&users=[]')]);
  const wa=results[0].status==="fulfilled"?(results[0].value||[]):[], ct=results[1].status==="fulfilled"?(results[1].value.contacts||[]):[], qs=results[2].status==="fulfilled"?(results[2].value||[]):[], tk=results[3].status==="fulfilled"?(results[3].value.tickets||[]):[];
  content(`<div class="grid">
    <div class="card"><h3>Backend</h3><div class="status-ok">Operacional</div></div>
    <div class="card"><h3>WhatsApp</h3><b>${wa.length}</b><div class="small">conexões cadastradas</div></div>
    <div class="card"><h3>Atendimentos</h3><b>${tk.length}</b><div class="small">abertos carregados</div></div>
    <div class="card"><h3>Contatos</h3><b>${ct.length}</b><div class="small">primeira página</div></div>
    <div class="card"><h3>Filas</h3><b>${qs.length}</b></div>
    <div class="card"><h3>Demais módulos</h3><div class="status-warn">Em Breve</div></div>
  </div>`);
}

async function connections(){
  setTitle("Conexões WhatsApp");
  const list=await api("/whatsapp/?session=0");
  content(`<div class="toolbar"><button class="primary" id="newWa">Nova conexão</button></div>
  <div class="table-wrap"><table><thead><tr><th>Nome</th><th>Status</th><th>Número</th><th>Ações</th></tr></thead><tbody>
  ${(list||[]).map(w=>`<tr><td>${esc(w.name)}</td><td><span class="pill">${esc(w.status||"")}</span></td><td>${esc(w.number||"")}</td>
  <td><button class="ghost qr" data-id="${w.id}">QR Code</button> <button class="ghost restart" data-id="${w.id}">Reiniciar</button></td></tr>`).join("")}
  </tbody></table></div>`);
  $("#newWa").onclick=async()=>{const name=prompt("Nome da conexão:","WhatsApp Principal"); if(!name)return; await api("/whatsapp/",{method:"POST",body:JSON.stringify({name,isDefault:false,queueIds:[]})}); connections()};
  document.querySelectorAll(".restart").forEach(b=>b.onclick=async()=>{await api("/whatsappsession/"+b.dataset.id,{method:"PUT"}); setTimeout(()=>showQr(b.dataset.id),800)});
  document.querySelectorAll(".qr").forEach(b=>b.onclick=()=>showQr(b.dataset.id));
}
async function showQr(id){
  modal(`
    <div class="qr-modal-head">
      <div>
        <div class="eyebrow">Conexão WhatsApp</div>
        <h2>Conectar meu WhatsApp</h2>
      </div>
    </div>
    <p class="qr-instructions">
      No celular, abra o WhatsApp e acesse <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>.
      Depois, escaneie o QR Code abaixo.
    </p>
    <div id="qrStatus" class="qr-status">Iniciando sessão...</div>
    <div id="qr" class="qr-box"><div class="qr-loading"></div></div>
    <div class="qr-meta">
      <span id="qrHint">Aguardando o primeiro QR Code...</span>
      <span id="qrCountdown"></span>
    </div>
    <button id="qrRestart" class="ghost qr-restart" type="button">Gerar novo QR Code</button>
  `);

  let stopped=false;
  let lastQr="";
  let qrBornAt=0;
  let tries=0;

  const setStatus=(msg,type="")=>{
    const el=$("#qrStatus");
    if(!el) return;
    el.textContent=msg;
    el.className="qr-status"+(type?(" "+type):"");
  };

  const renderQr=(value)=>{
    const box=$("#qr");
    if(!box || !value) return;
    box.innerHTML="";
    if(typeof QRCode!=="function"){
      box.innerHTML='<div class="error">Gerador visual de QR Code indisponível.</div>';
      return;
    }
    new QRCode(box,{text:value,width:300,height:300,correctLevel:QRCode.CorrectLevel.M});
    qrBornAt=Date.now();
    $("#qrHint").textContent="Por segurança, o QR Code é renovado automaticamente.";
  };

  const startSession=async(force=false)=>{
    setStatus(force?"Gerando um novo QR Code...":"Iniciando sessão...");
    try{
      await api("/whatsappsession/"+id,{method:force?"PUT":"POST"});
    }catch(e){
      setStatus("Aguardando o QR Code do WhatsApp...");
    }
  };

  $("#qrRestart").onclick=async()=>{
    lastQr="";
    qrBornAt=0;
    const box=$("#qr"); if(box) box.innerHTML='<div class="qr-loading"></div>';
    await startSession(true);
  };

  await startSession(false);

  const poll=async()=>{
    if(stopped || $("#modal").classList.contains("hidden")) return;
    try{
      const w=await api("/whatsapp/"+id+"?session=0");
      const status=String(w.status||"aguardando").toUpperCase();

      if(w.qrcode && w.qrcode!==lastQr){
        lastQr=w.qrcode;
        renderQr(w.qrcode);
        setStatus("QR Code pronto para leitura.","ready");
      }else if(status==="OPENING" || status==="QRCODE"){
        setStatus(lastQr?"QR Code pronto para leitura.":"Preparando QR Code...");
      }

      if(status==="CONNECTED"){
        stopped=true;
        setStatus("WhatsApp conectado com sucesso.","connected");
        $("#qrHint").textContent="Conexão concluída.";
        $("#qrCountdown").textContent="";
        setTimeout(()=>{ closeModal(); connections(); },1200);
        return;
      }

      if(status==="DISCONNECTED"){
        setStatus("Sessão desconectada. Gere um novo QR Code.","warning");
      }
    }catch(e){
      setStatus(e.message||"Falha ao consultar a conexão.","warning");
    }

    tries++;
    if(tries<240) setTimeout(poll,1000);
    else setStatus("Tempo de espera esgotado. Gere um novo QR Code.","warning");
  };

  const countdown=setInterval(()=>{
    if(stopped || $("#modal").classList.contains("hidden")){
      clearInterval(countdown); return;
    }
    const el=$("#qrCountdown");
    if(!el) return;
    if(!qrBornAt){ el.textContent=""; return; }
    const elapsed=Math.floor((Date.now()-qrBornAt)/1000);
    const left=Math.max(0,30-(elapsed%30));
    el.textContent=`Atualização em ~${left}s`;
  },1000);

  setTimeout(poll,350);
}
async function contacts(){
  setTitle("Contatos"); const data=await api("/contacts?pageNumber=1&searchParam=");
  content(`<div class="table-wrap"><table><thead><tr><th>Nome</th><th>WhatsApp</th><th>E-mail</th></tr></thead><tbody>${(data.contacts||[]).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.number)}</td><td>${esc(c.email||"")}</td></tr>`).join("")}</tbody></table></div>`);
}
async function queues(){
  setTitle("Filas"); const list=await api("/queue");
  content(`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Nome</th><th>Saudação</th></tr></thead><tbody>${(list||[]).map(q=>`<tr><td>${q.id}</td><td>${esc(q.name)}</td><td>${esc(q.greetingMessage||"")}</td></tr>`).join("")}</tbody></table></div>`);
}
async function users(){
  setTitle("Usuários"); const data=await api("/users?pageNumber=1&searchParam=");
  const list=data.users||data||[];
  content(`<div class="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th></tr></thead><tbody>${list.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.profile)}</td></tr>`).join("")}</tbody></table></div>`);
}
async function tickets(){
  setTitle("Atendimentos");
  const data=await api('/tickets?pageNumber=1&status=open&showAll=true&queueIds=[]&tags=[]&users=[]');
  const list=data.tickets||[];
  content(`<div class="table-wrap"><table><thead><tr><th>Contato</th><th>Status</th><th>Última mensagem</th></tr></thead><tbody>${list.map(t=>`<tr class="clickable ticket-row" data-id="${t.id}"><td>${esc(t.contact?.name||t.contactId)}</td><td>${esc(t.status)}</td><td>${esc(t.lastMessage||"")}</td></tr>`).join("")}</tbody></table></div>`);
  document.querySelectorAll(".ticket-row").forEach(r=>r.onclick=()=>openTicket(r.dataset.id));
}
async function openTicket(id){
  const data=await api("/messages/"+id+"?pageNumber=1"); const msgs=data.messages||[];
  modal(`<h2>${esc(data.ticket?.contact?.name||"Atendimento")}</h2><div class="messages" id="messages">${msgs.map(m=>`<div class="msg ${m.fromMe?"me":""}">${esc(m.body||"")}</div>`).join("")}</div>
  <div class="composer"><textarea id="msgBody" placeholder="Digite uma mensagem"></textarea><button class="primary" id="sendMsg">Enviar</button></div>`);
  const box=$("#messages"); box.scrollTop=box.scrollHeight;
  $("#sendMsg").onclick=async()=>{const body=$("#msgBody").value.trim();if(!body)return;await api("/messages/"+id,{method:"POST",body:JSON.stringify({body})});$("#msgBody").value="";setTimeout(()=>openTicket(id),700)};
}
async function kanban(){
  setTitle("Kanban");
  let board=await api("/company-kanban");
  if(!board || !Array.isArray(board.columns)) board={columns:[]};

  const save=async()=>api("/company-kanban",{method:"PUT",body:JSON.stringify(board)});
  const render=()=>{
    content(`
      <div class="kanban-toolbar">
        <button class="primary" id="addKanCol">+ Nova coluna</button>
        <span class="small">Arraste cartões entre colunas e reorganize as colunas livremente.</span>
      </div>
      <div class="kanban kanban-free" id="kanbanBoard">
        ${board.columns.map((col,ci)=>`
          <section class="kan-col" draggable="true" data-col="${ci}">
            <div class="kan-col-head">
              <h3 contenteditable="true" data-title="${ci}">${esc(col.title||"Sem título")}</h3>
              <button class="kan-more" data-del-col="${ci}" title="Excluir coluna">×</button>
            </div>
            <div class="kan-cards" data-drop-col="${ci}">
              ${(col.cards||[]).map((card,cardi)=>`
                <article class="ticket-card kan-card" draggable="true" data-card="${cardi}" data-from="${ci}">
                  <b>${esc(card.title||"Cartão")}</b>
                  ${card.text?`<div class="small">${esc(card.text)}</div>`:""}
                  <button class="kan-card-delete" data-del-card="${ci}:${cardi}" title="Excluir cartão">×</button>
                </article>`).join("")}
            </div>
            <button class="kan-add-card" data-add-card="${ci}">+ Adicionar cartão</button>
          </section>`).join("")}
        <button class="kan-new-column" id="addKanColInline">+</button>
      </div>
    `);

    const addColumn=async()=>{
      const title=prompt("Nome da nova coluna:","Nova coluna");
      if(!title)return;
      board.columns.push({id:"c"+Date.now(),title,cards:[]});
      await save(); render();
    };
    $("#addKanCol").onclick=addColumn;
    $("#addKanColInline").onclick=addColumn;

    document.querySelectorAll("[data-title]").forEach(el=>{
      el.onblur=async()=>{
        const i=+el.dataset.title;
        board.columns[i].title=el.textContent.trim()||"Sem título";
        await save();
      };
      el.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();el.blur();}};
    });

    document.querySelectorAll("[data-add-card]").forEach(btn=>btn.onclick=async()=>{
      const ci=+btn.dataset.addCard;
      const title=prompt("Título do cartão:");
      if(!title)return;
      const text=prompt("Descrição (opcional):","")||"";
      board.columns[ci].cards=board.columns[ci].cards||[];
      board.columns[ci].cards.push({id:"k"+Date.now(),title,text});
      await save();render();
    });

    document.querySelectorAll("[data-del-col]").forEach(btn=>btn.onclick=async()=>{
      const ci=+btn.dataset.delCol;
      if(!confirm("Excluir esta coluna e seus cartões?"))return;
      board.columns.splice(ci,1);await save();render();
    });
    document.querySelectorAll("[data-del-card]").forEach(btn=>btn.onclick=async()=>{
      const [ci,cardi]=btn.dataset.delCard.split(":").map(Number);
      board.columns[ci].cards.splice(cardi,1);await save();render();
    });

    let dragCard=null,dragCol=null;
    document.querySelectorAll(".kan-card").forEach(card=>{
      card.ondragstart=e=>{
        dragCard={from:+card.dataset.from,index:+card.dataset.card};
        dragCol=null;
        e.dataTransfer.effectAllowed="move";
        e.stopPropagation();
      };
    });
    document.querySelectorAll(".kan-cards").forEach(zone=>{
      zone.ondragover=e=>{e.preventDefault();zone.classList.add("drag-over")};
      zone.ondragleave=()=>zone.classList.remove("drag-over");
      zone.ondrop=async e=>{
        e.preventDefault();e.stopPropagation();zone.classList.remove("drag-over");
        if(!dragCard)return;
        const to=+zone.dataset.dropCol;
        const [item]=board.columns[dragCard.from].cards.splice(dragCard.index,1);
        board.columns[to].cards=board.columns[to].cards||[];
        board.columns[to].cards.push(item);
        dragCard=null;await save();render();
      };
    });
    document.querySelectorAll(".kan-col").forEach(col=>{
      col.ondragstart=e=>{
        if(e.target.closest(".kan-card")) return;
        dragCol=+col.dataset.col;dragCard=null;e.dataTransfer.effectAllowed="move";
      };
      col.ondragover=e=>e.preventDefault();
      col.ondrop=async e=>{
        if(dragCol===null)return;
        const to=+col.dataset.col;
        if(to===dragCol)return;
        const [item]=board.columns.splice(dragCol,1);
        board.columns.splice(to,0,item);
        dragCol=null;await save();render();
      };
    });
  };
  render();
}

async function internalChat(){
  setTitle("Chat interno");
  const users=await api("/internal-chat/contacts");
  content(`
    <div class="internal-chat">
      <aside class="chat-contacts">
        <div class="chat-contacts-head">
          <h3>Conversas</h3>
          <span class="small">Sua empresa + PortoPlan</span>
        </div>
        <div id="chatContactsList">
          ${users.length?users.map(u=>`
            <button class="chat-contact" data-chat-user="${u.id}">
              <span class="chat-avatar">${esc((u.name||"?").slice(0,1).toUpperCase())}</span>
              <span><b>${esc(u.name)}</b><small>${u.super?"PortoPlan • Administrador Master":esc(u.company?.name||u.email||"")}</small></span>
            </button>`).join(""):'<div class="empty-state">Nenhum usuário disponível para conversa.</div>'}
        </div>
      </aside>
      <section class="chat-thread" id="chatThread">
        <div class="chat-empty"><b>Chat interno</b><span>Selecione um usuário para iniciar uma conversa.</span></div>
      </section>
    </div>`);
  document.querySelectorAll("[data-chat-user]").forEach(btn=>btn.onclick=()=>openInternalThread(btn.dataset.chatUser,btn));
}

async function openInternalThread(userId,button){
  document.querySelectorAll(".chat-contact").forEach(x=>x.classList.remove("active"));
  button?.classList.add("active");
  const name=button?.querySelector("b")?.textContent||"Conversa";
  const data=await api("/internal-chat/messages/"+userId);
  const thread=$("#chatThread");
  thread.innerHTML=`
    <div class="chat-thread-head"><b>${esc(name)}</b><span class="small">Chat interno PortoPlan</span></div>
    <div class="chat-messages" id="internalMessages">
      ${data.map(m=>`<div class="chat-bubble ${String(m.senderId)===String(state.user.id)?"me":""}">${esc(m.body)}<small>${new Date(m.createdAt).toLocaleString("pt-BR")}</small></div>`).join("")}
    </div>
    <form class="chat-compose" id="internalChatForm">
      <textarea id="internalChatBody" placeholder="Digite uma mensagem..." required></textarea>
      <button class="primary" type="submit">Enviar</button>
    </form>`;
  const box=$("#internalMessages");box.scrollTop=box.scrollHeight;
  $("#internalChatForm").onsubmit=async e=>{
    e.preventDefault();
    const body=$("#internalChatBody").value.trim();if(!body)return;
    await api("/internal-chat/messages/"+userId,{method:"POST",body:JSON.stringify({body})});
    await openInternalThread(userId,button);
  };
}

function applySidebarState(){
  document.body.classList.toggle("sidebar-collapsed",state.sidebarCollapsed);
  const btn=$("#sidebarToggle");
  if(btn){
    btn.title=state.sidebarCollapsed?"Expandir menu":"Reduzir menu";
    btn.setAttribute("aria-label",btn.title);
  }
}
$("#sidebarToggle").onclick=()=>{
  state.sidebarCollapsed=!state.sidebarCollapsed;
  localStorage.setItem("pp_sidebar_collapsed",state.sidebarCollapsed?"1":"0");
  applySidebarState();
};

function openSettings(){
  $("#settingsDrawer").classList.add("open");
  $("#settingsDrawer").setAttribute("aria-hidden","false");
  $("#settingsBackdrop").classList.remove("hidden");
  loadSettings();
}
function closeSettings(){
  $("#settingsDrawer").classList.remove("open");
  $("#settingsDrawer").setAttribute("aria-hidden","true");
  $("#settingsBackdrop").classList.add("hidden");
}
$("#settingsBtn").onclick=openSettings;
$("#chatBtn").onclick=()=>navigate("chat");
$("#settingsClose").onclick=closeSettings;
$("#settingsBackdrop").onclick=closeSettings;

async function loadSettings(selectedId){
  const box=$("#settingsContent");
  box.innerHTML='<div class="drawer-loading">Carregando configurações...</div>';
  try{
    const users=await api("/profile/users");
    const selected=String(selectedId || state.user?.id || users[0]?.id || "");
    const profile=await api("/profile/users/"+selected);
    const connections=await api("/profile/connections");
    const wapiConfig=await api("/wapi/config");
    const canChoose=users.length>1;

    box.innerHTML=`
      ${canChoose?`<div class="settings-section"><label class="field-label">Usuário</label><select id="settingsUserSelect" class="settings-select">${users.map(u=>`<option value="${u.id}" ${String(u.id)===selected?"selected":""}>${esc(u.name)} · ${esc(u.company?.name||"")}</option>`).join("")}</select></div>`:""}
      <form id="profileForm">
        <div class="settings-section">
          <h3>Dados do usuário</h3>
          <div class="settings-grid">
            <label><span>Nome</span><input id="profileName" value="${esc(profile.name||"")}" /></label>
            <label><span>E-mail</span><input id="profileEmail" type="email" value="${esc(profile.email||"")}" /></label>
            <label><span>Telefone</span><input id="profilePhone" value="${esc(profile.phone||"")}" /></label>
            <label class="full"><span>Endereço</span><input id="profileAddress" value="${esc(profile.address||"")}" /></label>
            <label class="full"><span>Nova senha</span><input id="profilePassword" type="password" placeholder="Preencha apenas para alterar" /></label>
          </div>
          <div class="settings-actions"><button class="primary" type="submit">Salvar alterações</button><span id="profileSaveStatus" class="small"></span></div>
        </div>
      </form>
      <div class="settings-section">
        <h3>Conexão WhatsApp por QR Code</h3>
        <p class="settings-help">O Chatbot PortoPlan usa a W-API para vincular o WhatsApp por QR Code. O token da instância fica protegido no servidor.</p>
        ${wapiConfig.canAutoCreate
          ? `<button id="wapiCreateBtn" class="primary" type="button">Criar conexão e gerar QR Code</button><span id="wapiConnectStatus" class="small"></span>`
          : `<div class="settings-grid"><label class="full"><span>Instance ID da W-API</span><input id="wapiInstanceId" placeholder="Ex.: T34398-VYR3QD-MS29SL" /></label><label class="full"><span>Token da instância</span><input id="wapiToken" type="password" placeholder="Token da W-API" /></label></div><div class="settings-actions"><button id="wapiLinkBtn" class="primary" type="button">Vincular instância</button><span id="wapiConnectStatus" class="small"></span></div>`}
      </div>
      <div class="settings-section">
        <h3>Conexões cadastradas</h3>
        <p class="settings-help">${canChoose?"Como administrador PortoPlan, você visualiza todas as conexões.":"Aqui aparece somente a conexão vinculada ao seu usuário."}</p>
        <div class="settings-connections">
          ${connections.length?connections.map(w=>`
            <div class="connection-card">
              <div>
                <b>${esc(w.name||"WhatsApp")}</b>
                <span>${esc(w.company?.name||"")}</span>
              </div>
              <span class="connection-status ${String(w.status||"").toLowerCase()}">${esc(w.status||"DISCONNECTED")}</span>
              <div class="connection-actions">
                ${w.provider==="w-api"
                  ? `<button class="ghost settings-wapi-qr" data-id="${w.id}" type="button">QR Code</button>
                     <button class="ghost settings-wapi-disconnect" data-id="${w.id}" type="button">Desconectar</button>`
                  : `<span class="pill">Conexão legada</span><button class="ghost settings-qr" data-id="${w.id}" type="button">QR Code legado</button>`}
              </div>
            </div>`).join(""):'<div class="empty-state">Nenhuma conexão vinculada a este usuário.</div>'}
        </div>
      </div>
    `;

    $("#wapiCreateBtn")?.addEventListener("click",async()=>{
      const status=$("#wapiConnectStatus");
      try{
        status.textContent="Criando instância...";
        const created=await api("/wapi/connection/create",{method:"POST",body:JSON.stringify({name:"PortoPlan WhatsApp"})});
        status.textContent="Instância criada."; await showWapiQr(created.id);
      }catch(err){status.textContent=err.message;}
    });
    $("#wapiLinkBtn")?.addEventListener("click",async()=>{
      const status=$("#wapiConnectStatus");
      try{
        const instanceId=$("#wapiInstanceId").value.trim();
        const token=$("#wapiToken").value.trim();
        if(!instanceId||!token){status.textContent="Informe Instance ID e Token.";return;}
        status.textContent="Validando instância...";
        const linked=await api("/wapi/connection/link",{method:"POST",body:JSON.stringify({instanceId,token,name:"PortoPlan WhatsApp"})});
        status.textContent="Instância vinculada."; await showWapiQr(linked.id);
      }catch(err){status.textContent=err.message;}
    });
    $("#settingsUserSelect")?.addEventListener("change",e=>loadSettings(e.target.value));
    $("#profileForm").onsubmit=async e=>{
      e.preventDefault();
      const payload={
        name:$("#profileName").value.trim(),
        email:$("#profileEmail").value.trim(),
        phone:$("#profilePhone").value.trim(),
        address:$("#profileAddress").value.trim()
      };
      const password=$("#profilePassword").value;
      if(password) payload.password=password;
      await api("/profile/users/"+selected,{method:"PUT",body:JSON.stringify(payload)});
      $("#profileSaveStatus").textContent="Dados salvos.";
      if(String(state.user?.id)===selected){
        state.user={...state.user,...payload};
        delete state.user.password;
        localStorage.setItem("pp_user",JSON.stringify(state.user));
        $("#userLine").textContent=`${state.user.name||""} · ${state.user.email||""}`;
      }
    };

    document.querySelectorAll(".settings-wapi-qr").forEach(b=>b.onclick=()=>showWapiQr(b.dataset.id));
    document.querySelectorAll(".settings-wapi-disconnect").forEach(b=>b.onclick=async()=>{
      await api("/wapi/connection/"+b.dataset.id,{method:"DELETE"});
      loadSettings(selected);
    });
    document.querySelectorAll(".settings-qr").forEach(b=>b.onclick=()=>showProfileQr(b.dataset.id));
    document.querySelectorAll(".settings-disconnect").forEach(b=>b.onclick=async()=>{
      await api("/profile/connections/"+b.dataset.id+"/disconnect",{method:"DELETE"});
      loadSettings(selected);
    });
  }catch(err){
    box.innerHTML=`<div class="error">${esc(err.message)}</div>`;
  }
}

async function showProfileQr(id){
  modal(`
    <div class="qr-modal-head"><div class="eyebrow">CONEXÃO WHATSAPP</div><h2>Conectar meu WhatsApp</h2></div>
    <p class="qr-instructions">No celular, abra o WhatsApp e acesse <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>. Depois, escaneie o QR Code abaixo.</p>
    <div id="qrStatus" class="qr-status">Iniciando sessão...</div>
    <div id="qr" class="qr-box"><div class="qr-loading"></div></div>
    <div class="qr-meta"><span id="qrHint">Aguardando o primeiro QR Code...</span><span id="qrCountdown"></span></div>
    <button id="qrRestart" class="ghost qr-restart" type="button">Gerar novo QR Code</button>
  `);
  let stopped=false,lastQr="",qrBornAt=0;

  const start=async()=>{ await api("/profile/connections/"+id+"/start",{method:"POST"}); };
  const render=value=>{
    if(!value||value===lastQr)return;
    lastQr=value; const box=$("#qr"); box.innerHTML="";
    new QRCode(box,{text:value,width:300,height:300,correctLevel:QRCode.CorrectLevel.M});
    qrBornAt=Date.now(); $("#qrStatus").textContent="QR Code pronto para leitura.";
    $("#qrHint").textContent="Por segurança, o QR Code é renovado automaticamente.";
  };

  $("#qrRestart").onclick=async()=>{lastQr="";qrBornAt=0;$("#qr").innerHTML='<div class="qr-loading"></div>';await start();};
  try{await start();}catch(e){$("#qrStatus").textContent=e.message;}

  const poll=async()=>{
    if(stopped||$("#modal").classList.contains("hidden"))return;
    try{
      const list=await api("/profile/connections");
      const w=list.find(x=>String(x.id)===String(id));
      if(w){
        render(w.qrcode);
        const status=String(w.status||"").toUpperCase();
        if(status==="CONNECTED"){
          stopped=true;$("#qrStatus").textContent="WhatsApp conectado com sucesso.";
          setTimeout(()=>{closeModal();loadSettings();},1000);return;
        }
      }
    }catch(e){$("#qrStatus").textContent=e.message;}
    setTimeout(poll,1000);
  };
  const timer=setInterval(()=>{
    if(stopped||$("#modal").classList.contains("hidden")){clearInterval(timer);return;}
    if(qrBornAt){const left=Math.max(0,30-(Math.floor((Date.now()-qrBornAt)/1000)%30));$("#qrCountdown").textContent=`Atualização em ~${left}s`;}
  },1000);
  setTimeout(poll,350);
}

function initApp(){
  $("#userLine").textContent = state.user ? `${state.user.name||""} · ${state.user.email||""}` : "";
  applySidebarState();
  renderMenu();
  loadPage();
}
if(state.token){loginView(false);initApp()} else loginView(true);
