import telebot
from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
import os
import json

# ==================== SECURITY & CONFIG ====================
TOKEN = '8829073330:AAFo0HTqTZfE2xi9LIp1FxiBkiM4lljfdGE'
  # توکن ربات شما
bot = telebot.TeleBot(TOKEN, parse_mode="Markdown")

ADMIN_CHAT_ID = 110475977  # آیدی عددی ادمین

USDT_WALLET = "TD7uPTT2Tba71YdYV7MAcBBpS5X2fPAn68"
ADMIN_USERNAME = "@ayhan0200"

# --- نام فروشگاه و شعار قدرتمند ---
STORE_NAME = "Pivot Indicator Store"
STORE_SLOGAN = "⚡️ *We are powerful, innovative, and moving forward with unstoppable power!* 🚀"

# --- وضعیت فروشگاه (True = باز / False = بسته) ---
STORE_IS_OPEN = True 

# فایل ذخیره لیست انتظار کاربران
WAITING_USER_FILE = "waiting_users.json"
# ===========================================================

# ==================== JSON DATABASE HELPERS ====================
def load_waiting_users():
    if not os.path.exists(WAITING_USER_FILE):
        return []
    try:
        with open(WAITING_USER_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def save_waiting_user(chat_id):
    users = load_waiting_users()
    if chat_id not in users:
        users.append(chat_id)
        with open(WAITING_USER_FILE, 'w') as f:
            json.dump(users, f)

def clear_waiting_users():
    if os.path.exists(WAITING_USER_FILE):
        os.remove(WAITING_USER_FILE)
# =================================================================

# ==================== STORE CATEGORIES & PRODUCTS ====================
CATEGORIES = {
    "paid_inds": "💎 Premium Indicators (Paid)",
    "free_inds": "🎁 Free Indicators (Gifts)"
}

PRODUCTS = {
    "ind_1": {
        "name": "Pivot Signals - 3 TF",
        "price": "50",
        "type": "paid",
        "category": "paid_inds",
        "status": "active",
        "desc": "⚡️ Professional 3-Timeframe Pivot Line Indicator (No Repaint).\nIdeal for Crypto, Forex, and Gold across all timeframes."
    },
    "ind_2": {
        "name": "KST Pro",
        "price": "80",
        "type": "paid",
        "category": "paid_inds",
        "status": "active",
        "desc": "🔥 Ultimate high-frequency tool for crypto and forex scalping."
    },
    "ind_3": {
        "name": "GoldSignals ayrimi",
        "price": "0",
        "type": "free",
        "category": "free_inds",
        "status": "active",
        "desc": "🎁 Free high-accuracy indicator combining RSI and MAs for precise gold & forex buy/sell signals."
    },
    "ind_4": {
        "name": "Pivot Hunter OB",
        "price": "40",
        "type": "paid",
        "category": "paid_inds",
        "status": "active",
        "desc": "🌟 Ultimate professional-grade indicator for identifying key order blocks and high-probability breakouts, seamlessly integrated with multi-indicator confirmation systems."
    }
}
# =================================================================

def get_main_menu_markup():
    markup = InlineKeyboardMarkup()
    for cat_key, cat_name in CATEGORIES.items():
        markup.add(InlineKeyboardButton(f"📁 {cat_name}", callback_data=f"cat_{cat_key}"))
    
    markup.add(InlineKeyboardButton("🤝 Affiliate Program", callback_data="affiliate_program"))
    markup.add(InlineKeyboardButton("📞 Customer Support / Contact Admin", callback_data="support"))
    return markup

def send_closed_store_banner(chat_id, message_id=None):
    text = (
        "🌙 *We are taking a short break to recharge!* ☕️\n\n"
        f"Our store ({STORE_NAME}) is temporarily resting. We are working hard behind the scenes and will be back shortly.\n\n"
        f"{STORE_SLOGAN}\n\n"
        "🔔 *Want to be the first to know?*\n"
        "Click the button below to get notified instantly as soon as we reopen!"
    )
    markup = InlineKeyboardMarkup()
    markup.add(InlineKeyboardButton("🔔 Notify Me When Open", callback_data="notify_me"))
    markup.add(InlineKeyboardButton("📞 Contact Support", callback_data="support"))

    if message_id:
        try:
            bot.edit_message_text(text, chat_id=chat_id, message_id=message_id, reply_markup=markup)
            return
        except:
            pass
    bot.send_message(chat_id, text, reply_markup=markup)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    if not STORE_IS_OPEN:
        send_closed_store_banner(message.chat.id)
        return

    welcome_text = (
        f"🌟 *Welcome to {STORE_NAME}!* 🚀\n\n"
        f"{STORE_SLOGAN}\n\n"
        "📁 Please select a category from the store below:"
    )
    bot.send_message(message.chat.id, welcome_text, reply_markup=get_main_menu_markup())

@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    data = call.data

    if data == "notify_me":
        save_waiting_user(call.message.chat.id)
        bot.answer_callback_query(
            call.id, 
            "✅ You're on the list! We will notify you the moment our store reopens. 🚀", 
            show_alert=True
        )
        return

    if data.startswith("cat_"):
        cat_key = data.split("_", 1)[1]
        cat_name = CATEGORIES.get(cat_key, "Products")
        
        bot.answer_callback_query(call.id)
        markup = InlineKeyboardMarkup()
        
        has_product = False
        for key, prod in PRODUCTS.items():
            if prod.get('category') == cat_key:
                has_product = True
                if prod['status'] == 'coming_soon':
                    btn_text = f"🔒 {prod['name']} [ Coming Soon ]"
                elif prod['type'] == 'free':
                    btn_text = f"🎁 {prod['name']} [ FREE ]"
                else:
                    btn_text = f"💎 {prod['name']} — 💰 ${prod['price']} USDT"
                
                markup.add(InlineKeyboardButton(btn_text, callback_data=f"info_{key}"))
        
        if not has_product:
            markup.add(InlineKeyboardButton("⏳ No products in this category yet!", callback_data="none"))
            
        markup.add(InlineKeyboardButton("🔙 Back to Main Categories", callback_data="back_to_menu"))
        
        text = (
            f"📁 *Category:* `{cat_name}`\n"
            f"{STORE_SLOGAN}\n\n"
            "🛒 Please choose a product from the list below:"
        )
        
        try:
            bot.edit_message_text(text, chat_id=call.message.chat.id, message_id=call.message.message_id, reply_markup=markup)
        except:
            bot.send_message(call.message.chat.id, text, reply_markup=markup)
        return

    if data == "affiliate_program":
        bot.answer_callback_query(call.id)
        affiliate_text = (
            f"🤝 *AFFILIATE PROGRAM* | {STORE_NAME}\n\n"
            f"{STORE_SLOGAN}\n\n"
            "Have a trading community, Telegram channel, or network in Forex and Crypto?\n\n"
            "Partner with us and earn USDT commissions by referring customers to our TradingView indicators. No upfront investment or registration fee required.\n\n"
            "━━━━━━━━━━━━━━━━━━━\n"
            "💡 *Why Partner With Us?*\n\n"
            "• 💵 *20% Commission per Eligible Sale:* Products start at $30, earning you at least $6+ per basic sale.\n"
            "• ⚡ *Fast Payouts:* Processed within 1–2 business days after verification.\n"
            "• 🛠 *Product Support:* We handle delivery, setup guidance, and technical support.\n\n"
            "━━━━━━━━━━━━━━━━━━━\n"
            "📌 *How It Works*\n\n"
            "1. Apply to join our affiliate program.\n"
            "2. Receive your unique referral code from the admin.\n"
            "3. Share our products with your audience.\n"
            "4. Ask customers to provide your referral code before payment.\n\n"
            "━━━━━━━━━━━━━━━━━━━\n"
            "💳 *Payout Rules*\n\n"
            "• *Payment Method:* USDT via TRON (TRC20).\n"
            "• *Minimum Payout:* 30 USDT.\n"
            "• *Processing Time:* 1–2 business days.\n\n"
            "━━━━━━━━━━━━━━━━━━━\n"
            "🎯 *Ready to Apply?*\n\n"
            f"Send the following details to admin ({ADMIN_USERNAME}):\n"
            "1. Full Name / Alias\n"
            "2. Telegram Username\n"
            "3. Telegram User ID\n"
            "4. USDT Wallet Address (TRC20)"
        )
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Back to Store", callback_data="back_to_menu"))

        try:
            bot.delete_message(call.message.chat.id, call.message.message_id)
        except:
            pass
        bot.send_message(call.message.chat.id, affiliate_text, reply_markup=markup)
        return

    if data == "support":
        bot.answer_callback_query(call.id)
        bot.send_message(
            call.message.chat.id, 
            f"📞 For support, payment verification, or questions, contact admin:\n👉 {ADMIN_USERNAME}"
        )
        return

    if not STORE_IS_OPEN:
        bot.answer_callback_query(call.id, "⚠️ Store is currently resting!", show_alert=True)
        send_closed_store_banner(call.message.chat.id, call.message.message_id)
        return

    if data == "back_to_menu":
        bot.answer_callback_query(call.id)
        welcome_text = (
            f"🌟 *Welcome to {STORE_NAME}!* 🚀\n\n"
            f"{STORE_SLOGAN}\n\n"
            "📁 Please select a category from the store below:"
        )
        try:
            bot.delete_message(call.message.chat.id, call.message.message_id)
        except:
            pass
        bot.send_message(call.message.chat.id, welcome_text, reply_markup=get_main_menu_markup())
        return

    if data.startswith("info_"):
        prod_key = data.split("_", 1)[1]
        prod = PRODUCTS.get(prod_key)
        if not prod:
            bot.answer_callback_query(call.id, "Error: Product not found!", show_alert=True)
            return

        if prod['status'] == 'coming_soon':
            bot.answer_callback_query(call.id, "⏳ This product is coming soon!", show_alert=True)
            return

        bot.answer_callback_query(call.id)
        cat_key = prod.get('category', 'paid_inds')
        
        markup = InlineKeyboardMarkup()
        if prod['type'] == 'free':
            markup.add(InlineKeyboardButton("📥 Get Free Source Code", callback_data=f"getfree_{prod_key}"))
        else:
            markup.add(InlineKeyboardButton("💳 Instant Checkout / Payment Info", callback_data=f"buy_{prod_key}"))
        
        markup.add(InlineKeyboardButton("🔙 Back to Category", callback_data=f"cat_{cat_key}"))

        kind_text = "🎁 FREE" if prod['type'] == 'free' else f"💎 Paid: {prod['price']} USDT"
        
        text = (
            f"🛒 *Product:* {prod['name']}\n"
            f"-----------------------------------\n"
            f"📝 *Description:*\n{prod['desc']}\n\n"
            f"💵 *Price:* {kind_text}\n"
            f"🌐 *Network:* TRC20\n"
            f"-----------------------------------\n"
            f"👇 *Choose an option below:*"
        )
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        photo_path = None
        for file in os.listdir(base_dir):
            file_lower = file.lower()
            if file_lower.startswith(prod_key) and (".png" in file_lower or ".jpg" in file_lower or ".jpeg" in file_lower):
                photo_path = os.path.join(base_dir, file)
                break
        
        try:
            bot.delete_message(call.message.chat.id, call.message.message_id)
        except:
            pass

        if photo_path and os.path.exists(photo_path):
            try:
                with open(photo_path, 'rb') as photo:
                    bot.send_photo(
                        chat_id=call.message.chat.id,
                        photo=photo,
                        caption=text,
                        reply_markup=markup
                    )
            except Exception as e:
                print(f"❌ Photo error: {e}")
                bot.send_message(call.message.chat.id, text, reply_markup=markup)
        else:
            bot.send_message(call.message.chat.id, text, reply_markup=markup)

    elif data.startswith("buy_"):
        prod_key = data.split("_", 1)[1]
        prod = PRODUCTS.get(prod_key)
        if not prod:
            return
        
        bot.answer_callback_query(call.id)
        text = (
            f"🛒 *Order Invoice:* {prod['name']}\n"
            f"-----------------------------------\n"
            f"💳 *Amount to Pay:* {prod['price']} USDT (TRC20 Network)\n\n"
            f"🌐 *Official USDT Wallet Address:*\n`{USDT_WALLET}`\n\n"
            f"📌 *Next Steps:*\n"
            f"Transfer the exact amount, then send the payment receipt along with your *TradingView Username* to admin ({ADMIN_USERNAME}) to receive your file."
        )
        
        markup = InlineKeyboardMarkup()
        markup.add(InlineKeyboardButton("🔙 Back to Product", callback_data=f"info_{prod_key}"))
        
        try:
            bot.edit_message_caption(
                chat_id=call.message.chat.id,
                message_id=call.message.message_id,
                caption=text,
                reply_markup=markup
            )
        except Exception:
            try:
                bot.edit_message_text(
                    chat_id=call.message.chat.id,
                    message_id=call.message.message_id,
                    text=text,
                    reply_markup=markup
                )
            except Exception as e:
                bot.send_message(call.message.chat.id, text, reply_markup=markup)

    elif data.startswith("getfree_"):
        prod_key = data.split("_", 1)[1]
        prod = PRODUCTS.get(prod_key)
        if not prod or prod['type'] != 'free':
            return
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = None
        for file in os.listdir(base_dir):
            if prod_key in file.lower() and file.lower().endswith(('.pine', '.txt')):
                file_path = os.path.join(base_dir, file)
                break
        
        if file_path and os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                bot.send_document(
                    call.message.chat.id,
                    f,
                    caption=f"🎁 *Free Source Code File for:* {prod['name']}"
                )
        else:
            bot.answer_callback_query(call.id, "Error: Code file not found!", show_alert=True)

# ==================== ADMIN COMMANDS ====================
@bot.message_handler(commands=['close'])
def close_store(message):
    global STORE_IS_OPEN
    if message.chat.id != int(ADMIN_CHAT_ID):
        bot.send_message(message.chat.id, "❌ Unauthorized access.")
        return

    STORE_IS_OPEN = False
    bot.send_message(
        message.chat.id, 
        "🌙 *Store Status Update*\nResting mode has been successfully activated."
    )

@bot.message_handler(commands=['open'])
def open_store(message):
    global STORE_IS_OPEN
    if message.chat.id != int(ADMIN_CHAT_ID):
        bot.send_message(message.chat.id, "❌ Unauthorized access.")
        return

    STORE_IS_OPEN = True
    waiting_users = load_waiting_users()
    success_count = 0
    
    for chat_id in waiting_users:
        try:
            bot.send_message(
                chat_id,
                f"🎉 *We are back online!* 🚀\n\nOur store ({STORE_NAME}) is now open. Press /start to explore!"
            )
            success_count += 1
        except Exception as e:
            print(f"Could not notify user {chat_id}: {e}")
    
    clear_waiting_users()
    bot.send_message(message.chat.id, f"🟢 Store is OPEN! Notified *{success_count}* users.")

@bot.message_handler(commands=['sendfile'])
def send_script_file(message):
    if message.chat.id != int(ADMIN_CHAT_ID):
        bot.send_message(message.chat.id, "❌ Unauthorized access.")
        return

    args = message.text.split()
    if len(args) < 2:
        keys_list = "\n".join([f"🔹 `/sendfile {k}` ({v['name']})" for k, v in PRODUCTS.items()])
        bot.send_message(message.chat.id, f"⚠️ Please specify the product key:\n\n{keys_list}")
        return

    prod_key = args[1]
    prod = PRODUCTS.get(prod_key)
    if not prod:
        bot.send_message(message.chat.id, "❌ Error: Product key not found.")
        return

    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = None
    
    for file in os.listdir(base_dir):
        if prod_key in file.lower() and file.lower().endswith(('.pine', '.txt')):
            file_path = os.path.join(base_dir, file)
            break
    
    if not file_path:
        default_path = os.path.join(base_dir, "file.txt")
        if os.path.exists(default_path):
            file_path = default_path

    if file_path and os.path.exists(file_path):
        with open(file_path, 'rb') as f:
            bot.send_document(message.chat.id, f, caption=f"🔒 *Secure Source Code File for:* {prod['name']}")
    else:
        bot.send_message(message.chat.id, f"❌ Error: Source code file for '{prod_key}' was not found!")

print(f"{STORE_NAME} bot is running...")
bot.infinity_polling(skip_pending=True)