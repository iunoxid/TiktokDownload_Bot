// bot/commands/start.js
const { logs, getLocalizedMessage } = require('../../utils/common_utils');
const { MESSAGES, ADMIN_CHAT_ID } = require('../../config/app_config');
const { getUserLanguage } = require('../../data/data_store');

// Function to get main inline keyboard (with admin buttons for admin)
const getMainKeyboard = (currentLang, isAdmin = false) => {
  const keyboard = [];

  const langButtons = [];
  if (currentLang !== 'id') {
    langButtons.push({ text: '🇮🇩 Bahasa Indonesia', callback_data: 'lang_id' });
  }
  if (currentLang !== 'en') {
    langButtons.push({ text: '🇬🇧 English', callback_data: 'lang_en' });
  }
  if (langButtons.length > 0) {
    keyboard.push(langButtons);
  }

  if (currentLang === 'id') {
    keyboard.push([
      { text: '🕒 Runtime Bot', callback_data: 'runtime' },
      { text: '📚 Panduan', callback_data: 'help' }
    ]);
  } else {
    keyboard.push([
      { text: '🕒 Bot Runtime', callback_data: 'runtime' },
      { text: '📚 Guide', callback_data: 'help' }
    ]);
  }

  // Admin-only buttons
  if (isAdmin) {
    if (currentLang === 'id') {
      keyboard.push([
        { text: '📊 Statistik Bot', callback_data: 'admin_stats' },
        { text: '📢 Broadcast', callback_data: 'admin_broadcast' }
      ]);
      keyboard.push([
        { text: '🚫 Ban User', callback_data: 'admin_ban' },
        { text: '✅ Unban User', callback_data: 'admin_unban' }
      ]);
    } else {
      keyboard.push([
        { text: '📊 Bot Statistics', callback_data: 'admin_stats' },
        { text: '📢 Broadcast', callback_data: 'admin_broadcast' }
      ]);
      keyboard.push([
        { text: '🚫 Ban User', callback_data: 'admin_ban' },
        { text: '✅ Unban User', callback_data: 'admin_unban' }
      ]);
    }
  }

  // Support button
  if (currentLang === 'id') {
    keyboard.push([
      { text: '❤️ Dukungan', url: MESSAGES.id.support_url }
    ]);
  } else {
    keyboard.push([
      { text: '❤️ Support', url: MESSAGES.en.support_url }
    ]);
  }

  return keyboard;
};

// Main function for /start command
const handleStartCommand = async (bot, msg) => {
  const chatId = msg.chat.id;
  const lang = getUserLanguage(chatId) || 'en';
  const isAdmin = ADMIN_CHAT_ID && chatId === ADMIN_CHAT_ID;

  try {
    // Set user-specific commands menu
    if (bot.setUserCommands) {
      await bot.setUserCommands(chatId);
    }

    let startMessage = getLocalizedMessage(lang, 'start', MESSAGES);
    
    // Add admin welcome message
    if (isAdmin) {
      const adminWelcome = lang === 'id' ? 
        '\n\n👑 **ADMIN PANEL AKTIF**\nAnda memiliki akses ke fitur admin khusus.' :
        '\n\n👑 **ADMIN PANEL ACTIVE**\nYou have access to exclusive admin features.';
      startMessage += adminWelcome;
    }
    
    const poweredBy = `\n\nPowered by: iuno.in`;
    
    await bot.sendMessage(chatId, startMessage + poweredBy, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: getMainKeyboard(lang, isAdmin) },
    });
    
    logs('info', 'Start command executed', { 
      ChatID: chatId, 
      Language: lang, 
      IsAdmin: isAdmin 
    });
  } catch (error) {
    logs('error', 'Start command failed', { ChatID: chatId, Error: error.message });
    await bot.sendMessage(chatId, getLocalizedMessage(lang, 'processing_error', MESSAGES), { parse_mode: 'Markdown' });
  }
};

module.exports = handleStartCommand;
module.exports.getMainKeyboard = getMainKeyboard;