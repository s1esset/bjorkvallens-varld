import { chromium } from 'playwright'
const ID='saftbaren'
const b=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await b.newPage({viewport:{width:1280,height:720}})
 await page.goto('http://localhost:5173',{waitUntil:'domcontentloaded'})
 await page.waitForFunction(()=>!!window.__barnspel,null,{timeout:15000})
 await page.evaluate((g)=>window.__barnspel.nav.go('game',{id:g}),ID)
 await page.waitForTimeout(1200)
 await page.evaluate(async(gid)=>{const g=(await import('/src/games/registry.js')).getGame(gid);g._world.clear()
   const gl=g._glasses[1]
   for(let r=0;r<12;r++)for(let c=0;c<8;c++)g._world.spawn(gl.x-49+c*14,gl.y-36-r*15,{pal:0,ch:[1,0,0]})},ID)
 await page.waitForTimeout(1400)
 await page.mouse.click(570,500); await page.waitForTimeout(250); await page.mouse.click(1100,560)
 await page.waitForTimeout(2600); await page.screenshot({path:'.test-shots/_hink-mitt.png'})
 await page.waitForTimeout(3000); await page.screenshot({path:'.test-shots/_hink-efter.png'})
 const s=await page.evaluate(async(gid)=>{const g=(await import('/src/games/registry.js')).getGame(gid)
   const w=g._world; const pts=[]
   for(let i=0;i<w.count;i++) pts.push([Math.round(w.x[i]),Math.round(w.y[i])])
   const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1])
   return {n:w.count, xMin:Math.min(...xs), xMax:Math.max(...xs), yMin:Math.min(...ys), yMax:Math.max(...ys),
           medelX:Math.round(xs.reduce((a,c)=>a+c,0)/xs.length), medelY:Math.round(ys.reduce((a,c)=>a+c,0)/ys.length)}},ID)
 console.log(`  kvar ${s.n} partiklar: x ${s.xMin}..${s.xMax} (medel ${s.medelX}), y ${s.yMin}..${s.yMax} (medel ${s.medelY})`)
 console.log(`  hinkens drain: x 1045..1155, y 495..625`)
}finally{await b.close()}
