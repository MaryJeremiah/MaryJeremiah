import {test,after} from 'node:test';
import assert from 'node:assert/strict';
process.env.OPENAI_API_KEY='test-key-for-mocked-provider';
const {server}=await import('../server.mjs');
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
after(()=>server.close());
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
