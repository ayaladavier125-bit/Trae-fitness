/* =====================================================
   FITNESS.EXE — 像素健身养成 demo
   核心概念：你的身体就是游戏角色，训练数据喂养角色成长
   ===================================================== */

// ---------- 训练类型与 XP 换算规则 ----------
const TYPES = {
  strength:  { label: '力量', attr: 'str', fields: ['sets', 'reps', 'weight'],
    xp: d => Math.round(d.sets * d.reps * (d.weight ? 1 + d.weight / 50 : 1)),
    hint: 'XP = 组数 × 次数（负重加成 ×(1+kg/50)）' },
  endurance: { label: '耐力', attr: 'end', fields: ['km'],
    xp: d => Math.round(d.km * 10), hint: 'XP = 公里 × 10' },
  agility:   { label: '敏捷', attr: 'agi', fields: ['mins'],
    xp: d => Math.round(d.mins * 2), hint: 'XP = 分钟 × 2' },
  life:      { label: '生活', attr: null, fields: [],
    xp: () => 5, hint: '固定 +5 XP' }
};
const XP_PER_LEVEL = 100;
const FORM_NAMES = { 1: '瘦猴', 2: '健体者', 3: '肌肉战士' };
const levelOf = xp => Math.floor(xp / XP_PER_LEVEL) + 1;
const formOf  = lv => lv >= 7 ? 3 : lv >= 4 ? 2 : 1;

// ---------- 像素角色图（16×18，box-shadow 渲染） ----------
const PAL = { K:'#1a1a2e', S:'#ffcc99', H:'#4a2c0a', R:'#e23a3a',
              P:'#2b2d42', B:'#6b4f2a', D:'#e8a87c' };
const FORM_TINT = { 1:'#3a86ff', 2:'#2dc653', 3:null }; // 形态3赤裸上身

const SPRITES = {
1: [
"................",
".....KKKKKK.....",
"....KHHHHHHK....",
"....KHHHHHHK....",
"....KSSSSSSK....",
"....KSKSSKSK....",
"....KSSSSSSK....",
"....KSSKKSSK....",
".....KSSSSK.....",
"......KKKK......",
"....KKTTTTKK....",
"...KSKTTTTKSK...",
"...KSKTTTTKSK...",
"...KSKTTTTKSK...",
"....KKTTTTKK....",
".....KPPPPK.....",
".....KPKKPK.....",
"....KBK..KBK...."
],
2: [
"................",
".....KKKKKK.....",
"....KHHHHHHK....",
"....KHHHHHHK....",
"....KSSSSSSK....",
"....KSKSSKSK....",
"....KSSSSSSK....",
"....KSSKKSSK....",
".....KSSSSK.....",
"......KKKK......",
"..KKKTTTTTTKKK..",
".KSSKTTTTTTKSSK.",
".KSKKTTTTTTKKSK.",
".KSK.TTTTTT.KSK.",
".KKK.KTTTTK.KKK.",
"....KPPPPPPK....",
"....KPPKKPPK....",
"....KBK..KBK...."
],
3: [
"................",
".....KKKKKK.....",
"...KRRRRRRRRK...",
"....KHHHHHHK....",
"....KSSSSSSK....",
"....KSKSSKSK....",
"....KSSSSSSK....",
"....KSSKKSSK....",
".....KSSSSK.....",
"..KKKKKKKKKKKK..",
".KSSKSSSSSSKSSK.",
"KSSSKSDSSDSKSSSK",
"KSKKSSDSSDSSKKSK",
"KKK.KSDSSDSK.KKK",
"....KSSSSSSK....",
"....KPPPPPPK....",
"....KPPKKPPK....",
"...KBBK..KBBK..."
]};

// 把像素图编译成 box-shadow 字符串
function spriteShadow(map, px, tint) {
  const shadows = [];
  for (let y = 0; y < map.length; y++)
    for (let x = 0; x < map[y].length; x++) {
      const c = map[y][x];
      if (c === '.') continue;
      const color = c === 'T' ? tint : PAL[c];
      if (color) shadows.push(`${x * px}px ${y * px}px 0 0 ${color}`);
    }
  return shadows.join(',');
}
function renderChar(el, form, px) {
  el.style.width = px + 'px';
  el.style.height = px + 'px';
  el.style.boxShadow = spriteShadow(SPRITES[form], px, FORM_TINT[form]);
}

