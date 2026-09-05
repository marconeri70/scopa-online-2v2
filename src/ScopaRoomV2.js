import { ScopaRoom as BaseScopaRoom } from './ScopaRoom.js';

const ALLOWED_REACTIONS=new Set([
  '😂','🤣','😅','😮','😱','😡','😤','😭','😎','🤨','🙄','😜','👍','👎','👏','🙌','🤝','💪','❤️','🔥','🎉','🧹','👑','🏆','💯','🙏','🤦','😴','🤯','🥳',
  'Bella!','Grande!','Scopa!','GG!','Ops!','Che presa!','Fortuna!','Andiamo!'
]);

export class ScopaRoom extends BaseScopaRoom {
  constructor(ctx,env){super(ctx,env);this.reactionTimes=new Map()}
  runCpuIfNeeded(){}
  broadcastEvent(data){for(const socket of this.ctx.getWebSockets())this.sendTo(socket,data)}
  async webSocketMessage(ws,raw){
    await this.ready;let msg;try{msg=JSON.parse(raw)}catch{return}const att=ws.deserializeAttachment()||{},player=this.state.players.find(p=>p.token===att.token&&!p.isBot);if(!player)return;
    if(msg.type==='cpuStep'){
      try{if(this.state.playMode!=='cpu'||player.seat!==0||!this.state.started||this.state.turn!==1||this.state.pendingCapture)return;this.cpuTurn();await this.save();this.broadcast()}catch(e){this.sendTo(ws,{type:'error',message:e.message||'Errore CPU'})}return
    }
    if(msg.type==='reaction'){
      const value=String(msg.value??msg.emoji??'').trim();if(!ALLOWED_REACTIONS.has(value))return;const now=Date.now(),last=this.reactionTimes.get(player.token)||0;if(now-last<800)return;this.reactionTimes.set(player.token,now);this.broadcastEvent({type:'reaction',seat:player.seat,name:player.name,value,ts:now});return
    }
    return super.webSocketMessage(ws,raw)
  }
}
