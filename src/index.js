const TelegramBot = require("node-telegram-bot-api");
const cheerio = require("cheerio");
const { ZenRows } = require("zenrows");
const ISO6391 = require('iso-639-1');
require("dotenv").config();

const JOKES_URL = "https://parade.com/968666/parade/chuck-norris-jokes/";
const TOKEN = process.env.TOKEN;

const bot = new TelegramBot(TOKEN, { polling: true });

let jokes = [];
let userLanguage = 'en';

const fetchJokes = async () => {
  const client = new ZenRows(process.env.ZENROWS_API_KEY);

  try {
    const response = await client.get(JOKES_URL, {});
    const html = response.data;
    const $ = cheerio.load(html);
    const jokes = [];

    $(".m-detail--body ol li").each((index, elem) => {
      const joke = $(elem);
      jokes.push(joke.text());
    });
    return jokes;
  } catch (error) {
    console.error("Error fetching jokes:", error);
    return [];
  }
};

bot.onText(/set language (.+)/, (msg, match) => {
  try {
    const language = match[1].toLowerCase();
    const isoCode = ISO6391.getCode(language);
    if (isoCode) {
      userLanguage = isoCode
    } else {
      console.log('Language not found.');
      bot.sendMessage(msg.chat.id, 'Unsupported language. Please choose a valid language.');
    }
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
  }
});

// //this will be a bot.on of the joke number
// bot.on("message", async (msg) => {
//   const chatId = msg.chat.id;

//   try {
//     jokes = await fetchJokes();
//   } catch (error) {
//     console.error("Error initializing jokes:", error.message);
//   }

//   const theJoke = jokes[1];
//   bot.sendMessage(chatId, theJoke);
//   jokes.length = 0;
// });
