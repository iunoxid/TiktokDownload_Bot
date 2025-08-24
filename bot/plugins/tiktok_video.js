// bot/plugins/tiktok_video.js
const { getLocalizedMessage, escapeMarkdownV2 } = require('../../utils/common_utils');
const { MESSAGES, SUPPORT_TELEGRAM_URL } = require('../../config/app_config');
const { MAX_URL_MAPPINGS, URL_MAPPING_TTL, URL_MAPPING_CLEANUP_INTERVAL, MAX_TITLE_LENGTH } = require('../../config/constants');

// In-memory store for URL mapping with TTL
const urlMapping = new Map();
const urlMappingTimestamps = new Map();

// Cleanup expired URL mappings
const cleanupExpiredMappings = () => {
  const now = Date.now();
  for (const [key, timestamp] of urlMappingTimestamps.entries()) {
    if (now - timestamp > URL_MAPPING_TTL) {
      urlMapping.delete(key);
      urlMappingTimestamps.delete(key);
    }
  }
};

// Run cleanup periodically
setInterval(cleanupExpiredMappings, URL_MAPPING_CLEANUP_INTERVAL);

const sendTikTokVideo = async (bot, msg, data, lang) => {
  const chatId = msg.chat.id;
  const originalUrl = msg.text; // Original TikTok URL from user

  const videoUrl = (data.video && typeof data.video[0] === 'string') ? data.video[0] : null;
  const audioUrl = (data.audio && typeof data.audio === 'string') ? data.audio : (Array.isArray(data.audio) && data.audio.length > 0) ? data.audio[0] : null;

  if (!videoUrl) {
    return bot.sendMessage(chatId, getLocalizedMessage(lang, 'no_video_url_found', MESSAGES), { parse_mode: 'Markdown' });
  }

  let videoTitle = data.title || 'Not available';
  let audioTitle = data.title_audio || 'Not available';
  if (videoTitle.length > MAX_TITLE_LENGTH) videoTitle = videoTitle.substring(0, MAX_TITLE_LENGTH) + '...';
  if (audioTitle.length > MAX_TITLE_LENGTH) audioTitle = audioTitle.substring(0, MAX_TITLE_LENGTH) + '...';

  // Escape special characters for MarkdownV2
  const escapedVideoTitle = escapeMarkdownV2(videoTitle);
  const escapedAudioTitle = escapeMarkdownV2(audioTitle);
  
  const captionText = [`*Title* : ${escapedVideoTitle}`, `*Audio* : ${escapedAudioTitle}`].join('\n');
  const successMessage = '✅ *Video downloaded successfully\\!*';
  const finalCaption = `${captionText}\n\n${successMessage}`;

  const inlineKeyboard = [];
  const row1 = [];

  row1.push({ text: '🔗 URL Video', url: videoUrl });

  // --- PERUBAHAN STRATEGI CALLBACK ---
  if (audioUrl) {
    // Generate short ID and store URL mapping with timestamp
    const shortId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    urlMapping.set(shortId, originalUrl);
    urlMappingTimestamps.set(shortId, Date.now());
    
    // Clean up old entries (keep only last MAX_URL_MAPPINGS)
    if (urlMapping.size > MAX_URL_MAPPINGS) {
      const firstKey = urlMapping.keys().next().value;
      urlMapping.delete(firstKey);
      urlMappingTimestamps.delete(firstKey);
    }
    
    row1.push({ text: '🎧 Download Audio', callback_data: `download_audio:${shortId}` });
  }
  // --- AKHIR PERUBAHAN ---

  if (row1.length > 0) {
    inlineKeyboard.push(row1);
  }

  inlineKeyboard.push([{ text: '❤️ Support iuno.in', url: SUPPORT_TELEGRAM_URL }]);

  try {
    await bot.sendVideo(chatId, videoUrl, {
      caption: finalCaption,
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
  } catch (error) {
    console.error('Error sending TikTok video:', error.message);
    await bot.sendMessage(chatId, getLocalizedMessage(lang, 'error_sending_video', MESSAGES), { parse_mode: 'Markdown' });
  }
};

// Export function to get URL from mapping
const getUrlFromMapping = (shortId) => {
  return urlMapping.get(shortId);
};

// Export function to set URL mapping (for use in tiktok_photo.js)
const setUrlMapping = (shortId, url) => {
  urlMapping.set(shortId, url);
  urlMappingTimestamps.set(shortId, Date.now());
  
  // Clean up old entries (keep only last MAX_URL_MAPPINGS)
  if (urlMapping.size > MAX_URL_MAPPINGS) {
    const firstKey = urlMapping.keys().next().value;
    urlMapping.delete(firstKey);
    urlMappingTimestamps.delete(firstKey);
  }
};

module.exports = sendTikTokVideo;
module.exports.getUrlFromMapping = getUrlFromMapping;
module.exports.setUrlMapping = setUrlMapping;