// ---------- 习惯类型小图标（24×24 纯 CSS 像素） ----------
function typeIcon(type) {
  const d = document.createElement('div');
  d.className = 'habit-icon';
  const styles = {
    strength: 'linear-gradient(#1a1a2e,#1a1a2e) 2px 10px/6px 6px no-repeat,' +
              'linear-gradient(#1a1a2e,#1a1a2e) 16px 10px/6px 6px no-repeat,' +
              'linear-gradient(#808080,#808080) 8px 12px/8px 2px no-repeat',
    endurance:'linear-gradient(#ffd866,#ffd866) 10px 2px/6px 6px no-repeat,' +
              'linear-gradient(#ffd866,#ffd866) 6px 8px/8px 4px no-repeat,' +
              'linear-gradient(#ffd866,#ffd866) 10px 12px/6px 6px no-repeat,' +
              'linear-gradient(#ffd866,#ffd866) 6px 18px/8px 4px no-repeat',
    agility:  'linear-gradient(#7df9ff,#7df9ff) 8px 2px/8px 8px no-repeat,' +
              'linear-gradient(#7df9ff,#7df9ff) 4px 8px/16px 8px no-repeat,' +
              'linear-gradient(#7df9ff,#7df9ff) 8px 16px/8px 6px no-repeat',
    life:     'linear-gradient(#3a86ff,#3a86ff) 8px 4px/8px 8px no-repeat,' +
              'linear-gradient(#3a86ff,#3a86ff) 6px 10px/12px 10px no-repeat'
  };
  d.style.background = styles[type] || styles.life;
  return d;
}

// ---------- 内置数据：食物库 / 任务预设 / 语录 ----------
const FOODS = [
  { name: '鸡胸肉 100g', kcal: 165 }, { name: '米饭 一碗', kcal: 230 },
  { name: '鸡蛋 一个', kcal: 78 },    { name: '西兰花', kcal: 55 },
  { name: '蛋白粉 一勺', kcal: 120 }, { name: '燕麦 一碗', kcal: 150 },
  { name: '香蕉', kcal: 90 },         { name: '牛肉 100g', kcal: 250 },
  { name: '汉堡', kcal: 550 },        { name: '奶茶', kcal: 450 },
  { name: '火锅 一顿', kcal: 800 }
];
const CAL_TARGET = 2000;
const HABIT_PRESETS = [
  { name: '引体向上', type: 'strength' }, { name: '深蹲', type: 'strength' },
  { name: '卷腹', type: 'strength' },     { name: '哑铃弯举', type: 'strength' },
  { name: '游泳', type: 'endurance' },    { name: '骑行', type: 'endurance' },
  { name: 'HIIT燃脂', type: 'agility' },  { name: '平板支撑', type: 'agility' },
  { name: '冥想', type: 'life' },         { name: '早睡', type: 'life' }
];
const TAUNTS = {
  idle: ['弱鸡，今天还不练？', '瘦猴，你女朋友跟人跑了', '你的肌肉正在流失……', '隔壁老王已经练完了', '躺平是练不出肌肉的', '就这？再加一组！'],
  done: ['干得不错，明天继续', '有点样子了，别得意', '这才叫训练', '继续保持，瘦猴'],
  evolved: ['感受这股力量！！', '我变强了！头发还在！']
};

// ---------- 状态 ----------
const LS_KEY = 'fitness_exe_v1';
const todayKey = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let state = load();

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s && s.seeded) {
      // 旧数据迁移：补膳食模块
      if (!s.diet) { s.diet = seedDiet(); localStorage.setItem(LS_KEY, JSON.stringify(s)); }
      return s;
    }
  } catch (e) {}
  return seed();
}
function save() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

// 首次打开注入 12 天历史战绩；角色等级从 Lv1 瘦猴起步（新赛季重练叙事）
function seed() {
  const habits = [
    { id: 'h1', name: '俯卧撑', type: 'strength' },
    { id: 'h2', name: '跑步',   type: 'endurance' },
    { id: 'h3', name: '跳绳',   type: 'agility' },
    { id: 'h4', name: '喝水',   type: 'life' }
  ];
  const logs = {};
  for (let i = 12; i >= 1; i--) {
    const k = todayKey(-i), day = [];
    day.push({ habitId: 'h1', xp: 20, desc: '2组×10次' });          // 力量 240
    if (i % 2 === 0) day.push({ habitId: 'h2', xp: 30, desc: '3公里' }); // 耐力 180
    if (i % 2 === 1) day.push({ habitId: 'h3', xp: 20, desc: '10分钟' }); // 敏捷 120
    if (i % 3 !== 0) day.push({ habitId: 'h4', xp: 5,  desc: '8杯' });   // 生活 50
    logs[k] = day;
  }
  const s = { habits, logs, totalXP: 0,
    attrs: { str: 0, end: 0, agi: 0 },
    diet: seedDiet(),
    muted: false, seeded: true };
  localStorage.setItem(LS_KEY, JSON.stringify(s));
  return s;
}

