require('dotenv').config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const { loadCommands } = require('./config/commandLoader');
const { parseMessage } = require('./config/parser');
const { load, save } = require('./config/store');
const { getGame, endGame } = require('./config/pianoGames');

const BOT_NAME = '𓉳 ⃝𝗡𝗜𝗖𝗘𝗚𝗢𝗟𝗗 ⃝ 𝗠𝗢𝗡𓉳『ɴɢᴍ』';

const OWNER_NUMBERS = (process.env.OWNER_NUMBERS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

let commands = loadCommands();
let activeSock = null;
let telegramBot = null;
let starting = false;
let reconnectTimer = null;

/*
 * Pairing requests are queued here.
 * Telegram /pair can arrive while the WhatsApp socket is still starting.
 */
let pendingPairing = null;

/*
 * Keep the latest requested phone number private.
 * It is never printed to the terminal.
 */
let pairingInProgress = false;

async function startBot(pairPhone = null) {
  if (starting) {
    if (pairPhone) {
      pendingPairing = pairPhone;
    }
    return;
  }

  starting = true;

  if (pairPhone) {
    pendingPairing = pairPhone;
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');

    let version;

    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
      console.log('[whatsapp] Baileys version:', version.join('.'));
    } catch (e) {
      console.warn('[whatsapp] Could not fetch latest version:', e.message);
      version = undefined;
    }

    const sockOptions = {
      auth: state,
      logger: pino({ level: 'warn' }),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
    };

    if (version) {
      sockOptions.version = version;
    }

    const sock = makeWASocket(sockOptions);

    activeSock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const {
        connection,
        lastDisconnect,
        qr,
      } = update;

      /*
       * If Telegram pairing has been requested and this is a new
       * unregistered session, request the code while the socket
       * is connecting.
       */
      if (
        pendingPairing &&
        !state.creds.registered &&
        !pairingInProgress &&
        (connection === 'connecting' || qr)
      ) {
        const phone = pendingPairing;
        pendingPairing = null;
        pairingInProgress = true;

        try {
          console.log('[pairing] Requesting WhatsApp pairing code...');

          const code = await sock.requestPairingCode(phone);

          const formatted =
            String(code).match(/.{1,4}/g)?.join('-') || code;

          if (telegramBot) {
            /*
             * We intentionally do not log the actual pairing code.
             */
            const chatId = pairingRequestChatId;

            if (chatId) {
              await telegramBot.sendMessage(
                chatId,
                `🔐 NICEGOLD MON PAIRING CODE\n\n${formatted}\n\n` +
                `On WhatsApp:\n` +
                `Linked Devices → Link a Device → Link with phone number instead → enter this code.\n\n` +
                `Keep this code private.`
              );
            }
          }

          console.log('[pairing] Pairing code sent to Telegram.');
        } catch (err) {
          console.error('[pairing] Failed:', err.message);

          if (telegramBot && pairingRequestChatId) {
            try {
              await telegramBot.sendMessage(
                pairingRequestChatId,
                `❌ Pairing failed: ${err.message}`
              );
            } catch (_) {}
          }
        } finally {
          pairingInProgress = false;
          pairingRequestChatId = null;
        }
      }

      /*
       * Terminal QR fallback only when Telegram pairing is disabled.
       */
      if (qr && !TELEGRAM_BOT_TOKEN) {
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        const shouldReconnect =
          statusCode !== DisconnectReason.loggedOut;

        console.log(
          '[connection] closed. reconnecting:',
          shouldReconnect
        );

        activeSock = null;
        starting = false;

        /*
         * If a pairing request is still waiting, restart quickly.
         */
        if (pendingPairing) {
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }

          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            startBot();
          }, 1500);

          return;
        }

        if (shouldReconnect) {
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
          }

          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            startBot();
          }, 3000);
        }
      }

      if (connection === 'open') {
        starting = false;

        console.log(
          `[connection] open — ${BOT_NAME} is live`
        );

        await setProfilePicture(sock);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];

      if (!msg?.message || msg.key.fromMe) return;

      const from = msg.key.remoteJid;
      const sender =
        msg.key.participant ||
        msg.key.remoteJid;

      const isGroup = from.endsWith('@g.us');

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        '';

      if (isGroup) {
        await checkAntiLink({
          sock,
          msg,
          from,
          sender,
          body,
        });

        await checkAntiSpam({
          sock,
          from,
          sender,
        });
      }

      if (/^\d+$/.test(body.trim())) {
        const handled = await checkPianoGuess({
          sock,
          from,
          sender,
          guess: parseInt(body.trim(), 10),
        });

        if (handled) return;
      }

      const parsed = parseMessage(body);

      if (!parsed) return;

      const command = commands.get(parsed.command);

      if (!command) return;

      let isAdmin = false;

      const isOwner =
        OWNER_NUMBERS.includes(
          sender.split('@')[0]
        );

      if (
        isGroup &&
        (command.adminOnly || command.groupOnly)
      ) {
        try {
          const meta =
            await sock.groupMetadata(from);

          const participant =
            meta.participants.find(
              p => p.id === sender
            );

          isAdmin =
            participant?.admin === 'admin' ||
            participant?.admin === 'superadmin';
        } catch (e) {
          console.warn(
            '[groupMetadata] failed:',
            e.message
          );
        }
      }

      if (command.groupOnly && !isGroup) {
        return sock.sendMessage(from, {
          text:
            '⚠️ This command only works in groups.',
        });
      }

      if (command.ownerOnly && !isOwner) {
        return sock.sendMessage(from, {
          text:
            '⛔ Owner-only command.',
        });
      }

      if (
        command.adminOnly &&
        !isAdmin &&
        !isOwner
      ) {
        return sock.sendMessage(from, {
          text:
            '⛔ Admins only.',
        });
      }

      try {
        await command.execute({
          sock,
          msg,
          from,
          sender,
          args: parsed.args,
          isGroup,
          isAdmin,
          isOwner,
          allCommands: commands,
          invokedAs: parsed.command,
        });
      } catch (err) {
        console.error(
          `[command:${parsed.command}] error:`,
          err
        );

        await sock.sendMessage(from, {
          text:
            `❌ Error running .${parsed.command}: ${err.message}`,
        });
      }
    });

    sock.ev.on(
      'group-participants.update',
      async event => {
        const {
          id: groupId,
          participants,
          action,
        } = event;

        const greetings =
          load('greetings', {});

        const config =
          greetings[groupId]?.[
            action === 'add'
              ? 'welcome'
              : 'goodbye'
          ];

        if (!config?.enabled) return;

        for (const p of participants) {
          const name =
            `@${p.split('@')[0]}`;

          const text = (
            config.message ||
            (
              action === 'add'
                ? 'Welcome {user}!'
                : 'Goodbye {user}.'
            )
          ).replace('{user}', name);

          await sock.sendMessage(groupId, {
            text,
            mentions: [p],
          });
        }
      }
    );

    sock.ev.on('reload-commands', () => {
      commands = loadCommands();
    });

  } catch (err) {
    starting = false;

    console.error(
      '[startup] failed:',
      err
    );

    if (pendingPairing) {
      setTimeout(() => {
        startBot();
      }, 3000);

      return;
    }

    setTimeout(() => {
      startBot();
    }, 5000);
  }
}

