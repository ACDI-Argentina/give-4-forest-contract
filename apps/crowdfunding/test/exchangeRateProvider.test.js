const { newDao, newApp } = require('../scripts/dao')
const { newCrowdfunding } = require('./helpers/crowdfunding')
const { createPermission, grantPermission } = require('../scripts/permissions')

const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')
const BN = require('bn.js');

const ExchangeRateProvider = artifacts.require('ExchangeRateProvider');
const MoCStateMock = artifacts.require('./mocks/MoCStateMock')

const BNEqualsNumber = (bn1, n2) => assert.ok(bn1.eq(new BN(n2)));

const RBTC = "0x0000000000000000000000000000000000000000";
const randomAddr = "0xD059764e0B0C949001bF19F9cd06eA7D9e4090D7";

contract('ExchangeRateProvider', (accounts) => {
    let crowdfundingBase, crowdfunding;
    let vaultBase, vault;
    let exchangeRateProvider, moCStateMock;
    const deployer = accounts[0];
    const giver = accounts[1];
    let SET_EXCHANGE_RATE_PROVIDER;

    before(async () => {
        crowdfundingBase = await newCrowdfunding(deployer);
        vaultBase = await Vault.new({ from: deployer });
        SET_EXCHANGE_RATE_PROVIDER = await crowdfundingBase.SET_EXCHANGE_RATE_PROVIDER();
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
            await createPermission(acl, deployer, crowdfunding.address, SET_EXCHANGE_RATE_PROVIDER, deployer);
            
            moCStateMock = await MoCStateMock.new(5200000);
            exchangeRateProvider = await ExchangeRateProvider.new(moCStateMock.address);
            await crowdfunding.setExchangeRateProvider(exchangeRateProvider.address);

        } catch (err) {
            console.log(err);
        }
    });



    context('Token Prices', function () {

        it('get RBTC exchange rate from Crowdfunding', async () => {
            const exrProviderAddr = await crowdfunding.exchangeRateProvider();
            const exrProvider = await ExchangeRateProvider.at(exrProviderAddr);
            
            const exchangeRate = await exrProvider.getExchangeRate(RBTC);
            BNEqualsNumber(exchangeRate, 10000000000000000 / 5200000);
        })

        it('get not existent token exchange rate from Crowdfunding', async () => {
            const exrProviderAddr = await crowdfunding.exchangeRateProvider();
            const exrProvider = await ExchangeRateProvider.at(exrProviderAddr);
            const exchangeRate = await exrProvider.getExchangeRate(randomAddr);
            
            BNEqualsNumber(exchangeRate, 0);
        })

    })
})
