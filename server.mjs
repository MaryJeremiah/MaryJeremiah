import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const configPath=process.env.MAYA_CONFIG_FILE||path.join(root,'.assistant-config.json');
let config={};
try {config=JSON.parse(await readFile(configPath,'utf8'));} catch {}
const key=()=>process.env.OPENAI_API_KEY||config.key;
const provider=()=>config.provider||(key()?'openai':'ollama');
const model=()=>provider()==='ollama'?(config.ollamaModel||'llama3.2:3b'):(process.env.OPENAI_MODEL||config.openaiModel||config.model||'gpt-4.1-mini');
async function localStatus(){
  try {
    const response=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(3000)});
    if(!response.ok)throw Error('unavailable');
    const data=await response.json();
    const ready=(data.models||[]).some(m=>m.name===model()||m.model===model());
    return {configured:ready,message:ready?'Local model ready':`Download the model first: ollama pull ${model()}`};
  }catch{return {configured:false,message:'Open Ollama on your laptop, then try again.'};}
}
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
    if(req.url==='/api/status'&&req.method==='GET')return json(res,200,{...(provider()==='ollama'?await localStatus():{configured:!!key()}),provider:provider(),model:model()});
    if(req.url==='/api/setup'&&req.method==='POST'){
      const data=await body(req);
      const selected=data.provider||provider();
      if(!['openai','ollama'].includes(selected))return json(res,400,{error:'Choose a supported AI provider.'});
      if(typeof data.model!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,99}$/.test(data.model))return json(res,400,{error:'Enter a valid model name.'});
      if(selected==='openai'&&(typeof data.key!=='string'||data.key.length<20||data.key.length>500)&&!(data.key===''&&key()))return json(res,400,{error:'Enter a valid OpenAI API key.'});
      const next={...config,provider:selected};
      if(selected==='ollama')next.ollamaModel=data.model;
      else {next.openaiModel=data.model;if(data.key.trim())next.key=data.key.trim();}
      await writeFile(configPath,JSON.stringify(next),{mode:0o600});
      config=next;
      return json(res,200,{...(provider()==='ollama'?await localStatus():{configured:!!key()}),provider:provider(),model:model()});
    }
    if(req.url==='/api/chat'&&req.method==='POST'){
      if(provider()==='openai'&&!key())return json(res,503,{error:'Add your OpenAI API key in Settings to enable AI replies.'});
      const data=await body(req);
      if(!Array.isArray(data.messages)||!data.messages.length||data.messages.length>80||data.messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>30000))return json(res,400,{error:'Invalid conversation. Start a new chat or shorten your message.'});
      const name=typeof data.name==='string'?data.name.slice(0,60):'Maya';
      const instructions=`You are ${name}, Mary Jeremiah's personal AI assistant. Be warm, clear, practical and honest. Help with writing, learning, coding, and planning. You cannot browse, access accounts, or perform external actions. Never claim to have performed an action you cannot do. Ask concise clarifying questions when necessary.`;
      const local=provider()==='ollama';
      let response;
      try {
        response=await fetch(local?'http://127.0.0.1:11434/api/chat':'https://api.openai.com/v1/responses',{
          method:'POST',headers:local?{'Content-Type':'application/json'}:{Authorization:`Bearer ${key()}`,'Content-Type':'application/json'},
          body:JSON.stringify(local?{model:model(),messages:[{role:'system',content:instructions},...data.messages],stream:false,options:{num_ctx:8192,num_predict:1024}}:{model:model(),instructions,input:data.messages,max_output_tokens:2400,store:false}),
          signal:AbortSignal.timeout(local?300000:90000)
        });
      }catch(error){return json(res,503,{error:local?(error.name==='TimeoutError'?'The local model is taking too long. Try a shorter message or a smaller model.':'Cannot connect to Ollama. Open the Ollama app, then try again.'):'Cannot connect to OpenAI. Check your internet connection and try again.'});}
      if(local&&!response.ok){await response.text();return json(res,502,{error:response.status===404?`Model not installed. In a terminal run: ollama pull ${model()}`:'Ollama could not complete the request. Try a shorter conversation or restart Ollama.'});}
      if(!response.ok){await response.text();return json(res,response.status===429?429:502,{error:response.status===401?'Your API key was rejected. Update it in Settings.':response.status===429?'The AI provider reports a rate or billing limit. Check your API account and try again.':'The AI provider could not complete this request. Check your model setting and try again.'});}
      const result=await response.json();
      const reply=local?result.message?.content:(result.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text'||c.type==='refusal').map(c=>c.text||c.refusal||'').join('\n');
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