async function setProfilePicture(sock) {
  const imagePath =
    path.join(
      __dirname,
      'assets',
      'nicegold.jpg'
    );

  if (
    !fs.existsSync(imagePath) ||
    !sock?.user?.id ||
    !sock.updateProfilePicture
  ) {
    return;
  }

  try {
    await sock.updateProfilePicture(
      sock.user.id,
      {
        url: imagePath,
      }
    );

    console.log(
      '[profile] NICEGOLD image applied'
    );
  } catch (e) {
    console.warn(
      '[profile] could not update picture:',
      e.message
    );
  }
}

/*
 * Telegram chat that requested the current pairing code.
 */
let pairingRequestChatId = null;

function startTelegramPairing() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log(
      '[telegram] TELEGRAM_BOT_TOKEN not set — terminal QR mode is available.'
    );

    return;
  }

  const TelegramBot =
    require('node-telegram-bot-api');

  telegramBot =
    new TelegramBot(
      TELEGRAM_BOT_TOKEN,
      {
        polling: true,
      }
    );

  telegramBot.onText(
    /^\/start$/,
    async msg => {
      await telegramBot.sendMessage(
        msg.chat.id,
        `𓉳 ⃝𝗡𝗜𝗖𝗘𝗚𝗢𝗟𝗗₊ ⃝ 𝗠𝗢𝗡𓉳 ⃝ 𓃵\n\n` +
        `WhatsApp pairing is controlled from Telegram.\n\n` +
        `Use:\n` +
        `/pair 2348012345678\n` +
        `/status`
      );
    }
  );

  telegramBot.onText(
    /^\/status$/,
    async msg => {
      const status =
        activeSock?.user
          ? `CONNECTED as ${activeSock.user.id.split(':')[0]}`
          : 'NOT CONNECTED';

      await telegramBot.sendMessage(
        msg.chat.id,
        `NICEGOLD MON status: ${status}`
      );
    }
  );

  telegramBot.onText(
    /^\/pair(?:\s+(.+))?$/,
    async (msg, match) => {
      const raw =
        (match?.[1] || '').trim();

      const phone =
        raw.replace(/\D/g, '');

      if (
        !phone ||
        phone.length < 8
      ) {
        return telegramBot.sendMessage(
          msg.chat.id,
          'Usage: /pair 2348012345678'
        );
      }

      /*
       * Remember which Telegram chat should receive
       * the pairing result.
       */
      pairingRequestChatId =
        msg.chat.id;

      pendingPairing = phone;

      try {
        await telegramBot.sendMessage(
          msg.chat.id,
          '⏳ Preparing WhatsApp pairing...'
        );

        /*
         * If an active socket already exists and is not
         * logged in, try the pairing request directly.
         */
        if (
          activeSock &&
          !activeSock.user
        ) {
          try {
            pairingInProgress = true;

            const code =
              await activeSock.requestPairingCode(
                phone
              );

            const formatted =
              String(code)
                .match(/.{1,4}/g)
                ?.join('-') ||
              code;

            await telegramBot.sendMessage(
              msg.chat.id,
              `🔐 NICEGOLD MON PAIRING CODE\n\n` +
              `${formatted}\n\n` +
              `On WhatsApp:\n` +
              `Linked Devices → Link a Device → ` +
              `Link with phone number instead → ` +
              `enter this code.\n\n` +
              `Keep this code private.`
            );

            pendingPairing = null;
            pairingInProgress = false;
            pairingRequestChatId = null;

            return;
          } catch (err) {
            pairingInProgress = false;

            console.warn(
              '[telegram pairing] existing socket failed:',
              err.message
            );
          }
        }

        /*
         * No usable socket. Start a fresh pairing session.
         */
        activeSock = null;
        starting = false;

        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        startBot(phone);

      } catch (err) {
        pendingPairing = null;
        pairingInProgress = false;
        pairingRequestChatId = null;

        console.error(
          '[telegram pairing] error:',
          err
        );

        await telegramBot.sendMessage(
          msg.chat.id,
          `❌ Pairing failed: ${err.message}`
        );
      }
    }
  );

  telegramBot.on(
    'polling_error',
    err => {
      console.error(
        '[telegram] polling error:',
        err.message
      );
    }
  );

  console.log(
    '[telegram] pairing bridge is online'
  );
}

