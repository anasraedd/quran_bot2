const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');

// ضع توكن البوت هنا
const TOKEN = '8540862357:AAGrFvAD_rJGAXwqVNKTztKq16C-OIpRwX4';
// ضع معرفك هنا
const OWNER_ID = 7405584377;

// إنشاء البوت
const bot = new TelegramBot(TOKEN, { polling: true });

// إنشاء قاعدة البيانات
const db = new Database('bot_data.db');

// إنشاء الجدول
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
    student_id INTEGER DEFAULT NULL
  )
`);

// تخزين البيانات المؤقتة للمستخدمين
const userStates = {};

// أمر /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, 'مرحباً بك! اضغط على الزر لإضافة إنجازك اليومي:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ إضافة إنجاز', callback_data: 'add_achievement' }]
      ]
    }
  });
});

// معالجة الأزرار
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  
  // الإجابة على الضغطة
  bot.answerCallbackQuery(query.id);
  
  // إضافة إنجاز
  if (data === 'add_achievement') {
    // التحقق إذا كان المستخدم هو المالك
    if (chatId === OWNER_ID) {
      bot.editMessageText('أنت المعلم! اختر الخيار:', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ إضافة إنجاز لطالب', callback_data: 'add_for_student' }],
            [{ text: '📊 عرض الإنجازات المعلقة', callback_data: 'pending_achievements' }]
          ]
        }
      });
    } else {
      bot.editMessageText('اختر نوع الإنجاز:', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📖 حفظ جديد', callback_data: 'type_حفظ_جديد' }],
            [{ text: '🔄 مراجعة قريبة', callback_data: 'type_مراجعة_قريبة' }],
            [{ text: '📚 مراجعة بعيدة', callback_data: 'type_مراجعة_بعيدة' }],
            [{ text: '👨‍🏫 تعليم', callback_data: 'type_تعليم' }]
          ]
        }
      });
    }
  }
  
  // إضافة إنجاز للطالب (من قبل المعلم)
  else if (data === 'add_for_student') {
    bot.editMessageText('اكتب اسم الطالب:', {
      chat_id: chatId,
      message_id: messageId
    });
    userStates[chatId] = { waiting_for: 'student_name', is_teacher: true };
  }
  
  // عرض الإنجازات المعلقة
  else if (data === 'pending_achievements') {
    const pending = db.prepare('SELECT * FROM achievements WHERE status = ?').all('pending');
    
    if (pending.length === 0) {
      bot.editMessageText('لا توجد إنجازات معلقة.', {
        chat_id: chatId,
        message_id: messageId
      });
    } else {
      let keyboard = [];
      pending.forEach(achievement => {
        keyboard.push([{
          text: `رقم الإنجاز: ${achievement.id}\nالنوع: ${achievement.type}\nاسم الطالب: ${achievement.username}`,
          callback_data: `rate_${achievement.id}`
        }]);
      });
      
      bot.editMessageText('اختر الإنجاز لتقييمه:', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  }

  // اختيار نوع الإنجاز
  else if (data.startsWith('type_')) {
    const type = data.replace('type_', '');
    userStates[chatId] = { type: type };
    
    if (type === 'تعليم') {
      bot.editMessageText('اكتب تفاصيل التعليم:', {
        chat_id: chatId,
        message_id: messageId
      });
      userStates[chatId].waiting_for = 'teaching_details';
    } else {
      bot.editMessageText('اكتب اسم السورة:', {
        chat_id: chatId,
        message_id: messageId
      });
      userStates[chatId].waiting_for = 'surah_name';
    }
  }
  
  // اسم الطالب (للمعلم)
  else if (data.startsWith('student_name_')) {
    const studentName = data.replace('student_name_', '');
    userStates[chatId].studentName = studentName;
    userStates[chatId].waiting_for = 'surah_name';
    bot.editMessageText('اكتب اسم السورة:', {
      chat_id: chatId,
      message_id: messageId
    });
  }

  // تقييم الإنجاز
  else if (data.startsWith('rate_')) {
    const parts = data.split('_');
    const achievementId = parseInt(parts);
    
    userStates[OWNER_ID] = {
      rating_achievement_id: achievementId,
      waiting_for: 'rating_stars'
    };
    
    bot.editMessageText('اختر تقييمًا (من 1 إلى 5):', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '⭐', callback_data: `rating_${achievementId}_1` }],
          [{ text: '⭐⭐', callback_data: `rating_${achievementId}_2` }],
          [{ text: '⭐⭐⭐', callback_data: `rating_${achievementId}_3` }],
          [{ text: '⭐⭐⭐⭐', callback_data: `rating_${achievementId}_4` }],
          [{ text: '⭐⭐⭐⭐⭐', callback_data: `rating_${achievementId}_5` }]
        ]
      }
    });
  }

  // اختيار عدد النجوم (لتقييم المعلم)
  else if (data.startsWith('rating_')) {
    const parts = data.split('_');
    const achievementId = parseInt(parts);
    const rating = parseInt(parts);

    userStates[OWNER_ID].rating_stars = rating;
    userStates[OWNER_ID].waiting_for = 'notes';

    bot.editMessageText('أضف ملاحظاتك:', {
      chat_id: chatId,
      message_id: messageId
    });
  }

  // حفظ التقييم مع الملاحظات
  else if (data.startsWith('notes_')) {
    const notes = query.text; // Get notes from the message text
    const achievementId = userStates[OWNER_ID].rating_achievement_id;
    const rating = userStates[OWNER_ID].rating_stars;

    saveRating(achievementId, rating, notes);

    bot.editMessageText('✅ تم تقييم الإنجاز بنجاح!', {
      chat_id: chatId,
      message_id: messageId
    });

    delete userStates[OWNER_ID];
  }
});

// معالجة الرسائل النصية
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  // تجاهل الأوامر
  if (text && text.startsWith('/')) return;
  
  const userState = userStates[chatId];
  if (!userState) return;
  
  const waitingFor = userState.waiting_for;
  
  // اسم السورة
  if (waitingFor === 'surah_name') {
    userStates[chatId].surah = text;
    userStates[chatId].waiting_for = 'start_ayah';
    bot.sendMessage(chatId, 'اكتب رقم الآية التي بدأت منها:');
  }
  
  // رقم الآية البداية
  else if (waitingFor === 'start_ayah') {
    userStates[chatId].start_ayah = parseInt(text);
    userStates[chatId].waiting_for = 'end_ayah';
    bot.sendMessage(chatId, 'اكتب رقم الآية التي انتهيت عندها:');
  }
  
  // رقم الآية النهاية
  else if (waitingFor === 'end_ayah') {
    userStates[chatId].end_ayah = parseInt(text);
    
    // حفظ الإنجاز
    const achievementId = saveAchievement(chatId, msg.from.first_name, userStates[chatId]);
    
    bot.sendMessage(chatId, '✨ بوركت جهودك! انتظر تقييم إنجازك من المعلم.');
    
    // إرسال إشعار للمعلم
    await notifyTeacher(achievementId, msg.from.first_name);
    
    delete userStates[chatId];
  }
  
  // تفاصيل التعليم
  else if (waitingFor === 'teaching_details') {
    userStates[chatId].details = text;
    
    // حفظ الإنجاز
    const achievementId = saveAchievement(chatId, msg.from.first_name, userStates[chatId]);
    
    bot.sendMessage(chatId, '✨ بوركت جهودك! انتظر تقييم إنجازك من المعلم.');
    
    // إرسال إشعار للمعلم
    await notifyTeacher(achievementId, msg.from.first_name);
    
    delete userStates[chatId];
  }
});

// حفظ الإنجاز
function saveAchievement(userId, username, data) {
    const stmt = db.prepare(`
      INSERT INTO achievements 
      (user_id, username, type, surah, start_ayah, end_ayah, details, status, created_at, student_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userId,
      username,
      data.type,
      data.surah || '',
      data.start_ayah || 0,
      data.end_ayah || 0,
      data.details || '',
      'pending',
      new Date().toISOString(),
      data.studentId || null
    );
    
    return result.lastInsertRowid;
  }
  
