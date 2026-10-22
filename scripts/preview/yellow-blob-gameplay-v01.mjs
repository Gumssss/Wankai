/** Actual App/GameSession capture fixtures and loopback-only artifact receiver.
 * No alternate physics, pose playback, impulses, or renderer are used by the page.
 * Usage: node scripts/preview/yellow-blob-gameplay-v01.mjs serve
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DATA=path.join(ROOT,'assets/concepts/yellow-blob/gameplay-v01');
const OUT=path.join(ROOT,'output/yellow-blob-gameplay-v01');
const PAGE=path.join(ROOT,'docs/previews/yellow-blob');
await Promise.all([mkdir(DATA,{recursive:true}),mkdir(OUT,{recursive:true})]);
const digest=b=>createHash('sha256').update(b).digest('hex');
const json=async(file,data)=>writeFile(file,JSON.stringify(data,null,2)+'\n');
const command=process.argv[2]||'serve';

if(command==='serve'){
  const destinations={'/recording':['actual-gameplay.webm','video/webm'],'/report':['capture-report.json','application/json'],'/poster':['gameplay-poster.png','image/png']};
  const server=createServer(async(req,res)=>{
    res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:5173');
    res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    const destination=destinations[new URL(req.url,'http://127.0.0.1').pathname];
    if(req.method!=='POST'||!destination){res.writeHead(404);res.end('Not found');return;}
    try{
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>200*1024*1024)throw Error('Artifact exceeds capture limit');chunks.push(chunk);}
      const bytes=Buffer.concat(chunks);await writeFile(path.join(OUT,destination[0]),bytes);
      console.log(JSON.stringify({saved:destination[0],bytes:bytes.length,sha256:digest(bytes)}));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({saved:destination[0],bytes:bytes.length}));
    }catch(error){res.writeHead(500);res.end(error.message);}
  });
  server.listen(8768,'127.0.0.1',()=>console.log('Local yellow gameplay artifact receiver: http://127.0.0.1:8768 (POST only; fixed files)'));
}
