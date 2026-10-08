const fs = require('fs');
const path = require('path');

const BOT_NAME = '𓉳 ⃝𝗡𝗜𝗖𝗘𝗚𝗢𝗟𝗗 ⃝ 𝗠𝗢𝗡𓉳『ɴɢᴍ』';
const IMAGE_PATH = path.join(__dirname, '..', '..', 'assets', 'nicegold-dashboard.png');

function uniqueCommands(allCommands) {
  const seen = new Set();
  const out = [];
  for (const cmd of allCommands.values()) {
    if (seen.has(cmd)) continue;
    seen.add(cmd);
    out.push(cmd);
  }
  return out;
}

function categoryMap(allCommands) {
  const map = new Map();
  for (const cmd of uniqueCommands(allCommands)) {
    const cat = String(cmd.category || 'misc').toLowerCase();
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(cmd);
  }
  for (const list of map.values()) list.sort((a,b)=>a.name.localeCompare(b.name));
  return map;
}

async function sendMenu({ sock, from, allCommands }) {
  const cats = categoryMap(allCommands);
  const total = [...cats.values()].reduce((n, list) => n + list.length, 0);
  const lines = [
    `${BOT_NAME}`,
    '',
    '╭━━〔 NGM UTILITY DASHBOARD 〕━━╮',
    `│ ⚡ Commands: ${total}`,
    `│ 📚 Categories: ${cats.size}`,
    '│',
    '│ .commands <category> [page]',
    '│ .searchcmd <word>',
    '│ .cmdinfo <command>',
    '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯',
    '',
  ];

  for (const [cat, list] of cats) {
    const preview = list.slice(0, 8).map(c => `.${c.name}`).join('  ');
    lines.push(`◆ ${cat.toUpperCase()} • ${list.length}`);
    lines.push(preview);
    lines.push('');
  }

  lines.push('Powered by NICEGOLD MON 『ɴɢᴍ』');
  const caption = lines.join('\n').slice(0, 3900);

  if (fs.existsSync(IMAGE_PATH)) {
    await sock.sendMessage(from, { image: { url: IMAGE_PATH }, caption });
  } else {
    await sock.sendMessage(from, { text: caption });
  }
}

module.exports = {
  multi: [
    {
      name: 'menu',
      aliases: ['help'],
      category: 'bot',
      description: 'Open the NICEGOLD MON utility dashboard.',
      execute: sendMenu,
    },
    {
      name: 'commands',
      aliases: ['cmds', 'listcmds'],
      category: 'bot',
      description: 'List commands in a category with pagination.',
      execute: async ({ sock, from, allCommands, args }) => {
        const cats = categoryMap(allCommands);
        const category = String(args[0] || '').toLowerCase();
        if (!category) {
          return sock.sendMessage(from, { text: `Usage: .commands <category> [page]\n\nCategories:\n${[...cats.keys()].sort().join(', ')}` });
        }
        const list = cats.get(category);
        if (!list) return sock.sendMessage(from, { text: `❌ Unknown category: ${category}` });
        const page = Math.max(1, Number(args[1]) || 1);
        const size = 30;
        const start = (page - 1) * size;
        const pages = Math.max(1, Math.ceil(list.length / size));
        const items = list.slice(start, start + size);
        const text = [
          BOT_NAME,
          `\n◆ ${category.toUpperCase()} • ${list.length} commands`,
          `Page ${Math.min(page,pages)}/${pages}\n`,
          ...items.map(c => `.${c.name} — ${c.description || 'Utility command'}`),
          '',
          `Next: .commands ${category} ${Math.min(page + 1, pages)}`,
        ].join('\n').slice(0, 3900);
        await sock.sendMessage(from, { text });
      },
    },
    {
      name: 'searchcmd',
      aliases: ['findcmd'],
      category: 'bot',
      description: 'Search the command registry by name or description.',
      execute: async ({ sock, from, allCommands, args }) => {
        const q = args.join(' ').toLowerCase().trim();
        if (!q) return sock.sendMessage(from, { text: 'Usage: .searchcmd <word>' });
        const matches = uniqueCommands(allCommands).filter(c => `${c.name} ${c.description || ''}`.toLowerCase().includes(q)).slice(0, 40);
        if (!matches.length) return sock.sendMessage(from, { text: `No commands found for “${q}”.` });
        await sock.sendMessage(from, { text: `${BOT_NAME}\n\n🔎 Results for: ${q}\n\n${matches.map(c=>`.${c.name} — ${c.description || ''}`).join('\n')}`.slice(0,3900) });
      },
    },
    {
      name: 'cmdinfo',
      aliases: ['commandinfo'],
      category: 'bot',
      description: 'Show details about one command.',
      execute: async ({ sock, from, allCommands, args }) => {
        const name = String(args[0] || '').toLowerCase();
        if (!name) return sock.sendMessage(from, { text: 'Usage: .cmdinfo <command>' });
        const cmd = allCommands.get(name);
        if (!cmd) return sock.sendMessage(from, { text: `❌ Command not found: ${name}` });
        await sock.sendMessage(from, { text: `${BOT_NAME}\n\n◆ .${cmd.name}\nCategory: ${cmd.category || 'misc'}\nDescription: ${cmd.description || 'No description'}\nAliases: ${(cmd.aliases || []).join(', ') || 'none'}` });
      },
    },
  ],
};
