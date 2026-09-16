export const FOCUS_ZIPS = Object.freeze(['64101','64105','64106','64108','64109','64110','64111','64112','64113','64114','64116','64124','64127']);
export const MAP_EVENTS = Object.freeze({state:'kcmo:map-state',command:'kcmo:map-command',ready:'kcmo:map-ready',status:'kcmo:map-status',intent:'kcmo:map-intent'});

// Application state remains in app.js; this bridge only replays it after startup.
export function createMapBridge(target, handlers = {}) {
  const abort = new AbortController();
  let ready = false, snapshot = null, pending = null, pendingPitch = false, pendingZoom = 0, alive = true;
  const send = (name, detail) => target.dispatchEvent(new CustomEvent(name, {detail}));
  target.addEventListener(MAP_EVENTS.ready, event => {
    ready = true;
    if(snapshot)send(MAP_EVENTS.state, snapshot);
    if(pendingPitch){pendingPitch=false;send(MAP_EVENTS.command,{type:'set-pitch',immediate:true});}
    if(pending){const command=pending;pending=null;send(MAP_EVENTS.command,{...command,immediate:true});}
    if(pendingZoom){const amount=pendingZoom;pendingZoom=0;send(MAP_EVENTS.command,{type:'zoom',amount,immediate:true});}
    handlers.ready?.(event.detail);
  }, {signal:abort.signal});
  target.addEventListener(MAP_EVENTS.status, event => {
    if(['loading','error'].includes(event.detail?.status))ready=false;
    handlers.status?.(event.detail);
  }, {signal:abort.signal});
  target.addEventListener(MAP_EVENTS.intent, event => handlers.intent?.(event.detail), {signal:abort.signal});
  return {
    update(value){if(!alive)return;snapshot=value;if(ready)send(MAP_EVENTS.state,snapshot);},
    command(value){
      if(!alive)return;
      if(ready)send(MAP_EVENTS.command,value);
      else if(value.type==='set-pitch')pendingPitch=true;
      else if(value.type==='zoom'&&Number.isFinite(value.amount))pendingZoom+=value.amount;
      else if(!['resize','dismiss-popup'].includes(value.type)){pending=value;pendingZoom=0;}
    },
    destroy(){alive=false;ready=false;snapshot=null;pending=null;pendingPitch=false;pendingZoom=0;abort.abort();}
  };
}
