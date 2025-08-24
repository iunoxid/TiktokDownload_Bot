// config/constants.js
// Application constants to avoid magic numbers

module.exports = {
  // Text length limits
  MAX_TITLE_LENGTH: 400,
  MAX_USER_INPUT_LENGTH: 1000,
  
  // Memory management
  MAX_URL_MAPPINGS: 100,
  URL_MAPPING_TTL: 30 * 60 * 1000, // 30 minutes in milliseconds
  URL_MAPPING_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes in milliseconds
  
  // Network timeouts
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  AI_REQUEST_TIMEOUT: 30000, // 30 seconds
  
  // Bot validation
  MIN_BOT_TOKEN_LENGTH: 10,
  
  // Telegram API limits
  MAX_MESSAGE_REACTIONS: 75, // Telegram's supported emoji reactions limit
  
  // File processing
  MAX_PHOTO_SLIDESHOW_SIZE: 10, // Maximum photos in a slideshow
};