// Multi-game cue-sports engine: physics + rules + computer player.
const MAXV=1500,FR=260,L=1000,W=500;
const CFG={
  snooker15:{type:'snooker',reds:15,R:9,pc:22,ps:19},
  snooker6:{type:'snooker',reds:6,R:9,pc:22,ps:19},
  '8ball':{type:'8ball',R:11,pc:27,ps:24},
  '8ballUK':{type:'8ball',uk:1,R:13,pc:25,ps:22},
  '9ball':{type:'9ball',R:11,pc:27,ps:24},
  '10ball':{type:'10ball',R:11,pc:27,ps:24}};
const SPOT={16:[200,150],17:[200,350],18:[200,250],19:[500,250],20:[750,250],21:[920,250]};
const val=id=>id>=16?id-14:1;
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function newGame(mode){
  if(!CFG[mode])mode='snooker15';
  const c=CFG[mode],R=c.R,T=c.type;
  const cfg={mode,type:T,uk:!!c.uk,R,pk:[[0,0,c.pc],[L,0,c.pc],[0,W,c.pc],[L,W,c.pc],[L/2,0,c.ps],[L/2,W,c.ps]]};
  const balls=[{id:0,x:T==='snooker'?170:250,y:250}];
  const pos=(rows,x0)=>{const o=[];rows.forEach((n,k)=>{for(let r=0;r<n;r++)o.push([x0+k*R*1.75,250+(r-(n-1)/2)*(2*R+0.2)]);});return o;};
  if(T==='snooker'){
    pos(c.reds===15?[1,2,3,4,5]:[1,2,3],768).forEach((p,i)=>balls.push({id:i+1,x:p[0],y:p[1]}));
    for(let i=16;i<=21;i++)balls.push({id:i,x:SPOT[i][0],y:SPOT[i][1]});
  }else{
    const rows=T==='8ball'?[1,2,3,4,5]:T==='9ball'?[1,2,3,2,1]:[1,2,3,4];
    const P=pos(rows,750);let ids;
    if(T==='8ball'){ids=shuf([1,2,3,4,5,6,7,9,10,11,12,13,14,15]);ids.splice(4,0,8);}
    else{const last=T==='9ball'?9:10;ids=shuf(Array.from({length:last-2},(_,i)=>i+2));ids.unshift(1);ids.splice(4,0,last);}
    P.forEach((p,i)=>balls.push({id:ids[i],x:p[0],y:p[1]}));
    balls.sort((a,b)=>a.id-b.id);
  }
  balls.forEach(b=>{b.vx=0;b.vy=0;b.on=true;});
  return{cfg,balls,turn:0,score:[0,0],colourNext:false,nextColour:2,groups:[null,null],bih:-1,shots:0,
    shot:{first:null,potted:[]},moving:false,over:false,winner:-1,msg:'Break off!'};
}
function step(g,dt){
  const N=4,h=dt/N,B=g.balls,{R,pk}=g.cfg;
  for(let k=0;k<N;k++){
    for(const b of B){if(!b.on)continue;const m=Math.hypot(b.vx,b.vy);
      if(m>0){const s=m-FR*h;if(s<4){b.vx=b.vy=0;}else{b.vx*=s/m;b.vy*=s/m;}}
      b.x+=b.vx*h;b.y+=b.vy*h;}
    for(let i=0;i<B.length;i++){const a=B[i];if(!a.on)continue;
      for(let j=i+1;j<B.length;j++){const c=B[j];if(!c.on)continue;
        if(!(a.vx||a.vy||c.vx||c.vy))continue;
        const dx=c.x-a.x,dy=c.y-a.y,d2=dx*dx+dy*dy;
        if(d2>=4*R*R||d2===0)continue;
        const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,o=(2*R-d)/2;
        a.x-=nx*o;a.y-=ny*o;c.x+=nx*o;c.y+=ny*o;
        const vr=(a.vx-c.vx)*nx+(a.vy-c.vy)*ny;
        if(vr>0){const q=vr*0.98;a.vx-=q*nx;a.vy-=q*ny;c.vx+=q*nx;c.vy+=q*ny;
          if(g.shot.first===null&&(a.id===0||c.id===0))g.shot.first=a.id===0?c.id:a.id;}
      }}
    for(const b of B){if(!b.on)continue;
      if(pk.some(p=>(b.x-p[0])**2+(b.y-p[1])**2<p[2]*p[2])){b.on=false;b.vx=b.vy=0;g.shot.potted.push(b.id);continue;}
      if(b.x<R){b.x=R;b.vx=Math.abs(b.vx)*.75;}else if(b.x>L-R){b.x=L-R;b.vx=-Math.abs(b.vx)*.75;}
      if(b.y<R){b.y=R;b.vy=Math.abs(b.vy)*.75;}else if(b.y>W-R){b.y=W-R;b.vy=-Math.abs(b.vy)*.75;}
    }
  }
  g.moving=B.some(b=>b.on&&(b.vx||b.vy));
}
function shoot(g,a,p){const c=g.balls[0];if(!c.on)return;p=Math.min(1,Math.max(0.03,p));g.bih=-1;
  c.vx=Math.cos(a)*p*MAXV;c.vy=Math.sin(a)*p*MAXV;g.shot={first:null,potted:[]};g.moving=true;}
