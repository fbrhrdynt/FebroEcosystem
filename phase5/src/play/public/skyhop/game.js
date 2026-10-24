(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;
  const $ = (id) => document.getElementById(id);
  const ui = {
    overlay: $('overlay'), heading: $('overlayHeading'), eyebrow: $('overlayEyebrow'),
    description: $('overlayText'), picker: $('levelPicker'), primary: $('primaryButton'),
    secondary: $('secondaryButton'), pause: $('pauseButton'),
    lives: $('hearts'), coins: $('coinCount'), number: $('levelNumber'),
    world: $('worldLabel'), progress: $('progressText'), sound: $('soundButton'), soundLabel: $('soundLabel')
  };

  const H = 270;
  const GRAVITY = 585;
  const RUN_SPEED = 132;
  const JUMP_VELOCITY = -241;
  const STAGES = [
    {
      name: 'THE FIRST LEAP', label: 'MEADOW ISLES',
      sky: ['#8fcafb', '#c9eafc', '#e8faff'], island: '#8f6948',
      segments: [[0, 225, 221], [270, 470, 208], [514, 699, 222], [740, 930, 200], [975, 1159, 215], [1205, 1390, 195], [1436, 1625, 220], [1669, 1900, 207]],
      enemySegments: [2, 4, 6]
    },
    {
      name: 'ABOVE THE CLOUDS', label: 'SKYLINE',
      sky: ['#85bbe9', '#b2ddf1', '#e2f7f9'], island: '#866952',
      segments: [[0, 210, 220], [266, 436, 203], [497, 655, 224], [721, 882, 190], [943, 1113, 210], [1180, 1339, 223], [1403, 1586, 193], [1650, 1841, 211], [1900, 2100, 200]],
      enemySegments: [1, 3, 5, 7]
    },
    {
      name: 'THE FINAL FLAG', label: 'CASTLE RUN',
      sky: ['#a39fdb', '#d1bbec', '#eee0fa'], island: '#786077',
      segments: [[0, 200, 220], [267, 417, 207], [485, 638, 188], [701, 857, 217], [923, 1079, 190], [1145, 1300, 215], [1364, 1520, 190], [1586, 1742, 219], [1803, 1968, 190], [2030, 2250, 205]],
      enemySegments: [1, 3, 4, 6, 8]
    }
  ];

  const storageKey = 'skyhop-progress-1';
  let saved = { unlocked: 1, bestCoins: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (raw && Number.isFinite(raw.unlocked) && Number.isFinite(raw.bestCoins)) {
      saved = { unlocked: Math.max(1, Math.min(3, Math.floor(raw.unlocked))), bestCoins: Math.max(0, Math.floor(raw.bestCoins)) };
    }
  } catch (_) { /* Game also works in restricted private browsing. */ }
  const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch (_) {} };

  let levelIndex = 0;
  let selectedIndex = 0;
  let mode = 'menu';
  let world = null;
  let hero = null;
  let cameraX = 0;
  let viewportW = 480;
  let renderScale = 1;
  let elapsed = 0;
  let lastFrame = 0;
  let particles = [];
  let score = 0;
  let stageEntryScore = 0;
  let onlineRound = null;
  let soundEnabled = false;
  let audioContext = null;
  const controls = { left: false, right: false, jump: false };
  let jumpQueued = false;
  const pointerControls = new Map();

  function createWorld(index) {
    const stage = STAGES[index];
    const platforms = stage.segments.map(([x, end, y], i) => ({ x, end, y, i }));
    const coins = [];
    platforms.forEach((p, i) => {
      if (i > 0) {
        coins.push({ x: p.x + 35, y: p.y - 28, picked: false });
        coins.push({ x: (p.x + p.end) / 2, y: p.y - 35, picked: false });
      }
      if (i < platforms.length - 1) {
        const next = platforms[i + 1];
        coins.push({ x: p.end + (next.x - p.end) / 2, y: Math.min(p.y, next.y) - 37, picked: false });
      }
    });
    const enemies = stage.enemySegments.map((platformIndex, i) => {
      const p = platforms[platformIndex];
      return { anchor: (p.x + p.end) / 2, x: (p.x + p.end) / 2, y: p.y - 14, timeOffset: i * 1.71, distance: Math.min(44, (p.end - p.x) / 2 - 25), dead: false, w: 17, h: 14 };
    });
    return { stage, platforms, coins, enemies, endX: platforms[platforms.length - 1].end - 35 };
  }

  function resetHero() {
    const p = world.platforms[0];
    hero = { x: 37, y: p.y - 24, w: 16, h: 24, vx: 0, vy: 0, onGround: true, coyote: .11, hp: 3, facing: 1, invulnerability: 0, step: 0, safeX: 37, safeY: p.y - 24 };
  }

  function resetLevel(index, fresh = true) {
    levelIndex = index;
    world = createWorld(index);
    resetHero();
    if (fresh) score = 0;
    stageEntryScore = score;
    cameraX = 0;
    elapsed = 0;
    particles = [];
    clearInput();
    updateHud();
  }

  function updateHud() {
    ui.lives.textContent = '♥ '.repeat(hero.hp).trim() + (hero.hp < 3 ? ' ♡'.repeat(3 - hero.hp) : '');
    ui.lives.setAttribute('aria-label', `${hero.hp} dari 3 nyawa tersisa`);
    ui.coins.textContent = String(score).padStart(2, '0');
    ui.number.textContent = String(levelIndex + 1).padStart(2, '0');
    ui.world.textContent = world.stage.name;
    ui.progress.textContent = `${saved.unlocked} dari 3 dunia terbuka. Rekor koin: ${saved.bestCoins}. Progres tersimpan di browser ini.`;
  }

  function refreshPicker() {
    Array.from(ui.picker.querySelectorAll('button[data-level]')).forEach((button) => {
      const index = Number(button.dataset.level);
      const locked = index >= saved.unlocked;
      button.disabled = locked;
      button.classList.toggle('selected', index === selectedIndex);
      button.setAttribute('aria-label', locked ? `World ${index + 1} terkunci` : `Pilih world ${index + 1}`);
      button.title = locked ? 'Selesaikan dunia sebelumnya untuk membuka' : STAGES[index].name;
    });
  }

  const overlays = {
    menu: {
      eyebrow: 'WELCOME TO THE SKY!', title: 'READY TO <span>HOP?</span>',
      description: 'Tiga dunia penuh pulau terapung, koin, dan monster lucu. Sampai mana petualanganmu?',
      primary: '▶ PLAY NOW', secondary: null, picker: true
    },
    paused: {
      eyebrow: 'TAKE YOUR TIME', title: 'GAME <span>PAUSED</span>',
      description: 'Petualanganmu menunggu. Siap lanjut melompat?',
      primary: '▶ RESUME', secondary: '↻ RESTART', picker: false
    },
    lost: {
      eyebrow: 'DON’T GIVE UP!', title: 'TRY <span>AGAIN!</span>',
      description: 'Nyawamu habis. Kumpulkan keberanian dan coba sekali lagi!',
      primary: '↻ RETRY WORLD', secondary: '⌂ MENU', picker: false
    },
    win: {
      eyebrow: 'WORLD CLEARED!', title: 'NICE <span>JUMP!</span>',
      description: 'Berhasil mencapai bendera! Pulau berikutnya sudah menunggu.',
      primary: '▶ NEXT WORLD', secondary: '⌂ MENU', picker: false
    },
    complete: {
      eyebrow: 'YOU DID IT!', title: 'SKY <span>CHAMPION!</span>',
      description: 'Semua dunia berhasil ditaklukkan. Main lagi untuk menambah rekor koinmu!',
      primary: '↻ PLAY AGAIN', secondary: '⌂ MENU', picker: false
    }
  };

  function showOverlay(nextMode) {
    mode = nextMode;
    const data = overlays[nextMode];
    ui.eyebrow.textContent = data.eyebrow;
    ui.heading.innerHTML = data.title;
    ui.description.textContent = data.description;
    ui.primary.textContent = data.primary;
    ui.secondary.hidden = !data.secondary;
    if (data.secondary) ui.secondary.textContent = data.secondary;
    ui.picker.hidden = !data.picker;
    if (data.picker) refreshPicker();
    ui.overlay.hidden = false;
    ui.pause.textContent = 'Ⅱ';
    clearInput();
    ui.primary.focus({ preventScroll: true });
  }

  function play() {
    mode = 'playing';
    ui.overlay.hidden = true;
    ui.pause.textContent = 'Ⅱ';
    lastFrame = performance.now();
  }

  function start(index, fresh = true) {
    resetLevel(index, fresh);
    onlineRound = window.ArcadeScores?.begin('skyhop', `world-${index + 1}`) || null;
    play();
    beep('start');
  }

  function primaryAction() {
    if (mode === 'menu') start(selectedIndex, true);
    else if (mode === 'paused') play();
    else if (mode === 'lost') start(levelIndex, true);
    else if (mode === 'win') start(levelIndex + 1, false);
    else if (mode === 'complete') start(0, true);
  }

  function secondaryAction() {
    if (mode === 'paused') start(levelIndex, true);
    else { selectedIndex = Math.min(levelIndex, saved.unlocked - 1); showOverlay('menu'); }
  }

  function togglePause() {
    if (mode === 'playing') showOverlay('paused');
    else if (mode === 'paused') play();
  }

  function clearInput() {
    controls.left = false; controls.right = false; controls.jump = false;
    jumpQueued = false;
    pointerControls.clear();
    for (const id of ['leftButton', 'rightButton', 'jumpButton']) $(id).classList.remove('active');
  }

  function inputDown(key) {
    if (key === 'jump' && !controls.jump) jumpQueued = true;
    controls[key] = true;
  }
  function inputUp(key) { controls[key] = false; }

  const keyMapping = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump'
  };
  window.addEventListener('keydown', (event) => {
    if (keyMapping[event.code]) {
      if (event.target instanceof HTMLButtonElement && event.code === 'Space') return;
      event.preventDefault();
      if (mode === 'playing') inputDown(keyMapping[event.code]);
    } else if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault(); togglePause();
    } else if (event.code === 'Enter' && mode === 'menu' && event.target === document.body) {
      primaryAction();
    }
  });
  window.addEventListener('keyup', (event) => { if (keyMapping[event.code]) inputUp(keyMapping[event.code]); });
  window.addEventListener('blur', () => { if (mode === 'playing') showOverlay('paused'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') showOverlay('paused'); });

  function bindTouch(buttonId, control) {
    const button = $(buttonId);
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (mode !== 'playing') return;
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
      pointerControls.set(event.pointerId, control);
      button.classList.add('active');
      inputDown(control);
    });
    function release(event) {
      if (pointerControls.get(event.pointerId) !== control) return;
      pointerControls.delete(event.pointerId);
      button.classList.remove('active');
      inputUp(control);
    }
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
  }
  bindTouch('leftButton', 'left');
  bindTouch('rightButton', 'right');
  bindTouch('jumpButton', 'jump');

  ui.primary.addEventListener('click', primaryAction);
  ui.secondary.addEventListener('click', secondaryAction);
  ui.pause.addEventListener('click', togglePause);
  $('restartButton').addEventListener('click', () => start(levelIndex, true));
  ui.picker.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-level]');
    if (!button || button.disabled) return;
    selectedIndex = Number(button.dataset.level);
    refreshPicker();
    beep('select');
  });
  ui.sound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    ui.soundLabel.textContent = soundEnabled ? 'ON' : 'OFF';
    ui.sound.setAttribute('aria-pressed', String(soundEnabled));
    ui.sound.setAttribute('aria-label', soundEnabled ? 'Matikan efek suara' : 'Aktifkan efek suara');
    ui.sound.title = soundEnabled ? 'Suara aktif' : 'Suara mati';
    beep('select');
  });

  function beep(type) {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      audioContext ||= new AudioCtx();
      if (audioContext.state === 'suspended') audioContext.resume();
      const configs = {
        coin: [850, 1130, .11], jump: [330, 500, .10], hurt: [280, 105, .22],
        win: [600, 980, .28], start: [430, 670, .13], select: [500, 590, .08], stomp: [240, 390, .12]
      };
      const [begin, end, duration] = configs[type] || configs.select;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(begin, audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(end, audioContext.currentTime + duration);
      gain.gain.setValueAtTime(.04, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      osc.connect(gain); gain.connect(audioContext.destination);
      osc.start(); osc.stop(audioContext.currentTime + duration + .01);
    } catch (_) { /* Missing audio permissions do not break gameplay. */ }
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const rand = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  function createBurst(x, y, color = '#ffe36c') {
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const velocity = 30 + rand(x + i) * 38;
      particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 15, age: 0, life: .35 + rand(y + i) * .24, color });
    }
  }

  function takeDamage() {
    if (hero.invulnerability > 0) return;
    hero.hp--;
    hero.invulnerability = 1.15;
    hero.vy = -145;
    hero.vx = hero.facing * -105;
    createBurst(hero.x + 8, hero.y + 10, '#ff6e82');
    beep('hurt');
    updateHud();
    if (hero.hp <= 0) {
      showOverlay('lost');
    }
  }

  function update(dt) {
    elapsed += dt;
    hero.invulnerability = Math.max(0, hero.invulnerability - dt);
    const direction = Number(controls.right) - Number(controls.left);
    hero.vx = direction * RUN_SPEED;
    if (direction) hero.facing = direction;
    if (hero.onGround) hero.coyote = .11;
    else hero.coyote = Math.max(0, hero.coyote - dt);

    if (jumpQueued && hero.coyote > 0) {
      hero.vy = JUMP_VELOCITY;
      hero.onGround = false;
      hero.coyote = 0;
      jumpQueued = false;
      beep('jump');
      createBurst(hero.x + 8, hero.y + hero.h, '#eaf6ff');
    }
    if (!controls.jump && hero.vy < -110) hero.vy += GRAVITY * dt * .65;

    const lastBottom = hero.y + hero.h;
    hero.x = clamp(hero.x + hero.vx * dt, 0, world.endX + 40);
    hero.vy = Math.min(hero.vy + GRAVITY * dt, 350);
    hero.y += hero.vy * dt;
    hero.onGround = false;

    if (hero.vy >= 0) {
      for (const platform of world.platforms) {
        if (hero.x + hero.w > platform.x + 2 && hero.x < platform.end - 2 &&
            lastBottom <= platform.y + 6 && hero.y + hero.h >= platform.y) {
          hero.y = platform.y - hero.h;
          hero.vy = 0;
          hero.onGround = true;
          hero.safeX = hero.x;
          hero.safeY = hero.y;
          break;
        }
      }
    }
    hero.step += (hero.onGround && direction ? dt * 15 : 0);

    for (const coin of world.coins) {
      if (coin.picked) continue;
      const dx = hero.x + hero.w / 2 - coin.x;
      const dy = hero.y + hero.h / 2 - coin.y;
      if (dx * dx + dy * dy < 17 * 17) {
        coin.picked = true;
        score++;
        createBurst(coin.x, coin.y);
        beep('coin');
        updateHud();
      }
    }

    for (const enemy of world.enemies) {
      if (enemy.dead) continue;
      enemy.x = enemy.anchor + Math.sin(elapsed * 1.6 + enemy.timeOffset) * enemy.distance;
      const hitbox = { x: enemy.x - 9, y: enemy.y, w: 18, h: 14 };
      if (overlaps(hero, hitbox)) {
        if (hero.vy > 45 && lastBottom < enemy.y + 9) {
          enemy.dead = true;
          hero.vy = -181;
          score += 3;
          createBurst(enemy.x, enemy.y + 5, '#bd87e3');
          updateHud();
          beep('stomp');
        } else takeDamage();
      }
    }

    if (hero.y > H + 56) {
      takeDamage();
      if (mode !== 'playing') return;
      hero.x = clamp(hero.safeX, 25, world.endX - 25);
      hero.y = hero.safeY - 10;
      hero.vx = 0;
      hero.vy = 0;
      hero.onGround = false;
    }

    if (hero.x + hero.w > world.endX && hero.onGround) {
      const stageCoins = score - stageEntryScore;
      if (stageCoins > 0) window.ArcadeScores?.end(onlineRound, stageCoins);
      saved.bestCoins = Math.max(saved.bestCoins, score);
      saved.unlocked = Math.min(3, Math.max(saved.unlocked, levelIndex + 2));
      persist();
      updateHud();
      beep('win');
      showOverlay(levelIndex === STAGES.length - 1 ? 'complete' : 'win');
    }

    const maxCam = Math.max(0, world.stage.segments[world.stage.segments.length - 1][1] + 45 - viewportW);
    const targetCam = clamp(hero.x - viewportW * .37, 0, maxCam);
    cameraX += (targetCam - cameraX) * Math.min(1, dt * 7);
    particles = particles.filter((particle) => particle.age < particle.life);
    for (const particle of particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 100 * dt;
    }
  }

  function rect(x, y, w, h, color) {
    context.fillStyle = color;
    context.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
  }

  function cloud(x, y, size = 1, alpha = 1) {
    context.globalAlpha = alpha;
    rect(x + 12 * size, y, 23 * size, 10 * size, '#ffffff');
    rect(x + 4 * size, y + 8 * size, 48 * size, 12 * size, '#ffffff');
    rect(x, y + 15 * size, 59 * size, 8 * size, '#ffffff');
    rect(x + 9 * size, y + 23 * size, 39 * size, 5 * size, '#daeefa');
    context.globalAlpha = 1;
  }

  function farIsland(x, y, size, index) {
    const w = 36 * size;
    rect(x + 7 * size, y + 7 * size, w - 14 * size, 9 * size, '#7d9ba2');
    rect(x + 12 * size, y + 16 * size, w - 24 * size, 8 * size, '#5e7994');
    rect(x + 17 * size, y + 24 * size, w - 34 * size, 5 * size, '#596b90');
    rect(x + 4 * size, y, w - 8 * size, 6 * size, '#77d781');
    rect(x + 8 * size, y - 5 * size, w - 16 * size, 5 * size, '#a7e48c');
    if (index % 3 === 0) {
      rect(x + 18 * size, y - 14 * size, 4 * size, 11 * size, '#72514a');
      rect(x + 9 * size, y - 19 * size, 24 * size, 10 * size, '#4a9f81');
      rect(x + 14 * size, y - 25 * size, 14 * size, 8 * size, '#67bc83');
    }
  }

  function castle(x, y, size = 1) {
    const wall = '#b7a0cb', edge = '#62577e', roof = '#5c70bc';
    rect(x + 24 * size, y + 32 * size, 74 * size, 53 * size, edge);
    rect(x + 27 * size, y + 35 * size, 68 * size, 48 * size, wall);
    for (const tower of [10, 45, 91]) {
      rect(x + tower * size, y + 16 * size, 19 * size, 68 * size, edge);
      rect(x + (tower + 3) * size, y + 18 * size, 13 * size, 64 * size, '#d4c2df');
      rect(x + (tower - 3) * size, y + 15 * size, 25 * size, 7 * size, roof);
      rect(x + (tower + 1) * size, y + 8 * size, 17 * size, 7 * size, roof);
      rect(x + (tower + 7) * size, y + 1 * size, 5 * size, 8 * size, '#40568e');
      rect(x + (tower + 7) * size, y + 30 * size, 5 * size, 12 * size, edge);
    }
    rect(x + 55 * size, y + 62 * size, 16 * size, 22 * size, '#4d446f');
    rect(x + 61 * size, y - 9 * size, 2 * size, 20 * size, '#685c7f');
    rect(x + 63 * size, y - 8 * size, 14 * size, 8 * size, '#ef9673');
  }

  function drawBackground() {
    const stage = world.stage;
    rect(0, 0, viewportW, H, stage.sky[0]);
    rect(0, 90, viewportW, H - 90, stage.sky[1]);
    rect(0, 190, viewportW, H - 190, stage.sky[2]);
    rect(viewportW - 68, 33, 30, 30, levelIndex === 2 ? '#fcf1ce' : '#fff6c2');
    rect(viewportW - 74, 40, 42, 16, levelIndex === 2 ? '#fcf1ce' : '#fff6c2');
    for (let i = 0; i < 24; i++) {
      const x = i * 129 + 35 - cameraX * .16 - 70;
      if (x < -120 || x > viewportW + 130) continue;
      cloud(x, 32 + rand(i * 2) * 91, .55 + rand(i * 3) * .48, .85);
    }
    for (let i = 0; i < 20; i++) {
      const x = i * 168 + rand(i + 12) * 48 - cameraX * .31;
      if (x < -100 || x > viewportW + 100) continue;
      farIsland(x, 130 + rand(i + 2) * 72, .8 + rand(i + 6) * .55, i);
    }
    const castleX = 350 - cameraX * .24;
    if (castleX > -175 && castleX < viewportW + 45) castle(castleX, 59, 1);
    for (let i = 0; i < 10; i++) {
      const x = i * 270 + 100 - cameraX * .46;
      if (x < -120 || x > viewportW + 40) continue;
      cloud(x, 195 + rand(i * 7 + 5) * 42, 1.2, .64);
    }
  }

  function drawTree(x, groundY, height = 33) {
    rect(x + 7, groundY - height + 12, 7, height - 12, '#4a3740');
    rect(x + 9, groundY - height + 12, 4, height - 13, '#9a613f');
    rect(x + 1, groundY - height + 9, 24, 11, '#2a6658');
    rect(x - 5, groundY - height + 14, 13, 12, '#317c62');
    rect(x + 15, groundY - height + 13, 14, 12, '#2c8564');
    rect(x + 2, groundY - height, 21, 17, '#348f66');
    rect(x + 7, groundY - height - 6, 12, 13, '#4bae75');
    rect(x + 4, groundY - height + 1, 6, 5, '#84d78b');
    rect(x + 18, groundY - height + 8, 5, 4, '#8bdd85');
  }

  function drawPlatform(p) {
    const width = p.end - p.x;
    const y = p.y;
    rect(p.x, y + 4, width, 24, '#29263f');
    rect(p.x + 3, y + 7, width - 6, 31, world.stage.island);
    for (let x = p.x; x < p.end - 10; x += 16) {
      const delta = (Math.floor((x - p.x) / 16) % 3) * 5;
      rect(x + 3, y + 31, Math.min(13, p.end - x - 4), 11 + delta, '#4c4b69');
      rect(x + 4, y + 37 + delta, 8, 6, '#7a6480');
      if (Math.floor((x - p.x) / 16) % 2 === 0) {
        rect(x + 3, y + 13, 9, 9, '#af8a61');
        rect(x + 6, y + 16, 5, 3, '#dcaa76');
      } else rect(x + 3, y + 22, 6, 5, '#69546a');
    }
    rect(p.x, y + 1, width, 9, '#204f41');
    rect(p.x + 2, y - 4, width - 4, 8, '#3c9f60');
    rect(p.x + 3, y - 5, width - 6, 4, '#81e27e');
    for (let x = p.x + 7; x < p.end - 5; x += 24) {
      rect(x, y + 1, 4, 2, '#a0f192');
      rect(x + 8, y + 6, 4, 3, '#316e50');
      if ((Math.floor(x / 24) + p.i) % 3 === 0) {
        rect(x + 4, y - 9, 2, 5, '#438b54');
        rect(x + 2, y - 12, 6, 5, p.i % 2 ? '#fdbbd1' : '#fff3ad');
      }
    }
    if (p.i === 0) {
      drawTree(p.x + 14, y - 5, 48);
      rect(p.x + 82, y - 35, 4, 32, '#5a3c41');
      rect(p.x + 73, y - 42, 41, 18, '#6b4639');
      rect(p.x + 75, y - 39, 37, 12, '#bb8958');
      rect(p.x + 78, y - 36, 30, 4, '#e8bc7c');
      drawPixelText('START', p.x + 82, y - 28, 8, '#332336');
    } else if (p.i % 2 === 1 && width > 140) {
      drawTree(p.end - 35, y - 5, 32 + p.i % 3 * 3);
    } else if (width > 170) {
      drawTree(p.x + 20, y - 5, 33);
    }
  }

  function drawPixelText(str, x, y, size, color) {
    context.fillStyle = color;
    context.font = `bold ${size}px ui-monospace,monospace`;
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.fillText(str, Math.round(x), Math.round(y));
  }

  function drawCoin(coin) {
    if (coin.picked) return;
    const y = coin.y + Math.sin(elapsed * 4 + coin.x * .08) * 2.2;
    const w = 6 + Math.abs(Math.sin(elapsed * 3 + coin.x)) * 4;
    rect(coin.x - w / 2 - 1, y - 7, w + 2, 14, '#714a33');
    rect(coin.x - w / 2, y - 7, w, 12, '#ffc73b');
    rect(coin.x - w / 2 + 2, y - 5, Math.max(2, w - 4), 7, '#ffed81');
    rect(coin.x - 1, y - 3, 2, 6, '#ea9d2a');
  }

  function drawEnemy(enemy) {
    if (enemy.dead) return;
    const x = Math.round(enemy.x), y = Math.round(enemy.y + Math.sin(elapsed * 7 + enemy.timeOffset) * 1.2);
    rect(x - 11, y + 7, 22, 7, '#353048');
    rect(x - 9, y + 3, 18, 9, '#7952a1');
    rect(x - 7, y, 14, 7, '#9d73cf');
    rect(x - 5, y + 4, 3, 4, '#ffffff');
    rect(x + 2, y + 4, 3, 4, '#ffffff');
    rect(x - 4, y + 5, 2, 3, '#1c182f');
    rect(x + 3, y + 5, 2, 3, '#1c182f');
    rect(x - 10, y + 12, 4, 3, '#382c50');
    rect(x + 6, y + 12, 4, 3, '#382c50');
  }

  function drawFlag() {
    const x = world.endX + 7;
    const p = world.platforms[world.platforms.length - 1];
    rect(x - 3, p.y - 58, 5, 58, '#37334e');
    rect(x - 1, p.y - 57, 2, 50, '#e2d6e1');
    rect(x + 2, p.y - 55, 30, 12, '#ef8a62');
    rect(x + 2, p.y - 43, 22, 7, '#df667a');
    rect(x + 2, p.y - 36, 14, 5, '#a74a6c');
    rect(x - 8, p.y - 4, 16, 4, '#f3e7ab');
    rect(x - 9, p.y, 18, 6, '#6b5a69');
  }

  function drawHero() {
    if (hero.invulnerability > 0 && Math.floor(hero.invulnerability * 15) % 2 === 0) return;
    context.save();
    context.translate(Math.round(hero.x + hero.w / 2), Math.round(hero.y));
    context.scale(hero.facing, 1);
    const stride = hero.onGround && Math.abs(hero.vx) > 5 ? Math.sin(hero.step) * 3 : 0;
    rect(-7, 20 + stride, 6, 5, '#232436');
    rect(2, 20 - stride, 6, 5, '#232436');
    rect(-7, 18 + stride, 5, 5, '#4c6288');
    rect(2, 18 - stride, 5, 5, '#4c6288');
    rect(-10, 11, 5, 12, '#6b483e');
    rect(-9, 12, 4, 9, '#ffb34a');
    rect(-6, 11, 12, 10, '#274e86');
    rect(-4, 12, 9, 7, '#378fd1');
    rect(4, 13, 4, 8, '#db8e64');
    rect(-7, 1, 14, 12, '#3f2933');
    rect(-5, 4, 12, 9, '#ecad76');
    rect(-7, -2, 13, 8, '#39282d');
    rect(-5, -4, 7, 4, '#3b2a33');
    rect(3, -2, 5, 6, '#39282d');
    rect(4, 7, 2, 3, '#20202e');
    rect(8, 10, 3, 5, '#df936c');
    context.restore();
  }

  function draw() {
    context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    context.imageSmoothingEnabled = false;
    drawBackground();
    context.save();
    context.translate(-Math.floor(cameraX), 0);
    const margin = 90;
    for (const p of world.platforms) {
      if (p.end < cameraX - margin || p.x > cameraX + viewportW + margin) continue;
      drawPlatform(p);
    }
    drawFlag();
    for (const coin of world.coins) {
      if (coin.x > cameraX - margin && coin.x < cameraX + viewportW + margin) drawCoin(coin);
    }
    for (const enemy of world.enemies) {
      if (enemy.x > cameraX - margin && enemy.x < cameraX + viewportW + margin) drawEnemy(enemy);
    }
    drawHero();
    for (const particle of particles) {
      context.globalAlpha = clamp(1 - particle.age / particle.life, 0, 1);
      rect(particle.x, particle.y, 4, 4, particle.color);
    }
    context.globalAlpha = 1;
    context.restore();
    rect(0, H - 2, viewportW, 2, '#ffffff1c');
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (width === canvas.width && height === canvas.height) return;
    canvas.width = width;
    canvas.height = height;
    renderScale = height / H;
    viewportW = width / renderScale;
    context.imageSmoothingEnabled = false;
  }

  function loop(time) {
    resize();
    const dt = Math.min(Math.max((time - (lastFrame || time)) / 1000, 0), .032);
    lastFrame = time;
    if (mode === 'playing') update(dt);
    else if (mode === 'menu') elapsed += dt * .3;
    draw();
    requestAnimationFrame(loop);
  }

  resetLevel(0);
  refreshPicker();
  showOverlay('menu');
  requestAnimationFrame(loop);
})();
