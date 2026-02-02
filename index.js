const TelegramBot = require('node-telegram-bot-api');
const Database = require('better-sqlite3');

const TOKEN = '8540862357:AAGrFvAD_rJGAXwqVNKTztKq16C-OIpRwX4';
const OWNER_ID = 7405584377;

const bot = new TelegramBot(TOKEN, { polling: true });
const db = new Database('bot_data.db');

const userStates = {};


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

db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER UNIQUE,
  student_name TEXT
)
`);


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

const quranSurahs = {
  'الفاتحة': 7,
  'البقرة': 286,
  'آل عمران': 200,
  'النساء': 176,
  'المائدة': 120,
  'الأنعام': 165,
  'الأعراف': 206,
  'الأنفال': 75,
  'التوبة': 129,
  'يونس': 109,
  'هود': 123,
  'يوسف': 111,
  'الرعد': 43,
  'إبراهيم': 52,
  'الحجر': 99,
  'النحل': 128,
  'الإسراء': 111,
  'الكهف': 110,
  'مريم': 98,
  'طه': 135,
  'الأنبياء': 112,
  'الحج': 78,
  'المؤمنون': 118,
  'النور': 64,
  'الفرقان': 77,
  'الشعراء': 227,
  'النمل': 93,
  'القصص': 88,
  'العنكبوت': 69,
  'الروم': 60,
  'لقمان': 34,
  'السجدة': 30,
  'الأحزاب': 73,
  'سبأ': 54,
  'فاطر': 45,
  'يس': 83,
  'الصافات': 182,
  'ص': 88,
  'الزمر': 75,
  'غافر': 85,
  'فصلت': 54,
  'الشورى': 53,
  'الزخرف': 89,
  'الدخان': 59,
  'الجاثية': 37,
  'الأحقاف': 35,
  'محمد': 38,
  'الفتح': 29,
  'الحجرات': 18,
  'ق': 45,
  'الذاريات': 60,
  'الطور': 49,
  'النجم': 62,
  'القمر': 55,
  'الرحمن': 78,
  'الواقعة': 96,
  'الحديد': 29,
  'المجادلة': 22,
  'الحشر': 24,
  'الممتحنة': 13,
  'الصف': 14,
  'الجمعة': 11,
  'المنافقون': 11,
  'التغابن': 18,
  'الطلاق': 12,
  'التحريم': 12,
  'الملك': 30,
  'القلم': 52,
  'الحاقة': 52,
  'المعارج': 44,
  'نوح': 28,
  'الجن': 28,
  'المزمل': 20,
  'المدثر': 56,
  'القيامة': 40,
  'الإنسان': 31,
  'المرسلات': 50,
  'النبأ': 40,
  'النازعات': 46,
  'عبس': 42,
  'التكوير': 29,
  'الانفطار': 19,
  'المطففين': 36,
  'الانشقاق': 25,
  'البروج': 22,
  'الطارق': 17,
  'الأعلى': 19,
  'الغاشية': 26,
  'الفجر': 30,
  'البلد': 20,
  'الشمس': 15,
  'الليل': 21,
  'الضحى': 11,
  'الشرح': 8,
  'التين': 8,
  'العلق': 19,
  'القدر': 5,
  'البينة': 8,
  'الزلزلة': 8,
  'العاديات': 11,
  'القارعة': 11,
  'التكاثر': 8,
  'العصر': 3,
  'الهمزة': 9,
  'الفيل': 5,
  'قريش': 4,
  'الماعون': 7,
  'الكوثر': 3,
  'الكافرون': 6,
  'النصر': 3,
  'المسد': 5,
  'الإخلاص': 4,
  'الفلق': 5,
  'الناس': 6
};

function normalizeArabic(text) {
  return text
    .toLowerCase()
    // إزالة التشكيل
    .replace(/[ًٌٍَُِّْٰ]/g, '')
    // توحيد الهمزات
    .replace(/[أإآ]/g, 'ا')
    // ياء وألف مقصورة
    .replace(/ى/g, 'ي')
    // تاء مربوطة
    .replace(/ة/g, 'ه')
    // واو وهمزة
    .replace(/ؤ/g, 'و')
    // ياء وهمزة
    .replace(/ئ/g, 'ي')
    // حذف كلمة سورة
    .replace(/سورة/g, '')
    // مسافات
    .replace(/\s+/g, '')
    .trim();
}

const SURAH_MAP = QURAN_SURAHS.map(name => ({
  original: name,
  normalized: normalizeArabic(name)
}));

function getSurahSmart(input) {
  const n = normalizeArabic(input);

  const found = SURAH_MAP.find(s => s.normalized === n);

  return found ? found.original : null;
}


function getMaxAyah(surah) {
  return quranSurahs[surah] || null;
}

function normalizeSurah(text) {
  if (!text) return null;

  text = text
    .replace(/سورة/g, '')
    .replace(/\s+/g, '')
    .trim();

  return QURAN_SURAHS.find(s =>
    s.replace(/\s+/g, '') === text
  ) || null;
}

// ثابت URL السكربت على Google Sheets
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_p5Gpbp28_cwp8SL4N52XNWDuaKyDENct-GJWnpcyN2YFkLpOveuhE5UyCIweLtyJ/exec"; // ضع رابط السكربت هنا

const axios = require('axios');



/*

async function callSheet(action, data = {}) {
  const res = await axios.post(SCRIPT_URL, {
    action,
    ...data
  });
  return res.data;
}
*/
/*
const axios = require('axios');

async function getStudentsForTeacher(teacherId) {
  const res = await axios.post(SCRIPT_URL, {
    action: "getStudentsByTeacher",
    teacher_id: teacherId
  });

  return res.data;
}
*/

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

const adminMenu = {
  reply_markup: {
    keyboard: [
      [{ text: 'إنشاء حساب' }],
        ['➕ إنشاء حلقة'],
      ['📋 الحلقات'],
      [{ text: '🧭 لوحة التحكم' }],
  [{ text: '🔐 دخول إلى حساب آخر' }],      
       ['🚪 تسجيل خروج']
    ],
    resize_keyboard: true
  }
};

const studentMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '➕ إضافة إنجاز' }],
      [{ text: '📘 آخر إنجاز' }],
       [{ text: '🔐 دخول إلى حساب آخر' }],   
       ['🚪 تسجيل خروج']
    ],
    resize_keyboard: true
  }
};
const mainKeyboard = {
  reply_markup: {
    keyboard: [
      ['🔐 دخول']
    ],
    resize_keyboard: true
  }
};



const teacherMenu = {
  reply_markup: {
    keyboard: [
      [{ text: '➕ إضافة إنجاز لطالب' }],
      [{ text: '🧭 لوحة التحكم' }],
      [{ text: '📊 الإنجازات غير المقيمة' }],
       [{ text: '🔐 دخول إلى حساب آخر' }],   
       ['🚪 تسجيل خروج']
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
    bot.sendMessage(msg.chat.id, 'مرحبًا بك 👨‍🏫', adminMenu);
  else
    bot.sendMessage(msg.chat.id, 'مرحبًا بك 🌿', mainKeyboard);
});

/* ================= MESSAGE ================= */

bot.on('message', async msg => {
  const chatId = msg.chat.id;
  
  const text = msg.text?.trim();

  // تأكد من وجود حالة للمستخدم
  if (!userStates[chatId]) {
    userStates[chatId] = {};
  }

  const s = userStates[chatId];

  if (s?.fromInline) {
  delete s.fromInline;
}
if (text === '🔐 دخول إلى حساب آخر') {

  try {
    const res = await axios.post(SCRIPT_URL, {
      action: 'getInactiveAccounts',
      telegram_id: chatId
    });

    const accounts = res.data.accounts || [];

    // 🔹 إنشاء أزرار الحسابات
    const keyboard = accounts.map(acc => ([
      {
        text: acc.full_name,
        callback_data: `switch:${acc.user_id}`
      }
    ]));

    // 🔹 زر الدخول بحساب جديد
    keyboard.push([
      {
        text: '🔄 الدخول في حساب آخر',
        callback_data: 'login_new'
      }
    ]);

    // 🔹 حفظ الحالة
    userStates[chatId] = {
      waiting: 'switch_account',
      accounts
    };

    return bot.sendMessage(chatId, '🔹 اختر الحساب الذي تريد الدخول فيه:', {
      reply_markup: {
         inline_keyboard: keyboard
      }
    });

  } catch (err) {
    console.error('خطأ في جلب الحسابات غير النشطة:', err.message);
    return bot.sendMessage(chatId, '❌ حدث خطأ، حاول لاحقًا.');
  }
}



// 🔹 تجاهل الرسائل بدون نص
if (!text) return;

try {
  const s = userStates[chatId] || {};

  // 1️⃣ إذا المستخدم في مرحلة تسجيل الدخول، نتخطى التحقق من الجلسة
  if (!s.waiting || s.waiting === 'login_username' || s.waiting === 'login_password') {

       // إدخال اسم المستخدم
  // =========================
  if ( s.waiting === 'login_username') {
    s.username = text;

    const res = await axios.post(SCRIPT_URL, {
      action: 'checkUsernameExists',
      username: text
    });

    if (!res.data.exists) {
return bot.sendMessage(chatId, '❌ المستخدم غير موجود، حاول مرة أخرى:');

    }

    s.waiting = 'login_password';
    return bot.sendMessage(chatId, '🔹 أدخل كلمة المرور:');
  }

    // =========================
  // إدخال كلمة المرور
  // =========================
  if (s.waiting === 'login_password') {
    const res = await axios.post(SCRIPT_URL, {
      action: 'checkPassword',
      username: s.username,
      password: text,
      telegram_id: chatId
    });

    if (!res.data.ok) {
      return bot.sendMessage(chatId, '❌ كلمة المرور غير صحيحة، حاول مرة أخرى:'
);
    }

    // نجاح تسجيل الدخول
    const fullName = res.data.full_name;
    const role = res.data.role;
    
console.log('LOGIN OK:', res.data);

    delete userStates[chatId];
   // userStates[chatId]?.role = role;

    // أزرار حسب الدور
    let keyboard = [];

    if (role === 'student') {
      keyboard = studentMenu;
    } else if (role === 'teacher') {
      keyboard = teacherMenu;
    } else if (role === 'admin') {
      keyboard = adminMenu;
    }
    

  //   delete s.waiting; 

    return bot.sendMessage(
      chatId,
      `🌸 مرحباً ${fullName}`,
 keyboard
    );
  }

    // إذا نقر الزر "🔐 دخول" ولم يبدأ s.waiting بعد
    if (text === '🔐 دخول') {
      if (!userStates[chatId]) userStates[chatId] = {};
      userStates[chatId].waiting = 'login_username';
      return bot.sendMessage(chatId, '🔹 أدخل اسم المستخدم أو رقم الهوية:');
    }
  }

  // 2️⃣ التحقق من الجلسة للمستخدمين المسجلين فقط
  const sessionCheck = await axios.post(SCRIPT_URL, {
    action: 'checkTelegramSession',
    telegram_id: chatId
  });

  if (!sessionCheck.data.exists) {
    return bot.sendMessage(chatId, '🔐 يجب تسجيل الدخول أولًا');
  }

  // 3️⃣ باقي منطق البوت للمستخدمين المسجلين
  const sessionData = sessionCheck.data;
  // هنا يمكن التعامل مع أي رسائل أخرى
  // ...

} catch (err) {
  console.error('خطأ في معالجة الرسالة:', err.message);
  return bot.sendMessage(chatId, '❌ حدث خطأ، حاول لاحقًا.');
}


  /*
    if (text === '🔐 دخول') {
    s.waiting = 'login_username'
    return bot.sendMessage(chatId, '🔹 أدخل اسم المستخدم أو رقم الهوية:');
  }
  */




  // =============================
  // خطوة 1: بدء إنشاء الحساب
  // =============================
if (text === 'إنشاء حساب') {
  userStates[chatId] = { waiting: 'new_user_input' };
  return bot.sendMessage(chatId, '🔹 أدخل اسم المستخدم أو رقم الهوية:');
}

// معالجة الإدخال من الادمن
if (userStates[chatId]?.waiting === 'new_user_input') {
  const newUsername = text.trim();
 

  (async () => {
    try {
      const res = await axios.post(SCRIPT_URL, {
        action: "checkUser",
        username: newUsername
      });

      if (res.data.exists) {
        return bot.sendMessage(chatId, '⚠️ هذا المستخدم موجود بالفعل، أدخل اسمًا آخر:');
      }

      // حفظ الاسم مؤقتًا
      userStates[chatId].new_user = newUsername;
      userStates[chatId].waiting = 'choose_role';
         s.username = text.trim();

      const roleKeyboard = {
        reply_markup: {
          
          inline_keyboard: [
            [{ text: 'طالب', callback_data: 'role_student' }],
            [{ text: 'معلم', callback_data: 'role_teacher' }],
            [{ text: 'ادمن', callback_data: 'role_admin' }]
          ]
        }
      };

      return bot.sendMessage(chatId, '✅ اختر نوع الحساب:', roleKeyboard,
                                  
);

    } catch (err) {
      console.error(err);
      return bot.sendMessage(chatId, '❌ حدث خطأ أثناء التحقق من المستخدم، حاول لاحقًا.');
    }
  })(); // استدعاء الدالة مباشرة
}

  // =============================
  // خطوة 4: الاسم الرباعي
  // =============================
  if (s.waiting === 'full_name') {

    s.full_name = text;
    s.waiting = 'phone_number';

    return bot.sendMessage(chatId, '🔹 أدخل رقم الجوال:');
  }

  // =============================
  // خطوة 5: رقم الجوال
  // =============================
  if (s.waiting === 'phone_number') {

    s.phone_number = text;
    s.waiting = 'password';

    return bot.sendMessage(chatId, '🔹 أدخل كلمة المرور:');
  }

  // =============================
  // خطوة 6: كلمة المرور
  // =============================
  if (s.waiting === 'password') {

    s.password = text;
    s.created_at = new Date().toISOString();
    s.is_active = false;

    let res;

    try {
      res = await axios.post(SCRIPT_URL, {
        action: 'addUser',
        user: {
          username: s.username,
          password: s.password,
          role: s.role,
          full_name: s.full_name,
          phone: s.phone_number,
          created_at: s.created_at,
          is_active: s.is_active
        }
      });
    } catch (err) {
      return bot.sendMessage(chatId, '⚠️ فشل الاتصال مع Google Sheet');
    }
if (!res.data.ok && res.data.message === 'PASSWORD_EXISTS') {
  return bot.sendMessage(chatId, '❌ كلمة المرور مستخدمة مسبقًا، أدخل كلمة أخرى:');
}

    if (res.data?.ok === true) {
      delete userStates[chatId];
      return bot.sendMessage(chatId, '✅ تم إنشاء الحساب بنجاح');
    }

    return bot.sendMessage(chatId, '❌ لم يتم إنشاء الحساب، حاول مرة أخرى');
  }

  // =====================
// ➕ إنشاء حلقة (أدمن)
// =====================
if (text === '➕ إنشاء حلقة') {

  // تأكد أن المستخدم أدمن
 const res = await axios.post(SCRIPT_URL, {
  action: 'checkAdmin',
  telegram_id: chatId
});

if (!res.data.isAdmin ) { // || chatId === 7405584377
  return bot.sendMessage(chatId, '❌ هذا الأمر مخصص للإدارة فقط');
}

  userStates[chatId] = {
    waiting: 'halaqa_name'
  };

  return bot.sendMessage(
    chatId,
    '✏️ أدخل اسم الحلقة:',
    {
        reply_markup: {
          
          inline_keyboard: [
            [{ text: '❌ إلغاء', callback_data: 'cancle_create_halaqa' }],
           
          ]
        }
      }
  
  );
}


  // =====================
// 📝 اسم الحلقة
// =====================
if (userStates[chatId]?.waiting === 'halaqa_name') {
  /*
  if (text === '❌ إلغاء') {
    delete userStates[chatId];
    return bot.sendMessage(chatId, '❎ تم الإلغاء', {
      reply_markup: { keyboard: adminMenu, resize_keyboard: true }
    });
  }

  // حفظ اسم الحلقة للخطوة التالية
//  userStates[chatId].halaqaName = text;
  userStates[chatId].waiting = 'next_create_halaqa';
  */

    const res = await axios.post(SCRIPT_URL, { action: 'getTeachers' });
  const teachers = res.data.teachers || [];

  if (teachers.length === 0) {
    delete userStates[chatId];
    return bot.sendMessage(chatId, '❌ لا يوجد معلمون مسجلون' );
  }

  // إنشاء أزرار للمعلمين
  const keyboard = teachers.map(t => ([{
    text: t.full_name,
    callback_data: `select_teacher:${t.user_id}`
  }]));
  keyboard.push([{ text: '❌ إلغاء', callback_data: 'cancel_halaqa' }]);

  return bot.sendMessage(chatId, '👨‍🏫 اختر معلم الحلقة:', keyboard );
  /*
  // نرسل رسالة بسيطة لتأكيد الاستلام فقط
  return bot.sendMessage(chatId, `✏️ تم حفظ اسم الحلقة: ${text}\nاضغط "التالي" لاختيار المعلم`,
                           {
        reply_markup: {
          
          inline_keyboard: [
            [{ text: 'التالي', callback_data: 'next_create_halaqa' }],
            [{ text: '❌ إلغاء', callback_data: 'cancle_create_halaqa' }],
           
          ]
        }
      }
    );
  */
}
  


  /*-

  // =====================
// 📝 اسم الحلقة
// =====================
if (userStates[chatId]?.waiting === 'halaqa_name') {

  if (text === '❌ إلغاء') {
    delete userStates[chatId];
    return bot.sendMessage(chatId, '❎ تم الإلغاء', adminMenu);
  }

  const halaqaName = text;

  userStates[chatId] = {
    waiting: 'halaqa_teacher',
    halaqaName
  };

  return bot.sendMessage(
    chatId,
    '',
    {
      reply_markup: {
        keyboard: [['❌ إلغاء']],
        resize_keyboard: true
      }
    }
  );
}
*/

  /*

  // =====================
// 👨‍🏫 معلم الحلقة
// =====================
if (userStates[chatId]?.waiting === 'halaqa_teacher') {
const halaqaName = text;

// طلب قائمة المعلمين من السيرفر
const res = await axios.post(SCRIPT_URL, {
  action: 'getTeachers'
});

const teachers = res.data.teachers || [];

if (teachers.length === 0) {
  delete userStates[chatId];
  return bot.sendMessage(chatId, '❌ لا يوجد معلمون مسجلون');
}

// إنشاء أزرار
const keyboard = teachers.map(t => ([
  {
    text: t.full_name,
    callback_data: `select_teacher:${t.user_id}`
  }
]));

userStates[chatId] = {
  waiting: 'halaqa_teacher',
  halaqaName
};

return bot.sendMessage(
  chatId,
  '👨‍🏫 اختر معلم الحلقة:',
  {
    reply_markup: {
      inline_keyboard: keyboard
    }
  }
);

}
*/


  


  // =========================
// تسجيل الخروج
// =========================
if (text === '🚪 تسجيل خروج') {

  try {
    const res = await axios.post(SCRIPT_URL, {
      action: 'logout',
      telegram_id: chatId
    });

    if (res.data.ok) {

      // حذف أي حالة مؤقتة
      delete userStates[chatId];

      // زر الدخول فقط
  return bot.sendMessage(
  chatId,
  '✅ تم تسجيل الخروج بنجاح',
  {
    reply_markup: {
      keyboard: [['🔐 دخول']],
      resize_keyboard: true
    }
  }
);

    } else {
      return bot.sendMessage(chatId, '❌ لم يتم العثور على جلسة نشطة');
    }

  } catch (err) {
    console.error(err);
    return bot.sendMessage(chatId, '⚠️ حدث خطأ أثناء تسجيل الخروج');
  }
}


  /* ===== إضافة إنجاز ===== */

  // || text === '➕ إضافة إنجاز لطالب'
if (text === '➕ إضافة إنجاز' || text === '➕ إضافة إنجاز لطالب') {
  // الكود هنا
  // تعيين حالة المستخدم
  userStates[chatId] = { isTeacher: chatId === OWNER_ID };

  bot.sendMessage(chatId, '✅ بدأ تسجيل الإنجاز', cancelKeyboard);

  // 👨‍🏫 مالك البوت يظهر له قائمة الطلاب المسجلين
  if (chatId === OWNER_ID) {
const students = db.prepare(`SELECT * FROM students`).all();

if (students.length === 0) {
  return bot.sendMessage(chatId, 'لا يوجد طلاب مدرجين في النظام.');
}

const keyboard = students.map(s => ([
  {
    text: `👤 ${s.student_name}`,
    callback_data: `choose_student_${s.student_id}`
  },
  {
    text: '✏️ تعديل الاسم',
    callback_data: `edit_student_${s.student_id}`
  }
]));

return bot.sendMessage(chatId, 'اختر طالبًا:', {
  reply_markup: {
    inline_keyboard: keyboard
  }
});


    /*
    // جلب الطلاب من قاعدة البيانات
    const students = db.prepare(`SELECT student_id, student_name FROM students`).all();

    if (students.length === 0) {
      // إذا القائمة فارغة
     //cancelKeyboard();
      return bot.sendMessage(chatId, '⚠️ لا يوجد طلاب مدرجين على النظام.');
    }

    // إعداد أزرار لكل طالب
    const buttons = students.map(s => [{ text: s.student_name, callback_data: `choose_student_${s.student_id}` }]);

    userStates[chatId].waiting = 'choose_student'; // لتحديد أننا ننتظر اختيار الطالب

    return bot.sendMessage(chatId, 'اختر الطالب لتسجيل الإنجاز له:', {
      reply_markup: { inline_keyboard: buttons }
    });
    */
  }

  // 👤 طالب عادي يبدأ مباشرة اختيار النوع
  userStates[chatId].waiting = 'choose_type';
  return showTypes(chatId);
}

  /*
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
  */

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



 // const s = userStates[chatId];
    if (s?.waiting === 'edit_student_name') {
  const newName = text.trim();

  if (newName.length < 2) {
    return bot.sendMessage(chatId, '❌ الاسم غير صالح.');
  }

  db.prepare(`
    UPDATE students
    SET student_name=?
    WHERE student_id=?
  `).run(newName, s.student_id);

  bot.sendMessage(chatId, `✅ تم تعديل الاسم إلى: ${newName}`);

  delete userStates[chatId];
  return;
}


  /* ===== المعلم ===== */


  /*

  if (s.waiting === 'student_name') {
    s.student_name = text;
    s.waiting = 'student_id';
    return bot.sendMessage(chatId, 'اكتب معرف الطالب الرقمي:');
  }
*/
  /*
   if (s.isTeacher) {
    const students = db.prepare('SELECT * FROM students').all();

    if (students.length === 0) {
      return bot.sendMessage(chatId, 'لا يوجد طلاب مسجلين بعد.');
    }

     /*
    const keyboard = students.map(st => [
      { text: st.student_name, callback_data: `student_${st.student_id}` }
    ]);

    return bot.sendMessage(chatId, 'اختر الطالب:', {
      reply_markup: { inline_keyboard: keyboard }
    });
     
  }
  if (s.waiting === 'student_id') {
    s.student_id = Number(text);
    s.waiting = 'choose_type';
    return showTypes(chatId);
  }
  */
  
  

  
  /* ===== السورة ===== */

if (s.waiting === 'surah') {

  const surah = getSurahSmart(text);

  if (!surah) {
    return bot.sendMessage(
      chatId,
      '❌ اسم السورة غير معروف\nاكتب الاسم الصحيح مثل: البقرة، النساء، يس'
    );
  }

  s.surah = surah;
  s.waiting = 'start';

  return bot.sendMessage(
    chatId,
    `✅ تم اختيار سورة ${surah}\nمن آية رقم:`
  );
}



  
if (s.waiting === 'start') {
  const num = parseInt(text.trim(), 10);
  const maxAyah = getMaxAyah(s.surah);

  if (!maxAyah) {
    return bot.sendMessage(chatId, '❌ خطأ في السورة، أعد اختيارها');
  }

  if (isNaN(num)) {
    return bot.sendMessage(chatId, '❌ أدخل رقمًا صحيحًا');
  }

  if (num < 1 || num >= maxAyah) {
    return bot.sendMessage(
      chatId,
      `❌ رقم الآية يجب أن يكون بين 1 و ${maxAyah - 1}`
    );
  }

  s.start = num;
  s.waiting = 'end';

  return bot.sendMessage(chatId, 'إلى آية رقم:');
}


if (s.waiting === 'end') {
  const num = parseInt(text.trim(), 10);
  const maxAyah = getMaxAyah(s.surah);

  if (!maxAyah) {
    return bot.sendMessage(chatId, '❌ خطأ في السورة، أعد اختيارها');
  }

  if (isNaN(num)) {
    return bot.sendMessage(chatId, '❌ أدخل رقمًا صحيحًا');
  }

  if (num <= s.start || num > maxAyah) {
    return bot.sendMessage(
      chatId,
      `❌ رقم الآية يجب أن يكون بين ${s.start + 1} و ${maxAyah}`
    );
  }

  s.end = num;

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

  if (text === '🧭 لوحة التحكم' && chatId === OWNER_ID) {
  return bot.sendMessage(
    chatId,
    '🧭 لوحة التحكم\n\n(سيتم إضافة الخيارات لاحقًا)',
    teacherMenu
  );
}

});

/* ================= CALLBACK ================= */

bot.on('callback_query', async (q) => {

  const chatId = q.message.chat.id;
  const data = q.data;

 
// عند اختيار نوع الحساب من القائمة

  // نتأكد أن هناك حالة حالية للمستخدم
  if (!userStates[chatId]) userStates[chatId] = {};

    try {
 bot.answerCallbackQuery(q.id);
    // =====================
  // 🔁 تبديل حساب
  // =====================
  if (data.startsWith('switch:')) {
  bot.editMessageReplyMarkup(
  { inline_keyboard: [] },
  {
    chat_id: chatId,
    message_id: q.message.message_id
  }
);

    const userId = data.split(':')[1];

    const res = await axios.post(SCRIPT_URL, {
      action: 'switchAccount',
      telegram_id: chatId,
      user_id: userId
    });

    if (!res.data.ok) {
      return bot.sendMessage(chatId, '❌ فشل الدخول للحساب');
    }

    const role = res.data.role;
    const fullName = res.data.full_name;

    let keyboard = [];

    if (role === 'student') keyboard = studentMenu;
    if (role === 'teacher') keyboard = teacherMenu;
    if (role === 'admin') keyboard = adminMenu;

    delete userStates[chatId];
   


    return bot.sendMessage(
      chatId,
      `🌸 مرحبًا ${fullName}`,
       
       keyboard, 
        //   message_id: callbackQuery.message.message_id

    );
  }


    // =========================
    // 🔐 دخول في حساب آخر يدويًا
    // =========================
if (data === 'login_new') {

  userStates[chatId] = {
    waiting: 'login_username',
    fromInline: true
  };

  return bot.sendMessage(
    chatId,
    '🔹 أدخل اسم المستخدم أو رقم الهوية:',
    
     {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '❌ إلغاء',
            callback_data: 'cancel_login'
          }
        ]
      ]
    }
  }
    
  );

    await bot.editMessageReplyMarkup(
  { inline_keyboard: [] },
  {
    chat_id: chatId,
    message_id: q.message.message_id
  }
);

    
/*
 if (!userStates[chatId]) userStates[chatId] = {};
      userStates[chatId].waiting = 'login_username';

      await bot.editMessageReplyMarkup(
  { inline_keyboard: [] },
  {
    chat_id: chatId,
    message_id: query.message.message_id
  }
);

      return bot.sendMessage(chatId, '🔹 أدخل اسم المستخدم أو رقم الهوية:');
      */
      //
 

    }

  } catch (err) {
    console.error('callback error:', err.message);
    return bot.sendMessage(chatId, '❌ حدث خطأ، حاول لاحقًا');
  }

  if (data === 'cancel_login') {
  delete userStates[chatId];

  return bot.sendMessage(chatId, '❌ تم الإلغاء',);
}
  

    if (data === 'cancle_create_halaqa') {
  delete userStates[chatId];
           
  return bot.sendMessage(chatId, '❌ تم الإلغاء',);
}


  /*
     if (data === 'next_create_halaqa') {
  const res = await axios.post(SCRIPT_URL, { action: 'getTeachers' });
  const teachers = res.data.teachers || [];

  if (teachers.length === 0) {
    delete userStates[chatId];
    return bot.sendMessage(chatId, '❌ لا يوجد معلمون مسجلون' );
  }

  // إنشاء أزرار للمعلمين
  const keyboard = teachers.map(t => ([{
    text: t.full_name,
    callback_data: `select_teacher:${t.user_id}`
  }]));
  keyboard.push([{ text: '❌ إلغاء', callback_data: 'cancel_halaqa' }]);

  return bot.sendMessage(chatId, '👨‍🏫 اختر معلم الحلقة:' );
           

}
  */
  // حفظ نوع الحساب الذي اختاره
  if (['role_admin', 'role_teacher', 'role_student'].includes(data)) {
   userStates[chatId].role = data.split("_")[1];
       // userStates[chatId].account_type = data;

     
    userStates[chatId].waiting = 'full_name'; // الآن ينتظر الاسم الرباعي

    // الرد عليه ليكتب الاسم الرباعي
    bot.sendMessage(chatId, '✏️ اكتب الاسم الرباعي:');

    // إزالة Inline Keyboard بعد الاختيار
       await bot.editMessageReplyMarkup(
  { inline_keyboard: [] },
  {
    chat_id: chatId,
    message_id: q.message.message_id
  }
);
   //  bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
   //    chat_id: chatId,
   // //  message_id: callbackQuery.message.message_id
   //  });
  }
  

  /*


// =====================
// 👨‍🏫 اختيار المعلم
// =====================
// هنا يتم التعامل عند ضغط زر "التالي" أو عند callback query
if (userStates[chatId]?.waiting === 'halaqa_teacher' && text === 'التالي') {
  const res = await axios.post(SCRIPT_URL, { action: 'getTeachers' });
  const teachers = res.data.teachers || [];

  if (teachers.length === 0) {
    delete userStates[chatId];
    return bot.sendMessage(chatId, '❌ لا يوجد معلمون مسجلون', {
      reply_markup: { keyboard: adminMenu, resize_keyboard: true }
    });
  }

  // إنشاء أزرار للمعلمين
  const keyboard = teachers.map(t => ([{
    text: t.full_name,
    callback_data: `select_teacher:${t.user_id}`
  }]));
  keyboard.push([{ text: '❌ إلغاء', callback_data: 'cancel_halaqa' }]);

  return bot.sendMessage(chatId, '👨‍🏫 اختر معلم الحلقة:', {
    reply_markup: { inline_keyboard: keyboard }
  });
}
  */
  
  // =====================
// 👨‍🏫 اختيار معلم الحلقة
// =====================
if (data.startsWith('select_teacher:')) {

  const teacherId = data.split(':')[1];
  const s = userStates[chatId];

  if (!s || s.waiting !== 'halaqa_teacher') {
    return bot.answerCallbackQuery(query.id);
  }

  const halaqaName = s.halaqaName;

  // ⏳ لاحقًا سنرسل createHalaqa للسيرفر
  // الآن تأكيد فقط

  delete userStates[chatId];

  await bot.answerCallbackQuery(query.id);

  return bot.sendMessage(
    chatId,
    `✅ تم إنشاء الحلقة بنجاح\n\n📘 الحلقة: ${halaqaName}\n👨‍🏫 المعلم: تم اختياره`,
    adminMenu
  );
}
  

 



/*
  if (s.waiting === 'switch_account') {
  if (text === '🔄 الدخول في حساب آخر') {
    // نبدأ عملية تسجيل الدخول اليدوي
    s.waiting = 'login_username';
    return bot.sendMessage(chatId, '🔹 أدخل اسم المستخدم أو رقم الهوية:');
  }

  // اختيار حساب من القائمة
  const selected = s.accounts.find(a => a.full_name === text);

  if (!selected) {
    return bot.sendMessage(chatId, '❌ الرجاء اختيار حساب صحيح من القائمة.');
  }

  // تفعيل الحساب المختار
  await axios.post(SCRIPT_URL, {
    action: 'activateAccount',
    user_id: selected.user_id,
    telegram_id: chatId
  });

  delete userStates[chatId];

  return bot.sendMessage(chatId, `✅ تم تفعيل الحساب: ${selected.full_name}`);
}
*/


  // 👨‍🏫 المعلم يختار طالب من القائمة
if (data.startsWith('choose_student_')) {
  const chatState = userStates[chatId];
  if (!chatState || !chatState.isTeacher) return;

  // استخراج معرف الطالب من callback_data
  const studentId = Number(data.replace('choose_student_', ''));

  // جلب اسم الطالب من قاعدة البيانات
  const student = db.prepare(`SELECT student_name FROM students WHERE student_id=?`).get(studentId);
  if (!student) {
    return bot.sendMessage(chatId, '⚠️ هذا الطالب غير موجود في النظام.');
  }

  // حفظ بيانات الطالب في الحالة
  chatState.student_id = studentId;
  chatState.student_name = student.student_name;

  // تغيير الحالة لبدء اختيار نوع الإنجاز
  chatState.waiting = 'choose_type';

  // عرض خيارات النوع مباشرة
  return showTypes(chatId);
}

  if (data.startsWith('edit_student_')) {
  const studentId = Number(data.replace('edit_student_', ''));

  userStates[chatId] = {
    isTeacher: true,
    waiting: 'edit_student_name',
    student_id: studentId
  };

  return bot.sendMessage(chatId, '✏️ اكتب الاسم الجديد للطالب:');
}



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
  addStudentIfNotExist(chatId, username);

  sendToTeacher(r.lastInsertRowid);
bot.sendMessage(
  chatId,
  '✅ تم تسجيل الإنجاز بنجاح',
  chatId === OWNER_ID ? teacherMenu : studentMenu
);

  delete userStates[chatId];
}

function addStudentIfNotExist(student_id, student_name) {
  const exists = db.prepare(`SELECT 1 FROM students WHERE student_id=?`).get(student_id);
  if (!exists) {
    db.prepare(`INSERT INTO students (student_id, student_name) VALUES (?, ?)`)
      .run(student_id, student_name);
  }
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
  if (!a) return;

  let msg = `🎉 تم تقييم إنجازك\n\n`;

  if (a.type !== 'تعليم') {
    // الحفظ أو المراجعة
    msg += `📖 السورة: ${a.surah}\n`;
    msg += `🔢 من ${a.start_ayah} إلى ${a.end_ayah}\n\n`;
  } else {
    // تعليم
    msg += `📝 تفاصيل التعليم:\n${a.details}\n\n`;
  }

  msg += `⭐ التقييم: ${'⭐'.repeat(a.rating)}\n\n`;
  msg += `💬 ملاحظات المعلم:\n${a.notes}\n\n`;
  msg += `بارك الله فيك 🌿`;

  bot.sendMessage(a.student_id, msg);
}




/*
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

*/
console.log('✅ البوت يعمل بشكل سليم');






































































































































































