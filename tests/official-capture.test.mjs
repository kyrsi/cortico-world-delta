import { test } from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { captureSource } from '../dist/official-capture.js';

function fixture() {
  const d = { id: 'left', primary: true, x: -8, y: 2, width: 8, height: 4, scale: 1 };
  let captures = 0;
  const native = { displays: () => [d], capture: () => {
    captures++;
    const bgra = new Uint8Array(8*4*4);
    for (let i=0;i<bgra.length;i+=4) { bgra[i]=7; bgra[i+1]=20; bgra[i+2]=230; }
    return {width:8,height:4,bgra};
  } };
  return { d, native, source:captureSource(native), count:()=>captures };
}
test('evidence and ROI come from one native frame with physical display coordinates', async () => {
  const f=fixture();
  const result=await f.source.captureEvidence('left',{x:.25,y:0,width:.5,height:1});
  assert.equal(f.count(),1);
  assert.deepEqual(result.crop,{x:2,y:0,width:4,height:4});
  assert.equal(result.region.bgra.length,4*4*4);
  assert.equal(result.region.capturedAt,result.capture.frame.capturedAt);
  assert.equal(result.region.topologyRevision,result.capture.frame.topologyRevision);
  assert.equal(result.capture.frame.transform.originX,-8);
  const decoded=jpeg.decode(result.capture.jpeg);
  assert.equal(decoded.width,8); assert.equal(decoded.height,4);
  assert(decoded.data[0]>200); assert(decoded.data[2]<30);
});
test('invalid selection and out-of-bounds ROI fail before any capture', async () => {
  const f=fixture();
  await assert.rejects(f.source.capture('missing'));
  await assert.rejects(f.source.captureRoi('left',{x:1,y:0,width:.5,height:1}));
  assert.equal(f.count(),0);
});
test('display budget is enforced and topology changes invalidate evidence identity', async () => {
  const f=fixture(), roi={x:0,y:0,width:1,height:1};
  const first=await f.source.captureRoi('left',roi);
  f.d.x=0;
  const second=await f.source.captureRoi('left',roi);
  assert.notEqual(first.topologyRevision,second.topologyRevision);
  f.d.width=100000; f.d.height=100000;
  await assert.rejects(f.source.capture('left'),/budget/);
  assert.equal(f.count(),2);
});
