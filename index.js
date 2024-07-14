const { connect, keyStores, KeyPair } = require("near-api-js");
const { readFileSync } = require("fs");
const moment = require("moment");
const crypto = require("crypto");
const dotenv = require('dotenv');
dotenv.config();

const TelegramBot = require("node-telegram-bot-api");

// LOAD ENV
const token = process.env.TELEGRAM_BOT_TOKEN;
const userId = process.env.TELEGRAM_USER_ID;

// INIT TELEGRAM BOT
const bot = new TelegramBot(token);

// Function to read private.txt and extract privateKey and accountId
const readAccountIDs = (filePath) => {
    try {
        const data = readFileSync(filePath, 'utf8');
        const lines = data.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        const accountIDs = lines.map(line => {
            const [privateKey, accountId] = line.split('|');
            return { privateKey, accountId };
        });

        return accountIDs;
    } catch (err) {
        console.error('Error reading private.txt:', err);
        return [];
    }
};

// Function to create delay in milliseconds
const delay = (timeInMinutes) => {
    return new Promise((resolve) => {
        setTimeout(resolve, timeInMinutes * 60 * 1000);
    });
};

// Function to get HOT balance
const getHotBalance = async (accountId, wallet) => {
    try {
        const balance = await wallet.viewFunction('game.hot.tg', 'ft_balance_of', { account_id: accountId });
        return balance;
    } catch (error) {
        console.error(`Error getting balance for ${accountId}: ${error}`);
        throw error;
    }
};

// Function to claim and check balance for each account ID
const claimAndCheckBalance = async () => {
    const accountIDs = readAccountIDs('./private.txt');

    for (const { privateKey, accountId } of accountIDs) {
        try {
            const myKeyStore = new keyStores.InMemoryKeyStore();
            const keyPair = KeyPair.fromString(privateKey);
            await myKeyStore.setKey('mainnet', accountId, keyPair);

            const connection = await connect({
                networkId: 'mainnet',
                nodeUrl: 'https://rpc.mainnet.near.org',
                keyStore: myKeyStore,
            });

            const wallet = await connection.account(accountId);

            console.log(`[${moment().format("HH:mm:ss")}] Claiming ${accountId}`);

            // Example of claiming process
            const callContract = await wallet.functionCall({
                contractId: 'game.hot.tg',
                methodName: 'claim',
                args: {},
            });

            const transactionHash = callContract.transaction.hash;
            console.log(`Claim Berhasil!`);

            // Get HOT balance after claiming
            const hotBalance = await getHotBalance(accountId, wallet);
            console.log(`Akun: ${accountId}`);
            console.log(`Balance HOT: ${hotBalance}`);
            console.log(`Tx: https://nearblocks.io/id/txns/${transactionHash}`);
            console.log("====");

            // Send notification via Telegram
            try {
                await bot.sendMessage(
                    userId,
                    `*Claimed HOT* for ${accountId} 🔥\n\n*Amount*:\n- ${hotBalance} HOT\n\n*Tx*: https://nearblocks.io/id/txns/${transactionHash}`,
                    { disable_web_page_preview: true, parse_mode: 'Markdown' }
                );
            } catch (error) {
                console.error(`Failed to send Telegram notification: ${error}`);
            }

        } catch (error) {
            console.error(`Error processing ${accountId}: ${error}`);
        }
    }
};

// Main function to initiate claim and balance checking loop
const main = async () => {
    console.log("Starting HOT claiming and balance checking process...");
    while (true) {
        await claimAndCheckBalance();
        const randomMinutes = crypto.randomInt(1, 9);
        const delayMinutes = 60 * randomMinutes; // Adjust delay as needed
        console.log(`[ NEXT CLAIM IN ${moment().add(delayMinutes, 'minutes').format("HH:mm:ss")} ]`);
        await delay(delayMinutes);
    }
};

// Start the main process
main().catch(err => console.error('Main process error:', err));
