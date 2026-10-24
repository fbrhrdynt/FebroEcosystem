export type Memory={deck:string[];open:number[];matched:number[];moves:number;message:string};
export function memoryStart(arts:string[],variant:number):Memory{const cards=[...arts,...arts];const shift=variant%cards.length;const deck=cards.map((_,i)=>cards[(i+shift)%cards.length]);if(variant%2)deck.reverse();return {deck,open:[],matched:[],moves:0,message:'Buka dua kartu. Temukan gambar yang sama.'};}
export function flip(s:Memory,index:number):Memory{
 if(s.open.length===2||s.open.includes(index)||s.matched.includes(index)||index<0||index>=s.deck.length)return s;
 const open=[...s.open,index];if(open.length===1)return {...s,open,message:'Satu kartu terbuka. Cari pasangannya, ya.'};
 const match=s.deck[open[0]]===s.deck[open[1]];return {...s,open,matched:match?[...s.matched,...open]:s.matched,moves:s.moves+1,message:match?'Cocok! Kedua gambarnya sama.':'Gambarnya berbeda. Ingat letaknya, lalu coba lagi.'};
}
export function closePair(s:Memory):Memory{return {...s,open:[],message:'Yuk, cari pasangan berikutnya.'};}
