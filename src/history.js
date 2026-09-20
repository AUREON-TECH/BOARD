const clone=value=>structuredClone(value);

export function createHistory(initial,limit=50){
  let past=[],present=clone(initial),future=[];
  return {
    current:()=>clone(present),
    push(next){
      past.push(clone(present));
      past=past.slice(-limit);
      present=clone(next);
      future=[];
      return this.current();
    },
    undo(){
      if(!past.length)return this.current();
      future.unshift(clone(present));
      present=past.pop();
      return this.current();
    },
    redo(){
      if(!future.length)return this.current();
      past.push(clone(present));
      present=future.shift();
      return this.current();
    },
    canUndo:()=>past.length>0,
    canRedo:()=>future.length>0
  };
}
