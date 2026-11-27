import { captureSource } from '../dist/official-capture.js';
export function createFrameSource() {
  return captureSource({
    displays: () => [{id:'test',primary:true,x:0,y:0,width:64,height:40,scale:1}],
    capture: () => ({width:64,height:40,bgra:new Uint8Array(64*40*4).fill(128)}),
  });
}
