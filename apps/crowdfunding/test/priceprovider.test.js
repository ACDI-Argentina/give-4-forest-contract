const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { newDao, newApp } = require('../scripts/dao')
const { newCrowdfunding } = require('./helpers/crowdfunding')

const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')
const BN = require('bn.js');

const ExchangeRateProvider = artifacts.require('ExchangeRateProvider');
const PriceProviderMock = artifacts.require('./mocks/PriceProviderMock')

const BNEquals = (bn1, bn2) => assert.ok(bn1.eq(bn2));
const BNEqualsNumber = (bn1, n2) => assert.ok(bn1.eq(new BN(n2)));

const RBTC = "0x0000000000000000000000000000000000000000";

contract('PriceProvider', (accounts) => {
    let crowdfundingBase, crowdfunding;
    let vaultBase, vault;
    let exchangeRateProvider, priceProviderMock;
    const deployer = accounts[0];
    before(async () => {
        crowdfundingBase = await newCrowdfunding(deployer);
        vaultBase = await Vault.new({ from: deployer });

    })

    beforeEach(async () => {
        try {
            // Deploy de la DAO
            const { dao, acl } = await newDao(deployer);

            // Deploy de contratos y proxies
            const crowdfundingAddress = await newApp(dao, "crowdfunding", crowdfundingBase.address, deployer);
            const vaultAddress = await newApp(dao, "vault", vaultBase.address, deployer);
            crowdfunding = await Crowdfunding.at(crowdfundingAddress);
            vault = await Vault.at(vaultAddress);
            // Inicialización
            await vault.initialize()
            await crowdfunding.initialize(vault.address);

            //Inicializacion de price provider
            priceProviderMock = await PriceProviderMock.new("13050400000000000000000");
            exchangeRateProvider = await ExchangeRateProvider.new(priceProviderMock.address);
            await crowdfunding.setExchangeRateProvider(exchangeRateProvider.address);

        } catch (err) {
            console.log(err);
        }
    });



    context('Prices', function () {

        it('canary (get btc price)', async () => {
            const btcPrice = await exchangeRateProvider.getBTCPriceFromMoC();
            BNEqualsNumber(btcPrice, "13050400000000000000000");
        })

        it('get rbtc rate from Crowdfunding', async () => {
            const btcPrice = await crowdfunding._getExchangeRate(RBTC);
            BNEqualsNumber(btcPrice, "766260038006");
        })


    })
})
