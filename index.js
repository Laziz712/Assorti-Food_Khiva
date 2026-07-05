require('dotenv').config({ path: 'mongo.env' });
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const express = require('express');

console.log("Tekshiruv: MONGO_URI qiymati ->", process.env.MONGO_URI);

if (!process.env.MONGO_URI) {
    console.error("XATO: mongo.env fayli ichidagi MONGO_URI topilmadi!");
    process.exit(1);
}

const dbURI = process.env.MONGO_URI;

async function connectDB() {
    try {
        console.log("Ulanish harakati boshlandi...");
        await mongoose.connect(dbURI, {
            serverSelectionTimeoutMS: 5000 
        });
        console.log('MongoDB muvaffaqiyatli ulandi!');
    } catch (err) {
        console.error('Ulanish xatosi:', err.message);
    }
}

connectDB();

const BOT_TOKEN = process.env.BOT_TOKEN || "8854792431:AAEqBTYvlzWiwebccUHT41qC92yOtDuGkNE"; 
const ADMIN_ID = process.env.ADMIN_ID || "8584049635"; 
const CLICK_TOKEN = process.env.CLICK_TOKEN || "398062629:TEST:999999999_F91D8F69C042267444B74CC0B3C747757EB0E065";
const PAYME_TOKEN = process.env.PAYME_TOKEN || "371317599:TEST:1781100758907"; 

if (!BOT_TOKEN) {
    console.error("Xatolik: BOT_TOKEN topilmadi!");
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const app = express();

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
    userCarts[userId] = [];
    delete userSteps[userId];
    ctx.reply(`✨ Assorti Food Khiva botiga xush kelibsiz!\n\n👇 Quyidagi menyudan kerakli bo'limni tanlang:`, mainKeyboard);
});

bot.hears("🍔 Menyu", async (ctx) => {
    delete userSteps[ctx.from.id];
    await ctx.reply("✨ Assorti Food chiroyli menyusi yuklanmoqda...");
    const promises = Object.keys(products).map(key => {
        const item = products[key];
        return ctx.replyWithPhoto(item.image, {
            caption: `✨ ${item.name}\n\n💰 Narxi: ${item.price.toLocaleString('uz-UZ')} so'm`,
            reply_markup: { inline_keyboard: [[{ text: "📥 Savatga qo'shish", callback_data: `add_${key}` }]] }
        }).catch(err => console.error(err));
    });
    await Promise.all(promises);
});

bot.hears("🛒 Savat", (ctx) => {
    delete userSteps[ctx.from.id];
    const userId = ctx.from.id;
    const cart = userCarts[userId] || [];
    if (cart.length === 0) return ctx.reply("🛒 Sizning savatingiz bo'sh!");
    
    let text = "🛒 Sizning savatingiz:\n\n";
    let total = 0;
    cart.forEach((item, index) => {
        text += `${index + 1}. ${item.name} — ${item.price.toLocaleString('uz-UZ')} so'm\n`;
        total += item.price;
    });
    text += `\n💰 Jami hisob: ${total.toLocaleString('uz-UZ')} so'm`;
    
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
    await ctx.reply(`📍 Assorti Food Khiva lokatsiyasi:\n\n🗺 Quyidagi xarita orqali manzilimizni topishingiz mumkin:`);
    await ctx.replyWithLocation(41.397776, 60.3598305);
});

bot.hears("📞 Admin bilan aloqa", (ctx) => {
    delete userSteps[ctx.from.id]; 
    ctx.reply(`📞 Admin bilan aloqa\n\n 👨‍💻 Admin: @lazizshavkatov712\n ☎️ Telefon: +998972815050`);
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

    if (text === "🍔 Menyu" || text === "🛒 Savat" || text === "📍 Bizning Manzil" || text === "📞 Admin bilan aloqa") return; 
    if (!userState) return ctx.reply("Iltimos, quyidagi menyudan foydalaning:", mainKeyboard);

    if (userState.step === "WAITING_NAME") {
        userState.data.name = text;
        userState.step = "WAITING_PHONE";
        return ctx.reply("📞 2-bosqich. Telefon raqamingizni kiriting yoki pastdagi tugmani bosing:", {
            reply_markup: {
                keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }]],
                resize_keyboard: true, one_time_keyboard: true
            }
        });
    }

    if (userState.step === "WAITING_PHONE") {
        userState.data.phone = text.trim().replace('+', '');
        return goToDeliveryStep(ctx, userState);
    }

    if (userState.step === "WAITING_LOCATION") {
        userState.data.locationType = "text";
        userState.data.locationData = text; 
        return goToPaymentStep(ctx, userState, "5-bosqich"); 
    }
});