const byId=(g,id)=>g.balls.find(b=>b.id===id);
function place(g,id,x,y){const R=g.cfg.R,b=byId(g,id);b.vx=b.vy=0;let t=0;
  while(g.balls.some(o=>o!==b&&o.on&&Math.hypot(o.x-x,o.y-y)<2*R+1)&&t++<200){x+=2*R+1;if(x>L-R){x=L-R;y+=2*R+1;}}
  b.x=x;b.y=y;b.on=true;}
function freePlace(g,x,y){const R=g.cfg.R;if(!(x>=R&&x<=L-R&&y>=R&&y<=W-R))return false;
  if(g.balls.some(o=>o.id&&o.on&&Math.hypot(o.x-x,o.y-y)<2*R+1))return false;
  const c=g.balls[0];c.x=x;c.y=y;c.vx=c.vy=0;c.on=true;return true;}
const redsOn=g=>g.balls.filter(b=>b.id>=1&&b.id<=15&&b.on).length;
const legalFn=(g,rb)=>id=>g.colourNext?id>=16:rb>0?(id>=1&&id<=15):id===14+g.nextColour;
function rSnooker(g){
  const s=g.shot,p=g.turn,pc=s.potted.filter(i=>i>0),cue=s.potted.includes(0);
  const rb=redsOn(g)+pc.filter(i=>i<=15).length,legal=legalFn(g,rb),single=g.colourNext||rb===0;
  const bad=s.first!==null&&!legal(s.first);
  const foul=cue||s.first===null||bad||pc.some(i=>!legal(i))||(single&&pc.length>1);
  let msg='';
  if(foul){
    const pts=Math.max(4,bad?val(s.first):0,...pc.filter(i=>!legal(i)).map(val));
    g.score[1-p]+=pts;msg=`Foul! ${pts} points to opponent`;
    pc.filter(i=>i>=16).forEach(i=>place(g,i,...SPOT[i]));
    if(cue)place(g,0,170,250);
    g.turn=1-p;g.colourNext=false;
  }else if(pc.length){
    g.score[p]+=pc.reduce((a,i)=>a+val(i),0);msg='Pot! Go again';
    if(g.colourNext){pc.forEach(i=>place(g,i,...SPOT[i]));g.colourNext=false;}
    else if(rb>0)g.colourNext=true;
    else g.nextColour++;
  }else{g.turn=1-p;g.colourNext=false;msg='No pot';}
  if(redsOn(g)===0&&!g.colourNext&&g.nextColour>7){g.over=true;msg='Frame over';
    g.winner=g.score[0]>g.score[1]?0:g.score[1]>g.score[0]?1:-1;}
  g.msg=msg;
}
const grp8=i=>i===8?2:i<8?0:1;
function rEight(g,brk){
  const s=g.shot,p=g.turn,pc=s.potted.filter(i=>i>0),cue=s.potted.includes(0),f=s.first,my=g.groups[p];
  const left=gr=>g.balls.filter(b=>b.on&&b.id>0&&grp8(b.id)===gr).length+pc.filter(i=>grp8(i)===gr).length;
  const on8=my!==null&&left(my)===0;
  let foul=cue||f===null;
  if(!foul)foul=my===null?f===8:on8?f!==8:grp8(f)!==my;
  if(pc.includes(8)){
    if(brk)place(g,8,750,250);
    else{g.over=true;g.winner=(!foul&&on8)?p:1-p;g.msg=g.winner===p?'Black ball potted — win!':'8-ball potted illegally — loss';return;}
  }
  const q=pc.filter(i=>i!==8);
  if(foul){g.bih=1-p;g.turn=1-p;g.msg='Foul! Ball in hand';if(cue)place(g,0,250,250);}
  else if(q.length){
    if(my===null&&!brk){const a=grp8(q[0]);g.groups[p]=a;g.groups[1-p]=1-a;g.msg='Groups assigned — go again';}
    else if(my!==null&&!q.some(i=>grp8(i)===my)){g.turn=1-p;g.msg='No pot';}
    else g.msg='Pot! Go again';
  }else{g.turn=1-p;g.msg='No pot';}
}
function rRack(g){
  const last=g.cfg.type==='9ball'?9:10,s=g.shot,p=g.turn,pc=s.potted.filter(i=>i>0),cue=s.potted.includes(0),f=s.first;
  const low=Math.min(...g.balls.filter(b=>b.on&&b.id>0).map(b=>b.id),...pc);
  const foul=cue||f===null||f!==low;
  if(pc.includes(last)){if(!foul){g.over=true;g.winner=p;g.msg='Winning ball potted!';return;}place(g,last,750,250);}
  if(foul){g.bih=1-p;g.turn=1-p;g.msg='Foul! Ball in hand';if(cue)place(g,0,250,250);}
  else if(pc.filter(i=>i!==last).length)g.msg='Pot! Go again';
  else{g.turn=1-p;g.msg='No pot';}
}
function resolve(g){
  const brk=g.shots===0,t=g.cfg.type;
  (t==='snooker'?rSnooker:t==='8ball'?rEight:rRack)(g,brk);
  g.shots++;g.shot={first:null,potted:[]};
}
function targets(g){
  const t=g.cfg.type,on=g.balls.filter(b=>b.on&&b.id>0);
  if(t==='snooker'){const f=legalFn(g,redsOn(g));return on.filter(b=>f(b.id));}
  if(t==='8ball'){const m=g.groups[g.turn];if(m===null)return on.filter(b=>b.id!==8);
    const mine=on.filter(b=>grp8(b.id)===m);return mine.length?mine:on.filter(b=>b.id===8);}
  const low=Math.min(...on.map(b=>b.id));return on.filter(b=>b.id===low);
}
function targetText(g){
  const t=g.cfg.type;if(g.over)return'';
  if(t==='snooker')return g.colourNext?'any colour':redsOn(g)>0?'a red':['yellow','green','brown','blue','pink','black'][g.nextColour-2];
  if(t==='8ball'){const m=g.groups[g.turn];if(m===null)return'any ball (open table)';
    return targets(g).some(b=>b.id!==8)?(g.cfg.uk?['yellows','reds']:['solids','stripes'])[m]:'the black 8-ball';}
  return 'ball '+targets(g)[0].id;
}
const snap=g=>({t:'s',b:g.balls.map(b=>[b.id,+b.x.toFixed(1),+b.y.toFixed(1),b.on?1:0]),turn:g.turn,score:g.score,groups:g.groups,
  bih:g.bih,tg:g.over?'':targetText(g),msg:g.msg,mv:g.moving,over:g.over,winner:g.winner});
