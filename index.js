require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');

const BOT_TOKEN = process.env.BOT_TOKEN || "8854792431:AAEqBTYvlzWiwebccUHT41qC92yOtDuGkNE"; 
const CLICK_TOKEN = process.env.CLICK_TOKEN || "398062629:TEST:999999999_F91D8F69C042267444B74CC0B3C747757EB0E065";
const ADMIN_ID = process.env.ADMIN_ID || "8584049635"; 

if (!BOT_TOKEN) {
    console.error("Xatolik: BOT_TOKEN topilmadi! Render'da Environment Variables qismini tekshiring.");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

const registeredUsers = new Set();
const userCarts = {};
const userSteps = {};

const mainKeyboard = {
    reply_markup: {
        keyboard: [
            [{ text: "🍔 Menyu" }],
            [{ text: "🛒 Savat" }, { text: "📍 Bizning Manzil" }],
            [{ text: "📞 Admin bilan aloqa" }]
        ],
        resize_keyboard: true
    }
};

const products = {
    burger: { name: "🌭 Xot-Dog", price: 15000, image: "https://i.pinimg.com/736x/fc/f8/25/fcf825ad35e7084bb5a845845e0cff91.jpg" },
    lavash: { name: "🌯 Lavash", price: 35000, image: "https://i.pinimg.com/736x/37/64/87/37648797115b6c41fe2c2afda620e4f1.jpg" },
    pizza: { name: "🍕 Pitsa Assorti", price: 75000, image: "https://i.pinimg.com/736x/c6/f0/64/c6f064ed1e92e2e864672f396b7fd8a7.jpg" },
    cola: { name: "🥤 Coca-Cola 1.5L", price: 15000, image: "https://images.uzum.uz/cia493tenntd8rfc2s40/original.jpg" }
};

bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const firstName = ctx.from.first_name;
    const username = ctx.from.username ? `@${ctx.from.username}` : "Mavjud emas";
    
    userCarts[userId] = [];
    delete userSteps[userId];
    
    const now = new Date();
    const timeJoined = now.toLocaleTimeString("uz-UZ", { 
        timeZone: "Asia/Tashkent", 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
    });

    if (!registeredUsers.has(userId)) {
        registeredUsers.add(userId);
        
        const totalUsers = registeredUsers.size;
        let notificationText = `` +
            `🔔 Yangi foydalanuvchi qo'shildi!\n\n` +
            `👤 Ismi: ${firstName}\n` +
            `🌐 Username: ${username}\n` +
            `🆔 ID: ${userId}\n` +
            `🕒 Vaqti: ${timeJoined}\n\n` +
            `📊 Jami foydalanuvchilar: ${totalUsers} ta`;

        try {
            await ctx.telegram.sendMessage(ADMIN_ID, notificationText);
        } catch (adminErr) {
            console.error("Adminga xabar yuborishda xatolik:", adminErr);
        }
    }

    ctx.reply(
        `✨ Assorti Food Khiva botiga xush kelibsiz, ${firstName}!\n\n` +
        `🍕 Xivadagi eng mazzali fast-food va taomlarga buyurtma berishni boshlashingiz mumkin.\n\n` +
        `👇 Quyidagi menyudan kerakli bo'limni tanlang:`,
        mainKeyboard
    );
});

bot.hears("🍔 Menyu", async (ctx) => {
    delete userSteps[ctx.from.id];
    await ctx.reply("✨ Assorti Food chiroyli menyusi yuklanmoqda...");

    const promises = Object.keys(products).map(key => {
        const item = products[key];
        return ctx.replyWithPhoto(item.image, {
            caption: `✨ ${item.name}\n\n💰 Narxi: ${item.price.toLocaleString('uz-UZ')} so'm`,
            reply_markup: {
                inline_keyboard: [[{ text: "📥 Savatga qo'shish", callback_data: `add_${key}` }]]
            }
        }).catch(err => console.error("Menyu yuborishda xatolik:", err));
    });

    await Promise.all(promises);
});

bot.hears("🛒 Savat", (ctx) => {
    delete userSteps[ctx.from.id];
    const userId = ctx.from.id;
    const cart = userCarts[userId] || [];
    
    if (cart.length === 0) {
        return ctx.reply("🛒 Sizning savatingiz bo'sh! \n\nTaom buyurtma qilish uchun avval 🍔 Menyu bo'limiga kiring.");
    }
    
    let text = "🛒 Sizning savatingiz:\n\n";
    let total = 0;
    cart.forEach((item, index) => {
        text += `${index + 1}. ${item.name} — ${item.price.toLocaleString('uz-UZ')} so'm\n`;
        total += item.price;
    });
    text += `\n💰 Jami hisob: ${total.toLocaleString('uz-UZ')} so'm\n\nAssorti Food Khiva tizimi orqali xavfsiz buyurtma berishni boshlash uchun pastdagi tugmani bosing:`;
    
    ctx.reply(text, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🚖 Buyurtma berishni boshlash", callback_data: "start_order" }],
                [{ text: "🗑 Savatni tozalash", callback_data: "clear_cart" }]
            ]
        }
    });
});