// 种子膳食：近 6 天三餐记录，让卡路里看板开箱即有内容
function seedDiet() {
  const plan = [
    [['早餐', '燕麦+鸡蛋', 380], ['午餐', '鸡胸肉米饭', 620], ['晚餐', '西兰花牛肉', 580]],
    [['早餐', '全麦面包', 320], ['午餐', '牛肉面', 650], ['加餐', '蛋白粉', 120], ['晚餐', '沙拉', 420]],
    [['早餐', '鸡蛋×2', 156], ['午餐', '鸡腿饭', 720], ['晚餐', '三文鱼', 450]],
    [['早餐', '燕麦', 300], ['午餐', '火锅', 800], ['晚餐', '蔬菜汤', 260]],
    [['早餐', '煎饼果子', 480], ['午餐', '鸡胸肉沙拉', 430], ['加餐', '香蕉', 90], ['晚餐', '牛排', 550]],
    [['早餐', '豆浆油条', 410], ['午餐', '米饭套餐', 700], ['晚餐', '虾仁意面', 520]]
  ];
  const diet = {};
  plan.forEach((meals, i) => {
    diet[todayKey(-(6 - i))] = meals.map(m => ({ meal: m[0], name: m[1], kcal: m[2] }));
  });
  return diet;
}

// ---------- 8-bit 音效（Web Audio 合成，零素材） ----------
let actx = null;
function tone(freq, dur = 0.08, when = 0, type = 'square', vol = 0.12) {
  if (state.muted) return;
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  const t = actx.currentTime + when;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  open:    () => { tone(660); tone(880, 0.08, 0.06); },
  close:   () => { tone(880); tone(660, 0.08, 0.06); },
  checkin: () => { tone(880); tone(1320, 0.1, 0.08); },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.1, i * 0.09)),
  evolve:  () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.12, i * 0.1));
                   tone(98, 0.7, 0, 'sawtooth', 0.06); },
  error:   () => tone(160, 0.15, 0, 'sawtooth')
};

// ---------- 窗口管理 ----------
let zTop = 10;
const taskWins = { 'win-main': 'FITNESS.EXE', 'win-stats': 'BOARD.SYS', 'win-diet': 'KITCHEN.EXE' };

function showWin(id) {
  const w = document.getElementById(id);
  w.dataset.touched = '1';
  w.classList.remove('hidden');
  w.style.zIndex = ++zTop;
  sfx.open();
  buildTaskItems();
}
function hideWin(id) {
  document.getElementById(id).classList.add('hidden');
  sfx.close();
  buildTaskItems();
}
function buildTaskItems() {
  const box = document.getElementById('task-items');
  box.innerHTML = '';
  Object.keys(taskWins).forEach(id => {
    const w = document.getElementById(id);
    if (w.classList.contains('hidden') && !w.dataset.touched) return;
    const b = document.createElement('button');
    b.className = 'task-item' + (!w.classList.contains('hidden') && parseInt(w.style.zIndex) === zTop ? ' active' : '');
    b.textContent = taskWins[id];
    b.onclick = () => w.classList.contains('hidden') ? showWin(id) : hideWin(id);
    box.appendChild(b);
  });
}

// 窗口拖拽
document.querySelectorAll('.window .titlebar').forEach(bar => {
  bar.addEventListener('pointerdown', e => {
    if (e.target.closest('.tb-btn')) return;
    const w = bar.parentElement;
    w.style.zIndex = ++zTop; buildTaskItems();
    const sx = e.clientX - w.offsetLeft, sy = e.clientY - w.offsetTop;
    const move = ev => { w.style.left = (ev.clientX - sx) + 'px'; w.style.top = Math.max(0, ev.clientY - sy) + 'px'; };
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });
});
// 窗口按钮：主窗口关闭=最小化（防演示误关），其余正常关闭
document.querySelectorAll('[data-min]').forEach(b => b.onclick = () => hideWin(b.dataset.min));
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => hideWin(b.dataset.close));
document.querySelectorAll('.window').forEach(w =>
  w.addEventListener('pointerdown', () => { w.style.zIndex = ++zTop; }));

