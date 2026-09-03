// ---------------------------------------------------------------------------
// gerar-provisorio.mjs — cria imagens PROVISÓRIAS em arte/, só para provar que
// o caminho ilustrado funciona de ponta a ponta. São formas chapadas e cores
// deliberadamente distintas: se elas aparecerem no lugar certo na tela, o
// encanamento está certo e a arte de verdade vai encaixar no mesmo lugar.
// ---------------------------------------------------------------------------
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = resolve(aqui, '../arte');
mkdirSync(destino, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await b.newPage();
await page.setContent('<canvas id=c></canvas>');

const pecas = await page.evaluate(() => {
  const c = document.getElementById('c'), g = c.getContext('2d');
  const saida = {};
  const nova = (w, h) => { c.width = w; c.height = h; g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,w,h); return g; };
  const salvar = (n) => { saida[n] = c.toDataURL('image/png'); };
  const moita = (x,y,r,sem,ach=1,lob=11)=>{
    const rEm=a=>r*(0.84+0.22*Math.abs(Math.sin(a*2.7+sem)));
    g.beginPath();
    for(let i=0;i<lob;i++){const a0=Math.PI*2*i/lob,a1=Math.PI*2*(i+1)/lob,am=(a0+a1)/2;
      const rm=r*(1.1+0.3*Math.abs(Math.sin(am*1.9+sem*1.3)));
      if(i===0)g.moveTo(x+Math.cos(a0)*rEm(a0),y+Math.sin(a0)*rEm(a0)*ach);
      g.quadraticCurveTo(x+Math.cos(am)*rm,y+Math.sin(am)*rm*ach,
        x+Math.cos(a1)*rEm(a1),y+Math.sin(a1)*rEm(a1)*ach);}
    g.closePath();
  };

  // céu
  nova(2560,1440);
  let gr=g.createLinearGradient(0,0,0,1440);
  gr.addColorStop(0,'#274a72'); gr.addColorStop(0.55,'#7ea6b4'); gr.addColorStop(1,'#ffd7a2');
  g.fillStyle=gr; g.fillRect(0,0,2560,1440);
  gr=g.createRadialGradient(1900,320,0,1900,320,900);
  gr.addColorStop(0,'rgba(255,225,160,0.85)'); gr.addColorStop(1,'rgba(255,225,160,0)');
  g.fillStyle=gr; g.fillRect(0,0,2560,1440);
  g.fillStyle='#fff6e0'; g.beginPath(); g.arc(1900,320,74,0,7); g.fill();
  g.fillStyle='rgba(255,255,255,0.30)';
  for(let i=0;i<12;i++){ for(let k=0;k<4;k++) { moita(200+i*210+k*70,240+((i*97)%360),90+k*20,i+k,0.35,9); g.fill(); } }
  salvar('ceu');

  // mata longe / perto — faixas com transparência acima
  const faixa=(nome,w,h,cor,cor2,r0,n)=>{
    nova(w,h);
    for(let passo=0;passo<2;passo++){
      g.fillStyle=passo?cor2:cor;
      g.beginPath(); g.moveTo(0,h); g.lineTo(0,h*(passo?0.62:0.52));
      for(let i=0;i<=n;i++){
        const x=(w*i)/n;
        const r=r0*(0.6+Math.abs(Math.sin(i*1.9+passo*3))*0.8)*(passo?0.8:1);
        moita(x,h*(passo?0.62:0.52)-r*0.2,r,i*2+passo,0.85,9);
      }
      g.lineTo(w,h); g.closePath(); g.fill();
      for(let i=0;i<=n;i++){
        const x=(w*i)/n;
        const r=r0*(0.6+Math.abs(Math.sin(i*1.9+passo*3))*0.8)*(passo?0.8:1);
        moita(x,h*(passo?0.62:0.52)-r*0.2,r,i*2+passo,0.85,9); g.fill();
      }
    }
    salvar(nome);
  };
  faixa('mata_longe',2560,900,'#7fa9a2','#93bcae',150,14);
  faixa('mata_perto',2560,1000,'#3f7a58','#559468',190,11);

  // frente: folhagem escura nas bordas, miolo vazio
  nova(2560,700);
  g.filter='blur(9px)'; g.fillStyle='rgba(16,38,30,0.95)';
  for(const [by,sg] of [[-30,1],[730,-1]]) for(let i=0;i<14;i++)
    for(let k=0;k<3;k++){ moita(i*190+k*60,by+sg*(30+k*46),110+k*26,i+k,0.55,10); g.fill(); }
  g.filter='none'; salvar('frente');

  // terra: ladrilho
  nova(1024,1024);
  g.fillStyle='#5a4331'; g.fillRect(0,0,1024,1024);
  for(let i=0;i<160;i++){
    const x=(i*137)%1024, y=(i*271)%1024, r=18+((i*53)%70);
    g.fillStyle=i%2?'rgba(122,99,76,0.5)':'rgba(48,36,27,0.5)';
    moita(x,y,r,i,0.7,8); g.fill();
    if(x<r||x>1024-r){ moita(x<r?x+1024:x-1024,y,r,i,0.7,8); g.fill(); }
    if(y<r||y>1024-r){ moita(x,y<r?y+1024:y-1024,r,i,0.7,8); g.fill(); }
  }
  for(let i=0;i<70;i++){
    const x=(i*311)%1024,y=(i*197)%1024,r=5+((i*29)%13);
    g.fillStyle='rgba(160,142,118,0.75)'; moita(x,y,r,i,0.8,7); g.fill();
  }
  salvar('terra');

  // borda de grama
  nova(1024,320);
  g.fillStyle='#3f7a35';
  g.beginPath(); g.moveTo(0,230);
  for(let x=0;x<=1024;x+=16) g.lineTo(x,205+Math.sin(x*0.02)*10);
  g.lineTo(1024,300); g.lineTo(0,300); g.closePath(); g.fill();
  for(let x=0;x<1024;x+=7){
    const h=40+Math.abs(Math.sin(x*0.07))*70, inc=Math.sin(x*0.05)*22;
    g.fillStyle=x%14?'#67ab48':'#8fd06a';
    g.beginPath(); g.moveTo(x-4,215);
    g.quadraticCurveTo(x+inc*0.5,215-h*0.6,x+inc,215-h);
    g.quadraticCurveTo(x+inc*0.3,215-h*0.5,x+4,215); g.closePath(); g.fill();
  }
  salvar('borda_grama');

  // --- personagem em recortes -------------------------------------------------
  nova(640,700);
  g.fillStyle='#c9873f'; g.beginPath(); g.ellipse(320,420,240,250,0,0,7); g.fill();
  g.fillStyle='#f3d2a4'; g.beginPath(); g.ellipse(300,470,150,140,0,0,7); g.fill();
  g.fillStyle='#6b4023'; g.beginPath();
  g.moveTo(72,300); g.bezierCurveTo(80,20,560,20,568,300);
  g.quaAdraticCurveTo ? 0 : g.quadraticCurveTo(320,360,72,300); g.closePath(); g.fill();
  for(const s of [-1,1]){
    const ex=320+s*95;
    g.fillStyle='#fffaf0'; g.beginPath(); g.ellipse(ex,420,56,66,0,0,7); g.fill();
    g.fillStyle='#2f6f63'; g.beginPath(); g.arc(ex+s*8,428,36,0,7); g.fill();
    g.fillStyle='#1c1410'; g.beginPath(); g.arc(ex+s*8,428,19,0,7); g.fill();
    g.fillStyle='#fff'; g.beginPath(); g.arc(ex+s*8+13,412,9,0,7); g.fill();
  }
  g.strokeStyle='#5a2f1c'; g.lineWidth=9; g.lineCap='round';
  g.beginPath(); g.moveTo(280,520); g.quadraticCurveTo(320,556,360,520); g.stroke();
  salvar('bolota_cabeca');

  nova(300,420);
  g.strokeStyle='#54823c'; g.lineWidth=26; g.lineCap='round';
  g.beginPath(); g.moveTo(150,410); g.quadraticCurveTo(178,240,158,90); g.stroke();
  g.fillStyle='#7cc157';
  for(const s of [-1,1]){ g.save(); g.translate(158,96); g.rotate(s*0.72);
    g.beginPath(); g.moveTo(0,0); g.quadraticCurveTo(56,-46,116,0);
    g.quadraticCurveTo(56,46,0,0); g.fill(); g.restore(); }
  salvar('bolota_broto');

  nova(420,480);
  g.fillStyle='#c08a52'; g.beginPath(); g.ellipse(210,240,200,235,0,0,7); g.fill();
  g.fillStyle='#f8e2bd'; g.beginPath(); g.ellipse(200,280,132,160,0,0,7); g.fill();
  salvar('bolota_tronco');

  const membro=(nome,w,h,cor,cor2)=>{
    nova(w,h);
    g.strokeStyle=cor; g.lineWidth=w*0.66; g.lineCap='round';
    g.beginPath(); g.moveTo(w/2,w*0.36); g.lineTo(w/2,h-w*0.5); g.stroke();
    g.fillStyle=cor2; g.beginPath(); g.ellipse(w/2,h-w*0.42,w*0.44,w*0.34,0,0,7); g.fill();
    salvar(nome);
  };
  membro('bolota_braco',180,420,'#a0693a','#d8a468');
  membro('bolota_perna',200,460,'#8f5b2e','#c9945c');
  return saida;
});
await b.close();

let n = 0;
for (const [nome, url] of Object.entries(pecas)) {
  writeFileSync(resolve(destino, nome + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  n++;
}
console.log(`${n} imagens provisórias em arte/`);
