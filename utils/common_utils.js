// utils/common_utils.js
const chalk = require('chalk'); // For console coloring
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Enhanced logging function with file output
const logs = (type, message, details = {}) => {
  const now = new Date();
  const timestamp = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  let color, prefix;

  switch (type.toLowerCase()) {
    case 'info':
      color = chalk.cyan;
      prefix = '[INFO]';
      break;
    case 'success':
      color = chalk.green;
      prefix = '[SUCCESS]';
      break;
    case 'error':
      color = chalk.red;
      prefix = '[ERROR]';
      break;
    case 'warning':
      color = chalk.yellow;
      prefix = '[WARNING]';
      break;
    default:
      color = chalk.white;
      prefix = '[LOG]';
  }

  const logMessage = `${prefix} [${timestamp}] ${message}`;
  const detailLines = Object.entries(details)
    .map(([key, value]) => `  ${key}: ${value}`)
    .join('\n');

  // Console output
  console.log(color(logMessage));
  if (detailLines) console.log(color(detailLines));
  
  // File output (without colors)
  const logFileContent = `${prefix} [${now.toISOString()}] ${message}\n`;
  const detailFileContent = detailLines ? detailLines + '\n' : '';
  
  try {
    const logFile = path.join(logsDir, `bot-${dateStr}.log`);
    fs.appendFileSync(logFile, logFileContent + detailFileContent + '\n', 'utf8');
    
    // Also create a separate activity log for user activities
    if (details.UserID) {
      const activityLog = path.join(logsDir, `activity-${dateStr}.log`);
      const activityContent = `[${now.toISOString()}] UserID: ${details.UserID} | Username: ${details.Username} | ${message}\n`;
      fs.appendFileSync(activityLog, activityContent, 'utf8');
    }
  } catch (fileError) {
    console.log(chalk.red(`[LOG-ERROR] Failed to write log file: ${fileError.message}`));
  }
};

// Fungsi untuk menunda eksekusi (sleep)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to calculate bot runtime (days-hours-minutes-seconds)
function calculateRuntime(startTime) {
  const now = new Date();
  const uptimeMilliseconds = now - startTime;
  const uptimeSeconds = Math.floor(uptimeMilliseconds / 1000);
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);
  
  return { 
    days: uptimeDays,
    hours: uptimeHours % 24, 
    minutes: uptimeMinutes % 60, 
    seconds: uptimeSeconds % 60 
  };
}

// Function to format runtime message with days-hours-minutes-seconds
const formatRuntimeMessage = (lang, startTime, messages) => {
  const { days, hours, minutes, seconds } = calculateRuntime(startTime);
  let message = messages[lang].runtime;
  message = message.replace('{days}', days).replace('{hours}', hours).replace('{minutes}', minutes).replace('{seconds}', seconds);
  return message;
};

// Fungsi untuk mendapatkan pesan multi-bahasa dari konfigurasi
const getLocalizedMessage = (lang, messageKey, configMessages) => {
  return (configMessages[lang] && configMessages[lang][messageKey]) ? configMessages[lang][messageKey] : configMessages['en'][messageKey]; // Default ke English
};

// Fungsi untuk escape karakter khusus MarkdownV2
const escapeMarkdownV2 = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // Escape semua karakter khusus MarkdownV2
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
};

// Get log statistics
const getLogStats = () => {
  try {
    const files = fs.readdirSync(logsDir);
    const today = new Date().toISOString().split('T')[0];
    const todayLogFile = path.join(logsDir, `bot-${today}.log`);
    
    let todayLogs = 0;
    if (fs.existsSync(todayLogFile)) {
      const content = fs.readFileSync(todayLogFile, 'utf8');
      todayLogs = content.split('\n').filter(line => line.trim()).length;
    }
    
    return {
      totalLogFiles: files.length,
      todayLogs,
      logsDirectory: logsDir
    };
  } catch (error) {
    return { error: error.message };
  }
};

module.exports = {
  logs,
  sleep,
  calculateRuntime,
  formatRuntimeMessage,
  getLocalizedMessage,
  escapeMarkdownV2,
  getLogStats,
};