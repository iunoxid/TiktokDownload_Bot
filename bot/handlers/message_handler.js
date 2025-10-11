// bot/handlers/message_handler.js
const axios = require('axios');
const { MAX_USER_INPUT_LENGTH, DEFAULT_TIMEOUT, AI_REQUEST_TIMEOUT, MAX_DOWNLOAD_RETRIES, MAX_AI_RETRIES, DOWNLOAD_TIMEOUT } = require('../../config/constants');
const { retryWithBackoff } = require('../../utils/retry_utils');

// Configure axios defaults for better error handling and timeouts
const axiosConfig = {
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'User-Agent': 'TikTok-Downloader-Bot/1.0'
  }
};

const httpClient = axios.create(axiosConfig);
const { logs, getLocalizedMessage } = require('../../utils/common_utils');
const { getUserLanguage, getConversationHistory, setConversationHistory, addUser } = require('../../data/data_store');
const { trackUser, trackCommand, trackDownload, trackAIQuery, trackError, isUserBanned } = require('../../data/analytics_store');
const { MESSAGES, AI_API_URL, AI_SYSTEM_PROMPT, AI_CHAT_HISTORY_LIMIT, SUPPORT_TELEGRAM_URL, BOT_AUTHOR, GROQ_API_KEY, GROQ_MODEL_NAME } = require('../../config/app_config');
const tiktok_video = require('../plugins/tiktok_video');
const tiktok_photo = require('../plugins/tiktok_photo');
const { version } = require('../../package.json');

const isPrivateChat = (msg) => msg.chat.type === 'private';

// Input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  // Remove potentially harmful characters and limit length
  return input.replace(/[<>"'&]/g, '').substring(0, MAX_USER_INPUT_LENGTH).trim();
};

const queryAI = async (bot, chatId, userMessage, lang) => {
  if (!GROQ_API_KEY) {
    logs('error', 'Groq API Key is not set.', { ChatID: chatId });
    await bot.sendMessage(chatId, getLocalizedMessage(lang, 'ai_error_fallback', MESSAGES), { parse_mode: 'Markdown' }).catch(e =>
      logs('error', 'Failed to send AI error message', { ChatID: chatId, Error: e.message })
    );
    return;
  }

  // Sanitize user input
  const sanitizedMessage = sanitizeInput(userMessage);
  if (!sanitizedMessage) {
    logs('warning', 'Empty or invalid user message after sanitization', { ChatID: chatId });
    return;
  }

  try {
    let currentHistory = getConversationHistory(chatId) || [];
    const systemPromptContent = AI_SYSTEM_PROMPT;
    if (currentHistory.length === 0 || currentHistory[0].role !== 'system') {
      currentHistory.unshift({ role: 'system', content: systemPromptContent });
    }
    currentHistory.push({ role: 'user', content: sanitizedMessage });

    // Limit conversation history to prevent memory bloat
    const maxHistoryItems = (AI_CHAT_HISTORY_LIMIT * 2) + 1; // +1 for system prompt
    if (currentHistory.length > maxHistoryItems) {
      currentHistory = [currentHistory[0], ...currentHistory.slice(-AI_CHAT_HISTORY_LIMIT * 2)];
    }
    setConversationHistory(chatId, currentHistory);

    // Use retry mechanism for AI API calls
    const response = await retryWithBackoff(
      async () => {
        return await httpClient.post(
          AI_API_URL,
          { messages: currentHistory, model: GROQ_MODEL_NAME },
          {
            headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
            timeout: AI_REQUEST_TIMEOUT
          }
        );
      },
      MAX_AI_RETRIES,
      1500, // 1.5 second base delay for AI (faster than downloads)
      'AI API Request'
    );

    // Validate response structure before accessing
    if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      throw new Error('Invalid API response structure');
    }

    const ai_response = response.data.choices[0].message.content;

    if (!ai_response || typeof ai_response !== 'string') {
      throw new Error('Invalid AI response content');
    }

    currentHistory.push({ role: 'assistant', content: ai_response });

    // Ensure history doesn't exceed limits after adding assistant response
    if (currentHistory.length > maxHistoryItems) {
      currentHistory = [currentHistory[0], ...currentHistory.slice(-AI_CHAT_HISTORY_LIMIT * 2)];
    }

    setConversationHistory(chatId, currentHistory);
    await bot.sendMessage(chatId, ai_response, { parse_mode: 'Markdown' }).catch(async (sendError) => {
      // Fallback: try sending without markdown if parsing fails
      logs('warning', 'Failed to send with Markdown, retrying as plain text', { ChatID: chatId });
      await bot.sendMessage(chatId, ai_response).catch(e =>
        logs('error', 'Failed to send AI response completely', { ChatID: chatId, Error: e.message })
      );
    });
  } catch (error) {
    // Enhanced error logging with more details
    const errorDetails = {
      ChatID: chatId,
      Error: error.message,
      ErrorCode: error.code,
      StatusCode: error.response?.status,
      ResponseData: error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : 'N/A'
    };

    logs('error', 'AI API request failed', errorDetails);
    trackError('ai_query_failed');

    // Send user-friendly error message
    await bot.sendMessage(chatId, getLocalizedMessage(lang, 'ai_error_fallback', MESSAGES), { parse_mode: 'Markdown' }).catch(e =>
      logs('error', 'Failed to send AI error fallback message', { ChatID: chatId, Error: e.message })
    );
  }
};

