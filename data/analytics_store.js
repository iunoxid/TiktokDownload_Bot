// data/analytics_store.js
// Analytics and statistics management system

const fs = require('fs');
const path = require('path');

const analyticsFile = path.join(__dirname, 'analytics.json');

// Initialize analytics data structure
const defaultAnalytics = {
  bot: {
    startTime: new Date().toISOString(),
    totalCommands: 0,
    totalDownloads: 0,
    totalErrors: 0,
    totalAIQueries: 0,
    uptime: 0
  },
  users: {
    total: 0,
    active: new Set(),
    dailyActive: new Set(),
    banned: new Set(),
    languages: { id: 0, en: 0 }
  },
  downloads: {
    videos: 0,
    photos: 0,
    audios: 0,
    failed: 0,
    successRate: 0
  },
  commands: {
    start: 0,
    help: 0,
    runtime: 0,
    stats: 0,
    broadcast: 0,
    ban: 0,
    unban: 0
  },
  usage: {
    hourly: Array(24).fill(0),
    daily: {},
    peakHour: 0,
    lastReset: new Date().toISOString()
  },
  performance: {
    avgResponseTime: 0,
    memoryUsage: process.memoryUsage(),
    errorRate: 0,
    lastHealthCheck: new Date().toISOString()
  }
};

// Load analytics data
let analyticsData = defaultAnalytics;
try {
  if (fs.existsSync(analyticsFile)) {
    const data = fs.readFileSync(analyticsFile, 'utf8');
    analyticsData = { ...defaultAnalytics, ...JSON.parse(data) };
    // Convert Sets back from arrays
    analyticsData.users.active = new Set(analyticsData.users.active || []);
    analyticsData.users.dailyActive = new Set(analyticsData.users.dailyActive || []);
    analyticsData.users.banned = new Set(analyticsData.users.banned || []);
  }
} catch (error) {
  console.error('Failed to load analytics data:', error.message);
}

// Save analytics data
const saveAnalytics = () => {
  try {
    const dataToSave = {
      ...analyticsData,
      users: {
        ...analyticsData.users,
        active: Array.from(analyticsData.users.active),
        dailyActive: Array.from(analyticsData.users.dailyActive),
        banned: Array.from(analyticsData.users.banned)
      }
    };
    fs.writeFileSync(analyticsFile, JSON.stringify(dataToSave, null, 2));
  } catch (error) {
    console.error('Failed to save analytics data:', error.message);
  }
};

// Analytics functions
const trackUser = (userId, username = null) => {
  analyticsData.users.active.add(userId);
  analyticsData.users.dailyActive.add(userId);
  analyticsData.users.total = Math.max(analyticsData.users.total, analyticsData.users.active.size);
  saveAnalytics();
};

const trackCommand = (command) => {
  const cmd = command.replace('/', '').toLowerCase();
  if (analyticsData.commands[cmd] !== undefined) {
    analyticsData.commands[cmd]++;
  }
  analyticsData.bot.totalCommands++;
  
  // Track hourly usage
  const hour = new Date().getHours();
  analyticsData.usage.hourly[hour]++;
  
  saveAnalytics();
};

const trackDownload = (type, success = true) => {
  if (success) {
    analyticsData.downloads[type]++;
    analyticsData.bot.totalDownloads++;
  } else {
    analyticsData.downloads.failed++;
    analyticsData.bot.totalErrors++;
  }
  
  // Calculate success rate
  const total = analyticsData.bot.totalDownloads + analyticsData.downloads.failed;
  analyticsData.downloads.successRate = total > 0 ? ((analyticsData.bot.totalDownloads / total) * 100).toFixed(2) : 100;
  
  saveAnalytics();
};

const trackAIQuery = () => {
  analyticsData.bot.totalAIQueries++;
  saveAnalytics();
};

const trackError = (errorType = 'general') => {
  analyticsData.bot.totalErrors++;
  saveAnalytics();
};

const banUser = (userId) => {
  analyticsData.users.banned.add(userId);
  saveAnalytics();
};

const unbanUser = (userId) => {
  analyticsData.users.banned.delete(userId);
  saveAnalytics();
};

const isUserBanned = (userId) => {
  return analyticsData.users.banned.has(userId);
};

const updatePerformance = (responseTime = null) => {
  if (responseTime) {
    // Calculate running average response time
    const currentAvg = analyticsData.performance.avgResponseTime || 0;
    analyticsData.performance.avgResponseTime = ((currentAvg + responseTime) / 2).toFixed(2);
  }
  
  analyticsData.performance.memoryUsage = process.memoryUsage();
  analyticsData.performance.lastHealthCheck = new Date().toISOString();
  
  // Calculate error rate
  const total = analyticsData.bot.totalCommands + analyticsData.bot.totalDownloads;
  analyticsData.performance.errorRate = total > 0 ? ((analyticsData.bot.totalErrors / total) * 100).toFixed(2) : 0;
  
  saveAnalytics();
};

const getAnalytics = () => {
  // Update uptime
  const startTime = new Date(analyticsData.bot.startTime);
  analyticsData.bot.uptime = Math.floor((Date.now() - startTime.getTime()) / 1000);
  
  // Find peak hour
  analyticsData.usage.peakHour = analyticsData.usage.hourly.indexOf(Math.max(...analyticsData.usage.hourly));
  
  return {
    ...analyticsData,
    users: {
      ...analyticsData.users,
      active: analyticsData.users.active.size,
      dailyActive: analyticsData.users.dailyActive.size,
      banned: analyticsData.users.banned.size,
      bannedList: Array.from(analyticsData.users.banned)
    }
  };
};

// Reset daily stats (call this daily via cron or scheduler)
const resetDailyStats = () => {
  analyticsData.users.dailyActive.clear();
  analyticsData.usage.hourly.fill(0);
  analyticsData.usage.lastReset = new Date().toISOString();
  saveAnalytics();
};

// Periodic save (every 5 minutes)
setInterval(saveAnalytics, 5 * 60 * 1000);

module.exports = {
  trackUser,
  trackCommand,
  trackDownload,
  trackAIQuery,
  trackError,
  banUser,
  unbanUser,
  isUserBanned,
  updatePerformance,
  getAnalytics,
  resetDailyStats,
  saveAnalytics
};