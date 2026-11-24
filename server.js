const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws'),G=require('./game.js');
const PORT=process.env.PORT||3000;
const srv=http.createServer((q,s)=>{
  if(q.url==='/healthz'){s.end('ok');return;}
  fs.readFile(path.join(__dirname,'public','index.html'),(e,d)=>{s.writeHead(e?500:200,{'Content-Type':'text/html; charset=utf-8'});s.end(d);});
});
const wss=new WebSocketServer({server:srv});
const rooms=new Set(),privates={},queues={};
const send=(w,o)=>w&&w.readyState===1&&w.send(JSON.stringify(o));
const bc=(r,o)=>r.p.forEach(w=>send(w,o));
function mk(a,b,bot,mode){
  const g=G.newGame(mode),r={g,p:[a,b||null],names:[a.name,b?b.name:'Computer'],bot,tk:0};
  a.room=r;if(b)b.room=r;rooms.add(r);
  r.p.forEach((w,i)=>send(w,G.startMsg(g,i,r.names)));bc(r,G.snap(g));
}
function maybeBot(r){
  if(!r.bot||r.g.turn!==1||r.g.moving||r.g.over||r.busy)return;r.busy=true;
  setTimeout(()=>{r.busy=false;if(!rooms.has(r)||r.g.turn!==1||r.g.moving||r.g.over)return;
    const s=G.botShot(r.g);G.shoot(r.g,s.a,s.p);},1200);
}
function leave(ws){
  for(const m in queues)if(queues[m]===ws)delete queues[m];
  if(ws.code)delete privates[ws.code];ws.code=null;
  const r=ws.room;if(!r)return;
  r.p.forEach(w=>{if(w&&w!==ws){send(w,{t:'end',msg:'Opponent left — you win!'});w.room=null;}});
  rooms.delete(r);ws.room=null;
}
wss.on('connection',ws=>{
  ws.on('message',m=>{let d;try{d=JSON.parse(m);}catch{return;}
    if(d.t==='ping')return;
    const r=ws.room,i=r?r.p.indexOf(ws):-1;
    if(d.t==='shot'){if(r&&r.g.turn===i&&!r.g.moving&&!r.g.over&&Number.isFinite(d.a)&&Number.isFinite(d.p))G.shoot(r.g,d.a,d.p);return;}
    if(d.t==='place'){if(r&&r.g.bih===i&&!r.g.moving&&!r.g.over&&G.freePlace(r.g,+d.x,+d.y))bc(r,G.snap(r.g));return;}
    if(d.t==='leave'){leave(ws);return;}
    ws.name=String(d.name||'Player').slice(0,16);
    const mode=G.CFG[d.mode]?d.mode:'snooker15';
    if(d.t==='bot'){leave(ws);mk(ws,null,true,mode);}
    else if(d.t==='quick'){leave(ws);const q=queues[mode];
      if(q&&q.readyState===1){delete queues[mode];mk(q,ws,false,mode);}
      else{queues[mode]=ws;send(ws,{t:'wait'});}}
    else if(d.t==='create'){leave(ws);const c=Math.random().toString(36).slice(2,6).toUpperCase();
      privates[c]={ws,mode};ws.code=c;send(ws,{t:'wait',code:c});}
    else if(d.t==='join'){leave(ws);const c=String(d.code||'').toUpperCase(),h=privates[c];
      if(h&&h.ws.readyState===1){delete privates[c];h.ws.code=null;mk(h.ws,ws,false,h.mode);}else send(ws,{t:'err',msg:'Room not found'});}
  });
  ws.on('close',()=>leave(ws));
});
setInterval(()=>{for(const r of rooms){if(!r.g.moving)continue;
  G.step(r.g,1/60);
  if(!r.g.moving){G.resolve(r.g);bc(r,G.snap(r.g));maybeBot(r);}
  else if(++r.tk%2===0)bc(r,G.snap(r.g));}},1000/60);
srv.listen(PORT,()=>console.log('Cue sports server on :'+PORT));
