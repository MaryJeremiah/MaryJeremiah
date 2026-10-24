const $=s=>document.querySelector(s);
let chats=[],prefs={name:'Maya',speak:false},active=null,busy=false,configured=false;
try{chats=JSON.parse(localStorage.getItem('maya.chats')||'[]');prefs={...prefs,...JSON.parse(localStorage.getItem('maya.prefs')||'{}')};if(!Array.isArray(chats))chats=[];}catch{}
const save=()=>{try{localStorage.setItem('maya.chats',JSON.stringify(chats));localStorage.setItem('maya.prefs',JSON.stringify(prefs));}catch{$('#notice').textContent='Browser storage is full or unavailable. Export your chats to keep them.';}};
function render(){
 $('#brand').textContent=$('#helloName').textContent=prefs.name;document.title=prefs.name+' · Your personal assistant';
 $('#history').replaceChildren();for(const c of chats){const b=document.createElement('button');b.textContent=c.title;b.className=c.id===active?'selected':'';b.disabled=busy;b.onclick=()=>{active=c.id;render();};$('#history').append(b);}
 const c=chats.find(c=>c.id===active);$('#welcome').hidden=!!c?.messages.length;$('#messages').replaceChildren();
 for(const m of c?.messages||[]){const el=document.createElement('article');el.className=m.role;const label=document.createElement('strong');label.textContent=m.role==='user'?'You':prefs.name;const text=document.createElement('div');text.textContent=m.content;el.append(label,text);if(m.role==='assistant'){const copy=document.createElement('button');copy.textContent='Copy';copy.onclick=async()=>{try{await navigator.clipboard.writeText(m.content);copy.textContent='Copied';}catch{$('#notice').textContent='Copy is unavailable in this browser.';}};el.append(copy);}$('#messages').append(el);}
 $('#send').disabled=busy;$('#input').disabled=busy;$('#new').disabled=busy;$('#messages').lastElementChild?.scrollIntoView({block:'nearest'});
}
async function api(url,data){const r=await fetch(url,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const result=await r.json();if(!r.ok)throw Error(result.error||'Request failed');return result;}
async function status(){try{const s=await api('/api/status');configured=s.configured;$('#model').value=s.model;$('#status').textContent=configured?'● Ready when you are':'○ Setup needed';}catch{$('#status').textContent='○ Server unavailable';}}
$('#new').onclick=()=>{active=null;$('#notice').textContent='';render();$('#input').focus();};
$('#composer').onsubmit=async e=>{e.preventDefault();const content=$('#input').value.trim();if(!content||busy)return;if(!configured){openSettings();return;}let c=chats.find(c=>c.id===active);if(!c){c={id:crypto.randomUUID(),title:content.slice(0,42),messages:[]};chats.unshift(c);active=c.id;}c.messages.push({role:'user',content});$('#input').value='';busy=true;$('#notice').textContent=prefs.name+' is thinking…';save();render();
 try{const result=await api('/api/chat',{messages:c.messages.slice(-60),name:prefs.name});c.messages.push({role:'assistant',content:result.reply});$('#notice').textContent='';if(prefs.speak&&'speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(result.reply));}}
 catch(err){c.messages.pop();$('#input').value=content;$('#notice').textContent=err.message;}
 finally{busy=false;save();render();$('#input').focus();}
};
$('#input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('#composer').requestSubmit();}};
for(const b of document.querySelectorAll('[data-prompt]'))b.onclick=()=>{$('#input').value=b.dataset.prompt;$('#input').focus();};
function openSettings(){$('#name').value=prefs.name;$('#speak').checked=prefs.speak;$('#setupError').textContent='';$('#dialog').showModal();}
$('#settings').onclick=openSettings;$('#close').onclick=()=>$('#dialog').close();
$('#setup').onsubmit=async e=>{e.preventDefault();try{if($('#key').value.trim()||configured){await api('/api/setup',{key:$('#key').value.trim(),model:$('#model').value.trim()});$('#key').value='';}else if(!configured)throw Error('Add an API key to enable AI replies.');prefs={name:$('#name').value.trim()||'Maya',speak:$('#speak').checked};save();render();await status();$('#dialog').close();}catch(err){$('#setupError').textContent=err.message;}};
$('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(chats,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='assistant-chats.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#clear').onclick=()=>{if(busy){$('#setupError').textContent='Wait for the current reply before deleting chats.';return;}if(confirm('Delete all chats stored in this browser?')){chats=[];active=null;save();render();}};
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(Recognition){const recognition=new Recognition();recognition.lang=navigator.language;recognition.interimResults=false;recognition.onresult=e=>{$('#input').value+=e.results[0][0].transcript;};recognition.onend=()=>{$('#notice').textContent='';};recognition.onerror=()=>{$('#notice').textContent='Microphone unavailable. Check browser permissions or type your message.';};$('#mic').onclick=()=>{try{recognition.start();$('#notice').textContent='Listening…';}catch{}};}else{$('#mic').disabled=true;$('#mic').title='Dictation is not supported by this browser';}
render();status();
