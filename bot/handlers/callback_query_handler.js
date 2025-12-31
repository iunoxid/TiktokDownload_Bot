// bot/handlers/callback_query_handler.js
const { logs, getLocalizedMessage } = require('../../utils/common_utils');
const { MAX_DOWNLOAD_RETRIES, DOWNLOAD_TIMEOUT } = require('../../config/constants');
const { retryWithBackoff } = require('../../utils/retry_utils');
const { setUserLanguage, getUserLanguage, addUser } = require('../../data/data_store');
const { trackUser, trackDownload, isUserBanned } = require('../../data/analytics_store');
const { MESSAGES, ADMIN_CHAT_ID } = require('../../config/app_config');
const start = require('../commands/start');
const help = require('../commands/help');
const runtime = require('../commands/runtime');
const { statsCommand, broadcastCommand, banCommand, unbanCommand } = require('../commands/admin');
const { ttdl } = require('btch-downloader');
const axios = require('axios');

const formatRetryMessage = (lang, attempt, maxRetries) => {
  const template = getLocalizedMessage(lang, 'retrying_download', MESSAGES);
  return template.replace('{attempt}', attempt).replace('{max}', maxRetries);
};

const withTimeout = (promise, ms, label) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.code = 'ETIMEDOUT';
      reject(err);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
};

