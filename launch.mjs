import {spawn} from 'node:child_process';
import {server} from './server.mjs';
const port=Number(process.env.PORT||3000);
server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`Port ${port} is already in use. Check http://localhost:${port} or choose another PORT.`:err.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
 const url=`http://localhost:${port}`;
 console.log(`Your assistant is ready: ${url}\nKeep this window open. Press Ctrl+C to stop.`);
 const command=process.platform==='win32'?'cmd':process.platform==='darwin'?'open':'xdg-open';
 const args=process.platform==='win32'?['/c','start','',url]:[url];
 const browser=spawn(command,args,{stdio:'ignore'});browser.on('error',()=>console.log('Open the address above in your browser.'));
});