bot.hears("📍 Bizning Manzil", async (ctx) => {
    delete userSteps[ctx.from.id];
    await ctx.reply("📍 Assorti Food Khiva");
    await ctx.replyWithLocation(41.397776, 60.3598305);
});

bot.hears("📞 Admin bilan aloqa", (ctx) => {
    delete userSteps[ctx.from.id];
    ctx.reply(
        "📞 Assorti Food Khiva Adminstratsiyasi \n\n" +
        "Savollar va takliflar bo'lsa, bemalol biz bilan bog'laning:\n\n" +
        "👨‍💻 Admin: @lazizshavkatov712\n" +
        "☎️ Telefon: +998972815050\n" +
        "⏱ Ish vaqti: 24/7"
    );
});

Object.keys(products).forEach(key => {
    bot.action(`add_${key}`, (ctx) => {
        const userId = ctx.from.id;
        if (!userCarts[userId]) userCarts[userId] = [];
        userCarts[userId].push(products[key]);
        ctx.answerCbQuery(`${products[key].name} savatga qo'shildi! ✅`);
    });
});

bot.action("clear_cart", (ctx) => {
    userCarts[ctx.from.id] = [];
    ctx.answerCbQuery("Savat tozalandi! 🗑");
    ctx.editMessageText("🗑 Savatingiz tozalandi.");
});

bot.action("start_order", (ctx) => {
    const userId = ctx.from.id;
    userSteps[userId] = { step: "WAITING_NAME", data: {} };
    ctx.answerCbQuery();
    ctx.reply("👤 1-bosqich. Iltimos, ismingizni kiriting:", { reply_markup: { remove_keyboard: true } });
});

bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    const userState = userSteps[userId];
    const text = ctx.message.text;

    if (text === "🍔 Menyu" || text === "🛒 Savat" || text === "📍 Bizning Manzil" || text === "📞 Admin bilan aloqa") {
        return; 
    }

    if (!userState) {
        return ctx.reply("Iltimos, quyidagi menyudan foydalaning:", mainKeyboard);
    }

    if (userState.step === "WAITING_NAME") {
        userState.data.name = text;
        userState.step = "WAITING_PHONE";
        return ctx.reply("📞 2-bosqich. Telefon raqamingizni kiriting (Masalan: +998991234567):", {
            reply_markup: {
                keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    }

    if (userState.step === "WAITING_PHONE") {
        let typedPhone = text.trim();
        if (!typedPhone.startsWith('+')) {
            typedPhone = '+' + typedPhone;
        }
        userState.data.phone = typedPhone;
        return goToDeliveryStep(ctx, userState);
    }
});

bot.on("contact", (ctx) => {
    const userId = ctx.from.id;
    const userState = userSteps[userId];

    if (userState && userState.step === "WAITING_PHONE") {
        let phone = ctx.message.contact.phone_number;
        if (!phone.startsWith('+')) {
            phone = '+' + phone;
        }
        userState.data.phone = phone;
        goToDeliveryStep(ctx, userState);
    }
});

function goToDeliveryStep(ctx, userState) {
    userState.step = "WAITING_DELIVERY";
    ctx.reply("🚖 3-bosqich. Yetkazib berish turini tanlang:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🛵 Yetkazib berish (Dostavka)", callback_data: "del_delivery" }],
                [{ text: "🏃‍♂️ O'zim olib ketaman (Samovivoz)", callback_data: "del_pickup" }]
            ]
        }
    });
}

