"""Create mobile-sized delivery copies; requires Pillow. See README for usage."""
from pathlib import Path
import json,struct,io,hashlib,sys,shutil
from PIL import Image
import argparse
parser=argparse.ArgumentParser(description='Prepare lightweight GLB hair copies without modifying source files.')
parser.add_argument('--long',required=True,type=Path)
parser.add_argument('--pigtails',required=True,type=Path)
parser.add_argument('--spiky',required=True,type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'dist'/'models'
# Lightweight delivery copies retain geometry, UVs and base-color texture.
# The source files stay untouched. Extra 4K PBR maps are not used by this app.
manifest={}
for source,out in [(args.long,'hair-long.glb'),(args.pigtails,'hair-pigtails.glb'),(args.spiky,'hair-spiky.glb')]:
 raw=source.read_bytes();n=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+n]);binary=raw[28+n:];old=d['bufferViews'];segments=[];views=[];offset=0
 def add(data):
  global offset
  data+=b'\0'*((-len(data))%4); views.append({'buffer':0,'byteOffset':offset,'byteLength':len(data)}); segments.append(data);offset+=len(data);return len(views)-1
 remap={}
 for a in d['accessors']:
  i=a['bufferView']
  if i not in remap:
   v=old[i];remap[i]=add(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]);views[-1].update({k:v[k] for k in ['byteStride','target'] if k in v})
  a['bufferView']=remap[i]
 image=d['images'][d['textures'][0]['source']];v=old[image['bufferView']];im=Image.open(io.BytesIO(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGB');im.thumbnail((1024,1024));buf=io.BytesIO();im.save(buf,format='JPEG',quality=90)
 image_index=add(buf.getvalue());d['images']=[{'bufferView':image_index,'mimeType':'image/jpeg'}];d['textures']=[{'source':0}];d['materials']=[{'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.85}}]
 d.pop('extensionsUsed',None);d.pop('extensionsRequired',None);d['bufferViews']=views;d['buffers']=[{'byteLength':offset}]
 doc=json.dumps(d,separators=(',',':')).encode();doc+=b' '*((-len(doc))%4);data=b''.join(segments);result=struct.pack('<III',0x46546c67,2,12+8+len(doc)+8+len(data))+struct.pack('<II',len(doc),0x4e4f534a)+doc+struct.pack('<II',len(data),0x004e4942)+data
 (root/out).write_bytes(result);manifest[out]={'source':source.name,'sourceSha256':hashlib.sha256(raw).hexdigest(),'sha256':hashlib.sha256(result).hexdigest(),'bytes':len(result)};print(out,len(raw),'->',len(result))
(root/'hair-assets.json').write_text(json.dumps(manifest,indent=2)+'\n')
