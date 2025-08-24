// start.js
// Main entry point for VPS deployment with Long Polling mode

const chalk = require('chalk'); // For console coloring
const { logs } = require('./utils/common_utils'); // Import logs function
const bot = require('./bot/bot_core'); // Import ready-to-use bot instance
const startExpressServer = require('./webserver/express_server'); // Import web server start function

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
    // 1. Start Express server (for health checks)
    logs('info', 'Starting Express web server...');
    startExpressServer();
    logs('success', 'Express web server started successfully.');

    // 2. Start Telegram bot in polling mode
    logs('info', 'Starting Telegram bot in Long Polling mode...');
    bot.startPolling();
    logs('success', 'Bot is now polling for updates from Telegram.');

    logs('success', 'All application services are running!');
    console.log(chalk.green('Bot Long Polling is running. Press CTRL+C to stop.'));

  } catch (error) {
    logs('error', 'Failed to initialize or start application services!', { Error: error.message });
    process.exit(1); // Exit process with error code
  }
}

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