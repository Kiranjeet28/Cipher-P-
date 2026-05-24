const imageInput = document.getElementById('imageInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const algorithm = document.getElementById('algorithm');
const keyInput = document.getElementById('keyInput');
const paramInput = document.getElementById('paramInput');
const encryptBtn = document.getElementById('encryptBtn');
const decryptBtn = document.getElementById('decryptBtn');
const downloadBtn = document.getElementById('downloadBtn');
const generateKeyBtn = document.getElementById('generateKey');
const messages = document.getElementById('messages');
const perChannelCheckbox = document.getElementById('perChannel');

let currentImage = null;
let currentImageData = null;
let lastResultBlob = null;

// Per-algorithm UI capability map
const algConfig = {
  caesar: { needsKey:false, canGenerate:false, needsParam:false },
  multiplicative: { needsKey:true, canGenerate:false, needsParam:false },
  affine: { needsKey:true, canGenerate:false, needsParam:false },
  playfair: { needsKey:true, canGenerate:false, needsParam:false },
  hill: { needsKey:true, canGenerate:false, needsParam:true, paramLabel:'Matrix size (n)', paramPlaceholder:'e.g. 2'} ,
  railfence: { needsKey:false, canGenerate:false, needsParam:true, paramLabel:'Rails (n)', paramPlaceholder:'e.g. 3'},
  dh: { needsKey:false, canGenerate:false, needsParam:true, paramLabel:'Prime size (bits)', paramPlaceholder:'e.g. 2048'},
  rsa: { needsKey:true, canGenerate:true, needsParam:true, paramLabel:'Key size (bits)', paramPlaceholder:'e.g. 2048'},
  rc4: { needsKey:true, canGenerate:false, needsParam:false }
};

function updateUIForAlgorithm(){
  const alg = algorithm.value;
  const cfg = algConfig[alg] || { needsKey:true, canGenerate:false, needsParam:false };
  // Key input visibility/enabled
  if(cfg.needsKey){ keyInput.style.display = ''; keyInput.disabled = false; }
  else { keyInput.style.display = 'none'; keyInput.disabled = true; }
  // Generate key button
  generateKeyBtn.style.display = cfg.canGenerate ? '' : 'none';
  generateKeyBtn.disabled = !cfg.canGenerate;
  // Param input
  if(cfg.needsParam){ paramInput.style.display = ''; paramInput.disabled = false; paramInput.placeholder = cfg.paramPlaceholder || 'Parameter'; }
  else { paramInput.style.display = 'none'; paramInput.disabled = true; paramInput.value = ''; }
  // algorithm-specific note
  const noteEl = document.getElementById('algNote');
  if(alg === 'caesar') noteEl.textContent = 'Using fixed shift k=3 (no key required).';
  else noteEl.textContent = '';
}

algorithm.addEventListener('change', ()=>{ updateUIForAlgorithm(); setMessage('Algorithm selected: '+algorithm.value); });

// initialize UI state
updateUIForAlgorithm();

function setMessage(msg, err=false){ messages.textContent = msg; messages.style.color = err ? '#ffb4ab' : ''; }

imageInput.addEventListener('change', async (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = ()=>{
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img,0,0);
    currentImage = img;
    currentImageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    setMessage('Image loaded: '+file.name);
    downloadBtn.disabled = true;
  };
  img.onerror = ()=> setMessage('Failed to load image', true);
  img.src = url;
});

