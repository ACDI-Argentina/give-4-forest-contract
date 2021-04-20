const arg = require("arg");

const args = arg({ '--network': String }, process.argv);
const network = args["--network"] || "rskRegtest";

console.log(`[${new Date().toISOString()}] Deploying on ${network}...`);

const { newDao, newApp } = require('../scripts/dao')
const { createPermission, grantPermission } = require('../scripts/permissions')
const BN = require('bn.js');
const Crowdfunding = artifacts.require('Crowdfunding')
const ArrayLib = artifacts.require('ArrayLib')
const EntityLib = artifacts.require('EntityLib')
const DacLib = artifacts.require('DacLib')
const CampaignLib = artifacts.require('CampaignLib')
const MilestoneLib = artifacts.require('MilestoneLib')
const ActivityLib = artifacts.require('ActivityLib')
const DonationLib = artifacts.require('DonationLib')
const Vault = artifacts.require('Vault')

const MoCStateMock = artifacts.require('MoCStateMock');
const RoCStateMock = artifacts.require('RoCStateMock');
const DocTokenMock = artifacts.require('DocTokenMock');
const RifTokenMock = artifacts.require('RifTokenMock');
const ExchangeRateProvider = artifacts.require('ExchangeRateProvider');

const Kernel = artifacts.require('@aragon/os/build/contracts/kernel/Kernel')
const ACL = artifacts.require('@aragon/os/build/contracts/acl/ACL')

const { linkLib,
    ARRAY_LIB_PLACEHOLDER,
    ENTITY_LIB_PLACEHOLDER,
    DAC_LIB_PLACEHOLDER,
    CAMPAIGN_LIB_PLACEHOLDER,
    MILESTONE_LIB_PLACEHOLDER,
    ACTIVITY_LIB_PLACEHOLDER,
    DONATION_LIB_PLACEHOLDER } = require('../scripts/libs')

function sleep() {
    // Mainnet
    //return new Promise(resolve => setTimeout(resolve, 300000));
    return new Promise(resolve => setTimeout(resolve, 1));
}

