import './style.css';
import { readSessions, saveSessions, streak } from './storage.js';
const app = document.querySelector('#app');
const icons = { home:'⌂', journal:'▤', arrow:'↗', leaf:'✳' };
const moods = ['つらい','少し低め','ふつう','いい感じ','とてもいい'];
const faces = ['😔','🌧️','🌤️','🌿','☀️'];
const dailyQuestions = [
 ['いま、どんな気持ちですか？','頭の中にあることを、そのまま言葉にしてみましょう。','今日あったことや、気になっていること…'],
 ['本当は、どうなりたいですか？','「こうあるべき」より、自分の願いに目を向けて。','どんな状態だったら、少しうれしい？'],
 ['自分にできる、小さな一歩は？','5分でできるくらいの、小さな行動で大丈夫。','いつ、何をしてみますか？']
];
const tracks = {
 daily: {label:'日々の振り返り', icon:'☼', description:'今日の気づきから、次の一歩へ', questions:dailyQuestions},
 goal: {label:'目標と習慣', icon:'↗', description:'なりたい自分に、小さく近づく', questions:[['叶えたいことは何ですか？','大切にしたい理由も、一緒に書いてみましょう。','どんな自分になりたい？ それはなぜ？'],['いま、何が助けになりそうですか？','使える時間や得意なこと、支えてくれる人に目を向けて。','できていること、障害になっていること…'],['続けるための、小さな一歩は？','いつ、どこで、何をするか。無理のないサイズに。','明日の朝、5分だけ…']]},
 emotion: {label:'感情の整理', icon:'♡', description:'気持ちをほどき、自分をいたわる', questions:[['どんな出来事に、心が動きましたか？','事実と気持ちを、思いつくままに書いてみましょう。','何が起きて、どんな気持ちになった？'],['その気持ちの奥に、どんな願いがありますか？','気持ちを否定せず、大切にしたかったことを探して。','本当は、どうしてほしかった？'],['今の自分をいたわるために、何ができますか？','休む、誰かに話す。小さな選択で大丈夫。','今日、自分のためにできること…']]}
};
let track='daily', questions=dailyQuestions, historyFilter='all';
let goals=[];
try { const parsed=JSON.parse(localStorage.getItem('michi.goals.v1')||'[]'); if(Array.isArray(parsed)) goals=parsed.filter(g=>g&&typeof g.id==='string'&&typeof g.title==='string'&&Array.isArray(g.checks)); } catch {}
const todayKey=()=>new Date().toLocaleDateString('en-CA');
function saveGoals(next){try{localStorage.setItem('michi.goals.v1',JSON.stringify(next));goals=next;storageError='';return true;}catch{storageError='目標を保存できませんでした。ブラウザの保存設定をご確認ください。';return false;}}
function beginSession(nextTrack=track){track=nextTrack;questions=tracks[track].questions;page='session';step=0;answers=['','',''];finished=false;render();}
let sessions = [], storageError = '';
try { sessions = readSessions(localStorage); } catch { storageError = '保存した記録を読み込めませんでした。ブラウザの保存設定をご確認ください。'; }
let page = 'home', mood = 0, step = 0, answers = ['','',''], selected = null, finished = false, busy = false;
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = s => new Date(s).toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
function persist(next) {
 try { saveSessions(localStorage,next); sessions=next; storageError=''; return true; }
 catch { storageError='記録を保存できませんでした。入力は残っています。ブラウザの保存設定や空き容量をご確認ください。'; return false; }
}
function hasUnsavedInput() {
 if(page==='session'&&!finished) return answers.some(a=>a.trim());
 if(page==='goals') return [...document.querySelectorAll('#goal-form input')].some(input=>input.value.trim());
 return false;
}
function navigate(nextPage) {
 if(hasUnsavedInput()&&!confirm('入力中の内容を破棄して移動しますか？')) return;
 page=nextPage; selected=null; finished=false;
 if(nextPage==='history') historyFilter='all';
 render();
}
window.addEventListener('beforeunload',e=>{
 if(hasUnsavedInput()){e.preventDefault();e.returnValue='';}
});
function shell(content) {
 app.innerHTML = `<aside class="sidebar"><a class="brand" href="#" aria-label="michi ホーム"><span class="brand-mark">m</span>michi<span class="brand-dot">.</span></a><div class="workspace-label">MY SPACE</div><nav><button class="nav ${page==='home'?'active':''}" data-page="home"><span>${icons.home}</span>ホーム</button><button class="nav ${page==='history'?'active':''}" data-page="history"><span>${icons.journal}</span>振り返りの記録<span class="count">${sessions.length}</span></button><button class="nav ${page==='goals'?'active':''}" data-page="goals"><span>↗</span>目標と習慣</button></nav><div class="side-note"><span class="sprout">❋</span><p>答えは、きっと<br>あなたの中に。</p><small>自分のペースで、少しずつ。</small></div><div class="local-badge"><i></i>このブラウザだけに保存</div></aside><main><header><span>あなたのための、小さな余白</span><span class="header-right">SELF-COACHING <span class="avatar">M</span></span></header>${storageError?`<p role="alert" class="error">${esc(storageError)}</p>`:''}${content}<footer><span class="footer-brand">michi.</span> 自分と向き合う時間を、日常に。<span>すべて、あなたのペースで。</span></footer></main>`;
 document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
 document.querySelector('.brand').onclick=e=>{e.preventDefault();navigate('home');};
}
function render() {
 if(page==='session') return renderSession();
 if(page==='history') return renderHistory();
 if(page==='goals') return renderGoals();
 const latest = sessions.slice(0,2);
 shell(`<section class="welcome"><div class="eyebrow">A MOMENT FOR YOURSELF</div><h1>立ち止まると、<br>見えてくるものがある。</h1><p>忙しい毎日に、自分の声を聴く時間を。<br>今の気持ちをほどいて、あなたらしい一歩を見つけましょう。</p><div class="welcome-art" aria-hidden="true"><div class="sun"></div><div class="hill hill-back"></div><div class="hill hill-front"></div><div class="path"></div><span class="art-star">✳</span><span class="art-caption">a little closer to yourself</span></div></section><section class="track-picker" aria-label="コーチングのテーマ">${Object.entries(tracks).map(([key,t])=>`<button data-track="${key}" class="track-button ${track===key?'chosen':''}" aria-pressed="${track===key}"><span>${t.icon}</span><div><strong>${t.label}</strong><small>${t.description}</small></div><span class="track-check">${track===key?'✓':''}</span></button>`).join('')}</section><div class="dashboard"><section class="checkin card"><div class="section-tag"><span class="tiny-sun">☼</span> TODAY'S CHECK-IN <span class="duration">約5分</span></div><h2>いまのあなたは、どんな感じ？</h2><p class="muted">まずは、今の気持ちに気づくことから。</p><div class="moods">${moods.map((m,i)=>`<button class="mood ${mood===i+1?'selected':''}" data-mood="${i+1}" aria-pressed="${mood===i+1}"><span>${faces[i]}</span><small>${m}</small></button>`).join('')}</div><button class="primary" id="begin">自分と向き合う時間をはじめる <span>→</span></button><p class="reassurance">正解も、不正解もありません。ありのままで。</p></section><section class="quote card"><span class="quote-label">TODAY'S LITTLE REMINDER</span><div class="quote-symbol">“</div><blockquote>小さな一歩も、<br>ちゃんと前進。</blockquote><p>大きく変わろうとしなくていい。<br>今日の自分にできることを、ひとつ。</p><div class="quote-bottom"><span>✧</span> Take it one step at a time.</div></section></div><section class="records"><div class="section-heading"><div><span class="eyebrow">YOUR JOURNEY</span><h2>これまでの、あなたの歩み</h2></div><button class="text-button" id="all-records">すべての記録を見る ↗</button></div><div class="journey-grid"><div class="stats card"><div><strong>${sessions.length}<small>回</small></strong><span>自分と向き合った時間</span></div><div><strong>${streak(sessions)}<small>日</small></strong><span>続いている小さな習慣</span></div><span class="stats-flower">✳</span></div>${latest.length?latest.map(recordCard).join(''):`<div class="empty-record card"><span>▤</span><div><h3>あなたの物語は、ここから。</h3><p>振り返りをすると、ここに記録が並びます。<br>未来のあなたへの、小さな手紙に。</p></div></div>`}</div></section>`);
 document.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{mood=+b.dataset.mood;render();});
 document.querySelector('#begin').onclick=()=>beginSession();
 document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{track=b.dataset.track;questions=tracks[track].questions;render();});
 document.querySelector('#all-records').onclick=()=>{historyFilter='all';page='history';render();};
 bindRecords();
}
function recordCard(r) {return `<button class="record card" data-record="${esc(r.id)}"><span class="record-type">${tracks[r.track||'daily']?.label||'日々の振り返り'}</span><span class="record-date">${esc(date(r.date))} <span>${faces[r.mood-1]||'🌱'}</span></span><h3>${esc(r.action)}</h3><span class="record-link">振り返りを読む ↗</span></button>`;}
function bindRecords(){document.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>{selected=b.dataset.record;page='history';render();});}
function renderSession(){
 if(finished){shell(`<section class="completion card"><span class="complete-icon">✳</span><div class="eyebrow">ONE SMALL STEP</div><h1>今日のあなたに、ありがとう。</h1><p>自分の声に耳を傾けた時間も、ひとつの前進です。</p><div class="action-summary"><small>あなたが選んだ、次の一歩</small><h2>${esc(answers[2])}</h2></div><p class="muted">このブラウザに記録を保存しました。</p><button class="primary" id="done">ホームに戻る →</button></section>`);document.querySelector('#done').onclick=()=>{page='home';finished=false;render();};return;}
 shell(`<section class="session-wrap"><button class="text-button" id="exit">← ホームに戻る</button><div class="session-top"><span class="eyebrow">A CONVERSATION WITH YOURSELF</span><span>STEP ${step+1} / 3</span></div><div class="progress">${questions.map((_,i)=>`<i class="${i<=step?'filled':''}"></i>`).join('')}</div><div class="session-card card"><span class="step-flower">${['✳','✧','↗'][step]}</span><h1>${questions[step][0]}</h1><p class="muted">${questions[step][1]}</p>${step===0?`<fieldset class="session-moods"><legend>今の気分（任意）</legend>${moods.map((m,i)=>`<button type="button" class="mood ${mood===i+1?'selected':''}" data-mood="${i+1}" aria-label="${m}" aria-pressed="${mood===i+1}">${faces[i]}</button>`).join('')}</fieldset>`:''}<label class="sr-only" for="answer">${questions[step][0]}</label><textarea id="answer" maxlength="3000" placeholder="${questions[step][2]}">${esc(answers[step])}</textarea><div class="input-meta"><span>短いひと言でも、大丈夫。</span><span id="chars">${answers[step].length} / 3000</span></div><div class="session-actions"><button class="text-button" id="back" ${step===0?'disabled':''}>← 前の問い</button><button class="primary" id="next" ${answers[step].trim()?'':'disabled'}>${step===2?'記録を保存する':'次の問いへ'} →</button></div></div><p class="reassurance">あなたの記録は、このブラウザにだけ保存されます。</p></section>`);
 const input=document.querySelector('#answer');input.oninput=()=>{answers[step]=input.value;document.querySelector('#chars').textContent=`${input.value.length} / 3000`;document.querySelector('#next').disabled=!input.value.trim();};
 document.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{mood=+b.dataset.mood;renderSession();});
 document.querySelector('#back').onclick=()=>{if(step>0){step--;render();}};
 document.querySelector('#exit').onclick=()=>navigate('home');
 document.querySelector('#next').onclick=()=>{if(!answers[step].trim()||busy)return;if(step<2){step++;render();document.querySelector('#answer').focus();}else{busy=true;const r={id:crypto.randomUUID(),date:new Date().toISOString(),mood,track,answers:answers.map(a=>a.trim()),action:answers[2].trim()};if(persist([r,...sessions]))finished=true;busy=false;render();}};
}
function renderHistory(){
 const r=sessions.find(x=>x.id===selected);
 if(r){shell(`<section class="detail session-wrap"><button class="text-button" id="history-back">← 記録一覧に戻る</button><div class="section-heading"><h1>${esc(date(r.date))}の振り返り</h1><span>${faces[r.mood-1]||'🌱'} ${moods[r.mood-1]||'未選択'}</span></div><div class="card detail-card">${(tracks[r.track||'daily']?.questions||dailyQuestions).map((q,i)=>`<section><span class="eyebrow">0${i+1}</span><h2>${q[0]}</h2><p>${esc(r.answers[i])}</p></section>`).join('')}</div><button class="delete-button" id="delete">この記録を削除する</button></section>`);document.querySelector('#history-back').onclick=()=>{selected=null;render();};document.querySelector('#delete').onclick=()=>{if(confirm('この記録を削除しますか？ この操作は元に戻せません。')&&persist(sessions.filter(x=>x.id!==r.id))){selected=null;}render();};return;}
 shell(`<section class="history-page"><div class="eyebrow">YOUR JOURNEY</div><h1>振り返りの記録</h1><p class="muted">あの日の気づきが、これからの道しるべに。</p><div class="history-tools"><div class="filter-buttons">${[['all','すべて'],...Object.entries(tracks).map(([k,t])=>[k,t.label])].map(([key,label])=>`<button data-filter="${key}" aria-pressed="${historyFilter===key}" class="filter-button ${historyFilter===key?'chosen':''}">${label}</button>`).join('')}</div><button class="text-button" id="export" ${sessions.length||goals.length?'':'disabled'}>記録を書き出す ↓</button></div><div class="history-list">${sessions.length?(sessions.filter(r=>historyFilter==='all'||(r.track||'daily')===historyFilter).map(recordCard).join('')||'<p class="muted">このテーマの記録はまだありません。</p>'):`<div class="card history-empty"><span>✳</span><h2>最初の一歩を、ここから。</h2><p>まだ記録がありません。今の自分と話してみませんか。</p><button class="primary" id="first">振り返りをはじめる →</button></div>`}</div><p class="reassurance">記録はこのブラウザ内に保存されます。ブラウザのデータを消去すると記録も削除されます。</p></section>`);
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{historyFilter=b.dataset.filter;render();});
 document.querySelector('#export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,sessions,goals},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`michi-${todayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 bindRecords();const first=document.querySelector('#first');if(first)first.onclick=()=>beginSession();
}
function renderGoals(){
 shell(`<section class="history-page"><div class="eyebrow">SMALL STEPS, EVERY DAY</div><h1>目標と習慣</h1><p class="muted">大切にしたい目標を、今日できる行動につなげましょう。</p><form id="goal-form" class="card goal-form"><h2>新しい目標を育てる</h2><div class="goal-fields"><label>叶えたい目標<input name="title" required maxlength="120" placeholder="例：心と体に余裕をつくる"></label><label>続けたい小さな習慣<input name="habit" required maxlength="120" placeholder="例：寝る前に5分ストレッチ"></label><label>目標日（任意）<input name="due" type="date"></label></div><button class="primary" type="submit">目標を追加する ＋</button><p class="goal-form-error" role="alert"></p></form><div class="goal-list">${goals.length?goals.map(g=>`<article class="card goal-item ${g.completed?'goal-completed':''}"><div class="goal-item-top"><span class="eyebrow">${g.completed?'ACHIEVED':'GROWING'}</span><button class="text-button remove-goal" data-remove-goal="${esc(g.id)}" aria-label="${esc(g.title)}を削除">削除</button></div><h2>${esc(g.title)}</h2>${g.due?`<p class="goal-due">目標日：${esc(g.due)}</p>`:''}<p class="habit-title">↳ ${esc(g.habit)}</p><div class="habit-week" aria-label="過去7日間の習慣の記録">${Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const key=d.toLocaleDateString('en-CA');return `<div><small>${d.getMonth()+1}/${d.getDate()}</small><span class="${g.checks.includes(key)?'checked':''}">${g.checks.includes(key)?'✓':'·'}</span></div>`;}).join('')}</div><div class="goal-controls"><button class="habit-toggle ${g.checks.includes(todayKey())?'checked':''}" data-check="${esc(g.id)}" aria-pressed="${g.checks.includes(todayKey())}" ${g.completed?'disabled':''}>${g.checks.includes(todayKey())?'✓ 今日の習慣を達成':'○ 今日の習慣を記録'}</button><button class="text-button" data-complete="${esc(g.id)}">${g.completed?'目標を再開する':'目標を達成した！'}</button></div></article>`).join(''):'<p class="muted">まだ目標がありません。小さくはじめてみましょう。</p>'}</div></section>`);
 document.querySelector('#goal-form').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;const data=new FormData(f);const title=data.get('title').trim(),habit=data.get('habit').trim();if(!title||!habit){document.querySelector('.goal-form-error').textContent='目標と習慣を入力してください。';return;}if(saveGoals([{id:crypto.randomUUID(),title,habit,due:data.get('due'),checks:[],completed:false},...goals]))render();else document.querySelector('.goal-form-error').textContent=storageError;};
 document.querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>{saveGoals(goals.map(g=>g.id===b.dataset.check?{...g,checks:g.checks.includes(todayKey())?g.checks.filter(d=>d!==todayKey()):[...g.checks,todayKey()]}:g));render();});
 document.querySelectorAll('[data-complete]').forEach(b=>b.onclick=()=>{saveGoals(goals.map(g=>g.id===b.dataset.complete?{...g,completed:!g.completed}:g));render();});
 document.querySelectorAll('[data-remove-goal]').forEach(b=>b.onclick=()=>{if(confirm('目標と習慣の記録を削除しますか？')){saveGoals(goals.filter(g=>g.id!==b.dataset.removeGoal));render();}});
}
render();
