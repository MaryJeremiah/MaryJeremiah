import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
let config={};
try {config=JSON.parse(await readFile(path.join(root,'.assistant-config.json'),'utf8'));} catch {}
const key=()=>process.env.OPENAI_API_KEY||config.key;
const model=()=>process.env.OPENAI_MODEL||config.model||'gpt-4.1-mini';
const port=Number(process.env.PORT||3000);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>200000)throw new Error('Request too large');}return JSON.parse(raw);}
export const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'");
  try {
    if(req.method==='POST'){
      const origin=req.headers.origin;
      if(origin&&origin!==`http://${req.headers.host}`)return json(res,403,{error:'Origin rejected'});
      if(req.headers['content-type']!=='application/json')return json(res,415,{error:'JSON required'});
    }
    if(req.url==='/api/status'&&req.method==='GET')return json(res,200,{configured:!!key(),model:model()});
    if(req.url==='/api/setup'&&req.method==='POST'){
      const data=await body(req);
      if((typeof data.key!=='string'||data.key.length<20||data.key.length>500)&&!(data.key===''&&key()))return json(res,400,{error:'Enter a valid OpenAI API key.'});
      config={key:data.key.trim()||config.key,model:typeof data.model==='string'&&/^[a-zA-Z0-9._-]{1,100}$/.test(data.model)?data.model:'gpt-4.1-mini'};
      await writeFile(path.join(root,'.assistant-config.json'),JSON.stringify(config),{mode:0o600});
      return json(res,200,{configured:true,model:model()});
    }
    if(req.url==='/api/chat'&&req.method==='POST'){
      if(!key())return json(res,503,{error:'Add your OpenAI API key in Settings to enable AI replies.'});
      const data=await body(req);
      if(!Array.isArray(data.messages)||!data.messages.length||data.messages.length>80||data.messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>30000))return json(res,400,{error:'Invalid conversation. Start a new chat or shorten your message.'});
      const name=typeof data.name==='string'?data.name.slice(0,60):'Maya';
      const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key()}`,'Content-Type':'application/json'},body:JSON.stringify({model:model(),instructions:`You are ${name}, Mary Jeremiah's personal AI assistant. Be warm, clear, practical and honest. Help with writing, learning, coding, and planning. You cannot browse, access accounts, or perform external actions. Never claim to have performed an action you cannot do. Ask concise clarifying questions when necessary.`,input:data.messages,max_output_tokens:2400,store:false}),signal:AbortSignal.timeout(90000)});
      if(!response.ok){await response.text();return json(res,response.status===429?429:502,{error:response.status===401?'Your API key was rejected. Update it in Settings.':response.status===429?'The AI provider reports a rate or billing limit. Check your API account and try again.':'The AI provider could not complete this request. Check your model setting and try again.'});}
      const result=await response.json();
      const reply=(result.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text'||c.type==='refusal').map(c=>c.text||c.refusal||'').join('\n');
      if(!reply)return json(res,502,{error:'The AI returned no text. Please try again.'});
      return json(res,200,{reply});
    }
    const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
    if(req.method!=='GET'||!files[req.url])return json(res,404,{error:'Not found'});
    res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':req.url.endsWith('.css')?'text/css':'text/html');
    res.end(await readFile(path.join(root,'public',files[req.url])));
  }catch(error){json(res,500,{error:error.name==='TimeoutError'?'The AI took too long. Please try again.':'Unable to complete the request. Please try again.'});}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(port,'127.0.0.1',()=>console.log(`Your assistant is ready: http://localhost:${port}`));