bot.on("contact", (ctx) => {
    const userId = ctx.from.id;
    const userState = userSteps[userId];
    if (userState && userState.step === "WAITING_PHONE") {
        let phone = ctx.message.contact.phone_number;
        userState.data.phone = phone.replace('+', '');
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
    if (!userState) return ctx.reply("Xatolik yuz berdi, /start bosing.");
    ctx.answerCbQuery();

    if (ctx.callbackQuery.data === "del_delivery") {
        userState.data.delivery = "🛵 Dostavka";
        userState.step = "WAITING_LOCATION";
        ctx.reply("📍 4-bosqich. Yetkazib berish manzilini pastdagi tugma orqali GPS lokatsiya qilib yuboring yoki shu yerga matn shaklida ko'cha va uy raqamini yozing:", {
            reply_markup: {
                keyboard: [[{ text: "📍 Lokatsiyani yuborish (GPS)", request_location: true }]],
                resize_keyboard: true, one_time_keyboard: true
            }
        });
    } else {
        userState.data.delivery = "🏃‍♂️ O'zim olib ketaman";
        userState.data.locationType = "none";
        goToPaymentStep(ctx, userState, "4-bosqich");
    }
});

bot.command('get_location', (ctx) => {
    ctx.reply(
        "📍 *Yetkazib berish manzilini aniqlaymiz.*\n\n" +
        "Iltimos, pastdagi 'Joylashuvni yuborish' tugmasini bosing. " +
        "_(Agar marker noto'g'ri bo'lsa, xaritani qo'lingiz bilan surib, uyingiz binosini aniq belgilang)_", 
        {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [{ text: "📍 Joylashuvni yuborish", request_location: true }],
                    [{ text: "✍️ Manzilni qo'lda yozish" }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        }
    );
});

bot.on('location', async (ctx) => {
    const userId = ctx.from.id;
    const userState = userSteps[userId];
    
    if (userState && userState.step === "WAITING_LOCATION") {
        userState.data.locationType = "gps";
        userState.data.locationData = {
            latitude: ctx.message.location.latitude,
            longitude: ctx.message.location.longitude
        };
        return goToPaymentStep(ctx, userState, "5-bosqich");
    }
});

function goToPaymentStep(ctx, userState, stepNumber) {
    userState.step = "WAITING_PAYMENT";
    ctx.reply(`💳 ${stepNumber}. To'lov turini tanlang:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🟢 Click (Karta)", callback_data: "pay_click" }, { text: "🔵 Payme (Karta)", callback_data: "pay_payme" }],
                [{ text: "💵 Naqd pul", callback_data: "pay_cash" }]
            ]
        }
    });
}

bot.action(["pay_click", "pay_payme", "pay_cash"], async (ctx) => {
    const userId = ctx.from.id;
    const userState = userSteps[userId];
    const cart = userCarts[userId] || [];

    if (!userState || cart.length === 0) return ctx.answerCbQuery("Xatolik!");
    ctx.answerCbQuery();

    let total = 0;
    const pricesList = cart.map(item => {
        total += item.price;
        return { label: item.name, amount: Math.round(item.price * 100) }; 
    });

    if (ctx.callbackQuery.data === "pay_cash") {
        userState.data.payment = "💵 Naqd";
        try { await ctx.deleteMessage(ctx.callbackQuery.message.message_id); } catch (e) {}
        return sendOrderToAdmin(ctx, userState, cart, total);
    }

    let providerToken = ctx.callbackQuery.data === "pay_click" ? CLICK_TOKEN : PAYME_TOKEN;
    userState.data.payment = ctx.callbackQuery.data === "pay_click" ? "🟢 Click" : "🔵 Payme";

    if (!providerToken || providerToken.includes("PASTGA")) {
        return ctx.reply("⚠️ Bu to'lov tizimi ulanmagan. Iltimos Naqd pulni tanlang.");
    }

    try {
        await ctx.deleteMessage(ctx.callbackQuery.message.message_id);
        
        await ctx.replyWithInvoice({
            title: "Assorti Food Buyurtma",
            description: `${userState.data.name} uchun taomlar buyurtmasi`,
            payload: JSON.stringify({ userId: userId }), 
            provider_token: providerToken,
            currency: "UZS",
            prices: pricesList,
            start_parameter: "assorti-food-order"
        });
    } catch (err) {
        console.error("Invoice xatosi:", err);
        ctx.reply("⚠️ To'lov tizimida cheklov bor. Iltimos, Naqd pulni tanlang.");
    }
});

bot.on("pre_checkout_query", (ctx) => {
    ctx.answerPreCheckoutQuery(true);
});

bot.on("successful_payment", async (ctx) => {
    const userId = ctx.from.id;
    const userState = userSteps[userId];
    const cart = userCarts[userId] || [];
    
    if (userState) {
        userState.data.payment += " ✅ (To'landi)";
        let total = ctx.message.successful_payment.total_amount / 100;
        try { await ctx.deleteMessage(ctx.message.message_id); } catch (e) {}
        await sendOrderToAdmin(ctx, userState, cart, total);
    }
});

async function sendOrderToAdmin(ctx, userState, cart, total) {
    const userId = ctx.from.id;
    let adminText = `🚨 ASSORTI FOOD: YANGI BUYURTMA! 🚨\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    adminText += `👤 Mijoz: ${userState.data.name}\n📞 Telefon: +${userState.data.phone}\n🚖 Tur: ${userState.data.delivery}\n💳 To'lov: ${userState.data.payment}\n🆔 ID: ${userId}\n\n📦 Taomlar:\n`;

    cart.forEach((item, index) => {
        adminText += `${index + 1}. ${item.name} — ${item.price.toLocaleString('uz-UZ')} so'm\n`;
    });
    adminText += `\n💰 Umumiy summa: ${total.toLocaleString('uz-UZ')} so'm\n━━━━━━━━━━━━━━━━━━━━━━\n`;

    if (userState.data.locationType === "text") {
        adminText += `\n📍 Kiritilgan Manzil (Qo'lda yozilgan):\n📝 ${userState.data.locationData}`;
    } else if (userState.data.locationType === "gps") {
        const lat = userState.data.locationData.latitude;
        const lon = userState.data.locationData.longitude;
        adminText += `\n📍 Kuryer uchun Google Xarita:\nhttps://www.google.com/maps/search/?api=1&query=${lat},${lon}\n`;
        adminText += `\n📍 Yandeks Navigator:\nhttps://yandex.ru/maps/?ll=${lon},${lat}&z=17&l=map&pt=${lon},${lat},pm2rdm`;
    }

    try {
        const msg = await ctx.telegram.sendMessage(ADMIN_ID, adminText);
        
        if (userState.data.locationType === "gps") {
            await ctx.telegram.sendLocation(ADMIN_ID, userState.data.locationData.latitude, userState.data.locationData.longitude, { 
                reply_to_message_id: msg.message_id,
                live_period: 900 
            });
        }
        
        userCarts[userId] = []; 
        delete userSteps[userId];
        
        await ctx.reply(`🎉 Rahmat! Buyurtmangiz muvaffaqiyatli qabul qilindi.\n\nOperatorlarimiz va kuryerlarimiz tez orada siz bilan bog'lanishadi.\n\n🔙 Siz asosiy menyuga qaytdingiz.`, mainKeyboard);
    } catch (err) {
        console.error(err);
    }
}

const PORT = process.env.PORT || 10000;
app.use(bot.webhookCallback('/bot'));
app.get('/', (req, res) => res.send('Bot ishlayapti!'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));