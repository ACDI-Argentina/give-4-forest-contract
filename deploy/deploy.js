const arg = require("arg");

const args = arg({ '--network': String }, process.argv);
const network = args["--network"] || "rskRegtest";

const { newDao, newApp } = require('../scripts/dao')
const { createPermission, grantPermission } = require('../scripts/permissions')
const BN = require('bn.js');

const Kernel = artifacts.require('@aragon/os/build/contracts/kernel/Kernel')
const ACL = artifacts.require('@aragon/os/build/contracts/acl/ACL')
const Admin = artifacts.require('Admin')
const MoCStateMock = artifacts.require('MoCStateMock');
const RoCStateMock = artifacts.require('RoCStateMock');
const DocTokenMock = artifacts.require('DocTokenMock');
const RifTokenMock = artifacts.require('RifTokenMock');
const ExchangeRateProvider = artifacts.require('ExchangeRateProvider');
const Crowdfunding = artifacts.require('Crowdfunding')
const ArrayLib = artifacts.require('ArrayLib')
const EntityLib = artifacts.require('EntityLib')
const DacLib = artifacts.require('DacLib')
const CampaignLib = artifacts.require('CampaignLib')
const MilestoneLib = artifacts.require('MilestoneLib')
const ActivityLib = artifacts.require('ActivityLib')
const DonationLib = artifacts.require('DonationLib')
const Vault = artifacts.require('Vault')


const { linkLib,
    ARRAY_LIB_PLACEHOLDER,
    ENTITY_LIB_PLACEHOLDER,
    DAC_LIB_PLACEHOLDER,
    CAMPAIGN_LIB_PLACEHOLDER,
    MILESTONE_LIB_PLACEHOLDER,
    ACTIVITY_LIB_PLACEHOLDER,
    DONATION_LIB_PLACEHOLDER } = require('../scripts/libs')

    function sleep() {
        if (network === "rskTestnet") {
            // 1 minuto
            return new Promise(resolve => setTimeout(resolve, 60000));
        } else if (network === "rskMainnet") {
            // 5 minuto
            return new Promise(resolve => setTimeout(resolve, 300000));
        }
        return new Promise(resolve => setTimeout(resolve, 1));
    }