module.exports = async ({ getNamedAccounts, deployments }) => {

    const { log } = deployments;
    const { deployer, account1, account2, account3, account4, account5 } = await getNamedAccounts();

    log(`Aragon DAO deploy`);

    // Deploy de la DAO
    const { kernelBase, aclBase, dao, acl } = await newDao(deployer);

    log(` - Kernel Base: ${kernelBase.address}`);
    log(` - ACL Base: ${aclBase.address}`);
    log(` - DAO: ${dao.address}`);
    log(` - ACL: ${acl.address}`);

    //const dao = await Kernel.at('0xd598F0116dd8c36b4E2aEcF7ac54553E93bD340A');
    //const acl = await ACL.at(await dao.acl());

    await sleep();

    log(`Crowdfunding deploy`);

    log(` - Libraries`);

    // Link Crowdfunding > ArrayLib
    const arrayLib = await ArrayLib.new({ from: deployer });
    await linkLib(arrayLib, Crowdfunding, ARRAY_LIB_PLACEHOLDER);
    log(`   - Array Lib: ${arrayLib.address}`);
    await sleep();

    // Link Crowdfunding > EntityLib
    const entityLib = await EntityLib.new({ from: deployer });
    await linkLib(entityLib, Crowdfunding, ENTITY_LIB_PLACEHOLDER);
    log(`   - Entity Lib: ${entityLib.address}`);
    await sleep();

    // Link Crowdfunding > DacLib
    const dacLib = await DacLib.new({ from: deployer });
    await linkLib(dacLib, Crowdfunding, DAC_LIB_PLACEHOLDER);
    log(`   - Dac Lib: ${dacLib.address}`);
    await sleep();

    // Link Crowdfunding > CampaignLib
    const campaignLib = await CampaignLib.new({ from: deployer });
    await linkLib(campaignLib, Crowdfunding, CAMPAIGN_LIB_PLACEHOLDER);
    log(`   - Campaign Lib: ${campaignLib.address}`);
    await sleep();

    // Link Crowdfunding > MilestoneLib
    const milestoneLib = await MilestoneLib.new({ from: deployer });
    await linkLib(milestoneLib, Crowdfunding, MILESTONE_LIB_PLACEHOLDER);
    log(`   - Milestone Lib: ${milestoneLib.address}`);
    await sleep();

    // Link Crowdfunding > ActivityLib
    const activityLib = await ActivityLib.new({ from: deployer });
    await linkLib(activityLib, Crowdfunding, ACTIVITY_LIB_PLACEHOLDER);
    log(`   - Activity Lib: ${activityLib.address}`);
    await sleep();

    // Link Crowdfunding > DonationLib
    const donationLib = await DonationLib.new({ from: deployer });
    await linkLib(donationLib, Crowdfunding, DONATION_LIB_PLACEHOLDER);
    log(`   - Donation Lib: ${donationLib.address}`);
    await sleep();

    const crowdfundingBase = await Crowdfunding.new({ from: deployer });
    log(` - Crowdfunding Base: ${crowdfundingBase.address}`);
    await sleep();

    const crowdfundingAddress = await newApp(dao, 'crowdfunding', crowdfundingBase.address, deployer);
    const crowdfunding = await Crowdfunding.at(crowdfundingAddress);
    log(` - Crowdfunding: ${crowdfunding.address}`);
    await sleep();

    const vaultBase = await Vault.new({ from: deployer });
    await sleep();
    const vaultAddress = await newApp(dao, 'vault', vaultBase.address, deployer);
    await sleep();
    const vault = await Vault.at(vaultAddress);
    await sleep();

    log(` - Vault Base: ${vaultBase.address}`);
    log(` - Vault: ${vault.address}`);

    // Configuración de grupos y permisos

    log(` - Set groups`);

    let GIVER_ROLE = await crowdfundingBase.GIVER_ROLE();
    let DELEGATE_ROLE = await crowdfundingBase.DELEGATE_ROLE();
    let CAMPAIGN_MANAGER_ROLE = await crowdfundingBase.CAMPAIGN_MANAGER_ROLE();
    let CAMPAIGN_REVIEWER_ROLE = await crowdfundingBase.CAMPAIGN_REVIEWER_ROLE();
    let MILESTONE_MANAGER_ROLE = await crowdfundingBase.MILESTONE_MANAGER_ROLE();
    let MILESTONE_REVIEWER_ROLE = await crowdfundingBase.MILESTONE_REVIEWER_ROLE();
    let RECIPIENT_ROLE = await crowdfundingBase.RECIPIENT_ROLE();
    log(`   - DELEGATE_ROLE`);
    await createPermission(acl, account1, crowdfunding.address, DELEGATE_ROLE, deployer);
    await sleep();
    log(`       - Account1: ${account1}`);
    log(`   - CAMPAIGN_MANAGER_ROLE`);
    await createPermission(acl, account2, crowdfunding.address, CAMPAIGN_MANAGER_ROLE, deployer);
    await sleep();
    log(`       - Account2: ${account2}`);
    log(`   - CAMPAIGN_REVIEWER_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, CAMPAIGN_REVIEWER_ROLE, deployer);
    await sleep();
    log(`       - Account3: ${account3}`);
    await grantPermission(acl, account4, crowdfunding.address, CAMPAIGN_REVIEWER_ROLE, deployer);
    await sleep();
    log(`       - Account4: ${account4}`);
    await grantPermission(acl, account5, crowdfunding.address, CAMPAIGN_REVIEWER_ROLE, deployer);
    await sleep();
    log(`       - Account5: ${account5}`);
    await grantPermission(acl, account1, crowdfunding.address, CAMPAIGN_REVIEWER_ROLE, deployer);
    await sleep();
    log(`       - Account1: ${account1}`);
    log(`   - MILESTONE_MANAGER_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, MILESTONE_MANAGER_ROLE, deployer);
    await sleep();
    log(`       - Account3: ${account3}`);
    log(`   - MILESTONE_REVIEWER_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, MILESTONE_REVIEWER_ROLE, deployer);
    await sleep();
    log(`       - Account3: ${account3}`);
    await grantPermission(acl, account4, crowdfunding.address, MILESTONE_REVIEWER_ROLE, deployer);
    await sleep();
    log(`       - Account4: ${account4}`);
    await grantPermission(acl, account5, crowdfunding.address, MILESTONE_REVIEWER_ROLE, deployer);
    await sleep();
    log(`       - Account5: ${account5}`);
    await grantPermission(acl, account1, crowdfunding.address, MILESTONE_REVIEWER_ROLE, deployer);
    await sleep();
    log(`       - Account1: ${account1}`);
    log(`   - RECIPIENT_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, RECIPIENT_ROLE, deployer);
    await sleep();
    log(`       - Account3: ${account3}`);
    await grantPermission(acl, account4, crowdfunding.address, RECIPIENT_ROLE, deployer);
    await sleep();
    log(`       - Account4: ${account4}`);
    await grantPermission(acl, account5, crowdfunding.address, RECIPIENT_ROLE, deployer);
    await sleep();
    log(`       - Account5: ${account5}`);
    await grantPermission(acl, account1, crowdfunding.address, RECIPIENT_ROLE, deployer);
    log(`       - Account1: ${account1}`);
    await sleep();

    log(` - Set permissions`);

    let CREATE_DAC_ROLE = await crowdfundingBase.CREATE_DAC_ROLE();
    let CREATE_CAMPAIGN_ROLE = await crowdfundingBase.CREATE_CAMPAIGN_ROLE();
    let CREATE_MILESTONE_ROLE = await crowdfundingBase.CREATE_MILESTONE_ROLE();
    let EXCHANGE_RATE_ROLE = await crowdfundingBase.EXCHANGE_RATE_ROLE();
    let SET_EXCHANGE_RATE_PROVIDER = await crowdfundingBase.SET_EXCHANGE_RATE_PROVIDER();
    let ENABLE_TOKEN_ROLE = await crowdfundingBase.ENABLE_TOKEN_ROLE();
    let TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()
    log(`   - CREATE_DAC_ROLE`);
    await createPermission(acl, account1, crowdfunding.address, CREATE_DAC_ROLE, deployer);
    await sleep();
    log(`       - Account1: ${account1}`);
    log(`   - CREATE_CAMPAIGN_ROLE`);
    await createPermission(acl, account2, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
    await sleep();
    log(`       - Account2: ${account2}`);
    await grantPermission(acl, account1, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
    await sleep();
    log(`       - Account1: ${account1}`);
    log(`   - CREATE_MILESTONE_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, CREATE_MILESTONE_ROLE, deployer);
    await sleep();
    log(`       - Account3: ${account3}`);
    await grantPermission(acl, account1, crowdfunding.address, CREATE_MILESTONE_ROLE, deployer);
    await sleep();
    log(`       - Account1: ${account1}`);
    await grantPermission(acl, account2, crowdfunding.address, CREATE_MILESTONE_ROLE, deployer);
    await sleep();
    log(`       - Account2: ${account2}`);
    log(`   - EXCHANGE_RATE_ROLE`);
    await createPermission(acl, deployer, crowdfunding.address, EXCHANGE_RATE_ROLE, deployer);
    await sleep();
    log(`   - SET_EXCHANGE_RATE_PROVIDER`);
    await createPermission(acl, deployer, crowdfunding.address, SET_EXCHANGE_RATE_PROVIDER, deployer);
    await sleep();
    log(`       - Deployer: ${deployer}`);
    log(`   - ENABLE_TOKEN_ROLE`);
    await createPermission(acl, deployer, crowdfunding.address, ENABLE_TOKEN_ROLE, deployer);
    await sleep();
    log(`       - Deployer: ${deployer}`);
    log(`   - TRANSFER_ROLE`);
    await createPermission(acl, crowdfunding.address, vault.address, TRANSFER_ROLE, deployer);
    await sleep();
    log(`       - Crowdfunding: ${crowdfunding.address}`);

    // Inicialización
    await vault.initialize();
    await sleep();
    await crowdfunding.initialize(vault.address);
    await sleep();

    // ERC20 Token

    log(` - ERC20 Tokens`);

    let rifAddress;
    let docAddress;
    let DOC_PRICE = new BN('00001000000000000000000'); // Precio del DOC: 1,00 US$
    if (network === "rskRegtest") {

        let rifTokenMock = await RifTokenMock.new({ from: deployer });
        rifAddress = rifTokenMock.address;
        log(`   - RifTokenMock: ${rifAddress}`);

        let docTokenMock = await DocTokenMock.new({ from: deployer });
        docAddress = docTokenMock.address;
        log(`   - DocTokenMock: ${docAddress}`);

    } else if (network === "rskTestnet") {

        // TODO
        rifAddress = '0x19f64674d8a5b4e652319f5e239efd3bc969a1fe';
        docAddress = '';

    } else if (network === "rskMainnet") {

        // TODO
        rifAddress = '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5';
        docAddress = '';
    }

    // Exchange Rate

    log(` - RBTC Exchange Rate`);

    const RBTC = '0x0000000000000000000000000000000000000000';

    let moCStateAddress;
    let roCStateAddress;

    if (network === "rskRegtest") {
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
        moCStateAddress = "0x541F68a796Fe5ae3A381d2Aa5a50b975632e40A6";
    }

    log(`   - MoCState: ${moCStateAddress}`);
    log(`   - RoCState: ${roCStateAddress}`);

    const exchangeRateProvider = await ExchangeRateProvider.new(
        moCStateAddress,
        roCStateAddress,
        rifAddress,
        docAddress,
        DOC_PRICE,
        { from: deployer });
    log(`   - ExchangeRateProvider: ${exchangeRateProvider.address}`);
    await sleep();

    await crowdfunding.setExchangeRateProvider(exchangeRateProvider.address, { from: deployer });
    await sleep();

    // Habilitación de tokens para donar.

    log(` - Enable token donations`);

    await crowdfunding.enableToken(RBTC, { from: deployer });
    log(`   - Enable RBTC`);

    await crowdfunding.enableToken(rifAddress, { from: deployer });
    log(`   - RifToken`);
    
    await crowdfunding.enableToken(docAddress, { from: deployer });
    log(`   - DocToken`);

    log(` - Initialized`);
}