import { Bot, InlineKeyboard } from "grammy";
import * as dotenv from "dotenv";
dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN!);
const APP_URL = process.env.APP_URL!;

const getReply = (username: string) => {
  return `Hey @${username}! Click the button below to launch FlappyBird 🚀`;
};

const bot_init = async () => {
  bot.api.setMyCommands([
    { command: "start", description: "Launch FlappyBird" },
  ]);

  bot.command("start", async (ctx) => {
    try {
      const menuMarkup = new InlineKeyboard().webApp(
        "Launch FlappyBird",
        APP_URL
      );

      await ctx.reply(getReply(ctx.from?.username || ""), {
        reply_markup: menuMarkup,
      });
    } catch (error) {
      console.error("Error in start command:", error);
    }
  });

  bot.on("message", async (ctx) => {
    try {
      const menuMarkup = new InlineKeyboard().webApp(
        "Launch FlappyBird",
        APP_URL
      );
      await ctx.reply(getReply(ctx.from?.username || ""), {
        reply_markup: menuMarkup,
      });
    } catch (error) {
      console.error("Error in message handler:", error);
    }
  });

  try {
    bot.start();
  } catch (error) {
    console.error("Error starting bot:", error);
  }
};

bot_init();
