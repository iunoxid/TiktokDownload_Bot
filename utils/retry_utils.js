// utils/retry_utils.js
// Utility functions for retry logic with exponential backoff

const { logs, sleep } = require('./common_utils');
const { RETRY_DELAY } = require('../config/constants');

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Number} maxRetries - Maximum number of retry attempts
 * @param {Number} baseDelay - Base delay in milliseconds (default: RETRY_DELAY)
 * @param {String} operationName - Name of operation for logging
 * @returns {Promise} - Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = RETRY_DELAY, operationName = 'Operation') {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logs('info', `${operationName} - Attempt ${attempt}/${maxRetries}`);
      const result = await fn();

      if (attempt > 1) {
        logs('success', `${operationName} succeeded after ${attempt} attempts`);
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = isRetryableError(error);

      if (!isRetryable) {
        logs('error', `${operationName} failed with non-retryable error`, {
          Attempt: attempt,
          Error: error.message,
          ErrorType: error.code || error.name
        });
        throw error; // Don't retry non-retryable errors
      }

      if (attempt < maxRetries) {
        // Exponential backoff: delay = baseDelay * 2^(attempt-1)
        const delay = baseDelay * Math.pow(2, attempt - 1);

        logs('warning', `${operationName} failed, retrying...`, {
          Attempt: attempt,
          MaxRetries: maxRetries,
          NextRetryIn: `${delay}ms`,
          Error: error.message,
          ErrorCode: error.code
        });

        await sleep(delay);
      } else {
        logs('error', `${operationName} failed after ${maxRetries} attempts`, {
          Error: error.message,
          ErrorCode: error.code,
          ErrorType: error.name
        });
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Determine if an error is retryable
 * @param {Error} error - The error object
 * @returns {Boolean} - True if error is retryable
 */
function isRetryableError(error) {
  // Network errors
  const retryableCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    'EPIPE',
    'ECONNABORTED'
  ];

  // HTTP status codes that are retryable
  const retryableStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
    520, // Unknown Error (Cloudflare)
    521, // Web Server Is Down (Cloudflare)
    522, // Connection Timed Out (Cloudflare)
    524  // A Timeout Occurred (Cloudflare)
  ];

  // Check error code
  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }

  // Check HTTP status code
  if (error.response && error.response.status) {
    if (retryableStatusCodes.includes(error.response.status)) {
      return true;
    }
  }

  // Check error message for network-related keywords
  const errorMessage = error.message?.toLowerCase() || '';
  const networkKeywords = [
    'network',
    'timeout',
    'econnreset',
    'socket hang up',
    'enotfound',
    'getaddrinfo',
    'request failed',
    'connection refused'
  ];

  if (networkKeywords.some(keyword => errorMessage.includes(keyword))) {
    return true;
  }

  // Not retryable by default
  return false;
}

/**
 * Simple retry without exponential backoff (fixed delay)
 * @param {Function} fn - Async function to retry
 * @param {Number} maxRetries - Maximum number of retry attempts
 * @param {Number} delay - Fixed delay in milliseconds
 * @param {String} operationName - Name of operation for logging
 * @returns {Promise} - Result of the function
 */
async function retryWithFixedDelay(fn, maxRetries = 3, delay = RETRY_DELAY, operationName = 'Operation') {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logs('info', `${operationName} - Attempt ${attempt}/${maxRetries}`);
      const result = await fn();

      if (attempt > 1) {
        logs('success', `${operationName} succeeded after ${attempt} attempts`);
      }

      return result;
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        logs('warning', `${operationName} failed, retrying in ${delay}ms...`, {
          Attempt: attempt,
          Error: error.message
        });
        await sleep(delay);
      } else {
        logs('error', `${operationName} failed after ${maxRetries} attempts`, {
          Error: error.message
        });
      }
    }
  }

  throw lastError;
}

module.exports = {
  retryWithBackoff,
  retryWithFixedDelay,
  isRetryableError
};
