// Losslessly share identical GLB buffer data after exporting from Blender.
// Usage: node compact-glb.cjs binder-model.glb wave-model.glb
// Vertex values, textures, nodes, and animation channels are unchanged.
const fs=require('node:fs'),crypto=require('node:crypto');
for(const file of process.argv.slice(2)){
 const source=fs.readFileSync(file);
 if(source.readUInt32LE(0)!==0x46546c67||source.readUInt32LE(4)!==2)throw Error('Expected GLB 2: '+file);
 const jsonLength=source.readUInt32LE(12),doc=JSON.parse(source.subarray(20,20+jsonLength).toString());
 const binStart=20+jsonLength+8,bin=source.subarray(binStart),chunks=[],shared=new Map();let length=0;
 if(doc.buffers.length!==1)throw Error('Expected one embedded buffer');
 for(const view of doc.bufferViews){
  if(view.buffer!==0)throw Error('External buffers are unsupported');
  const bytes=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  if(bytes.length!==view.byteLength)throw Error('Invalid buffer bounds');
  const key=crypto.createHash('sha256').update(bytes).digest('hex');
  if(!shared.has(key)){shared.set(key,length);chunks.push(bytes);length+=bytes.length;const padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}}
  view.byteOffset=shared.get(key);
 }
 doc.buffers[0].byteLength=length;
 const text=Buffer.from(JSON.stringify(doc)),json=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),body=Buffer.concat(chunks),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
 header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+body.length,8);header.writeUInt32LE(json.length,12);header.writeUInt32LE(0x4e4f534a,16);
 binHeader.writeUInt32LE(body.length,0);binHeader.writeUInt32LE(0x004e4942,4);
 const result=Buffer.concat([header,json,binHeader,body]);fs.writeFileSync(file,result);
 console.log(JSON.stringify({file,before:source.length,after:result.length,saved:source.length-result.length}));
}
