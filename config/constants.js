// config/constants.js
// Application constants to avoid magic numbers

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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
  DOWNLOAD_TIMEOUT: 60000, // 60 seconds for downloads

  // Retry configuration
  MAX_DOWNLOAD_RETRIES: toInt(process.env.MAX_DOWNLOAD_RETRIES, 5), // Maximum retry attempts for downloads
  RETRY_DELAY: toInt(process.env.RETRY_DELAY, 2000), // 2 seconds delay between retries
  MAX_AI_RETRIES: 2, // Maximum retry attempts for AI queries

  // Connection check
  CONNECTION_CHECK_TIMEOUT: 5000, // 5 seconds
  CONNECTION_CHECK_RETRIES: 5, // Check 5 times before giving up
  CONNECTION_CHECK_DELAY: 3000, // 3 seconds between checks

  // Bot validation
  MIN_BOT_TOKEN_LENGTH: 10,
  
  // Telegram API limits
  MAX_MESSAGE_REACTIONS: 75, // Telegram's supported emoji reactions limit
  
  // File processing
  MAX_PHOTO_SLIDESHOW_SIZE: 10, // Maximum photos in a slideshow
};