// ---------- 渲染 ----------
const $ = id => document.getElementById(id);

function renderAll() {
  const lv = levelOf(state.totalXP), form = formOf(lv);
  renderChar($('char'), form, 8);
  $('char-tag').textContent = `Lv.${lv} · ${FORM_NAMES[form]}`;
  $('hud-level').textContent = 'LV ' + lv;
  const inLv = state.totalXP % XP_PER_LEVEL;
  $('hud-xp').textContent = `${inLv}/${XP_PER_LEVEL}`;
  $('xp-fill').style.width = inLv + '%';
  const maxAttr = Math.max(state.attrs.str, state.attrs.end, state.attrs.agi, 100);
  ['str', 'end', 'agi'].forEach(a => {
    $('attr-' + a).style.width = Math.round(state.attrs[a] / maxAttr * 100) + '%';
    $('attr-' + a + '-v').textContent = state.attrs[a];
  });
  $('streak-v').textContent = streakDays();
  $('week-v').textContent = weekRate() + '%';
  renderHabits();
  renderStats(form);
}

function renderHabits() {
  const ul = $('habit-list');
  ul.innerHTML = '';
  const today = todayKey();
  const doneIds = (state.logs[today] || []).map(l => l.habitId);
  state.habits.forEach(h => {
    const li = document.createElement('li');
    const done = doneIds.includes(h.id);
    li.className = 'habit-item' + (done ? ' done' : '');
    li.appendChild(typeIcon(h.type));
    const info = document.createElement('div');
    info.className = 'habit-info';
    info.innerHTML = `<div class="habit-name">${h.name}</div>
      <div class="habit-meta">${TYPES[h.type].label}系 · 连续 <span class="px">${habitStreak(h.id)}</span> 天</div>`;
    li.appendChild(info);
    const btn = document.createElement('button');
    btn.className = 'btn95';
    btn.textContent = done ? '✓ 已完成' : '打卡';
    btn.disabled = done;
    btn.onclick = () => openLog(h);
    li.appendChild(btn);
    const del = document.createElement('button');
    del.className = 'habit-del'; del.textContent = '×'; del.title = '删除任务';
    del.onclick = () => { state.habits = state.habits.filter(x => x.id !== h.id); save(); renderAll(); };
    li.appendChild(del);
    ul.appendChild(li);
  });
}

function renderStats(curForm) {
  // 近 7 天 XP 柱状图
  const chart = $('week-chart');
  chart.innerHTML = '';
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const k = todayKey(-i);
    const xp = (state.logs[k] || []).reduce((s, l) => s + l.xp, 0);
    days.push({ k, xp, label: names[new Date(k + 'T00:00:00').getDay()] });
  }
  const max = Math.max(...days.map(d => d.xp), 1);
  days.forEach((d, i) => {
    const col = document.createElement('div');
    col.className = 'wcol';
    col.innerHTML = `<div class="wbar ${i === 6 ? 'today' : ''}" style="height:${Math.round(d.xp / max * 100)}%"></div>
                     <div class="wday">${d.label}</div>`;
    chart.appendChild(col);
  });
  renderRadar();
  renderCalChart();
  renderHeatmap();
  // 进化图鉴
  [1, 2, 3].forEach(f => {
    const item = document.querySelector(`.codex-item[data-form="${f}"]`);
    item.classList.toggle('locked', f > curForm);
    item.classList.toggle('current', f === curForm);
    const box = $('codex-' + f);
    box.innerHTML = '<div></div>';
    renderChar(box.firstChild, f, 4);
  });
}

