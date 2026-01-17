const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');

/* ========= الإعدادات ========= */
const TOKEN = 'PUT_YOUR_TOKEN_HERE';
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

/* ========= حالات المستخدم ========= */
const userStates = {};

/* ========= /start ========= */
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    'مرحبًا بك 🌿\nاضغط لإضافة إنجاز:',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ إضافة إنجاز', callback_data: 'add_achievement' }]
        ]
      }
    }
  );
});

/* ========= الأزرار ========= */
bot.on('callback_query', async (q) => {
  const chatId = q.message.chat.id;
  const msgId = q.message.message_id;
  const data = q.data;

  bot.answerCallbackQuery(q.id);

  /* ===== إضافة إنجاز ===== */
  if (data === 'add_achievement') {

    if (chatId === OWNER_ID) {
      return bot.editMessageText(
        'اختر:',
        {
          chat_id: chatId,
          message_id: msgId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ إنجاز لطالب', callback_data: 'add_for_student' }],
              [{ text: '📊 إنجازات معلقة', callback_data: 'pending' }]
            ]
          }
        }
      );
    }

    return bot.editMessageText(
      'اختر نوع الإنجاز:',
      {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📖 حفظ جديد', callback_data: 'type_حفظ' }],
            [{ text: '🔁 مراجعة', callback_data: 'type_مراجعة' }],
            [{ text: '👨‍🏫 تعليم', callback_data: 'type_تعليم' }]
          ]
        }
      }
    );
  }

  /* ===== المعلم يضيف لطالب ===== */
  if (data === 'add_for_student') {
    userStates[chatId] = { isTeacher: true, waiting: 'student_name' };
    return bot.editMessageText(
      'اكتب اسم الطالب:',
      { chat_id: chatId, message_id: msgId }
    );
  }

  /* ===== عرض المعلقة ===== */
  if (data === 'pending') {
    const list = db.prepare(`SELECT * FROM achievements WHERE status='pending'`).all();

    if (list.length === 0)
      return bot.editMessageText('لا توجد إنجازات معلقة.', { chat_id: chatId, message_id: msgId });

    const keyboard = list.map(a => [{
      text: `🆔 ${a.id} | ${a.username}`,
      callback_data: `rate_${a.id}`
    }]);

    return bot.editMessageText(
      'اختر إنجازًا للتقييم:',
      { chat_id: chatId, message_id: msgId, reply_markup: { inline_keyboard: keyboard } }
    );
  }

  /* ===== اختيار نوع ===== */
  if (data.startsWith('type_')) {
    const type = data.replace('type_', '');
    userStates[chatId] = { type, waiting: type === 'تعليم' ? 'details' : 'surah' };

    return bot.editMessageText(
      type === 'تعليم' ? 'اكتب تفاصيل التعليم:' : 'اكتب اسم السورة:',
      { chat_id: chatId, message_id: msgId }
    );
  }

  /* ===== بدء التقييم ===== */
  if (data.startsWith('rate_')) {
    const id = Number(data.split('_')[1]);

    userStates[chatId] = {
      ratingId: id,
      waiting: 'notes'
    };

    return bot.editMessageText(
      'اختر التقييم:',
      {
        chat_id: chatId,
        message_id: msgId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '⭐', callback_data: `star_${id}_1` }],
            [{ text: '⭐⭐', callback_data: `star_${id}_2` }],
            [{ text: '⭐⭐⭐', callback_data: `star_${id}_3` }],
            [{ text: '⭐⭐⭐⭐', callback_data: `star_${id}_4` }],
            [{ text: '⭐⭐⭐⭐⭐', callback_data: `star_${id}_5` }]
          ]
        }
      }
    );
  }

  /* ===== النجوم ===== */
  if (data.startsWith('star_')) {
    const [, id, stars] = data.split('_');
    userStates[chatId].rating = Number(stars);
    userStates[chatId].ratingId = Number(id);
    userStates[chatId].waiting = 'notes';

    return bot.editMessageText(
      'أرسل ملاحظاتك:',
      { chat_id: chatId, message_id: msgId }
    );
  }

});

/* ========= الرسائل ========= */
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userStates[chatId] || text.startsWith('/')) return;

  const s = userStates[chatId];

  /* === اسم الطالب === */
  if (s.waiting === 'student_name') {
    s.student_name = text;
    s.waiting = 'student_id';
    return bot.sendMessage(chatId, 'أرسل معرف الطالب (ID رقمي):');
  }

  /* === ID الطالب === */
  if (s.waiting === 'student_id') {
    s.student_id = Number(text);
    s.waiting = 'surah';
    return bot.sendMessage(chatId, 'اكتب اسم السورة:');
  }

  /* === السورة === */
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

    const id = saveAchievement(chatId, msg.from.first_name, s);

    bot.sendMessage(chatId, '✅ تم تسجيل الإنجاز.');
    notifyTeacher(id);

    delete userStates[chatId];
  }

  /* === تعليم === */
  if (s.waiting === 'details') {
    s.details = text;

    const id = saveAchievement(chatId, msg.from.first_name, s);
    bot.sendMessage(chatId, '✅ تم تسجيل الإنجاز.');

    notifyTeacher(id);
    delete userStates[chatId];
  }

  /* === ملاحظات التقييم === */
  if (s.waiting === 'notes') {
    saveRating(s.ratingId, s.rating, text);
    bot.sendMessage(chatId, '⭐ تم التقييم بنجاح.');
    delete userStates[chatId];
  }
});

/* ========= حفظ الإنجاز ========= */
function saveAchievement(userId, username, d) {
  const r = db.prepare(`
    INSERT INTO achievements
    (user_id, username, type, surah, start_ayah, end_ayah, details, status, created_at, student_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    userId,
    d.student_name || username,
    d.type || 'حفظ',
    d.surah || '',
    d.start || 0,
    d.end || 0,
    d.details || '',
    new Date().toISOString(),
    d.student_id || userId
  );

  return r.lastInsertRowid;
}

/* ========= إشعار المعلم ========= */
function notifyTeacher(id) {
  bot.sendMessage(
    OWNER_ID,
    `📥 إنجاز جديد (#${id})`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⭐ تقييم الإنجاز', callback_data: `rate_${id}` }]
        ]
      }
    }
  );
}

/* ========= حفظ التقييم + إرسال البطاقة ========= */
function saveRating(id, rating, notes) {
  db.prepare(`
    UPDATE achievements
    SET status='rated', rating=?, notes=?
    WHERE id=?
  `).run(rating, notes, id);

  sendAchievementCard(id);
}

/* ========= بطاقة الطالب ========= */
function sendAchievementCard(id) {
  const a = db.prepare(`SELECT * FROM achievements WHERE id=?`).get(id);
  if (!a) return;

  const msg =
`🎉 تم تقييم إنجازك

📖 السورة: ${a.surah}
🔢 من ${a.start_ayah} إلى ${a.end_ayah}

⭐ التقييم: ${'⭐'.repeat(a.rating)}

💬 ملاحظات المعلم:
${a.notes}

بارك الله فيك 🌿`;

  bot.sendMessage(a.student_id, msg);
}

console.log('✅ البوت يعمل بنجاح');