bot.action(["del_delivery", "del_pickup"], (ctx) => {
    const userId = ctx.from.id;
    const userState = userSteps[userId];
    if (!userState) return ctx.reply("Xatolik yuz berdi, iltimos /start bosing.");

    ctx.answerCbQuery();

    if (ctx.callbackQuery.data === "del_delivery") {
        userState.data.delivery = "🛵 Dostavka";
        userState.step = "WAITING_LOCATION";
        ctx.reply("📍 4-bosqich. Taom yetkazib berilishi kerak bo'lgan joylashuvni (lokatsiyani) pastdagi maxsus tugma orqali yuboring:", {
            reply_markup: {
                keyboard: [[{ text: "📍 Joylashuvni yuborish", request_location: true }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
    } else {
        userState.data.delivery = "🏃‍♂️ O'zim olib ketaman";
        userState.data.location = null; 
        goToPaymentStep(ctx, userState, "4-bosqich");
    }
});

bot.on("location", (ctx) => {
    const userId = ctx.from.id;
    const userState = userSteps[userId];

    if (userState && userState.step === "WAITING_LOCATION") {
        userState.data.location = {
            latitude: ctx.message.location.latitude,
            longitude: ctx.message.location.longitude
        };
        goToPaymentStep(ctx, userState, "5-bosqich");
    }
});

function goToPaymentStep(ctx, userState, stepNumber) {
    userState.step = "WAITING_PAYMENT";
    ctx.reply(`💳 ${stepNumber}. To'lov turini tanlang:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🟢 Click", callback_data: "pay_click" }, { text: "🔵 Payme", callback_data: "pay_payme" }],
                [{ text: "💵 Naqd pul orqali", callback_data: "pay_cash" }]
            ]
        }
    });
}

bot.action(["pay_click", "pay_payme", "pay_cash"], async (ctx) => {
    const userId = ctx.from.id;
    const userState = userSteps[userId];
    const cart = userCarts[userId] || [];

    if (!userState || cart.length === 0) {
        return ctx.answerCbQuery("Xatolik yuz berdi!", { show_alert: true });
    }

    let paymentMethod = "";
    if (ctx.callbackQuery.data === "pay_click") paymentMethod = "🟢 Click";
    if (ctx.callbackQuery.data === "pay_payme") paymentMethod = "🔵 Payme";
    if (ctx.callbackQuery.data === "pay_cash") paymentMethod = "💵 Naqd";

    userState.data.payment = paymentMethod;
    ctx.answerCbQuery();

    let adminText = `🚨 ASSORTI FOOD: YANGI BUYURTMA! 🚨\n`;
    adminText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    adminText += `👤 Mijoz: ${userState.data.name}\n`;
    adminText += `📞 Telefon: ${userState.data.phone}\n`;
    adminText += `🚖 Tur: ${userState.data.delivery}\n`;
    adminText += `💳 To'lov: ${userState.data.payment}\n`;
    adminText += `🆔 ID: ${userId}\n`;
    if (ctx.from.username) {
        adminText += `🌐 Telegram: @${ctx.from.username}\n`;
    }
    adminText += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    adminText += `📦 Taomlar ro'yxati:\n`;

    let total = 0;
    cart.forEach((item, index) => {
        adminText += `${index + 1}. ${item.name} — ${item.price.toLocaleString('uz-UZ')} so'm\n`;
        total += item.price;
    });

    adminText += `\n💰 Umumiy summa: ${total.toLocaleString('uz-UZ')} so'm\n`;
    adminText += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (userState.data.location) {
        const lat = userState.data.location.latitude;
        const lon = userState.data.location.longitude;
        adminText += `📍 Kuryer uchun xarita (Aniq manzil):\nhttps://maps.google.com/?q=${lat},${lon}`;
    }

    try {
        const msg = await ctx.telegram.sendMessage(ADMIN_ID, adminText, { disable_web_page_preview: false });
        
        if (userState.data.location) {
            await ctx.telegram.sendLocation(ADMIN_ID, userState.data.location.latitude, userState.data.location.longitude, {
                reply_to_message_id: msg.message_id
            });
        }
        
        userCarts[userId] = []; 
        delete userSteps[userId];

        await ctx.editMessageText(`🎉 Rahmat! Buyurtmangiz muvaffaqiyatli qabul qilindi.\n\nOperatorlarimiz va kuryerlarimiz tez orada siz bilan bog'lanishadi.`);
        await ctx.reply("Asosiy menyuga qaytdingiz:", mainKeyboard);
    } catch (err) {
        console.error("Adminga yuborishda xatolik:", err);
        ctx.reply("⚠️ Xatolik yuz berdi. Iltimos, admin avval botga kirib /start bosganini tekshiring!", mainKeyboard);
    }
});

bot.command('stat', async (ctx) => {
    if (ctx.from.id.toString() === ADMIN_ID.toString()) {
        const total = registeredUsers.size;
        ctx.reply(`📊 Botdagi jami faol a'zolar: ${total} ta`);
    }
});

const PORT = process.env.PORT || 10000;
const URL = process.env.RENDER_EXTERNAL_URL; 

app.use(bot.webhookCallback('/bot'));

app.get('/', (req, res) => res.send('Assorti Food bot ishlayapti!'));

app.listen(PORT, async () => {
    console.log(`Server ${PORT} portida ishga tushdi.`);
    if (URL) {
        try {
            await bot.telegram.setWebhook(`${URL}/bot`);
            console.log('Webhook muvaffaqiyatli o\'rnatildi!');
        } catch (err) {
            console.error('Webhook o\'rnatishda xatolik:', err);
        }
    }
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));