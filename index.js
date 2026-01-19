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

const userStates = {};
const QURAN_SURAHS = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس"
];



/* ================= KEYBOARDS ================= */
/* ========= لوحة اختيار السورة ========= */
function surahKeyboard() {
  const rows = [];

  for (let i = 0; i < QURAN_SURAHS.length; i += 3) {
    rows.push(
      QURAN_SURAHS.slice(i, i + 3).map(name => ({
        text: name,
        callback_data: `surah_${name}`
      }))
    );
  }

  return {
    reply_markup: {
      inline_keyboard: rows
    }
  };
}

const studentMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '➕ إضافة إنجاز' }],
      [{ text: '📘 آخر إنجاز' }]
    ],
    resize_keyboard: true
  }
};


const teacherMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '➕ إضافة إنجاز' }],
      [{ text: '📊 الإنجازات غير المقيمة' }]
    ],
    resize_keyboard: true
  }
};

const cancelKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '❌ إلغاء تسجيل الإنجاز' }]],
    resize_keyboard: true
  }
};

/* ================= START ================= */

bot.onText(/\/start/, msg => {
  if (msg.chat.id === OWNER_ID)
    bot.sendMessage(msg.chat.id, 'مرحبًا بك 👨‍🏫', teacherMenu);
  else
    bot.sendMessage(msg.chat.id, 'مرحبًا بك 🌿', studentMenu);
});

/* ================= MESSAGE ================= */

