import {createServer} from 'node:http';
import {writeFile,mkdir} from 'node:fs/promises';
const dest=new URL('../assets/concepts/restored-animals-v01/',import.meta.url);
await mkdir(dest,{recursive:true});
createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5195');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 if(req.method==='OPTIONS'){res.end();return;}
 const file={'/video':'actual-gameplay.webm','/report':'capture-report.json'}[req.url];
 if(req.method!=='POST'||!file){res.writeHead(404);res.end();return;}
 try{const chunks=[];let count=0;for await(const b of req){count+=b.length;if(count>200e6)throw Error('Capture too large');chunks.push(b);}await writeFile(new URL(file,dest),Buffer.concat(chunks));console.log('Saved',file,count);res.end('ok');}catch(e){res.writeHead(500);res.end(e.message);}
}).listen(8789,'127.0.0.1',()=>console.log('Local capture receiver ready'));
