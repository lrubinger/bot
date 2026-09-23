const API = `${location.origin}/api`;
const state = {
  token: localStorage.getItem("pp_token") || "",
  user: JSON.parse(localStorage.getItem("pp_user") || "null"),
  page: "dashboard",
  theme: localStorage.getItem("pp_theme") || "dark"
};

const activeItems = [
  ["dashboard","Dashboard"],["connections","Conexões WhatsApp"],["tickets","Atendimentos"],
  ["contacts","Contatos"],["queues","Filas"],["kanban","Kanban"],["users","Usuários"]
];
const pendingItems = ["Mensagens rápidas","Tarefas","Agendamentos","Tags","Chat interno","Ajuda","Campanhas","Avisos","Integrações","Arquivos","API externa","Financeiro","Configurações avançadas"];

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function applyTheme(theme){
  state.theme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem("pp_theme", state.theme);
  const icon = state.theme === "dark" ? "☀️" : "🌙";
  const title = state.theme === "dark" ? "Usar modo claro" : "Usar modo escuro";
  ["themeToggleLogin","themeToggleApp"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.textContent=icon; el.title=title; }
  });
}
function toggleTheme(){ applyTheme(state.theme === "dark" ? "light" : "dark"); }
applyTheme(state.theme);
document.getElementById("themeToggleLogin")?.addEventListener("click",toggleTheme);
document.getElementById("themeToggleApp")?.addEventListener("click",toggleTheme);

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
    activeItems.map(([id,label])=>`<div class="menu-item ${state.page===id?"active":""}" data-page="${id}"><span>${label}</span></div>`).join("") +
    '<div class="menu-title">Próximas etapas</div>' +
    pendingItems.map(x=>`<div class="menu-item pending"><span>${x}</span><span class="badge">Pendente</span></div>`).join("");
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
    <div class="card"><h3>Demais módulos</h3><div class="status-warn">Pendentes</div></div>
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
  let ticketsData; try{ticketsData=await api('/ticket/kanban?pageNumber=1&showAll=true&queueIds=[]&tags=[]&users=[]')}catch(e){ticketsData=await api('/tickets?pageNumber=1&showAll=true&queueIds=[]&tags=[]&users=[]')}
  const list=ticketsData.tickets||[];
  const cols=["pending","open","closed"];
  content(`<div class="kanban">${cols.map(s=>`<div class="kan-col"><h3>${s==="pending"?"Pendente":s==="open"?"Em atendimento":"Fechado"}</h3>${list.filter(t=>t.status===s).map(t=>`<div class="ticket-card"><b>${esc(t.contact?.name||"Contato")}</b><div class="small">${esc(t.lastMessage||"")}</div></div>`).join("")}</div>`).join("")}</div>`);
}

function initApp(){ $("#userLine").textContent = state.user ? `${state.user.name||""} · ${state.user.email||""}` : ""; renderMenu(); loadPage(); }
if(state.token){loginView(false);initApp()} else loginView(true);
