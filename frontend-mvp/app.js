const API = `${location.origin}/api`;
const state = {
  token: localStorage.getItem("pp_token") || "",
  user: JSON.parse(localStorage.getItem("pp_user") || "null"),
  page: "dashboard",
  sidebarCollapsed: localStorage.getItem("pp_sidebar_collapsed") === "1"
};

const soundState = {
  newMessages: localStorage.getItem("pp_new_message_sound") !== "0",
  activeChat: localStorage.getItem("pp_active_chat_sound") !== "0"
};
const notificationAudio = new Audio("./assets/nova-mensagem.mp3");
const activeChatAudio = new Audio("./assets/mensagem-ativa.mp3");
notificationAudio.preload = "auto";
activeChatAudio.preload = "auto";
let whatsappUnreadSnapshot = new Map();
let whatsappSoundPrimed = false;
let whatsappSoundTimer = null;

function playUiSound(audio){
  try{
    const player=audio.cloneNode(true);
    player.volume=audio.volume;
    const result=player.play();
    if(result?.catch) result.catch(()=>{});
  }catch(_){}
}

function playUiSoundCount(audio,count){
  const total=Math.max(0,Math.min(Number(count)||0,8));
  for(let i=0;i<total;i++){
    setTimeout(()=>playUiSound(audio),i*380);
  }
}

function updateGlobalSoundToggle(){
  const btn=$("#newMessageSoundToggle");
  if(!btn)return;
  btn.classList.toggle("enabled",soundState.newMessages);
  btn.setAttribute("aria-checked",soundState.newMessages?"true":"false");
  btn.title=soundState.newMessages?"Som de novas mensagens ativado":"Som de novas mensagens silenciado";
  btn.setAttribute("aria-label",btn.title);
}

function toggleGlobalSound(){
  soundState.newMessages=!soundState.newMessages;
  localStorage.setItem("pp_new_message_sound",soundState.newMessages?"1":"0");
  updateGlobalSoundToggle();
}

function updateActiveChatSoundToggle(){
  const btn=$("#activeChatSoundToggle");
  if(!btn)return;
  btn.textContent=soundState.activeChat?"🔊":"🔇";
  btn.classList.toggle("muted",!soundState.activeChat);
  btn.title=soundState.activeChat?"Som da conversa ativa ligado":"Som da conversa ativa silenciado";
  btn.setAttribute("aria-label",btn.title);
}

function toggleActiveChatSound(){
  soundState.activeChat=!soundState.activeChat;
  localStorage.setItem("pp_active_chat_sound",soundState.activeChat?"1":"0");
  updateActiveChatSoundToggle();
}

async function pollWhatsAppUnreadSound(){
  if(!state.token){
    clearTimeout(whatsappSoundTimer);
    return;
  }
  try{
    const list=await fetchTicketList(false);
    let playGeneral=0;
    let playActive=0;
    const next=new Map();

    for(const ticket of list){
      const id=String(ticket.id);
      const unread=Number(ticket.unreadMessages||0);
      next.set(id,unread);
      if(!whatsappSoundPrimed)continue;

      const previous=Number(whatsappUnreadSnapshot.get(id)||0);
      if(unread<=previous)continue;

      const isActive=
        state.page==="tickets" &&
        String(activeTicketId||"")===id &&
        document.visibilityState==="visible";

      const delta=unread-previous;
      if(isActive) playActive+=delta;
      else playGeneral+=delta;
    }

    whatsappUnreadSnapshot=next;
    if(!whatsappSoundPrimed){
      whatsappSoundPrimed=true;
    }else{
      if(playActive && soundState.activeChat) playUiSoundCount(activeChatAudio,playActive);
      if(playGeneral && soundState.newMessages) playUiSoundCount(notificationAudio,playGeneral);
    }
  }catch(_){}

  clearTimeout(whatsappSoundTimer);
  whatsappSoundTimer=setTimeout(pollWhatsAppUnreadSound,3000);
}

