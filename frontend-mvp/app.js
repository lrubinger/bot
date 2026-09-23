const API = `${location.origin}/api`;
const state = { token: localStorage.getItem("pp_token") || "", user: JSON.parse(localStorage.getItem("pp_user") || "null"), page: "dashboard" };

const activeItems = [
  ["dashboard","Dashboard"],["connections","Conexões WhatsApp"],["tickets","Atendimentos"],
  ["contacts","Contatos"],["queues","Filas"],["kanban","Kanban"],["users","Usuários"]
];
const pendingItems = ["Mensagens rápidas","Tarefas","Agendamentos","Tags","Chat interno","Ajuda","Campanhas","Avisos","Integrações","Arquivos","API externa","Financeiro","Configurações avançadas"];

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

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
    togglePassword.textContent = showing ? "Mostrar" : "Ocultar";
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
function setTitle(t){$("#pageTitle").textContent=t}
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
  modal('<h2>Conectar WhatsApp</h2><p>Abra o WhatsApp, vá em <b>Aparelhos conectados</b> e escaneie o código.</p><div id="qrStatus" class="muted">Buscando QR Code...</div><div id="qr" class="qr-box"></div>');
  try{await api("/whatsappsession/"+id,{method:"POST"});}catch(e){}
  let tries=0;
  const timer=setInterval(async()=>{
    if($("#modal").classList.contains("hidden")) return clearInterval(timer);
    try{
      const w=await api("/whatsapp/"+id+"?session=0");
      $("#qrStatus").textContent="Status: "+(w.status||"aguardando");
      if(w.qrcode){
        $("#qr").innerHTML="";
        new QRCode($("#qr"),{text:w.qrcode,width:256,height:256});
      }
      if(w.status==="CONNECTED"){ $("#qrStatus").textContent="Status: Conectado"; clearInterval(timer); setTimeout(closeModal,1200); }
    }catch(e){$("#qrStatus").textContent=e.message}
    if(++tries>90) clearInterval(timer);
  },2000);
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
