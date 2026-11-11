// Capture deterministic review frames using the installed Electron + local Vite.
const {app,BrowserWindow}=require('electron');const {spawn}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');const {once}=require('node:events');
app.commandLine.appendSwitch('disable-renderer-backgrounding');app.commandLine.appendSwitch('disable-background-timer-throttling');
app.whenReady().then(async()=>{let result=0;const w=new BrowserWindow({show:false,width:1280,height:720,webPreferences:{backgroundThrottling:false}});w.webContents.setAudioMuted(true);w.webContents.on('console-message',e=>{if(/Error|failed/i.test(e.message))console.error(e.message)});
try{await w.loadURL('http://127.0.0.1:5196/docs/previews/f-skills-v01/');for(let n=0;!await w.webContents.executeJavaScript('window.reviewReady===true');n++){if(n>120)throw Error('preview load timeout');await new Promise(r=>setTimeout(r,250));}
const manifest=await w.webContents.executeJavaScript('window.reviewManifest');const out=path.resolve('assets/concepts/f-skills-v01');fs.writeFileSync(path.join(out,'timeline.json'),JSON.stringify(manifest,null,2));
for(let idx=0;idx<4;idx++){const id=manifest.entries[idx].id;const ff=spawn('/opt/homebrew/bin/ffmpeg',['-y','-v','error','-f','image2pipe','-vcodec','mjpeg','-r','15','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','22','-r','30','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,id+'.mp4')]);ff.stderr.pipe(process.stderr);const done=once(ff,'close');
for(let frame=0;frame<manifest.duration*15;frame++){const b64=await w.webContents.executeJavaScript(`window.renderFrame(${idx},${frame/15})`);const bytes=Buffer.from(b64,'base64');if(frame===18)fs.writeFileSync(path.join(out,id+'-check.jpg'),bytes);if(!ff.stdin.write(bytes))await once(ff.stdin,'drain');}
ff.stdin.end();if((await done)[0]!==0)throw Error('ffmpeg failed');console.log('Encoded',id);}
}catch(e){console.error(e);result=1;}app.exit(result);});
