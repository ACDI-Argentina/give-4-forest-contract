const arg = require("arg");

const args = arg( {'--network': String},process.argv);
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

const PriceProviderMock = artifacts.require('PriceProviderMock');
const ExchangeRateProvider = artifacts.require('ExchangeRateProvider')

// Por versión de Solidity (0.4.24), el placeholder de la libraría aún se arma
// con el nombre y no el hash.
// En la versión 0.5.0 este mecanismo se reemplaza por el hast del nombre de la librería.
// https://github.com/ethereum/solidity/blob/develop/Changelog.md#050-2018-11-13
// Commandline interface: Use hash of library name for link placeholder instead of name itself.
const ARRAY_LIB_PLACEHOLDER = '__contracts/ArrayLib.sol:ArrayLib_______';
const ENTITY_LIB_PLACEHOLDER = '__contracts/EntityLib.sol:EntityLib_____';
const DAC_LIB_PLACEHOLDER = '__contracts/DacLib.sol:DacLib___________';
const CAMPAIGN_LIB_PLACEHOLDER = '__contracts/CampaignLib.sol:CampaignLi__';
const MILESTONE_LIB_PLACEHOLDER = '__contracts/MilestoneLib.sol:Milestone__';
const ACTIVITY_LIB_PLACEHOLDER = '__contracts/ActivityLib.sol:ActivityLi__';
const DONATION_LIB_PLACEHOLDER = '__contracts/DonationLib.sol:DonationLi__';