module.exports = async (bot, callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;
  
  // Check if user is banned
  if (isUserBanned(callbackQuery.from.id)) {
    logs('warning', 'Banned user attempted callback query', { UserID: callbackQuery.from.id });
    return;
  }
  
  // Enhanced user logging for callbacks
  const userInfo = {
    UserID: callbackQuery.from.id,
    Username: callbackQuery.from.username || 'No username',
    FirstName: callbackQuery.from.first_name || 'Unknown',
    ChatType: msg.chat.type
  };
  
  // Track user activity
  addUser(callbackQuery.from.id, callbackQuery.from.username, callbackQuery.from.first_name);
  trackUser(callbackQuery.from.id, callbackQuery.from.username);

  logs('info', '🔘 Callback query received', { ...userInfo, DataPrefix: data.split(':')[0], FullData: data });

  try {
    await bot.answerCallbackQuery(callbackQuery.id);

    if (data.startsWith('lang_')) {
      const lang = data.split('_')[1];
      logs('info', '🌐 Language change requested', { ...userInfo, NewLanguage: lang });
      setUserLanguage(chatId, lang);
      await bot.sendMessage(chatId, `Bahasa telah diubah ke ${lang === 'id' ? 'Indonesia' : 'English'}.`);
      await start(bot, msg);
      logs('success', '✅ Language changed successfully', { ...userInfo, Language: lang });
      return;
    }

    if (data.startsWith('download_audio:')) {
      const shortId = data.substring('download_audio:'.length);
      
      logs('info', '🎵 Audio download requested', { ...userInfo, ShortID: shortId });
      
      // Import the URL mapping from tiktok_video plugin
      const tiktokVideoPlugin = require('../plugins/tiktok_video');
      const tiktokUrl = tiktokVideoPlugin.getUrlFromMapping ? tiktokVideoPlugin.getUrlFromMapping(shortId) : null;
      
      if (!tiktokUrl) {
        logs('warning', '⏰ Audio download failed - expired link', { ...userInfo, ShortID: shortId });
        await bot.sendMessage(chatId, '❌ Link sudah kadaluarsa. Silakan kirim ulang link TikTok.');
        return;
      }
      
      logs('info', '🔍 Processing audio download', { ...userInfo, URL: tiktokUrl });
      let processingMsg = null;
      try {
        processingMsg = await bot.sendMessage(chatId, '⏳ Memproses ulang untuk audio, mohon tunggu...');
        
        const lang = getUserLanguage(chatId) || 'en';
        const audioResult = await retryWithBackoff(
          async () => {
            const tiktokData = await withTimeout(ttdl(tiktokUrl), DOWNLOAD_TIMEOUT, 'TikTok Audio Download');
            const audioUrl = (tiktokData.audio && typeof tiktokData.audio === 'string') ? tiktokData.audio : (Array.isArray(tiktokData.audio) && tiktokData.audio.length > 0) ? tiktokData.audio[0] : null;

            if (!audioUrl) {
              throw new Error('Audio URL not found on re-fetch.');
            }

            logs('info', '????,? Downloading audio file', { ...userInfo, AudioURL: audioUrl.substring(0, 50) + '...' });
            const response = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: DOWNLOAD_TIMEOUT });
            const audioBuffer = Buffer.from(response.data, 'binary');

            return { tiktokData, audioUrl, audioBuffer };
          },
          MAX_DOWNLOAD_RETRIES,
          2000,
          'TikTok Audio Download',
          async ({ attempt, maxRetries }) => {
            if (!processingMsg) return;
            const nextAttempt = Math.min(attempt + 1, maxRetries);
            const retryText = formatRetryMessage(lang, nextAttempt, maxRetries);
            await bot.editMessageText(retryText, { chat_id: chatId, message_id: processingMsg.message_id }).catch(e =>
              logs('warning', 'Failed to update retry message', { ChatID: chatId, Error: e.message })
            );
          }
        );

        const { tiktokData, audioBuffer } = audioResult;

        // Create filename from audio title
        let audioTitle = tiktokData.title_audio || 'audio_iuno_in';
        const sanitizedFilename = audioTitle.replace(/[/\?%*:|"<>]/g, '-') + '.mp3';

        // Send as document with custom filename
        await bot.sendDocument(chatId, audioBuffer, {
          caption: `Audio dari: ${tiktokData.title || ''}`
        }, {
          filename: sanitizedFilename,
          contentType: 'audio/mpeg'
        });

        await bot.deleteMessage(chatId, processingMsg.message_id);
        trackDownload('audios', true);
        logs('success', 'dYZ? Audio sent successfully', { 
          ...userInfo, 
          Filename: sanitizedFilename,
          FileSize: audioBuffer.length
        });

      } catch (error) {
        logs('error', '❌ Audio download failed', {
          ...userInfo,
          Error: error.message,
          ErrorType: error.name || 'Unknown'
        });
        if (processingMsg) {
          await bot.deleteMessage(chatId, processingMsg.message_id);
        }
        await bot.sendMessage(chatId, getLocalizedMessage(getUserLanguage(chatId), 'error_sending_audio', MESSAGES));
      }
      return;
    }

    // Check for admin commands
    if (data.startsWith('admin_')) {
      const isAdmin = ADMIN_CHAT_ID && callbackQuery.from.id === ADMIN_CHAT_ID;
      
      if (!isAdmin) {
        await bot.sendMessage(chatId, '❌ Access denied. Admin only feature.');
        return;
      }

      switch (data) {
        case 'admin_stats':
          logs('info', '📊 Admin stats via callback', userInfo);
          await statsCommand(bot, { ...msg, from: callbackQuery.from, chat: { id: chatId } });
          break;
        case 'admin_broadcast':
          await bot.sendMessage(chatId, '📢 **Broadcast Command**\n\nUsage: `/broadcast Your message here`\n\nExample: `/broadcast 🎆 Bot updated with new features!`', { parse_mode: 'Markdown' });
          break;
        case 'admin_ban':
          await bot.sendMessage(chatId, '🚫 **Ban User Command**\n\nUsage: `/ban <userID>`\n\nExample: `/ban 123456789`\n\nTo get user ID, forward their message to @userinfobot', { parse_mode: 'Markdown' });
          break;
        case 'admin_unban':
          await bot.sendMessage(chatId, '✅ **Unban User Command**\n\nUsage: `/unban <userID>`\n\nExample: `/unban 123456789`', { parse_mode: 'Markdown' });
          break;
        default:
          await bot.sendMessage(chatId, '❓ Unknown admin command.');
          break;
      }
      return;
    }

    switch (data) {
      case 'start':
        logs('info', '▶️ Start command via callback', userInfo);
        await start(bot, msg);
        break;
      case 'help':
        logs('info', '❓ Help command via callback', userInfo);
        await help(bot, msg);
        break;
      case 'runtime':
        logs('info', '⏱️ Runtime command via callback', userInfo);
        await runtime(bot, msg);
        break;
      default:
        logs('warning', '❓ Unknown callback command', { ...userInfo, UnknownCommand: data });
        await bot.sendMessage(chatId, 'Perintah tidak dikenal.');
        break;
    }
  } catch (error) {
    logs('error', '❌ Callback query handling failed', {
      ...userInfo,
      Data: data,
      Error: error.message,
      ErrorType: error.name || 'Unknown'
    });
  }
};