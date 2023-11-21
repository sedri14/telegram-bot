const TelegramBot = require("node-telegram-bot-api");
const cheerio = require("cheerio");
const { ZenRows } = require("zenrows");
const ISO6391 = require("iso-639-1");
const { Translate } = require("@google-cloud/translate").v2;
const credentials = require("../poetic-flight-405808-95fa349046b0.json");

require("dotenv").config();

const JOKES_URL = "https://parade.com/968666/parade/chuck-norris-jokes/";
const TOKEN = process.env.TOKEN;

const bot = new TelegramBot(TOKEN, { polling: true });
const translate = new Translate({ credentials });

let jokes = [];
let userLanguageCode = process.env.DEFAULT_LANG;

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

const translateText = async (text, targetLang) => {
  let translation = await translate.translate(text, targetLang);
  return translation[0];
};

bot.onText(/set language (.+)/, async (msg, match) => {
  try {
    const language = match[1].toLowerCase();
    const isoCode = ISO6391.getCode(language);
    if (isoCode) {
      userLanguageCode = isoCode;
      const noProblem = await translateText("No Problem", userLanguageCode);
      bot.sendMessage(msg.chat.id, noProblem);
    } else {
      bot.sendMessage(
        msg.chat.id,
        "Unsupported language. Please choose a valid language."
      );
    }
  } catch (error) {
    console.error("Error:", error);
    bot.sendMessage(msg.chat.id, "An error occurred. Please try again.");
  }
});

//todo: check for 2 types of errors.
bot.onText(/^\d+$/, async (msg) => {
  let jokeNumber = "";
  try {
    jokes = await fetchJokes();
    jokeNumber = parseInt(msg.text, 10);

    if (jokeNumber < 1 || jokeNumber > 101) {
      bot.sendMessage(
        msg.chat.id,
        "Please enter a valid number between 1 and 101"
      );
      return;
    }

    if (jokes && jokes.length > 0) {
      const originalJoke = jokes[jokeNumber - 1];
      const translatedJoke = await translateText(
        originalJoke,
        userLanguageCode
      );
      bot.sendMessage(msg.chat.id, `${jokeNumber}. ${translatedJoke}`);
    } else {
      bot.sendMessage(msg.chat.id, "Could not fetch jokes. Please try again.");
    }
  } catch (error) {
    console.error("Error", error);
    bot.sendMessage(msg.chat.id, "Error");
  }

  jokes.length = 0;
});

bot.onText(/\/start/, async (msg) => {
  userLanguageCode = process.env.DEFAULT_LANG;

  bot.sendMessage(
    msg.chat.id,
    `Welcome to ChuckBot!
    
To set your language, use: "set language <Your Language>"
To get a joke, enter a number between 1 and 101: "<Joke Number>"
    
The default language is English. Enjoy the laughs!`
  );
});
