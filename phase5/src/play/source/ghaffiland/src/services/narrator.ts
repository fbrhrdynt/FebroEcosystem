export type NarratorPreferences = {
  voiceStyle: 'clear';
  voiceSpeed: number;
  voiceId: string;
  voiceEn: string;
};
export const narratorDefaults: NarratorPreferences = {
  voiceStyle: 'clear', voiceSpeed: 1.05, voiceId: '', voiceEn: '',
};
// Natural register and normal pace: do not imitate a child by pitching up a
// slow adult voice. Browser TTS cannot directly control breathiness or gender.
export const voiceProfiles = {
  clear: { pitch: 1.04, rate: 1.15, volume: 0.82 },
} as const;
let preferences: NarratorPreferences = { ...narratorDefaults };
export function configureNarrator(next: NarratorPreferences) {
  preferences = { ...next, voiceStyle: 'clear' };
}
export function currentProfile() { return {...voiceProfiles.clear,rate:[0.65,0.75,0.85,0.95,1,1.05,1.15,1.25,1.35].includes(preferences.voiceSpeed)?preferences.voiceSpeed:1.05}; }
export function voiceKey(voice: SpeechSynthesisVoice) {
  return voice.voiceURI || `${voice.lang}:${voice.name}`;
}
// Voice names are hints, not gender metadata. Prefer a recognized female voice,
// otherwise an available language-matching voice (gender cannot be verified).
export function knownMaleVoice(voice: SpeechSynthesisVoice) {
  return /andika|david|\bmark\b|\bmale\b|\bguy\b/i.test(voice.name);
}
export function femaleCandidateScore(voice: SpeechSynthesisVoice) {
  if (knownMaleVoice(voice)) return -1;
  const name = voice.name.toLowerCase();
  if (/gadis|damayanti|female/.test(name)) return 60;
  if (/samantha|zira|susan|jenny|aria/.test(name)) return 50;
  if (/google.*(bahasa indonesia|indonesian|us english)/.test(name)) return 35;
  return 0;
}
export function languageVoices(voices: SpeechSynthesisVoice[], lang: string) {
  const prefix = lang.toLowerCase().split(/[-_]/)[0];
  return voices.filter(v => v.lang.toLowerCase().split(/[-_]/)[0] === prefix && !knownMaleVoice(v));
}
export function chooseVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const candidates = languageVoices(voices, lang);
  const selected = lang.startsWith('en') ? preferences.voiceEn : preferences.voiceId;
  return candidates.find(v => voiceKey(v) === selected)
    || candidates.filter(v => femaleCandidateScore(v) > 0)
      .map((voice, index) => ({voice, index}))
      .sort((a, b) => femaleCandidateScore(b.voice) - femaleCandidateScore(a.voice) || a.index - b.index)[0]?.voice
    || candidates[0];
}
