const { connect, keyStores, KeyPair } = require("near-api-js");
const { readFileSync } = require("fs");
const dotenv = require('dotenv');
dotenv.config();

// LOAD ENV
const token = process.env.TELEGRAM_BOT_TOKEN;
const userId = process.env.TELEGRAM_USER_ID;

// INIT TELEGRAM BOT
const bot = new TelegramBot(token);

(async () => {
    try {
        // IMPORT LIST ACCOUNT
        const listAccounts = readFileSync("./private.txt", "utf-8")
            .split("\n")
            .map((a) => a.trim())
            .filter((a) => !!a); // Filter out any empty lines

        // Loop through accounts
        for (const value of listAccounts) {
            const [PRIVATE_KEY, ACCOUNT_ID] = value.split("|");

            const myKeyStore = new keyStores.InMemoryKeyStore();
            const keyPair = KeyPair.fromString(PRIVATE_KEY);
            await myKeyStore.setKey("mainnet", ACCOUNT_ID, keyPair);

            const connection = await connect({
                networkId: "mainnet",
                nodeUrl: "https://rpc.mainnet.near.org",
                keyStore: myKeyStore,
            });

            const wallet = await connection.account(ACCOUNT_ID);

            // Get HOT balance for ACCOUNT_ID
            const hotBalance = await wallet.viewFunction(
                "game.hot.tg",
                "ft_balance_of",
                { account_id: ACCOUNT_ID }
            );

            const formattedHotBalance = (parseInt(hotBalance, 10) / 1e6).toFixed(6);

            console.log(`Account: ${ACCOUNT_ID}`);
            console.log(`HOT Balance: ${formattedHotBalance} HOT`);
        }
    } catch (error) {
        console.error(`Error getting HOT balance: ${error}`);
    }
})();