module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const lang = getUserLanguage(chatId) || 'en';

  if (msg.from.is_bot) return;

  // Check if user is banned
  if (isUserBanned(msg.from.id)) {
    logs('warning', 'Banned user attempted to use bot', { UserID: msg.from.id, Username: msg.from.username });
    return; // Silently ignore banned users
  }

  // Log user activity and track analytics
  const userInfo = {
    UserID: msg.from.id,
    Username: msg.from.username || 'No username',
    FirstName: msg.from.first_name || 'Unknown',
    ChatType: msg.chat.type
  };
  
  // Add/update user in database and track activity
  addUser(msg.from.id, msg.from.username, msg.from.first_name);
  trackUser(msg.from.id, msg.from.username);
  
  logs('info', 'Message received', { ...userInfo, MessageLength: text.length });

  const isTikTokUrlPattern = /^https:\/\/(www\.)?(vt\.)?tiktok\.com\//;
  const isTikTokUrl = isTikTokUrlPattern.test(text.trim());

  let processingMessageId = null;

  try {
    if (isTikTokUrl && text.trim() === text) {
      // Log TikTok URL processing
      logs('success', '🎵 TikTok URL detected and processing started', {
        ...userInfo,
        URL: text,
        URLLength: text.length
      });
      
      // Add random emoji reaction when TikTok link is received (using only basic supported reactions)
      const reactions = ['👍', '👎', '❤️', '🔥', '🥰', '👏', '😁', '🤔', '🤯', '😱', '🤬', '😢', '🎉', '🤩', '🤮', '💩', '🙏', '👌', '🕊', '🤡', '🥱', '🥴', '😍', '🐳', '❤️‍🔥', '🌚', '🌭', '💯', '🤣', '⚡', '🍌', '🏆', '💔', '🤨', '😐', '🍓', '🍾', '💋', '🖕', '😈', '😴', '😭', '🤓', '👻', '👨‍💻', '👀', '🎃', '🙈', '😇', '😨', '🤝', '✍️', '🤗', '🫡', '🎅', '🎄', '☃️', '💅', '🤪', '🗿', '🆒', '💘', '🙉', '🦄', '😘', '💊', '🙊', '😎', '👾', '🤷‍♂️', '🤷', '🤷‍♀️', '😡'];
      const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
      
      try {
        await bot.setMessageReaction(chatId, msg.message_id, { reaction: [{ type: 'emoji', emoji: randomReaction }] });
      } catch (reactionError) {
        logs('warning', 'Failed to add reaction', { ChatID: chatId, Error: reactionError.message });
      }
      
      const sentMessage = await bot.sendMessage(chatId, getLocalizedMessage(lang, 'processing', MESSAGES), { parse_mode: 'Markdown' });
      processingMessageId = sentMessage.message_id;

      try {
        const { ttdl } = require('btch-downloader');
        logs('info', 'Fetching TikTok data from API...', { ...userInfo, URL: text.trim() });

        // Use retry mechanism for TikTok downloads
        const data = await retryWithBackoff(
          async () => {
            return await ttdl(text.trim());
          },
          MAX_DOWNLOAD_RETRIES,
          2000, // 2 second base delay
          'TikTok Download'
        ).catch(err => {
          logs('error', 'TikTok downloader failed after retries', { ...userInfo, Error: err.message });
          throw err;
        });

        // Log successful data retrieval
        logs('success', 'TikTok data retrieved successfully', {
          ...userInfo,
          HasVideo: !!(data.video),
          HasAudio: !!(data.audio),
          VideoCount: Array.isArray(data.video) ? data.video.length : (data.video ? 1 : 0),
          Title: data.title ? data.title.substring(0, 50) + '...' : 'No title'
        });


        if (!data || (!data.video && !data.audio)) {
          throw new Error('Content not found');
        }

        const isMultiPhoto = data.video && data.video.length > 1;
        const isSinglePhotoByUrl = data.video && data.video.length === 1 && (data.video[0].includes('photomode') || data.video[0].endsWith('.jpeg'));
        
        if (processingMessageId) {
            await bot.deleteMessage(chatId, processingMessageId).catch(e => logs('warning', 'Failed to delete processing message on success', { ChatID: chatId, Error: e.message }));
            processingMessageId = null; 
        }

        if (isMultiPhoto || isSinglePhotoByUrl) {
          logs('info', '📷 Processing as photo/slideshow', { ...userInfo, PhotoCount: data.video ? data.video.length : 0 });
          await tiktok_photo(bot, msg, data, lang);
          trackDownload('photos', true);
          logs('success', '✅ Photo/slideshow sent successfully', userInfo);
        } else {
          logs('info', '🎥 Processing as video', userInfo);
          await tiktok_video(bot, msg, data, lang);
          trackDownload('videos', true);
          logs('success', '✅ Video sent successfully', userInfo);
        }

      } catch (downloadError) {
        trackDownload('videos', false);
        trackError('download_failed');
        logs('error', '❌ TikTok download failed', {
          ...userInfo,
          URL: text,
          Error: downloadError.message,
          ErrorType: downloadError.name || 'Unknown'
        });

        if (processingMessageId) {
            await bot.deleteMessage(chatId, processingMessageId).catch(e => logs('warning', 'Failed to delete processing message on error', { ChatID: chatId, Error: e.message }));
        }

        let errorMessage = getLocalizedMessage(lang, 'download_failed', MESSAGES);
        if (downloadError.message.toLowerCase().includes('content not found')) {
            errorMessage = getLocalizedMessage(lang, 'content_not_found', MESSAGES);
        }
        await bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' }).catch(e =>
          logs('error', 'Failed to send download error message', { ChatID: chatId, Error: e.message })
        );
      }
    } else if (text.startsWith('/')) {
      logs('info', '⚡ Command received', { ...userInfo, Command: text.split(' ')[0] });
      return; // Handled by command handler
    } else {
      if (isPrivateChat(msg)) {
        if (isTikTokUrl) {
          logs('warning', '⚠️ TikTok URL with extra text - rejecting', { ...userInfo, Text: text.substring(0, 100) });
          await bot.sendMessage(chatId, getLocalizedMessage(lang, 'strict_link_only', MESSAGES), { parse_mode: 'Markdown' });
        } else {
          logs('info', '🤖 AI query received', { ...userInfo, QueryLength: text.length, Language: lang });
          trackAIQuery();
          await queryAI(bot, chatId, text, lang).catch(aiError => {
            logs('error', 'Failed to process AI query', { ...userInfo, Error: aiError.message });
            // Error already handled inside queryAI function
          });
          logs('success', '✅ AI response processing completed', userInfo);
        }
      } else {
        logs('info', '👥 Group message ignored (not TikTok URL)', { ...userInfo, Text: text.substring(0, 50) });
      }
    }
  } catch (error) {
    logs('error', 'General message handling failed', {
      ChatID: chatId,
      Error: error.message,
      Stack: error.stack?.substring(0, 300)
    });
    if (processingMessageId) {
        await bot.deleteMessage(chatId, processingMessageId).catch(e => logs('warning', 'Failed to delete processing message on general error', { ChatID: chatId, Error: e.message }));
    }
    await bot.sendMessage(chatId, getLocalizedMessage(lang, 'processing_error', MESSAGES), { parse_mode: 'Markdown' }).catch(e =>
      logs('error', 'Failed to send general error message', { ChatID: chatId, Error: e.message })
    );
  }
};