// إشعار المعلم
async function notifyTeacher(achievementId, username) {
    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievementId);
    
    if (!achievement) return;
    
    let message = `🔔 إنجاز جديد من الطالب: ${username}\n\n`;
    message += `📋 النوع: ${achievement.type}\n`;
    
    if (achievement.type !== 'تعليم') {
      message += `📖 السورة: ${achievement.surah}\n`;
      message += `🔢 من الآية ${achievement.start_ayah} إلى الآية ${achievement.end_ayah}\n`;
    } else {
      message += `📝 التفاصيل: ${achievement.details}\n`;
    }
    
    message += `\n⭐ قيّم هذا الإنجاز:`;
    
    bot.sendMessage(OWNER_ID, message, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⭐', callback_data: `rate_${achievementId}_1` },
            { text: '⭐⭐', callback_data: `rate_${achievementId}_2` },
            { text: '⭐⭐⭐', callback_data: `rate_${achievementId}_3` }
          ],
          [
            { text: '⭐⭐⭐⭐', callback_data: `rate_${achievementId}_4` },
            { text: '⭐⭐⭐⭐⭐', callback_data: `rate_${achievementId}_5` }
          ]
        ]
      }
    });
  }

// حفظ التقييم
function saveRating(achievementId, rating, notes) {
  const stmt = db.prepare(`
    UPDATE achievements 
    SET status = 'rated', rating = ?, notes = ?
    WHERE id = ?
  `);
  
  stmt.run(rating, notes, achievementId);
}

// إرسال بطاقة الإنجاز للطالب
async function sendAchievementCard(achievementId) {
    const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(achievementId);
    
    if (!achievement) return;
    
    let card = `🎉 تم تقييم إنجازك!\n\n`;
    card += `📋 النوع: ${achievement.type}\n`;
    
    if (achievement.type !== 'تعليم') {
      card += `📖 السورة: ${achievement.surah}\n`;
      card += `🔢 من الآية ${achievement.start_ayah} إلى الآية ${achievement.end_ayah}\n`;
    } else {
      card += `📝 التفاصيل: ${achievement.details}\n`;
    }
    
    card += `\n⭐ التقييم: ${'⭐'.repeat(achievement.rating)}\n`;
    card += `\n💬 ملاحظات المعلم:\n${achievement.notes}\n`;
    card += `\nبارك الله في جهودك! 🌟`;
    
    // تأكد من أن user_id هو معرّف الطالب
    bot.sendMessage(achievement.student_id || achievement.user_id, card);
  }

console.log('✅ البوت يعمل الآن!');
