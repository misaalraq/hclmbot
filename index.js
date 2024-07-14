try {
    // Memanggil NEAR view untuk mendapatkan saldo HOT
    const viewCommand = `near view game.hot.tg ft_balance_of '{"account_id": "${ACCOUNT_ID}"}' --networkId mainnet`;
    const hotBalanceRaw = execSync(viewCommand).toString().trim();
    
    // Mem-parsing saldo dari output mentah
    const hotBalance = parseFloat(hotBalanceRaw);

    if (isNaN(hotBalance)) {
        console.log(`Error: Tidak dapat mem-parsing saldo dari ${hotBalanceRaw}`);
    } else {
        console.log(`Saldo: ${hotBalance.toFixed(6)} HOT`);
    }
} catch (error) {
    console.error(`Error: ${error}`);
}