// 属性雷达图（canvas，关闭平滑保持像素感）
function renderRadar() {
  const c = $('radar'), ctx = c.getContext('2d');
  const cx = c.width / 2, cy = c.height / 2, R = 58;
  ctx.clearRect(0, 0, c.width, c.height);
  const maxAttr = Math.max(state.attrs.str, state.attrs.end, state.attrs.agi, 100);
  const vals = [state.attrs.str, state.attrs.end, state.attrs.agi].map(v => v / maxAttr);
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / 3;
  // 网格三角 + 轴线
  ctx.strokeStyle = '#3c3c8c'; ctx.lineWidth = 1;
  for (let ring = 1; ring <= 3; ring++) {
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = ang(i % 3), r = R * ring / 3;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 3; i++) { ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang(i)) * R, cy + Math.sin(ang(i)) * R); }
  ctx.stroke();
  // 属性多边形
  ctx.beginPath();
  vals.forEach((v, i) => {
    const x = cx + Math.cos(ang(i)) * R * v, y = cy + Math.sin(ang(i)) * R * v;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,216,102,.45)'; ctx.fill();
  ctx.strokeStyle = '#ffd866'; ctx.lineWidth = 3; ctx.stroke();
  // 标签与数值
  const labels = [['力', state.attrs.str], ['耐', state.attrs.end], ['敏', state.attrs.agi]];
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  labels.forEach((lb, i) => {
    const a = ang(i), lx = cx + Math.cos(a) * (R + 16), ly = cy + Math.sin(a) * (R + 16) + 4;
    ctx.fillStyle = '#7df9ff'; ctx.fillText(lb[0], lx, ly);
    ctx.fillStyle = '#ffd866'; ctx.font = '10px sans-serif'; ctx.fillText(lb[1], lx, ly + 12);
    ctx.font = 'bold 13px sans-serif';
  });
}

// 近 7 天卡路里柱图 + 目标线
function renderCalChart() {
  const box = $('cal-chart');
  box.innerHTML = '';
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const k = todayKey(-i);
    const kcal = (state.diet[k] || []).reduce((s, m) => s + m.kcal, 0);
    days.push({ k, kcal, label: names[new Date(k + 'T00:00:00').getDay()] });
  }
  const scale = Math.max(...days.map(d => d.kcal), CAL_TARGET) * 1.1;
  days.forEach((d, i) => {
    const col = document.createElement('div');
    col.className = 'wcol';
    col.title = `${d.kcal} kcal`;
    col.innerHTML = `<div class="wbar cal" style="height:${Math.round(d.kcal / scale * 100)}%"></div>
                     <div class="wday">${d.label}</div>`;
    box.appendChild(col);
  });
  const line = document.createElement('div');
  line.className = 'cal-target';
  line.style.bottom = `calc(${Math.round(CAL_TARGET / scale * 100)}% + 14px)`;
  box.appendChild(line);
}

// 近 28 天打卡热力图
function renderHeatmap() {
  const box = $('heatmap');
  box.innerHTML = '';
  const xps = [];
  for (let i = 27; i >= 0; i--)
    xps.push((state.logs[todayKey(-i)] || []).reduce((s, l) => s + l.xp, 0));
  const max = Math.max(...xps, 1);
  xps.forEach((xp, idx) => {
    const cell = document.createElement('div');
    const lv = xp === 0 ? 0 : Math.min(3, 1 + Math.floor(xp / max * 2.9));
    cell.className = 'hm-cell' + (lv ? ' hm-' + lv : '') + (idx === 27 ? ' today' : '');
    cell.title = `${todayKey(idx - 27)} · ${xp} XP`;
    box.appendChild(cell);
  });
}

