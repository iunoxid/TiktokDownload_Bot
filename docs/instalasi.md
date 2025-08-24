# 🚀 Panduan Instalasi

Panduan lengkap step-by-step untuk install dan setup TikTok Downloader Bot.

## 📋 Prasyarat

### Kebutuhan Sistem
- **Node.js**: v20.x atau lebih tinggi
- **npm**: v8.x atau lebih tinggi  
- **OS**: Linux/Ubuntu (VPS), Windows, atau macOS
- **Memory**: Minimum 512MB RAM
- **Storage**: 1GB space kosong

### Akun yang Dibutuhkan
- **Telegram Bot**: Dapatkan token dari [@BotFather](https://t.me/BotFather)
- **Groq AI**: Dapatkan API key dari [Groq Console](https://console.groq.com)

---

## 🛠️ Langkah Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/iunoo/Tiktok_Downloader.git
cd Tiktok_Downloader
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
# Copy template environment
cp .env.example .env

# Edit file environment
nano .env
```

**Environment Variables yang Wajib:**
```env
BOT_TOKEN=TOKEN_BOT_ANDA_DI_SINI
PORT=3000
ADMIN_CHAT_ID=CHAT_ID_ANDA_DI_SINI
GROQ_API_KEY=GROQ_API_KEY_ANDA_DI_SINI
GROQ_MODEL_NAME=compound-beta-mini
AI_API_URL=https://api.groq.com/openai/v1/chat/completions
```

### 4. Dapatkan Chat ID Anda
Untuk mendapatkan Telegram Chat ID:
1. Start bot Anda di Telegram
2. Kirim command `/start`
3. Cek logs untuk Chat ID Anda
4. Tambahkan ke `ADMIN_CHAT_ID` di `.env`

---

## 🎯 Quick Start

### Mode Development
```bash
npm run dev
```

### Mode Production
```bash
npm start
```

### Dengan PM2 (Recommended untuk Production)
```bash
# Install PM2 secara global
npm install -g pm2

# Start bot dengan PM2
npm run pm2:start

# Lihat logs
npm run pm2:logs

# Monitor
pm2 monit
```

---

## ✅ Verifikasi

### 1. Cek Status Bot
```bash
# Cek apakah bot berjalan
pm2 status

# Cek logs
tail -f logs/bot-$(date +%Y-%m-%d).log
```

### 2. Test Fungsi Bot
1. **Test Dasar**: Kirim `/start` di Telegram
2. **Test Download**: Kirim URL TikTok
3. **Test AI**: Kirim pesan di private chat
4. **Test Admin**: Kirim `/stats` (admin saja)

### 3. Health Check
Kunjungi: `http://vps-ip-anda:3000/`
Harus menampilkan:
```json
{
  "response": {
    "status": "online",
    "message": "TikTok Downloader Bot is running successfully on VPS!",
    "deployment": "VPS",
    "mode": "Long Polling"
  }
}
```

---

## 🔧 Masalah Instalasi Umum

### Error Versi Node.js
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Error Permission
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Port Sudah Digunakan
```bash
# Kill process yang menggunakan port 3000
sudo kill -9 $(sudo lsof -t -i:3000)
```

### Masalah PM2
```bash
# Reset PM2
pm2 kill
pm2 resurrect
```

---

## 🔗 Langkah Selanjutnya

- [Panduan Konfigurasi](./konfigurasi.md) - Opsi konfigurasi detail
- [Panduan Deployment](./deployment.md) - Deploy ke production VPS
- [Panduan User](./panduan-user.md) - Cara menggunakan bot

---

## 📞 Butuh Bantuan?

- **Telegram**: [@ssyahbandi](https://t.me/ssyahbandi)
- **Issues**: [GitHub Issues](https://github.com/iunoo/Tiktok_Downloader/issues)
- **Dokumentasi**: [Docs Lengkap](./README.md)