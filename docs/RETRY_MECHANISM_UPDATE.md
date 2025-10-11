# 🔄 Retry Mechanism & Network Resilience Update

## Tanggal: 2025-10-12

---

## 🎯 Tujuan Update

Menambahkan **retry mechanism** dan **network resilience** untuk mengatasi masalah:
1. ❌ Bot crash saat internet mati/lambat
2. ❌ Bot gagal start saat internet belum ready (NUC mini PC scenario)
3. ❌ Download gagal karena network timeout
4. ❌ AI query gagal tanpa retry
5. ❌ Polling error tidak ter-recover otomatis

---

## ✨ Fitur Baru Yang Ditambahkan

### 1. **Retry Utilities** (utils/retry_utils.js) - NEW FILE

Fungsi utility untuk retry dengan **exponential backoff**:

```javascript
// Retry dengan exponential backoff (2^n delay)
retryWithBackoff(fn, maxRetries, baseDelay, operationName)

// Retry dengan fixed delay
retryWithFixedDelay(fn, maxRetries, delay, operationName)

// Detect apakah error bisa di-retry
isRetryableError(error)
```

**Retryable Errors:**
- Network errors: `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, etc.
- HTTP status: 408, 429, 500, 502, 503, 504, 520-524 (Cloudflare)
- Error messages dengan keyword: network, timeout, connection refused

---

### 2. **Connection Check Utilities** (utils/connection_utils.js) - NEW FILE

Fungsi untuk check koneksi internet sebelum bot start:

```javascript
// Check internet connection (test multiple endpoints)
checkInternetConnection(timeout)

// Wait sampai internet available
waitForInternetConnection(maxRetries, delay)

// Check Telegram API specifically
checkTelegramAPI(botToken, timeout)

// Comprehensive startup check
startupConnectionCheck(botToken)
```

**Endpoints yang di-test:**
1. Google
2. Cloudflare
3. 1.1.1.1
4. Telegram API

---

### 3. **Enhanced Startup Sequence** (start.js:20-68)

Bot sekarang check koneksi sebelum start:

```javascript
// Step 0: Check network connectivity
const connectionOk = await startupConnectionCheck(BOT_TOKEN);

if (!connectionOk) {
  logs('warning', 'Network checks failed, but bot will attempt to start anyway...');
}

// Step 1: Start Express server
// Step 2: Start polling with retry on failure
```

**Behavior:**
- ✅ Check internet + Telegram API sebelum start
- ✅ Retry 5x dengan delay 3s jika internet belum ready
- ✅ Bot tetap start meskipun check gagal (graceful degradation)
- ✅ Retry polling jika gagal start pertama kali

---

### 4. **TikTok Download Retry** (message_handler.js:177-187)

Download sekarang pake retry mechanism:

```javascript
const data = await retryWithBackoff(
  async () => await ttdl(text.trim()),
  MAX_DOWNLOAD_RETRIES,  // 3 retries
  2000,                   // 2 second base delay
  'TikTok Download'
);
```

**Retry strategy:**
- Attempt 1: immediate
- Attempt 2: after 2s (2^0 × 2000ms)
- Attempt 3: after 4s (2^1 × 2000ms)
- Attempt 4: after 8s (2^2 × 2000ms)

Total max wait: ~14 seconds sebelum give up

---

### 5. **AI Query Retry** (message_handler.js:64-78)

AI API calls sekarang pake retry:

```javascript
const response = await retryWithBackoff(
  async () => httpClient.post(AI_API_URL, ...),
  MAX_AI_RETRIES,  // 2 retries
  1500,            // 1.5 second base delay
  'AI API Request'
);
```

**Retry strategy:**
- Attempt 1: immediate
- Attempt 2: after 1.5s
- Attempt 3: after 3s

Total max wait: ~4.5 seconds

---

### 6. **Auto-Reconnect Polling** (bot_core.js:87-144)

Polling error handler dengan **auto-recovery**:

```javascript
// Track polling errors
let pollingErrorCount = 0;

