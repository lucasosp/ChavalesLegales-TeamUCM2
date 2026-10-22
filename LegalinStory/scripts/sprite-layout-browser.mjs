// Run from LegalinStory with PLAYWRIGHT_MODULE_PATH if Playwright lives elsewhere.
import assert from "node:assert/strict";
import { createServer } from "vite";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const fixture = `<!doctype html><html><body><div id="app"></div><script type="module">
import '/src/styles/main.css'; import '/src/styles/sara.css'; import '/src/styles/stage.css';
import {loadStory,loadStoryIndex} from '/src/content/contentLoader.js';
import {SaraExperience} from '/src/app/SaraExperience.js';
import {backgroundImages,photoBackground} from '/src/content/backgroundImages.js';
import {illustrations,framePortrait} from '/src/content/characterImages.js';
import {avatarStore} from '/src/services/avatarStore.js';
const index=await loadStoryIndex();
const content=await loadStory(index.stories.find(entry=>entry.id==='sara'));
const [guide,legal]=await Promise.all(['guide','legal'].map(name=>fetch('/content/stories/sara/'+name+'.json').then(r=>r.json())));
const experience=new SaraExperience({root:document.querySelector('#app'),content,guide,legal});
// Exercise sprite composition independently of the three drawing checkpoints.
avatarStore.isPhase2Completed=()=>true;
avatarStore.isPhase3Completed=()=>false;
experience.phase3Triggered=true;
avatarStore.getActiveAvatar=()=>window.spriteDebug?.avatar??null;
window.spriteDebug={experience,illustrations,framePortrait,backgroundImages,judge:illustrations.judge.src,backgroundSrc:()=>photoBackground(experience.engine.stage.background),show(id){
  const background=({1:'classroom-day',2:'orientation-office',3:'orientation-office',4:'patio-day',5:'quiet-room',6:'patio-day'})[experience.engine.story[id].chapter];
  experience.engine.saveStore={load:()=>({nodeId:id,flags:{resolution:'conviction'},seen:[],history:[],stage:{background,character:{id:'sara',expression:'neutral'}}}),save(){},clear(){}};
  experience.closePanel(true); experience.engine.start({resume:true}); experience.app.view.skipTyping();
}};
</script></body></html>`;
const server = await createServer({
  logLevel: "error", server: { host: "127.0.0.1", port: 0 },
  plugins: [{ name: "sprite-layout-fixture", configureServer(server) {
    server.middlewares.use("/__sprite-layout", (_request, response) => {
      response.setHeader("Content-Type", "text/html"); response.end(fixture);
    });
  } }],
});
let browser;
try {
  await server.listen();
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:360,height:640},{width:320,height:568},{width:844,height:390}]) {
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if(response.status()>=400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(base+"__sprite-layout");
    await page.waitForFunction(()=>Boolean(window.spriteDebug));
    const ids=await page.evaluate(()=>Object.keys(window.spriteDebug.experience.engine.story));
    for(const id of ids) {
      await page.evaluate(id=>window.spriteDebug.show(id),id);
      await page.waitForFunction(()=>document.querySelector('.scene-bg.is-active')?.style.backgroundImage.includes(window.spriteDebug.backgroundSrc()));
      const result=await page.evaluate(async()=>{
        const cast=document.querySelector('.sara-cast');
        if(cast.hidden) return null;
        // Wait for decoding and its microtasks before checking the actual sprites.
        for(let attempt=0;attempt<40;attempt++) {
          if([...cast.children].every(frame=>frame.querySelector('img'))) break;
          await new Promise(resolve=>setTimeout(resolve,25));
        }
        const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
        const visible=el=>el&&!el.hidden&&getComputedStyle(el).display!=='none';
        return {cast:rect(cast),dialogue:rect(document.querySelector('[data-panel]')),landscape:innerHeight<=550&&innerWidth>=600,
          sprites:[...cast.querySelectorAll('img')].map(img=>({box:rect(img.parentElement),imageBox:rect(img),region:img.dataset.bodyRegion,loaded:img.complete&&img.naturalWidth>0,ratio:img.naturalWidth/img.naturalHeight})),
          blockers:[document.querySelector('[data-panel]'),document.querySelector('[data-choices]'),document.querySelector('.sara-top'),document.querySelector('.sara-menu-button')].filter(visible).map(rect)};
      });
      const reading = await page.evaluate(()=>{
        const panel=document.querySelector('[data-panel]');const text=document.querySelector('[data-text]');
        const choices=document.querySelector('[data-choices]');
        const rect=element=>{const r=element.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
        return {panel:panel.hidden?null:rect(panel),choices:choices.hidden?null:rect(choices),scroll:text.scrollTop};
      });
      for(const box of [reading.panel,reading.choices].filter(Boolean)) {
        assert.ok(box.top>=-1&&box.bottom<=viewport.height+1&&box.left>=-1&&box.right<=viewport.width+1,`${id}: reading controls outside viewport`);
      }
      assert.equal(reading.scroll,0,`${id}: reader missed the beginning of a sentence`);
      if(!result)continue;
      assert.ok(result.sprites.length,`Missing sprites: ${id}`);
      for(const sprite of result.sprites) {
        const r=sprite.box;
        assert.ok(sprite.loaded,`Image failed at ${id}`);
        assert.equal(sprite.region,'head-to-upper-hip');
        assert.ok(Math.abs(r.width/r.height-.8)<.01,`${id}: portrait aspect changed`);
        assert.ok(Math.abs(sprite.imageBox.width/sprite.imageBox.height-sprite.ratio)<.01,`${id}: source image was stretched`);
        assert.ok(Math.abs(r.bottom-result.cast.bottom)<1,`${id}: actor is floating above the common baseline`);
        if(!result.landscape)assert.ok(Math.abs(r.bottom-result.dialogue.y)<1,`${id}: actor is floating above the dialogue`);
        assert.ok(r.width>0&&r.height>0&&r.x>=-1&&r.y>=-1&&r.right<=viewport.width+1&&r.bottom<=viewport.height+1,`${id}: out of viewport ${JSON.stringify(r)}`);
        for(const b of result.blockers) assert.ok(r.right<=b.x+1||r.x>=b.right-1||r.bottom<=b.y+1||r.y>=b.bottom-1,`${id}: sprite overlaps UI ${JSON.stringify({r,b})}`);
      }
      assert.ok(result.sprites.every(sprite=>Math.abs(sprite.box.height-result.sprites[0].box.height)<1),`${id}: actors differ in height`);
      if(['c1-02','c5-06','c1-choice'].includes(id))await page.screenshot({path:`/tmp/sprite-layout-${id}-${viewport.width}.png`});
    }
    // Actors remain mounted when the speaker changes; the previous image stays
    // visible until its replacement has decoded.
    const stable=await page.evaluate(async()=>{
      const d=window.spriteDebug;d.show('c1-02');
      await new Promise(resolve=>setTimeout(resolve,200));
      const sara=document.querySelector('[data-person="Sara"]');
      d.experience.engine.advance();d.experience.app.view.skipTyping();
      const same=sara===document.querySelector('[data-person="Sara"]');
      const noBlank=Boolean(sara.querySelector('img'));
      d.experience.engine.back();d.experience.app.view.skipTyping();
      await new Promise(resolve=>setTimeout(resolve,200));
      return {same,noBlank,source:sara.dataset.source,current:sara.querySelector('img:last-of-type')?.src};
    });
    assert.ok(stable.same&&stable.noBlank,'Actor blinked during a speaker change');
    assert.equal(stable.current,stable.source,'Stale image appeared after going back');
    await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#247';ctx.fillRect(0,0,400,400);
      window.spriteDebug.avatar=canvas.toDataURL();window.spriteDebug.show('c1-02');
    });
    await page.waitForFunction(()=>document.querySelector('[data-person="Sara"] img[data-body-region="head-to-upper-hip"]'));
    const drawing=await page.evaluate(()=>{
      const d=window.spriteDebug;d.experience.openPanel('pause');
      return {sprite:document.querySelector('[data-person="Sara"] img').src,
        removed:document.querySelector('[data-sara-action="map"], [data-sara-action="people"], [data-sara-action="notebook"], .sara-bottom')};
    });
    assert.ok(!drawing.sprite.startsWith('data:'),'A drawing replaced the story character');
    assert.equal(drawing.removed,null);
    await page.evaluate(()=>{window.spriteDebug.experience.closePanel();window.spriteDebug.avatar=null;});
    const photos=await page.evaluate(async()=>Promise.all(Object.values(window.spriteDebug.backgroundImages).map(src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(true);i.onerror=reject;i.src=src;}))));
    assert.equal(photos.length,9);assert.deepEqual(errors,[]);
    const alpha=await page.evaluate(async()=>{
      const image=new Image();image.src=window.spriteDebug.judge;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      return {corner:ctx.getImageData(0,0,1,1).data[3],robe:ctx.getImageData(Math.floor(canvas.width*.5),Math.floor(canvas.height*.5),1,1).data[3]};
    });
    assert.equal(alpha.corner,0,'Judge still has a solid background');assert.ok(alpha.robe>200,'Dark judicial robe was removed');
    const variants=await page.evaluate(async()=>{
      const d=window.spriteDebug;
      const viewport=document.createElement('div');
      viewport.style.cssText='position:fixed;left:-10000px;width:160px;height:200px';document.body.append(viewport);
      const results=[];
      for(const art of Object.values(d.illustrations)) {
        const image=new Image();image.src=art.src;await image.decode();
        viewport.replaceChildren(image);d.framePortrait(image,art);
        results.push({region:image.dataset.bodyRegion,width:viewport.clientWidth,height:viewport.clientHeight});
      }
      viewport.remove();return results;
    });
    assert.equal(variants.length,16);
    assert.ok(variants.every(image=>image.region==='head-to-upper-hip'&&image.width===160&&image.height===200));
    console.log(`Passed ${viewport.width}x${viewport.height}: ${ids.length} story nodes, equal waist-up framing, grounded portraits, stable transitions, nine backgrounds.`);
    await page.close();
  }
} finally {await browser?.close();await server.close();}
