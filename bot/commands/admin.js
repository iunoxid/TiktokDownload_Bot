// bot/commands/admin.js
// Admin commands for bot management

const { ADMIN_CHAT_ID } = require('../../config/app_config');
const { logs } = require('../../utils/common_utils');
const { getAnalytics, banUser, unbanUser, isUserBanned, trackCommand } = require('../../data/analytics_store');
const { getUserCount, getAllUserIds } = require('../../data/data_store');

// Check if user is admin
const isAdmin = (chatId) => {
  return ADMIN_CHAT_ID && chatId === ADMIN_CHAT_ID;
};

// Admin stats command
const statsCommand = async (bot, msg) => {
  const chatId = msg.chat.id;
  
  if (!isAdmin(chatId)) {
    await bot.sendMessage(chatId, '❌ Access denied. Admin only command.');
    return;
  }

  try {
    trackCommand('stats');
    const analytics = getAnalytics();
    const uptime = formatUptime(analytics.bot.uptime);
    
    const statsMessage = `
📊 **BOT ANALYTICS & STATISTICS**

🤖 **Bot Performance:**
• Uptime: ${uptime}
• Total Commands: ${analytics.bot.totalCommands.toLocaleString()}
• Total Downloads: ${analytics.bot.totalDownloads.toLocaleString()}
• Total AI Queries: ${analytics.bot.totalAIQueries.toLocaleString()}
• Total Errors: ${analytics.bot.totalErrors.toLocaleString()}

👥 **User Statistics:**
• Total Users: ${analytics.users.total.toLocaleString()}
• Active Users: ${analytics.users.active.toLocaleString()}
• Daily Active: ${analytics.users.dailyActive.toLocaleString()}
• Banned Users: ${analytics.users.banned.toLocaleString()}

📥 **Download Statistics:**
• Videos: ${analytics.downloads.videos.toLocaleString()}
• Photos: ${analytics.downloads.photos.toLocaleString()}
• Audio: ${analytics.downloads.audios.toLocaleString()}
• Failed: ${analytics.downloads.failed.toLocaleString()}
• Success Rate: ${analytics.downloads.successRate}%

⚡ **Command Usage:**
• /start: ${analytics.commands.start.toLocaleString()}
• /help: ${analytics.commands.help.toLocaleString()}
• /runtime: ${analytics.commands.runtime.toLocaleString()}
• /stats: ${analytics.commands.stats.toLocaleString()}

📈 **Usage Patterns:**
• Peak Hour: ${analytics.usage.peakHour}:00 (${analytics.usage.hourly[analytics.usage.peakHour]} activities)
• Last Reset: ${new Date(analytics.usage.lastReset).toLocaleString()}

🔧 **Performance:**
• Avg Response Time: ${analytics.performance.avgResponseTime}ms
• Memory Used: ${formatBytes(analytics.performance.memoryUsage.heapUsed)}
• Memory Total: ${formatBytes(analytics.performance.memoryUsage.heapTotal)}
• Error Rate: ${analytics.performance.errorRate}%

🕒 **Last Updated:** ${new Date().toLocaleString()}
    `.trim();

    await bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
    logs('info', '📊 Admin stats command executed', { 
      AdminID: chatId,
      TotalUsers: analytics.users.total,
      TotalDownloads: analytics.bot.totalDownloads 
    });
    
  } catch (error) {
    logs('error', 'Admin stats command failed', { AdminID: chatId, Error: error.message });
    await bot.sendMessage(chatId, '❌ Failed to generate statistics. Please try again.');
  }
};