module.exports = async ({ getNamedAccounts, deployments }) => {

    const { log } = deployments;
    const { deployer, account1, account2, account3, account4, account5 } = await getNamedAccounts();

    log(`Aragon deploy`);

    // Deploy de la DAO
    const { kernelBase, aclBase, dao, acl } = await newDao(deployer);

    log(` - Kernel Base: ${kernelBase.address}`);
    log(` - ACL Base: ${aclBase.address}`);
    log(` - DAO: ${dao.address}`);
    log(` - ACL: ${acl.address}`);

    log(`Crowdfunding deploy`);

    // Link Crowdfunding > ArrayLib
    const arrayLib = await ArrayLib.new({ from: deployer });
    await linkLib(arrayLib, Crowdfunding, ARRAY_LIB_PLACEHOLDER);
    // Link Crowdfunding > EntityLib
    const entityLib = await EntityLib.new({ from: deployer });
    await linkLib(entityLib, Crowdfunding, ENTITY_LIB_PLACEHOLDER);
    // Link Crowdfunding > DacLib
    const dacLib = await DacLib.new({ from: deployer });
    await linkLib(dacLib, Crowdfunding, DAC_LIB_PLACEHOLDER);
    // Link Crowdfunding > CampaignLib
    const campaignLib = await CampaignLib.new({ from: deployer });
    await linkLib(campaignLib, Crowdfunding, CAMPAIGN_LIB_PLACEHOLDER);
    // Link Crowdfunding > MilestoneLib
    const milestoneLib = await MilestoneLib.new({ from: deployer });
    await linkLib(milestoneLib, Crowdfunding, MILESTONE_LIB_PLACEHOLDER);
    // Link Crowdfunding > ActivityLib
    const activityLib = await ActivityLib.new({ from: deployer });
    await linkLib(activityLib, Crowdfunding, ACTIVITY_LIB_PLACEHOLDER);
    // Link Crowdfunding > DonationLib
    const donationLib = await DonationLib.new({ from: deployer });
    await linkLib(donationLib, Crowdfunding, DONATION_LIB_PLACEHOLDER);

    const crowdfundingBase = await Crowdfunding.new({ from: deployer });
    const crowdfundingAddress = await newApp(dao, 'crowdfunding', crowdfundingBase.address, deployer);
    const crowdfunding = await Crowdfunding.at(crowdfundingAddress);

    log(` - Libraries`);
    log(`   - Entity Lib: ${entityLib.address}`);
    log(`   - Dac Lib: ${dacLib.address}`);
    log(`   - Campaign Lib: ${campaignLib.address}`);
    log(`   - Milestone Lib: ${milestoneLib.address}`);
    log(`   - Activity Lib: ${activityLib.address}`);
    log(`   - Donation Lib: ${donationLib.address}`);
    log(`   - Array Lib: ${arrayLib.address}`);
    log(` - Crowdfunding Base: ${crowdfundingBase.address}`);
    log(` - Crowdfunding: ${crowdfunding.address}`);

    const vaultBase = await Vault.new({ from: deployer });
    const vaultAddress = await newApp(dao, 'vault', vaultBase.address, deployer);
    const vault = await Vault.at(vaultAddress);

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
    log(`       - Account1: ${account1}`);
    log(`   - CAMPAIGN_MANAGER_ROLE`);
    await createPermission(acl, account2, crowdfunding.address, CAMPAIGN_MANAGER_ROLE, deployer);
    log(`       - Account2: ${account2}`);
    log(`   - CAMPAIGN_REVIEWER_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, CAMPAIGN_REVIEWER_ROLE, deployer);
    log(`       - Account3: ${account3}`);
    await grantPermission(acl, account4, crowdfunding.address, CAMPAIGN_REVIEWER_ROLE, deployer);
    log(`       - Account4: ${account4}`);
    await grantPermission(acl, account5, crowdfunding.address, CAMPAIGN_REVIEWER_ROLE, deployer);
    log(`       - Account5: ${account5}`);
    await grantPermission(acl, account1, crowdfunding.address, CAMPAIGN_REVIEWER_ROLE, deployer);
    log(`       - Account1: ${account1}`);
    log(`   - MILESTONE_MANAGER_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, MILESTONE_MANAGER_ROLE, deployer);
    log(`       - Account3: ${account3}`);
    log(`   - MILESTONE_REVIEWER_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, MILESTONE_REVIEWER_ROLE, deployer);
    log(`       - Account3: ${account3}`);
    await grantPermission(acl, account4, crowdfunding.address, MILESTONE_REVIEWER_ROLE, deployer);
    log(`       - Account4: ${account4}`);
    await grantPermission(acl, account5, crowdfunding.address, MILESTONE_REVIEWER_ROLE, deployer);
    log(`       - Account5: ${account5}`);
    await grantPermission(acl, account1, crowdfunding.address, MILESTONE_REVIEWER_ROLE, deployer);
    log(`       - Account1: ${account1}`);
    log(`   - RECIPIENT_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, RECIPIENT_ROLE, deployer);
    log(`       - Account3: ${account3}`);
    await grantPermission(acl, account4, crowdfunding.address, RECIPIENT_ROLE, deployer);
    log(`       - Account4: ${account4}`);
    await grantPermission(acl, account5, crowdfunding.address, RECIPIENT_ROLE, deployer);
    log(`       - Account5: ${account5}`);
    await grantPermission(acl, account1, crowdfunding.address, RECIPIENT_ROLE, deployer);
    log(`       - Account1: ${account1}`);

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
    log(`       - Account1: ${account1}`);
    log(`   - CREATE_CAMPAIGN_ROLE`);
    await createPermission(acl, account2, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
    log(`       - Account2: ${account2}`);
    await grantPermission(acl, account1, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
    log(`       - Account1: ${account1}`);
    log(`   - CREATE_MILESTONE_ROLE`);
    await createPermission(acl, account3, crowdfunding.address, CREATE_MILESTONE_ROLE, deployer);
    log(`       - Account3: ${account3}`);
    await grantPermission(acl, account1, crowdfunding.address, CREATE_MILESTONE_ROLE, deployer);
    log(`       - Account1: ${account1}`);
    log(`   - EXCHANGE_RATE_ROLE`);
    await createPermission(acl, deployer, crowdfunding.address, EXCHANGE_RATE_ROLE, deployer);
    log(`   - SET_EXCHANGE_RATE_PROVIDER`);
    await createPermission(acl, deployer, crowdfunding.address, SET_EXCHANGE_RATE_PROVIDER, deployer);
    log(`       - Deployer: ${deployer}`);
    log(`   - ENABLE_TOKEN_ROLE`);
    await createPermission(acl, deployer, crowdfunding.address, ENABLE_TOKEN_ROLE, deployer);
    log(`       - Deployer: ${deployer}`);
    log(`   - TRANSFER_ROLE`);
    await createPermission(acl, crowdfunding.address, vault.address, TRANSFER_ROLE, deployer);
    log(`       - Crowdfunding: ${crowdfunding.address}`);

    // Inicialización
    await vault.initialize()
    await crowdfunding.initialize(vault.address);

    const ETH = '0x0000000000000000000000000000000000000000';

    // Exchange Rate

    log(` - ETH Exchange Rate`);

    // Temporal hasta que exista la integración con un Oracle de cotización.

    // Se carga cotización de ETH
    // TODO Esto debiera hacerse a través de un Oracle.
    // Equivalencia de 0.01 USD en Ether (Wei)
    // 1 ETH = 1E+18 Wei = 100 USD > 0.01 USD = 1E+14 Wei
    // TODO Este valor debe establerse por un Oracle.
    const USD_ETH_RATE = new BN('100000000000000');
    await crowdfunding.setExchangeRate(ETH, USD_ETH_RATE, { from: deployer });
    
    let priceProviderAddress;

    if(network === "rskRegtest"){
        const RBTC_PRICE = new BN('13050400000000000000000');
        const priceProviderMock = await PriceProviderMock.new( RBTC_PRICE, { from: deployer });
        priceProviderAddress = priceProviderMock.address;
        log(` - PriceProviderMock: ${priceProviderAddress}`);
        
    } else {
        priceProviderAddress = "0x2d39Cc54dc44FF27aD23A91a9B5fd750dae4B218"; //PriceProvider of MoC
    }

    const exchangeRateProvider = await ExchangeRateProvider.new(priceProviderAddress,{ from: deployer });
    await crowdfunding.setExchangeRateProvider(exchangeRateProvider.address, { from: deployer });

    log(` - ExchangeRateProvider: ${exchangeRateProvider.address}`);

    // Habilitación de ETH (RBTC) para donar.

    log(` - Enable ETH (RBTC)`);
    await crowdfunding.enableToken(ETH, { from: deployer });

    log(` - Initialized`);
}

const linkLib = async (lib, destination, libPlaceholder) => {
    let libAddr = lib.address.replace('0x', '').toLowerCase()
    destination.bytecode = destination.bytecode.replace(new RegExp(libPlaceholder, 'g'), libAddr)
}