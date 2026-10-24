import {describe,it,expect} from 'vitest';
import {questions,activities,alphabet,arabic,syllables,words,memorySets,getPool,visibleChoices,sessionQuestions} from '../src/data/curriculum';
import {normalize,interpret,reducer,initial} from '../src/engine/dialog';
import {memoryStart,flip,closePair} from '../src/engine/memory';
import {story} from '../src/data/story';
describe('curriculum integrity',()=>{
 it('has 24 activities, alphabet and extended hijaiyah sets',()=>{expect(activities).toHaveLength(24);expect(activities.map(a=>a.id)).toEqual(expect.arrayContaining(['R01','R05','R07','M01','M02','M06','E03','E04','H01','S01','G01','G02']));expect(alphabet).toHaveLength(26);expect(new Set(arabic).size).toBe(30);expect(syllables).toHaveLength(20);expect(words).toHaveLength(20);});
 it('has at least five real variations for every activity at every level',()=>{for(const a of activities)expect(a.id==='G01'?memorySets.length:getPool(a.id,4).length,`${a.id}`).toBeGreaterThanOrEqual(5);});
 it('all questions have valid unique IDs, answers, choices, two distinct hints and feedback',()=>{expect(new Set(questions.map(q=>q.id)).size).toBe(questions.length);for(const q of questions){expect(q.choices.some(c=>c.id===q.answer),q.id).toBe(true);expect(new Set(q.choices.map(c=>c.id)).size,q.id).toBe(q.choices.length);expect(q.hints[0]).not.toBe(q.hints[1]);expect(q.success.length).toBeGreaterThan(10);for(const level of [1,2,3,4])for(const errors of [0,1,2,3]){const c=visibleChoices(q,level,errors);expect(c.some(c=>c.id===q.answer),q.id).toBe(true);expect(c.length).toBe(errors>=2?2:level===1?2:level===4?4:3);}}});
 it('all numeric seeds agree with actual object totals and addition',()=>{for(const q of questions.filter(q=>q.objects!==undefined)){expect(Number(q.answer)).toBe(q.objects);if(q.addends){expect(q.addends[0]+q.addends[1]).toBe(q.objects);if(q.level===1)expect(q.objects).toBeLessThanOrEqual(5);}}});
 it('sequential sessions expose full catalogs instead of repeating first three forever',()=>{for(const id of ['R01','R05','R07','M01','M02','M06','E03','E04','H01','S01','G02']){const seen=new Set<string>();for(let session=0;session<getPool(id,4).length;session++)sessionQuestions(id,4,session).forEach(q=>seen.add(q.id));expect(seen.size,id).toBe(getPool(id,4).length);}});
 it('all story choices resolve and terminate after three choices, with different endings',()=>{const ends=new Set<string>();function walk(id:string,depth:number){const s=story[id];expect(s).toBeDefined();expect(depth).toBeLessThanOrEqual(3);if(!s.choices.length){expect(depth).toBe(3);ends.add(id);return;}expect(s.choices).toHaveLength(2);s.choices.forEach(c=>walk(c.next,depth+1));}walk('start',0);expect(ends.size).toBe(2);});
});
describe('curated dialogue',()=>{
 it('normalizes Indonesian number words, punctuation and case',()=>{expect(normalize(' TIGA! ')).toBe('3');expect(normalize('Dua belas.')).toBe('12');expect(normalize('20')).toBe('20');expect(normalize(' BLUE ')).toBe('blue');});
 it('accepts only exact context aliases, never arbitrary partial speech',()=>{const q=questions.find(q=>q.activity==='E03')!;expect(interpret('RED',q.choices)).toEqual({type:'choice',id:'merah'});expect(interpret('mungkin merah atau biru',q.choices)).toEqual({type:'unknown'});expect(interpret('bantu',q.choices)).toEqual({type:'command',command:'hint'});expect(interpret('<script>alert(1)</script>',q.choices)).toEqual({type:'unknown'});});
 it('rejects ambiguous aliases',()=>{expect(interpret('ha',[{id:'a',label:'a',aliases:['ha']},{id:'b',label:'b',aliases:['ha']}])).toEqual({type:'unknown'});});
 it('branches after incorrect answers, prevents repeated rewards, completes three rounds',()=>{const q=questions[0],wrong=q.choices.find(c=>c.id!==q.answer)!.id;let s=reducer(initial,{type:'ANSWER',id:wrong,q});expect(s.phase).toBe('HINT');const first=s.message;s=reducer(s,{type:'ANSWER',id:wrong,q});expect(s.errors).toBe(2);expect(s.message).not.toBe(first);expect(visibleChoices(q,4,s.errors)).toHaveLength(2);s=reducer(s,{type:'ANSWER',id:q.answer,q});expect(s.phase).toBe('PRAISE');expect(reducer(s,{type:'ANSWER',id:q.answer,q})).toEqual(s);s=reducer(s,{type:'NEXT'});for(let i=1;i<3;i++){s=reducer(s,{type:'ANSWER',id:q.answer,q});s=reducer(s,{type:'NEXT'});}expect(s.phase).toBe('COMPLETE');expect(s.correct).toBe(3);expect(s.attempts).toBe(5);});
 it('unknown speech, listening, help and repeat do not count as wrong',()=>{let s=reducer(initial,{type:'LISTEN'});s=reducer(s,{type:'UNKNOWN'});s=reducer(s,{type:'HINT',q:questions[0]});s=reducer(s,{type:'STOP'});expect(s.attempts).toBe(0);expect(s.round).toBe(0);expect(reducer(s,{type:'ANSWER',id:'invalid',q:questions[0]})).toEqual(s);});
});
describe('memory has actual pairs and multiple layouts',()=>{
 it('every set, size and rotation can be fully solved',()=>{for(const set of memorySets)for(const pairs of [2,3,4])for(const offset of [0,1,2,3,4]){let s=memoryStart(set.slice(0,pairs),offset);expect(s.deck).toHaveLength(pairs*2);for(const art of new Set(s.deck)){const indices=s.deck.flatMap((a,i)=>a===art?[i]:[]);expect(indices).toHaveLength(2);s=flip(s,indices[0]);s=flip(s,indices[1]);s=closePair(s);}expect(s.matched).toHaveLength(pairs*2);}});
 it('mismatched cards stay visible until child closes them and cannot double-select',()=>{let s=memoryStart(memorySets[0].slice(0,2),0);s=flip(s,0);expect(flip(s,0)).toEqual(s);s=flip(s,1);expect(s.matched).toHaveLength(0);expect(s.open).toHaveLength(2);expect(flip(s,2)).toEqual(s);s=closePair(s);expect(s.open).toHaveLength(0);});
});
it('L1 numeric distractors stay within 0–5',()=>{for(const q of questions.filter(q=>q.activity.startsWith('M')&&q.level===1))for(const c of q.choices)expect(Number(c.id),q.id).toBeLessThanOrEqual(5);});
it('subtraction displays taken and remaining apples accurately, including zero',()=>{
 const subs=questions.filter(q=>q.activity==='M07');expect(subs.length).toBeGreaterThanOrEqual(5);
 expect(subs.some(q=>q.objects===0)).toBe(true);
 for(const q of subs){expect(q.subtract![0]-q.subtract![1]).toBe(q.objects);expect(Number(q.answer)).toBe(q.objects);}
});
it('quantity choices contain exactly their stated number of objects',()=>{
 for(const q of questions.filter(q=>q.activity==='M03'))for(const c of q.choices)expect(c.count).toBe(Number(c.id));
});
it('patterns alternate A-B-A and the answer is B',()=>{
 for(const q of questions.filter(q=>q.activity==='S04')){expect(q.pattern).toHaveLength(3);expect(q.pattern![0].id).toBe(q.pattern![2].id);expect(q.answer).toBe(q.pattern![1].id);expect(q.pattern![0].id).not.toBe(q.answer);}
});

it('extended materials include upper/lower alphabet, number 0-100, hijaiyah and Indonesian animal food',()=>{
 expect(getPool('R01',4)).toHaveLength(26);expect(getPool('R02',4)).toHaveLength(26);
 expect(getPool('M01',4)).toHaveLength(101);expect(getPool('H01',4)).toHaveLength(30);
 expect(getPool('H02',4)).toHaveLength(30);expect(getPool('G03',4)).toHaveLength(12);
 expect(getPool('G04',4)).toHaveLength(16);
 for(const a of activities.filter(x=>x.id!=='G01')){
  const sequential=new Set<string>(),random=new Set<string>();const total=Math.ceil(getPool(a.id,4).length/10);
  for(let n=0;n<total;n++){
   sessionQuestions(a.id,1,n,'sequential','short').forEach(q=>sequential.add(q.id));
   sessionQuestions(a.id,1,n,'random','short').forEach(q=>random.add(q.id));
  }
  expect(sequential.size).toBe(getPool(a.id,4).length);expect(random.size).toBe(getPool(a.id,4).length);
  expect(sessionQuestions(a.id,1,0,'sequential','all')).toHaveLength(getPool(a.id,4).length);
 }
});