// Broadcast command
const broadcastCommand = async (bot, msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (!isAdmin(chatId)) {
    await bot.sendMessage(chatId, '❌ Access denied. Admin only command.');
    return;
  }

  const message = text.replace('/broadcast', '').trim();
  if (!message) {
    await bot.sendMessage(chatId, '❌ Please provide a message to broadcast.\\n\\nUsage: `/broadcast Your message here`', { parse_mode: 'Markdown' });
    return;
  }

  try {
    trackCommand('broadcast');
    const userIds = getAllUserIds();
    const broadcastMessage = `📢 **ANNOUNCEMENT**\\n\\n${message}`;
    
    let sent = 0;
    let failed = 0;
    
    const progressMsg = await bot.sendMessage(chatId, '📤 Starting broadcast...', { parse_mode: 'Markdown' });
    
    for (const userId of userIds) {
      try {
        if (!isUserBanned(userId)) {
          await bot.sendMessage(userId, broadcastMessage, { parse_mode: 'Markdown' });
          sent++;
          
          // Update progress every 10 users
          if (sent % 10 === 0) {
            await bot.editMessageText(
              `📤 Broadcasting... ${sent}/${userIds.length} sent`,
              { chat_id: chatId, message_id: progressMsg.message_id }
            );
          }
          
          // Rate limiting - wait 50ms between messages
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        failed++;
        logs('warning', 'Broadcast failed for user', { UserID: userId, Error: error.message });
      }
    }
    
    await bot.editMessageText(
      `✅ **Broadcast Complete**\\n\\n• Sent: ${sent}\\n• Failed: ${failed}\\n• Total Users: ${userIds.length}`,
      { chat_id: chatId, message_id: progressMsg.message_id, parse_mode: 'Markdown' }
    );
    
    logs('success', '📢 Broadcast completed', { 
      AdminID: chatId, 
      MessageLength: message.length,
      Sent: sent, 
      Failed: failed,
      TotalUsers: userIds.length 
    });
    
  } catch (error) {
    logs('error', 'Broadcast command failed', { AdminID: chatId, Error: error.message });
    await bot.sendMessage(chatId, '❌ Broadcast failed. Please try again.');
  }
};

// Ban user command
const banCommand = async (bot, msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (!isAdmin(chatId)) {
    await bot.sendMessage(chatId, '❌ Access denied. Admin only command.');
    return;
  }

  const args = text.split(' ');
  const userIdToBan = args[1];
  
  if (!userIdToBan || isNaN(userIdToBan)) {
    await bot.sendMessage(chatId, '❌ Please provide a valid user ID to ban.\\n\\nUsage: `/ban 123456789`', { parse_mode: 'Markdown' });
    return;
  }

  try {
    trackCommand('ban');
    const userId = parseInt(userIdToBan);
    
    if (userId === ADMIN_CHAT_ID) {
      await bot.sendMessage(chatId, '❌ Cannot ban admin user.');
      return;
    }
    
    if (isUserBanned(userId)) {
      await bot.sendMessage(chatId, `⚠️ User ${userId} is already banned.`);
      return;
    }
    
    banUser(userId);
    await bot.sendMessage(chatId, `✅ User ${userId} has been banned successfully.`);
    
    // Try to notify the banned user
    try {
      await bot.sendMessage(userId, '🚫 You have been banned from using this bot. If you believe this is a mistake, please contact support.');
    } catch (notifyError) {
      // User might have blocked the bot or deleted their account
    }
    
    logs('warning', '🚫 User banned by admin', { 
      AdminID: chatId, 
      BannedUserID: userId 
    });
    
  } catch (error) {
    logs('error', 'Ban command failed', { AdminID: chatId, Error: error.message });
    await bot.sendMessage(chatId, '❌ Failed to ban user. Please try again.');
  }
};

// Unban user command
const unbanCommand = async (bot, msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (!isAdmin(chatId)) {
    await bot.sendMessage(chatId, '❌ Access denied. Admin only command.');
    return;
  }

  const args = text.split(' ');
  const userIdToUnban = args[1];
  
  if (!userIdToUnban || isNaN(userIdToUnban)) {
    await bot.sendMessage(chatId, '❌ Please provide a valid user ID to unban.\\n\\nUsage: `/unban 123456789`', { parse_mode: 'Markdown' });
    return;
  }

  try {
    trackCommand('unban');
    const userId = parseInt(userIdToUnban);
    
    if (!isUserBanned(userId)) {
      await bot.sendMessage(chatId, `⚠️ User ${userId} is not banned.`);
      return;
    }
    
    unbanUser(userId);
    await bot.sendMessage(chatId, `✅ User ${userId} has been unbanned successfully.`);
    
    // Try to notify the unbanned user
    try {
      await bot.sendMessage(userId, '✅ You have been unbanned and can now use the bot again. Welcome back!');
    } catch (notifyError) {
      // User might have blocked the bot
    }
    
    logs('success', '✅ User unbanned by admin', { 
      AdminID: chatId, 
      UnbannedUserID: userId 
    });
    
  } catch (error) {
    logs('error', 'Unban command failed', { AdminID: chatId, Error: error.message });
    await bot.sendMessage(chatId, '❌ Failed to unban user. Please try again.');
  }
};

// Helper functions
const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const formatBytes = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

module.exports = {
  statsCommand,
  broadcastCommand,
  banCommand,
  unbanCommand,
  isAdmin
};