const activeItems = [
  ["dashboard","Dashboard","dashboard"],
  ["contacts","Contatos","contacts"],
  ["tickets","Atendimentos","chat"],
  ["kanban","Kanban","columns"],
  ["queues","Filas","layers"],
  ["users","Usuários","users"],
  ["connections","Conectar WhatsApp","link"]
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
    chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.4 0-2.73-.34-3.9-.95L3 21l1.98-5.28A8.46 8.46 0 0 1 3.5 11.5 8.5 8.5 0 1 1 21 11.5Z"/>',
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

let refreshPromise = null;

async function refreshSession(){
  if(refreshPromise) return refreshPromise;
  refreshPromise=(async()=>{
    try{
      const res=await fetch(API+"/auth/refresh_token",{
        method:"POST",
        credentials:"include",
        headers:{"Content-Type":"application/json"},
        body:"{}"
      });
      const text=await res.text();
      let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
      if(!res.ok || !data?.token) throw new Error((data&&(data.error||data.message))||"Sessão expirada");
      state.token=data.token;
      if(data.user) state.user=data.user;
      localStorage.setItem("pp_token",state.token);
      if(state.user) localStorage.setItem("pp_user",JSON.stringify(state.user));
      return true;
    }catch(err){
      logout();
      throw err;
    }finally{
      refreshPromise=null;
    }
  })();
  return refreshPromise;
}

async function api(path, options={}, retried=false) {
  const headers = { ...(options.headers||{}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = headers["Content-Type"] || "application/json";
  if (state.token) headers.Authorization = `Bearer ${state.token}`;

  const res = await fetch(API + path, { credentials:"include", ...options, headers });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  const invalidToken = res.status===403 && String((data&&(data.error||data.message))||"").toLowerCase().includes("invalid token");
  if((res.status===401 || invalidToken) && !retried && !path.includes("/auth/login") && !path.includes("/auth/refresh_token")){
    await refreshSession();
    return api(path,options,true);
  }

  if(res.status===401 && !path.includes("/auth/login")) logout();
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
async function navigate(page){
  state.page=page;
  renderMenu();
  content('<div class="drawer-loading">Carregando...</div>');
  await loadPage();
}
function setTitle(t){
  $("#pageTitle").textContent=t;
  const browserTitle = t === "Dashboard" ? "Bot" : t;
  document.title = `${browserTitle} | PortoPlan`;
}
function content(html){$("#content").innerHTML=html}
let forcePasswordChangeOpen=false;
function modal(html){$("#modalBody").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){
  if(forcePasswordChangeOpen)return;
  $("#modal").classList.add("hidden");
  $("#modalBody").innerHTML="";
}
$("#modalClose").onclick=closeModal;
$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()}

async function loadPage(){
  document.body.classList.toggle("tickets-page",state.page==="tickets");
  const titles={dashboard:"Dashboard",connections:"Conectar WhatsApp",contacts:"Contatos",queues:"Filas",tickets:"Atendimentos",kanban:"Kanban",users:"Usuários","internal-chat":"Chat interno",chat:"Chat interno"};
  if(titles[state.page]) setTitle(titles[state.page]);
  try{
    if(state.page==="dashboard") return await dashboard();
    if(state.page==="connections") return await connections();
    if(state.page==="contacts") return await contacts();
    if(state.page==="queues") return await queues();
    if(state.page==="tickets") return await tickets();
    if(state.page==="kanban") return await kanban();
    if(state.page==="users") return await users();
    if(state.page==="internal-chat" || state.page==="chat") return await internalChat();
    content('<div class="card"><div class="error">Página não encontrada.</div></div>');
  }catch(err){
    content(`<div class="card"><div class="error">Não foi possível carregar ${esc(titles[state.page]||"esta página")}: ${esc(err.message)}</div></div>`);
  }
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
  setTitle("Conectar WhatsApp");
  const list=await api("/whatsapp/?session=0");

  content(`
    <div class="toolbar">
      <button class="primary" id="newWa">Nova conexão</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nome</th><th>Status</th><th>Número</th><th>Ações</th></tr></thead>
        <tbody>
          ${(list||[]).map(w=>`
            <tr>
              <td>${esc(w.name)}</td>
              <td><span class="pill">${esc(w.status||"")}</span></td>
              <td>${esc(formatPhoneBR(w.number||""))}</td>
              <td>
                <button class="ghost qr" data-id="${w.id}">QR Code</button>
                <button class="ghost restart" data-id="${w.id}">Reiniciar</button>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `);

  $("#newWa").onclick=async()=>{
    const name=prompt("Nome da conexão:","WhatsApp Principal");
    if(!name)return;
    await api("/whatsapp/",{
      method:"POST",
      body:JSON.stringify({name,isDefault:false,queueIds:[]})
    });
    connections();
  };

  document.querySelectorAll(".restart").forEach(b=>b.onclick=async()=>{
    await api("/whatsappsession/"+b.dataset.id,{method:"PUT"});
    setTimeout(()=>showQr(b.dataset.id),800);
  });

  document.querySelectorAll(".qr").forEach(b=>b.onclick=()=>showQr(b.dataset.id));
}

async function showQr(id){
  modal(`
    <div class="qr-modal-head">
      <div>
        <div class="eyebrow">CONEXÃO WHATSAPP</div>
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

  const renderQr=value=>{
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
      return true;
    }catch(e){
      setStatus(e.message||"Não foi possível iniciar a sessão do WhatsApp.","warning");
      const hint=$("#qrHint");
      if(hint) hint.textContent="Verifique a conexão e tente gerar um novo QR Code.";
      return false;
    }
  };

  $("#qrRestart").onclick=async()=>{
    lastQr="";
    qrBornAt=0;
    const box=$("#qr");
    if(box) box.innerHTML='<div class="qr-loading"></div>';
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
        setTimeout(()=>{closeModal();connections();},1200);
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
      clearInterval(countdown);
      return;
    }
    const el=$("#qrCountdown");
    if(!el) return;
    if(!qrBornAt){
      el.textContent="";
      return;
    }
    const elapsed=Math.floor((Date.now()-qrBornAt)/1000);
    const left=Math.max(0,30-(elapsed%30));
    el.textContent=`Atualização em ~${left}s`;
  },1000);

  setTimeout(poll,350);
}
async function contacts(){
  setTitle("Contatos");
  const data=await api("/contacts?pageNumber=1&searchParam=");
  const list=data.contacts||[];

  content(`
    <div class="toolbar contacts-toolbar-actions">
      <button class="primary" id="newContactBtn" type="button">Novo Contato</button>
      <button class="ghost google-contacts-btn" id="importGoogleContactsBtn" type="button">
        <span class="google-g" aria-hidden="true">G</span>
        Importar do Google
      </button>
      <button class="toolbar-icon-btn" id="importContactsBtn" type="button" title="Importar Contatos" aria-label="Importar Contatos">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12"/>
          <path d="m7 10 5 5 5-5"/>
          <path d="M5 20h14"/>
        </svg>
      </button>
      <button class="toolbar-icon-btn" id="exportContactsBtn" type="button" title="Exportar Contatos" aria-label="Exportar Contatos">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16V4"/>
          <path d="m7 9 5-5 5 5"/>
          <path d="M5 20h14"/>
        </svg>
      </button>
      <button class="ghost danger bulk-delete-contacts" id="deleteSelectedContactsBtn" type="button" disabled>
        Excluir selecionados
      </button>
      <input id="importContactsFile" type="file" accept=".csv,text/csv" class="hidden" />
      <span id="contactsSelectionStatus" class="small"></span>
      <span id="contactsImportStatus" class="small"></span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="contact-check-col"><input id="selectAllContacts" class="contact-check" type="checkbox" aria-label="Selecionar todos os contatos" /></th>
            <th>Nome</th><th>Empresa</th><th>E-mail</th><th>Telefone</th><th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(c=>`
            <tr>
              <td class="contact-check-col"><input class="contact-check contact-row-check" type="checkbox" data-id="${c.id}" aria-label="Selecionar ${esc(c.name||"contato")}" /></td>
              <td>${esc(c.name)}</td>
              <td>${esc(c.companyName||"")}</td>
              <td>${esc(c.email||"")}</td>
              <td>${esc(formatPhoneBR(c.number||""))}</td>
              <td>
                <div class="contact-icon-actions">
                  <button class="contact-icon-btn start-chat-contact" data-id="${c.id}" title="Iniciar conversa" aria-label="Iniciar conversa">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.4 0-2.73-.34-3.9-.95L3 21l1.98-5.28A8.46 8.46 0 0 1 3.5 11.5 8.5 8.5 0 1 1 21 11.5Z"/>
                    </svg>
                  </button>
                  <button class="contact-icon-btn edit-contact-row" data-id="${c.id}" title="Editar contato" aria-label="Editar contato">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>
                    </svg>
                  </button>
                  <button class="contact-icon-btn danger delete-contact-row" data-id="${c.id}" data-name="${esc(c.name||"contato")}" title="Excluir contato" aria-label="Excluir contato">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 6h18"/>
                      <path d="M8 6V4h8v2"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/>
                      <path d="M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `);

  const findContact=id=>list.find(item=>String(item.id)===String(id));

  let selectAllMode=false;
  const selectedContactIds=new Set();

  const updateContactSelectionUi=()=>{
    const deleteBtn=$("#deleteSelectedContactsBtn");
    const status=$("#contactsSelectionStatus");
    const count=selectAllMode ? Number(data.count||list.length) : selectedContactIds.size;

    if(deleteBtn) deleteBtn.disabled=count===0;
    if(status){
      status.textContent=count>0
        ? `${count} contato${count===1?"":"s"} selecionado${count===1?"":"s"}`
        : "";
    }
  };

  $("#selectAllContacts")?.addEventListener("change",e=>{
    selectAllMode=e.target.checked;
    selectedContactIds.clear();
    document.querySelectorAll(".contact-row-check").forEach(check=>{
      check.checked=selectAllMode;
      check.disabled=selectAllMode;
    });
    updateContactSelectionUi();
  });

  document.querySelectorAll(".contact-row-check").forEach(check=>{
    check.addEventListener("change",()=>{
      const id=Number(check.dataset.id);
      if(check.checked) selectedContactIds.add(id);
      else selectedContactIds.delete(id);
      updateContactSelectionUi();
    });
  });

  $("#deleteSelectedContactsBtn")?.addEventListener("click",async()=>{
    const count=selectAllMode ? Number(data.count||list.length) : selectedContactIds.size;
    if(!count)return;

    const message=selectAllMode
      ? `Excluir TODOS os ${count} contatos desta empresa? Esta ação não pode ser desfeita.`
      : `Excluir ${count} contato${count===1?"":"s"} selecionado${count===1?"":"s"}? Esta ação não pode ser desfeita.`;

    if(!confirm(message))return;

    const btn=$("#deleteSelectedContactsBtn");
    btn.disabled=true;
    try{
      const result=await api("/contacts/delete-selected",{
        method:"POST",
        body:JSON.stringify({
          all:selectAllMode,
          ids:selectAllMode?[]:Array.from(selectedContactIds)
        })
      });

      if(result.failed){
        alert(`${result.deleted||0} contato(s) excluído(s). ${result.failed} não puderam ser excluídos.`);
      }
      await contacts();
    }catch(err){
      alert(err.message||"Não foi possível excluir os contatos selecionados.");
      btn.disabled=false;
    }
  });

  document.querySelectorAll(".start-chat-contact").forEach(btn=>{
    btn.onclick=async()=>{
      btn.disabled=true;
      try{
        const result=await api("/contacts/"+btn.dataset.id+"/start-conversation",{
          method:"POST",
          body:"{}"
        });
        localStorage.setItem("pp_open_ticket",String(result.ticketId));
        await navigate("tickets");
      }catch(err){
        alert(err.message||"Não foi possível iniciar a conversa.");
      }finally{
        btn.disabled=false;
      }
    };
  });

  document.querySelectorAll(".edit-contact-row").forEach(btn=>{
    btn.onclick=()=>{
      const item=findContact(btn.dataset.id);
      if(!item)return;

      modal(`
        <h2>Editar contato</h2>
        <div class="settings-grid user-edit-grid">
          <label class="full"><span>Nome</span><input id="editContactName" value="${esc(item.name||"")}" /></label>
          <label><span>Empresa</span><input id="editContactCompany" value="${esc(item.companyName||"")}" /></label>
          <label><span>E-mail</span><input id="editContactEmail" type="email" value="${esc(item.email||"")}" /></label>
          <label class="full"><span>Telefone</span><input id="editContactPhone" inputmode="tel" value="${esc(formatPhoneBR(item.number||""))}" /></label>
        </div>
        <div class="settings-actions">
          <button class="primary" id="saveContactEdit" type="button">Salvar contato</button>
          <span id="editContactStatus" class="small"></span>
        </div>
      `);

      $("#editContactPhone")?.addEventListener("input",e=>{e.target.value=formatPhoneBR(e.target.value);});

      $("#saveContactEdit").onclick=async()=>{
        const status=$("#editContactStatus");
        status.textContent="Salvando...";
        try{
          await api("/contacts/"+item.id+"/basic",{
            method:"PUT",
            body:JSON.stringify({
              name:$("#editContactName").value.trim(),
              company:$("#editContactCompany").value.trim(),
              email:$("#editContactEmail").value.trim(),
              number:$("#editContactPhone").value.replace(/\D/g,"")
            })
          });
          status.textContent="Contato salvo.";
          setTimeout(()=>{closeModal();contacts();},500);
        }catch(err){
          status.textContent=err.message||"Não foi possível salvar o contato.";
        }
      };
    };
  });

  document.querySelectorAll(".delete-contact-row").forEach(btn=>{
    btn.onclick=async()=>{
      const name=btn.dataset.name||"este contato";
      if(!confirm(`Excluir ${name}? Esta ação não pode ser desfeita.`))return;
      try{
        await api("/contacts/"+btn.dataset.id,{method:"DELETE"});
        await contacts();
      }catch(err){
        alert(err.message||"Não foi possível excluir o contato.");
      }
    };
  });

  $("#newContactBtn").onclick=()=>{
    modal(`
      <h2>Novo Contato</h2>
      <div class="settings-grid user-edit-grid">
        <label class="full"><span>Nome</span><input id="newContactName" autocomplete="name" /></label>
        <label><span>Empresa</span><input id="newContactCompany" autocomplete="organization" /></label>
        <label><span>E-mail</span><input id="newContactEmail" type="email" autocomplete="email" /></label>
        <label class="full"><span>Telefone</span><input id="newContactPhone" inputmode="tel" autocomplete="tel" placeholder="55 (00) 00000-0000" /></label>
      </div>
      <div class="settings-actions">
        <button class="primary" id="saveNewContact" type="button">Cadastrar contato</button>
        <span id="newContactStatus" class="small"></span>
      </div>
    `);

    $("#newContactPhone")?.addEventListener("input",e=>{e.target.value=formatPhoneBR(e.target.value);});

    $("#saveNewContact").onclick=async()=>{
      const status=$("#newContactStatus");
      const button=$("#saveNewContact");
      status.textContent="Salvando...";
      button.disabled=true;
      try{
        await api("/contacts/basic",{
          method:"POST",
          body:JSON.stringify({
            name:$("#newContactName").value.trim(),
            company:$("#newContactCompany").value.trim(),
            email:$("#newContactEmail").value.trim(),
            number:$("#newContactPhone").value.replace(/\D/g,"")
          })
        });
        status.textContent="Contato cadastrado.";
        setTimeout(()=>{closeModal();contacts();},500);
      }catch(err){
        status.textContent=err.message||"Não foi possível cadastrar o contato.";
        button.disabled=false;
      }
    };
  };

  $("#importContactsBtn").onclick=()=>$("#importContactsFile").click();

  $("#importGoogleContactsBtn").onclick=async()=>{
    const btn=$("#importGoogleContactsBtn");
    const status=$("#contactsImportStatus");
    btn.disabled=true;
    status.textContent="Abrindo autorização do Google...";
    try{
      const result=await api("/google/contacts/auth-url");
      if(!result?.authUrl) throw new Error("Não foi possível iniciar a autorização do Google.");
      window.location.href=result.authUrl;
    }catch(err){
      status.textContent=err.message||"Não foi possível conectar ao Google Contacts.";
      btn.disabled=false;
    }
  };

  const googleParams=new URLSearchParams(window.location.search);
  const googleResult=googleParams.get("googleContacts");
  if(googleResult){
    const status=$("#contactsImportStatus");
    if(googleResult==="success"){
      const created=Number(googleParams.get("created")||0);
      const updated=Number(googleParams.get("updated")||0);
      const ignored=Number(googleParams.get("ignored")||0);
      status.textContent=`Google Contacts importado: ${created} novo${created===1?"":"s"}, ${updated} atualizado${updated===1?"":"s"}, ${ignored} ignorado${ignored===1?"":"s"}.`;
    }else{
      status.textContent="Falha no Google Contacts: "+(googleParams.get("message")||"autorização não concluída.");
    }
    history.replaceState({},document.title,window.location.pathname);
  }

  $("#importContactsFile").onchange=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;

    const status=$("#contactsImportStatus");
    status.textContent="Importando contatos...";

    try{
      const form=new FormData();
      form.append("file",file);
      const result=await api("/contacts/import-csv",{method:"POST",body:form});
      const details=[
        `${result.created||0} novo${result.created===1?"":"s"}`,
        `${result.updated||0} atualizado${result.updated===1?"":"s"}`
      ];
      if(result.ignored) details.push(`${result.ignored} ignorado${result.ignored===1?"":"s"}`);
      status.textContent="Importação concluída: "+details.join(", ")+".";
      e.target.value="";
      setTimeout(()=>contacts(),900);
    }catch(err){
      status.textContent="Falha na importação: "+err.message;
      e.target.value="";
    }
  };

  $("#exportContactsBtn").onclick=async()=>{
    const btn=$("#exportContactsBtn");
    const status=$("#contactsImportStatus");
    btn.disabled=true;
    status.textContent="Preparando exportação...";

    try{
      const headers={};
      if(state.token) headers.Authorization=`Bearer ${state.token}`;
      let res=await fetch(API+"/contacts/export-csv",{credentials:"include",headers});

      if(res.status===401 || res.status===403){
        await refreshSession();
        headers.Authorization=`Bearer ${state.token}`;
        res=await fetch(API+"/contacts/export-csv",{credentials:"include",headers});
      }

      if(!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob=await res.blob();
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");
      link.href=url;

      const disposition=res.headers.get("Content-Disposition")||"";
      const match=disposition.match(/filename="?([^";]+)"?/i);
      link.download=match?.[1]||"contatos-portoplan.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      status.textContent="Exportação concluída.";
    }catch(err){
      status.textContent="Falha na exportação: "+err.message;
    }finally{
      btn.disabled=false;
    }
  };
}
async function queues(){
  setTitle("Filas"); const list=await api("/queue");
  content(`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Nome</th><th>Saudação</th></tr></thead><tbody>${(list||[]).map(q=>`<tr><td>${q.id}</td><td>${esc(q.name)}</td><td>${esc(q.greetingMessage||"")}</td></tr>`).join("")}</tbody></table></div>`);
}
async function users(){
  setTitle("Usuários");
  const data=await api("/users?pageNumber=1&searchParam=");
  const list=data.users||data||[];
  const canManage=Boolean(state.user?.super) || String(state.user?.profile||"").toLowerCase()==="admin";

  content(`
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Acesso</th>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>Senha temporária</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(u=>`
            <tr>
              <td>${esc(u.name||"")}</td>
              <td>${esc(formatPhoneBR(u.phone||""))}</td>
              <td><span class="access-pill ${u.active===false?"blocked":"allowed"}">${u.active===false?"Não liberado":"Liberado"}</span></td>
              <td>${esc(u.email||"")}</td>
              <td>${esc(u.super?"Superusuário":u.profile==="admin"?"Administrador":"Usuário")}</td>
              <td>
                ${canManage && String(u.id)!==String(state.user?.id)
                  ? `<button class="ghost temp-password-user" data-id="${u.id}">🔑 Senha temporária</button>`
                  : '<span class="muted">—</span>'}
              </td>
              <td>
                <div class="user-actions">
                  ${canManage || String(u.id)===String(state.user?.id)
                    ? `<button class="ghost edit-user-row" data-id="${u.id}">Editar</button>`
                    : ""}
                  ${canManage && String(u.id)!==String(state.user?.id) && !u.super
                    ? `<button class="ghost danger delete-user-row" data-id="${u.id}" data-name="${esc(u.name||"usuário")}">Excluir</button>`
                    : ""}
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `);

  const findUser=id=>list.find(u=>String(u.id)===String(id));

  const openEditUser=id=>{
    const u=findUser(id);
    if(!u)return;
    const editingSelf=String(u.id)===String(state.user?.id);
    const canEditAccess=canManage && !u.super;

    modal(`
      <h2>Editar usuário</h2>
      <div class="settings-grid user-edit-grid">
        <label class="full"><span>Nome</span><input id="editUserName" value="${esc(u.name||"")}" /></label>
        <label><span>Telefone</span><input id="editUserPhone" inputmode="tel" value="${esc(formatPhoneBR(u.phone||""))}" /></label>
        <label><span>E-mail</span><input id="editUserEmail" type="email" value="${esc(u.email||"")}" /></label>
        <label><span>Acesso</span>
          <select id="editUserActive" class="settings-select" ${canEditAccess?"":"disabled"}>
            <option value="true" ${u.active===false?"":"selected"}>Liberado</option>
            <option value="false" ${u.active===false?"selected":""}>Não liberado</option>
          </select>
        </label>
        <label><span>Perfil</span>
          <select id="editUserProfile" class="settings-select" ${canEditAccess?"":"disabled"}>
            <option value="user" ${u.profile==="user"?"selected":""}>Usuário</option>
            <option value="admin" ${u.profile==="admin"?"selected":""}>Administrador</option>
          </select>
        </label>
        ${editingSelf?'<label class="full"><span>Senha atual</span><input id="editUserCurrentPassword" type="password" placeholder="Obrigatória para alterar seu e-mail" /></label>':""}
      </div>
      <div class="settings-actions">
        <button class="primary" id="saveUserEdit" type="button">Salvar usuário</button>
        <span id="editUserStatus" class="small"></span>
      </div>
    `);

    const phone=$("#editUserPhone");
    if(phone) phone.addEventListener("input",e=>{e.target.value=formatPhoneBR(e.target.value);});

    $("#saveUserEdit").onclick=async()=>{
      const status=$("#editUserStatus");
      const payload={
        name:$("#editUserName").value.trim(),
        phone:$("#editUserPhone").value.replace(/\D/g,""),
        email:$("#editUserEmail").value.trim()
      };

      if(canEditAccess){
        payload.active=$("#editUserActive").value==="true";
        payload.profile=$("#editUserProfile").value;
      }

      if(editingSelf && $("#editUserCurrentPassword")){
        payload.currentPassword=$("#editUserCurrentPassword").value;
      }

      status.textContent="Salvando...";
      try{
        await api("/users/"+u.id,{method:"PUT",body:JSON.stringify(payload)});
        status.textContent="Usuário salvo.";
        if(editingSelf){
          state.user={...state.user,name:payload.name,email:payload.email,phone:payload.phone};
          localStorage.setItem("pp_user",JSON.stringify(state.user));
          $("#userLine").textContent=`${state.user.name||""} · ${state.user.email||""}`;
        }
        setTimeout(()=>{closeModal();users();},500);
      }catch(err){
        status.textContent=err.message||"Não foi possível salvar o usuário.";
      }
    };
  };

  const openTemporaryPassword=id=>{
    const u=findUser(id);
    if(!u)return;

    modal(`
      <div class="temporary-password-modal">
        <h2>Definir senha temporária</h2>
        <p>Cliente: ${esc(u.company?.name||u.name||u.email||"Usuário")}. A senha atual será substituída e, no próximo acesso, o cliente deverá criar uma senha pessoal.</p>

        <div class="temporary-password-fields">
          <label>
            <span>Senha temporária</span>
            <input id="temporaryPassword" type="password" minlength="8" placeholder="Mínimo de 8 caracteres" autocomplete="new-password" />
          </label>
          <label>
            <span>Confirmar senha temporária</span>
            <input id="temporaryPasswordConfirm" type="password" minlength="8" autocomplete="new-password" />
          </label>
        </div>

        <div id="temporaryPasswordStatus" class="temporary-password-status"></div>

        <div class="temporary-password-actions">
          <button class="ghost" id="cancelTemporaryPassword" type="button">Cancelar</button>
          <button class="primary" id="saveTemporaryPassword" type="button">Definir senha temporária</button>
        </div>
      </div>
    `);

    setTimeout(()=>$("#temporaryPassword")?.focus(),50);
    $("#cancelTemporaryPassword").onclick=closeModal;
    $("#saveTemporaryPassword").onclick=async()=>{
      const password=$("#temporaryPassword").value;
      const confirmation=$("#temporaryPasswordConfirm").value;
      const status=$("#temporaryPasswordStatus");

      if(password.length<8){
        status.textContent="A senha temporária deve ter no mínimo 8 caracteres.";
        return;
      }
      if(password!==confirmation){
        status.textContent="As senhas temporárias não conferem.";
        return;
      }

      status.textContent="Salvando...";
      try{
        await api("/users/"+u.id+"/temporary-password",{
          method:"POST",
          body:JSON.stringify({password,confirmation})
        });
        status.textContent="Senha temporária definida.";
        setTimeout(()=>{closeModal();users();},500);
      }catch(err){
        status.textContent=err.message||"Não foi possível definir a senha temporária.";
      }
    };
  };

  document.querySelectorAll(".edit-user-row").forEach(btn=>btn.onclick=()=>openEditUser(btn.dataset.id));
  document.querySelectorAll(".temp-password-user").forEach(btn=>btn.onclick=()=>openTemporaryPassword(btn.dataset.id));
  document.querySelectorAll(".delete-user-row").forEach(btn=>{
    btn.onclick=async()=>{
      const name=btn.dataset.name||"este usuário";
      if(!confirm(`Excluir ${name}? Esta ação não pode ser desfeita.`))return;
      try{
        await api("/users/"+btn.dataset.id,{method:"DELETE"});
        await users();
      }catch(err){
        alert(err.message||"Não foi possível excluir o usuário.");
      }
    };
  });
}

function openForcedPasswordChange(){
  if(!state.user?.mustChangePassword)return;

  forcePasswordChangeOpen=true;
  $("#modalClose").classList.add("hidden");

  modal(`
    <div class="temporary-password-modal forced-password-change">
      <h2>Crie sua nova senha</h2>
      <p>Você acessou com uma senha temporária. Antes de continuar, crie uma senha pessoal para sua conta.</p>

      <div class="temporary-password-fields">
        <label>
          <span>Nova senha</span>
          <input id="forcedNewPassword" type="password" minlength="8" placeholder="Mínimo de 8 caracteres" autocomplete="new-password" />
        </label>
        <label>
          <span>Confirmar nova senha</span>
          <input id="forcedNewPasswordConfirm" type="password" minlength="8" autocomplete="new-password" />
        </label>
      </div>

      <div id="forcedPasswordStatus" class="temporary-password-status"></div>

      <div class="temporary-password-actions forced">
        <button class="primary" id="saveForcedPassword" type="button">Salvar nova senha</button>
      </div>
    </div>
  `);

  setTimeout(()=>$("#forcedNewPassword")?.focus(),50);

  $("#saveForcedPassword").onclick=async()=>{
    const password=$("#forcedNewPassword").value;
    const confirmation=$("#forcedNewPasswordConfirm").value;
    const status=$("#forcedPasswordStatus");

    if(password.length<8){
      status.textContent="A nova senha deve ter no mínimo 8 caracteres.";
      return;
    }
    if(password!==confirmation){
      status.textContent="As senhas não conferem.";
      return;
    }

    status.textContent="Salvando...";
    try{
      await api("/users/change-temporary-password",{
        method:"POST",
        body:JSON.stringify({password,confirmation})
      });

      state.user={...state.user,mustChangePassword:false};
      localStorage.setItem("pp_user",JSON.stringify(state.user));
      forcePasswordChangeOpen=false;
      $("#modalClose").classList.remove("hidden");
      $("#modal").classList.add("hidden");
      $("#modalBody").innerHTML="";
    }catch(err){
      status.textContent=err.message||"Não foi possível alterar a senha.";
    }
  };
}

let ticketsRefreshTimer=null;
let ticketMessagesRefreshTimer=null;
let activeTicketId=null;
let ticketsCache=[];
let ticketMessagesCache=[];
let ticketAutoScroll=true;
let ticketReplyingMessage=null;
let ticketDetailsCollapsed=localStorage.getItem("pp_ticket_details_collapsed")==="1";

function ticketStatusLabel(status){
  const value=String(status||"").toLowerCase();
  if(value==="pending") return "Aguardando";
  if(value==="open") return "Em atendimento";
  if(value==="closed") return "Finalizado";
  return status||"";
}

function ticketTime(value){
  if(!value)return "";
  try{
    return new Date(value).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  }catch(_){return ""}
}

function ticketInitials(name){
  return String(name||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"?";
}

function ticketCompany(contact){
  const extra=Array.isArray(contact?.extraInfo)?contact.extraInfo:[];
  const field=extra.find(x=>String(x?.name||"").toLowerCase()==="empresa");
  return String(field?.value||"").trim();
}

function ticketResolvedNumber(ticket){
  return String(ticket?.resolvedNumber||ticket?.contact?.number||"").replace(/\D/g,"");
}

function ticketContactName(ticket){
  const c=ticket?.contact||{};
  const name=String(c.name||"").trim();
  const number=ticketResolvedNumber(ticket);
  const company=ticketCompany(c);

  if(c.isGroup || ticket?.isGroup){
    if(name && !name.includes("@g.us") && !/^\d+-\d+$/.test(name))return name;
    return "Grupo WhatsApp";
  }

  const technical=!name || /^\d+$/.test(name) || name.includes("@lid") || name.includes("@s.whatsapp.net") || /^\d+-\d+$/.test(name);
  if(technical)return formatPhoneBR(number)||name||"Contato";

  return company?`${name} | ${company}`:name;
}

function canDeleteWhatsAppData(){
  const email=String(state.user?.email||"").trim().toLowerCase();
  return email==="lucas.rubinger@gmail.com" || email==="financeiro@portoplan.com.br";
}

function ticketPinIcon(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6Z"/><path d="M12 15v6"/></svg>';
}

function ticketChevronIcon(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg>';
}

function ticketMediaHtml(m){
  if(!m?.id)return "";
  const type=String(m.mediaType||"").toLowerCase();
  const body=String(m.body||"");
  const ext=(body.split(".").pop()||"").toLowerCase();
  const hasFileExt=["pdf","doc","docx","xls","xlsx","ppt","pptx","txt","zip","rar","csv"].includes(ext);
  const isMediaType=
    type.includes("image") ||
    type.includes("video") ||
    type.includes("audio") ||
    type.includes("ptt") ||
    type.includes("sticker") ||
    type.includes("document") ||
    type.includes("application");

  if(!m.mediaUrl && !isMediaType && !hasFileExt)return "";

  const id=esc(m.id);
  const name=esc(body||"arquivo");
  let kind="file";

  if(type.includes("image") || type.includes("sticker"))kind="image";
  else if(type.includes("video"))kind="video";
  else if(type.includes("audio") || type.includes("ptt"))kind="audio";

  if(kind==="file"){
    return `<a class="ticket-file-link" href="#" data-media-id="${id}" data-media-kind="file" data-media-name="${name}">📎 ${name||"Abrir documento"}</a>`;
  }

  return `<div class="ticket-media-slot" data-media-id="${id}" data-media-kind="${kind}" data-media-name="${name}">
    <span>Carregando ${kind==="image"?"imagem":kind==="video"?"vídeo":"áudio"}...</span>
  </div>`;
}

async function openTicketMediaModal(kind,url,name){
  if(kind==="image"){
    modal(`<div class="ticket-media-modal"><img src="${url}" alt="${esc(name||"Imagem")}" /></div>`);
    return;
  }
  if(kind==="video"){
    modal(`<div class="ticket-media-modal"><video controls autoplay src="${url}"></video></div>`);
    return;
  }
  if(kind==="audio"){
    modal(`<div class="ticket-media-modal audio"><audio controls autoplay src="${url}"></audio></div>`);
  }
}

async function hydrateTicketMedia(container){
  if(!container)return;
  const nodes=[...container.querySelectorAll("[data-media-id]")];

  await Promise.all(nodes.map(async node=>{
    if(node.dataset.mediaLoaded==="1")return;
    node.dataset.mediaLoaded="1";

    try{
      const headers={};
      if(state.token)headers.Authorization=`Bearer ${state.token}`;
      let response=await fetch(API+"/messages/"+encodeURIComponent(node.dataset.mediaId)+"/media",{
        credentials:"include",
        headers
      });

      if((response.status===401 || response.status===403) && typeof refreshSession==="function"){
        await refreshSession();
        if(state.token)headers.Authorization=`Bearer ${state.token}`;
        response=await fetch(API+"/messages/"+encodeURIComponent(node.dataset.mediaId)+"/media",{
          credentials:"include",
          headers
        });
      }

      if(!response.ok)throw new Error("HTTP "+response.status);

      const blob=await response.blob();
      const url=URL.createObjectURL(blob);
      const kind=node.dataset.mediaKind;
      const name=node.dataset.mediaName||"arquivo";

      if(kind==="image"){
        node.innerHTML=`<button type="button" class="ticket-media-open" data-open-media="image"><img class="ticket-media-image" src="${url}" alt="Imagem enviada" /></button>`;
        node.querySelector("[data-open-media]")?.addEventListener("click",()=>openTicketMediaModal("image",url,name));
      }else if(kind==="video"){
        node.innerHTML=`<button type="button" class="ticket-media-open video" data-open-media="video"><video class="ticket-media-video" muted preload="metadata" src="${url}"></video><span>▶ Abrir vídeo</span></button>`;
        node.querySelector("[data-open-media]")?.addEventListener("click",()=>openTicketMediaModal("video",url,name));
      }else if(kind==="audio"){
        node.innerHTML=`<button type="button" class="ticket-audio-open" data-open-media="audio">🔊 Abrir áudio</button>`;
        node.querySelector("[data-open-media]")?.addEventListener("click",()=>openTicketMediaModal("audio",url,name));
      }else{
        node.href=url;
        node.removeAttribute("download");
        node.target="_blank";
        node.rel="noopener";
      }
    }catch(err){
      if(node.tagName==="A"){
        node.removeAttribute("href");
        node.textContent="📎 Arquivo indisponível";
      }else{
        node.innerHTML='<span class="ticket-media-error">Mídia indisponível</span>';
      }
    }
  }));
}

function messageMenuChevron(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg>';
}

function messagePreviewText(message){
  const body=String(message?.body||"").trim();
  if(body)return body;
  const type=String(message?.mediaType||"").toLowerCase();
  if(type.includes("image"))return "Imagem";
  if(type.includes("video"))return "Vídeo";
  if(type.includes("audio")||type.includes("ptt"))return "Áudio";
  if(type.includes("document")||type.includes("application"))return "Documento";
  return "Mensagem";
}

function renderTicketMessages(messages){
  return (messages||[]).map(m=>{
    const body=String(m.body||"");
    const media=ticketMediaHtml(m);
    const when=ticketTime(m.createdAt);
    const pending=m.pending===true;
    const reaction=String(m.reaction||"");
    const quick=["👍","❤️","😂","😮","😢","🙏"];
    const compactMessage=!media && body.trim().length>0 && body.trim().length<=28;
    return `<div class="wa-message-row ${m.fromMe?"me":""}" data-message-row="${esc(m.id)}">
      <div class="wa-message-wrap ${compactMessage?"compact":"wide"}">
        <button type="button" class="wa-message-menu-trigger" data-message-menu-trigger="${esc(m.id)}" aria-label="Opções da mensagem">${messageMenuChevron()}</button>
        <div class="wa-message ${m.fromMe?"me":""}">
          ${media}
          ${body?`<div class="wa-message-body">${esc(body)}</div>`:""}
          ${reaction?`<div class="wa-message-reaction">${esc(reaction)}</div>`:""}
          ${pending?'<div class="wa-message-pending-badge">Pendente</div>':""}
          <div class="wa-message-meta">${when}${m.fromMe?" ✓✓":""}</div>
        </div>
        <div class="wa-message-actions hidden" data-message-menu="${esc(m.id)}">
          <div class="wa-message-reactions">
            ${quick.map(emoji=>`<button type="button" data-message-react="${esc(m.id)}" data-emoji="${emoji}">${emoji}</button>`).join("")}
            <button type="button" class="wa-message-reaction-more" data-message-reaction-more="${esc(m.id)}">＋</button>
          </div>
          <button type="button" data-message-action="reply" data-id="${esc(m.id)}">↩ Responder</button>
          <button type="button" data-message-action="forward" data-id="${esc(m.id)}">↪ Encaminhar</button>
          <button type="button" data-message-action="pending" data-id="${esc(m.id)}">${pending?"✓ Remover pendência":"⚑ Pendente"}</button>
          ${canDeleteWhatsAppData() && m.fromMe?`<button type="button" class="danger" data-message-action="delete" data-id="${esc(m.id)}">Excluir mensagem</button>`:""}
        </div>
      </div>
    </div>`;
  }).join("");
}


function renderTicketList(list){
  return (list||[]).length ? list.map(t=>{
    const contact=t.contact||{};
    const unread=Number(t.unreadMessages||0);
    const archived=t.archived===true;
    const pinned=t.pinned===true;
    return `<div class="wa-conversation ${String(activeTicketId)===String(t.id)?"active":""}" data-ticket-id="${t.id}" role="button" tabindex="0">
      <span class="wa-avatar">${contact.profilePicUrl?`<img src="${esc(contact.profilePicUrl)}" alt="" />`:esc(ticketInitials(ticketContactName(t)))}</span>
      <span class="wa-conversation-main">
        <span class="wa-conversation-top">
          <b>${esc(ticketContactName(t))}</b>
          <span class="wa-conversation-meta">
            <small>${ticketTime(t.updatedAt||t.createdAt)}</small>
            <span class="wa-conversation-controls">
              ${pinned?`<span class="wa-pin-indicator" title="Conversa fixada">${ticketPinIcon()}</span>`:""}
              <button class="wa-conversation-menu-btn" data-ticket-menu="${t.id}" type="button" aria-label="Opções da conversa">${ticketChevronIcon()}</button>
            </span>
          </span>
        </span>
        <span class="wa-conversation-bottom">
          <span>${esc(t.lastMessage||ticketStatusLabel(t.status)||"")}</span>
          ${unread?`<strong class="wa-unread-badge">${unread}</strong>`:""}
        </span>
      </span>
      <div class="wa-conversation-menu hidden" data-ticket-menu-popover="${t.id}">
        <button type="button" data-ticket-action="unread" data-id="${t.id}">Marcar como não lido</button>
        ${!contact.isGroup?`<button type="button" data-ticket-action="contact" data-id="${t.id}">Cadastrar contato</button>`:""}
        <button type="button" data-ticket-action="${pinned?"unpin":"pin"}" data-id="${t.id}">${pinned?"Desafixar conversa":"Fixar conversa"}</button>
        <button type="button" data-ticket-action="${archived?"unarchive":"archive"}" data-id="${t.id}">${archived?"Desarquivar":"Arquivar"}</button>
        ${canDeleteWhatsAppData()?`<button type="button" class="danger" data-ticket-action="delete" data-id="${t.id}">Excluir conversa</button>`:""}
      </div>
    </div>`;
  }).join("") : '<div class="wa-empty-list">Nenhuma conversa encontrada.</div>';
}

async function fetchTicketList(includeArchived=false){
  const archived=includeArchived?"true":"false";
  const [pendingData,openData,closedData]=await Promise.all([
    api(`/tickets?pageNumber=1&status=pending&showAll=true&queueIds=[]&tags=[]&users=[]&archived=${archived}`),
    api(`/tickets?pageNumber=1&status=open&showAll=true&queueIds=[]&tags=[]&users=[]&archived=${archived}`),
    api(`/tickets?pageNumber=1&status=closed&showAll=true&queueIds=[]&tags=[]&users=[]&archived=${archived}`)
  ]);
  const merged=[
    ...(pendingData?.tickets||[]),
    ...(openData?.tickets||[]),
    ...(closedData?.tickets||[])
  ];
  const byId=new Map();
  merged.forEach(ticket=>byId.set(String(ticket.id),ticket));
  return [...byId.values()].sort((a,b)=>{
    const pinDiff=Number(!!b.pinned)-Number(!!a.pinned);
    if(pinDiff)return pinDiff;
    return new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0);
  });
}

function closeTicketMenus(){
  document.querySelectorAll(".wa-conversation-menu").forEach(menu=>menu.classList.add("hidden"));
}

async function openTicketContactModal(ticketId,currentTicket=null,editMode=false){
  const ticket=currentTicket || ticketsCache.find(t=>String(t.id)===String(ticketId));
  if(!ticket?.contact)return;

  const contact=ticket.contact;
  const company=ticketCompany(contact);
  const phone=ticketResolvedNumber(ticket);

  modal(`
    <div class="ticket-contact-modal">
      <div class="eyebrow">CONTATO</div>
      <h2>${editMode?"Editar contato":"Cadastrar contato"}</h2>
      <p class="muted">${editMode?"Atualize os dados deste contato.":"Os dados salvos serão exibidos nas conversas deste cliente."}</p>
      <form id="ticketContactForm" class="ticket-contact-form">
        <label>Nome
          <input id="ticketContactNameInput" value="${esc((/^\d+$/.test(String(contact.name||""))||String(contact.name||"").includes("@"))?"":contact.name||"")}" required />
        </label>
        <label>Empresa
          <input id="ticketContactCompanyInput" value="${esc(company)}" />
        </label>
        <label>E-mail
          <input id="ticketContactEmailInput" type="email" value="${esc(contact.email||"")}" />
        </label>
        <label>Telefone
          <input id="ticketContactPhoneInput" value="${esc(formatPhoneBR(phone))}" required />
        </label>
        <div class="ticket-contact-modal-actions">
          <button type="button" class="ghost" id="ticketContactCancel">Cancelar</button>
          <button type="submit" class="primary" id="ticketContactSave">${editMode?"Salvar alterações":"Salvar contato"}</button>
        </div>
        <div id="ticketContactStatus" class="small"></div>
      </form>
    </div>
  `);

  $("#ticketContactCancel").onclick=closeModal;
  $("#ticketContactForm").onsubmit=async e=>{
    e.preventDefault();
    const button=$("#ticketContactSave");
    const status=$("#ticketContactStatus");
    button.disabled=true;
    status.textContent="Salvando...";
    try{
      await api("/contacts/"+contact.id+"/basic",{
        method:"PUT",
        body:JSON.stringify({
          name:$("#ticketContactNameInput").value.trim(),
          company:$("#ticketContactCompanyInput").value.trim(),
          email:$("#ticketContactEmailInput").value.trim(),
          number:$("#ticketContactPhoneInput").value
        })
      });
      closeModal();
      ticketsCache=await fetchTicketList($("#ticketStatusFilter")?.value==="archived");
      filterTicketList();
      if(String(activeTicketId)===String(ticketId))await openTicket(ticketId);
    }catch(err){
      status.textContent=err.message||"Não foi possível salvar o contato.";
      button.disabled=false;
    }
  };
}

function bindTicketList(){
  document.querySelectorAll(".wa-conversation[data-ticket-id]").forEach(row=>{
    row.onclick=e=>{
      if(e.target.closest(".wa-conversation-menu-btn") || e.target.closest(".wa-conversation-menu"))return;
      openTicket(row.dataset.ticketId);
    };
    row.onkeydown=e=>{
      if((e.key==="Enter"||e.key===" ") && !e.target.closest(".wa-conversation-menu-btn")){
        e.preventDefault();
        openTicket(row.dataset.ticketId);
      }
    };
  });

  document.querySelectorAll("[data-ticket-menu]").forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      const id=btn.dataset.ticketMenu;
      const menu=document.querySelector(`[data-ticket-menu-popover="${id}"]`);
      const wasHidden=menu?.classList.contains("hidden");
      closeTicketMenus();
      if(menu && wasHidden)menu.classList.remove("hidden");
    };
  });

  document.querySelectorAll("[data-ticket-action]").forEach(btn=>{
    btn.onclick=async e=>{
      e.stopPropagation();
      const id=btn.dataset.id;
      const action=btn.dataset.ticketAction;
      try{
        if(action==="unread"){
          await api("/tickets/"+id+"/mark-unread",{method:"POST",body:"{}"});
        }else if(action==="contact"){
          closeTicketMenus();
          await openTicketContactModal(id);
          return;
        }else if(action==="pin"){
          await api("/tickets/"+id+"/pin",{method:"POST",body:"{}"});
        }else if(action==="unpin"){
          await api("/tickets/"+id+"/unpin",{method:"POST",body:"{}"});
        }else if(action==="archive"){
          await api("/tickets/"+id+"/archive",{method:"POST",body:"{}"});
          if(String(activeTicketId)===String(id)){
            activeTicketId=null;
            const chat=$("#ticketChatPanel");
            if(chat)chat.innerHTML='<div class="wa-chat-empty"><div class="wa-chat-empty-icon">💬</div><b>Atendimentos</b><span>Selecione uma conversa para visualizar as mensagens.</span></div>';
            const details=$("#ticketContactContent");
            if(details)details.innerHTML='<div class="wa-contact-empty">As informações do contato aparecerão aqui.</div>';
          }
        }else if(action==="unarchive"){
          await api("/tickets/"+id+"/unarchive",{method:"POST",body:"{}"});
        }else if(action==="delete"){
          closeTicketMenus();
          const ok=confirm("Excluir toda esta conversa? O PortoPlan tentará remover para todos as mensagens enviadas que o WhatsApp ainda permitir. Mensagens recebidas não podem ser apagadas do aparelho do outro contato. Deseja continuar?");
          if(!ok)return;
          const result=await api("/tickets/"+id,{method:"DELETE"});
          if(String(activeTicketId)===String(id)){
            activeTicketId=null;
            const chat=$("#ticketChatPanel");
            if(chat)chat.innerHTML='<div class="wa-chat-empty"><div class="wa-chat-empty-icon">💬</div><b>Atendimentos</b><span>Selecione uma conversa para visualizar as mensagens.</span></div>';
            const details=$("#ticketContactContent");
            if(details)details.innerHTML='<div class="wa-contact-empty">As informações do contato aparecerão aqui.</div>';
          }
          if(result?.revokeFailed){
            alert("Conversa removida do PortoPlan. Algumas mensagens antigas não puderam ser apagadas para todos pelo WhatsApp.");
          }
        }
        closeTicketMenus();
        ticketsCache=await fetchTicketList($("#ticketStatusFilter")?.value==="archived");
        filterTicketList();
      }catch(err){
        alert(err.message||"Não foi possível atualizar a conversa.");
      }
    };
  });
}

function filterTicketList(){
  const query=String($("#ticketSearch")?.value||"").trim().toLowerCase();
  const status=$("#ticketStatusFilter")?.value||"all";

  const filtered=ticketsCache.filter(t=>{
    const name=String(t.contact?.name||"").toLowerCase();
    const number=String(t.contact?.number||"").toLowerCase();
    const last=String(t.lastMessage||"").toLowerCase();

    const matchesText=!query ||
      name.includes(query) ||
      number.includes(query) ||
      last.includes(query);

    const matchesStatus=
      status==="all" ||
      status==="archived" ||
      String(t.status||"")===status;

    return matchesText && matchesStatus;
  });

  const listEl=$("#ticketConversationList");
  if(listEl){
    listEl.innerHTML=renderTicketList(filtered);
    bindTicketList();
  }
}

async function refreshTicketsList(){
  if(state.page!=="tickets")return;
  try{
    ticketsCache=await fetchTicketList($("#ticketStatusFilter")?.value==="archived");
    filterTicketList();
  }catch(_){}
  clearTimeout(ticketsRefreshTimer);
  if(state.page==="tickets")ticketsRefreshTimer=setTimeout(refreshTicketsList,3000);
}

async function tickets(){
  setTitle("Atendimentos");
  clearTimeout(ticketsRefreshTimer);
  clearTimeout(ticketMessagesRefreshTimer);
  activeTicketId=null;
  ticketsCache=await fetchTicketList(false);

  content(`
    <div class="wa-inbox ${ticketDetailsCollapsed?"details-collapsed":""}" id="waInbox" style="--conversation-width:${localStorage.getItem("pp_ticket_list_width")||"330"}px">
      <aside class="wa-conversations-panel">
        <div class="wa-conversations-head">
          <div>
            <h3>Conversas</h3>
            <span>WhatsApp</span>
          </div>
          <select id="ticketStatusFilter" aria-label="Filtrar conversas">
            <option value="all">Todas</option>
            <option value="pending">Aguardando</option>
            <option value="open">Em atendimento</option>
            <option value="closed">Finalizadas</option>
            <option value="archived">Arquivadas</option>
          </select>
          <div class="wa-search-wrap">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input id="ticketSearch" placeholder="Buscar conversa" />
          </div>
        </div>
        <div class="wa-conversations-list" id="ticketConversationList">${renderTicketList(ticketsCache)}</div>
        <div class="wa-column-resizer" id="ticketListResizer" title="Arraste para redimensionar"></div>
      </aside>

      <section class="wa-chat-panel" id="ticketChatPanel">
        <div class="wa-chat-empty">
          <div class="wa-chat-empty-icon">💬</div>
          <b>Atendimentos</b>
          <span>Selecione uma conversa para visualizar as mensagens.</span>
        </div>
      </section>

      <aside class="wa-contact-panel" id="ticketContactPanel">
        <button class="wa-details-toggle" id="ticketDetailsToggle" type="button" title="${ticketDetailsCollapsed?"Mostrar informações":"Recolher informações"}" aria-label="${ticketDetailsCollapsed?"Mostrar informações":"Recolher informações"}">
          <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>
        </button>
        <div id="ticketContactContent" class="wa-contact-content">
          <div class="wa-contact-empty">As informações do contato aparecerão aqui.</div>
        </div>
      </aside>
    </div>
  `);

  bindTicketList();
  $("#ticketSearch").oninput=filterTicketList;
  $("#ticketStatusFilter").onchange=async()=>{
    ticketsCache=await fetchTicketList($("#ticketStatusFilter").value==="archived");
    filterTicketList();
  };

  const resizer=$("#ticketListResizer");
  if(resizer){
    resizer.onpointerdown=e=>{
      e.preventDefault();
      const inbox=$("#waInbox");
      const startX=e.clientX;
      const startWidth=parseInt(getComputedStyle(inbox).getPropertyValue("--conversation-width"))||330;
      resizer.setPointerCapture?.(e.pointerId);

      const move=ev=>{
        const next=Math.max(240,Math.min(520,startWidth+(ev.clientX-startX)));
        inbox.style.setProperty("--conversation-width",next+"px");
      };
      const up=ev=>{
        const current=parseInt(getComputedStyle(inbox).getPropertyValue("--conversation-width"))||330;
        localStorage.setItem("pp_ticket_list_width",String(current));
        resizer.releasePointerCapture?.(ev.pointerId);
        resizer.removeEventListener("pointermove",move);
        resizer.removeEventListener("pointerup",up);
      };
      resizer.addEventListener("pointermove",move);
      resizer.addEventListener("pointerup",up);
    };
  }

  $("#ticketDetailsToggle").onclick=()=>{
    ticketDetailsCollapsed=!ticketDetailsCollapsed;
    localStorage.setItem("pp_ticket_details_collapsed",ticketDetailsCollapsed?"1":"0");
    $("#waInbox")?.classList.toggle("details-collapsed",ticketDetailsCollapsed);
    const btn=$("#ticketDetailsToggle");
    if(btn){
      btn.title=ticketDetailsCollapsed?"Mostrar informações":"Recolher informações";
      btn.setAttribute("aria-label",btn.title);
    }
  };

  const pendingTicketId=localStorage.getItem("pp_open_ticket");
  if(pendingTicketId){
    localStorage.removeItem("pp_open_ticket");
    setTimeout(()=>openTicket(pendingTicketId),80);
  }else if(ticketsCache.length){
    setTimeout(()=>openTicket(ticketsCache[0].id),80);
  }

  ticketsRefreshTimer=setTimeout(refreshTicketsList,3000);
}

async function loadTicketPending(ticketId){
  const box=$("#ticketPendingList");
  if(!box)return;
  try{
    const items=await api("/messages/"+ticketId+"/pending");
    if(!items?.length){
      box.innerHTML='<div class="wa-pending-empty">Nenhuma pendência nesta conversa.</div>';
      return;
    }
    box.innerHTML=items.map(m=>`<button type="button" class="wa-pending-item" data-pending-message="${esc(m.id)}">
      <span>${esc(messagePreviewText(m))}</span>
      <small>${ticketTime(m.createdAt)}</small>
    </button>`).join("");
    box.querySelectorAll("[data-pending-message]").forEach(btn=>btn.onclick=()=>{
      const row=document.querySelector(`[data-message-row="${CSS.escape(btn.dataset.pendingMessage)}"]`);
      row?.scrollIntoView({behavior:"smooth",block:"center"});
      row?.classList.add("pending-highlight");
      setTimeout(()=>row?.classList.remove("pending-highlight"),1200);
    });
  }catch(err){
    box.innerHTML='<div class="wa-pending-empty">Não foi possível carregar as pendências.</div>';
  }
}

async function openForwardMessageModal(messageId){
  modal(`
    <div class="ticket-forward-modal">
      <div class="eyebrow">ENCAMINHAR</div>
      <h2>Encaminhar mensagem</h2>
      <p class="muted">Escolha um contato do WhatsApp.</p>
      <input id="forwardContactSearch" class="forward-contact-search" placeholder="Buscar nome, empresa ou telefone" />
      <div id="forwardContactList" class="forward-contact-list"><div class="small">Carregando contatos...</div></div>
      <div id="forwardContactStatus" class="small"></div>
    </div>
  `);

  let timer=null;

  const validPhoneDigits=value=>{
    const digits=String(value||"").replace(/\D/g,"");
    if(digits.length===10 || digits.length===11)return digits;
    if((digits.length===12 || digits.length===13) && digits.startsWith("55"))return digits;
    return "";
  };

  const load=async()=>{
    const q=$("#forwardContactSearch")?.value.trim().toLowerCase()||"";
    const list=$("#forwardContactList");
    try{
      const [ticketList,contactData]=await Promise.all([
        fetchTicketList(false),
        api("/contacts?pageNumber=1&searchParam="+encodeURIComponent(q))
      ]);

      const rows=new Map();

      for(const ticket of ticketList||[]){
        const contact=ticket.contact||{};
        if(ticket.isGroup || contact.isGroup)continue;
        const digits=validPhoneDigits(ticketResolvedNumber(ticket));
        if(!digits)continue;
        const company=ticketCompany(contact);
        const label=company
          ? `${contact.name||formatPhoneBR(digits)} | ${company}`
          : (contact.name && !/^\d+$/.test(String(contact.name))
              ? contact.name
              : formatPhoneBR(digits));
        const hay=`${label} ${digits} ${formatPhoneBR(digits)}`.toLowerCase();
        if(q && !hay.includes(q))continue;
        rows.set(String(contact.id),{
          id:contact.id,
          label,
          number:digits
        });
      }

      for(const contact of (contactData?.contacts||[])){
        if(contact.isGroup || String(contact.name||"").includes("@g.us"))continue;
        const digits=validPhoneDigits(contact.number);
        if(!digits)continue;
        const company=ticketCompany(contact);
        const label=company
          ? `${contact.name||formatPhoneBR(digits)} | ${company}`
          : (contact.name && !/^\d+$/.test(String(contact.name))
              ? contact.name
              : formatPhoneBR(digits));
        const hay=`${label} ${digits} ${formatPhoneBR(digits)}`.toLowerCase();
        if(q && !hay.includes(q))continue;
        if(!rows.has(String(contact.id))){
          rows.set(String(contact.id),{id:contact.id,label,number:digits});
        }
      }

      const contacts=[...rows.values()]
        .sort((a,b)=>String(a.label).localeCompare(String(b.label),"pt-BR"));

      list.innerHTML=contacts.length?contacts.map(contact=>`
        <button type="button" class="forward-contact-item" data-forward-contact="${contact.id}">
          <span>${esc(contact.label)}</span>
          <small>${esc(formatPhoneBR(contact.number))}</small>
        </button>
      `).join(""):'<div class="small">Nenhum contato com telefone válido encontrado.</div>';

      list.querySelectorAll("[data-forward-contact]").forEach(btn=>btn.onclick=async()=>{
        const status=$("#forwardContactStatus");
        status.textContent="Encaminhando...";
        try{
          await api("/messages/"+messageId+"/forward",{
            method:"POST",
            body:JSON.stringify({targetContactId:Number(btn.dataset.forwardContact)})
          });
          status.textContent="Mensagem encaminhada.";
          setTimeout(closeModal,500);
        }catch(err){
          status.textContent=err.message||"Não foi possível encaminhar.";
        }
      });
    }catch(err){
      list.innerHTML='<div class="small">Não foi possível carregar os contatos.</div>';
    }
  };

  $("#forwardContactSearch").oninput=()=>{
    clearTimeout(timer);
    timer=setTimeout(load,250);
  };
  load();
}

function openMessageReactionPicker(messageId){
  const emojis=[
    ["👍","curtir positivo joinha"],["❤️","amor coração"],["😂","risada rir"],["😮","surpresa"],["😢","triste choro"],
    ["🙏","obrigado gratidão oração"],["👏","palmas parabéns"],["🎉","festa comemoração"],["😍","apaixonado"],["😊","feliz sorriso"],
    ["🔥","fogo ótimo"],["✅","confirmado certo"],["😉","piscada"],["😅","alívio"],["🤝","acordo parceria"],["📌","fixar alfinete"],
    ["🚀","foguete avançar"],["💯","cem perfeito"],["😁","sorriso"],["🥳","festa"],["🤔","pensando"],["😎","legal"],
    ["💙","coração azul"],["💚","coração verde"],["💛","coração amarelo"],["🧡","coração laranja"],["💜","coração roxo"],
    ["🤍","coração branco"],["🖤","coração preto"],["👌","ok perfeito"],["🙌","celebrar"],["💪","força"],["😃","feliz"],
    ["😄","alegre"],["😆","risada"],["🤣","gargalhada"],["🙂","sorriso"],["🤩","incrível"],["😘","beijo"],["😜","brincadeira"],
    ["🤗","abraço"],["👀","olhos atenção"],["💡","ideia"],["⭐","estrela"],["⚠️","atenção alerta"],["📎","anexo"],
    ["📞","telefone ligar"],["📩","mensagem email"],["❌","erro não"]
  ];
  modal(`
    <div class="ticket-reaction-modal">
      <h2>Escolher reação</h2>
      <input id="reactionEmojiSearch" class="reaction-emoji-search" placeholder="Buscar emoji: coração, palmas, ok..." />
      <div class="ticket-reaction-grid" id="ticketReactionGrid"></div>
    </div>
  `);

  const grid=$("#ticketReactionGrid");
  const render=(query="")=>{
    const q=String(query||"").trim().toLowerCase();
    const filtered=q?emojis.filter(([emoji,names])=>emoji.includes(q)||names.includes(q)):emojis;
    grid.innerHTML=filtered.map(([emoji])=>`<button type="button" data-picker-emoji="${emoji}">${emoji}</button>`).join("");
    grid.querySelectorAll("[data-picker-emoji]").forEach(btn=>btn.onclick=async()=>{
      try{
        await api("/messages/"+messageId+"/react",{method:"POST",body:JSON.stringify({emoji:btn.dataset.pickerEmoji})});
        closeModal();
        await refreshOpenTicket(activeTicketId);
      }catch(err){
        alert(err.message||"Não foi possível reagir à mensagem.");
      }
    });
  };
  $("#reactionEmojiSearch").oninput=e=>render(e.target.value);
  render();
}

function closeMessageMenus(){
  document.querySelectorAll(".wa-message-actions").forEach(menu=>menu.classList.add("hidden"));
}

function bindMessageMenuHoverDelay(){
  document.querySelectorAll(".wa-message-wrap").forEach(wrap=>{
    let timer=null;
    wrap.addEventListener("mouseenter",()=>{
      if(timer)clearTimeout(timer);
      wrap.classList.add("menu-hover-hold");
    });
    wrap.addEventListener("mouseleave",()=>{
      if(timer)clearTimeout(timer);
      timer=setTimeout(()=>{
        if(!wrap.querySelector(".wa-message-actions:not(.hidden)")){
          wrap.classList.remove("menu-hover-hold");
        }
      },3000);
    });
  });
}

function bindTicketMessageActions(ticketId){
  bindMessageMenuHoverDelay();
  document.querySelectorAll("[data-message-menu-trigger]").forEach(btn=>{
    btn.onclick=e=>{
      e.stopPropagation();
      const id=btn.dataset.messageMenuTrigger;
      const menu=document.querySelector(`[data-message-menu="${CSS.escape(id)}"]`);
      const hidden=menu?.classList.contains("hidden");
      closeMessageMenus();
      if(menu && hidden)menu.classList.remove("hidden");
    };
  });

  document.querySelectorAll("[data-message-react]").forEach(btn=>btn.onclick=async e=>{
    e.stopPropagation();
    try{
      await api("/messages/"+btn.dataset.messageReact+"/react",{
        method:"POST",
        body:JSON.stringify({emoji:btn.dataset.emoji})
      });
      closeMessageMenus();
      await refreshOpenTicket(ticketId);
    }catch(err){
      alert(err.message||"Não foi possível reagir.");
    }
  });

  document.querySelectorAll("[data-message-reaction-more]").forEach(btn=>btn.onclick=e=>{
    e.stopPropagation();
    closeMessageMenus();
    openMessageReactionPicker(btn.dataset.messageReactionMore);
  });

  document.querySelectorAll("[data-message-action]").forEach(btn=>btn.onclick=async e=>{
    e.stopPropagation();
    const id=btn.dataset.id;
    const action=btn.dataset.messageAction;
    const message=ticketMessagesCache.find(m=>String(m.id)===String(id));

    if(action==="reply"){
      ticketReplyingMessage=message||{id};
      const preview=$("#ticketReplyPreview");
      if(preview){
        preview.classList.remove("hidden");
        preview.innerHTML=`<span><b>Responder</b><small>${esc(messagePreviewText(message))}</small></span><button type="button" id="cancelTicketReply">×</button>`;
        $("#cancelTicketReply").onclick=()=>{
          ticketReplyingMessage=null;
          preview.classList.add("hidden");
          preview.innerHTML="";
        };
      }
      $("#msgBody")?.focus();
      closeMessageMenus();
      return;
    }

    if(action==="forward"){
      closeMessageMenus();
      openForwardMessageModal(id);
      return;
    }

    if(action==="pending"){
      try{
        await api("/messages/"+id+"/pending",{
          method:"POST",
          body:JSON.stringify({pending:!(message?.pending===true)})
        });
        closeMessageMenus();
        await refreshOpenTicket(ticketId);
        await loadTicketPending(ticketId);
      }catch(err){
        alert(err.message||"Não foi possível atualizar a pendência.");
      }
      return;
    }

    if(action==="delete"){
      closeMessageMenus();
      if(!confirm("Excluir esta mensagem para todos? Essa ação não pode ser desfeita e depende das regras de exclusão do WhatsApp."))return;
      try{
        await api("/messages/"+id,{method:"DELETE"});
        await refreshOpenTicket(ticketId);
      }catch(err){
        alert(err.message||"Não foi possível excluir a mensagem.");
      }
    }
  });
}

function renderTicketContactInfo(ticket){
  const c=ticket?.contact||{};
  const extra=Array.isArray(c.extraInfo)?c.extraInfo:[];
  const resolvedNumber=ticketResolvedNumber(ticket);
  return `
    <div class="wa-profile-head">
      ${!c.isGroup?`<button type="button" class="wa-profile-edit" id="ticketContactEditBtn" title="Editar contato" aria-label="Editar contato">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>
      </button>`:""}
      <span class="wa-profile-avatar">${c.profilePicUrl?`<img src="${esc(c.profilePicUrl)}" alt="" />`:esc(ticketInitials(ticketContactName(ticket)))}</span>
      <h3>${esc(ticketContactName(ticket))}</h3>
      <span>${esc(formatPhoneBR(resolvedNumber))}</span>
    </div>
    <div class="wa-profile-section">
      <h4>Atendimento</h4>
      <div class="wa-info-row"><span>Status</span><b>${esc(ticketStatusLabel(ticket?.status))}</b></div>
      <div class="wa-info-row"><span>Atendente</span><b>${esc(ticket?.user?.name||"Não atribuído")}</b></div>
      <div class="wa-info-row"><span>Fila</span><b>${esc(ticket?.queue?.name||"Sem fila")}</b></div>
      <div class="wa-info-row"><span>Conexão</span><b>${esc(ticket?.whatsapp?.name||"WhatsApp")}</b></div>
    </div>
    <div class="wa-profile-section">
      <h4>Dados do contato</h4>
      <div class="wa-info-row"><span>Telefone</span><b>${esc(formatPhoneBR(resolvedNumber))||"—"}</b></div>
      <div class="wa-info-row"><span>E-mail</span><b>${esc(c.email||"—")}</b></div>
      ${extra.map(x=>`<div class="wa-info-row"><span>${esc(x.name||"Informação")}</span><b>${esc(x.value||"—")}</b></div>`).join("")}
    </div>
    <div class="wa-profile-section">
      <h4>Pendências</h4>
      <div id="ticketPendingList" class="wa-pending-list"><div class="wa-pending-empty">Carregando...</div></div>
    </div>
    ${Array.isArray(ticket?.tags)&&ticket.tags.length?`<div class="wa-profile-section"><h4>Etiquetas</h4><div class="wa-tags">${ticket.tags.map(tag=>`<span>${esc(tag.name)}</span>`).join("")}</div></div>`:""}
  `;
}

function bindTicketContactEdit(ticket){
  const btn=$("#ticketContactEditBtn");
  if(!btn || !ticket?.contact)return;
  btn.onclick=()=>openTicketContactModal(ticket.id,ticket,true);
}

async function refreshOpenTicket(id){
  if(String(activeTicketId)!==String(id) || state.page!=="tickets") return;
  try{
    const data=await api("/messages/"+id+"?pageNumber=1&markRead=false");
    if(String(activeTicketId)!==String(id) || state.page!=="tickets") return;

    const box=$("#ticketMessages");
    if(box){
      const messages=data.messages||[];
      ticketMessagesCache=messages;
      const signature=messages.map(m=>String(m.id)+":"+String(m.updatedAt||"")+":"+String(m.mediaUrl||"")+":"+String(m.pending||"")+":"+String(m.reaction||"")).join("|");
      if(box.dataset.signature!==signature){
        box.innerHTML=renderTicketMessages(messages);
        box.dataset.signature=signature;
        hydrateTicketMedia(box);
        bindTicketMessageActions(id);
      }
      if(ticketAutoScroll){
        requestAnimationFrame(()=>{ box.scrollTop=box.scrollHeight; });
      }
    }

    const title=$("#ticketConversationTitle");
    if(title)title.textContent=ticketContactName(data.ticket)||"Atendimento";
    const details=$("#ticketContactContent");
    if(details){
      details.innerHTML=renderTicketContactInfo(data.ticket);
      bindTicketContactEdit(data.ticket);
    }
    loadTicketPending(id);
  }catch(_){}

  clearTimeout(ticketMessagesRefreshTimer);
  if(state.page==="tickets")ticketMessagesRefreshTimer=setTimeout(()=>refreshOpenTicket(id),1500);
}

async function sendTicketPayload(id,files=[],body="",quotedMsg=null){
  if(!files.length){
    await api("/messages/"+id,{method:"POST",body:JSON.stringify({
      body,
      quotedMsg:quotedMsg?{id:quotedMsg.id}:undefined
    })});
    return;
  }
  const form=new FormData();
  files.forEach(file=>form.append("medias",file,file.name||("imagem-"+Date.now()+".png")));
  form.append("body",body||"");
  await api("/messages/"+id,{method:"POST",body:form});
}

function insertTicketEmoji(value){
  const input=$("#msgBody");
  if(!input)return;
  const start=input.selectionStart??input.value.length;
  const end=input.selectionEnd??input.value.length;
  input.value=input.value.slice(0,start)+value+input.value.slice(end);
  input.focus();
  const pos=start+value.length;
  input.setSelectionRange(pos,pos);
}

async function openTicket(id){
  activeTicketId=String(id);
  clearTimeout(ticketMessagesRefreshTimer);

  document.querySelectorAll("[data-ticket-id]").forEach(x=>x.classList.toggle("active",String(x.dataset.ticketId)===String(id)));

  const data=await api("/messages/"+id+"?pageNumber=1");
  const ticket=data.ticket||{};
  const msgs=data.messages||[];
  ticketMessagesCache=msgs;
  ticketReplyingMessage=null;
  const chat=$("#ticketChatPanel");
  const details=$("#ticketContactContent");
  if(!chat)return;

  chat.innerHTML=`
    <div class="wa-chat-head">
      <span class="wa-avatar large">${ticket.contact?.profilePicUrl?`<img src="${esc(ticket.contact.profilePicUrl)}" alt="" />`:esc(ticketInitials(ticket.contact?.name||ticket.contact?.number))}</span>
      <div><b id="ticketConversationTitle">${esc(ticketContactName(ticket)||"Atendimento")}</b><small>${esc(ticketStatusLabel(ticket.status))}</small></div>
      <span class="wa-chat-connection">${esc(ticket.whatsapp?.name||"WhatsApp")}</span>
    </div>
    <div class="wa-messages" id="ticketMessages">${renderTicketMessages(msgs)}</div>
    <div class="wa-reply-preview hidden" id="ticketReplyPreview"></div>
    <div class="wa-upload-preview hidden" id="ticketUploadPreview"></div>
    <form class="wa-composer" id="ticketComposer">
      <div class="wa-compose-actions">
        <button type="button" class="wa-compose-icon" id="ticketAttach" title="Foto, vídeo ou arquivo">＋</button>
        <button type="button" class="wa-compose-icon" id="ticketEmoji" title="Emoji">☺</button>
      </div>
      <textarea id="msgBody" rows="1" placeholder="Digite uma mensagem"></textarea>
      <button type="button" class="wa-active-sound-toggle" id="activeChatSoundToggle" title="Som da conversa ativa" aria-label="Som da conversa ativa">🔊</button>
      <button class="wa-send" id="sendMsg" type="submit" title="Enviar" aria-label="Enviar">
        <svg viewBox="0 0 24 24"><path d="m3 11 18-8-8 18-2-8-8-2Z"/><path d="m11 13 10-10"/></svg>
      </button>
      <input id="ticketFiles" type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" class="hidden" />
      <div class="wa-emoji-popover hidden" id="ticketEmojiPopover">
        ${["😀","😂","😍","😊","👍","🙏","👏","🎉","❤️","🔥","✅","😉","😅","🤝","📌","🚀"].map(x=>`<button type="button" data-emoji="${x}">${x}</button>`).join("")}
      </div>
    </form>
  `;

  if(details){
    details.innerHTML=renderTicketContactInfo(ticket);
    bindTicketContactEdit(ticket);
  }
  loadTicketPending(id);

  const box=$("#ticketMessages");
  if(box){
    ticketAutoScroll=true;
    box.dataset.signature=msgs.map(m=>String(m.id)+":"+String(m.updatedAt||"")+":"+String(m.mediaUrl||"")).join("|");
    hydrateTicketMedia(box);
    bindTicketMessageActions(id);
    const scrollToBottom=()=>{ box.scrollTop=box.scrollHeight; };
    requestAnimationFrame(scrollToBottom);
    setTimeout(scrollToBottom,80);
    box.addEventListener("scroll",()=>{
      ticketAutoScroll=box.scrollHeight-box.scrollTop-box.clientHeight<90;
    },{passive:true});
  }

  let pendingFiles=[];
  const preview=$("#ticketUploadPreview");
  const renderPreview=()=>{
    if(!preview)return;
    if(!pendingFiles.length){
      preview.classList.add("hidden");
      preview.innerHTML="";
      return;
    }
    preview.classList.remove("hidden");
    preview.innerHTML=pendingFiles.map((file,i)=>`<span>📎 ${esc(file.name||"imagem colada")} <button type="button" data-remove-file="${i}">×</button></span>`).join("");
    preview.querySelectorAll("[data-remove-file]").forEach(btn=>btn.onclick=()=>{
      pendingFiles.splice(Number(btn.dataset.removeFile),1);
      renderPreview();
    });
  };

  const addFiles=files=>{
    pendingFiles.push(...Array.from(files||[]));
    renderPreview();
  };

  updateActiveChatSoundToggle();
  $("#activeChatSoundToggle").onclick=toggleActiveChatSound;
  $("#ticketAttach").onclick=()=>$("#ticketFiles").click();
  $("#ticketFiles").onchange=e=>{addFiles(e.target.files);e.target.value="";};
  $("#ticketEmoji").onclick=()=>$("#ticketEmojiPopover").classList.toggle("hidden");
  document.querySelectorAll("[data-emoji]").forEach(btn=>btn.onclick=()=>insertTicketEmoji(btn.dataset.emoji));

  $("#msgBody").addEventListener("paste",e=>{
    const files=Array.from(e.clipboardData?.files||[]).filter(file=>file.type.startsWith("image/"));
    if(files.length){
      e.preventDefault();
      files.forEach((file,i)=>{
        if(!file.name){
          try{Object.defineProperty(file,"name",{value:`print-${Date.now()}-${i}.png`});}catch(_){}
        }
      });
      addFiles(files);
    }
  });

  $("#msgBody").addEventListener("keydown",e=>{
    if(e.key==="Enter" && !e.shiftKey){
      e.preventDefault();
      $("#ticketComposer").requestSubmit();
    }
  });

  $("#ticketComposer").onsubmit=async e=>{
    e.preventDefault();
    const body=$("#msgBody").value.trim();
    if(!body && !pendingFiles.length)return;

    const button=$("#sendMsg");
    button.disabled=true;
    try{
      await sendTicketPayload(id,pendingFiles,body,ticketReplyingMessage);
      ticketAutoScroll=true;
      ticketReplyingMessage=null;
      const replyPreview=$("#ticketReplyPreview");
      if(replyPreview){
        replyPreview.classList.add("hidden");
        replyPreview.innerHTML="";
      }
      $("#msgBody").value="";
      pendingFiles=[];
      renderPreview();
      setTimeout(()=>refreshOpenTicket(id),250);
    }catch(err){
      alert(err.message||"Não foi possível enviar a mensagem.");
    }finally{
      button.disabled=false;
    }
  };

  ticketMessagesRefreshTimer=setTimeout(()=>refreshOpenTicket(id),1200);
}

async function kanban(){
  setTitle("Kanban");
  const settings=await api("/settings");
  const saved=(Array.isArray(settings)?settings:[]).find(s=>s.key==="portoplanMvpKanban");
  let board={columns:[]};
  if(saved?.value){
    try{ board=JSON.parse(saved.value); }catch(_){}
  }
  if(!board || !Array.isArray(board.columns) || board.columns.length===0){
    board={columns:[
      {id:"new",title:"Novos",cards:[]},
      {id:"progress",title:"Em andamento",cards:[]},
      {id:"done",title:"Concluídos",cards:[]}
    ]};
  }

  const save=async()=>api("/settings/portoplanMvpKanban",{method:"PUT",body:JSON.stringify({value:JSON.stringify(board)})});
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
let supportChatTimer=null;
let supportSelectedUserId="";
let supportContacts=[];

function isSupportMaster(){
  return Boolean(state.user?.super);
}

function isSupportAgent(contact){
  return Boolean(contact?.super) || String(contact?.email||"").toLowerCase()==="admin@portoplan.com.br";
}

function supportUnreadCount(contact){
  return Number(contact?.unread||0);
}

function supportLabel(contact){
  const company=contact?.company?.name||"";
  if(isSupportMaster()){
    return `${company||contact?.name||"Cliente"} — ${contact?.email||""}`;
  }
  return "Suporte PortoPlan";
}

async function loadSupportContacts(){
  const data=await api("/internal-chat/contacts");
  const list=Array.isArray(data)?data:[];
  supportContacts=isSupportMaster()?list:list.filter(isSupportAgent);
}

function openSupportChat(){
  $("#chatDrawer").classList.add("open");
  $("#chatDrawer").setAttribute("aria-hidden","false");
  $("#chatBackdrop").classList.remove("hidden");
  $("#chatDrawerSubtitle").textContent=isSupportMaster()?"Atendimento individual dos clientes":"Conversa direta com a equipe PortoPlan";
  loadSupportChat();
  clearInterval(supportChatTimer);
  supportChatTimer=setInterval(()=>refreshSupportChat(false),10000);
}

function closeSupportChat(){
  $("#chatDrawer").classList.remove("open");
  $("#chatDrawer").setAttribute("aria-hidden","true");
  $("#chatBackdrop").classList.add("hidden");
  if(supportChatTimer){clearInterval(supportChatTimer);supportChatTimer=null;}
}

async function refreshSupportUnread(){
  try{
    await loadSupportContacts();
    const count=supportContacts.reduce((sum,contact)=>sum+supportUnreadCount(contact),0);
    const badge=$("#chatBadge");
    if(badge){
      badge.textContent="";
      badge.setAttribute("aria-label",count>0 ? `${count} mensagem${count>1?"s":""} não lida${count>1?"s":""}` : "");
      badge.classList.toggle("hidden",count===0);
    }
    $("#chatBtn")?.classList.toggle("has-unread",count>0);
  }catch(_){}
}

async function loadSupportChat(){
  const box=$("#chatDrawerContent");
  box.innerHTML='<div class="drawer-loading">Carregando conversas...</div>';
  try{
    await loadSupportContacts();

    if(!supportSelectedUserId && supportContacts.length){
      const firstUnread=supportContacts.find(x=>supportUnreadCount(x)>0);
      supportSelectedUserId=String((firstUnread||supportContacts[0]).id);
    }
    if(!supportContacts.some(x=>String(x.id)===String(supportSelectedUserId))){
      supportSelectedUserId=supportContacts.length?String(supportContacts[0].id):"";
    }

    await renderSupportChat();
  }catch(err){
    box.innerHTML=`<div class="error">Não foi possível carregar o chat: ${esc(err.message)}</div>`;
  }
}

async function refreshSupportChat(reloadContacts=true){
  if($("#chatDrawer").getAttribute("aria-hidden")==="true") return;
  try{
    if(reloadContacts) await loadSupportContacts();
    await renderSupportChat(true);
  }catch(_){}
  refreshSupportUnread();
}

async function renderSupportChat(silent=false){
  const box=$("#chatDrawerContent");
  const master=isSupportMaster();
  const selected=supportContacts.find(x=>String(x.id)===String(supportSelectedUserId));

  let messages=[];
  if(selected){
    const data=await api("/internal-chat/messages/"+selected.id);
    messages=Array.isArray(data)?data:[];
    selected.unread=0;
  }

  box.innerHTML=`
    ${master?`
      <div class="support-selector-wrap">
        <select id="supportConversationSelect" class="support-selector" aria-label="Selecionar cliente">
          <option value="">Selecione um cliente</option>
          ${supportContacts.map(contact=>`
            <option value="${contact.id}" ${String(contact.id)===String(supportSelectedUserId)?"selected":""}>
              ${esc(supportLabel(contact))}${supportUnreadCount(contact)?` (${supportUnreadCount(contact)} nova${supportUnreadCount(contact)>1?"s":""})`:""}
            </option>`).join("")}
        </select>
      </div>`:
      `<div class="support-peer">
        <b>Suporte PortoPlan</b>
        <span>Conversa direta com a equipe PortoPlan</span>
      </div>`
    }

    <div id="supportMessages" class="support-messages">
      ${!selected
        ? '<div class="support-empty">Nenhuma conversa disponível.</div>'
        : messages.length===0
          ? '<div class="support-empty">Envie a primeira mensagem desta conversa.</div>'
          : messages.map(m=>{
              const own=String(m.senderId)===String(state.user.id);
              return `<div class="support-row ${own?"own":""}">
                <div class="support-bubble ${own?"own":""}">
                  <div>${esc(m.body||"")}</div>
                  <small>${new Date(m.createdAt).toLocaleString("pt-BR")}</small>
                </div>
              </div>`;
            }).join("")
      }
    </div>

    <form id="supportComposer" class="support-composer">
      <textarea id="supportBody" maxlength="4000" placeholder="Escreva sua mensagem..." ${selected?"":"disabled"}></textarea>
      <button class="support-send" type="submit" ${selected?"":"disabled"}>
        <span class="support-send-icon">➤</span>
        Enviar mensagem
      </button>
    </form>
  `;

  $("#supportConversationSelect")?.addEventListener("change",async e=>{
    supportSelectedUserId=e.target.value;
    await renderSupportChat();
    await refreshSupportUnread();
  });

  $("#supportComposer")?.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!supportSelectedUserId)return;
    const body=$("#supportBody").value.trim();
    if(!body)return;
    const btn=e.currentTarget.querySelector("button");
    btn.disabled=true;
    try{
      await api("/internal-chat/messages/"+supportSelectedUserId,{
        method:"POST",
        body:JSON.stringify({body})
      });
      $("#supportBody").value="";
      await loadSupportContacts();
      await renderSupportChat();
      await refreshSupportUnread();
    }finally{
      if(btn)btn.disabled=false;
    }
  });

  const msgBox=$("#supportMessages");
  if(msgBox) msgBox.scrollTop=msgBox.scrollHeight;
  if(!silent) refreshSupportUnread();
}

$("#chatBtn").onclick=openSupportChat;
$("#newMessageSoundToggle").onclick=toggleGlobalSound;
$("#chatClose").onclick=closeSupportChat;
$("#chatBackdrop").onclick=closeSupportChat;
$("#settingsClose").onclick=closeSettings;
$("#settingsBackdrop").onclick=closeSettings;

function formatPhoneBR(value){
  let digits=String(value||"").replace(/\D/g,"");
  if(!digits)return "";

  if((digits.length===12 || digits.length===13) && digits.startsWith("55")){
    digits=digits.slice(2);
  }

  if(digits.length===10 || digits.length===11){
    const ddd=digits.slice(0,2);
    const local=digits.slice(2);
    if(local.length===8){
      return `(${ddd}) ${local.slice(0,4)}-${local.slice(4)}`;
    }
    if(local.length===9){
      return `(${ddd}) ${local.slice(0,5)}-${local.slice(5)}`;
    }
  }

  if(digits.length<=2)return digits.length===1?`(${digits}`:`(${digits})`;

  const ddd=digits.slice(0,2);
  const local=digits.slice(2);
  const first=local.length>8?local.slice(0,5):local.slice(0,4);
  const last=local.length>8?local.slice(5,9):local.slice(4,8);
  return `(${ddd}) ${first}${last?"-"+last:""}`;
}

function formatCepBR(value){
  const digits=String(value||"").replace(/\D/g,"").slice(0,8);
  return digits.length>5?`${digits.slice(0,5)}-${digits.slice(5)}`:digits;
}

async function loadSettings(selectedId){
  const box=$("#settingsContent");
  box.innerHTML='<div class="drawer-loading">Carregando configurações...</div>';

  try{
    const isMaster=Boolean(state.user?.super);
    const isCompanyAdmin=isMaster || String(state.user?.profile||"").toLowerCase()==="admin";

    let users=[state.user];
    if(isCompanyAdmin){
      const list=await api("/users?searchParam=&pageNumber=1");
      users=Array.isArray(list)?list:(list?.users||[]);
      if(!users.length) users=[state.user];
    }

    const selected=String(selectedId || state.user?.id || users[0]?.id || "");
    const profile=await api("/users/"+selected);
    const ownProfile=String(state.user?.id)===selected;

    let connections=[];
    try{
      const raw=await api("/whatsapp/?session=0");
      connections=Array.isArray(raw)?raw:[];
    }catch(_){}

    const street=profile.addressStreet || (!profile.addressNumber && !profile.addressCity ? profile.address||"" : "");

    box.innerHTML=`
      ${isCompanyAdmin && users.length>1?`
        <div class="settings-section">
          <label class="field-label">Usuário</label>
          <select id="settingsUserSelect" class="settings-select">
            ${users.map(u=>`<option value="${u.id}" ${String(u.id)===selected?"selected":""}>${esc(u.name)} · ${esc(u.email||"")}</option>`).join("")}
          </select>
        </div>`:""}

      <form id="profileForm">
        <div class="settings-section">
          <h3>Dados do usuário</h3>
          <div class="settings-grid">
            <label class="full"><span>Nome</span><input id="profileName" value="${esc(profile.name||"")}" /></label>
          </div>
        </div>

        <div class="settings-section">
          <h3>Endereço completo</h3>
          <div class="settings-grid address-grid">
            <label class="full"><span>Endereço</span><input id="profileAddressStreet" value="${esc(street)}" /></label>
            <label><span>Número</span><input id="profileAddressNumber" value="${esc(profile.addressNumber||"")}" /></label>
            <label><span>Complemento</span><input id="profileAddressComplement" value="${esc(profile.addressComplement||"")}" /></label>
            <label><span>Cidade</span><input id="profileAddressCity" value="${esc(profile.addressCity||"")}" /></label>
            <label><span>Estado</span><input id="profileAddressState" maxlength="2" value="${esc(profile.addressState||"")}" /></label>
            <label><span>CEP</span><input id="profileAddressZipCode" inputmode="numeric" value="${esc(formatCepBR(profile.addressZipCode||""))}" /></label>
          </div>
        </div>

        <div class="settings-section">
          <h3>Acesso</h3>
          <div class="settings-grid">
            <label><span>Telefone</span><input id="profilePhone" inputmode="tel" value="${esc(formatPhoneBR(profile.phone||""))}" /></label>
            <label><span>E-mail de login</span><input id="profileEmail" type="email" value="${esc(profile.email||"")}" /></label>
            <label><span>Senha atual</span><input id="profileCurrentPassword" type="password" autocomplete="current-password" /></label>
            <label><span>Nova senha</span><input id="profilePassword" type="password" autocomplete="new-password" placeholder="Mínimo de 8 caracteres" /></label>
          </div>
          <p class="settings-help access-help">Para alterar e-mail ou senha, informe a senha atual.</p>
          <div class="settings-actions">
            <button class="primary" type="submit">Salvar alterações</button>
            <span id="profileSaveStatus" class="small"></span>
          </div>
        </div>
      </form>

      ${isCompanyAdmin?`
      <div class="settings-section">
        <div class="people-head">
          <div>
            <h3>Pessoas e permissões</h3>
            <p class="settings-help">Inclua usuários da sua empresa e gerencie quem pode acessar o Chatbot PortoPlan.</p>
          </div>
        </div>

        <form id="newCompanyUserForm" class="people-add-card">
          <strong>Incluir novo usuário</strong>
          <div class="settings-grid people-add-grid">
            <label><span>Nome</span><input id="newUserName" required /></label>
            <label><span>E-mail</span><input id="newUserEmail" type="email" required /></label>
            <label><span>Telefone</span><input id="newUserPhone" inputmode="tel" /></label>
            <label><span>Senha inicial</span><input id="newUserPassword" type="password" minlength="8" required placeholder="Mínimo de 8 caracteres" /></label>
          </div>
          <div class="settings-actions">
            <button class="primary" type="submit">+ Incluir usuário</button>
            <span id="newUserStatus" class="small"></span>
          </div>
        </form>

        <div class="people-list">
          ${users.filter(u=>!profile.companyId || u.companyId===profile.companyId).map(u=>`
            <div class="person-card">
              <div class="person-main">
                <div>
                  <b>${esc(u.name||"Usuário")}</b>
                  <span>${esc(u.email||"")}${u.phone?" · "+esc(formatPhoneBR(u.phone)):""}</span>
                </div>
                <span class="person-role">${u.super?"Superusuário":u.profile==="admin"?"Administrador":"Usuário"}</span>
              </div>
              <div class="person-actions">
                <button type="button" class="ghost edit-company-user" data-id="${u.id}">Editar</button>
                ${String(u.id)!==String(state.user?.id) && !u.super?`<button type="button" class="ghost danger remove-company-user" data-id="${u.id}" data-name="${esc(u.name||"usuário")}">Remover</button>`:""}
              </div>
            </div>`).join("")}
        </div>
      </div>`:""}

      <div class="settings-section">
        <h3>Conexão WhatsApp</h3>
        <p class="settings-help">A conexão continua pelo QR Code nativo do Chatbot PortoPlan.</p>
        <div class="settings-connections">
          ${connections.length?connections.map(w=>`
            <div class="connection-card">
              <div><b>${esc(w.name||"WhatsApp")}</b><span>${esc(w.number||"")}</span></div>
              <span class="connection-status ${String(w.status||"").toLowerCase()}">${esc(w.status||"DISCONNECTED")}</span>
              <div class="connection-actions">
                <button class="ghost settings-qr" data-id="${w.id}" type="button">QR Code</button>
              </div>
            </div>`).join(""):'<div class="empty-state">Nenhuma conexão cadastrada.</div>'}
        </div>
      </div>
    `;

    $("#settingsUserSelect")?.addEventListener("change",e=>loadSettings(e.target.value));

    const phoneInput=$("#profilePhone");
    if(phoneInput) phoneInput.addEventListener("input",e=>{e.target.value=formatPhoneBR(e.target.value);});
    const newPhoneInput=$("#newUserPhone");
    if(newPhoneInput) newPhoneInput.addEventListener("input",e=>{e.target.value=formatPhoneBR(e.target.value);});
    const cepInput=$("#profileAddressZipCode");
    if(cepInput) cepInput.addEventListener("input",e=>{e.target.value=formatCepBR(e.target.value);});
    const stateInput=$("#profileAddressState");
    if(stateInput) stateInput.addEventListener("input",e=>{e.target.value=e.target.value.replace(/[^A-Za-z]/g,"").toUpperCase().slice(0,2);});

    $("#profileForm").onsubmit=async e=>{
      e.preventDefault();
      const status=$("#profileSaveStatus");
      status.textContent="Salvando...";

      const password=$("#profilePassword").value;
      const currentPassword=$("#profileCurrentPassword").value;
      if(password && password.length<8){
        status.textContent="A nova senha deve ter no mínimo 8 caracteres.";
        return;
      }

      const payload={
        name:$("#profileName").value.trim(),
        email:$("#profileEmail").value.trim(),
        phone:$("#profilePhone").value.replace(/\D/g,""),
        currentPassword,
        addressStreet:$("#profileAddressStreet").value.trim(),
        addressNumber:$("#profileAddressNumber").value.trim(),
        addressComplement:$("#profileAddressComplement").value.trim(),
        addressCity:$("#profileAddressCity").value.trim(),
        addressState:$("#profileAddressState").value.trim().toUpperCase(),
        addressZipCode:$("#profileAddressZipCode").value.replace(/\D/g,"")
      };
      if(password) payload.password=password;

      try{
        const updated=await api("/users/"+selected,{
          method:"PUT",
          body:JSON.stringify(payload)
        });

        status.textContent="Dados salvos.";
        $("#profileCurrentPassword").value="";
        $("#profilePassword").value="";

        if(ownProfile){
          state.user={...state.user,...updated};
          localStorage.setItem("pp_user",JSON.stringify(state.user));
          $("#userLine").textContent=`${state.user.name||""} · ${state.user.email||""}`;
        }
      }catch(err){
        status.textContent=err.message||"Não foi possível salvar.";
      }
    };

    $("#newCompanyUserForm")?.addEventListener("submit",async e=>{
      e.preventDefault();
      const status=$("#newUserStatus");
      const password=$("#newUserPassword").value;
      if(password.length<8){
        status.textContent="A senha inicial deve ter no mínimo 8 caracteres.";
        return;
      }
      status.textContent="Incluindo usuário...";
      try{
        await api("/users",{
          method:"POST",
          body:JSON.stringify({
            name:$("#newUserName").value.trim(),
            email:$("#newUserEmail").value.trim(),
            phone:$("#newUserPhone").value.replace(/\D/g,""),
            password,
            profile:"user",
            ...(isMaster ? { companyId: profile.companyId } : {})
          })
        });
        status.textContent="Usuário incluído.";
        setTimeout(()=>loadSettings(selected),500);
      }catch(err){
        status.textContent=err.message||"Não foi possível incluir o usuário.";
      }
    });

    document.querySelectorAll(".edit-company-user").forEach(btn=>{
      btn.onclick=()=>loadSettings(btn.dataset.id);
    });

    document.querySelectorAll(".remove-company-user").forEach(btn=>{
      btn.onclick=async()=>{
        if(!confirm(`Remover ${btn.dataset.name} desta empresa?`))return;
        try{
          await api("/users/"+btn.dataset.id,{method:"DELETE"});
          await loadSettings(ownProfile?state.user.id:selected);
        }catch(err){
          alert(err.message||"Não foi possível remover o usuário.");
        }
      };
    });

    document.querySelectorAll(".settings-qr").forEach(b=>b.onclick=()=>showQr(b.dataset.id));
  }catch(err){
    box.innerHTML=`<div class="error">Não foi possível carregar as configurações: ${esc(err.message)}</div>`;
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

  const start=async()=>{ await api("/whatsapp/profile/connections/"+id+"/start",{method:"POST"}); };
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
      const list=await api("/whatsapp/profile/connections");
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
  const startupParams=new URLSearchParams(window.location.search);
  if(startupParams.get("googleContacts")) state.page="contacts";
  applySidebarState();
  renderMenu();
  loadPage();
  refreshSupportUnread();
  setInterval(refreshSupportUnread,10000);
  updateGlobalSoundToggle();
  clearTimeout(whatsappSoundTimer);
  whatsappSoundTimer=setTimeout(pollWhatsAppUnreadSound,1200);
  if(state.user?.mustChangePassword) setTimeout(openForcedPasswordChange,80);
}
if(state.token){loginView(false);initApp()} else loginView(true);
