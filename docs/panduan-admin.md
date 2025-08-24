# 👑 Panduan Panel Admin

Panduan lengkap untuk administrator bot dalam mengelola user, analytics, dan operasi sistem.

## 🔐 Akses Admin

### Prasyarat
- Chat ID Anda harus diset di `ADMIN_CHAT_ID` environment variable
- Bot harus berjalan dan dapat diakses
- Command admin hanya bekerja untuk Chat ID yang ditentukan

### Mendapatkan Akses Admin
1. Dapatkan Chat ID dari [@userinfobot](https://t.me/userinfobot)
2. Tambahkan ke file `.env`: `ADMIN_CHAT_ID=123456789`
3. Restart bot
4. Kirim `/start` - Anda akan melihat panel admin

---

## 📊 Command Admin

### `/stats` - Analytics Bot
Dapatkan statistik dan metrik performa bot yang komprehensif.

**Contoh Output:**
```
📊 STATISTIK & ANALYTICS BOT

🤖 Performa Bot:
• Uptime: 2h 5j 30m 45d
• Total Commands: 1.247
• Total Downloads: 892
• Total AI Queries: 156
• Total Errors: 23

👥 Statistik User:
• Total Users: 45
• Active Users: 38
• Daily Active: 12
• Banned Users: 2

📥 Statistik Download:
• Videos: 567
• Photos: 245
• Audio: 80
• Gagal: 23
• Success Rate: 97.5%

⚡ Penggunaan Command:
• /start: 234
• /help: 89
• /runtime: 45

📈 Pola Penggunaan:
• Peak Hour: 14:00 (87 aktivitas)
• Last Reset: 2025-01-20 00:00:00

🔧 Performance:
• Avg Response Time: 1.2ms
• Memory Used: 45.7 MB
• Error Rate: 2.5%
```

---

### `/broadcast <pesan>` - Kirim Pengumuman
Kirim pesan ke semua user bot.

**Penggunaan:**
```
/broadcast 🎉 Bot telah diupdate dengan fitur baru! Sekarang mendukung download video HD.
```

**Fitur:**
- ✅ Progress indicator selama broadcast
- ✅ Statistik sukses/gagal
- ✅ Rate limiting untuk hindari spam
- ✅ Otomatis skip user yang di-ban
- ✅ Support Markdown formatting

**Contoh:**
```
Admin: /broadcast 📢 **PENGUMUMAN** 
Fitur baru: Download video HD sekarang tersedia!

Bot: 📤 Memulai broadcast...
Bot: 📤 Broadcasting... 10/45 terkirim
Bot: ✅ Broadcast Selesai
     • Terkirim: 43
     • Gagal: 2
     • Total Users: 45
```

---

### `/ban <userID>` - Ban User
Cegah user tertentu menggunakan bot.

**Penggunaan:**
```
/ban 123456789
```

**Fitur:**
- ✅ Diam-diam block user (mereka tidak tahu di-ban)
- ✅ Interaksi user diabaikan sepenuhnya
- ✅ Tidak bisa ban admin user (self-protection)
- ✅ Otomatis coba notifikasi ke user yang di-ban
- ✅ Persisten meski bot restart

**Contoh:**
```
Admin: /ban 123456789
Bot: ✅ User 123456789 berhasil di-ban.

[User 123456789 coba pakai bot - tidak ada respons]
```

---

### `/unban <userID>` - Unban User
Pulihkan akses untuk user yang sebelumnya di-ban.

**Penggunaan:**
```
/unban 123456789
```

**Fitur:**
- ✅ Langsung pulihkan akses penuh bot
- ✅ Otomatis notifikasi selamat datang kembali
- ✅ Update analytics dan user counts

**Contoh:**
```
Admin: /unban 123456789
Bot: ✅ User 123456789 berhasil di-unban.

[User menerima: ✅ Anda telah di-unban dan bisa menggunakan bot lagi. Selamat datang kembali!]
```

---

## 🎛️ UI Panel Admin

### Start Command (Admin View)
Ketika admin kirim `/start`, mereka lihat interface yang enhanced:

```
🤖 TikTok Downloader Bot
👑 ADMIN PANEL AKTIF

[🇮🇩 Bahasa Indonesia] [🇬🇧 English]
[🕒 Bot Runtime] [📚 Guide]
[📊 Statistik Bot] [📢 Broadcast]
[🚫 Ban User] [✅ Unban User]
[❤️ Support]
```

### Button Admin
- **📊 Statistik Bot** → Menampilkan command `/stats`
- **📢 Broadcast** → Instruksi untuk command broadcast
- **🚫 Ban User** → Instruksi untuk command ban
- **✅ Unban User** → Instruksi untuk command unban

---

## 📈 Analisis Analytics Mendalam

### Metrik User
- **Total Users**: Semua user yang pernah daftar
- **Active Users**: User yang pernah berinteraksi
- **Daily Active**: User aktif hari ini (reset harian)
- **Banned Users**: Jumlah user yang di-ban saat ini

### Analytics Download
- **Videos**: Video TikTok yang didownload
- **Photos**: Foto tunggal + slideshow yang didownload
- **Audio**: File audio yang diekstrak via button
- **Success Rate**: (Berhasil / Total percobaan) * 100

### Metrik Performance
- **Response Time**: Rata-rata kecepatan respons bot
- **Memory Usage**: Konsumsi memori saat ini
- **Error Rate**: Persentase operasi yang gagal
- **Uptime**: Berapa lama bot sudah berjalan

### Pola Penggunaan
- **Peak Hour**: Jam dengan aktivitas terbanyak (0-23)
- **Distribusi Jam**: Sebaran aktivitas selama 24 jam
- **Frekuensi Command**: Command yang paling banyak digunakan

---

## 🔒 Fitur Keamanan

### Proteksi Admin
- ✅ **Single Admin**: Hanya satu Chat ID yang punya akses admin
- ✅ **Self-Protection**: Admin tidak bisa ban diri sendiri
- ✅ **Environment Security**: Admin ID tersimpan di `.env`
- ✅ **Command Validation**: Validasi keamanan triple-layer

### User Management
- ✅ **Silent Banning**: User yang di-ban tidak tahu mereka di-ban
- ✅ **Persistent Bans**: Bertahan meski bot restart
- ✅ **Activity Logging**: Semua aksi admin ter-log
- ✅ **Privacy Protection**: Data user tetap aman

---

## 📊 Best Practices Monitoring

### Monitoring Harian
1. Cek `/stats` untuk pertumbuhan user dan aktivitas
2. Monitor error rates dan performance
3. Review logs untuk aktivitas yang tidak biasa
4. Verifikasi bot uptime dan health

### Review Mingguan
1. Analisis pola penggunaan dan peak times
2. Review daftar banned users
3. Cek download success rates
4. Monitor tren penggunaan memori

### Maintenance Bulanan
1. Bersihkan file log lama
2. Review dan update pesan broadcast
3. Analisis tren pertumbuhan user
4. Rencanakan update fitur berdasarkan usage

---

## 🚨 Prosedur Darurat

### Error Rate Tinggi
1. Cek `/stats` untuk detail error
2. Review log terbaru: `tail -f logs/bot-$(date +%Y-%m-%d).log`
3. Restart bot jika perlu: `pm2 restart tiktok-bot`
4. Monitor recovery

### Spam/Abuse
1. Identifikasi user bermasalah dari logs
2. Gunakan `/ban <userID>` untuk block pelaku
3. Pertimbangkan broadcast peringatan jika menyebar
4. Monitor untuk pola

### Masalah Performance
1. Cek penggunaan memori di `/stats`
2. Restart bot: `pm2 restart tiktok-bot`
3. Monitor resource sistem: `pm2 monit`
4. Scale resources jika diperlukan

---

## 📞 Dukungan Admin

- **Masalah Teknis**: Cek [Panduan Troubleshooting](./troubleshooting.md)
- **Request Fitur**: Buat GitHub issue
- **Masalah Keamanan**: Kontak pribadi via Telegram

---

**Ingat**: Dengan kekuatan besar datang tanggung jawab besar. Gunakan fitur admin dengan bijak! 👑