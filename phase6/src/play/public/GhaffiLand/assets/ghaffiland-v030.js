(function(){
const libs=window.__GHAFFI_LIBS__;if(!libs){document.getElementById("root").textContent="Gagal memuat React. Muat ulang.";return;}
const mods=Object.create(null);const cache=Object.create(null);
mods["src/App.tsx"]=function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const jsx_runtime_1 = require("react/jsx-runtime");
const VideoLesson_1 = __importDefault(require("./components/VideoLesson"));
const Songbook_1 = __importDefault(require("./components/Songbook"));
const curriculum_1 = require("./data/curriculum");
const videoLessons_1 = require("./data/videoLessons");
const narrator_1 = require("./services/narrator");
const NarratorSettings_1 = require("./components/NarratorSettings");
const react_1 = require("react");
const curriculum_2 = require("./data/curriculum");
const store_1 = require("./services/store");
const speech_1 = require("./services/speech");
const navigation_1 = require("./services/navigation");
const Art_1 = require("./components/Art");
const Guide_1 = require("./components/Guide");
const Quiz_1 = __importDefault(require("./components/Quiz"));
const MemoryGame_1 = __importDefault(require("./components/MemoryGame"));
const Story_1 = __importDefault(require("./components/Story"));
const levels = ['Mulai Yuk', 'Penjelajah', 'Pintar Bermain', 'Hebat!'];
function App() {
    const [videoIndex, setVideoIndex] = (0, react_1.useState)(0);
    const [loaded] = (0, react_1.useState)(store_1.readStore);
    const [settings, setSettings] = (0, react_1.useState)(loaded.settings);
    const [progress, setProgress] = (0, react_1.useState)(loaded.progress);
    const [screen, setScreen] = (0, react_1.useState)('welcome');
    const [world, setWorld] = (0, react_1.useState)('read');
    const [activity, setActivity] = (0, react_1.useState)('R01');
    const [sessionOffset, setOffset] = (0, react_1.useState)(0);
    const [lastRoundCount, setLastRoundCount] = (0, react_1.useState)(0);
    const [playKey, setPlayKey] = (0, react_1.useState)(0);
    const [mic, setMic] = (0, react_1.useState)(false);
    const [demo, setDemo] = (0, react_1.useState)(false);
    const [storageNote, setStorageNote] = (0, react_1.useState)(loaded.failed ? 'Penyimpanan belum dapat dibaca. Kamu tetap bisa bermain.' : '');
    const [gateAnswer, setGateAnswer] = (0, react_1.useState)('');
    const [askDelete, setAskDelete] = (0, react_1.useState)(false);
    const [audioNote, setAudioNote] = (0, react_1.useState)('');
    const [started, setStarted] = (0, react_1.useState)(null);
    const [reminder, setReminder] = (0, react_1.useState)(false);
    const [dismissed, setDismissed] = (0, react_1.useState)(false);
    const [online, setOnline] = (0, react_1.useState)(navigator.onLine);
    const prevScreen = (0, react_1.useRef)(screen);
    const active = curriculum_2.activities.find(a => a.id === activity);
    const worldData = curriculum_2.worlds.find(w => w.id === world);
    const sessions = Object.values(progress).reduce((a, p) => a + p.sessions, 0);
    (0, react_1.useLayoutEffect)(() => { (0, narrator_1.configureNarrator)(settings); }, [settings.voiceStyle, settings.voiceId, settings.voiceEn, settings.voiceSpeed]);
    (0, react_1.useEffect)(() => { if (!(0, store_1.writeStore)(settings, progress))
        setStorageNote('Progres tidak dapat disimpan di browser ini. Bermain tetap bisa.'); }, [settings, progress]);
    (0, react_1.useEffect)(() => { if (!settings.narrator)
        (0, speech_1.stopAudio)(); }, [settings.narrator]);
    (0, react_1.useEffect)(() => { const on = () => setOnline(navigator.onLine); window.addEventListener('online', on); window.addEventListener('offline', on); const hide = () => { if (document.hidden)
        (0, speech_1.stopAll)(); }; document.addEventListener('visibilitychange', hide); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', on); document.removeEventListener('visibilitychange', hide); (0, speech_1.stopAll)(); }; }, []);
    (0, react_1.useEffect)(() => { if (started === null || dismissed)
        return; const timer = setInterval(() => { if (Date.now() - started >= settings.minutes * 60000)
        setReminder(true); }, 1000); return () => clearInterval(timer); }, [started, settings.minutes, dismissed]);
    (0, react_1.useEffect)(() => { if (prevScreen.current !== screen) {
        document.querySelector('[data-heading]')?.focus();
        prevScreen.current = screen;
    } }, [screen]);
    const go = (0, react_1.useCallback)((next) => { (0, speech_1.stopAll)(); setAudioNote(''); setScreen(next); }, []);
    const back = (0, react_1.useCallback)(() => { if (screen === 'video')
        go('videos');
    else if (screen === 'play')
        go('world');
    else if (screen === 'world' || screen === 'parent' || screen === 'gate' || screen === 'stickers' || screen === 'summary' || screen === 'story' || screen === 'videos' || screen === 'songs' || screen === 'rest')
        go('home');
    else if (screen === 'home')
        go('welcome'); }, [screen, go]);
    (0, navigation_1.useRemote)(back, screen);
    function start() { setStarted(Date.now()); setDismissed(false); setReminder(false); go('home'); (0, speech_1.speak)(`Halo, ${settings.nickname}! Mau belajar apa hari ini?`, settings.narrator, 'id-ID', setAudioNote); }
    function selectWorld(id) { setWorld(id); go('world'); (0, speech_1.speak)(curriculum_2.worlds.find(w => w.id === id).name, settings.narrator, 'id-ID', setAudioNote); }
    function play(id) { setActivity(id); setOffset(progress[id]?.sessions || 0); setPlayKey(k => k + 1); if (!started)
        setStarted(Date.now()); go('play'); }
    function complete(attempts, id = activity, rounds = 3) { const prev = progress[id] || { sessions: 0, rounds: 0, attempts: 0 }; setLastRoundCount(rounds); setProgress({ ...progress, [id]: { sessions: prev.sessions + 1, rounds: prev.rounds + rounds, attempts: prev.attempts + attempts } }); go('summary'); }
    const update = (key, value) => setSettings(s => ({ ...s, [key]: value }));
    function rest() { setStarted(null); setReminder(false); setDismissed(false); go('rest'); (0, speech_1.speak)('Terima kasih sudah bermain. Sekarang waktunya istirahat bersama.', settings.narrator); }
    function exportProgress() { const blob = new Blob([(0, store_1.exported)(progress)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ghaffiland-progres.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    function erase() { (0, speech_1.stopAll)(); try {
        localStorage.removeItem(store_1.KEY);
        setStorageNote('Data lokal dihapus. Penyimpanan dimatikan.');
    }
    catch {
        setStorageNote('Browser menolak penghapusan. Hapus data situs lewat pengaturan browser.');
    } setSettings({ ...store_1.defaults, save: false }); setProgress({}); setMic(false); setDemo(false); setAskDelete(false); }
    const check = (key, label) => (0, jsx_runtime_1.jsxs)("label", { className: "toggle", children: [(0, jsx_runtime_1.jsx)("span", { children: label }), (0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: settings[key], onChange: e => update(key, e.target.checked) })] });
    return (0, jsx_runtime_1.jsxs)("div", { className: `app ${settings.tv ? 'tv' : ''} ${!settings.motion ? 'no-motion' : ''}`, children: [(0, jsx_runtime_1.jsxs)("header", { className: "topbar", children: [(0, jsx_runtime_1.jsxs)("button", { className: "brand", onClick: () => go('home'), "aria-label": "GhaffiLand, kembali ke beranda", children: [(0, jsx_runtime_1.jsx)("span", { className: "brand-mark", children: (0, jsx_runtime_1.jsx)(Art_1.Art, { name: "star", size: 32 }) }), (0, jsx_runtime_1.jsxs)("span", { children: ["Ghaffi", (0, jsx_runtime_1.jsx)("span", { children: "Land" }), (0, jsx_runtime_1.jsx)("small", { children: "Main, Belajar, Ceria!" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "header-actions", children: [screen !== 'welcome' && (0, jsx_runtime_1.jsx)("button", { className: "small-button", onClick: () => { (0, speech_1.stopAll)(); update('narrator', !settings.narrator); setAudioNote(settings.narrator ? 'Narasi dimatikan.' : 'Narasi diaktifkan. Tekan Ulangi untuk mendengar.'); }, children: settings.narrator ? 'Suara: ON' : 'Suara: OFF' }), (0, jsx_runtime_1.jsxs)("button", { className: "small-button parent-button", onClick: () => { setGateAnswer(''); go('gate'); }, children: ["Orang tua ", (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: "\u2197" })] })] })] }), !online && (0, jsx_runtime_1.jsx)("p", { className: "notice", children: "Sedang offline. Permainan sentuh tetap tersedia; pengenalan suara mungkin tidak bekerja." }), reminder && (0, jsx_runtime_1.jsxs)("aside", { className: "break-reminder", role: "status", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Sudah ", settings.minutes, " menit. Mau minum dan istirahat bersama?"] }), (0, jsx_runtime_1.jsx)("button", { onClick: rest, children: "Istirahat" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { setReminder(false); setDismissed(true); }, children: "Selesaikan permainan ini" })] }), (0, jsx_runtime_1.jsxs)("main", { children: [screen === 'welcome' && (0, jsx_runtime_1.jsxs)("section", { className: "welcome", children: [(0, jsx_runtime_1.jsxs)("div", { className: "welcome-copy", children: [(0, jsx_runtime_1.jsx)("span", { className: "eyebrow", children: "RUANG MAIN KECIL, PENEMUAN BESAR" }), (0, jsx_runtime_1.jsxs)("h1", { "data-heading": true, tabIndex: -1, children: ["Halo, ", settings.nickname, ".", (0, jsx_runtime_1.jsx)("br", {}), "Ayo ", (0, jsx_runtime_1.jsx)("span", { className: "highlight", children: "main" }), (0, jsx_runtime_1.jsx)("br", {}), "dan belajar!"] }), (0, jsx_runtime_1.jsxs)("p", { children: ["Sentuh, dengarkan, lalu jawab.", (0, jsx_runtime_1.jsx)("br", {}), "Kita mencoba bersama, pelan-pelan."] }), (0, jsx_runtime_1.jsxs)("button", { className: "primary big-cta", onClick: start, children: ["Ayo Main! ", (0, jsx_runtime_1.jsx)("span", { children: "\u2192" })] }), (0, jsx_runtime_1.jsx)("p", { className: "microcopy", children: "Tanpa akun \u00B7 Mikrofon mati \u00B7 Ditemani orang tua" })] }), settings.avatar ? (0, jsx_runtime_1.jsxs)("div", { className: "hero-art", children: [(0, jsx_runtime_1.jsx)("img", { src: "./assets/ghaffi-mascot.png", alt: "Ghaffi melambaikan tangan di ruang bermain warna-warni" }), (0, jsx_runtime_1.jsxs)("span", { className: "hero-sticker", children: ["Main, belajar,", (0, jsx_runtime_1.jsx)("br", {}), "ceria!"] })] }) : (0, jsx_runtime_1.jsx)("div", { className: "hero-art no-avatar", children: (0, jsx_runtime_1.jsx)(Art_1.Art, { name: "book", size: 220 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "welcome-strip", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["ABC ", (0, jsx_runtime_1.jsx)("small", { children: "Kenali huruf" })] }), (0, jsx_runtime_1.jsxs)("span", { children: ["123 ", (0, jsx_runtime_1.jsx)("small", { children: "Hitung bersama" })] }), (0, jsx_runtime_1.jsxs)("span", { children: ["\u2605 ", (0, jsx_runtime_1.jsx)("small", { children: "Coba hal baru" })] })] })] }), screen === 'home' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("section", { className: "home-intro", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "eyebrow", children: "PETUALANGAN HARI INI" }), (0, jsx_runtime_1.jsxs)("h1", { "data-heading": true, tabIndex: -1, children: ["Mau main apa,", (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsxs)("span", { className: "highlight", children: [settings.nickname, "?"] })] }), (0, jsx_runtime_1.jsx)("p", { children: "Pilih duniamu. Kita belajar bersama!" }), (0, jsx_runtime_1.jsxs)("div", { className: "pills", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["L", settings.level, " \u00B7 ", levels[settings.level - 1]] }), (0, jsx_runtime_1.jsx)("span", { children: settings.mode === 'together' ? 'Bersama pendamping' : 'Sesi singkat' })] })] }), settings.avatar && (0, jsx_runtime_1.jsx)("div", { className: "home-mascot", children: (0, jsx_runtime_1.jsx)("img", { src: "./assets/ghaffi-mascot.png", alt: "Ghaffi, teman bermain" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "section-label", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Enam dunia untuk dijelajahi" }), (0, jsx_runtime_1.jsxs)("span", { children: [curriculum_2.activities.length, " permainan"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "world-grid", children: curriculum_2.worlds.map((w, i) => (0, jsx_runtime_1.jsxs)("button", { className: `world-card ${w.color}`, onClick: () => selectWorld(w.id), children: [(0, jsx_runtime_1.jsxs)("span", { className: "card-index", children: ["0", i + 1] }), (0, jsx_runtime_1.jsx)(Art_1.Art, { name: w.art, size: 90 }), (0, jsx_runtime_1.jsx)("strong", { children: w.name }), (0, jsx_runtime_1.jsx)("span", { children: w.sub }), (0, jsx_runtime_1.jsx)("span", { className: "card-arrow", "aria-hidden": "true", children: "\u2197" })] }, w.id)) }), (0, jsx_runtime_1.jsxs)("button", { className: "song-banner", onClick: () => go('songs'), children: [(0, jsx_runtime_1.jsx)("span", { className: "song-banner-icon", "aria-hidden": "true", children: "\u266B" }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("small", { children: "BARU \u00B7 LAGU ANAK" }), (0, jsx_runtime_1.jsx)("strong", { children: "Bernyanyi bersama Ghaffi!" }), (0, jsx_runtime_1.jsx)("span", { children: "4 lagu orisinal \u00B7 melodi + lirik interaktif \u2192" })] })] }), (0, jsx_runtime_1.jsxs)("button", { className: "video-banner", onClick: () => go('videos'), children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: "video", size: 80 }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("small", { children: "BARU \u00B7 BIOSKOP GHAFFI" }), (0, jsx_runtime_1.jsx)("strong", { children: "Tonton, jawab, lalu coba!" }), (0, jsx_runtime_1.jsx)("span", { children: "3 video belajar dengan giliran menjawab \u2192" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "home-extras", children: [(0, jsx_runtime_1.jsxs)("button", { className: "story-banner", onClick: () => { setActivity('R10'); go('story'); }, children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: "basket", size: 70 }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("small", { children: "WAKTU BERCERITA" }), (0, jsx_runtime_1.jsx)("strong", { children: "Piknik kecil Ghaffi" }), (0, jsx_runtime_1.jsx)("span", { children: "Kamu yang pilih jalan ceritanya \u2192" })] })] }), (0, jsx_runtime_1.jsxs)("button", { className: "sticker-banner", onClick: () => go('stickers'), children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: "star", size: 65 }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Lemari stiker" }), (0, jsx_runtime_1.jsx)("span", { children: "Kenangan belajar kita" })] })] })] }), (0, jsx_runtime_1.jsx)("button", { className: "rest-link", onClick: rest, children: "Sudah cukup? Ayo istirahat." })] }), screen === 'world' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { className: "back", onClick: () => go('home'), children: "\u2190 Semua dunia" }), (0, jsx_runtime_1.jsxs)("div", { className: "world-heading", children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: worldData.art, size: 88 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "eyebrow", children: "PILIH PERMAINANMU" }), (0, jsx_runtime_1.jsx)("h1", { "data-heading": true, tabIndex: -1, children: worldData.name }), (0, jsx_runtime_1.jsx)("p", { children: "Semua materi tersedia. Pilih latihan 10 soal atau seluruh pertanyaan!" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "lesson-controls", children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Urutan pertanyaan", (0, jsx_runtime_1.jsxs)("select", { "aria-label": "Urutan pertanyaan", value: settings.questionOrder, onChange: e => update('questionOrder', e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "sequential", children: "Urut" }), (0, jsx_runtime_1.jsx)("option", { value: "random", children: "Acak" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Jumlah pertanyaan", (0, jsx_runtime_1.jsxs)("select", { "aria-label": "Jumlah pertanyaan", value: settings.sessionLength, onChange: e => update('sessionLength', e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "short", children: "10 soal per sesi" }), (0, jsx_runtime_1.jsx)("option", { value: "all", children: "Seluruh materi" })] })] }), (0, jsx_runtime_1.jsx)("p", { children: "Pilihan ini berlaku untuk semua kuis. Sesi singkat berikutnya melanjutkan materi yang belum dimainkan." })] }), (0, jsx_runtime_1.jsx)("div", { className: "activity-grid", children: curriculum_2.activities.filter(a => a.world === world).map(a => (0, jsx_runtime_1.jsxs)("button", { className: `activity-card ${worldData.color}`, onClick: () => play(a.id), children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: a.art, size: 90 }), (0, jsx_runtime_1.jsx)("strong", { children: a.name }), (0, jsx_runtime_1.jsx)("span", { children: a.desc }), (0, jsx_runtime_1.jsxs)("span", { className: "play-pill", children: [a.id === 'G01' ? 'Cocokkan kartu' : `${(0, curriculum_1.getPool)(a.id, 4).length} soal tersedia`, " \u2192"] })] }, a.id)) }), world === 'hijaiyah' && (0, jsx_runtime_1.jsx)("p", { className: "notice", children: "Tekan tombol dengar untuk mendengar nama huruf Alif, Ba, Ta, dan seterusnya. Suara dihasilkan oleh TTS perangkat (pengucapan Arab adalah perkiraan), bukan rekaman guru tajwid." })] }), (screen === 'play' || screen === 'story' || screen === 'video') && (0, jsx_runtime_1.jsxs)("div", { className: "play-navigation", children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => go(screen === 'play' ? 'world' : screen === 'video' ? 'videos' : 'home'), children: ["\u2190 ", screen === 'play' ? 'Pilih permainan' : screen === 'video' ? 'Pilih video' : 'Beranda'] }), (0, jsx_runtime_1.jsx)("span", { children: screen === 'play' ? active.name : screen === 'video' ? 'Bioskop Ghaffi' : 'Cerita bersama' }), (0, jsx_runtime_1.jsx)("button", { onClick: rest, children: "Berhenti" })] }), screen === 'play' && (activity === 'G01' ? (0, jsx_runtime_1.jsx)(MemoryGame_1.default, { settings: settings, offset: sessionOffset, onDone: n => complete(n) }, playKey) : (0, jsx_runtime_1.jsx)(Quiz_1.default, { questions: (0, curriculum_2.sessionQuestions)(activity, settings.level, sessionOffset, settings.questionOrder, settings.sessionLength), settings: settings, mic: mic, demo: demo, onDone: (n, rounds) => complete(n, activity, rounds), onQuit: rest }, playKey)), screen === 'songs' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { className: "back", onClick: () => go('home'), children: "\u2190 Beranda" }), (0, jsx_runtime_1.jsx)(Songbook_1.default, { settings: settings })] }), screen === 'videos' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { className: "back", onClick: () => go('home'), children: "\u2190 Beranda" }), (0, jsx_runtime_1.jsx)("h1", { "data-heading": true, tabIndex: -1, children: "Bioskop Ghaffi" }), (0, jsx_runtime_1.jsx)("p", { children: "Video pendek, lalu giliran kamu menjawab. Pilih petualanganmu!" }), (0, jsx_runtime_1.jsx)("div", { className: "activity-grid", children: videoLessons_1.videoLessons.map((v, i) => (0, jsx_runtime_1.jsxs)("button", { className: "activity-card sky", onClick: () => { setVideoIndex(i); setActivity(v.id); setPlayKey(k => k + 1); if (!started)
                                        setStarted(Date.now()); go('video'); }, children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: v.art, size: 90 }), (0, jsx_runtime_1.jsx)("strong", { children: v.title }), (0, jsx_runtime_1.jsx)("span", { children: "3 adegan \u00B7 18 detik video + pertanyaan" }), (0, jsx_runtime_1.jsx)("span", { className: "play-pill", children: "Ayo tonton \u2192" })] }, v.id)) })] }), screen === 'video' && (0, jsx_runtime_1.jsx)(VideoLesson_1.default, { lessonIndex: videoIndex, settings: settings, onDone: n => complete(n, videoLessons_1.videoLessons[videoIndex].id) }, playKey), screen === 'story' && (0, jsx_runtime_1.jsx)(Story_1.default, { settings: settings, onDone: n => complete(n, 'R10') }), screen === 'summary' && (0, jsx_runtime_1.jsxs)("section", { className: "center-page", children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: settings.rewards ? 'star' : 'flower', size: 150 }), (0, jsx_runtime_1.jsx)("span", { className: "eyebrow", children: "SESI SELESAI" }), (0, jsx_runtime_1.jsxs)("h1", { "data-heading": true, tabIndex: -1, children: ["Terima kasih", (0, jsx_runtime_1.jsx)("br", {}), "sudah mencoba!"] }), (0, jsx_runtime_1.jsx)(Guide_1.Guide, { avatar: settings.avatar, text: `${lastRoundCount} soal sudah kita coba bersama. Sekarang boleh istirahat, atau pilih dunia lain.`, celebrate: true }), (0, jsx_runtime_1.jsx)("p", { children: settings.save ? 'Progres tersimpan di browser ini.' : 'Progres hanya berlaku selama sesi ini.' }), (0, jsx_runtime_1.jsxs)("div", { className: "controls", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary", onClick: rest, children: "Istirahat dulu" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => go('home'), children: "Pilih dunia lain" })] })] }), screen === 'rest' && (0, jsx_runtime_1.jsxs)("section", { className: "center-page", children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: "tree", size: 160 }), (0, jsx_runtime_1.jsxs)("h1", { "data-heading": true, tabIndex: -1, children: ["Sampai nanti,", (0, jsx_runtime_1.jsx)("br", {}), settings.nickname, "!"] }), (0, jsx_runtime_1.jsxs)("p", { children: ["Minum air, regangkan badan,", (0, jsx_runtime_1.jsx)("br", {}), "atau bermain bersama di luar layar."] }), (0, jsx_runtime_1.jsx)("button", { className: "primary", onClick: start, children: "Kembali saat siap" })] }), screen === 'stickers' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { className: "back", onClick: () => go('home'), children: "\u2190 Beranda" }), (0, jsx_runtime_1.jsx)("h1", { "data-heading": true, tabIndex: -1, children: "Lemari stiker" }), (0, jsx_runtime_1.jsx)("p", { children: "Kenang-kenangan dari kegiatan yang sudah kamu coba." }), !settings.rewards ? (0, jsx_runtime_1.jsx)("p", { className: "notice", children: "Stiker dimatikan oleh pendamping. Belajar tetap menyenangkan." }) : sessions === 0 ? (0, jsx_runtime_1.jsx)(Guide_1.Guide, { text: "Belum ada stiker. Kita boleh mulai dari permainan apa saja.", avatar: settings.avatar }) : (0, jsx_runtime_1.jsx)("div", { className: "sticker-grid", children: Object.entries(progress).filter(([, p]) => p.sessions > 0).map(([id]) => (0, jsx_runtime_1.jsxs)("div", { className: "sticker", children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: curriculum_2.activities.find(a => a.id === id)?.art || videoLessons_1.videoLessons.find(v => v.id === id)?.art || 'basket', size: 90 }), (0, jsx_runtime_1.jsx)("strong", { children: curriculum_2.activities.find(a => a.id === id)?.name || (0, videoLessons_1.videoLabel)(id) || 'Piknik kecil Ghaffi' }), (0, jsx_runtime_1.jsx)("span", { children: "Sudah mencoba \u2605" })] }, id)) })] }), screen === 'gate' && (0, jsx_runtime_1.jsxs)("section", { className: "center-page gate", children: [(0, jsx_runtime_1.jsx)("span", { className: "eyebrow", children: "KHUSUS PENDAMPING" }), (0, jsx_runtime_1.jsx)("h1", { "data-heading": true, tabIndex: -1, children: "Halo, orang tua." }), (0, jsx_runtime_1.jsxs)("p", { children: ["Pilih hasil ", (0, jsx_runtime_1.jsx)("strong", { children: "7 + 8" }), " untuk membuka pengaturan.", (0, jsx_runtime_1.jsx)("br", {}), "Gerbang ini mencegah sentuhan tidak sengaja, bukan keamanan akun."] }), (0, jsx_runtime_1.jsx)("div", { className: "controls", children: [12, 15, 18].map(n => (0, jsx_runtime_1.jsx)("button", { onClick: () => { if (n === 15) {
                                        go('parent');
                                    }
                                    else
                                        setGateAnswer('Belum cocok. Minta bantuan orang dewasa, ya.'); }, children: n }, n)) }), (0, jsx_runtime_1.jsx)("p", { role: "status", children: gateAnswer }), (0, jsx_runtime_1.jsx)("button", { onClick: () => go('home'), children: "Kembali bermain" })] }), screen === 'parent' && (0, jsx_runtime_1.jsxs)("section", { className: "parent", children: [(0, jsx_runtime_1.jsx)("button", { className: "back", onClick: () => go('home'), children: "\u2190 Kembali bermain" }), (0, jsx_runtime_1.jsx)("span", { className: "eyebrow", children: "RUANG PENDAMPING \u00B7 TRIAL T0-B AWAL" }), (0, jsx_runtime_1.jsx)("h1", { "data-heading": true, tabIndex: -1, children: "Belajar dengan nyaman." }), (0, jsx_runtime_1.jsx)("p", { children: "Pengaturan hanya untuk browser ini. Tetap dampingi anak saat bermain." }), (0, jsx_runtime_1.jsxs)("div", { className: "settings-grid", children: [(0, jsx_runtime_1.jsxs)("section", { className: "settings-card", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Teman belajar" }), (0, jsx_runtime_1.jsxs)("label", { children: ["Nama panggilan", (0, jsx_runtime_1.jsx)("input", { maxLength: 20, value: settings.nickname, onChange: e => update('nickname', e.target.value.replace(/[<>]/g, '')), onBlur: () => { if (!settings.nickname.trim())
                                                            update('nickname', 'Ghaffi'); } })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Level materi", (0, jsx_runtime_1.jsx)("select", { value: settings.level, onChange: e => update('level', Number(e.target.value)), children: levels.map((s, i) => (0, jsx_runtime_1.jsxs)("option", { value: i + 1, children: ["L", i + 1, " \u2014 ", s] }, s)) })] }), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Level mengatur jumlah pilihan dan pasangan memory; seluruh materi tersedia pada semua level. Suku kata dan kata tetap latihan dengan pendamping." }), (0, jsx_runtime_1.jsxs)("label", { children: ["Urutan kuis", (0, jsx_runtime_1.jsxs)("select", { value: settings.questionOrder, onChange: e => update('questionOrder', e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "sequential", children: "Urut" }), (0, jsx_runtime_1.jsx)("option", { value: "random", children: "Acak" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Jumlah soal", (0, jsx_runtime_1.jsxs)("select", { value: settings.sessionLength, onChange: e => update('sessionLength', e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "short", children: "10 soal per sesi" }), (0, jsx_runtime_1.jsx)("option", { value: "all", children: "Seluruh materi" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Mode belajar", (0, jsx_runtime_1.jsxs)("select", { value: settings.mode, onChange: e => { const mode = e.target.value; setSettings(s => ({ ...s, mode, minutes: mode === 'short' ? 5 : s.minutes })); }, children: [(0, jsx_runtime_1.jsx)("option", { value: "together", children: "Belajar Bersama" }), (0, jsx_runtime_1.jsx)("option", { value: "short", children: "Main Mandiri Singkat (5 menit)" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Pengingat istirahat", (0, jsx_runtime_1.jsx)("select", { value: settings.minutes, onChange: e => update('minutes', Number(e.target.value)), children: [5, 10, 15].map(n => (0, jsx_runtime_1.jsxs)("option", { value: n, children: [n, " menit"] }, n)) })] }), check('avatar', 'Tampilkan karikatur Ghaffi'), check('motion', 'Animasi ringan'), check('rewards', 'Tampilkan stiker apresiasi'), check('tv', 'Tampilan TV lebih lega')] }), (0, jsx_runtime_1.jsxs)("section", { className: "settings-card", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Suara & privasi" }), check('narrator', 'Narator aktif'), (0, jsx_runtime_1.jsx)(NarratorSettings_1.NarratorSettings, { settings: settings, onChange: patch => { (0, speech_1.stopAll)(); setSettings(s => ({ ...s, ...patch })); } }), (0, jsx_runtime_1.jsxs)("p", { className: "note", children: ["TTS: ", (0, speech_1.capabilities)().tts ? 'API tersedia; suara Indonesia/Inggris bergantung perangkat.' : 'Tidak didukung. Gunakan teks dan gambar.', " Tidak ada musik latar atau efek suara mendadak."] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => (0, speech_1.speak)('Halo, Ghaffi! Siap bermain? Ayo hitung bersama. Satu, dua, tiga. Betul! Sekarang, pilih warna merah.', settings.narrator, 'id-ID', setAudioNote), children: "Coba narator" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { (0, speech_1.stopAll)(); setAudioNote('Semua audio dihentikan.'); }, children: "Hentikan audio" }), (0, jsx_runtime_1.jsx)("p", { role: "status", children: audioNote }), (0, jsx_runtime_1.jsx)("hr", {}), (0, jsx_runtime_1.jsx)("strong", { children: "Jawab dengan mikrofon (opsional)" }), (0, jsx_runtime_1.jsx)("p", { children: (0, speech_1.capabilities)().mic ? 'API pengenalan suara terdeteksi. Dukungan dan izin aktual perlu dicoba.' : 'Browser ini tidak menyediakan SpeechRecognition. Pilihan sentuh tetap lengkap.' }), (0, jsx_runtime_1.jsx)("p", { children: "Browser atau vendornya mungkin memproses ucapan di server. GhaffiLand tidak menyimpan rekaman atau transkrip. Hindari menyebut identitas pribadi." }), (0, jsx_runtime_1.jsxs)("label", { className: "toggle", children: [(0, jsx_runtime_1.jsx)("span", { children: "Saya memahami dan mengizinkan tombol mikrofon untuk sesi ini" }), (0, jsx_runtime_1.jsx)("input", { type: "checkbox", disabled: !(0, speech_1.capabilities)().mic, checked: mic, onChange: e => { (0, speech_1.stopAll)(); setMic(e.target.checked); } })] }), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Izin browser diminta saat tombol \u201CJawab pakai suara\u201D ditekan. Mendengarkan maksimal 8 detik. Muat ulang selalu mematikan mode mikrofon." }), (0, jsx_runtime_1.jsxs)("label", { className: "toggle", children: [(0, jsx_runtime_1.jsx)("span", { children: "Mode demo input teks orang tua" }), (0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: demo, onChange: e => setDemo(e.target.checked) })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "settings-card wide", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Progres lokal" }), (0, jsx_runtime_1.jsxs)("p", { children: [sessions, " sesi selesai \u00B7 ", Object.values(progress).reduce((n, p) => n + p.rounds, 0), " putaran. Catatan kegiatan, bukan penilaian perkembangan anak."] }), check('save', 'Simpan pengaturan dan progres di perangkat ini'), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Jika dimatikan, data tersimpan dihapus dan sesi berikutnya mulai dari awal. Progres saat ini tetap ada di memori sampai tab ditutup." }), storageNote && (0, jsx_runtime_1.jsx)("p", { role: "status", children: storageNote }), (0, jsx_runtime_1.jsx)("div", { className: "progress-list", children: Object.entries(progress).map(([id, p]) => (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: curriculum_2.activities.find(a => a.id === id)?.name || (0, videoLessons_1.videoLabel)(id) || 'Cerita piknik' }), (0, jsx_runtime_1.jsxs)("span", { children: [p.sessions, " sesi \u00B7 ", p.rounds, " putaran \u00B7 ", p.attempts, " respons/pasangan"] })] }, id)) }), (0, jsx_runtime_1.jsxs)("div", { className: "controls", children: [(0, jsx_runtime_1.jsx)("button", { onClick: exportProgress, children: "Ekspor progres JSON tanpa identitas" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setAskDelete(true), children: "Hapus data lokal" })] }), askDelete && (0, jsx_runtime_1.jsxs)("div", { className: "confirm", role: "alert", children: [(0, jsx_runtime_1.jsx)("p", { children: "Hapus pengaturan dan seluruh progres di browser ini?" }), (0, jsx_runtime_1.jsx)("button", { onClick: erase, children: "Ya, hapus semuanya" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setAskDelete(false), children: "Batal" })] })] })] }), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Bahasa antarmuka: Indonesia. Materi English memakai suara en-US bila tersedia. Hijaiyah punya narasi nama melalui TTS Indonesia (bukan pelafalan makhraj yang dijamin tepat). Tidak ada akun, iklan, kamera, chatbot bebas, atau analytics." })] })] }), (0, jsx_runtime_1.jsxs)("footer", { children: [(0, jsx_runtime_1.jsxs)("span", { children: ["GhaffiLand ", (0, jsx_runtime_1.jsx)("b", { children: "\u2605" }), " Main, Belajar, Ceria!"] }), (0, jsx_runtime_1.jsx)("span", { children: "Trial keluarga \u00B7 v0.3.0" })] })] });
}

};
mods["src/components/Art.tsx"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Art = Art;
const jsx_runtime_1 = require("react/jsx-runtime");
function Art({ name, label, size = 80 }) {
    const eye = (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "39", cy: "48", r: "3", fill: "#202020" }), (0, jsx_runtime_1.jsx)("circle", { cx: "61", cy: "48", r: "3", fill: "#202020" })] });
    const smile = (0, jsx_runtime_1.jsx)("path", { d: "M43 62q7 7 14 0", fill: "none" });
    const drawings = {
        grass: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M13 86 24 30l16 36L54 13l6 55 20-44 8 62Z", fill: "#8ccc8a" }), (0, jsx_runtime_1.jsx)("path", { d: "M10 87h80" })] }),
        leaves: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M13 77Q2 16 77 16q11 63-64 61Z", fill: "#8ccc8a" }), (0, jsx_runtime_1.jsx)("path", { d: "m22 72 53-50" }), (0, jsx_runtime_1.jsx)("path", { d: "M48 47 26 28M48 47l29 8" })] }),
        seeds: (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)("path", { d: "M12 76q38 25 76 0M24 48q-8-22 7-20 15 3 3 24M56 42q-4-22 12-18 15 7 1 24M44 78q-16-16 0-22 17-2 15 17", fill: "#ffda5d" }) }),
        meat: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M25 72C4 34 48 7 76 30q21 16 3 39Q58 90 25 72Z", fill: "#ed6555" }), (0, jsx_runtime_1.jsx)("circle", { cx: "57", cy: "50", r: "16", fill: "#fff9ed" })] }),
        carrot: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M40 28 89 87Q49 80 22 44Z", fill: "#ff986c" }), (0, jsx_runtime_1.jsx)("path", { d: "M36 31Q9 21 18 9q16 1 22 17Q46-3 61 12q-4 17-21 19", fill: "#8ccc8a" }), (0, jsx_runtime_1.jsx)("path", { d: "m43 46 11-9m0 19 11-9" })] }),
        bamboo: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M36 12v76M62 12v76M28 35h16M54 55h16M32 46Q3 34 12 17q30 0 24 29M60 39q36-22 31-37-30 3-31 37", stroke: "#379e66", strokeWidth: "12" }), (0, jsx_runtime_1.jsx)("path", { d: "M36 12v76M62 12v76", stroke: "#244f38", strokeWidth: "2" })] }),
        insect: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "57", rx: "16", ry: "26", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "25", r: "14", fill: "#ff986c" }), (0, jsx_runtime_1.jsx)("path", { d: "m36 50-21-9m20 22-25 10m53-23 21-9M65 63l25 10M44 15l-12-9M56 15l12-9" })] }),
        vegetable: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "29", cy: "35", r: "17", fill: "#8ccc8a" }), (0, jsx_runtime_1.jsx)("circle", { cx: "53", cy: "28", r: "19", fill: "#8ccc8a" }), (0, jsx_runtime_1.jsx)("circle", { cx: "76", cy: "42", r: "17", fill: "#8ccc8a" }), (0, jsx_runtime_1.jsx)("path", { d: "M23 52h54L68 87H32Z", fill: "#ff986c" })] }),
        worm: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M15 76C-2 33 57 37 42 66 23 94 84 94 83 38", stroke: "#ffc1d5", strokeWidth: "16" }), (0, jsx_runtime_1.jsx)("circle", { cx: "82", cy: "35", r: "3", fill: "#202020", stroke: "none" })] }),
        monkey: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "47", r: "35", fill: "#ad7959" }), (0, jsx_runtime_1.jsx)("circle", { cx: "17", cy: "49", r: "13", fill: "#e6af6c" }), (0, jsx_runtime_1.jsx)("circle", { cx: "83", cy: "49", r: "13", fill: "#e6af6c" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "56", rx: "24", ry: "26", fill: "#e6af6c" }), eye, smile] }),
        panda: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "53", r: "32", fill: "white" }), (0, jsx_runtime_1.jsx)("circle", { cx: "22", cy: "23", r: "14", fill: "#202020" }), (0, jsx_runtime_1.jsx)("circle", { cx: "78", cy: "23", r: "14", fill: "#202020" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "36", cy: "50", rx: "11", ry: "15", fill: "#202020" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "64", cy: "50", rx: "11", ry: "15", fill: "#202020" }), (0, jsx_runtime_1.jsx)("circle", { cx: "38", cy: "49", r: "3", fill: "white" }), (0, jsx_runtime_1.jsx)("circle", { cx: "62", cy: "49", r: "3", fill: "white" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "69", rx: "7", ry: "5", fill: "#202020" })] }),
        chicken: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "59", rx: "30", ry: "29", fill: "#fff9ed" }), (0, jsx_runtime_1.jsx)("path", { d: "M46 30Q20 8 43 12Q51 0 60 20Q79 4 71 31", fill: "#ed6555" }), (0, jsx_runtime_1.jsx)("path", { d: "m50 53 18 8-18 7", fill: "#ff986c" }), eye, (0, jsx_runtime_1.jsx)("path", { d: "M40 84v9m20-9v9" })] }),
        circle: (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "35", fill: "#83d8ef" }),
        square: (0, jsx_runtime_1.jsx)("rect", { x: "16", y: "16", width: "68", height: "68", rx: "2", fill: "#ffda5d" }),
        triangle: (0, jsx_runtime_1.jsx)("path", { d: "M50 12 90 84H10Z", fill: "#ffc1d5" }),
        oval: (0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "50", rx: "42", ry: "27", fill: "#a7e7ae" }),
        rectangle: (0, jsx_runtime_1.jsx)("rect", { x: "8", y: "25", width: "84", height: "50", rx: "2", fill: "#b6a2f7" }),
        shapes: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "28", cy: "29", r: "20", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("rect", { x: "54", y: "11", width: "35", height: "35", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("path", { d: "M50 50 77 90H23Z", fill: "#ffc1d5" })] }),
        video: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("rect", { x: "8", y: "18", width: "84", height: "63", rx: "13", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("path", { d: "m42 33 23 17-23 17Z", fill: "#ffda5d" })] }),
        apple: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { fill: "#ed6555", d: "M50 28C15 8 9 52 27 76q12 13 23 5 11 8 23-5C91 52 85 8 50 28Z" }), (0, jsx_runtime_1.jsx)("path", { d: "M50 29q-3-15 5-21", fill: "none" }), (0, jsx_runtime_1.jsx)("path", { d: "M53 21q3-17 20-10-3 15-20 10", fill: "#a7e7ae" })] }),
        ball: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "35", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("path", { d: "M50 15q-30 35 0 70M15 50h70M50 15q30 35 0 70", fill: "none" })] }),
        book: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { fill: "#83d8ef", d: "M10 18q20-5 40 6 20-11 40-6v62q-20-5-40 6-20-11-40-6Z" }), (0, jsx_runtime_1.jsx)("path", { d: "M50 24v62M21 36l18 3M21 50l18 3M61 39l18-3M61 53l18-3", fill: "none" })] }),
        cat: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M20 38V12l24 18h12L80 12v26q15 47-30 47T20 38", fill: "#ffda5d" }), eye, (0, jsx_runtime_1.jsx)("path", { d: "m45 56 5 5 5-5M50 61v8M18 57l20 4M82 57l-20 4", fill: "none" })] }),
        dog: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "53", rx: "30", ry: "32", fill: "#d7a47c" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "20", cy: "40", rx: "12", ry: "26", fill: "#ad7959" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "80", cy: "40", rx: "12", ry: "26", fill: "#ad7959" }), eye, (0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "61", rx: "10", ry: "8", fill: "#202020" }), smile] }),
        fish: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M70 40 92 22v56L70 60", fill: "#ffc1d5" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "40", cy: "50", rx: "32", ry: "25", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("circle", { cx: "25", cy: "45", r: "4", fill: "#202020" }), (0, jsx_runtime_1.jsx)("path", { d: "M50 27q-15 23 0 46", fill: "none" })] }),
        bird: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("ellipse", { cx: "48", cy: "52", rx: "29", ry: "30", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("path", { d: "m74 43 19 10-19 7", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("path", { d: "M23 55q25-24 28 7-22 15-28-7", fill: "#b6a2f7" }), (0, jsx_runtime_1.jsx)("circle", { cx: "61", cy: "41", r: "4", fill: "#202020" }), (0, jsx_runtime_1.jsx)("path", { d: "M40 80v12m18-12v12" })] }),
        cow: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M25 30 15 12l24 12m22 0 24-12-10 18", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("rect", { x: "23", y: "24", width: "54", height: "60", rx: "20", fill: "white" }), (0, jsx_runtime_1.jsx)("path", { d: "M23 30q27-10 20 15T23 56", fill: "#202020" }), eye, (0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "72", rx: "26", ry: "15", fill: "#ffc1d5" }), (0, jsx_runtime_1.jsx)("circle", { cx: "40", cy: "72", r: "3", fill: "#202020" }), (0, jsx_runtime_1.jsx)("circle", { cx: "60", cy: "72", r: "3", fill: "#202020" })] }),
        lion: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "39", fill: "#ff986c" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "27", fill: "#ffda5d" }), eye, (0, jsx_runtime_1.jsx)("path", { d: "m46 57 4 5 4-5" }), smile] }),
        rabbit: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("ellipse", { cx: "35", cy: "28", rx: "12", ry: "25", fill: "#fff9ed" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "65", cy: "28", rx: "12", ry: "25", fill: "#fff9ed" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "62", rx: "32", ry: "27", fill: "#fff9ed" }), (0, jsx_runtime_1.jsx)("circle", { cx: "38", cy: "56", r: "3" }), (0, jsx_runtime_1.jsx)("circle", { cx: "62", cy: "56", r: "3" }), (0, jsx_runtime_1.jsx)("path", { d: "m45 68 5 4 5-4", fill: "#ffc1d5" })] }),
        duck: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M78 65q-3 27-43 20T15 50l20 10V39q-4-27 25-25 25 1 20 27L62 55", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("path", { d: "m75 31 21 8-23 8", fill: "#ff986c" }), (0, jsx_runtime_1.jsx)("circle", { cx: "64", cy: "29", r: "3" })] }),
        elephant: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "22", cy: "48", r: "19", fill: "#b6a2f7" }), (0, jsx_runtime_1.jsx)("circle", { cx: "78", cy: "48", r: "19", fill: "#b6a2f7" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "44", r: "28", fill: "#b6a2f7" }), eye, (0, jsx_runtime_1.jsx)("path", { d: "M41 55v27q0 15 20 9l5-8", strokeWidth: "16", stroke: "#202020", fill: "none" }), (0, jsx_runtime_1.jsx)("path", { d: "M41 55v27q0 15 20 9l5-8", strokeWidth: "10", stroke: "#b6a2f7", fill: "none" })] }),
        turtle: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("ellipse", { cx: "47", cy: "76", rx: "26", ry: "8", fill: "#a7e7ae" }), (0, jsx_runtime_1.jsx)("circle", { cx: "83", cy: "55", r: "13", fill: "#a7e7ae" }), (0, jsx_runtime_1.jsx)("path", { d: "M10 67q0-63 61-21l8 21Z", fill: "#a7e7ae" }), (0, jsx_runtime_1.jsx)("path", { d: "m25 35 11 22-14 10m14-10 22-5 8-15M58 52l8 15", fill: "none" }), (0, jsx_runtime_1.jsx)("circle", { cx: "87", cy: "52", r: "2" })] }),
        butterfly: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M50 40C-7-17 1 64 39 58-5 82 50 104 50 65 50 104 105 82 61 58 99 64 107-17 50 40", fill: "#ffc1d5" }), (0, jsx_runtime_1.jsx)("path", { d: "M50 37v37m0-37L40 20m10 17L60 20", fill: "none" })] }),
        horse: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M37 16 22 8v23L13 60l30 10v20h38V37L62 17Z", fill: "#ad7959" }), (0, jsx_runtime_1.jsx)("path", { d: "m61 17 21 23v46H69V39Z", fill: "#202020" }), (0, jsx_runtime_1.jsx)("circle", { cx: "36", cy: "40", r: "4", fill: "white" }), (0, jsx_runtime_1.jsx)("path", { d: "M14 57h26" })] }),
        hat: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M27 64 32 24q18-16 36 0l5 40", fill: "#ffc1d5" }), (0, jsx_runtime_1.jsx)("ellipse", { cx: "50", cy: "68", rx: "42", ry: "14", fill: "#ff986c" }), (0, jsx_runtime_1.jsx)("path", { d: "M29 52h42" })] }),
        table: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M10 38h80v15H10Z", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("path", { d: "M20 53v32m60-32v32", strokeWidth: "8" })] }),
        chair: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("rect", { x: "29", y: "12", width: "42", height: "40", rx: "5", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("path", { d: "M23 55h54v14H23Z", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("path", { d: "M29 69v20m42-20v20M29 47v8m42-8v8", strokeWidth: "5" })] }),
        car: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "m15 45 17-24h35l18 24v30H15Z", fill: "#ff986c" }), (0, jsx_runtime_1.jsx)("path", { d: "M29 43 38 29h23l10 14Z", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("circle", { cx: "29", cy: "75", r: "10", fill: "#202020" }), (0, jsx_runtime_1.jsx)("circle", { cx: "71", cy: "75", r: "10", fill: "#202020" })] }),
        bag: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("rect", { x: "20", y: "30", width: "60", height: "55", rx: "9", fill: "#b6a2f7" }), (0, jsx_runtime_1.jsx)("path", { d: "M35 30V19q15-20 30 0v11", fill: "none" }), (0, jsx_runtime_1.jsx)("rect", { x: "30", y: "52", width: "40", height: "23", rx: "4", fill: "#ffc1d5" })] }),
        clock: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "37", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "29", fill: "#fff9ed" }), (0, jsx_runtime_1.jsx)("path", { d: "M50 28v22l16 10", fill: "none" })] }),
        house: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M20 44h60v43H20Z", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("path", { d: "m10 44 40-34 40 34Z", fill: "#ed6555" }), (0, jsx_runtime_1.jsx)("path", { d: "M42 87V61h17v26", fill: "#83d8ef" })] }),
        flower: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M50 50v40m0-15q-32-25-27-2 8 12 27 7", fill: "#a7e7ae" }), (0, jsx_runtime_1.jsxs)("g", { fill: "#ffc1d5", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "20", r: "14" }), (0, jsx_runtime_1.jsx)("circle", { cx: "29", cy: "35", r: "14" }), (0, jsx_runtime_1.jsx)("circle", { cx: "37", cy: "58", r: "14" }), (0, jsx_runtime_1.jsx)("circle", { cx: "63", cy: "58", r: "14" }), (0, jsx_runtime_1.jsx)("circle", { cx: "71", cy: "35", r: "14" })] }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "40", r: "15", fill: "#ffda5d" })] }),
        moon: (0, jsx_runtime_1.jsx)("path", { d: "M65 12C-5 7 0 100 70 85q22-6 20-22C44 91 22 35 65 12Z", fill: "#ffda5d" }),
        bread: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M21 40C-5 5 105 5 79 40v43H21Z", fill: "#e6af6c" }), (0, jsx_runtime_1.jsx)("path", { d: "M33 42v29h34V42", fill: "#ffda5d" })] }),
        cup: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M70 31q38-8 14 30H70", fill: "none" }), (0, jsx_runtime_1.jsx)("path", { d: "M20 25h54v46q-27 23-54 0Z", fill: "#83d8ef" })] }),
        tree: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M43 53h14v40H43Z", fill: "#ad7959" }), (0, jsx_runtime_1.jsx)("path", { d: "M26 69C-6 55 14 20 30 29 29-7 75-4 73 30c30-9 40 35 9 39Z", fill: "#a7e7ae" })] }),
        eye: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M5 50q45-58 90 0Q50 108 5 50Z", fill: "white" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "20", fill: "#ad7959" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "10", fill: "#202020" })] }),
        banana: (0, jsx_runtime_1.jsx)("path", { d: "M78 12C100 90 13 107 8 60c36 20 61-10 60-43Z", fill: "#ffda5d" }),
        palette: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "M48 10C-6 10-8 92 49 90 72 90 50 65 70 67 110 72 104 10 48 10Z", fill: "#ffc1d5" }), (0, jsx_runtime_1.jsx)("circle", { cx: "29", cy: "32", r: "8", fill: "#ed6555" }), (0, jsx_runtime_1.jsx)("circle", { cx: "57", cy: "26", r: "8", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("circle", { cx: "79", cy: "41", r: "8", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("circle", { cx: "23", cy: "60", r: "8", fill: "#a7e7ae" })] }),
        puzzle: (0, jsx_runtime_1.jsx)("path", { d: "M12 18h27c-10 30 32 30 22 0h27v27c-30-10-30 32 0 22v21H62c10-30-32-30-22 0H12V62c30 10 30-32 0-22Z", fill: "#b6a2f7" }),
        cards: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("rect", { x: "10", y: "18", width: "49", height: "65", rx: "8", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("rect", { x: "42", y: "10", width: "49", height: "65", rx: "8", fill: "#ffc1d5" }), (0, jsx_runtime_1.jsx)("path", { d: "m67 25 6 12 13 2-10 9 3 14-12-7-12 7 3-14-10-9 13-2Z", fill: "#ffda5d" })] }),
        search: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("circle", { cx: "42", cy: "42", r: "27", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("path", { d: "m63 63 26 26", strokeWidth: "12" })] }),
        basket: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("path", { d: "m14 42 12 43h48l12-43Z", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("path", { d: "m24 42 26-31 26 31M35 52l5 23m25-23-5 23", fill: "none" })] }),
        star: (0, jsx_runtime_1.jsx)("path", { d: "m50 7 13 27 30 4-22 22 5 30-26-14-26 14 5-30L7 38l30-4Z", fill: "#ffda5d" }),
        letter: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("rect", { x: "12", y: "12", width: "76", height: "76", rx: "15", fill: "#83d8ef" }), (0, jsx_runtime_1.jsx)("text", { x: "50", y: "73", textAnchor: "middle", fontSize: "64", fontWeight: "900", stroke: "none", fill: "#202020", children: "A" })] }),
        number: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("rect", { x: "12", y: "12", width: "76", height: "76", rx: "15", fill: "#ffda5d" }), (0, jsx_runtime_1.jsx)("text", { x: "50", y: "73", textAnchor: "middle", fontSize: "64", fontWeight: "900", stroke: "none", fill: "#202020", children: "3" })] })
    };
    return (0, jsx_runtime_1.jsx)("svg", { width: size, height: size, viewBox: "0 0 100 100", role: label ? 'img' : undefined, "aria-label": label, "aria-hidden": !label, fill: "none", stroke: "#202020", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", children: drawings[name] || drawings.star });
}

};
mods["src/components/Guide.tsx"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Guide = Guide;
const jsx_runtime_1 = require("react/jsx-runtime");
const Art_1 = require("./Art");
function Guide({ text, avatar = true, celebrate = false }) { return (0, jsx_runtime_1.jsxs)("div", { className: `guide ${celebrate ? 'celebrate' : ''}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "guide-avatar", children: avatar ? (0, jsx_runtime_1.jsx)("img", { src: "./assets/ghaffi-mascot.png", alt: "Karikatur Ghaffi, teman belajar" }) : (0, jsx_runtime_1.jsx)(Art_1.Art, { name: "star", size: 64 }) }), (0, jsx_runtime_1.jsx)("div", { className: "bubble", role: "status", "aria-live": "polite", children: text })] }); }

};
mods["src/components/MemoryGame.tsx"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemoryGame;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const curriculum_1 = require("../data/curriculum");
const memory_1 = require("../engine/memory");
const speech_1 = require("../services/speech");
const Art_1 = require("./Art");
const Guide_1 = require("./Guide");
function MemoryGame({ settings, offset, onDone }) {
    const maxBoards = settings.sessionLength === 'all' ? curriculum_1.memorySets.length : 3;
    const [round, setRound] = (0, react_1.useState)(0);
    const [total, setTotal] = (0, react_1.useState)(0);
    const setup = (r) => (0, memory_1.memoryStart)(curriculum_1.memorySets[(offset + r) % 5].slice(0, settings.level === 1 ? 2 : settings.level === 2 ? 3 : 4), offset + r);
    const [s, setS] = (0, react_1.useState)(() => setup(0));
    const complete = s.matched.length === s.deck.length;
    const [hint, setHint] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => { (0, speech_1.speak)(s.message, settings.narrator); return speech_1.stopAll; }, [s.message]);
    function next() { if (round === maxBoards - 1)
        onDone(total + s.moves);
    else {
        setTotal(total + s.moves);
        setRound(round + 1);
        setS(setup(round + 1));
        setHint(false);
    } }
    return (0, jsx_runtime_1.jsxs)("section", { className: "player", children: [(0, jsx_runtime_1.jsxs)("div", { className: "round-bar", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Papan ", round + 1, " dari ", maxBoards] }), (0, jsx_runtime_1.jsxs)("span", { children: [s.matched.length / 2, " pasangan ditemukan"] })] }), (0, jsx_runtime_1.jsx)(Guide_1.Guide, { text: complete ? 'Semua pasangan ketemu! Terima kasih sudah mencoba.' : s.message, avatar: settings.avatar, celebrate: complete }), (0, jsx_runtime_1.jsx)("h2", { children: "Di mana pasangan gambarnya?" }), (0, jsx_runtime_1.jsx)("p", { children: "Buka dua kartu. Tidak perlu cepat-cepat." }), (0, jsx_runtime_1.jsx)("div", { className: "memory-grid", children: s.deck.map((art, i) => { const face = s.open.includes(i) || s.matched.includes(i) || hint; return (0, jsx_runtime_1.jsxs)("button", { "data-card": i, className: `memory-card ${s.matched.includes(i) ? 'matched' : ''}`, disabled: s.matched.includes(i) || s.open.length === 2 || s.open.includes(i), "aria-label": `Kartu ${i + 1}${face ? `, ${curriculum_1.artLabels[art]}` : ', tertutup'}`, "aria-pressed": face, onClick: () => { setHint(false); setS((0, memory_1.flip)(s, i)); }, children: [face ? (0, jsx_runtime_1.jsx)(Art_1.Art, { name: art, size: 80 }) : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "card-question", children: "?" }), (0, jsx_runtime_1.jsx)("small", { children: i + 1 })] }), s.matched.includes(i) && (0, jsx_runtime_1.jsx)("span", { children: "\u2713" })] }, i); }) }), complete ? (0, jsx_runtime_1.jsxs)("button", { className: "primary next", onClick: next, children: [round === maxBoards - 1 ? 'Lihat hasil bermain' : 'Papan berikutnya', " \u2192"] }) : s.open.length === 2 ? (0, jsx_runtime_1.jsx)("button", { className: "primary next", autoFocus: true, onClick: () => { setS((0, memory_1.closePair)(s)); setHint(false); }, children: "Tutup kartu, lanjut cari" }) : (0, jsx_runtime_1.jsxs)("div", { className: "controls", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => (0, speech_1.speak)(s.message, settings.narrator), children: "\u21BB Ulangi" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { setHint(!hint); (0, speech_1.speak)(hint ? 'Sekarang cari pasangannya.' : 'Lihat semua gambar. Ingat letaknya, lalu tutup petunjuk.', settings.narrator); }, children: hint ? 'Tutup petunjuk' : 'Bantu aku' })] })] });
}

};
mods["src/components/NarratorSettings.tsx"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NarratorSettings = NarratorSettings;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const narrator_1 = require("../services/narrator");
const speech_1 = require("../services/speech");
function NarratorSettings({ settings, onChange }) {
    const [voices, setVoices] = (0, react_1.useState)([]);
    const [status, setStatus] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        if (!('speechSynthesis' in window))
            return;
        const synth = window.speechSynthesis;
        const update = () => setVoices(synth.getVoices());
        update();
        synth.addEventListener?.('voiceschanged', update);
        return () => synth.removeEventListener?.('voiceschanged', update);
    }, []);
    return (0, jsx_runtime_1.jsxs)("div", { className: "narrator-settings", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Kakak Ceria \u2014 jelas & tegas" }), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Nada mendekati suara asli, tempo bisa diperlambat, dan volume tetap jelas. Preset lama Ceria/Lembut sudah diganti. Pilih suara perempuan yang terdengar nyaman, lalu coba sebelum bermain." }), (0, jsx_runtime_1.jsxs)("label", { children: ["Kecepatan narator", (0, jsx_runtime_1.jsxs)("select", { value: settings.voiceSpeed, onChange: e => onChange({ voiceSpeed: Number(e.target.value) }), children: [(0, jsx_runtime_1.jsx)("option", { value: 0.65, children: "0,65\u00D7 \u2014 sangat lambat" }), (0, jsx_runtime_1.jsx)("option", { value: 0.75, children: "0,75\u00D7 \u2014 lambat" }), (0, jsx_runtime_1.jsx)("option", { value: 0.85, children: "0,85\u00D7 \u2014 agak lambat" }), (0, jsx_runtime_1.jsx)("option", { value: 0.95, children: "0,95\u00D7 \u2014 sedikit lambat" }), (0, jsx_runtime_1.jsx)("option", { value: 1, children: "1,00\u00D7 \u2014 normal" }), (0, jsx_runtime_1.jsx)("option", { value: 1.05, children: "1,05\u00D7 \u2014 biasa (default)" }), (0, jsx_runtime_1.jsx)("option", { value: 1.15, children: "1,15\u00D7 \u2014 lebih sigap" }), (0, jsx_runtime_1.jsx)("option", { value: 1.25, children: "1,25\u00D7 \u2014 cepat" }), (0, jsx_runtime_1.jsx)("option", { value: 1.35, children: "1,35\u00D7 \u2014 lebih cepat" })] })] }), ['id-ID', 'en-US'].map(lang => {
                const key = lang === 'id-ID' ? 'voiceId' : 'voiceEn';
                const options = (0, narrator_1.languageVoices)(voices, lang);
                const missing = settings[key] && !options.some(v => (0, narrator_1.voiceKey)(v) === settings[key]);
                return (0, jsx_runtime_1.jsxs)("label", { children: ["Suara ", lang === 'id-ID' ? 'Indonesia' : 'English', (0, jsx_runtime_1.jsxs)("select", { disabled: !options.length, value: settings[key], onChange: e => onChange({ [key]: e.target.value }), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Otomatis \u2014 kandidat suara perempuan" }), missing && (0, jsx_runtime_1.jsx)("option", { value: settings[key], children: "Pilihan sebelumnya tidak tersedia (pakai otomatis)" }), options.map(v => (0, jsx_runtime_1.jsxs)("option", { value: (0, narrator_1.voiceKey)(v), children: [v.name, (0, narrator_1.femaleCandidateScore)(v) === 0 ? " — dengarkan dulu" : ""] }, (0, narrator_1.voiceKey)(v)))] }), !options.length && (0, jsx_runtime_1.jsx)("span", { className: "note", children: "Belum ada pilihan yang sesuai. Tunggu daftar suara dimuat atau periksa suara yang terpasang pada perangkat." })] }, lang);
            }), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Browser tidak menyediakan informasi gender atau kontrol desahan. Pemilihan otomatis memakai petunjuk nama voice; suara yang belum dikenali perlu dipilih dan didengarkan pendamping. Jika suara perempuan yang dikenali tidak ada, aplikasi mencoba suara lain yang cocok dengan bahasanya. Periksa suaranya melalui tombol Coba." }), (0, jsx_runtime_1.jsx)("button", { onClick: () => (0, speech_1.speak)('Hello! Ready to play? Count with me. One, two, three. Well done!', settings.narrator, 'en-US', setStatus), children: "Coba suara English" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { (0, speech_1.stopAll)(); setStatus('Suara dihentikan.'); }, children: "Hentikan contoh" }), status && (0, jsx_runtime_1.jsx)("p", { className: "note", role: "status", children: status })] });
}

};
mods["src/components/Quiz.tsx"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChoiceVisual = ChoiceVisual;
exports.default = Quiz;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const curriculum_1 = require("../data/curriculum");
const dialog_1 = require("../engine/dialog");
const speech_1 = require("../services/speech");
const Art_1 = require("./Art");
const Guide_1 = require("./Guide");
function ChoiceVisual({ choice, arabic = false }) { return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [choice.count !== undefined && (0, jsx_runtime_1.jsx)("span", { className: "choice-objects", "aria-label": `${choice.count} apel`, children: Array.from({ length: choice.count }, (_, i) => (0, jsx_runtime_1.jsx)(Art_1.Art, { name: "apple", size: 34 }, i)) }), choice.art && (0, jsx_runtime_1.jsx)(Art_1.Art, { name: choice.art, size: 90 }), choice.color && (0, jsx_runtime_1.jsx)("span", { className: "swatch", style: { background: choice.color } }), (0, jsx_runtime_1.jsx)("span", { className: arabic ? 'arabic' : !choice.art && !choice.color && choice.count === undefined ? 'big-type' : '', lang: arabic ? 'ar' : undefined, dir: arabic ? 'rtl' : undefined, children: choice.label })] }); }
function Quiz({ questions, settings, mic, demo, onDone, onQuit }) {
    const [s, dispatch] = (0, react_1.useReducer)(dialog_1.reducer, dialog_1.initial);
    const [status, setStatus] = (0, react_1.useState)('Mikrofon mati.');
    const [marked, setMarked] = (0, react_1.useState)([]);
    const [typed, setTyped] = (0, react_1.useState)('');
    const finished = (0, react_1.useRef)(false);
    const q = questions[s.round];
    const options = (0, curriculum_1.visibleChoices)(q, settings.level, s.errors);
    const done = s.phase === 'PRAISE';
    const read = (text) => { dispatch({ type: 'STOP' }); (0, speech_1.speak)(text, settings.narrator, 'id-ID', setStatus); };
    (0, react_1.useEffect)(() => { (0, speech_1.speak)(q.spoken || q.prompt, settings.narrator, 'id-ID', setStatus); setMarked([]); document.getElementById('question-title')?.focus(); return speech_1.stopAll; }, [s.round]);
    (0, react_1.useEffect)(() => { if (s.message)
        (0, speech_1.speak)(s.message, settings.narrator, 'id-ID', setStatus); }, [s.message]);
    (0, react_1.useEffect)(() => { if (!mic) {
        (0, speech_1.stopMic)();
        dispatch({ type: 'STOP' });
    } }, [mic]);
    (0, react_1.useEffect)(() => { if (s.phase === 'COMPLETE' && !finished.current) {
        finished.current = true;
        onDone(s.attempts, questions.length);
    } }, [s.phase]);
    function answer(id) { (0, speech_1.stopAll)(); dispatch({ type: 'ANSWER', id, q }); }
    function voice(text) { const intent = (0, dialog_1.interpret)(text, options); if (intent.type === 'choice')
        answer(intent.id);
    else if (intent.type === 'command') {
        if (intent.command === 'repeat')
            read(q.spoken || q.prompt);
        if (intent.command === 'hint')
            dispatch({ type: 'HINT', q });
        if (intent.command === 'quit')
            onQuit();
        if (intent.command === 'skip')
            setStatus('Boleh berhenti atau pilih petunjuk. Kita belajar tanpa terburu-buru.');
    }
    else
        dispatch({ type: 'UNKNOWN' }); }
    const object = (i) => (0, jsx_runtime_1.jsxs)("button", { className: `count-object ${marked.includes(i) ? 'marked' : ''}`, "aria-label": `Apel ${i + 1}${marked.includes(i) ? ', sudah dihitung' : ''}`, "aria-pressed": marked.includes(i), disabled: done, onClick: () => { if (!marked.includes(i)) {
            setMarked([...marked, i]);
            read(String(marked.length + 1));
        } }, children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: "apple", size: 56 }), (0, jsx_runtime_1.jsx)("span", { children: marked.includes(i) ? '✓' : i + 1 })] }, i);
    return (0, jsx_runtime_1.jsxs)("section", { className: "player", "aria-label": "Permainan", children: [(0, jsx_runtime_1.jsxs)("div", { className: "round-bar", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Soal ", s.round + 1, " dari ", questions.length] }), (0, jsx_runtime_1.jsx)("div", { className: "round-progress", role: "progressbar", "aria-label": "Kemajuan soal", "aria-valuenow": s.round + 1, "aria-valuemin": 1, "aria-valuemax": questions.length, children: (0, jsx_runtime_1.jsx)("span", { style: { width: `${(s.round + 1) / questions.length * 100}%` } }) }), (0, jsx_runtime_1.jsx)("span", { children: "Pelan-pelan saja" })] }), (0, jsx_runtime_1.jsx)(Guide_1.Guide, { text: s.message || q.prompt, avatar: settings.avatar, celebrate: done }), (0, jsx_runtime_1.jsxs)("div", { className: "question-stage", children: [(0, jsx_runtime_1.jsx)("h2", { id: "question-title", tabIndex: -1, children: q.prompt }), q.pronunciation && (0, jsx_runtime_1.jsxs)("div", { className: "pronounce", children: [(0, jsx_runtime_1.jsxs)("strong", { children: ["Huruf: ", q.pronunciation] }), (0, jsx_runtime_1.jsxs)("button", { onClick: () => read(`${q.pronunciation}. ${q.pronunciation}.`), children: ["\uD83D\uDD0A Dengar: ", q.pronunciation] }), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Suara panduan Bahasa Indonesia dari perangkat. Untuk makhraj Arab yang tepat, dengarkan bersama pendamping." })] }), q.target && (0, jsx_runtime_1.jsx)("div", { className: `target ${q.activity === 'H01' ? 'arabic-target' : ''}`, children: (0, jsx_runtime_1.jsx)(ChoiceVisual, { choice: q.target, arabic: q.activity === 'H01' }) }), q.pattern && (0, jsx_runtime_1.jsxs)("div", { className: "pattern-row", children: [q.pattern.map((c, i) => (0, jsx_runtime_1.jsx)("div", { className: "pattern-item", children: (0, jsx_runtime_1.jsx)(ChoiceVisual, { choice: c }) }, i)), (0, jsx_runtime_1.jsx)("div", { className: "pattern-item missing", children: "?" })] }), q.subtract && (0, jsx_runtime_1.jsxs)("div", { className: "subtraction-removed", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Diambil: ", q.subtract[1], " apel"] }), (0, jsx_runtime_1.jsx)("div", { className: "removed-objects", children: Array.from({ length: q.subtract[1] }, (_, i) => (0, jsx_runtime_1.jsxs)("span", { className: "removed-apple", "aria-label": "Apel sudah diambil", children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: "apple", size: 52 }), (0, jsx_runtime_1.jsx)("b", { "aria-hidden": "true", children: "\u00D7" })] }, i)) }), (0, jsx_runtime_1.jsx)("strong", { children: "Hitung apel yang masih utuh:" }), q.objects === 0 && (0, jsx_runtime_1.jsx)("p", { children: "Tidak ada apel tersisa." })] }), q.objects !== undefined && (0, jsx_runtime_1.jsxs)("div", { className: "counting-area", children: [q.addends ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "object-group", children: Array.from({ length: q.addends[0] }, (_, i) => object(i)) }), (0, jsx_runtime_1.jsx)("strong", { className: "plus", children: "+" }), (0, jsx_runtime_1.jsx)("div", { className: "object-group", children: Array.from({ length: q.addends[1] }, (_, i) => object(i + q.addends[0])) })] }) : (0, jsx_runtime_1.jsx)("div", { className: "object-group", children: Array.from({ length: q.objects }, (_, i) => object(i)) }), (0, jsx_runtime_1.jsxs)("p", { className: "count-label", children: [marked.length, " apel sudah disentuh"] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "answers", style: { '--choices': options.length }, children: options.map((c, i) => (0, jsx_runtime_1.jsxs)("button", { "data-answer": c.id, disabled: done, className: `answer option-${i} ${s.errors >= 2 && c.id === q.answer ? 'hinted' : ''} ${done && c.id === q.answer ? 'correct' : ''}`, onClick: () => answer(c.id), "aria-label": `Pilih ${c.label}`, children: [(0, jsx_runtime_1.jsx)(ChoiceVisual, { choice: c, arabic: q.activity === 'H01' }), s.errors >= 2 && c.id === q.answer && (0, jsx_runtime_1.jsx)("span", { className: "hint-tag", children: "\u2605 Coba ini" }), done && c.id === q.answer && (0, jsx_runtime_1.jsx)("span", { children: "\u2713 Cocok!" })] }, c.id)) }), done ? (0, jsx_runtime_1.jsxs)("button", { autoFocus: true, className: "primary next", onClick: () => dispatch({ type: 'NEXT', total: questions.length }), children: [s.round === questions.length - 1 ? 'Lihat hasil bermain' : 'Ayo, coba yang berikutnya', " \u2192"] }) : (0, jsx_runtime_1.jsxs)("div", { className: "controls", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => read(q.spoken || q.prompt), children: "\u21BB Ulangi" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { (0, speech_1.stopAll)(); dispatch({ type: 'HINT', q }); }, children: "Bantu aku" }), q.english && (0, jsx_runtime_1.jsx)("button", { onClick: () => { dispatch({ type: 'STOP' }); (0, speech_1.speak)(q.english, settings.narrator, 'en-US', setStatus); }, children: "Dengar English" }), mic && (0, speech_1.capabilities)().mic && (s.phase === 'LISTENING' ? (0, jsx_runtime_1.jsx)("button", { className: "pink", onClick: () => { (0, speech_1.stopMic)(); dispatch({ type: 'STOP' }); setStatus('Mikrofon mati.'); }, children: "Hentikan mikrofon" }) : (0, jsx_runtime_1.jsx)("button", { className: "sky", onClick: () => { dispatch({ type: 'LISTEN' }); (0, speech_1.listen)(voice, setStatus, () => dispatch({ type: 'STOP' })); }, children: "Jawab pakai suara" }))] }), (0, jsx_runtime_1.jsx)("p", { className: "audio-status", role: "status", children: status }), demo && (0, jsx_runtime_1.jsxs)("form", { className: "demo", onSubmit: e => { e.preventDefault(); voice(typed); setTyped(''); }, children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Demo orang tua (tidak disimpan)", (0, jsx_runtime_1.jsx)("input", { value: typed, onChange: e => setTyped(e.target.value), autoComplete: "off", maxLength: 80 })] }), (0, jsx_runtime_1.jsx)("button", { disabled: done, children: "Kirim jawaban" }), (0, jsx_runtime_1.jsxs)("code", { children: ["State: ", s.phase, " \u00B7 attempts: ", s.attempts] })] })] });
}

};
mods["src/components/Songbook.tsx"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Songbook;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const speech_1 = require("../services/speech");
const songs = [
    { id: 'abc', title: 'Petualangan A sampai Z', subtitle: '26 huruf, satu petualangan', emoji: '🔤', bpm: 116,
        lines: ['A B C D, ayo bernyanyi', 'E F G H, melangkah lagi', 'I J K L M N, teman bermain', 'O P Q R S T, semuanya senang', 'U V W X Y Z, kita hebat hari ini!'],
        notes: [60, 62, 64, 65, 67, 67, 65, 64, 62, 60, 62, 64, 65, 67, 69, 67, 65, 64, 62, 60] },
    { id: 'angka', title: 'Langkah Angka', subtitle: 'Satuan, belasan, puluhan', emoji: '🔢', bpm: 110,
        lines: ['Satu dua tiga, ayo hitung bersama', 'Empat lima enam, tepuk tangan ceria', 'Tujuh delapan sembilan, sepuluh!', 'Sebelas dua belas, terus bertambah', 'Dua puluh, tiga puluh, empat puluh, hebat!'],
        notes: [60, 60, 64, 64, 67, 67, 64, 62, 62, 65, 65, 69, 69, 67, 65, 64, 62, 60, 62, 60] },
    { id: 'hijaiyah', title: 'Riang Alif Ba Ta', subtitle: 'Kenali nama huruf hijaiyah', emoji: '🌙', bpm: 100,
        lines: ['Alif, Ba, Ta, Tsa, mari kenali semua', 'Jim, Ha, Kha, Dal, Dzal, Ra', 'Zai, Sin, Syin, Shad, Dhad, Tha', 'Zha, Ain, Ghain, Fa, Qaf, Kaf', 'Lam, Mim, Nun, Wau, Ha, Lam Alif, Hamzah, Ya'],
        notes: [60, 62, 64, 62, 60, 64, 67, 65, 64, 62, 60, 62, 64, 65, 67, 69, 67, 65, 64, 60] },
    { id: 'hewan', title: 'Halo, Teman Hewan!', subtitle: 'Sapi, kucing, burung dan lainnya', emoji: '🐮', bpm: 120,
        lines: ['Sapi di padang, makan rumput hijau', 'Kucing yang manis, suka ikan juga', 'Burung di pohon, bernyanyi ceria', 'Kelinci berlari, melompat ke sana', 'Semua hewan punya rumah dan makanan'],
        notes: [64, 64, 67, 67, 69, 67, 64, 62, 62, 65, 65, 67, 65, 62, 60, 62, 64, 60, 62, 60] },
];
const AudioContextClass = () => window.AudioContext;
function tone(ctx, frequency, at, duration) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(.105, at + .025);
    gain.gain.setValueAtTime(.105, Math.max(at + .04, at + duration - .085));
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + .02);
}
function Songbook({ settings }) {
    const [current, setCurrent] = (0, react_1.useState)(songs[0].id), [playing, setPlaying] = (0, react_1.useState)(false), [line, setLine] = (0, react_1.useState)(0), [message, setMessage] = (0, react_1.useState)('');
    const ctxRef = (0, react_1.useRef)(null);
    const rafRef = (0, react_1.useRef)(0);
    const startRef = (0, react_1.useRef)(0);
    const track = songs.find(s => s.id === current) || songs[0];
    function stop() { cancelAnimationFrame(rafRef.current); const ctx = ctxRef.current; ctxRef.current = null; if (ctx)
        void ctx.close().catch(() => { }); setPlaying(false); }
    (0, react_1.useEffect)(() => () => { cancelAnimationFrame(rafRef.current); if (ctxRef.current)
        void ctxRef.current.close().catch(() => { }); }, []);
    function play() {
        stop();
        (0, speech_1.stopAll)();
        setMessage('');
        if (!AudioContextClass()) {
            setMessage('Perangkat belum mendukung pemutar melodi. Lirik tetap bisa dibaca.');
            return;
        }
        try {
            const ctx = new (AudioContextClass())();
            ctxRef.current = ctx;
            void ctx.resume();
            const step = 60 / track.bpm;
            const at = ctx.currentTime + .12;
            startRef.current = at;
            // 20 ketukan membentuk sebuah lagu pendek; setiap bait mengikuti empat ketukan.
            track.notes.forEach((midi, i) => tone(ctx, 440 * Math.pow(2, (midi - 69) / 12), at + i * step, step * .8));
            setLine(0);
            setPlaying(true);
            const update = () => {
                if (ctxRef.current !== ctx)
                    return;
                const elapsed = ctx.currentTime - startRef.current;
                setLine(Math.max(0, Math.min(track.lines.length - 1, Math.floor(elapsed / (step * 4)))));
                if (elapsed >= track.notes.length * step) {
                    void ctx.close().catch(() => { });
                    ctxRef.current = null;
                    setPlaying(false);
                    return;
                }
                rafRef.current = requestAnimationFrame(update);
            };
            rafRef.current = requestAnimationFrame(update);
        }
        catch {
            setMessage('Audio tidak dapat dimulai. Coba tekan Putar lagi.');
            setPlaying(false);
        }
    }
    return (0, jsx_runtime_1.jsxs)("section", { className: "songbook", "aria-label": "Lagu anak GhaffiLand", children: [(0, jsx_runtime_1.jsxs)("div", { className: "songs-heading", children: [(0, jsx_runtime_1.jsx)("span", { className: "eyebrow", children: "BIOSKOP MUSIK \u00B7 ASLI GHAFFILAND" }), (0, jsx_runtime_1.jsx)("h1", { "data-heading": true, tabIndex: -1, children: "Ayo, bernyanyi! \uD83C\uDFB6" }), (0, jsx_runtime_1.jsx)("p", { children: "Empat lagu dengan melodi instrumental dan lirik buatan khusus. Tekan bait untuk mendengar kata-katanya lewat narator." })] }), (0, jsx_runtime_1.jsx)("div", { className: "song-tiles", children: songs.map(s => (0, jsx_runtime_1.jsxs)("button", { className: 'song-tile ' + (current === s.id ? 'selected' : ''), onClick: () => { stop(); setCurrent(s.id); setLine(0); }, children: [(0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: s.emoji }), (0, jsx_runtime_1.jsx)("strong", { children: s.title }), (0, jsx_runtime_1.jsx)("small", { children: s.subtitle })] }, s.id)) }), (0, jsx_runtime_1.jsxs)("div", { className: "song-player", children: [(0, jsx_runtime_1.jsx)("div", { className: "song-disc", "aria-hidden": "true", children: track.emoji }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "eyebrow", children: "SEDANG DIPILIH" }), (0, jsx_runtime_1.jsx)("h2", { children: track.title }), (0, jsx_runtime_1.jsx)("p", { children: "Ketuk Putar untuk mendengar melodi. Ketuk setiap baris agar Ghaffi bisa mendengar teks." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "song-controls", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary", onClick: playing ? stop : play, children: playing ? '⏹ Hentikan lagu' : '▶ Putar lagu' }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { stop(); (0, speech_1.stopAll)(); setMessage('Semua suara dihentikan.'); }, children: "Hentikan semua suara" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "lyrics", "aria-label": "Lirik lagu", children: track.lines.map((l, i) => (0, jsx_runtime_1.jsxs)("button", { className: playing && line === i ? 'singing' : '', onClick: () => { stop(); (0, speech_1.speak)(l, settings.narrator, 'id-ID', setMessage); setLine(i); }, children: [(0, jsx_runtime_1.jsx)("span", { children: "\u266A" }), l, (0, jsx_runtime_1.jsx)("small", { children: "\uD83D\uDD0A" })] }, `${track.id}-${i}`)) }), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Melodi dimainkan oleh browser dan bisa dipakai tanpa internet setelah halaman dimuat. Narasi baris menggunakan suara perangkat, bukan rekaman penyanyi. Hijaiyah dalam lagu memakai nama Latin sebagai panduan awal; pelafalan Arab tetap perlu pendamping." }), message && (0, jsx_runtime_1.jsx)("p", { role: "status", className: "audio-status", children: message })] });
}

};
mods["src/components/Story.tsx"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Story;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const story_1 = require("../data/story");
const speech_1 = require("../services/speech");
const Guide_1 = require("./Guide");
const Art_1 = require("./Art");
function Story({ settings, onDone }) { const [node, setNode] = (0, react_1.useState)('start'); const [step, setStep] = (0, react_1.useState)(0); const scene = story_1.story[node]; (0, react_1.useEffect)(() => { (0, speech_1.speak)(scene.text, settings.narrator); return speech_1.stopAll; }, [node]); return (0, jsx_runtime_1.jsxs)("section", { className: "player story", children: [(0, jsx_runtime_1.jsxs)("div", { className: "round-bar", children: [(0, jsx_runtime_1.jsx)("span", { children: "Piknik kecil Ghaffi" }), (0, jsx_runtime_1.jsx)("span", { children: scene.choices.length ? `Pilihan ${step + 1} dari 3` : 'Tamat' })] }), (0, jsx_runtime_1.jsx)("div", { className: "story-art", children: (0, jsx_runtime_1.jsx)(Art_1.Art, { name: scene.art, size: 160 }) }), (0, jsx_runtime_1.jsx)(Guide_1.Guide, { text: scene.text, avatar: settings.avatar }), (0, jsx_runtime_1.jsx)("div", { className: "answers", children: scene.choices.map(c => (0, jsx_runtime_1.jsxs)("button", { className: "answer", onClick: () => { setNode(c.next); setStep(step + 1); }, children: [(0, jsx_runtime_1.jsx)(Art_1.Art, { name: c.art, size: 80 }), (0, jsx_runtime_1.jsx)("span", { children: c.label })] }, c.next)) }), (0, jsx_runtime_1.jsxs)("div", { className: "controls", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => (0, speech_1.speak)(scene.text, settings.narrator), children: "\u21BB Bacakan lagi" }), !scene.choices.length && (0, jsx_runtime_1.jsx)("button", { className: "primary", onClick: () => onDone(3), children: "Selesai bercerita \u2192" })] })] }); }

};
mods["src/components/VideoLesson.tsx"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VideoLesson;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const videoLessons_1 = require("../data/videoLessons");
const curriculum_1 = require("../data/curriculum");
const dialog_1 = require("../engine/dialog");
const speech_1 = require("../services/speech");
const Guide_1 = require("./Guide");
const Quiz_1 = require("./Quiz");
function VideoLesson({ lessonIndex, settings, onDone }) {
    const [s, dispatch] = (0, react_1.useReducer)(dialog_1.reducer, dialog_1.initial);
    const [mode, setMode] = (0, react_1.useState)('watch');
    const [status, setStatus] = (0, react_1.useState)('Tekan Putar video untuk mulai.');
    const [playing, setPlaying] = (0, react_1.useState)(false);
    const [mediaError, setMediaError] = (0, react_1.useState)(false);
    const video = (0, react_1.useRef)(null);
    const completed = (0, react_1.useRef)(false);
    const lesson = videoLessons_1.videoLessons[lessonIndex];
    const clip = lesson.clips[s.round];
    const q = (0, videoLessons_1.videoQuestion)(lessonIndex, s.round);
    const options = (0, curriculum_1.visibleChoices)(q, settings.level, s.errors);
    const videoDisabled = !settings.motion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    (0, react_1.useEffect)(() => {
        const node = video.current;
        const hide = () => { if (document.hidden) {
            node?.pause();
            (0, speech_1.stopAll)();
        } };
        document.addEventListener('visibilitychange', hide);
        return () => { document.removeEventListener('visibilitychange', hide); node?.pause(); (0, speech_1.stopAll)(); };
    }, [s.round, mode]);
    (0, react_1.useEffect)(() => { if (mode === 'question')
        document.getElementById('video-question-title')?.focus(); }, [mode, s.round]);
    (0, react_1.useEffect)(() => { if (s.phase === 'COMPLETE' && !completed.current) {
        completed.current = true;
        onDone(s.attempts);
    } }, [s.phase]);
    (0, react_1.useEffect)(() => { if (s.message && mode === 'question')
        (0, speech_1.speak)(s.message, settings.narrator, 'id-ID', setStatus); }, [s.message, mode]);
    function ask() { video.current?.pause(); (0, speech_1.stopAll)(); setPlaying(false); setMode('question'); setStatus('Pilih jawabanmu.'); (0, speech_1.speak)(q.spoken || q.prompt, settings.narrator, 'id-ID', setStatus); }
    async function play() { if (!video.current)
        return; try {
        await video.current.play();
    }
    catch {
        setMediaError(true);
        setStatus('Video belum dapat diputar. Lihat gambar dan bacaan, lalu jawab.');
    } }
    function pause() { video.current?.pause(); setPlaying(false); (0, speech_1.stopAll)(); setStatus('Video dijeda.'); }
    function next() { setMode('watch'); setPlaying(false); setMediaError(false); setStatus('Tekan Putar video untuk adegan berikutnya.'); dispatch({ type: 'NEXT' }); }
    return (0, jsx_runtime_1.jsxs)("section", { className: "player video-lesson", children: [(0, jsx_runtime_1.jsxs)("div", { className: "round-bar", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Adegan ", s.round + 1, " dari 3"] }), (0, jsx_runtime_1.jsx)("span", { children: "Video lokal \u00B7 tanpa iklan" })] }), (0, jsx_runtime_1.jsx)("h2", { "data-heading": true, tabIndex: -1, children: lesson.title }), mode === 'watch' ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [videoDisabled || mediaError ? (0, jsx_runtime_1.jsx)("img", { className: "learning-video", src: (0, videoLessons_1.mediaUrl)(clip.id, 'jpg'), alt: `${clip.label}. ${clip.caption}` }) : (0, jsx_runtime_1.jsx)("video", { ref: video, className: "learning-video", src: (0, videoLessons_1.mediaUrl)(clip.id, 'mp4'), poster: (0, videoLessons_1.mediaUrl)(clip.id, 'jpg'), playsInline: true, muted: true, preload: "metadata", "aria-label": clip.label, onPlay: () => { setPlaying(true); (0, speech_1.speak)(clip.caption, settings.narrator, 'id-ID', setStatus); }, onPause: () => setPlaying(false), onEnded: ask, onError: () => { (0, speech_1.stopAll)(); setPlaying(false); setMediaError(true); setStatus('Video tidak didukung. Gambar dan pertanyaan tetap tersedia.'); } }, clip.id), (0, jsx_runtime_1.jsx)("p", { className: "video-caption", children: clip.caption }), videoDisabled && (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Gerak dimatikan. Belajar lewat gambar dan pertanyaan tetap tersedia." }), (0, jsx_runtime_1.jsxs)("div", { className: "controls", children: [!videoDisabled && !mediaError && (playing ? (0, jsx_runtime_1.jsx)("button", { onClick: pause, children: "Jeda video" }) : (0, jsx_runtime_1.jsx)("button", { className: "primary", onClick: play, children: "\u25B6 Putar video" })), (0, jsx_runtime_1.jsx)("button", { onClick: () => (0, speech_1.speak)(clip.caption, settings.narrator, 'id-ID', setStatus), children: "Bacakan adegan" }), (0, jsx_runtime_1.jsx)("button", { onClick: ask, children: "Langsung ke pertanyaan \u2192" })] })] }) : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(Guide_1.Guide, { text: s.message || q.prompt, avatar: settings.avatar, celebrate: s.phase === 'PRAISE' }), (0, jsx_runtime_1.jsx)("h3", { id: "video-question-title", tabIndex: -1, children: q.prompt }), (0, jsx_runtime_1.jsx)("img", { className: "video-recap", src: (0, videoLessons_1.mediaUrl)(clip.id, 'jpg'), alt: clip.label }), (0, jsx_runtime_1.jsx)("div", { className: "answers", style: { '--choices': options.length }, children: options.map((c, i) => (0, jsx_runtime_1.jsxs)("button", { "data-answer": c.id, className: `answer option-${i} ${s.errors >= 2 && c.id === q.answer ? 'hinted' : ''}`, disabled: s.phase === 'PRAISE', onClick: () => dispatch({ type: 'ANSWER', id: c.id, q }), "aria-label": `Pilih ${c.label}`, children: [(0, jsx_runtime_1.jsx)(Quiz_1.ChoiceVisual, { choice: c }), s.errors >= 2 && c.id === q.answer && (0, jsx_runtime_1.jsx)("span", { className: "hint-tag", children: "\u2605 Coba ini" })] }, c.id)) }), s.phase === 'PRAISE' ? (0, jsx_runtime_1.jsxs)("button", { className: "primary next", onClick: next, children: [s.round === 2 ? 'Lihat hasil bermain' : 'Lanjut adegan berikutnya', " \u2192"] }) : (0, jsx_runtime_1.jsxs)("div", { className: "controls", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => { dispatch({ type: 'HINT', q }); }, children: "Bantu aku" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { (0, speech_1.stopAll)(); setMode('watch'); setStatus('Ayo lihat lagi adegannya.'); }, children: "Tonton adegan lagi" })] })] }), (0, jsx_runtime_1.jsx)("p", { className: "audio-status", role: "status", children: status }), (0, jsx_runtime_1.jsx)("p", { className: "note", children: "Video animasi tanpa suara rekaman. Narasi memakai pilihan suara browser. Tiap adegan diputar atas pilihan anak; tidak ada autoplay beruntun." })] });
}

};
mods["src/data/curriculum.ts"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shapes = exports.artLabels = exports.memorySets = exports.animalFoods = exports.foodCards = exports.questions = exports.numberNames = exports.singleNumberNames = exports.arabicNames = exports.arabic = exports.syllables = exports.associations = exports.letterNames = exports.alphabet = exports.words = exports.animals = exports.colors = exports.activities = exports.worlds = void 0;
exports.numberName = numberName;
exports.getPool = getPool;
exports.sessionQuestions = sessionQuestions;
exports.visibleChoices = visibleChoices;
exports.worlds = [
    { id: 'read', name: 'Baca & Huruf', sub: 'Dari A, jadi cerita', art: 'book', color: 'sky' },
    { id: 'math', name: 'Angka & Berhitung', sub: 'Hitung satu per satu', art: 'apple', color: 'yellow' },
    { id: 'english', name: 'Hello, English!', sub: 'Kata baru, teman baru', art: 'cat', color: 'mint' },
    { id: 'hijaiyah', name: 'Huruf Hijaiyah', sub: 'Kenali bentuk huruf', art: 'moon', color: 'lavender' },
    { id: 'colors', name: 'Warna & Bentuk', sub: 'Temukan warna di sekitar', art: 'palette', color: 'pink' },
    { id: 'games', name: 'Main & Temukan', sub: 'Pasangkan dan cari!', art: 'puzzle', color: 'peach' },
];
exports.activities = [
    { id: 'R01', world: 'read', name: 'Kenal Alfabet', desc: 'Cari huruf A sampai Z', art: 'letter' },
    { id: 'R05', world: 'read', name: 'Suku Kata', desc: 'Ayo baca ba, bi, bu!', art: 'book' },
    { id: 'R07', world: 'read', name: 'Baca Kata', desc: 'Temukan gambar dari kata', art: 'ball' },
    { id: 'M01', world: 'math', name: 'Kenal Angka', desc: 'Berteman dengan 0–20', art: 'number' },
    { id: 'M02', world: 'math', name: 'Hitung Benda', desc: 'Sentuh apel, lalu hitung', art: 'apple' },
    { id: 'M06', world: 'math', name: 'Tambah Apel', desc: 'Gabungkan dua kelompok', art: 'basket' },
    { id: 'E03', world: 'english', name: 'English Colors', desc: 'Red, blue, yellow!', art: 'palette' },
    { id: 'E04', world: 'english', name: 'English Animals', desc: 'Cat, dog, bird, and more', art: 'cat' },
    { id: 'H01', world: 'hijaiyah', name: 'Kenal Hijaiyah', desc: 'Cocokkan 28 bentuk huruf', art: 'moon' },
    { id: 'S01', world: 'colors', name: 'Kenal Warna', desc: 'Pilih warna yang diminta', art: 'palette' },
    { id: 'G01', world: 'games', name: 'Pasangan Rahasia', desc: 'Buka dan ingat gambarnya', art: 'cards' },
    { id: 'G02', world: 'games', name: 'Cari Gambar', desc: 'Di mana benda itu?', art: 'search' },
    { id: 'G03', world: 'games', name: 'Nama Hewan Indonesia', desc: 'Kucing, sapi, gajah, dan teman lain', art: 'cat' },
    { id: 'G04', world: 'games', name: 'Hewan Makan Apa?', desc: 'Pilih gambar makanannya', art: 'cow' },
    { id: 'M08', world: 'math', name: 'Belasan & Puluhan', desc: 'Sepuluh sampai seratus', art: 'number' },
    { id: 'H02', world: 'hijaiyah', name: 'Dengar Alif Ba Ta', desc: 'Dengarkan nama, cari hurufnya', art: 'moon' },
    { id: 'R02', world: 'read', name: 'Huruf Besar & Kecil', desc: 'Pasangkan A dengan a', art: 'letter' },
    { id: 'R03', world: 'read', name: 'Huruf Awal Kata', desc: 'Bola diawali huruf apa?', art: 'book' },
    { id: 'R04', world: 'read', name: 'Cari Huruf Vokal', desc: 'Kenali A, I, U, E, O', art: 'letter' },
    { id: 'M03', world: 'math', name: 'Angka & Jumlah', desc: 'Cocokkan angka dan apel', art: 'basket' },
    { id: 'M07', world: 'math', name: 'Apel Berkurang', desc: 'Diambil berapa, sisanya berapa?', art: 'apple' },
    { id: 'E02', world: 'english', name: 'English Numbers', desc: 'One, two, three!', art: 'number' },
    { id: 'S02', world: 'colors', name: 'Kenal Bentuk', desc: 'Lingkaran, segitiga, dan lainnya', art: 'shapes' },
    { id: 'S04', world: 'colors', name: 'Lanjutkan Pola', desc: 'Lihat urutan, cari lanjutannya', art: 'puzzle' },
];
exports.colors = [['merah', 'red', '#ed6555'], ['biru', 'blue', '#67b9eb'], ['kuning', 'yellow', '#ffda5d'], ['hijau', 'green', '#8ccc8a'], ['merah muda', 'pink', '#ffc1d5'], ['ungu', 'purple', '#b6a2f7'], ['jingga', 'orange', '#ff986c'], ['cokelat', 'brown', '#ad7959'], ['hitam', 'black', '#303030'], ['putih', 'white', '#ffffff']];
exports.animals = [['kucing', 'cat'], ['anjing', 'dog'], ['burung', 'bird'], ['ikan', 'fish'], ['sapi', 'cow'], ['singa', 'lion'], ['kelinci', 'rabbit'], ['bebek', 'duck'], ['gajah', 'elephant'], ['kura-kura', 'turtle'], ['kupu-kupu', 'butterfly'], ['kuda', 'horse']];
exports.words = [['bola', 'ball'], ['buku', 'book'], ['apel', 'apple'], ['sapi', 'cow'], ['ikan', 'fish'], ['topi', 'hat'], ['meja', 'table'], ['kursi', 'chair'], ['mobil', 'car'], ['tas', 'bag'], ['jam', 'clock'], ['rumah', 'house'], ['bunga', 'flower'], ['bulan', 'moon'], ['roti', 'bread'], ['gelas', 'cup'], ['pohon', 'tree'], ['mata', 'eye'], ['pisang', 'banana'], ['bebek', 'duck']];
exports.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
exports.letterNames = ['a', 'be', 'ce', 'de', 'e', 'ef', 'ge', 'ha', 'i', 'je', 'ka', 'el', 'em', 'en', 'o', 'pe', 'ki', 'er', 'es', 'te', 'u', 've', 'we', 'eks', 'ye', 'zet'];
exports.associations = ['apel', 'bola', 'cicak', 'daun', 'elang', 'foto', 'gajah', 'hujan', 'ikan', 'jam', 'kucing', 'lampu', 'mobil', 'nanas', 'obat', 'pohon', 'Quran', 'rumah', 'sapi', 'topi', 'ular', 'vas', 'wortel', 'xilofon', 'yoyo', 'zebra'];
exports.syllables = ['ba', 'bi', 'bu', 'be', 'bo', 'ma', 'mi', 'mu', 'me', 'mo', 'pa', 'pi', 'pu', 'pe', 'po', 'sa', 'si', 'su', 'se', 'so'];
exports.arabic = 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن و ه لا ء ي'.split(' ');
exports.arabicNames = ['Alif', 'Ba', 'Ta', 'Tsa', 'Jim', 'Ha tenggorokan', 'Kha', 'Dal', 'Dzal', 'Ra', 'Zai', 'Sin', 'Syin', 'Shad', 'Dhad', 'Tha', 'Zha', 'Ain', 'Ghain', 'Fa', 'Qaf', 'Kaf', 'Lam', 'Mim', 'Nun', 'Wau', 'Ha ringan', 'Lam Alif', 'Hamzah', 'Ya'];
exports.singleNumberNames = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
function numberName(n) {
    if (n < 10)
        return exports.singleNumberNames[n] || String(n);
    if (n === 10)
        return 'sepuluh';
    if (n === 11)
        return 'sebelas';
    if (n < 20)
        return `${exports.singleNumberNames[n - 10]} belas`;
    if (n < 100)
        return `${exports.singleNumberNames[Math.floor(n / 10)]} puluh${n % 10 ? ' ' + exports.singleNumberNames[n % 10] : ''}`;
    if (n === 100)
        return 'seratus';
    return String(n);
}
exports.numberNames = Array.from({ length: 101 }, (_, i) => numberName(i));
const numberEnglish = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const num = (n) => ({ id: String(n), label: String(n), aliases: [exports.numberNames[n], numberEnglish[n]] });
function choices(pool, index) { const out = [0, 1, 2, 3].map(n => pool[(index + n) % pool.length]); return out.map((_, j) => out[(j + index) % out.length]); }
const seed = (activity, i, prompt, pool, answerIndex, extra = {}) => {
    const target = pool[answerIndex];
    return { id: `${activity}-${i}`, activity, version: 1, level: 1, prompt, choices: choices(pool, answerIndex), answer: target.id, success: `Iya, ${target.label}! Kamu sudah mencoba dengan baik.`, hints: [`Perhatikan lagi. Kita mencari ${target.label}.`, `Ini contohnya: ${target.label}. Sentuh kartu yang diberi tanda bintang.`], ...extra };
};
exports.questions = [];
const letters = exports.alphabet.map((x, i) => ({ id: x, label: x, aliases: [exports.letterNames[i]] }));
exports.alphabet.forEach((x, i) => exports.questions.push(seed('R01', i, `Mana huruf ${x}?`, letters, i, { target: letters[i], spoken: `Mana huruf ${exports.letterNames[i]}?`, success: `Betul! Ini huruf ${exports.letterNames[i]}. ${x} untuk ${exports.associations[i]}.` })));
const syl = exports.syllables.map(x => ({ id: x, label: x, aliases: [x] }));
exports.syllables.forEach((x, i) => exports.questions.push(seed('R05', i, `Ayo temukan suku kata “${x}”.`, syl, i, { target: syl[i], success: `Betul, ${x}! Sekarang kita coba suku kata lain.` })));
const wordChoices = exports.words.map(([label, art]) => ({ id: label, label, art }));
exports.words.forEach(([word], i) => exports.questions.push(seed('R07', i, `Gambar mana yang cocok dengan kata “${word}”?`, wordChoices, i, { target: { id: word, label: word }, success: `Iya, ini ${word}. Kata dan gambarnya cocok!` })));
const nums = Array.from({ length: 101 }, (_, i) => num(i));
nums.forEach((n, i) => exports.questions.push(seed('M01', i, `Mana angka ${exports.numberNames[i]}?`, nums.slice(0, i <= 5 ? 6 : i <= 10 ? 11 : i <= 20 ? 21 : 101), i, { level: i <= 5 ? 1 : i <= 10 ? 2 : 3, target: n, spoken: `Cari angka ${exports.numberNames[i]}`, success: `Betul! Ini angka ${exports.numberNames[i]}.` })));
const dozenAndTens = [...Array.from({ length: 10 }, (_, i) => i + 10), ...Array.from({ length: 9 }, (_, i) => (i + 2) * 10)];
dozenAndTens.forEach((n, i) => exports.questions.push(seed('M08', i, `Cari angka ${numberName(n)}.`, nums.slice(0, 101), n, { level: n < 20 ? 2 : 3, spoken: `Mana angka ${numberName(n)}?`, target: num(n), success: `Hebat! ${n} dibaca ${numberName(n)}.` })));
for (let n = 1; n <= 10; n++)
    exports.questions.push(seed('M02', n, 'Ada berapa apel? Sentuh setiap apel sambil menghitung.', nums.slice(0, n <= 5 ? 6 : 11), n, { objects: n, level: n <= 5 ? 1 : 2, success: `Iya! Ada ${exports.numberNames[n]} apel. ${exports.numberNames.slice(1, n + 1).join(', ')}.`, hints: ['Sentuh apel satu per satu. Apel yang sudah dihitung mendapat tanda centang.', `Hitung bersama: ${exports.numberNames.slice(1, n + 1).join(', ')}. Ada ${exports.numberNames[n]} apel.`] }));
let ix = 0;
for (let a = 1; a <= 5; a++)
    for (let b = 1; b <= 5; b++) {
        const total = a + b;
        exports.questions.push(seed('M06', ix++, `${a} apel ditambah ${b} apel. Jadi berapa?`, nums.slice(0, total <= 5 ? 6 : 11), total, { objects: total, addends: [a, b], level: total <= 5 ? 1 : 2, success: `Betul! ${exports.numberNames[a]} ditambah ${exports.numberNames[b]} sama dengan ${exports.numberNames[total]}.`, hints: ['Gabungkan kedua kelompok. Sentuh semua apel untuk menghitung.', `Kita hitung semuanya: ${exports.numberNames.slice(1, total + 1).join(', ')}. Jumlahnya ${exports.numberNames[total]}.`] }));
    }
const colorChoices = exports.colors.map(([id, en, color]) => ({ id, label: id, color, aliases: [en] }));
exports.colors.forEach(([id, en], i) => {
    exports.questions.push(seed('S01', i, `Mana warna ${id}?`, colorChoices, i, { target: colorChoices[i], success: `Iya, ini warna ${id}!` }));
    exports.questions.push(seed('E03', i, `“${en}” artinya ${id}. Pilih warnanya.`, colorChoices, i, { english: en, target: { id: en, label: en }, success: `Betul! ${en} berarti ${id}.` }));
});
const animalChoices = exports.animals.map(([label, art]) => ({ id: art, label, art, aliases: [art] }));
exports.animals.forEach(([id, en], i) => exports.questions.push(seed('E04', i, `“${en}” adalah ${id}. Mana gambarnya?`, animalChoices, i, { english: en, target: { id: en, label: en }, success: `Iya! ${en} adalah ${id}.` })));
const arabicChoices = exports.arabic.map((x, i) => ({ id: x, label: x, aliases: [exports.arabicNames[i]] }));
exports.arabic.forEach((x, i) => {
    const name = exports.arabicNames[i];
    exports.questions.push(seed('H01', i, `Mana huruf ${name}?`, arabicChoices, i, { spoken: `Cari huruf ${name}. ${name}.`, pronunciation: name, success: `Bagus! Ini huruf ${name}.`, hints: [`Cari bentuk ${name}. Lihat jumlah titik pada hurufnya.`, `Ini huruf ${name}. Pilih kartu bertanda bintang.`] }));
    exports.questions.push(seed('H02', i, `Dengarkan: ${name}. Cari hurufnya!`, arabicChoices, i, { spoken: `Dengarkan. ${name}. Sekali lagi: ${name}.`, pronunciation: name, success: `Betul! ${name}.`, hints: [`Dengarkan nama ${name}. Perhatikan bentuk hurufnya.`, `Huruf ${name} ada di kartu berbintang.`] }));
});
exports.words.forEach(([word], i) => exports.questions.push(seed('G02', i, `Di mana ${word}?`, wordChoices, i, { success: `Ketemu! Ini ${word}. Yuk, cari benda lainnya.` })));
// Gambar pilihan hewan & makanan dibuat di Art.tsx, tidak bergantung CDN.
const animalIndonesian = exports.animals.map(([label, art]) => ({ id: label, label, art, aliases: [label] }));
exports.animals.forEach(([label], i) => exports.questions.push(seed('G03', i, `Cari hewan yang bernama ${label}.`, animalIndonesian, i, { spoken: `Hewan mana namanya ${label}?`, success: `Benar! Ini ${label}.` })));
exports.foodCards = [
    { id: 'rumput', label: 'Rumput', art: 'grass' },
    { id: 'daun', label: 'Daun', art: 'leaves' },
    { id: 'biji-bijian', label: 'Biji-bijian', art: 'seeds' },
    { id: 'ikan', label: 'Ikan', art: 'fish' },
    { id: 'daging', label: 'Daging', art: 'meat' },
    { id: 'wortel', label: 'Wortel', art: 'carrot' },
    { id: 'pisang', label: 'Pisang', art: 'banana' },
    { id: 'bambu', label: 'Bambu', art: 'bamboo' },
    { id: 'nektar', label: 'Nektar bunga', art: 'flower' },
    { id: 'serangga', label: 'Serangga', art: 'insect' },
    { id: 'sayuran', label: 'Sayuran', art: 'vegetable' },
    { id: 'cacing', label: 'Cacing', art: 'worm' },
];
// Pertanyaan dibuat spesifik dan sederhana. Beberapa hewan memakan banyak jenis makanan.
exports.animalFoods = [
    ['sapi', 'cow', 'rumput'], ['kuda', 'horse', 'rumput'], ['kelinci', 'rabbit', 'rumput'],
    ['gajah', 'elephant', 'daun'], ['burung pipit', 'bird', 'biji-bijian'],
    ['kucing', 'cat', 'ikan'], ['singa', 'lion', 'daging'], ['anjing', 'dog', 'daging'],
    ['kupu-kupu', 'butterfly', 'nektar'], ['bebek', 'duck', 'serangga'],
    ['kura-kura darat', 'turtle', 'sayuran'], ['ulat', 'worm', 'daun'],
    ['panda', 'panda', 'bambu'], ['monyet', 'monkey', 'pisang'],
    ['ayam', 'chicken', 'biji-bijian'], ['burung pelatuk', 'bird', 'serangga'],
];
exports.animalFoods.forEach(([animal, art, food], i) => {
    const answerIndex = exports.foodCards.findIndex(f => f.id === food);
    exports.questions.push(seed('G04', i, `${animal[0].toUpperCase() + animal.slice(1)} makan apa?`, exports.foodCards, answerIndex, {
        target: { id: animal, label: animal, art }, spoken: `${animal} makan apa? Pilih gambarnya.`,
        success: `Benar! ${animal} bisa makan ${food}.`, hints: [`Coba cari gambar ${food}.`, `Pilih gambar ${food}, ya.`]
    }));
});
exports.memorySets = [['apple', 'ball', 'book', 'cat'], ['fish', 'cow', 'hat', 'car'], ['bird', 'dog', 'moon', 'tree'], ['cup', 'banana', 'flower', 'bag'], ['rabbit', 'duck', 'clock', 'bread']];
exports.artLabels = Object.fromEntries([...exports.words, ...exports.animals].map(([id, art]) => [art, id]));
function getPool(id, level) { return exports.questions.filter(q => q.activity === id && q.level <= level); }
function sessionQuestions(id, level, offset, order = 'sequential', length = 'short') {
    // Materi penuh dapat dijangkau di semua level; level hanya membatasi jumlah pilihan.
    const pool = getPool(id, 4);
    if (!pool.length)
        return [];
    const count = length === 'all' ? pool.length : Math.min(10, pool.length);
    const start = length === 'all' ? 0 : offset * count;
    if (order === 'sequential')
        return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]);
    const byCycle = new Map();
    return Array.from({ length: count }, (_, i) => {
        const absolute = start + i, cycle = Math.floor(absolute / pool.length);
        if (!byCycle.has(cycle))
            byCycle.set(cycle, shuffleQuestions(pool, id, cycle));
        return byCycle.get(cycle)[absolute % pool.length];
    });
}
function shuffleQuestions(pool, activity, cycle) {
    const items = [...pool];
    let seed = 2166136261;
    for (const ch of activity)
        seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
    seed = (seed + cycle * 9973 + 7) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}
function visibleChoices(q, level, errors = 0) { const limit = errors >= 2 ? 2 : level === 1 ? 2 : level === 4 ? 4 : 3; const correct = q.choices.find(c => c.id === q.answer); const wrong = q.choices.filter(c => c.id !== q.answer).slice(0, limit - 1); const out = [...wrong]; out.splice((q.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % limit, 0, correct); return out; }
// T0-B expansion: concrete, curated variations on the same tested dialog engine.
const lower = exports.alphabet.map((x, i) => ({ id: x.toLowerCase(), label: x.toLowerCase(), aliases: [exports.letterNames[i]] }));
exports.alphabet.forEach((x, i) => exports.questions.push(seed('R02', i, `Huruf kecil dari ${x} yang mana?`, lower, i, { target: { id: x, label: x }, spoken: `Mana huruf kecil dari ${exports.letterNames[i]}?`, success: `Betul! ${x} besar berpasangan dengan ${x.toLowerCase()} kecil.` })));
exports.words.forEach(([word, art], i) => { const first = word[0].toUpperCase(); exports.questions.push(seed('R03', i, `Kata ${word} diawali huruf apa?`, letters, exports.alphabet.indexOf(first), { target: { id: word, label: word, art }, success: `Betul! ${word} diawali huruf ${exports.letterNames[exports.alphabet.indexOf(first)]}.` })); });
const vowels = ['A', 'I', 'U', 'E', 'O'].map(label => ({ id: label, label }));
vowels.forEach((v, i) => exports.questions.push(seed('R04', i, `Cari huruf vokal ${v.label}.`, vowels, i, { target: v, success: `Ya, ${v.label} adalah salah satu huruf vokal.` })));
const groups = Array.from({ length: 10 }, (_, i) => ({ id: String(i + 1), label: `${i + 1} apel`, count: i + 1, aliases: [exports.numberNames[i + 1]] }));
for (let n = 1; n <= 10; n++)
    exports.questions.push(seed('M03', n, `Pilih kelompok yang berisi ${exports.numberNames[n]} apel.`, groups.slice(0, n <= 5 ? 5 : 10), n - 1, { target: num(n), level: n <= 5 ? 1 : 2, success: `Cocok! Angka ${n} berarti ada ${exports.numberNames[n]} apel.` }));
let subIndex = 0;
for (let n = 1; n <= 5; n++)
    for (let taken = 1; taken <= n; taken++)
        exports.questions.push(seed('M07', subIndex++, `Ada ${n} apel. Diambil ${taken}. Berapa yang tersisa?`, nums.slice(0, 6), n - taken, { subtract: [n, taken], objects: n - taken, success: `Betul! ${n} dikurangi ${taken} sama dengan ${n - taken}.`, hints: ['Apel bertanda silang sudah diambil. Hitung yang masih utuh.', `Ada ${n} apel, ${taken} diambil. Sisanya ${exports.numberNames[n - taken]}.`] }));
for (let n = 1; n <= 10; n++)
    exports.questions.push(seed('E02', n, `“${numberEnglish[n]}” artinya ${exports.numberNames[n]}. Pilih angkanya.`, nums.slice(0, n <= 5 ? 6 : 11), n, { english: numberEnglish[n], target: { id: numberEnglish[n], label: numberEnglish[n] }, level: n <= 5 ? 1 : 2, success: `Betul! ${numberEnglish[n]} berarti ${exports.numberNames[n]}.` }));
exports.shapes = [['lingkaran', 'circle'], ['persegi', 'square'], ['segitiga', 'triangle'], ['oval', 'oval'], ['bintang', 'star'], ['persegi panjang', 'rectangle']].map(([label, art]) => ({ id: label, label, art }));
exports.shapes.forEach((s, i) => exports.questions.push(seed('S02', i, `Mana bentuk ${s.label}?`, exports.shapes, i, { target: s, success: `Tepat! Ini bentuk ${s.label}.` })));
for (let i = 0; i < 10; i++) {
    const a = colorChoices[i], b = colorChoices[(i + 1) % 10];
    exports.questions.push(seed('S04', i, `Pola ${a.label}, ${b.label}, ${a.label}. Warna apa berikutnya?`, colorChoices, (i + 1) % 10, { pattern: [a, b, a], success: `Betul! ${a.label}, ${b.label}, ${a.label}, ${b.label}. Polanya berulang.`, hints: [`Setelah ${a.label}, warna ${b.label}. Lihat urutan pertama.`, `Kita ulangi: ${a.label}, ${b.label}, ${a.label}, ${b.label}. Pilih ${b.label}.`] }));
}

};
mods["src/data/story.ts"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.story = void 0;
exports.story = {
    start: { text: 'Ghaffi ingin piknik bersama teman. Apa yang kita bawa?', art: 'basket', choices: [{ label: 'Bawa apel', art: 'apple', next: 'apple' }, { label: 'Bawa roti', art: 'bread', next: 'bread' }] },
    apple: { text: 'Apel sudah di keranjang. Di taman, ada kucing menunggu temannya. Kita mau apa?', art: 'cat', choices: [{ label: 'Duduk dan menunggu bersama', art: 'tree', next: 'wait' }, { label: 'Ajak melihat kupu-kupu', art: 'butterfly', next: 'look' }] },
    bread: { text: 'Roti sudah di keranjang. Di taman, ada bebek berjalan. Kita mau apa?', art: 'duck', choices: [{ label: 'Lihat dari jauh', art: 'eye', next: 'look' }, { label: 'Duduk di bawah pohon', art: 'tree', next: 'wait' }] },
    wait: { text: 'Asyik duduk di tempat teduh. Sebelum makan, kita cuci tangan bersama pendamping. Setelah piknik, apa yang kita lakukan?', art: 'tree', choices: [{ label: 'Rapikan keranjang', art: 'basket', next: 'tidy' }, { label: 'Kumpulkan sampah ke tempatnya', art: 'bag', next: 'clean' }] },
    look: { text: 'Kita mengamati hewan dengan tenang tanpa mengganggu. Sebelum makan, kita cuci tangan bersama pendamping. Setelah piknik, apa yang kita lakukan?', art: 'butterfly', choices: [{ label: 'Rapikan keranjang', art: 'basket', next: 'tidy' }, { label: 'Kumpulkan sampah ke tempatnya', art: 'bag', next: 'clean' }] },
    tidy: { text: 'Keranjang sudah rapi. Terima kasih sudah saling membantu. Sampai jumpa, taman!', art: 'basket', choices: [] },
    clean: { text: 'Taman kembali bersih. Terima kasih sudah merawat tempat bermain. Sampai jumpa, teman!', art: 'flower', choices: [] },
};

};
mods["src/data/videoLessons.ts"]=function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoLessons = void 0;
exports.videoQuestion = videoQuestion;
exports.videoLabel = videoLabel;
exports.mediaUrl = mediaUrl;
const videos_json_1 = __importDefault(require("./videos.json"));
const curriculum_1 = require("./curriculum");
exports.videoLessons = videos_json_1.default;
function videoQuestion(lesson, scene) {
    const id = exports.videoLessons[lesson].clips[scene].questionId;
    const question = curriculum_1.questions.find(q => q.id === id);
    if (!question)
        throw new Error(`Missing video question ${id}`);
    return question;
}
function videoLabel(id) { return exports.videoLessons.find(v => v.id === id)?.title; }
function mediaUrl(id, ext) {
    const embedded = window.__GHAFFI_MEDIA__;
    return embedded?.[`${id}.${ext}`] || `./videos/${id}.${ext}`;
}

};
mods["src/data/videos.json"]=function(module,exports,require){
module.exports=[
 {"id":"V01","title":"Apel datang satu-satu","art":"apple","theme":"count","clips":[
 {"id":"count-2","value":2,"label":"Dua apel","caption":"Ada dua apel. Kita hitung satu per satu: satu, dua.","questionId":"M02-2"},
 {"id":"count-3","value":3,"label":"Tiga apel","caption":"Sekarang ada tiga apel. Satu, dua, tiga.","questionId":"M02-3"},
 {"id":"count-4","value":4,"label":"Empat apel","caption":"Ada empat apel. Hitung bersama: satu, dua, tiga, empat.","questionId":"M02-4"}]},
 {"id":"V02","title":"Warna di studio Ghaffi","art":"palette","theme":"color","clips":[
 {"id":"color-red","value":"#ed6555","label":"Merah","caption":"Ini warna merah. Perhatikan lingkaran merah yang bergerak.","questionId":"S01-0"},
 {"id":"color-blue","value":"#67b9eb","label":"Biru","caption":"Ini warna biru. Sekarang lingkarannya berwarna biru.","questionId":"S01-1"},
 {"id":"color-yellow","value":"#ffda5d","label":"Kuning","caption":"Ini warna kuning. Mari cari warna kuning setelah video.","questionId":"S01-2"}]},
 {"id":"V03","title":"Bentuk-bentuk bergerak","art":"shapes","theme":"shape","clips":[
 {"id":"shape-circle","value":"circle","label":"Lingkaran","caption":"Ini lingkaran. Bentuknya bulat dan tidak memiliki sudut.","questionId":"S02-0"},
 {"id":"shape-square","value":"square","label":"Persegi","caption":"Ini persegi. Ada empat sisi yang sama panjang dan empat sudut.","questionId":"S02-1"},
 {"id":"shape-triangle","value":"triangle","label":"Segitiga","caption":"Ini segitiga. Ada tiga sisi dan tiga sudut.","questionId":"S02-2"}]}
]
;
};
mods["src/engine/dialog.ts"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initial = void 0;
exports.reducer = reducer;
exports.normalize = normalize;
exports.interpret = interpret;
const curriculum_1 = require("../data/curriculum");
exports.initial = { phase: 'ASKING', round: 0, errors: 0, correct: 0, attempts: 0, message: '', last: '' };
function reducer(s, e) {
    if (e.type === 'RESET')
        return { ...exports.initial };
    if (e.type === 'NEXT')
        return s.phase !== 'PRAISE' ? s : s.round === (e.total ?? 3) - 1 ? { ...s, phase: 'COMPLETE' } : { ...s, round: s.round + 1, phase: 'ASKING', errors: 0, message: '', last: '' };
    if (s.phase === 'PRAISE' || s.phase === 'COMPLETE')
        return s;
    if (e.type === 'LISTEN')
        return { ...s, phase: 'LISTENING' };
    if (e.type === 'STOP')
        return { ...s, phase: 'ASKING' };
    if (e.type === 'UNKNOWN')
        return { ...s, phase: 'RETRY', message: 'Aku belum mendengar jelas. Mau coba lagi atau sentuh jawabannya?' };
    if (e.type === 'HINT')
        return { ...s, phase: 'HINT', errors: Math.max(1, s.errors), message: e.q.hints[Math.min(s.errors, 1)] };
    if (!e.q.choices.some(c => c.id === e.id))
        return s;
    if (e.id === e.q.answer)
        return { ...s, phase: 'PRAISE', correct: s.correct + 1, attempts: s.attempts + 1, last: e.id, message: e.q.success };
    const errors = s.errors + 1;
    return { ...s, phase: 'HINT', errors, attempts: s.attempts + 1, last: e.id, message: errors === 1 ? `Yuk, coba bersama. ${e.q.hints[0]}` : errors === 2 ? e.q.hints[1] : `Kita pilih dari dua kartu saja, ya. ${e.q.hints[1]}` };
}
function normalize(text) { const clean = text.toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim(); const n = curriculum_1.numberNames.indexOf(clean); return n >= 0 ? String(n) : clean; }
function interpret(text, choices) {
    const clean = normalize(text);
    const commands = { ulang: 'repeat', ulangi: 'repeat', lagi: 'repeat', bantu: 'hint', bantuan: 'hint', selesai: 'quit', berhenti: 'quit', lewati: 'skip' };
    if (commands[clean])
        return { type: 'command', command: commands[clean] };
    const matches = choices.filter(c => [c.id, c.label, ...(c.aliases || [])].some(a => normalize(a) === clean));
    return matches.length === 1 ? { type: 'choice', id: matches[0].id } : { type: 'unknown' };
}

};
mods["src/engine/memory.ts"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStart = memoryStart;
exports.flip = flip;
exports.closePair = closePair;
function memoryStart(arts, variant) { const cards = [...arts, ...arts]; const shift = variant % cards.length; const deck = cards.map((_, i) => cards[(i + shift) % cards.length]); if (variant % 2)
    deck.reverse(); return { deck, open: [], matched: [], moves: 0, message: 'Buka dua kartu. Temukan gambar yang sama.' }; }
function flip(s, index) {
    if (s.open.length === 2 || s.open.includes(index) || s.matched.includes(index) || index < 0 || index >= s.deck.length)
        return s;
    const open = [...s.open, index];
    if (open.length === 1)
        return { ...s, open, message: 'Satu kartu terbuka. Cari pasangannya, ya.' };
    const match = s.deck[open[0]] === s.deck[open[1]];
    return { ...s, open, matched: match ? [...s.matched, ...open] : s.matched, moves: s.moves + 1, message: match ? 'Cocok! Kedua gambarnya sama.' : 'Gambarnya berbeda. Ingat letaknya, lalu coba lagi.' };
}
function closePair(s) { return { ...s, open: [], message: 'Yuk, cari pasangan berikutnya.' }; }

};
mods["src/main.tsx"]=function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const client_1 = require("react-dom/client");
const App_1 = __importDefault(require("./App"));
require("./styles/theme.css");
class Boundary extends react_1.default.Component {
    constructor() {
        super(...arguments);
        this.state = { failed: false };
    }
    static getDerivedStateFromError() { return { failed: true }; }
    render() { return this.state.failed ? (0, jsx_runtime_1.jsxs)("main", { children: [(0, jsx_runtime_1.jsx)("h1", { children: "Yuk, mulai lagi." }), (0, jsx_runtime_1.jsx)("p", { children: "Permainan terhenti. Muat ulang untuk kembali bermain." }), (0, jsx_runtime_1.jsx)("button", { onClick: () => location.reload(), children: "Buka kembali" })] }) : this.props.children; }
}
(0, client_1.createRoot)(document.getElementById('root')).render((0, jsx_runtime_1.jsx)(Boundary, { children: (0, jsx_runtime_1.jsx)(App_1.default, {}) }));

};
mods["src/services/narrator.ts"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceProfiles = exports.narratorDefaults = void 0;
exports.configureNarrator = configureNarrator;
exports.currentProfile = currentProfile;
exports.voiceKey = voiceKey;
exports.knownMaleVoice = knownMaleVoice;
exports.femaleCandidateScore = femaleCandidateScore;
exports.languageVoices = languageVoices;
exports.chooseVoice = chooseVoice;
exports.narratorDefaults = {
    voiceStyle: 'clear', voiceSpeed: 1.05, voiceId: '', voiceEn: '',
};
// Natural register and normal pace: do not imitate a child by pitching up a
// slow adult voice. Browser TTS cannot directly control breathiness or gender.
exports.voiceProfiles = {
    clear: { pitch: 1.04, rate: 1.15, volume: 0.82 },
};
let preferences = { ...exports.narratorDefaults };
function configureNarrator(next) {
    preferences = { ...next, voiceStyle: 'clear' };
}
function currentProfile() { return { ...exports.voiceProfiles.clear, rate: [0.65, 0.75, 0.85, 0.95, 1, 1.05, 1.15, 1.25, 1.35].includes(preferences.voiceSpeed) ? preferences.voiceSpeed : 1.05 }; }
function voiceKey(voice) {
    return voice.voiceURI || `${voice.lang}:${voice.name}`;
}
// Voice names are hints, not gender metadata. Prefer a recognized female voice,
// otherwise an available language-matching voice (gender cannot be verified).
function knownMaleVoice(voice) {
    return /andika|david|\bmark\b|\bmale\b|\bguy\b/i.test(voice.name);
}
function femaleCandidateScore(voice) {
    if (knownMaleVoice(voice))
        return -1;
    const name = voice.name.toLowerCase();
    if (/gadis|damayanti|female/.test(name))
        return 60;
    if (/samantha|zira|susan|jenny|aria/.test(name))
        return 50;
    if (/google.*(bahasa indonesia|indonesian|us english)/.test(name))
        return 35;
    return 0;
}
function languageVoices(voices, lang) {
    const prefix = lang.toLowerCase().split(/[-_]/)[0];
    return voices.filter(v => v.lang.toLowerCase().split(/[-_]/)[0] === prefix && !knownMaleVoice(v));
}
function chooseVoice(voices, lang) {
    const candidates = languageVoices(voices, lang);
    const selected = lang.startsWith('en') ? preferences.voiceEn : preferences.voiceId;
    return candidates.find(v => voiceKey(v) === selected)
        || candidates.filter(v => femaleCandidateScore(v) > 0)
            .map((voice, index) => ({ voice, index }))
            .sort((a, b) => femaleCandidateScore(b.voice) - femaleCandidateScore(a.voice) || a.index - b.index)[0]?.voice
        || candidates[0];
}

};
mods["src/services/navigation.ts"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRemote = useRemote;
const react_1 = require("react");
function useRemote(back, key) {
    (0, react_1.useEffect)(() => {
        const fn = (e) => {
            const tag = e.target?.tagName;
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
            if (e.key === 'Escape' || e.key === 'BrowserBack' || e.keyCode === 10009) {
                e.preventDefault();
                back();
                return;
            }
            if (typing || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))
                return;
            const els = Array.from(document.querySelectorAll('button:not(:disabled),input,select,a[href]')).filter(el => !el.closest('[hidden]') && el.getClientRects().length > 0);
            if (!els.length)
                return;
            e.preventDefault();
            const active = document.activeElement;
            const index = els.indexOf(active);
            if (index < 0) {
                els[0].focus();
                return;
            }
            const a = active.getBoundingClientRect(), ax = a.x + a.width / 2, ay = a.y + a.height / 2;
            const horiz = e.key === 'ArrowLeft' || e.key === 'ArrowRight', sign = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
            const candidates = els.filter(el => el !== active).map(el => { const r = el.getBoundingClientRect(), dx = r.x + r.width / 2 - ax, dy = r.y + r.height / 2 - ay; return { el, primary: (horiz ? dx : dy) * sign, secondary: Math.abs(horiz ? dy : dx) }; }).filter(x => x.primary > 5).sort((a, b) => (a.primary + a.secondary * 2) - (b.primary + b.secondary * 2));
            const dest = candidates[0]?.el || els[(index + sign + els.length) % els.length];
            dest.focus();
            dest.scrollIntoView?.({ block: 'nearest' });
        };
        document.addEventListener('keydown', fn);
        return () => document.removeEventListener('keydown', fn);
    }, [back, key]);
}

};
mods["src/services/speech.ts"]=function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capabilities = capabilities;
exports.stopMic = stopMic;
exports.stopAudio = stopAudio;
exports.stopAll = stopAll;
exports.speak = speak;
exports.listen = listen;
const narrator_1 = require("./narrator");
let recognition = null;
let timer;
function capabilities() { const w = window; return { tts: 'speechSynthesis' in window, mic: !!(w.SpeechRecognition || w.webkitSpeechRecognition) }; }
function stopMic() { clearTimeout(timer); if (recognition) {
    const r = recognition;
    recognition = null;
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    r.onstart = null;
    try {
        r.abort();
    }
    catch { /* already stopped */ }
} }
function stopAudio() { if ('speechSynthesis' in window)
    window.speechSynthesis.cancel(); }
function stopAll() { stopMic(); stopAudio(); }
function speak(text, enabled, lang = 'id-ID', onStatus) {
    stopAll();
    if (!enabled)
        return;
    if (!capabilities().tts) {
        onStatus?.('Narasi tidak tersedia. Tetap bisa bermain lewat gambar.');
        return;
    }
    const synth = window.speechSynthesis;
    const voice = (0, narrator_1.chooseVoice)(synth.getVoices(), lang);
    if (!voice) {
        onStatus?.(`Suara ${lang.startsWith('en') ? 'Inggris' : 'Indonesia'} tidak tersedia di browser ini. Gunakan pilihan sentuh, atau aktifkan voice di perangkat.`);
        return;
    }
    const msg = new SpeechSynthesisUtterance(text);
    msg.voice = voice;
    msg.lang = lang;
    const profile = (0, narrator_1.currentProfile)();
    msg.pitch = profile.pitch;
    msg.rate = profile.rate;
    msg.volume = profile.volume;
    msg.onstart = () => onStatus?.('Sedang berbicara…');
    msg.onend = () => onStatus?.('Narasi selesai.');
    msg.onerror = () => onStatus?.('Narasi terhenti. Teks tetap tersedia.');
    synth.speak(msg);
}
function listen(result, status, done) {
    stopAll();
    const w = window;
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) {
        status('Browser tidak mendukung mikrofon. Sentuh jawabannya, ya.');
        done();
        return;
    }
    const r = new Constructor();
    recognition = r;
    r.lang = 'id-ID';
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 1;
    const finish = () => { stopMic(); done(); };
    r.onstart = () => status('Mendengarkan…');
    r.onresult = e => { const heard = e.results[0]?.[0]; finish(); if (heard && (heard.confidence === 0 || heard.confidence >= .55)) {
        status('Jawaban diterima.');
        result(heard.transcript);
    }
    else {
        status('Aku belum mendengar jelas. Sentuh jawaban atau coba lagi.');
        result('');
    } };
    r.onerror = e => { finish(); status(e.error === 'not-allowed' ? 'Izin mikrofon ditolak. Sentuh jawabannya, ya.' : e.error === 'network' ? 'Layanan suara tidak terhubung. Gunakan pilihan gambar.' : 'Belum terdengar. Coba lagi atau sentuh jawaban.'); };
    r.onend = () => { if (recognition === r) {
        finish();
        status('Mikrofon mati. Sentuh jawaban atau coba lagi.');
    } };
    timer = setTimeout(() => { finish(); status('Waktu mendengar selesai. Sentuh jawaban atau coba lagi.'); }, 8000);
    try {
        r.start();
    }
    catch {
        finish();
        status('Mikrofon belum dapat digunakan. Pilihan sentuh tetap tersedia.');
    }
}

};
mods["src/services/store.ts"]=function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaults = exports.KEY = void 0;
exports.readStore = readStore;
exports.writeStore = writeStore;
exports.exported = exported;
const videos_json_1 = __importDefault(require("../data/videos.json"));
const narrator_1 = require("./narrator");
const curriculum_1 = require("../data/curriculum");
exports.KEY = 'ghaffiland.trial.v1';
exports.defaults = { ...narrator_1.narratorDefaults, nickname: 'Ghaffi', level: 1, narrator: true, avatar: true, motion: true, rewards: true, minutes: 5, save: true, mode: 'together', tv: false, questionOrder: 'sequential', sessionLength: 'short' };
function readStore() {
    try {
        const raw = localStorage.getItem(exports.KEY);
        if (!raw)
            return { settings: { ...exports.defaults }, progress: {}, failed: false };
        const data = JSON.parse(raw);
        if (data.version !== 1)
            throw Error('version');
        const s = data.settings || {};
        const settings = { ...exports.defaults };
        if (typeof s.nickname === 'string')
            settings.nickname = s.nickname.replace(/[<>]/g, '').slice(0, 20) || 'Ghaffi';
        if ([1, 2, 3, 4].includes(s.level))
            settings.level = s.level;
        if ([0.65, 0.75, 0.85, 0.95, 1, 1.05, 1.15, 1.25, 1.35].includes(s.voiceSpeed))
            settings.voiceSpeed = s.voiceSpeed;
        if ([5, 10, 15].includes(s.minutes))
            settings.minutes = s.minutes;
        for (const k of ['narrator', 'avatar', 'motion', 'rewards', 'save', 'tv'])
            if (typeof s[k] === 'boolean')
                settings[k] = s[k];
        // Retire both old styles and their voice overrides without losing progress.
        if (s.voiceStyle === 'clear')
            for (const key of ['voiceId', 'voiceEn'])
                if (typeof s[key] === 'string' && s[key].length <= 500)
                    settings[key] = s[key];
        if (s.mode === 'short' || s.mode === 'together')
            settings.mode = s.mode;
        if (s.questionOrder === 'sequential' || s.questionOrder === 'random')
            settings.questionOrder = s.questionOrder;
        if (s.sessionLength === 'short' || s.sessionLength === 'all')
            settings.sessionLength = s.sessionLength;
        const progress = {};
        for (const id of [...curriculum_1.activities.map(a => a.id), 'R10', ...videos_json_1.default.map(v => v.id)]) {
            const p = data.progress?.[id];
            if (p && ['sessions', 'rounds', 'attempts'].every(k => Number.isSafeInteger(p[k]) && p[k] >= 0 && p[k] < 1000000))
                progress[id] = p;
        }
        return { settings, progress: settings.save ? progress : {}, failed: false };
    }
    catch {
        return { settings: { ...exports.defaults }, progress: {}, failed: true };
    }
}
function writeStore(settings, progress) { try {
    if (settings.save)
        localStorage.setItem(exports.KEY, JSON.stringify({ version: 1, settings, progress }));
    else
        localStorage.removeItem(exports.KEY);
    return true;
}
catch {
    return false;
} }
function exported(progress) { return JSON.stringify({ version: 1, progress }, null, 2); }

};
function resolve(id,from){if(id==='react')return '__react__';if(id==='react-dom/client')return '__dom__';if(id==='react/jsx-runtime')return '__jsx__';if(!id.startsWith('.'))throw Error('Unknown dependency: '+id);const parts=from.split('/');parts.pop();for(const seg of id.split('/')){if(seg==='..')parts.pop();else if(seg!=='.')parts.push(seg);}const name=parts.join('/');for(const ext of ['','.tsx','.ts','.json'])if(mods[name+ext])return name+ext;throw Error('Missing '+id+' from '+from);}
function load(id,from='src/main.tsx'){id=resolve(id,from);if(id==='__react__')return libs.React;if(id==='__dom__')return libs.ReactDOM;if(id==='__jsx__')return libs.JSX;if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;mods[id](module,module.exports,req=>{if(req.endsWith('.css'))return {};return load(req,id);});return module.exports;}
try{load('./main.tsx','src/dummy.tsx');}catch(e){console.error('GhaffiLand startup failed:',e);const el=document.getElementById('root');if(el)el.textContent='GhaffiLand gagal dimuat. Periksa console atau reload.';}
})();
