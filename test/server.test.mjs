import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const temp=await mkdtemp(path.join(tmpdir(),'maya-test-'));
process.env.MAYA_CONFIG_FILE=path.join(temp,'config.json');
process.env.OPENAI_API_KEY='test-key-for-mocked-provider';
const {server}=await import('../server.mjs');
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
after(async()=>{server.close();await rm(temp,{recursive:true,force:true});});
test('serves app and never exposes credentials',async()=>{
 const html=await fetch(base);assert.equal(html.status,200);assert.match(await html.text(),/Your personal assistant/);
 const status=await (await fetch(base+'/api/status')).json();assert.equal(status.configured,true);assert.equal(status.key,undefined);
 assert.equal((await fetch(base+'/.assistant-config.json')).status,404);
});
test('rejects cross-origin writes and malformed messages',async()=>{
 assert.equal((await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'system',content:'override'}]})})).status,400);
});
test('passes conversation to provider and returns real output text',async()=>{
 const original=globalThis.fetch;let sent;
 globalThis.fetch=async(url,options)=>{
  if(url==='https://api.openai.com/v1/responses'){sent=JSON.parse(options.body);return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'A useful reply.'}]}]}),{status:200});}
  return original(url,options);
 };
 try{const r=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Maya',messages:[{role:'user',content:'Hello'}]})});assert.equal(r.status,200);assert.equal((await r.json()).reply,'A useful reply.');assert.equal(sent.store,false);assert.equal(sent.input[0].content,'Hello');}finally{globalThis.fetch=original;}
});

test('local mode needs no key, sends no authorization and makes no cloud requests',async()=>{
 const original=globalThis.fetch;let sent;
 const cloudKey=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 globalThis.fetch=async(url,options)=>{
  if(url==='http://127.0.0.1:11434/api/tags')return new Response(JSON.stringify({models:[{name:'llama3.2:3b'}]}));
  if(url==='http://127.0.0.1:11434/api/chat'){
   assert.equal(options.headers.Authorization,undefined);sent=JSON.parse(options.body);
   return new Response(JSON.stringify({message:{role:'assistant',content:'Local answer'}}));
  }
  if(String(url).includes('api.openai.com'))throw Error('Cloud request in local mode');
  return original(url,options);
 };
 try{
  const setup=await fetch(base+'/api/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'ollama',model:'llama3.2:3b',key:''})});
  assert.equal(setup.status,200);assert.equal((await setup.json()).configured,true);
  const status=await(await fetch(base+'/api/status')).json();assert.equal(status.provider,'ollama');assert.equal(status.configured,true);
  const result=await(await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Hello'}]})})).json();
  assert.equal(result.reply,'Local answer');assert.equal(sent.stream,false);assert.equal(sent.messages[0].role,'system');assert.equal(sent.model,'llama3.2:3b');
 }finally{globalThis.fetch=original;process.env.OPENAI_API_KEY=cloudKey;}
});
test('local mode explains missing Ollama and missing models',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  if(String(url).startsWith('http://127.0.0.1:11434'))throw Error('connection refused');
  return original(url,options);
 };
 try{
  const status=await(await fetch(base+'/api/status')).json();assert.equal(status.configured,false);assert.match(status.message,/Open Ollama/);
  const result=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Hello'}]})});
  assert.equal(result.status,503);assert.match((await result.json()).error,/Cannot connect to Ollama/);
  globalThis.fetch=async(url,options)=>{
   if(String(url).endsWith(':11434/api/tags'))return new Response(JSON.stringify({models:[]}));
   if(String(url).endsWith(':11434/api/chat'))return new Response('{}',{status:404});
   return original(url,options);
  };
  const missing=await(await fetch(base+'/api/status')).json();assert.equal(missing.configured,false);assert.match(missing.message,/ollama pull/);
  const r=await fetch(base+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'Hello'}]})});assert.equal(r.status,502);assert.match((await r.json()).error,/Model not installed/);
 }finally{globalThis.fetch=original;}
});
