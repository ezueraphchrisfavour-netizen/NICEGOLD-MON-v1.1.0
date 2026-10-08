const crypto = require('crypto');

const suffixes = [
  'quick','smart','pro','lite','plus','max','ultra','neo','nova','core','prime','edge','flex','rapid','turbo','swift','zen','pulse','spark','flow',
  'alpha','beta','gamma','delta','omega','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen',
  'sixteen','seventeen','eighteen','nineteen','twenty','daily','instant','easy','power','studio','lab','hub','box','zone','x','x2','x3','x4','x5','ngm','gold','mon','utility','tool','assist','helper','maker','engine','desk','kit','suite','vault','works','factory','station','center','base','point','scope','wave','grid','matrix','orbit','sparkle','vision','focus','logic','alpha2','beta2','gamma2','delta2','omega2','classic','modern','next','future','digital','mobile','cloud','local','safe','clean','fast','direct','master','final','extra'
];

const actions = {
  upper: t => t.toUpperCase(),
  lower: t => t.toLowerCase(),
  title: t => t.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()),
  reverse: t => [...t].reverse().join(''),
  length: t => `Characters: ${[...t].length}`,
  words: t => `Words: ${t.trim() ? t.trim().split(/\s+/).length : 0}`,
  lines: t => `Lines: ${t ? t.split(/\r?\n/).length : 0}`,
  chars: t => [...t].map((c,i)=>`${i+1}. ${JSON.stringify(c)}`).join('\n'),
  trim: t => t.trim(),
  compact: t => t.replace(/\s+/g,' ').trim(),
  snake: t => t.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''),
  kebab: t => t.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
  camel: t => t.trim().toLowerCase().replace(/[^a-z0-9]+(.)/g,(_,c)=>c.toUpperCase()),
  dotcase: t => t.trim().toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,''),
  alternating: t => [...t].map((c,i)=>i%2?c.toLowerCase():c.toUpperCase()).join(''),
  base64: t => Buffer.from(t,'utf8').toString('base64'),
  base64decode: t => { try{return Buffer.from(t,'base64').toString('utf8')}catch{return 'Invalid Base64'}} ,
  hex: t => Buffer.from(t,'utf8').toString('hex'),
  hexdecode: t => { try{return Buffer.from(t,'hex').toString('utf8')}catch{return 'Invalid hexadecimal'}} ,
  uriencode: t => encodeURIComponent(t),
  uridecode: t => { try{return decodeURIComponent(t)}catch{return 'Invalid URL encoding'} },
  rot13: t => t.replace(/[a-zA-Z]/g,c=>String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<'n'?13:-13))),
  md5: t => crypto.createHash('md5').update(t).digest('hex'),
  sha1: t => crypto.createHash('sha1').update(t).digest('hex'),
  sha256: t => crypto.createHash('sha256').update(t).digest('hex'),
  sha512: t => crypto.createHash('sha512').update(t).digest('hex'),
  uuid: () => crypto.randomUUID(),
  json: t => { try{return JSON.stringify(JSON.parse(t),null,2)}catch{return 'Invalid JSON'}} ,
  jsonmin: t => { try{return JSON.stringify(JSON.parse(t))}catch{return 'Invalid JSON'}} ,
  countletters: t => `Letters: ${(t.match(/[A-Za-z]/g)||[]).length}`,
  countdigits: t => `Digits: ${(t.match(/\d/g)||[]).length}`,
  countspaces: t => `Spaces: ${(t.match(/\s/g)||[]).length}`,
  countvowels: t => `Vowels: ${(t.match(/[aeiou]/gi)||[]).length}`,
  countconsonants: t => `Consonants: ${(t.match(/[bcdfghjklmnpqrstvwxyz]/gi)||[]).length}`,
  uniquechars: t => [...new Set(t)].join(''),
  sortwords: t => t.trim().split(/\s+/).filter(Boolean).sort((a,b)=>a.localeCompare(b)).join(' '),
  sortlines: t => t.split(/\r?\n/).sort((a,b)=>a.localeCompare(b)).join('\n'),
  uniqueWords: t => [...new Set(t.trim().split(/\s+/).filter(Boolean).map(x=>x.toLowerCase()))].join(' '),
  first: t => t.trim().split(/\s+/)[0] || '',
  last: t => { const a=t.trim().split(/\s+/).filter(Boolean); return a[a.length-1]||'' },
  initials: t => t.trim().split(/\s+/).filter(Boolean).map(w=>w[0]).join('').toUpperCase(),
  initialsDots: t => t.trim().split(/\s+/).filter(Boolean).map(w=>w[0]).join('.').toUpperCase()+'.',
  quote: t => `“${t}”`,
  brackets: t => `[ ${t} ]`,
  braces: t => `{ ${t} }`,
  code: t => '```\n'+t+'\n```',
  bullet: t => t.split(/\r?\n/).map(x=>`• ${x}`).join('\n'),
  numbered: t => t.split(/\r?\n/).map((x,i)=>`${i+1}. ${x}`).join('\n'),
  csv: t => t.split(/\s+/).filter(Boolean).join(','),
  urlhost: t => { try{return new URL(t).host}catch{return 'Invalid URL'} },
  protocol: t => { try{return new URL(t).protocol.replace(':','')}catch{return 'Invalid URL'} },
  domain: t => { try{return new URL(/^https?:\/\//i.test(t)?t:'https://'+t).hostname.replace(/^www\./,'')}catch{return 'Invalid domain'} },
  emailmask: t => t.replace(/([\w.+-]{2})[^@]*(@.*)/g,'$1***$2'),
  phoneclean: t => t.replace(/[^\d+]/g,''),
  digits: t => (t.match(/\d+/g)||[]).join(''),
  numbers: t => (t.match(/-?\d+(?:\.\d+)?/g)||[]).join(', '),
  even: t => (t.match(/-?\d+/g)||[]).filter(n=>Number(n)%2===0).join(', '),
  odd: t => (t.match(/-?\d+/g)||[]).filter(n=>Math.abs(Number(n)%2)===1).join(', '),
  sum: t => (t.match(/-?\d+(?:\.\d+)?/g)||[]).reduce((a,n)=>a+Number(n),0).toString(),
  average: t => { const a=(t.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number); return a.length?(a.reduce((x,y)=>x+y,0)/a.length).toString():'0' },
  min: t => { const a=(t.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number); return a.length?String(Math.min(...a)):'0' },
  max: t => { const a=(t.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number); return a.length?String(Math.max(...a)):'0' },
  abs: t => { const n=Number(t); return Number.isFinite(n)?String(Math.abs(n)):'Enter a number' },
  square: t => { const n=Number(t); return Number.isFinite(n)?String(n*n):'Enter a number' },
  cube: t => { const n=Number(t); return Number.isFinite(n)?String(n*n*n):'Enter a number' },
  sqrt: t => { const n=Number(t); return Number.isFinite(n)?String(Math.sqrt(n)):'Enter a number' },
  percent: t => { const a=t.match(/(-?\d+(?:\.\d+)?)\s*(?:of|%)\s*(-?\d+(?:\.\d+)?)/i); return a?String(Number(a[1])*Number(a[2])/100):'Use: 15 of 200' },
  random: t => { const a=t.trim().split(/\s+/).filter(Boolean); return a.length?a[Math.floor(Math.random()*a.length)]:String(Math.random()) },
  yesno: () => Math.random()<0.5?'YES':'NO',
  coin: () => Math.random()<0.5?'HEADS':'TAILS',
  dice: () => String(Math.floor(Math.random()*6)+1),
  timestamp: () => String(Date.now()),
  iso: () => new Date().toISOString(),
  date: () => new Date().toLocaleDateString('en-NG',{dateStyle:'full'}),
  time: () => new Date().toLocaleTimeString('en-NG'),
  now: () => new Date().toString(),
  slug: t => t.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
  hashtags: t => (t.match(/#[\w]+/g)||[]).join(' '),
  mentions: t => (t.match(/@[\w.]+/g)||[]).join(' '),
  links: t => (t.match(/https?:\/\/[^\s]+/g)||[]).join('\n'),
  emails: t => (t.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)||[]).join('\n'),
  wordsunique: t => { const a=t.toLowerCase().match(/[a-z0-9']+/g)||[]; return String(new Set(a).size) },
  palindrome: t => { const s=t.toLowerCase().replace(/[^a-z0-9]/g,''); return s=== [...s].reverse().join('')?'YES':'NO' },
  anagramkey: t => [...t.toLowerCase().replace(/\s+/g,'')].sort().join(''),
  ascii: t => [...t].map(c=>c.codePointAt(0)).join(' '),
  fromascii: t => (t.match(/\d+/g)||[]).map(n=>String.fromCodePoint(Number(n))).join(''),
  binary8: t => [...t].map(c=>c.charCodeAt(0).toString(2).padStart(8,'0')).join(' '),
  octal: t => Buffer.from(t,'utf8').toString('hex').match(/../g)?.map(x=>parseInt(x,16).toString(8)).join(' ')||'',
  charcodes: t => [...t].map(c=>`${c}:${c.codePointAt(0)}`).join(' '),
  repeat: t => { const [n,...rest]=t.trim().split(/\s+/); const count=Math.min(20,Math.max(1,Number(n)||1)); return rest.join(' ').repeat(count) },
  padleft: t => { const [n,...rest]=t.trim().split(/\s+/); return rest.join(' ').padStart(Math.min(200,Number(n)||10),' ') },
  padright: t => { const [n,...rest]=t.trim().split(/\s+/); return rest.join(' ').padEnd(Math.min(200,Number(n)||10),' ') },
  center: t => { const [n,...rest]=t.trim().split(/\s+/); const s=rest.join(' '), w=Math.min(200,Number(n)||20); return s.padStart(Math.ceil((w+s.length)/2)).padEnd(w) },
  zeroes: t => { const n=Number(t); return Number.isFinite(n)?String(n).padStart(6,'0'):'Enter a number' },
  percentchange: t => { const [a,b]=(t.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number); return Number.isFinite(a)&&Number.isFinite(b)&&a!==0?`${((b-a)/a*100).toFixed(2)}%`:'Use: old new' },
  ctof: t => { const n=Number(t); return Number.isFinite(n)?`${(n*9/5+32).toFixed(2)} °F`:'Enter °C' },
  ftoc: t => { const n=Number(t); return Number.isFinite(n)?`${((n-32)*5/9).toFixed(2)} °C`:'Enter °F' },
  kmmi: t => { const n=Number(t); return Number.isFinite(n)?`${(n*0.621371).toFixed(4)} mi`:'Enter km' },
  mikm: t => { const n=Number(t); return Number.isFinite(n)?`${(n*1.609344).toFixed(4)} km`:'Enter miles' },
  kgtoib: t => { const n=Number(t); return Number.isFinite(n)?`${(n*2.2046226218).toFixed(4)} lb`:'Enter kg' },
  ibtokg: t => { const n=Number(t); return Number.isFinite(n)?`${(n/2.2046226218).toFixed(4)} kg`:'Enter lb' },
  mbtob: t => { const n=Number(t); return Number.isFinite(n)?String(n*1024*1024):'Enter MB' },
  bmb: t => { const n=Number(t); return Number.isFinite(n)?String(n/1024/1024):'Enter bytes' },
  newline: t => t.replace(/\\n/g,'\n'),
  escape: t => JSON.stringify(t),
  unescape: t => { try{return JSON.parse(t)}catch{return t} },
  cleanpunct: t => t.replace(/[^\p{L}\p{N}\s]/gu,''),
  onlyletters: t => t.replace(/[^\p{L}\s]/gu,''),
  onlynumbers: t => t.replace(/[^0-9.-]/g,''),
  swapcase: t => [...t].map(c=>c===c.toUpperCase()?c.toLowerCase():c.toUpperCase()).join(''),
  mirror: t => t + ' | ' + [...t].reverse().join(''),
  wordinitials: t => t.split(/\s+/).filter(Boolean).map(w=>w[0]).join(''),
  sentence: t => t.trim().replace(/(^|[.!?]\s+)([a-z])/g,(_,a,b)=>a+b.toUpperCase()),
  linesunique: t => [...new Set(t.split(/\r?\n/))].join('\n'),
  linesreverse: t => t.split(/\r?\n/).reverse().join('\n'),
  wordsreverse: t => t.trim().split(/\s+/).reverse().join(' '),
  csvlines: t => t.split(/\r?\n/).map(x=>x.split(/\s+/).join(',')).join('\n'),
  quotejson: t => JSON.stringify({text:t}),
  html: t => t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'),
  markdown: t => `**${t}**`,
  italic: t => `_${t}_`,
  strike: t => `~${t}~`,
  monospace: t => '`'+t+'`',
  urlquery: t => new URLSearchParams({q:t}).toString(),
  querydecode: t => { try{return new URLSearchParams(t).get('q')||t}catch{return t} },
  randomword: t => { const a=t.trim().split(/\s+/).filter(Boolean); return a[Math.floor(Math.random()*a.length)]||'NICEGOLD' },
  pickfirst: t => t.split(/[|,;]/)[0].trim(),
  picklast: t => { const a=t.split(/[|,;]/).map(x=>x.trim()).filter(Boolean); return a[a.length-1]||'' },
  splitcomma: t => t.split(',').map(x=>x.trim()).filter(Boolean).join('\n'),
  splitspace: t => t.trim().split(/\s+/).join('\n'),
  joinlines: t => t.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).join(' '),
  checksum: t => crypto.createHash('sha256').update(t).digest('hex').slice(0,12),
  identity: t => t,
};

const actionNames = [
  'upper','lower','title','reverse','length','words','lines','chars','trim','compact','snake','kebab','camel','dotcase','alternating','base64','base64decode','hex','hexdecode','uriencode','uridecode','rot13','binary8','md5','sha1','sha256','sha512','uuid','json','jsonmin','countletters','countdigits','countspaces','countvowels','countconsonants','uniquechars','sortwords','sortlines','uniqueWords','first','last','initials','initialsDots','quote','brackets','braces','code','bullet','numbered','csv','urlhost','protocol','domain','phoneclean','digits','numbers','even','odd','sum','average'
];
const commandModules = [];
for (const action of actionNames) {
  for (let i = 0; i < 100; i++) {
    const suffix = suffixes[i];
    const name = `ng_${action}_${suffix}`;
    commandModules.push({
      name,
      category: 'ngm-utility',
      description: `NICEGOLD utility: ${action}. Use .${name} <text/value>.`,
      execute: async ({ sock, from, args }) => {
        const input = args.join(' ');
        if (!input && !['uuid','yesno','coin','dice','timestamp','iso','date','time','now'].includes(action)) {
          return sock.sendMessage(from,{text:`Usage: .${name} <text/value>`});
        }
        try {
          const out = actions[action](input);
          await sock.sendMessage(from,{text:`𓉳 ⃝𝗡𝗜𝗖𝗘𝗚𝗢𝗟𝗗 ⃝ 𝗠𝗢𝗡𓉳『ɴɢᴍ』\n\n${String(out).slice(0,3900)}`});
        } catch (e) {
          await sock.sendMessage(from,{text:`❌ ${e.message}`});
        }
      },
    });
  }
}

module.exports = { multi: commandModules };