// If 5+ errors in 1 minute, auto-restart polling
if (pollingErrorCount >= 5) {
  bot.stopPolling();
  // Wait 5s, then restart
  setTimeout(() => bot.startPolling(), 5000);
}
```

**Features:**
- ✅ Error counter dengan auto-reset setelah 1 menit
- ✅ Auto-restart setelah 5 errors
- ✅ Retry restart jika gagal (2 attempts)
- ✅ Detailed error logging

---

## 📊 Configuration Constants (constants.js)

New constants ditambahkan:

```javascript
// Network timeouts
DOWNLOAD_TIMEOUT: 60000,              // 60 seconds

// Retry configuration
MAX_DOWNLOAD_RETRIES: 3,              // 3 retry attempts
RETRY_DELAY: 2000,                    // 2 second base delay
MAX_AI_RETRIES: 2,                    // 2 retry attempts

// Connection check
CONNECTION_CHECK_TIMEOUT: 5000,       // 5 seconds
CONNECTION_CHECK_RETRIES: 5,          // Check 5 times
CONNECTION_CHECK_DELAY: 3000,         // 3 seconds between checks
```

---

## 🎯 Use Cases Yang Sekarang Ter-Handle

### ✅ Scenario 1: Bot Start Tanpa Internet (NUC mini PC)
**Sebelum:**
```
[ERROR] ENOTFOUND api.telegram.org
Bot crashed!
```

**Sekarang:**
```
[INFO] Checking internet connection...
[WARNING] No internet detected. Retrying in 3s... (1/5)
[WARNING] No internet detected. Retrying in 3s... (2/5)
[SUCCESS] Internet connection verified!
[SUCCESS] Telegram API is reachable!
[SUCCESS] Bot is now polling!
```

---

### ✅ Scenario 2: Download Saat Internet Lambat
**Sebelum:**
```
[ERROR] Request timeout
❌ Download failed!
```

**Sekarang:**
```
[INFO] TikTok Download - Attempt 1/3
[WARNING] TikTok Download failed, retrying in 2000ms...
[INFO] TikTok Download - Attempt 2/3
[SUCCESS] TikTok Download succeeded after 2 attempts
✅ Video sent successfully!
```

---

### ✅ Scenario 3: Groq AI Timeout
**Sebelum:**
```
[ERROR] AI API request failed
Bot crashed (unhandled rejection)
```

**Sekarang:**
```
[INFO] AI API Request - Attempt 1/2
[WARNING] AI API Request failed, retrying in 1500ms...
[INFO] AI API Request - Attempt 2/2
[SUCCESS] AI API Request succeeded after 2 attempts
✅ AI response sent
```

---

### ✅ Scenario 4: Polling Error Burst
**Sebelum:**
```
[ERROR] Polling error occurred!
[ERROR] Polling error occurred!
[ERROR] Polling error occurred!
Bot not responding...
```

**Sekarang:**
```
[ERROR] Polling error occurred! (ErrorCount: 1)
[ERROR] Polling error occurred! (ErrorCount: 2)
[ERROR] Polling error occurred! (ErrorCount: 5)
[WARNING] Too many polling errors. Attempting to restart...
[INFO] Stopped polling, will restart in 5 seconds...
[SUCCESS] Polling restarted successfully after errors.
```

---

## 🔧 Files Modified/Created

### Created:
1. ✅ `utils/retry_utils.js` - Retry logic utilities
2. ✅ `utils/connection_utils.js` - Connection check utilities
3. ✅ `RETRY_MECHANISM_UPDATE.md` - This documentation

### Modified:
1. ✅ `start.js` - Added connection check + polling retry
2. ✅ `config/constants.js` - Added retry & connection constants
3. ✅ `bot/bot_core.js` - Enhanced polling error handler
4. ✅ `bot/handlers/message_handler.js` - Added retry for downloads & AI

---

## 📋 Testing Checklist

Test scenarios berikut setelah deploy:

### Network Scenarios:
- [ ] Start bot tanpa internet (harus retry & wait)
- [ ] Start bot dengan internet lambat (harus retry dengan delay)
- [ ] Disconnect internet saat bot running (harus auto-recover)
- [ ] Reconnect internet (harus continue normal operation)

### Download Scenarios:
- [ ] Download video saat network stabil
- [ ] Download video saat network lambat (harus retry)
- [ ] Download video dengan invalid URL (harus fail gracefully)
- [ ] Download multiple videos concurrently

### AI Scenarios:
- [ ] AI query saat Groq API normal
- [ ] AI query saat Groq API lambat (harus retry)
- [ ] AI query dengan invalid API key (harus fail gracefully)

### Polling Scenarios:
- [ ] Normal bot operation
- [ ] Simulate polling errors (disconnect/reconnect network rapidly)
- [ ] Check auto-restart after 5 errors
- [ ] Verify error counter reset after 1 minute

---

## 🚀 Deployment

```bash
# Pull changes
git pull