const startMsg=(g,you,names)=>({t:'start',you,names,cfg:g.cfg});
const clone=g=>({...g,balls:g.balls.map(b=>({...b})),score:[...g.score],groups:[...g.groups],shot:{first:null,potted:[]}});
function botShot(g){
  const p=g.turn,{R,pk}=g.cfg;
  if(g.bih===p)for(let i=0;i<60;i++)if(freePlace(g,R+Math.random()*L*0.45,R+Math.random()*(W-2*R)))break;
  const cue=g.balls[0],cands=[];
  for(const t of targets(g))for(const k of pk){
    const px=k[0]-t.x,py=k[1]-t.y,dp=Math.hypot(px,py)||1;
    const a=Math.atan2(t.y-py/dp*2*R-cue.y,t.x-px/dp*2*R-cue.x);
    const cut=(Math.cos(a)*px+Math.sin(a)*py)/dp;
    if(cut>0.3)cands.push({a,sc:cut*1000-Math.hypot(t.x-cue.x,t.y-cue.y)-dp});
  }
  cands.sort((x,y)=>y.sc-x.sc);
  const list=cands.slice(0,36).flatMap(c=>[0.35,0.6,0.9].map(pw=>({a:c.a,p:pw})));
  for(let i=0;i<10;i++)list.push({a:Math.random()*6.283,p:0.4});
  let best=null;
  for(const c of list){const s=clone(g);shoot(s,c.a,c.p);let n=0;while(s.moving&&n++<2500)step(s,1/60);resolve(s);
    const v=(s.over?(s.winner===p?100:-100):0)+(s.score[p]-g.score[p])-(s.score[1-p]-g.score[1-p])
      +(s.turn===p?(g.cfg.type==='snooker'?0.5:2):0)+(s.bih===1-p?-3:0)+Math.random()*0.01;
    if(!best||v>best.v)best={v,a:c.a,p:c.p};}
  best.a+=(Math.random()-.5)*0.012; // human-like imperfection
  return best;
}
module.exports={CFG,newGame,step,shoot,resolve,botShot,snap,startMsg,freePlace};
