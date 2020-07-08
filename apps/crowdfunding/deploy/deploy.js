const { newDao, newApp } = require('../scripts/dao')
const { setPermission } = require('../scripts/permissions')
const Crowdfunding = artifacts.require('Crowdfunding')
const ArrayLib = artifacts.require('ArrayLib')
const Vault = artifacts.require('Vault')

// Por versión de Solidity (0.4.24), el placeholder de la libraría aún se arma
// con el nombre y no el hash.
// En la versión 0.5.0 este mecanismo se reemplaza por el hast del nombre de la librería.
// https://github.com/ethereum/solidity/blob/develop/Changelog.md#050-2018-11-13
// Commandline interface: Use hash of library name for link placeholder instead of name itself.
const ARRAY_LIB_PLACEHOLDER = '__contracts/ArrayLib.sol:ArrayLib_______';

module.exports = async ({ getNamedAccounts, deployments }) => {

    const { log } = deployments;
    const { deployer, delegate, campaignManager, milestoneManager } = await getNamedAccounts();

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

    const crowdfundingBase = await Crowdfunding.new({ from: deployer });
    const crowdfundingAddress = await newApp(dao, 'crowdfunding', crowdfundingBase.address, deployer);
    const crowdfunding = await Crowdfunding.at(crowdfundingAddress);

    log(` - Crowdfunding Base: ${crowdfundingBase.address}`);
    log(` - Crowdfunding: ${crowdfunding.address}`);

    const vaultBase = await Vault.new({ from: deployer });
    const vaultAddress = await newApp(dao, 'vault', vaultBase.address, deployer);
    const vault = await Vault.at(vaultAddress);

    log(` - Vault Base: ${vaultBase.address}`);
    log(` - Vault: ${vault.address}`);

    // Set permissions

    let CREATE_DAC_ROLE = await crowdfundingBase.CREATE_DAC_ROLE()
    let CREATE_CAMPAIGN_ROLE = await crowdfundingBase.CREATE_CAMPAIGN_ROLE();
    let CREATE_MILESTONE_ROLE = await crowdfundingBase.CREATE_MILESTONE_ROLE();
    let EXCHANGE_RATE_ROLE = await crowdfundingBase.EXCHANGE_RATE_ROLE();
    let TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()
    await setPermission(acl, delegate, crowdfunding.address, CREATE_DAC_ROLE, deployer);
    await setPermission(acl, campaignManager, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
    await setPermission(acl, milestoneManager, crowdfunding.address, CREATE_MILESTONE_ROLE, deployer);
    await setPermission(acl, deployer, crowdfunding.address, EXCHANGE_RATE_ROLE, deployer);
    await setPermission(acl, crowdfunding.address, vault.address, TRANSFER_ROLE, deployer);

    log(` - Set permissions`);

    // Inicialización
    await vault.initialize()
    await crowdfunding.initialize(vault.address);

    log(` - Initialized`);
}

const linkLib = async (lib, destination, libPlaceholder) => {
    let libAddr = lib.address.replace('0x', '').toLowerCase()
    destination.bytecode = destination.bytecode.replace(new RegExp(libPlaceholder, 'g'), libAddr)
}