// HIDE PUNNYCODE VERSION WARNING
process.env.NODE_OPTIONS = '--no-deprecation --no-warnings';

const { connect, keyStores, KeyPair } = require("near-api-js");
const { readFileSync, writeFileSync } = require("fs");
const moment = require("moment");
const prompts = require("prompts");
const crypto = require("crypto");
const dotenv = require('dotenv');
const { execSync } = require('child_process');
dotenv.config();

const TelegramBot = require("node-telegram-bot-api");

// LOAD ENV
const token = process.env.TELEGRAM_BOT_TOKEN;
const userId = process.env.TELEGRAM_USER_ID;

// INIT TELEGRAM BOT
const bot = new TelegramBot(token);

// CREATE DELAY IN MILLISECONDS
const delay = (timeInMinutes) => {
    return new Promise((resolve) => {
        return setTimeout(resolve, timeInMinutes * 60 * 1000);
    });
}

// HEADER
const header = `
\x1b[33mAUTO TRANSACTION BOT FOR HOT MINING BY\x1b[0m

\x1b[31m _______  _______  _______  ___ ___  _______  _______  ___ ___  _______  _______  _______ 
|   _   ||   _   \\|   _   ||   Y   ||   _   ||       ||   Y   ||   _   ||   Y   ||   _   |
|.  1   ||.  l   /|.  |   ||.      ||.  |   ||.|   | ||.  1   ||.  1___||.  |   ||   1___|
\x1b[37m|.  ____||.  _   1|.  |   ||. \\_/  ||.  |   |\\-|.  |-'|.  _   ||.  __)_ |.  |   ||____   |
|:  |    |:  |   ||:  1   ||:  1   ||:  1   |  |:  |  |:  |   ||:  1   ||:  1   ||:  1   |
|::.|    |::.|:. ||::.. . ||::.|:. ||::.. . |  |::.|  |::.|:. ||::.. . ||::.. . ||::.. . |
\`---'    \`--- ---'\`-------' \`--- ---'\`-------'  \`---'  \`--- ---'\`-------\`-------\`-------'

\x1b[36mRecoded by Mr. Promotheus - (origin: by Mnuralim)\x1b[0m
\x1b[36mTreat me es teh: \x1b[34m0x72b58b99cd197db013c110b5643fb64008c0a209\x1b[0m
\x1b[32mNot a professional coder!\x1b[0m
`;

console.clear(); // Membersihkan konsol sebelum menampilkan header
console.log(header);

(async () => {
    // CHOOSE DELAY
    const chooseDelay = await prompts({
        type: 'select',
        name: 'time',
        message: 'Select time for each claim',
        choices: [
            { title: '4 hours', value: (4 * 60) },
            { title: '6 hours', value: (6 * 60) },
            { title: '8 hours', value: (8 * 60) },
            { title: '12 hours', value: (12 * 60) },
        ],
    });

    // USE TELEGRAM BOT CONFIRMATION
    const botConfirm = await prompts({
        type: 'confirm',
        name: 'useTelegramBot',
        message: 'Use Telegram Bot as Notification?',
    });

    // IMPORT LIST ACCOUNT
    const listAccounts = readFileSync("./private.txt", "utf-8")
        .split("\n")
        .map((a) => a.trim())
        .filter((a) => !!a); // Filter out any empty lines

    // CLAIMING PROCESS
    while (true) {
        for (const [index, value] of listAccounts.entries()) {
            const [PRIVATE_KEY, ACCOUNT_ID] = value.split("|");

            try {
                const myKeyStore = new keyStores.InMemoryKeyStore();
                const keyPair = KeyPair.fromString(PRIVATE_KEY);
                await myKeyStore.setKey("mainnet", ACCOUNT_ID, keyPair);

                const connection = await connect({
                    networkId: "mainnet",
                    nodeUrl: "https://rpc.mainnet.near.org",
                    keyStore: myKeyStore,
                });

                const wallet = await connection.account(ACCOUNT_ID);

                console.log(
                    `[${moment().format("HH:mm:ss")}] Claiming ${ACCOUNT_ID}`
                );

                // CALL CONTRACT AND GET THE TX HASH
                const callContract = await wallet.functionCall({
                    contractId: "game.hot.tg",
                    methodName: "claim",
                    args: {},
                });

                const transactionHash = callContract.transaction.hash;
                const logs = callContract.receipts_outcome
                    .map(outcome => outcome.outcome.logs)
                    .flat();

                let userAmount = null;
                let villageAmount = null;

                logs.forEach(log => {
                    if (log.includes("EVENT_JSON")) {
                        const eventJson = JSON.parse(log.split("EVENT_JSON:")[1]);
                        if (eventJson.event === "ft_mint") {
                            eventJson.data.forEach(data => {
                                if (data.owner_id === ACCOUNT_ID) {
                                    userAmount = data.amount;
                                } else if (data.owner_id.includes("village")) {
                                    villageAmount = data.amount;
                                }
                            });
                        }
                    }
                });

                const formatAmount = (amount) => {
                    return (parseInt(amount, 10) / 1e6).toFixed(6);
                };

                const formattedUserAmount = userAmount ? formatAmount(userAmount) : "0.000000";
                const formattedVillageAmount = villageAmount ? formatAmount(villageAmount) : "0.000000";

                // Call NEAR view to get HOT balance
                const viewCommand = `near view game.hot.tg ft_balance_of '{"account_id": "${ACCOUNT_ID}"}' --networkId mainnet`;
                const hotBalanceRaw = execSync(viewCommand).toString().trim();
                const hotBalance = (parseInt(hotBalanceRaw, 10) / 1e6).toFixed(6); // Convert to readable format

                console.log(`Claim Berhasil!`);
                console.log(`Akun: ${ACCOUNT_ID}`);
                console.log(`Jumlah: ${formattedUserAmount} HOT (for user)`);
                console.log(`Jumlah: ${formattedVillageAmount} HOT (for village)`);
                console.log(`Balance: ${hotBalance} HOT`); // Print HOT balance in formatted manner
                console.log(`Tx: https://nearblocks.io/id/txns/${transactionHash}`);
                console.log("====");

                // SEND NOTIFICATION BOT
                if (botConfirm.useTelegramBot) {
                    try {
                        await bot.sendMessage(
                            userId,
                            `*Claimed HOT* for ${ACCOUNT_ID} 🔥\n\n*Amount*:\n- ${formattedUserAmount} HOT (for user)\n- ${formattedVillageAmount} HOT (for village)\n- HOT Balance: ${hotBalance} HOT\n\n*Tx*: https://nearblocks.io/id/txns/${transactionHash}`,
                            { disable_web_page_preview: true, parse_mode: 'Markdown' }
                        );
                    } catch (error) {
                        console.log(`Send message failed, ${error}`)
                    }
                }
            } catch (error) {
                console.error(`Error processing ${ACCOUNT_ID}: ${error}`);
            }
        }

        // REDUCE REAL MINUTES WITH RANDOM
        const randomMinutes = crypto.randomInt(1, 9);
        const delayMinutes = chooseDelay.time - randomMinutes;

        console.log(`[ NEXT CLAIM IN ${moment().add(delayMinutes, 'minutes').format("HH:mm:ss")} ]`);
        await delay(delayMinutes);
    }

})();