function downloadCanvas(){
  canvas.toBlob((blob)=>{
    if(!blob) return setMessage('Failed to create blob', true);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'result.png';
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}

downloadBtn.addEventListener('click', downloadCanvas);

generateKeyBtn.addEventListener('click', ()=>{
  const alg = algorithm.value;
  const cfg = algConfig[alg] || {};
  if(!cfg.canGenerate){ setMessage('Key generation not available for this algorithm', true); return; }
  if(alg === 'caesar'){
    const k = Math.floor(Math.random()*256);
    keyInput.value = String(k);
    setMessage('Generated Caesar key: '+k);
  } else {
    setMessage('Key generation: implement server-side or choose algorithm-specific key.');
  }
});

encryptBtn.addEventListener('click', ()=>processImage(true));
decryptBtn.addEventListener('click', ()=>processImage(false));

function processImage(isEncrypt){
  if(!currentImageData) return setMessage('No image loaded', true);
  const alg = algorithm.value;
  const key = keyInput.value.trim();
  const param = paramInput.value.trim();
  const cfg = algConfig[alg] || { needsKey:true };
  if(cfg.needsKey && !key){ setMessage('Enter a key or generate one', true); return; }
  setMessage('Processing...');
  if(alg === 'caesar'){
    const shift = 3; // fixed shift as requested
    const out = caesarProcess(currentImageData, shift, perChannelCheckbox.checked);
    ctx.putImageData(out,0,0);
    lastResultBlob = null;
    downloadBtn.disabled = false;
    setMessage('Caesar (fixed k=3) '+(isEncrypt? 'encryption':'decryption')+' done (client)');
  } else if(alg === 'rc4'){
    // RC4 not implemented client-side; send to backend
    sendToBackend(isEncrypt, alg, key, param);
  } else if(alg === 'multiplicative'){
    try{
      const a = parseInt(key,10);
      if(Number.isNaN(a)) throw new Error('Invalid multiplicative key');
      const out = multiplicativeProcess(currentImageData, a, isEncrypt);
      ctx.putImageData(out,0,0); downloadBtn.disabled=false; setMessage('Multiplicative done (client)');
    } catch(err){ setMessage(err.message, true); }
  } else if(alg === 'affine'){
    try{
      const parts = key.split(',').map(s=>parseInt(s.trim(),10)); if(parts.length<2) throw new Error('Affine key must be a,b');
      const a=parts[0], b=parts[1]; const out = affineProcess(currentImageData,a,b,isEncrypt); ctx.putImageData(out,0,0); downloadBtn.disabled=false; setMessage('Affine done (client)');
    } catch(err){ setMessage(err.message, true); }
  } else if(alg === 'playfair'){
    try{ const out = playfairProcess(currentImageData, key, isEncrypt); ctx.putImageData(out,0,0); downloadBtn.disabled=false; setMessage('Playfair (16x16) done (client)'); }
    catch(err){ setMessage(err.message, true); }
  } else if(alg === 'hill'){
    try{ const out = hillProcess(currentImageData, key, param, isEncrypt); ctx.putImageData(out,0,0); downloadBtn.disabled=false; setMessage('Hill done (client)'); }
    catch(err){ setMessage(err.message, true); }
  } else if(alg === 'railfence'){
    // Rail Fence not implemented client-side; send to backend
    sendToBackend(isEncrypt, alg, key, param);
  } else {
    // send to backend
    sendToBackend(isEncrypt, alg, key, param);
  }
}

function caesarProcess(imageData, shift, perChannel=true){
  const out = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  const d = out.data;
  // shift each color channel by shift mod 256
  for(let i=0;i<d.length;i+=4){
    if(perChannel){ d[i] = (d[i] + shift) & 0xFF; d[i+1] = (d[i+1] + shift) & 0xFF; d[i+2] = (d[i+2] + shift) & 0xFF; }
    else { // treat pixel as single value (average) then set
      const avg = ((d[i]+d[i+1]+d[i+2])>>>2);
      const v = (avg + shift)&0xFF;
      d[i]=d[i+1]=d[i+2]=v;
    }
  }
  return out;
}
  return out;

function egcd(a,b){
  let x0=1,y0=0,x1=0,y1=1;
  while(b){ let q=Math.floor(a/b); let t=b; b=a-q*b; a=t; t=x1; x1=x0-q*x1; x0=t; t=y1; y1=y0-q*y1; y0=t; }
  return [a,x0,y0];
}
function modinv(a,m){ const r=egcd((a%m+m)%m,m); if(r[0]!==1) return null; return ((r[1]%m)+m)%m; }

function multiplicativeProcess(imageData, a, isEncrypt){
  const out = cloneImageData(imageData); const d=out.data; const ainv = modinv(a,256);
  if(!isEncrypt && ainv===null) throw new Error('Multiplicative key not invertible mod 256');
  for(let i=0;i<d.length;i+=4){ if(isEncrypt){ d[i]=(d[i]*a)&0xFF; d[i+1]=(d[i+1]*a)&0xFF; d[i+2]=(d[i+2]*a)&0xFF; } else { d[i]=(d[i]*ainv)&0xFF; d[i+1]=(d[i+1]*ainv)&0xFF; d[i+2]=(d[i+2]*ainv)&0xFF; } }
  return out;
}

function affineProcess(imageData,a,b,isEncrypt){ const out=cloneImageData(imageData); const d=out.data; const ainv=modinv(a,256); if(!isEncrypt && ainv===null) throw new Error('Affine key a not invertible'); for(let i=0;i<d.length;i+=4){ if(isEncrypt){ d[i]=((a*d[i]+b)&0xFF); d[i+1]=((a*d[i+1]+b)&0xFF); d[i+2]=((a*d[i+2]+b)&0xFF); } else { d[i]=((ainv*((d[i]-b)&0xFF))&0xFF); d[i+1]=((ainv*((d[i+1]-b)&0xFF))&0xFF); d[i+2]=((ainv*((d[i+2]-b)&0xFF))&0xFF); } } return out; }

function playfairProcess(imageData, key, isEncrypt){
  // build 16x16 square
  const square = new Uint8Array(256); const used = new Array(256).fill(false); let idx=0; let seed = [];
  if(key){ const hex = key.match(/^[0-9a-fA-F]+$/) && key.length%2===0; if(hex){ for(let i=0;i<key.length;i+=2) seed.push(parseInt(key.substr(i,2),16)); } else { for(let i=0;i<key.length;i++) seed.push(key.charCodeAt(i)); } }
  for(const c of seed) if(!used[c]){ square[idx++]=c; used[c]=true; }
  for(let v=0; v<256; ++v) if(!used[v]) square[idx++]=v;
  const posr = new Uint8Array(256), posc=new Uint8Array(256); for(let i=0;i<256;i++){ posr[square[i]]=Math.floor(i/16); posc[square[i]]=i%16; }
  const out = cloneImageData(imageData); const d=out.data;
  // build stream RGB
  const stream = [];
  for(let i=0;i<d.length;i+=4){ stream.push(d[i]); stream.push(d[i+1]); stream.push(d[i+2]); }
  if(stream.length%2===1) stream.push(0);
  for(let i=0;i<stream.length;i+=2){ const a=stream[i], b=stream[i+1]; const r1=posr[a], c1=posc[a], r2=posr[b], c2=posc[b]; let o1,o2; if(r1===r2){ o1 = square[r1*16 + ((c1 + (isEncrypt?1:15))%16)]; o2 = square[r2*16 + ((c2 + (isEncrypt?1:15))%16)]; } else if(c1===c2){ o1 = square[(((r1 + (isEncrypt?1:15))%16)*16) + c1]; o2 = square[(((r2 + (isEncrypt?1:15))%16)*16) + c2]; } else { o1 = square[r1*16 + c2]; o2 = square[r2*16 + c1]; } stream[i]=o1; stream[i+1]=o2; }
  // write back
  let si=0; for(let i=0;i<d.length;i+=4){ d[i]=stream[si++]; d[i+1]=stream[si++]; d[i+2]=stream[si++]; }
  return out;
}

function hillProcess(imageData, key, param, isEncrypt){
  const n = param?parseInt(param,10):2; if(n!==2) throw new Error('Hill client supports n=2 only');
  const parts = key.split(',').map(s=>parseInt(s.trim(),10)); if(parts.length!==4) throw new Error('Hill key requires 4 integers');
  const mat = parts.map(x=>((x%256)+256)%256);
  // compute inverse if decrypt
  let imat = mat;
  if(!isEncrypt){ const det = (mat[0]*mat[3]-mat[1]*mat[2])%256; const detm = (det+256)%256; const dinv = modinv(detm,256); if(dinv===null) throw new Error('Hill key not invertible'); const adj = [mat[3], (-mat[1]+256)%256, (-mat[2]+256)%256, mat[0]]; imat = adj.map(x=> (dinv * (x%256))%256); }
  const out = cloneImageData(imageData); const d=out.data; const stream=[]; for(let i=0;i<d.length;i+=4){ stream.push(d[i]); stream.push(d[i+1]); stream.push(d[i+2]); }
  while(stream.length%2!==0) stream.push(0);
  for(let i=0;i<stream.length;i+=2){ const x0=stream[i], x1=stream[i+1]; const y0 = (imat[0]*x0 + imat[1]*x1)&0xFF; const y1 = (imat[2]*x0 + imat[3]*x1)&0xFF; stream[i]=y0; stream[i+1]=y1; }
  let si=0; for(let i=0;i<d.length;i+=4){ d[i]=stream[si++]; d[i+1]=stream[si++]; d[i+2]=stream[si++]; }
  return out;
}
  return out;

async function sendToBackend(isEncrypt, alg, key){
  try{
    const param = arguments.length >= 4 ? arguments[3] : '';
    const blob = await new Promise(resolve=>canvas.toBlob(resolve));
    if(!blob) return setMessage('Failed to serialize image for backend', true);
    const fd = new FormData();
    fd.append('image', blob, 'image.png');
    fd.append('algorithm', alg);
    fd.append('key', key);
    fd.append('param', param);
    fd.append('mode', isEncrypt? 'encrypt':'decrypt');
    setMessage('Uploading to backend...');
    const res = await fetch('/api/' + (isEncrypt? 'encrypt':'decrypt'), { method:'POST', body:fd });
    if(!res.ok) return setMessage('Backend error: '+res.statusText, true);
    const blobRes = await res.blob();
    const img = new Image();
    img.onload = ()=>{ canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; ctx.drawImage(img,0,0); downloadBtn.disabled = false; setMessage('Backend processed image'); };
    img.src = URL.createObjectURL(blobRes);
  } catch(err){ setMessage('Request failed: '+err.message, true); }
}

// helper: copy ImageData object
function cloneImageData(imageData){ return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height); }

// Drag-and-drop support
['dragenter','dragover','dragleave','drop'].forEach(evt=>{
  document.addEventListener(evt,(e)=>e.preventDefault());
});

document.body.addEventListener('drop',(e)=>{
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if(f && f.type.startsWith('image/')){ imageInput.files = e.dataTransfer.files; const ev=new Event('change'); imageInput.dispatchEvent(ev); }
});

// Initialize
setMessage('Ready. Load an image to begin.');
