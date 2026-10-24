import {createServer} from 'node:http';
import {writeFile,mkdir} from 'node:fs/promises';
const dir=new URL('../../output/beagle-cat-balance-v2/',import.meta.url);await mkdir(dir,{recursive:true});
const files={'/recording':'actual-gameplay.webm','/report':'actual-gameplay-report.json','/poster':'actual-gameplay-poster.png'};
createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5187');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.method!=='POST'||!files[req.url]){res.writeHead(404);res.end();return;}
 try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>200e6)throw Error('Recording too large');chunks.push(chunk);}await writeFile(new URL(files[req.url],dir),Buffer.concat(chunks));console.log('Saved',files[req.url],size);res.end('ok');}catch(e){res.writeHead(500);res.end(e.message);}
}).listen(8772,'127.0.0.1',()=>console.log('Local gameplay receiver ready on 8772'));
