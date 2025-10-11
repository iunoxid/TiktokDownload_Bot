// utils/connection_utils.js
// Utility functions for checking internet connectivity

const axios = require('axios');
const { logs, sleep } = require('./common_utils');
const { CONNECTION_CHECK_TIMEOUT, CONNECTION_CHECK_RETRIES, CONNECTION_CHECK_DELAY } = require('../config/constants');

/**
 * Check if internet connection is available
 * @param {Number} timeout - Timeout in milliseconds
 * @returns {Promise<Boolean>} - True if connected, false otherwise
 */
async function checkInternetConnection(timeout = CONNECTION_CHECK_TIMEOUT) {
  const endpoints = [
    'https://www.google.com',
    'https://www.cloudflare.com',
    'https://1.1.1.1',
    'https://api.telegram.org'
  ];

  // Try each endpoint
  for (const endpoint of endpoints) {
    try {
      await axios.get(endpoint, {
        timeout,
        headers: { 'User-Agent': 'TikTok-Bot-Connection-Check/1.0' }
      });

      logs('success', 'Internet connection verified', { Endpoint: endpoint });
      return true;
    } catch (error) {
      // Try next endpoint
      continue;
    }
  }

  logs('warning', 'All connection check endpoints failed');
  return false;
}

/**
 * Wait for internet connection to become available
 * @param {Number} maxRetries - Maximum number of retry attempts
 * @param {Number} delay - Delay between retries in milliseconds
 * @returns {Promise<Boolean>} - True if connection established, false if exhausted retries
 */
async function waitForInternetConnection(maxRetries = CONNECTION_CHECK_RETRIES, delay = CONNECTION_CHECK_DELAY) {
  logs('info', 'Checking internet connection...');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isConnected = await checkInternetConnection();

    if (isConnected) {
      if (attempt > 1) {
        logs('success', `Internet connection established after ${attempt} attempts`);
      }
      return true;
    }

    if (attempt < maxRetries) {
      logs('warning', `No internet connection detected. Retrying in ${delay / 1000}s...`, {
        Attempt: attempt,
        MaxRetries: maxRetries
      });
      await sleep(delay);
    } else {
      logs('error', `Failed to establish internet connection after ${maxRetries} attempts`);
      return false;
    }
  }

  return false;
}

/**
 * Check if Telegram API is reachable
 * @param {String} botToken - Telegram bot token
 * @param {Number} timeout - Timeout in milliseconds
 * @returns {Promise<Boolean>} - True if Telegram API is reachable
 */
async function checkTelegramAPI(botToken, timeout = CONNECTION_CHECK_TIMEOUT) {
  try {
    const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`, {
      timeout,
      headers: { 'User-Agent': 'TikTok-Bot-Connection-Check/1.0' }
    });

    if (response.data && response.data.ok) {
      logs('success', 'Telegram API is reachable', {
        BotUsername: response.data.result.username,
        BotName: response.data.result.first_name
      });
      return true;
    }

    logs('warning', 'Telegram API response not OK', { Response: response.data });
    return false;
  } catch (error) {
    logs('error', 'Failed to reach Telegram API', {
      Error: error.message,
      ErrorCode: error.code
    });
    return false;
  }
}

/**
 * Wait for Telegram API to become available
 * @param {String} botToken - Telegram bot token
 * @param {Number} maxRetries - Maximum number of retry attempts
 * @param {Number} delay - Delay between retries in milliseconds
 * @returns {Promise<Boolean>} - True if Telegram API is available
 */
async function waitForTelegramAPI(botToken, maxRetries = CONNECTION_CHECK_RETRIES, delay = CONNECTION_CHECK_DELAY) {
  logs('info', 'Checking Telegram API availability...');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isAvailable = await checkTelegramAPI(botToken);

    if (isAvailable) {
      if (attempt > 1) {
        logs('success', `Telegram API became available after ${attempt} attempts`);
      }
      return true;
    }

    if (attempt < maxRetries) {
      logs('warning', `Telegram API not reachable. Retrying in ${delay / 1000}s...`, {
        Attempt: attempt,
        MaxRetries: maxRetries
      });
      await sleep(delay);
    } else {
      logs('error', `Failed to reach Telegram API after ${maxRetries} attempts`);
      return false;
    }
  }

  return false;
}

/**
 * Comprehensive startup connection check
 * @param {String} botToken - Telegram bot token
 * @returns {Promise<Boolean>} - True if all checks pass
 */
async function startupConnectionCheck(botToken) {
  logs('info', '🔍 Starting connection checks...');

  // Step 1: Check basic internet connectivity
  const internetOk = await waitForInternetConnection();
  if (!internetOk) {
    logs('error', '❌ Internet connection check failed. Bot may not function properly.');
    return false;
  }

  // Step 2: Check Telegram API specifically
  const telegramOk = await waitForTelegramAPI(botToken);
  if (!telegramOk) {
    logs('error', '❌ Telegram API check failed. Bot cannot start.');
    return false;
  }

  logs('success', '✅ All connection checks passed!');
  return true;
}

module.exports = {
  checkInternetConnection,
  waitForInternetConnection,
  checkTelegramAPI,
  waitForTelegramAPI,
  startupConnectionCheck
};