async function checkAntiLink({
  sock,
  msg,
  from,
  sender,
  body,
}) {
  const settings =
    load('antilink', {});

  const groupSettings =
    settings[from];

  if (!groupSettings?.enabled) {
    return;
  }

  const linkRegex =
    /(https?:\/\/|www\.|chat\.whatsapp\.com)/i;

  if (!linkRegex.test(body)) {
    return;
  }

  const ownerHit =
    (process.env.OWNER_NUMBERS || '')
      .includes(sender.split('@')[0]);

  if (ownerHit) {
    return;
  }

  try {
    await sock.sendMessage(
      from,
      {
        delete: msg.key,
      }
    );
  } catch (e) {
    console.warn(
      '[antilink] could not delete message:',
      e.message
    );
  }

  const warnings =
    load('warnings', {});

  warnings[from] =
    warnings[from] || {};

  warnings[from][sender] =
    (warnings[from][sender] || 0) + 1;

  save(
    'warnings',
    warnings
  );

  const count =
    warnings[from][sender];

  const limit =
    groupSettings.limit || 3;

  await sock.sendMessage(
    from,
    {
      text:
        `🔗 Link detected and removed.\n` +
        `@${sender.split('@')[0]} — warning ${count}/${limit}`,
      mentions: [sender],
    }
  );

  if (
    count >= limit &&
    groupSettings.action === 'kick'
  ) {
    try {
      await sock.groupParticipantsUpdate(
        from,
        [sender],
        'remove'
      );

      warnings[from][sender] = 0;

      save(
        'warnings',
        warnings
      );
    } catch (e) {
      console.warn(
        '[antilink] could not kick:',
        e.message
      );
    }
  }
}

const spamWindows =
  new Map();

async function checkAntiSpam({
  sock,
  from,
  sender,
}) {
  const settings =
    load('antispam', {});

  const cfg =
    settings[from];

  if (!cfg?.enabled) {
    return;
  }

  const key =
    `${from}:${sender}`;

  const now =
    Date.now();

  const timestamps =
    (
      spamWindows.get(key) || []
    ).filter(
      t =>
        now - t <
        cfg.windowMs
    );

  timestamps.push(now);

  spamWindows.set(
    key,
    timestamps
  );

  if (
    timestamps.length >
    cfg.max
  ) {
    spamWindows.set(
      key,
      []
    );

    await sock.sendMessage(
      from,
      {
        text:
          `🚫 @${sender.split('@')[0]} is sending messages too fast — slow down.`,
        mentions: [sender],
      }
    );
  }
}

async function checkPianoGuess({
  sock,
  from,
  sender,
  guess,
}) {
  const game =
    getGame(from);

  if (!game) {
    return false;
  }

  if (
    guess !==
    game.winningTile
  ) {
    return false;
  }

  endGame(from);

  const economy =
    load('economy', {});

  economy[sender] =
    economy[sender] || {
      balance: 0,
      lastDaily: 0,
      level: 1,
      xp: 0,
    };

  economy[sender].balance +=
    100;

  save(
    'economy',
    economy
  );

  await sock.sendMessage(
    from,
    {
      text:
        `🎹 @${sender.split('@')[0]} hit the right key and won 100 coins!`,
      mentions: [sender],
    }
  );

  return true;
}

startBot();
startTelegramPairing();
