import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { readSessions, saveSessions, streak } from '../src/storage.js';

test('storage handles absent and malformed data, preserves records',()=>{
 const memory=new Map();const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 assert.deepEqual(readSessions(storage),[]);
 const records=[{id:'one',date:new Date().toISOString(),action:'散歩する',answers:['a','b','c']}];
 saveSessions(storage,records);assert.deepEqual(readSessions(storage),records);
 storage.setItem('michi.sessions.v1','not json');assert.throws(()=>readSessions(storage));
});
test('streak counts consecutive local days without duplicate inflation',()=>{
 const now=new Date(2026,9,27,12);
 const sessions=[27,27,26,25,23].map(d=>({date:new Date(2026,9,d,12).toISOString()}));
 assert.equal(streak(sessions,now),3);
 assert.equal(streak(sessions.slice(2),now),2);
 assert.equal(streak([],now),0);
});
test('browser: all coaching themes, persistence, filtering, goals, export, mobile, deletion',async()=>{
 const server=await createServer({server:{host:'127.0.0.1',port:5174,strictPort:true}});
 await server.listen();
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5174');
 await page.getByRole('heading',{name:'いまのあなたは、どんな感じ？'}).waitFor();
 await page.screenshot({path:'/tmp/michi-desktop.png',fullPage:true});
 for(const [track,first] of [['daily','いま、どんな気持ちですか？'],['goal','叶えたいことは何ですか？'],['emotion','どんな出来事に、心が動きましたか？']]){
 await page.locator(`[data-track="${track}"]`).click();
 await page.locator('[data-mood="4"]').click();
 await page.locator('#begin').click();
 await page.getByRole('heading',{name:first}).waitFor();
 assert.equal(await page.locator('#next').isDisabled(),true);
 for(const answer of [`${track}の気づき`,`大切にしたい${track}`,`${track}の小さな一歩`]){
 await page.locator('#answer').fill(answer);await page.locator('#next').click();
 }
 await page.getByRole('heading',{name:'今日のあなたに、ありがとう。'}).waitFor();
 await page.locator('#done').click();
 }
 await page.reload();
 await page.locator('[data-page="history"]').click();
 assert.equal(await page.locator('[data-record]').count(),3);
 await page.locator('[data-filter="emotion"]').click();
 assert.equal(await page.locator('[data-record]').count(),1);
 await page.locator('[data-record]').click();
 await page.getByRole('heading',{name:'その気持ちの奥に、どんな願いがありますか？'}).waitFor();
 await page.locator('[data-page="goals"]').click();
 await page.locator('[name="title"]').fill('健やかな毎日');
 await page.locator('[name="habit"]').fill('5分のストレッチ');
 await page.locator('[name="due"]').fill('2026-12-31');
 await page.getByRole('button',{name:'目標を追加する ＋'}).click();
 await page.locator('[data-check]').click();
 assert.equal(await page.locator('[data-check]').getAttribute('aria-pressed'),'true');
 await page.reload();
 await page.locator('[data-page="goals"]').click();
 assert.equal(await page.locator('[data-check]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-complete]').click();
 assert.equal(await page.locator('[data-check]').isDisabled(),true);
 await page.locator('[data-complete]').click();
 await page.locator('[data-check]').click();
 assert.equal(await page.locator('[data-check]').getAttribute('aria-pressed'),'false');
 await page.locator('[data-page="history"]').click();
 const downloadEvent=page.waitForEvent('download');await page.locator('#export').click();
 const download=await downloadEvent;assert.match(download.suggestedFilename(),/^michi-/);
 await page.locator('[data-record]').first().click();
 page.once('dialog',d=>d.accept());await page.locator('#delete').click();
 assert.equal(await page.locator('[data-record]').count(),2);
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-page="home"]').click();
 await page.screenshot({path:'/tmp/michi-mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no horizontal overflow');
 await page.locator('[data-page="goals"]').click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'goals fit mobile');
 page.once('dialog',d=>d.accept());await page.locator('[data-remove-goal]').click();
 assert.equal(await page.locator('[data-check]').count(),0);
 // Regressions: protect unsaved input on all navigation routes and allow goal-only export.
 const fresh=await browser.newContext();
 const regression=await fresh.newPage();
 await regression.goto('http://127.0.0.1:5174');
 await regression.locator('#begin').click();
 await regression.locator('#answer').fill('まだ書いている途中');
 await regression.evaluate(()=>{window.confirmCalls=0;window.confirm=()=>{window.confirmCalls++;return false;};});
 await regression.locator('[data-page="history"]').click();
 assert.equal(await regression.evaluate(()=>window.confirmCalls),1,'menu asks before discarding input');
 assert.equal(await regression.locator('#answer').inputValue(),'まだ書いている途中');
 await regression.locator('.brand').click();
 assert.equal(await regression.evaluate(()=>window.confirmCalls),2,'brand also protects input');
 await regression.locator('#next').click();
 await regression.locator('#back').click();
 assert.equal(await regression.locator('#answer').inputValue(),'まだ書いている途中','back preserves answer');
 await regression.evaluate(()=>window.confirm=()=>true);
 await regression.locator('[data-page="goals"]').click();
 await regression.locator('[name="title"]').fill('目標だけを保存');
 await regression.locator('[name="habit"]').fill('毎日歩く');
 await regression.getByRole('button',{name:'目標を追加する ＋'}).click();
 await regression.locator('[data-page="history"]').click();
 assert.equal(await regression.locator('#export').isEnabled(),true,'goals can be exported without reflection records');
 await regression.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
 await regression.locator('[data-page="goals"]').click();
 await regression.locator('[name="title"]').fill('保存エラー時も保持');
 await regression.locator('[name="habit"]').fill('ストレッチ');
 await regression.getByRole('button',{name:'目標を追加する ＋'}).click();
 assert.equal(await regression.locator('[name="title"]').inputValue(),'保存エラー時も保持');
 assert.match(await regression.locator('.goal-form-error').textContent(),/保存できません/);
 await fresh.close();
 assert.deepEqual(errors,[]);
 }finally{await browser.close();await server.close();}
});
