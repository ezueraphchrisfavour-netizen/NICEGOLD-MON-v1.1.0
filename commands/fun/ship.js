module.exports = {
  name: 'ship',
  category: 'fun',
  description: 'Ship two names: .ship Alex Zuri',
  execute: async ({ sock, from, args }) => {
    if (args.length < 2) {
      return sock.sendMessage(from, { text: 'Usage: .ship <name1> <name2>' });
    }
    const [a, b] = args;
    const percentage = Math.floor(Math.random() * 101);
    await sock.sendMessage(from, {
      text: `💘 ${a} × ${b}\nCompatibility: ${percentage}%`,
    });
  },
};
