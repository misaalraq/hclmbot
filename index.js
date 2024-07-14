// HIDE PUNNYCODE VERSION WARNING
process.env.NODE_OPTIONS = '--no-deprecation --no-warnings';

const { connect, keyStores, KeyPair } = require("near-api-js");
const { readFileSync } = require("fs");
const dotenv = require('dotenv');
dotenv.config();

(async () => {
    try {
        // Load environment variables
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const userId = process.env.TELEGRAM_USER_ID;

        // Load accounts from private.txt
        const listAccounts = readFileSync("./private.txt", "utf-8")
            .split("\n")
            .map((a) => a.trim())
            .filter((a) => !!a); // Filter out any empty lines

        // Initialize NEAR connection
        const connection = await connect({
            networkId: "mainnet", // Adjust this if using a different network
            nodeUrl: "https://rpc.mainnet.near.org",
            deps: {
                keyStore: new keyStores.InMemoryKeyStore(),
            },
        });

        // Process each account
        for (const account of listAccounts) {
            const [PRIVATE_KEY, ACCOUNT_ID] = account.split("|").map((item) => item.trim());

            try {
                // Set up key pair and key store
                const myKeyStore = new keyStores.InMemoryKeyStore();
                const keyPair = KeyPair.fromString(PRIVATE_KEY);
                await myKeyStore.setKey("mainnet", ACCOUNT_ID, keyPair);

                // Get wallet instance
                const wallet = await connection.account(ACCOUNT_ID);

                // Prepare argument as a JSON string
                const argsJson = JSON.stringify({ account_id: ACCOUNT_ID });

                // Get HOT balance
                const hotBalance = await wallet.viewFunction(
                    "game.hot.tg",
                    "ft_balance_of",
                    argsJson
                );

                console.log(`HOT Balance for ${ACCOUNT_ID}: ${hotBalance} HOT`);

            } catch (error) {
                console.error(`Error processing ${ACCOUNT_ID}: ${error}`);
            }
        }

    } catch (error) {
        console.error(`General error: ${error}`);
    }
})();
