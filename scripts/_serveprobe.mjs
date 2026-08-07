import { chromium } from 'playwright'
const ID='saftbaren'
const b=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await b.newPage({viewport:{width:1280,height:720}})
 const errs=[]; page.on('pageerror',e=>errs.push(String(e.message||e).slice(0,160)))
 await page.goto('http://localhost:5173',{waitUntil:'domcontentloaded'})
 await page.waitForFunction(()=>!!window.__barnspel,null,{timeout:15000})
 await page.evaluate((g)=>window.__barnspel.nav.go('game',{id:g}),ID)
 await page.waitForTimeout(1500)
 const info=await page.evaluate(async(gid)=>{const g=(await import('/src/games/registry.js')).getGame(gid)
   g._world.clear()
   const want=g._order?.pal??0
   const ch=[[1,0,0],[0,1,0],[0,0,1]][Math.min(want,2)]
   const gl=g._glasses[2]
   for(let r=0;r<12;r++)for(let c=0;c<8;c++)g._world.spawn(gl.x-49+c*14,gl.y-36-r*15,{pal:0,ch})
   return {want, gx:gl.x, ghome:gl.homeX, gy:gl.y, busy:!!g._busy}},ID)
 console.log('  vill ha farg',info.want,' glas2 x',info.gx,'home',info.ghome,'y',info.gy,'busy',info.busy)
 for(let k=1;k<=14;k++){
   await page.waitForTimeout(700)
   const s=await page.evaluate(async(gid)=>{const g=(await import('/src/games/registry.js')).getGame(gid)
     const gl=g._glasses[2]; const st=g._stats(gl)
     return {busy:!!g._busy,dricker:!!g._drink,order:g._order?.pal,n:st.n,dom:st.dom,frac:Number(st.frac.toFixed(2)),
             dx:Math.round(Math.abs(gl.x-gl.homeX)),ang:Number(Math.abs(gl.angle).toFixed(3))}},ID)
   console.log(`  t=${k*700} busy=${s.busy?1:0} dricker=${s.dricker?1:0} n=${s.n} dom=${s.dom} frac=${s.frac} dx=${s.dx} vinkel=${s.ang} order=${s.order}`)
   if(s.dricker) break
 }
 console.log(errs.length?'  PAGEERROR: '+errs.join(' | '):'  0 pageerror')
}finally{await b.close()}
