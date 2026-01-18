const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');

/* ========= الإعدادات ========= */
const TOKEN = '8540862357:AAGrFvAD_rJGAXwqVNKTztKq16C-OIpRwX4';
const OWNER_ID = 7405584377;

/* ========= إنشاء البوت ========= */
const bot = new TelegramBot(TOKEN, { polling: true });

/* ========= قاعدة البيانات ========= */
const db = new Database('bot_data.db');

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

/* ========= الحالات ========= */
const userStates = {};

/* ========= الأزرار ========= */

const addKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '➕ إضافة إنجاز' }]],
    resize_keyboard: true
  }
};

const cancelKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '❌ إلغاء تسجيل الإنجاز' }]],
    resize_keyboard: true
  }
};

function startKeyboard(chatId) {
  if (chatId === OWNER_ID) {
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

/* ========= start ========= */
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'مرحبًا بك 🌿',
    startKeyboard(msg.chat.id)
  );
});

/* ========= الرسائل ========= */
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  /* ===== إضافة إنجاز ===== */
  if (text === '➕ إضافة إنجاز') {
    userStates[chatId] = {
      isTeacher: chatId === OWNER_ID,
      waiting: chatId === OWNER_ID ? 'student_name' : 'type'
    };

    if (chatId === OWNER_ID) {
      return bot.sendMessage(
        chatId,
        '✏️ اكتب اسم الطالب:',
        cancelKeyboard
      );
    }

    return bot.sendMessage(
      chatId,
      'اختر نوع الإنجاز:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📖 حفظ جديد', callback_data: 'type_حفظ جديد' }],
            [{ text: '🔄 مراجعة قريبة', callback_data: 'type_مراجعة قريبة' }],
            [{ text: '📚 مراجعة بعيدة', callback_data: 'type_مراجعة بعيدة' }],
            [{ text: '👨‍🏫 تعليم', callback_data: 'type_تعليم' }]
          ]
        }
      }
    );
  }

  /* ===== إلغاء ===== */
  if (text === '❌ إلغاء تسجيل الإنجاز') {
    delete userStates[chatId];
    return bot.sendMessage(
      chatId,
      '❎ تم إلغاء تسجيل الإنجاز',
      addKeyboard
    );
  }

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
    s.waiting = 'type';
    return bot.sendMessage(chatId, 'اختر نوع الإنجاز:');
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
    saveAchievement(chatId, msg.from.first_name, s);
    delete userStates[chatId];
    return bot.sendMessage(chatId, '✅ تم تسجيل الإنجاز', addKeyboard);
  }

  if (s.waiting === 'details') {
    s.details = text;
    saveAchievement(chatId, msg.from.first_name, s);
    delete userStates[chatId];
    return bot.sendMessage(chatId, '✅ تم تسجيل الإنجاز', addKeyboard);
  }
});

/* ========= الأزرار الداخلية ========= */
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

/* ========= حفظ ========= */
function saveAchievement(userId, username, d) {
  db.prepare(`
    INSERT INTO achievements
    (user_id, username, type, surah, start_ayah, end_ayah, details, status, created_at, student_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    userId,
    d.student_name || username,
    d.type,
    d.surah || '',
    d.start || 0,
    d.end || 0,
    d.details || '',
    new Date().toISOString(),
    d.student_id || userId
  );

  bot.sendMessage(OWNER_ID, '🔔 إنجاز جديد بانتظار التقييم');
}

console.log('✅ البوت يعمل بشكل صحيح');