// ---------- 膳食模块 ----------
function renderDiet() {
  const k = todayKey();
  const meals = state.diet[k] || [];
  const total = meals.reduce((s, m) => s + m.kcal, 0);
  const fill = $('cal-fill');
  fill.style.width = Math.min(total / CAL_TARGET * 100, 100) + '%';
  fill.classList.toggle('over', total > CAL_TARGET);
  $('cal-text').textContent = `${total}/${CAL_TARGET}`;
  const ul = $('meal-list');
  ul.innerHTML = '';
  meals.forEach((m, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>[${m.meal}] ${m.name}</span><span><span class="m-kcal">${m.kcal}kcal</span> </span>`;
    const del = document.createElement('button');
    del.className = 'm-del'; del.textContent = '×';
    del.onclick = () => { meals.splice(i, 1); save(); renderDiet(); };
    li.lastChild.appendChild(del);
    ul.appendChild(li);
  });
}
function initDiet() {
  const sel = $('diet-preset');
  FOODS.forEach((f, i) => {
    const o = document.createElement('option');
    o.value = i; o.textContent = `${f.name}（${f.kcal}）`;
    sel.appendChild(o);
  });
  sel.onchange = () => {
    if (sel.value === '') return;
    $('diet-name').value = FOODS[sel.value].name;
    $('diet-kcal').value = FOODS[sel.value].kcal;
  };
  $('diet-ok').onclick = () => {
    const name = $('diet-name').value.trim();
    const kcal = parseInt($('diet-kcal').value) || 0;
    if (!name || kcal <= 0) { sfx.error(); return; }
    const k = todayKey();
    (state.diet[k] = state.diet[k] || []).push({ meal: $('diet-meal').value, name, kcal });
    state.totalXP += 2; // 记录行为本身给小额经验
    save();
    $('diet-name').value = ''; $('diet-kcal').value = ''; $('diet-preset').value = '';
    floatXP('+2 XP'); sfx.checkin();
    renderDiet(); renderAll();
  };
}

// ---------- 语录系统 ----------
let speakTimer = null, speakIv = null;
function speak(text) {
  const b = $('speech');
  b.classList.remove('hidden');
  b.textContent = '';
  clearTimeout(speakTimer); clearInterval(speakIv);
  let i = 0;
  speakIv = setInterval(() => {
    b.textContent = text.slice(0, ++i);
    if (i % 2 === 0) tone(1200, 0.02, 0, 'square', 0.04);
    if (i >= text.length) {
      clearInterval(speakIv);
      speakTimer = setTimeout(() => b.classList.add('hidden'), 2600);
    }
  }, 45);
}
function initCharTalk() {
  $('char-wrap').addEventListener('click', () => {
    const wrap = $('char-wrap');
    wrap.classList.remove('jump'); void wrap.offsetWidth; wrap.classList.add('jump');
    const today = todayKey();
    const todayLogs = state.logs[today] || [];
    const allDone = state.habits.length > 0 &&
      state.habits.every(h => todayLogs.some(l => l.habitId === h.id));
    const pool = allDone ? TAUNTS.done : TAUNTS.idle;
    speak(pool[Math.floor(Math.random() * pool.length)]);
  });
}

// ---------- 统计计算 ----------
function streakDays() {
  let n = 0;
  for (let i = 0; i < 365; i++) {
    const k = todayKey(-i);
    if (state.logs[k] && state.logs[k].length) n++;
    else if (i > 0) break; // 今天没打卡不算断签（演示友好）
    else continue;
  }
  return n;
}
function habitStreak(hid) {
  let n = 0;
  for (let i = 0; i < 365; i++) {
    const logs = state.logs[todayKey(-i)] || [];
    if (logs.some(l => l.habitId === hid)) n++;
    else if (i > 0) break;
  }
  return n;
}
function weekRate() {
  let n = 0;
  for (let i = 0; i < 7; i++)
    if ((state.logs[todayKey(-i)] || []).length) n++;
  return Math.round(n / 7 * 100);
}

// ---------- 录入流程 ----------
let logTarget = null;
function openLog(habit) {
  logTarget = habit;
  const t = TYPES[habit.type];
  $('log-title').textContent = '录入 · ' + habit.name;
  const box = $('log-fields');
  box.innerHTML = '';
  const labelMap = { sets: '组数', reps: '每组次数', weight: '负重 kg（可空）', km: '公里数', mins: '分钟数' };
  const defMap = { sets: 3, reps: 10, weight: '', km: 3, mins: 10 };
  const row = document.createElement('div');
  row.className = 'fld-row';
  t.fields.forEach(f => {
    row.innerHTML += `<label class="fld"><span>${labelMap[f]}</span>
      <input type="number" min="0" step="any" id="lf-${f}" value="${defMap[f]}"></label>`;
  });
  box.appendChild(row);
  box.innerHTML += `<div class="log-hint">${t.hint}</div>`;
  showWin('win-log');
}

$('log-ok').onclick = () => {
  const h = logTarget, t = TYPES[h.type];
  const data = {};
  t.fields.forEach(f => data[f] = parseFloat($('lf-' + f).value) || 0);
  if (t.fields.length && !t.fields.some(f => f !== 'weight' && data[f] > 0)) { sfx.error(); return; }
  const xp = t.xp(data);
  const desc = t.fields.filter(f => data[f]).map(f => `${data[f]}${{ sets: '组', reps: '次', weight: 'kg', km: '公里', mins: '分钟' }[f]}`).join('×');

  hideWin('win-log');
  // 写入数据
  const k = todayKey();
  (state.logs[k] = state.logs[k] || []).push({ habitId: h.id, xp, desc });
  const oldLv = levelOf(state.totalXP), oldForm = formOf(oldLv);
  state.totalXP += xp;
  if (t.attr) state.attrs[t.attr] += xp;
  const newLv = levelOf(state.totalXP), newForm = formOf(newLv);
  save();

  // 反馈：飘字 → 刷新 → 升级 / 进化
  floatXP('+' + xp + ' XP');
  sfx.checkin();
  renderAll();
  if (newForm > oldForm) setTimeout(() => evolveTo(newForm, newLv), 500);
  else if (newLv > oldLv) setTimeout(() => levelUpFx(newLv), 400);
};

function floatXP(text) {
  const f = document.createElement('div');
  f.className = 'xp-float';
  f.textContent = text;
  $('fx-layer').appendChild(f);
  setTimeout(() => f.remove(), 1300);
}

// ---------- 升级 / 进化序列 ----------
function banner(main, sub, hold = 2000) {
  $('banner-text').textContent = main;
  $('banner-sub').textContent = sub;
  $('banner').classList.remove('hidden');
  setTimeout(() => $('banner').classList.add('hidden'), hold);
}
function spawnParticles() {
  const layer = $('fx-layer');
  const colors = ['#ffd866', '#7dff6a', '#7df9ff', '#ff5a5a', '#fff'];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', (Math.random() * 220 - 110) + 'px');
    p.style.setProperty('--dy', (Math.random() * -160 - 20) + 'px');
    layer.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}
function levelUpFx(lv) {
  sfx.levelup();
  spawnParticles();
  banner('LEVEL UP!', 'Lv.' + lv);
}
function evolveTo(form, lv) {
  const wrap = $('char-wrap');
  $('flash').classList.add('on');
  sfx.evolve();
  wrap.classList.remove('settle');
  wrap.classList.add('evolving');
  setTimeout(spawnParticles, 750);
  setTimeout(() => { renderChar($('char'), form, 8); spawnParticles(); }, 900); // 高光中切换形态
  setTimeout(() => {
    wrap.classList.remove('evolving');
    wrap.classList.add('settle');
    $('flash').classList.remove('on');
    banner('LEVEL UP!', `形态进化 · ${FORM_NAMES[form]}！`, 2600);
    sfx.levelup();
    renderAll();
    setTimeout(() => speak(TAUNTS.evolved[Math.floor(Math.random() * TAUNTS.evolved.length)]), 600);
  }, 1300);
  setTimeout(() => wrap.classList.remove('settle'), 1800);
}

// ---------- 添加习惯 ----------
const addPreset = $('add-preset');
HABIT_PRESETS.forEach((p, i) => {
  const o = document.createElement('option');
  o.value = i; o.textContent = `${p.name}（${TYPES[p.type].label}）`;
  addPreset.appendChild(o);
});
addPreset.onchange = () => {
  if (addPreset.value === '') return;
  const p = HABIT_PRESETS[addPreset.value];
  $('add-name').value = p.name;
  $('add-type').value = p.type;
};
$('btn-add-habit').onclick = () => showWin('win-add');
$('add-ok').onclick = () => {
  const name = $('add-name').value.trim();
  if (!name) { sfx.error(); return; }
  state.habits.push({ id: 'h' + Date.now(), name, type: $('add-type').value });
  $('add-name').value = ''; addPreset.value = '';
  save(); hideWin('win-add'); renderAll();
};
$('btn-stats').onclick = () => showWin('win-stats');
$('btn-diet').onclick = () => { showWin('win-diet'); renderDiet(); };

// ---------- 重置 ----------
$('reset-btn').onclick = () => showWin('win-reset');
$('reset-ok').onclick = () => { localStorage.removeItem(LS_KEY); location.reload(); };

// ---------- 桌面杂项 ----------
$('icon-about').ondblclick = () => showWin('win-about');
$('icon-about').onclick = () => showWin('win-about');
$('icon-trash').onclick = () => { sfx.error(); banner('回收站', '里面空空如也', 1200); };
$('start-btn').onclick = () => showWin('win-about');
$('mute-btn').onclick = () => {
  state.muted = !state.muted; save();
  $('mute-btn').classList.toggle('off', state.muted);
  if (!state.muted) sfx.checkin();
};
setInterval(() => {
  const d = new Date();
  $('clock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}, 1000);

// ---------- 启动 ----------
$('mute-btn').classList.toggle('off', state.muted);
$('win-main').dataset.touched = '1';
initDiet();
initCharTalk();
renderAll();
buildTaskItems();
