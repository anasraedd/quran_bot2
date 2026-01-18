const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');

const TOKEN = '8540862357:AAGrFvAD_rJGAXwqVNKTztKq16C-OIpRwX4';
const OWNER_ID = 7405584377;

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new Database('bot_data.db');

/* ================= DATABASE ================= */

db.exec(`
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  type TEXT,
  surah TEXT,
  start_ayah INTEGER,
  end_ayah INTEGER,
  details TEXT,
  status TEXT,
  rating INTEGER,
  notes TEXT,
  created_at TEXT,
  student_id INTEGER
)
`);

/* ================= STATES ================= */

const userStates = {};

/* ================= KEYBOARDS ================= */

function studentMenu() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '➕ إضافة إنجاز' }],
        [{ text: '📘 إنجازاتي' }]
      ],
      resize_keyboard: true
    }
  };
}

function teacherMenu() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: '➕ إضافة إنجاز' }],
        [{ text: '📊 الإنجازات غير المقيمة' }]
      ],
      resize_keyboard: true
    }
  };
}

const cancelKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '❌ إلغاء تسجيل الإنجاز' }]],
    resize_keyboard: true
  }
};

/* ================= START ================= */

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (chatId === OWNER_ID)
    bot.sendMessage(chatId, 'مرحبًا بك 👨‍🏫', teacherMenu());
  else
    bot.sendMessage(chatId, 'مرحبًا بك 🌿', studentMenu());
});

/* ================= MESSAGE ================= */

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  /* ===== إضافة إنجاز ===== */
  if (text === '➕ إضافة إنجاز') {
    userStates[chatId] = {
      isTeacher: chatId === OWNER_ID
    };

    bot.sendMessage(chatId, '✅ تم بدء تسجيل الإنجاز', cancelKeyboard);

    // المعلم يبدأ باسم الطالب
    if (chatId === OWNER_ID) {
      userStates[chatId].waiting = 'student_name';
      return bot.sendMessage(chatId, '✏️ اكتب اسم الطالب:');
    }

    // الطالب يبدأ بالنوع
    userStates[chatId].waiting = 'choose_type';
    return showTypes(chatId);
  }

  /* ===== إلغاء ===== */
  if (text === '❌ إلغاء تسجيل الإنجاز') {
    delete userStates[chatId];

    if (chatId === OWNER_ID)
      return bot.sendMessage(chatId, 'تم الإلغاء', teacherMenu());
    else
      return bot.sendMessage(chatId, 'تم الإلغاء', studentMenu());
  }

  /* ===== تجاهل ===== */
  if (!userStates[chatId] || text.startsWith('/')) return;

  const s = userStates[chatId];

  /* ===== المعلم ===== */

  if (s.waiting === 'student_name') {
    s.student_name = text;
    s.waiting = 'student_id';
    return bot.sendMessage(chatId, '🔢 اكتب معرف الطالب:');
  }

  if (s.waiting === 'student_id') {
    s.student_id = Number(text);
    s.waiting = 'choose_type';
    return showTypes(chatId);
  }

  /* ===== السورة ===== */

  if (s.waiting === 'surah') {
    s.surah = text;
    s.waiting = 'start';
    return bot.sendMessage(chatId, 'من آية رقم:');
  }

  if (s.waiting === 'start') {
    s.start = Number(text);
    s.waiting = 'end';
    return bot.sendMessage(chatId, 'إلى آية رقم:');
  }

  if (s.waiting === 'end') {
    s.end = Number(text);
    finish(chatId, msg.from.first_name);
  }

  /* ===== تعليم ===== */

  if (s.waiting === 'details') {
    s.details = text;
    finish(chatId, msg.from.first_name);
  }
});

/* ================= CALLBACK ================= */

bot.on('callback_query', (q) => {
  const chatId = q.message.chat.id;
  const data = q.data;
  bot.answerCallbackQuery(q.id);

  if (!userStates[chatId]) return;

  if (data.startsWith('type_')) {
    const type = data.replace('type_', '');
    const s = userStates[chatId];

    s.type = type;
    s.waiting = type === 'تعليم' ? 'details' : 'surah';

    bot.editMessageText(
      type === 'تعليم'
        ? '✏️ اكتب تفاصيل التعليم:'
        : '📖 اكتب اسم السورة:',
      { chat_id: chatId, message_id: q.message.message_id }
    );
  }
});

/* ================= HELPERS ================= */

function showTypes(chatId) {
  bot.sendMessage(chatId, 'اختر نوع الإنجاز:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📖 حفظ جديد', callback_data: 'type_حفظ جديد' }],
        [{ text: '🔄 مراجعة قريبة', callback_data: 'type_مراجعة قريبة' }],
        [{ text: '📚 مراجعة بعيدة', callback_data: 'type_مراجعة بعيدة' }],
        [{ text: '👨‍🏫 تعليم', callback_data: 'type_تعليم' }]
      ]
    }
  });
}

function finish(chatId, username) {
  const s = userStates[chatId];

  db.prepare(`
    INSERT INTO achievements
    (user_id, username, type, surah, start_ayah, end_ayah, details, status, created_at, student_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    chatId,
    s.student_name || username,
    s.type,
    s.surah || '',
    s.start || 0,
    s.end || 0,
    s.details || '',
    new Date().toISOString(),
    s.student_id || chatId
  );

  delete userStates[chatId];

  if (chatId === OWNER_ID)
    bot.sendMessage(chatId, '✅ تم تسجيل إنجاز الطالب', teacherMenu());
  else
    bot.sendMessage(chatId, '✅ تم تسجيل إنجازك', studentMenu());
}

console.log('✅ البوت يعمل بشكل صحيح');
