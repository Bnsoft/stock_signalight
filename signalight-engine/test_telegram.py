"""
Signalight — Telegram Connection Helper
Run this after creating your bot and sending a message to it.
"""

import os
import asyncio
from dotenv import load_dotenv
from telegram import Bot

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def main():
    if not TOKEN or "your_bot_token" in TOKEN:
        print("\n❌ Error: Please set your TELEGRAM_BOT_TOKEN in signalight-engine/.env first!")
        return

    bot = Bot(token=TOKEN)
    
    print("\n🔍 Fetching your Chat ID...")
    try:
        async with bot:
            updates = await bot.get_updates()
            if not updates:
                print("\n⚠️ No messages found!")
                print("1. Open your bot in Telegram.")
                print("2. Click 'START' or send any message to it.")
                print("3. Run this script again.")
                return

            # Get the most recent chat ID
            last_chat_id = updates[-1].message.chat_id
            user_name = updates[-1].message.from_user.first_name
            
            print(f"\n✅ Found you, {user_name}!")
            print(f"📌 Your Chat ID is: {last_chat_id}")
            print("\n🚀 Sending a test signal alert...")
            
            test_msg = (
                "🚨 <b>Signalight Test Connection</b>\n"
                "──────────────────────\n"
                "Your Telegram bot is now connected to Signalight!\n"
                "When a stock signal is detected, you will see it here.\n"
                "──────────────────────\n"
                "✅ <b>Setup Complete</b>"
            )
            
            await bot.send_message(chat_id=last_chat_id, text=test_msg, parse_mode="HTML")
            print("📬 Test message sent! Check your Telegram.")
            
            print(f"\n👉 Now, set TELEGRAM_CHAT_ID={last_chat_id} in your .env file.")

    except Exception as e:
        print(f"\n❌ Failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