# Review new files
ls -la utils/retry_utils.js
ls -la utils/connection_utils.js

# Restart bot
pm2 restart tiktok-bot

# Monitor logs closely for first 10 minutes
pm2 logs tiktok-bot --lines 100

# Test network resilience
# Disconnect/reconnect internet and observe bot behavior
```

---

## 📊 Monitoring

Monitor log patterns untuk verify retry working:

```bash
# Check retry attempts
grep "Attempt" logs/bot-$(date +%Y-%m-%d).log

# Check connection checks
grep "connection" logs/bot-$(date +%Y-%m-%d).log

# Check auto-recovery
grep "Polling restarted" logs/bot-$(date +%Y-%m-%d).log

# Check for crashes (should be ZERO)
grep "UNCAUGHT\|UNHANDLED" logs/bot-$(date +%Y-%m-%d).log
```

---

## 🎯 Expected Behavior

### Normal Operation:
```
[INFO] Checking network connectivity...
[SUCCESS] Internet connection verified!
[SUCCESS] Telegram API is reachable!
[SUCCESS] Bot is now polling!
```

### Network Issues:
```
[WARNING] No internet detected. Retrying...
[WARNING] TikTok Download failed, retrying in 2000ms...
[SUCCESS] Connection established after 3 attempts
```

### Auto-Recovery:
```
[ERROR] Polling error occurred! (ErrorCount: 5)
[WARNING] Too many polling errors. Attempting to restart...
[SUCCESS] Polling restarted successfully!
```

---

## 💡 Key Improvements

1. **🔄 Exponential Backoff** - Smart retry dengan increasing delays
2. **🌐 Connection Detection** - Check internet sebelum critical operations
3. **🔁 Auto-Recovery** - Bot self-heal dari polling errors
4. **📊 Detailed Logging** - Track retry attempts & success rate
5. **⚡ Non-Blocking** - Retries tidak block bot operations lain

---

## 🛠️ Configuration Tuning

Jika perlu adjust retry behavior, edit `config/constants.js`:

```javascript
// Untuk network yang SANGAT lambat
MAX_DOWNLOAD_RETRIES: 5,        // Increase to 5 retries
RETRY_DELAY: 3000,              // Increase base delay to 3s

// Untuk network yang stabil
MAX_DOWNLOAD_RETRIES: 2,        // Decrease to 2 retries
RETRY_DELAY: 1000,              // Decrease to 1s

// Untuk startup yang slow
CONNECTION_CHECK_RETRIES: 10,   // Check 10 times
CONNECTION_CHECK_DELAY: 5000,   // Wait 5s between checks
```

---

## 📝 Notes

- Retry mechanism menggunakan **exponential backoff** untuk menghindari overwhelm server
- **Non-retryable errors** (400, 401, 403, 404) tidak di-retry untuk save resources
- Polling auto-restart memiliki **counter reset** untuk avoid false positives
- Connection check test **multiple endpoints** untuk reliability
- Semua retry attempts di-log untuk monitoring & debugging

**IMPORTANT:** Bot sekarang **RESILIENT** dan bisa handle:
- ✅ Internet mati saat startup
- ✅ Network timeout saat download
- ✅ API failures dengan auto-retry
- ✅ Polling errors dengan auto-recovery

Tidak perlu restart manual lagi! 🎉