bot.on('message', async msg => {
  const chatId = msg.chat.id;
  const text = msg.text;

  /* ===== إضافة إنجاز ===== */

  if (text === '➕ إضافة إنجاز') {
    userStates[chatId] = { isTeacher: chatId === OWNER_ID };

    bot.sendMessage(chatId, '✅ بدأ تسجيل الإنجاز', cancelKeyboard);

    if (chatId === OWNER_ID) {
      userStates[chatId].waiting = 'student_name';
      return bot.sendMessage(chatId, 'اكتب اسم الطالب:');
    }

    userStates[chatId].waiting = 'choose_type';
    return showTypes(chatId);
  }

  /* ===== إلغاء ===== */

  if (text === '❌ إلغاء تسجيل الإنجاز') {
    delete userStates[chatId];
    return bot.sendMessage(
      chatId,
      'تم الإلغاء',
      chatId === OWNER_ID ? teacherMenu : studentMenu
    );
  }
if (text === '📘 آخر إنجاز') {
  const last = db.prepare(`
    SELECT * FROM achievements
    WHERE student_id = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(chatId);

  if (!last)
    return bot.sendMessage(chatId, 'لا يوجد إنجازات مسجلة بعد 🌿');

  let msg =
`📘 آخر إنجاز لك

📋 النوع: ${last.type}
📖 السورة: ${last.surah}
🔢 من ${last.start_ayah} إلى ${last.end_ayah}
`;

  if (last.status === 'rated') {
    msg += `
⭐ التقييم: ${'⭐'.repeat(last.rating)}

💬 ملاحظات المعلم:
${last.notes}`;
  } else {
    msg += `\n⏳ لم يتم تقييم الإنجاز بعد`;
  }

  return bot.sendMessage(chatId, msg);
}

  /* ===== غير مسجل ===== */

  if (!userStates[chatId] || text.startsWith('/')) return;

  const s = userStates[chatId];

  /* ===== المعلم ===== */

  if (s.waiting === 'student_name') {
    s.student_name = text;
    s.waiting = 'student_id';
    return bot.sendMessage(chatId, 'اكتب معرف الطالب الرقمي:');
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
    return finishAchievement(chatId, msg.from.first_name);
  }

  /* ===== تعليم ===== */

  if (s.waiting === 'details') {
    s.details = text;
    return finishAchievement(chatId, msg.from.first_name);
  }

  /* ===== ملاحظات التقييم ===== */

  if (s.waiting === 'notes') {
    saveRating(s.ratingId, s.rating, text);
    delete userStates[chatId];
    return bot.sendMessage(chatId, '✅ تم التقييم بنجاح', teacherMenu);
  }
});

/* ================= CALLBACK ================= */

bot.on('callback_query', q => {
  const chatId = q.message.chat.id;
  const data = q.data;

  bot.answerCallbackQuery(q.id);

  /* ===== اختيار النوع ===== */

  if (data.startsWith('type_')) {
    const type = data.replace('type_', '');
    const s = userStates[chatId];

    s.type = type;
    s.waiting = type === 'تعليم' ? 'details' : 'surah';

   return bot.editMessageText(
  type === 'تعليم'
    ? 'اكتب تفاصيل التعليم:'
    : 'اختر السورة من الأزرار أو اكتب اسمها يدويًا:',
  type === 'تعليم'
    ? { chat_id: chatId, message_id: q.message.message_id }
    : {
        chat_id: chatId,
        message_id: q.message.message_id,
        ...surahKeyboard()
      }
);

  }
  /* ===============================
   اختيار السورة من الأزرار
=============================== */
if (data.startsWith('surah_')) {
  const surahName = data.replace('surah_', '');
  const s = userStates[chatId];

  if (!s) return;

  s.surah = surahName;
  s.waiting = 'start';

  return bot.editMessageText(
    `✅ تم اختيار سورة ${surahName}\n\nاكتب من آية رقم:`,
    {
      chat_id: chatId,
      message_id: q.message.message_id
    }
  );
}


  /* ===== تقييم ===== */

  if (data.startsWith('rate_')) {
    const id = Number(data.split('_')[1]);
    userStates[chatId] = { ratingId: id, waiting: 'stars' };

    return bot.sendMessage(chatId, 'اختر التقييم:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⭐', callback_data: `star_${id}_1` }],
          [{ text: '⭐⭐', callback_data: `star_${id}_2` }],
          [{ text: '⭐⭐⭐', callback_data: `star_${id}_3` }],
          [{ text: '⭐⭐⭐⭐', callback_data: `star_${id}_4` }],
          [{ text: '⭐⭐⭐⭐⭐', callback_data: `star_${id}_5` }]
        ]
      }
    });
  }

  if (data.startsWith('star_')) {
    const [, id, stars] = data.split('_');
    userStates[chatId].rating = Number(stars);
    userStates[chatId].ratingId = Number(id);
    userStates[chatId].waiting = 'notes';

    return bot.sendMessage(chatId, 'أرسل ملاحظاتك:');
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

function finishAchievement(chatId, username) {
  const s = userStates[chatId];

  const r = db.prepare(`
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

  sendToTeacher(r.lastInsertRowid);
bot.sendMessage(
  chatId,
  '✅ تم تسجيل الإنجاز بنجاح',
  chatId === OWNER_ID ? teacherMenu : studentMenu
);

  delete userStates[chatId];
}

function sendToTeacher(id) {
  const a = db.prepare(`SELECT * FROM achievements WHERE id=?`).get(id);

  let msg =
`🔔 إنجاز جديد

👤 الطالب: ${a.username}
📋 النوع: ${a.type}
`;

  if (a.type !== 'تعليم') {
    msg +=
`📖 السورة: ${a.surah}
🔢 من ${a.start_ayah} إلى ${a.end_ayah}
`;
  } else {
    msg += `📝 التفاصيل:\n${a.details}\n`;
  }

  bot.sendMessage(OWNER_ID, msg, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⭐ تقييم الإنجاز', callback_data: `rate_${a.id}` }]
      ]
    }
  });
}

function saveRating(id, rating, notes) {
  db.prepare(`
    UPDATE achievements
    SET status='rated', rating=?, notes=?
    WHERE id=?
  `).run(rating, notes, id);

  sendAchievementCard(id);
}

function sendAchievementCard(id) {
  const a = db.prepare(`SELECT * FROM achievements WHERE id=?`).get(id);

  const msg =
`🎉 تم تقييم إنجازك

📋 النوع: ${a.type}
📖 السورة: ${a.surah}
🔢 من ${a.start_ayah} إلى ${a.end_ayah}

⭐ التقييم: ${'⭐'.repeat(a.rating)}

💬 ملاحظات المعلم:
${a.notes}

بارك الله فيك 🌿`;

  bot.sendMessage(a.student_id, msg);
}

console.log('✅ البوت يعمل بشكل سليم');



