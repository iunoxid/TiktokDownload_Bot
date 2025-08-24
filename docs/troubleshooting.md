# 🔧 Troubleshooting

Panduan mengatasi masalah umum dan error yang sering terjadi pada TikTok Downloader Bot.

## 🚨 Masalah Bot Tidak Berjalan

### Bot Tidak Start
**Gejala**: Bot tidak merespons sama sekali
**Penyebab**:
- BOT_TOKEN salah atau tidak ada
- Node.js tidak terinstall
- Dependencies tidak terinstall

**Solusi**:
```bash
# 1. Cek BOT_TOKEN di .env
cat .env | grep BOT_TOKEN

# 2. Cek instalasi Node.js
node --version
npm --version

# 3. Install ulang dependencies
rm -rf node_modules
npm install

# 4. Restart bot
npm start
```

### Error "Cannot find module"
**Gejala**: Error module not found
**Solusi**:
```bash
# Install dependencies yang hilang
npm install

# Jika masih error, install spesifik
npm install node-telegram-bot-api
npm install btch-downloader
npm install axios
```

---

## 📥 Masalah Download TikTok

### "Invalid TikTok Link" Error
**Gejala**: Bot bilang link tidak valid
**Penyebab**:
- Link bukan dari TikTok
- Link rusak/terpotong
- Ada teks tambahan

**Solusi**:
1. Pastikan link dimulai dengan `https://`
2. Kirim HANYA link, tanpa teks lain
3. Copy ulang link dari aplikasi TikTok
4. Contoh format yang benar:
   ```
   https://vt.tiktok.com/ZS2qsMU1W/
   ```

### "Content Not Found" Error
**Gejala**: Konten tidak ditemukan
**Penyebab**:
- Video sudah dihapus
- Video di-private
- Akun di-suspend

**Solusi**:
1. Cek apakah video masih ada di TikTok
2. Pastikan video bukan private
3. Coba video lain dari akun yang sama
4. Tunggu beberapa menit dan coba lagi

### Download Gagal/Stuck
**Gejala**: Proses download tidak selesai
**Penyebab**:
- Koneksi internet lambat
- File terlalu besar
- Server TikTok sibuk

**Solusi**:
```bash
# 1. Cek koneksi internet
ping google.com

# 2. Restart bot
pm2 restart tiktok-bot

# 3. Cek logs error
tail -f logs/bot-$(date +%Y-%m-%d).log

# 4. Cek memory usage
free -h
```

---

## 🤖 Masalah AI Assistant

### AI Tidak Merespons
**Gejala**: AI tidak menjawab pertanyaan
**Penyebab**:
- GROQ_API_KEY tidak ada/salah
- Quota API habis
- Network error

**Solusi**:
```bash
# 1. Cek API key
cat .env | grep GROQ_API_KEY

# 2. Test API key manual
curl -X POST "https://api.groq.com/openai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"model":"compound-beta-mini"}'

# 3. Restart bot
pm2 restart tiktok-bot
```

### AI Response Error
**Gejala**: AI memberikan error atau respons aneh
**Penyebab**:
- Model API berubah
- Input terlalu panjang
- Context limit tercapai

**Solusi**:
1. Cek model name di `.env`:
   ```env
   GROQ_MODEL_NAME=compound-beta-mini
   ```
2. Restart bot untuk reset conversation history
3. Coba pertanyaan yang lebih pendek

---

## 👑 Masalah Admin Panel

### Admin Commands Tidak Work
**Gejala**: Command `/stats` dll tidak bisa diakses
**Penyebab**:
- ADMIN_CHAT_ID salah
- Chat ID tidak diset
- User bukan admin

**Solusi**:
```bash
# 1. Cek admin chat ID
cat .env | grep ADMIN_CHAT_ID

# 2. Dapatkan chat ID dari @userinfobot
# 3. Update .env file
echo "ADMIN_CHAT_ID=123456789" >> .env

# 4. Restart bot
pm2 restart tiktok-bot
```

### Broadcast Tidak Terkirim
**Gejala**: Broadcast gagal atau tidak sampai
**Penyebab**:
- User memblock bot
- Rate limiting
- Network error

**Solusi**:
1. Cek logs untuk detail error:
   ```bash
   tail -f logs/bot-$(date +%Y-%m-%d).log
   ```
2. Broadcast ulang dengan pesan lebih pendek
3. Tunggu beberapa menit antara broadcast

---

## 🔧 Masalah Performance

### Bot Lambat Merespons
**Gejala**: Response time lama
**Penyebab**:
- Memory penuh
- CPU overload
- Network lambat

**Solusi**:
```bash
# 1. Cek resource usage
htop
free -h
df -h

# 2. Restart bot
pm2 restart tiktok-bot

# 3. Clear logs lama
find logs/ -name "*.log" -mtime +7 -delete

# 4. Restart server jika perlu
sudo reboot
```

### Memory Usage Tinggi
**Gejala**: Bot menggunakan banyak memory
**Penyebab**:
- Memory leak
- Terlalu banyak data cached
- Logs menumpuk

