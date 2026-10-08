# 𓉳 ⃝𝗡𝗜𝗖𝗘𝗚𝗢𝗟𝗗 ⃝ 𝗠𝗢𝗡𓉳『ɴɢᴍ』

Modular WhatsApp utility bot built on Baileys, with Telegram-controlled pairing.

## Upgrade

This build includes a redesigned image dashboard menu plus **6,000 generated local utility commands** powered by one reusable command engine. The 6,000 commands are registered individually, but they do not create 6,000 separate files.

Useful bot commands include:

- `.menu` — open the NICEGOLD dashboard
- `.commands <category> [page]` — browse commands
- `.searchcmd <word>` — search the command registry
- `.cmdinfo <command>` — inspect a command
- `.ng_upper_quick hello` — uppercase text
- `.ng_base64_ngm hello` — Base64 encode text
- `.ng_sha256_gold hello` — SHA-256 hash
- `.ng_sum_prime 10 20 30` — add numbers
- `.ng_average_prime 10 20 30` is available when the conversion family is enabled in the utility engine.

The exact generated command names can be searched with `.searchcmd`.

## Included image assets

- `assets/nicegold.jpg` — existing NICEGOLD image used by the bot/menu/profile-picture logic.
- `assets/nicegold-dashboard.png` — upgraded NICEGOLD MON dashboard artwork used by `.menu`.

## Telegram pairing

1. Create a Telegram bot with BotFather and copy its token.
2. Put the token in `.env` or the host's environment variables as `TELEGRAM_BOT_TOKEN`.
3. Start with `npm install && npm start`.
4. Open the Telegram bot and use `/pair 2348012345678`.
5. The bot replies with a WhatsApp pairing code.

## Environment

```env
OWNER_NUMBERS=2348012345678
BOT_PREFIX=.
TELEGRAM_BOT_TOKEN=
```

Never share the Telegram token or WhatsApp session credentials.
