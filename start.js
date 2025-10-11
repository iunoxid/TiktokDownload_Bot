// start.js
// Main entry point for VPS deployment with Long Polling mode

const chalk = require('chalk'); // For console coloring
const { logs } = require('./utils/common_utils'); // Import logs function
const bot = require('./bot/bot_core'); // Import ready-to-use bot instance
const startExpressServer = require('./webserver/express_server'); // Import web server start function
const { startupConnectionCheck } = require('./utils/connection_utils'); // Import connection check
const { BOT_TOKEN } = require('./config/app_config');

// Display application banner
const displayBanner = () => {
  console.log(chalk.yellow.bold('TikTok Downloader Bot with Enhanced AI Assistant'));
  console.log(chalk.cyan('========================================'));
  console.log(chalk.green('VPS Deployment Mode - Long Polling'));
  console.log(chalk.cyan('========================================'));
};

// Main function to initialize and start the application
async function initializeAndStartApp() {
  displayBanner(); // Show banner
  logs('info', 'Application initialization started...');

  try {
    // 0. Check internet connection and Telegram API availability
    logs('info', '🔍 Checking network connectivity...');
    const connectionOk = await startupConnectionCheck(BOT_TOKEN);

    if (!connectionOk) {
      logs('warning', '⚠️ Network checks failed, but bot will attempt to start anyway...');
      logs('warning', 'Bot may not function until network is available.');
    }

    // 1. Start Express server (for health checks)
    logs('info', 'Starting Express web server...');
    startExpressServer();
    logs('success', 'Express web server started successfully.');

    // 2. Start Telegram bot in polling mode with error handling
    logs('info', 'Starting Telegram bot in Long Polling mode...');
    try {
      bot.startPolling();
      logs('success', 'Bot is now polling for updates from Telegram.');
    } catch (pollingError) {
      logs('error', 'Failed to start polling initially', { Error: pollingError.message });
      logs('warning', 'Will retry polling after 5 seconds...');

      // Retry after delay
      setTimeout(() => {
        logs('info', 'Retrying bot polling...');
        try {
          bot.startPolling();
          logs('success', 'Bot polling started successfully on retry.');
        } catch (retryError) {
          logs('error', 'Failed to start polling on retry', { Error: retryError.message });
          logs('warning', 'Bot will continue running and attempt to recover automatically.');
        }
      }, 5000);
    }

    logs('success', 'All application services are running!');
    console.log(chalk.green('Bot Long Polling is running. Press CTRL+C to stop.'));

  } catch (error) {
    logs('error', 'Failed to initialize or start application services!', { Error: error.message });
    logs('warning', 'Bot will continue running but may not function properly.');
    // Don't exit - let bot try to recover
  }
}

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  logs('error', 'UNCAUGHT EXCEPTION - Bot will continue running', {
    Error: error.message,
    Stack: error.stack?.substring(0, 500)
  });
  // Don't exit - let bot continue running
});

process.on('unhandledRejection', (reason, promise) => {
  logs('error', 'UNHANDLED PROMISE REJECTION - Bot will continue running', {
    Reason: reason instanceof Error ? reason.message : String(reason),
    Stack: reason instanceof Error ? reason.stack?.substring(0, 500) : 'N/A'
  });
  // Don't exit - let bot continue running
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  logs('info', 'Received SIGINT. Gracefully shutting down...');
  bot.stopPolling();
  logs('success', 'Bot polling stopped. Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logs('info', 'Received SIGTERM. Gracefully shutting down...');
  bot.stopPolling();
  logs('success', 'Bot polling stopped. Goodbye!');
  process.exit(0);
});

// Call main function to start the application
initializeAndStartApp();