**Solusi**:
```bash
# 1. Monitor memory
pm2 monit

# 2. Clear data cache
rm -f data/analytics.json
rm -f data/data.json

# 3. Restart bot
pm2 restart tiktok-bot

# 4. Upgrade VPS jika perlu
```

---

## 📊 Masalah Analytics

### Stats Tidak Update
**Gejala**: `/stats` menampilkan data lama
**Penyebab**:
- File analytics corrupt
- Permission error
- Disk penuh

**Solusi**:
```bash
# 1. Cek file analytics
ls -la data/
cat data/analytics.json

# 2. Fix permissions
chmod 644 data/*.json
chown $USER:$USER data/*.json

# 3. Reset analytics (jika perlu)
rm data/analytics.json
pm2 restart tiktok-bot
```

### Data Loss
**Gejala**: Statistik hilang setelah restart
**Penyebab**:
- File tidak tersimpan
- Disk penuh
- Permission error

**Solusi**:
1. Cek space disk:
   ```bash
   df -h
   ```
2. Backup data secara manual:
   ```bash
   cp data/*.json /backup/location/
   ```
3. Set permission yang benar:
   ```bash
   chmod 755 data/
   chmod 644 data/*.json
   ```

---

## 🌐 Masalah Network

### Connection Timeout
**Gejala**: Timeout saat download atau API call
**Penyebab**:
- Koneksi internet lambat
- Firewall blocking
- DNS issues

**Solusi**:
```bash
# 1. Test koneksi
ping 8.8.8.8
curl -I https://api.groq.com

# 2. Cek firewall
sudo ufw status

# 3. Ganti DNS
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf

# 4. Restart network
sudo systemctl restart networking
```

### Port Already in Use
**Gejala**: Error port 3000 sudah digunakan
**Solusi**:
```bash
# 1. Cari process yang menggunakan port
sudo lsof -i :3000

# 2. Kill process
sudo kill -9 PID_NUMBER

# 3. Atau ganti port di .env
echo "PORT=3001" >> .env

# 4. Restart bot
pm2 restart tiktok-bot
```

---

## 🚨 Emergency Recovery

### Bot Completely Down
**Langkah darurat jika bot mati total**:
```bash
# 1. Stop semua process
pm2 kill

# 2. Backup data penting
cp -r data/ /backup/data-$(date +%Y%m%d)/
cp -r logs/ /backup/logs-$(date +%Y%m%d)/

# 3. Fresh restart
npm install
npm start

# 4. Monitor recovery
pm2 logs --follow
```

### Data Corruption
**Jika file data rusak**:
```bash
# 1. Stop bot
pm2 stop tiktok-bot

# 2. Backup file corrupt
mv data/data.json data/data.json.corrupt
mv data/analytics.json data/analytics.json.corrupt

# 3. Start fresh
pm2 start tiktok-bot

# 4. Restore data manual jika mungkin
```

---

## 🔍 Diagnostic Commands

### Cek Status Lengkap
```bash
#!/bin/bash
echo "=== BOT STATUS DIAGNOSTIC ==="
echo "Date: $(date)"
echo ""

echo "=== System Info ==="
uname -a
free -h
df -h
echo ""

echo "=== Node.js Info ==="
node --version
npm --version
echo ""

echo "=== PM2 Status ==="
pm2 status
echo ""

echo "=== Bot Files ==="
ls -la data/
echo ""

echo "=== Recent Logs ==="
tail -10 logs/bot-$(date +%Y-%m-%d).log
echo ""

echo "=== Network Test ==="
ping -c 3 8.8.8.8
curl -I https://api.telegram.org
echo ""
```

### Log Analysis
```bash
# Cek error terbanyak
grep -c "ERROR" logs/bot-$(date +%Y-%m-%d).log

# User paling aktif
grep "Message received" logs/activity-$(date +%Y-%m-%d).log | awk '{print $6}' | sort | uniq -c | sort -nr | head -10

# Download success rate
grep -c "Video sent successfully" logs/bot-$(date +%Y-%m-%d).log
grep -c "TikTok download failed" logs/bot-$(date +%Y-%m-%d).log
```

---

## 📞 Mendapatkan Bantuan

### Sebelum Minta Bantuan
1. **Cek dokumentasi** ini dulu
2. **Coba diagnostic commands** di atas
3. **Kumpulkan info**:
   - Error message exact
   - Screenshot jika perlu
   - Log files terbaru
   - System info (OS, Node version, dll)

### Kontak Support
- **Telegram**: [@ssyahbandi](https://t.me/ssyahbandi)  
- **GitHub Issues**: [Laporkan Bug](https://github.com/iunoo/Tiktok_Downloader/issues)
- **Documentation**: [Docs Lengkap](./README.md)

### Info untuk Support
Sertakan info ini saat minta bantuan:
```
OS: Ubuntu 20.04
Node.js: v20.10.0
Bot Version: 2.0.0
Error: [paste exact error message]
Steps to reproduce: [langkah yang menyebabkan error]
```

---

**Ingat**: Sebagian besar masalah bisa diselesaikan dengan restart bot atau server. Jika masih bermasalah, jangan ragu untuk minta bantuan! 🚀