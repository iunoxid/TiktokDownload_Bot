// bot/bot_core.js
const TelegramBot = require('node-telegram-bot-api');
const { logs } = require('../utils/common_utils');
const { BOT_TOKEN, ADMIN_CHAT_ID } = require('../config/app_config');
const { MIN_BOT_TOKEN_LENGTH } = require('../config/constants');

// Validate bot token
if (!BOT_TOKEN) {
  logs('error', 'BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

if (typeof BOT_TOKEN !== 'string' || BOT_TOKEN.length < MIN_BOT_TOKEN_LENGTH) {
  logs('error', 'BOT_TOKEN appears to be invalid (too short or wrong type)');
  process.exit(1);
}

// Mengimpor semua command dan event handler
const startCommand = require('./commands/start');
const helpCommand = require('./commands/help');
const runtimeCommand = require('./commands/runtime');
const { statsCommand, broadcastCommand, banCommand, unbanCommand } = require('./commands/admin');
const messageHandler = require('./handlers/message_handler');
const callbackQueryHandler = require('./handlers/callback_query_handler');

// Create bot instance without polling (mode will be chosen later in run-polling.js or webhook.js)
logs('info', 'Creating Telegram bot instance...');
const bot = new TelegramBot(BOT_TOKEN);
const startTime = new Date();

// Set bot start time for /runtime command
runtimeCommand.setBotStartTime(startTime);

// Set default command menu for regular users
const regularCommands = [
  { command: '/start', description: 'Mulai bot / Start the bot' },
  { command: '/help', description: 'Panduan penggunaan / View usage guide' },
  { command: '/runtime', description: 'Cek waktu aktif bot / Check bot uptime' },
];

// Set admin command menu (includes admin commands)
const adminCommands = [
  { command: '/start', description: 'Mulai bot / Start the bot' },
  { command: '/help', description: 'Panduan penggunaan / View usage guide' },
  { command: '/runtime', description: 'Cek waktu aktif bot / Check bot uptime' },
  { command: '/stats', description: '📊 Bot analytics & statistics (Admin)' },
  { command: '/broadcast', description: '📢 Broadcast message to all users (Admin)' },
  { command: '/ban', description: '🚫 Ban user from bot (Admin)' },
  { command: '/unban', description: '✅ Unban user from bot (Admin)' },
];

// Set default command menu for everyone
bot.setMyCommands(regularCommands);

// Function to set user-specific commands
const setUserCommands = async (chatId) => {
  try {
    if (ADMIN_CHAT_ID && chatId === ADMIN_CHAT_ID) {
      await bot.setMyCommands(adminCommands, { scope: { type: 'chat', chat_id: chatId } });
      logs('info', '👑 Admin command menu set', { AdminID: chatId });
    } else {
      // Ensure regular users see only basic commands
      await bot.setMyCommands(regularCommands, { scope: { type: 'chat', chat_id: chatId } });
    }
  } catch (error) {
    logs('warning', 'Failed to set user-specific commands', { ChatID: chatId, Error: error.message });
  }
};

// Attach all event listeners to the bot
bot.on('message', async (msg) => {
  // Set user-specific commands on first interaction
  if (msg.text && msg.text.startsWith('/')) {
    await setUserCommands(msg.chat.id);
  }
  messageHandler(bot, msg);
});
bot.on('callback_query', (query) => callbackQueryHandler(bot, query));
bot.onText(/^\/start$/, (msg) => startCommand(bot, msg));
bot.onText(/^\/help$/, (msg) => helpCommand(bot, msg));
bot.onText(/^\/runtime$/, (msg) => runtimeCommand(bot, msg));
bot.onText(/^\/stats$/, (msg) => statsCommand(bot, msg));
bot.onText(/^\/broadcast/, (msg) => broadcastCommand(bot, msg));
bot.onText(/^\/ban/, (msg) => banCommand(bot, msg));
bot.onText(/^\/unban/, (msg) => unbanCommand(bot, msg));
bot.on('polling_error', (error) => logs('error', 'Polling error occurred!', { Error: error.message }));

logs('success', 'Telegram bot instance created and listeners are attached.');

// Export the setUserCommands function for use in other modules
bot.setUserCommands = setUserCommands;

// Export ready-to-use bot instance for other files
module.exports = bot;