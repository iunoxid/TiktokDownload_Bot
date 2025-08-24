// data/data_store.js
const fs = require('fs');
const path = require('path');
const { logs } = require('../utils/common_utils'); // Mengimpor fungsi logs

// Path ke file data.json di dalam folder data/
const DATA_FILE = path.resolve(__dirname, 'data.json');

// Pastikan direktori data ada
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true }); // Buat direktori secara rekursif jika belum ada
  } catch (err) {
    logs('error', `Failed to create data directory: ${err.message}`);
  }
}

let data = {
  userLanguage: {},
  conversationHistory: {},
  users: {} // Store user information
};

// Fungsi untuk menyimpan data ke file
// DEFINISIKAN saveData SEBELUM DIGUNAKAN DI BAGIAN MUAT DATA
const saveData = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    // logs('info', 'Data saved to data.json'); // Nonaktifkan untuk mengurangi log spam
  } catch (error) {
    logs('error', `Failed to save data to data.json: ${error.message}`);
  }
};

// Muat data saat modul diinisialisasi
try {
  if (fs.existsSync(DATA_FILE)) {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    if (rawData) { // Periksa jika file tidak kosong
      const parsedData = JSON.parse(rawData);
      // Pastikan struktur data tetap konsisten
      data.userLanguage = parsedData.userLanguage || {};
      data.conversationHistory = parsedData.conversationHistory || {};
      data.users = parsedData.users || {};
      logs('info', 'Data loaded from data.json');
    } else {
      logs('info', 'data.json is empty, initializing with default data.');
      saveData(); // Simpan data awal jika file kosong
    }
  } else {
    logs('info', 'data.json not found, creating a new one.');
    saveData(); // Simpan data awal jika file belum ada
  }
} catch (error) {
  logs('error', `Failed to load data from data.json: ${error.message}`);
  // Jika terjadi error parsing, inisialisasi data kosong untuk mencegah crash
  data = { userLanguage: {}, conversationHistory: {}, users: {} };
}

// Add user to database
const addUser = (userId, username = null, firstName = null) => {
  if (!data.users[userId]) {
    data.users[userId] = {
      id: userId,
      username: username,
      firstName: firstName,
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
  } else {
    // Update last activity
    data.users[userId].lastActivity = new Date().toISOString();
    if (username) data.users[userId].username = username;
    if (firstName) data.users[userId].firstName = firstName;
  }
  saveData();
};

// Get all user IDs for broadcasting
const getAllUserIds = () => {
  return Object.keys(data.users).map(id => parseInt(id));
};

// Get user count
const getUserCount = () => {
  return Object.keys(data.users).length;
};

// Get user data
const getUserData = (userId) => {
  return data.users[userId] || null;
};

module.exports = {
  getUserLanguage: (chatId) => data.userLanguage[chatId],
  setUserLanguage: (chatId, lang) => {
    data.userLanguage[chatId] = lang;
    saveData();
  },
  getConversationHistory: (chatId) => data.conversationHistory[chatId],
  setConversationHistory: (chatId, history) => {
    data.conversationHistory[chatId] = history;
    saveData();
  },
  clearConversationHistory: (chatId) => {
    delete data.conversationHistory[chatId];
    saveData();
  },
  addUser,
  getAllUserIds,
  getUserCount,
  getUserData,
  getAllData: () => data,
  saveData
};