module.exports = async ({ getNamedAccounts, deployments }) => {

    const VERSION = '1';
    const CHAIN_ID = await getChainId();
    const RBTC = '0x0000000000000000000000000000000000000000';

    const { log } = deployments;
    const { deployer, account1, account2, account3, account4, account5 } = await getNamedAccounts();

    console.log(`${new Date().toISOString()}`);
    console.log(`Network: ${CHAIN_ID} ${network}.`);

    // ------------------------------------------------
    // Aragon DAO
    // ------------------------------------------------

    log(``);
    log(`Aragon DAO`);
    log(`-------------------------------------`);

    let dao;
    let acl;
    if (process.env.DAO_CONTRACT_ADDRESS) {
        // Se especificó la dirección de la DAO, por lo que no es creada.
        dao = await Kernel.at(process.env.DAO_CONTRACT_ADDRESS);
        acl = await ACL.at(await dao.acl());
    } else {
        // No se especificó DAO, por lo que es desplegada una nueva.
        log(` Deploy Aragon DAO.`);
        // Deploy de la DAO
        const response = await newDao(deployer);
        dao = response.dao;
        acl = response.acl;
        await sleep();
    }

    log(` - DAO: ${dao.address}`);
    log(` - ACL: ${acl.address}`);

    // ------------------------------------------------
    // Aragon DAO
    // ------------------------------------------------

    // ------------------------------------------------
    // Admin Contract
    // ------------------------------------------------

    log(``);
    log(`Admin Contract`);
    log(`-------------------------------------`);

    let adminApp;
    if (process.env.ADMIN_CONTRACT_ADDRESS) {
        // Se especificó la dirección del Admin, por lo que no es creado.
        const adminApp = await Admin.at(process.env.ADMIN_CONTRACT_ADDRESS);
        log(` - Admin: ${adminApp.address}`);
    } else {
        // No se especificó el Admin, por lo que es desplegado uno nuevo.
        log(` Deploy Admin`);
        const adminBase = await Admin.new({ from: deployer });
        log(` - Admin Base: ${adminBase.address}`);
        await sleep();
        const adminAppAddress = await newApp(dao, 'admin', adminBase.address, deployer);
        adminApp = await Admin.at(adminAppAddress);
        log(` - Admin: ${adminApp.address}`);
        await sleep();

        // Perimisos de Administración
        log(` Permisos`);
        let CREATE_PERMISSIONS_ROLE = await acl.CREATE_PERMISSIONS_ROLE();
        log(` - CREATE_PERMISSIONS_ROLE`);
        await grantPermission(acl, adminApp.address, acl.address, CREATE_PERMISSIONS_ROLE, deployer);
        log(`   - User: ${deployer}`);
        await sleep();

        await adminApp.initialize(adminApp.address, account1);
        log(` - Admin initialized`);
        await sleep();
    }

    // ------------------------------------------------
    // Admin Contract
    // ------------------------------------------------

    // ------------------------------------------------
    // Exchange Rate Provider Contract
    // ------------------------------------------------

    log(``);
    log(`Exchange Rate Provider Contract`);
    log(`-------------------------------------`);

    let exchangeRateProvider;
    if (process.env.EXCHANGE_RATE_PROVIDER_CONTRACT_ADDRESS) {
        // Se especificó la dirección del Exchange Rate Provider, por lo que no es creado.
        exchangeRateProvider = await ExchangeRateProvider.at(process.env.EXCHANGE_RATE_PROVIDER_CONTRACT_ADDRESS);
    } else {

        let rifAddress;
        let docAddress;
        let DOC_PRICE = new BN('00001000000000000000000'); // Precio del DOC: 1,00 US$
        if (network === "rskRegtest") {
    
            log(` Deploy token mocks`);
    
            let rifTokenMock = await RifTokenMock.new({ from: deployer });
            rifAddress = rifTokenMock.address;
    
            let docTokenMock = await DocTokenMock.new({ from: deployer });
            docAddress = docTokenMock.address;
    
        } else if (network === "rskTestnet") {
    
            rifAddress = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe';
            docAddress = '0xCB46c0ddc60D18eFEB0E586C17Af6ea36452Dae0';
    
        } else if (network === "rskMainnet") {
    
            rifAddress = '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5';
            docAddress = '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db';
        }
    
        log(` - Rif Token: ${rifAddress}`);
        log(` - Doc Token: ${docAddress}`);
    
        // Exchange Rate
    
        let moCStateAddress;
        let roCStateAddress;
    
        if (network === "rskRegtest") {
            log(` Deploy state mocks`);
            const RBTC_PRICE = new BN('58172000000000000000000'); // Precio del RBTC: 58172,00 US$
            const moCStateMock = await MoCStateMock.new(RBTC_PRICE, { from: deployer });
            moCStateAddress = moCStateMock.address;
            const RIF_PRICE = new BN('00000391974000000000000'); // Precio del RIF: 0,391974 US$
            const roCStateMock = await RoCStateMock.new(RIF_PRICE, { from: deployer });
            roCStateAddress = roCStateMock.address;
        } else if (network === "rskTestnet") {
            // MoCState de MOC Oracles en Testnet 
            moCStateAddress = "0x0adb40132cB0ffcEf6ED81c26A1881e214100555";
            // RoCState de MOC Oracles en Testnet 
            roCStateAddress = "0x496eD67F77D044C8d9471fe86085Ccb5DC4d2f63";
        } else if (network === "rskMainnet") {
            // MoCState de MOC Oracles en Mainnet 
            moCStateAddress = "0xb9C42EFc8ec54490a37cA91c423F7285Fa01e257";
            // RoCState de MOC Oracles en Mainnet 
            roCStateAddress = "0x541F68a796Fe5ae3A381d2Aa5a50b975632e40A6";
        }
    
        log(` - MoC State: ${moCStateAddress}`);
        log(` - RoC State: ${roCStateAddress}`);

        // No se especificó la dirección del Exchange Rate Provider, por lo que es creado.
        log(` Deploy Exchange Rate Provider.`);
        exchangeRateProvider = await ExchangeRateProvider.new(
            moCStateAddress,
            roCStateAddress,
            rifAddress,
            docAddress,
            DOC_PRICE,
            { from: deployer });
        await sleep();
    }

    log(` - Exchange Rate Provider: ${exchangeRateProvider.address}`);

    // ------------------------------------------------
    // Exchange Rate Provider Contract
    // ------------------------------------------------

    // ------------------------------------------------
    // Crowdfunding Contract
    // ------------------------------------------------

    log(``);
    log(`Crowdfunding Contract`);
    log(`-------------------------------------`);

    log(` Deploy Libraries`);

    // Link Crowdfunding > ArrayLib
    const arrayLib = await ArrayLib.new({ from: deployer });
    await linkLib(arrayLib, Crowdfunding, ARRAY_LIB_PLACEHOLDER);
    log(`  - Array Lib: ${arrayLib.address}`);
    await sleep();

    // Link Crowdfunding > EntityLib
    const entityLib = await EntityLib.new({ from: deployer });
    await linkLib(entityLib, Crowdfunding, ENTITY_LIB_PLACEHOLDER);
    log(`  - Entity Lib: ${entityLib.address}`);
    await sleep();

    // Link Crowdfunding > DacLib
    const dacLib = await DacLib.new({ from: deployer });
    await linkLib(dacLib, Crowdfunding, DAC_LIB_PLACEHOLDER);
    log(`  - Dac Lib: ${dacLib.address}`);
    await sleep();

    // Link Crowdfunding > CampaignLib
    const campaignLib = await CampaignLib.new({ from: deployer });
    await linkLib(campaignLib, Crowdfunding, CAMPAIGN_LIB_PLACEHOLDER);
    log(`  - Campaign Lib: ${campaignLib.address}`);
    await sleep();

    // Link Crowdfunding > MilestoneLib
    const milestoneLib = await MilestoneLib.new({ from: deployer });
    await linkLib(milestoneLib, Crowdfunding, MILESTONE_LIB_PLACEHOLDER);
    log(`  - Milestone Lib: ${milestoneLib.address}`);
    await sleep();

    // Link Crowdfunding > ActivityLib
    const activityLib = await ActivityLib.new({ from: deployer });
    await linkLib(activityLib, Crowdfunding, ACTIVITY_LIB_PLACEHOLDER);
    log(`  - Activity Lib: ${activityLib.address}`);
    await sleep();

    // Link Crowdfunding > DonationLib
    const donationLib = await DonationLib.new({ from: deployer });
    await linkLib(donationLib, Crowdfunding, DONATION_LIB_PLACEHOLDER);
    log(`  - Donation Lib: ${donationLib.address}`);
    await sleep();

    log(` Deploy Crowdfunding`);

    const crowdfundingBase = await Crowdfunding.new({ from: deployer });
    log(`  - Crowdfunding Base: ${crowdfundingBase.address}`);
    await sleep();

    const crowdfundingAppAddress = await newApp(dao, 'crowdfunding', crowdfundingBase.address, deployer);
    const crowdfundingApp = await Crowdfunding.at(crowdfundingAppAddress);
    log(`  - Crowdfunding: ${crowdfundingApp.address}`);
    await sleep();

    // ------------------------------------------------
    // Crowdfunding Contract
    // ------------------------------------------------

    // ------------------------------------------------
    // Vault Contract
    // ------------------------------------------------

    log(``);
    log(`Vault Contract`);
    log(`-------------------------------------`);

    log(` Deploy Vault`);

    const vaultBase = await Vault.new({ from: deployer });
    log(`  - Vault Base: ${vaultBase.address}`);
    await sleep();

    const vaultAppAddress = await newApp(dao, 'crowdfundingVault', vaultBase.address, deployer);
    const vaultApp = await Vault.at(vaultAppAddress);
    log(`  - Vault: ${vaultApp.address}`);
    await sleep();

    // ------------------------------------------------
    // Vault Contract
    // ------------------------------------------------

    // ------------------------------------------------
    // Permisos
    // ------------------------------------------------

    log(``);
    log(`Permisos`);
    log(`-------------------------------------`);
    
    let SET_EXCHANGE_RATE_PROVIDER_ROLE = await crowdfundingBase.SET_EXCHANGE_RATE_PROVIDER_ROLE();
    let ENABLE_TOKEN_ROLE = await crowdfundingBase.ENABLE_TOKEN_ROLE();
    let TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE();

    log(` - SET_EXCHANGE_RATE_PROVIDER_ROLE`);
    await createPermission(acl, deployer, crowdfundingApp.address, SET_EXCHANGE_RATE_PROVIDER_ROLE, deployer);
    log(`   - User: ${deployer}`);
    await sleep();

    log(` - ENABLE_TOKEN_ROLE`);
    await createPermission(acl, deployer, crowdfundingApp.address, ENABLE_TOKEN_ROLE, deployer);
    log(`   - User: ${deployer}`);
    await sleep();

    log(` - TRANSFER_ROLE`);
    await createPermission(acl, crowdfundingApp.address, vaultApp.address, TRANSFER_ROLE, deployer);
    log(`   - Contract: ${crowdfundingApp.address}`);
    await sleep();

    // ------------------------------------------------
    // Permisos
    // ------------------------------------------------

    // ------------------------------------------------
    // Inicialización
    // ------------------------------------------------

    log(``);
    log(`Inicialización`);
    log(`-------------------------------------`);

    await vaultApp.initialize();
    log(` - Vault initialized`);
    await sleep();
    await crowdfundingApp.initialize(vaultApp.address);
    await sleep();
    await crowdfundingApp.setExchangeRateProvider(exchangeRateProvider.address, { from: deployer });
    await sleep();
    await crowdfundingApp.enableToken(RBTC, { from: deployer });
    await sleep();
    await crowdfundingApp.enableToken(await exchangeRateProvider.RIF(), { from: deployer });
    await sleep();
    await crowdfundingApp.enableToken(await exchangeRateProvider.DOC(), { from: deployer });
    log(` - Crowdfunding initialized`);
    await sleep();
}