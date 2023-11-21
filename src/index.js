const TelegramBot = require("node-telegram-bot-api");
const cheerio = require("cheerio");
const axios = require("axios");
const ISO6391 = require("iso-639-1");
const { Translate } = require("@google-cloud/translate").v2;
const credentials = require("../poetic-flight-405808-95fa349046b0.json");

require("dotenv").config();

const JOKES_URL = process.env.JOKES_URL;
const TOKEN = process.env.TOKEN;
let userLanguageCode = process.env.DEFAULT_LANG;

const bot = new TelegramBot(TOKEN, { polling: true });
const translate = new Translate({ credentials });

const headers = {
  Accept: "text/html",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-US,en;q=0.5",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) Gecko/20100101 Firefox/105.0",
};

// List of valid commands
const validCommands = [/\/start/, /\/help/, /set language .+/, /^\d+$/];

// Function to extract jokes from HTML using Cheerio
const extractJokes = ($) => {
  const jokes = [];

  $(".m-detail--body ol li").each((index, elem) => {
    const joke = $(elem);
    jokes.push(joke.text());
  });

  return jokes;
};

// Function to fetch jokes from the specified URL
const fetchJokes = async () => {
  try {
    const response = await axios.get(JOKES_URL, { headers });
    const html = response.data;
    const $ = cheerio.load(html);

    return extractJokes($);
  } catch (error) {
    console.error("Error fetching jokes:", error);
    return [];
  }
};

// Function to translate text using Google Cloud Translate
const translateText = async (text, targetLang) => {
  let translation = await translate.translate(text, targetLang);
  return translation[0];
};

/* Function to handle a user's joke request by fetching jokes, validating the requested joke number,
 * translating the joke and sending the translated joke
 * as a Telegram message */
const handleJokeRequest = async (msg, jokeNumber) => {
  let jokes = [];
  try {
    jokes = await fetchJokes();

    // Validate the joke number
    if (jokeNumber < 1 || jokeNumber > 101) {
      bot.sendMessage(
        msg.chat.id,
        "Please enter a valid number between 1 and 101"
      );
      return;
    }

    // Get the requested joke and translate it
    const joke = jokes[jokeNumber - 1];
    if (joke) {
      const translatedJoke = await translateText(joke, userLanguageCode);
      bot.sendMessage(msg.chat.id, `${jokeNumber}. ${translatedJoke}`);
    } else {
      bot.sendMessage(
        msg.chat.id,
        "Could not fetch your joke. Please try again"
      );
    }
  } catch (error) {
    console.error("Error", error);
    bot.sendMessage(msg.chat.id, "Error translating joke. Please try again");
  } finally {
    jokes.length = 0;
  }
};

// Command to set the user's preferred language
bot.onText(/set language (.+)/, async (msg, match) => {
  try {
    const language = match[1].toLowerCase();
    const isoCode = ISO6391.getCode(language);
    if (isoCode) {
      userLanguageCode = isoCode;
      const langChangeResponse = await translateText(
        "No Problem",
        userLanguageCode
      );
      bot.sendMessage(msg.chat.id, langChangeResponse);
    } else {
      bot.sendMessage(
        msg.chat.id,
        "Unsupported language. Please choose a valid language"
      );
    }
  } catch (error) {
    console.error("Error:", error);
    bot.sendMessage(msg.chat.id, "An error occurred. Please try again");
  }
});

// Command to handle numeric inputs (joke requests)
bot.onText(/^\d+$/, async (msg) => {
  const jokeNumber = parseInt(msg.text);
  await handleJokeRequest(msg, jokeNumber);
});

// Command to handle the /start command
bot.onText(/\/start/, async (msg) => {
  userLanguageCode = process.env.DEFAULT_LANG;
  const startMessage = `
  Welcome to ChuckBot!
    
  To set your language, use:  set language <Your Language>
  To get a joke, enter a number between 1 and 101:  <Joke Number>
  To restart, type:  /start
  To get help, type:  /help
      
  The default language is **English**. Enjoy the laughs!
  `;
  bot.sendMessage(msg.chat.id, startMessage);
});

// Command to display help and remind users of valid commands
bot.onText(/\/help/, (msg) => {
  const helpMessage = `
    ChuckBot Commands:
    
    set language <Your Language> - set your language 
    <Joke Number> - to get a joke (number between 1 and 101)
    /start - restart the bot 
    /help - view this help message
  `;
  bot.sendMessage(msg.chat.id, helpMessage);
});

// Catch-all callback for unsupported commands
bot.onText(/(.+)/, (msg) => {
  const isCommand = validCommands.some((command) => command.test(msg.text));

  if (!isCommand) {
    bot.sendMessage(
      msg.chat.id,
      "Sorry, I didn't understand that command. Please use one of the supported commands."
    );
  }
});
