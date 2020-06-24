const ACL = artifacts.require('ACL')
const Kernel = artifacts.require('Kernel')
const DAOFactory = artifacts.require('DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('EVMScriptRegistryFactory')
const Crowdfunding = artifacts.require('Crowdfunding')
const DacCrowdfunding = artifacts.require('DacCrowdfunding')

module.exports = async ({ getNamedAccounts, deployments }) => {

    const { log } = deployments;
    const { deployer, delegate } = await getNamedAccounts();

    log(`Aragon deploy`);

    const kernelBase = await Kernel.new(true, { from: deployer }); // petrify immediately
    log(` - Kernel Base: ${kernelBase.address}`);

    const aclBase = await ACL.new({ from: deployer });
    log(` - ACL Base: ${aclBase.address}`);

    const regFact = await EVMScriptRegistryFactory.new({ from: deployer });
    //log(` - EVM Script Registry Factory: ${regFact.address}`);

    let daoFact = await DAOFactory.new(
        kernelBase.address,
        aclBase.address,
        regFact.address, { from: deployer });
    //log(` - DAO Factory: ${daoFact.address}`);

    const daoReceipt = await daoFact.newDAO(deployer);
    const dao = await Kernel.at(getEventArgument(daoReceipt, 'DeployDAO', 'dao'));
    log(` - DAO: ${dao.address}`);

    const acl = await ACL.at(await dao.acl());
    log(` - ACL: ${acl.address}`);

    let APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()

    // ACL
    await acl.createPermission(
        deployer,
        dao.address,
        APP_MANAGER_ROLE,
        deployer,
        { from: deployer }
    );

    log(`Crowdfunding deploy`);

    const crowdfundingBase = await Crowdfunding.new({ from: deployer });
    log(` - Crowdfunding Base: ${crowdfundingBase.address}`);

    const crowdfundingReceipt = await dao.newAppInstance(
        await crowdfundingBase.CROWDFUNDING_APP_ID(),
        crowdfundingBase.address,
        '0x',
        false,
        { from: deployer }
    );
    const crowdfunding = await Crowdfunding.at(
        getEventArgument(
            crowdfundingReceipt,
            'NewAppProxy',
            'proxy'));
    log(` - Crowdfunding: ${crowdfunding.address}`);

    const dacCrowdfundingBase = await DacCrowdfunding.new({ from: deployer });
    log(` - DAC Crowdfunding Base: ${dacCrowdfundingBase.address}`);

    const dacCrowdfundingReceipt = await dao.newAppInstance(
        await dacCrowdfundingBase.DAC_CROWDFUNDING_APP_ID(),
        dacCrowdfundingBase.address,
        '0x',
        false,
        { from: deployer }
    );
    const dacCrowdfunding = await DacCrowdfunding.at(
        getEventArgument(
            dacCrowdfundingReceipt,
            'NewAppProxy',
            'proxy'));
    log(` - DAC Crowdfunding: ${dacCrowdfunding.address}`);

    let CREATE_ENTITY_ROLE = await crowdfundingBase.CREATE_ENTITY_ROLE()
    let CREATE_DAC_ROLE = await dacCrowdfundingBase.CREATE_DAC_ROLE()

    // Se permite al delegate poder crear DACss.
    await acl.createPermission(
        delegate,
        dacCrowdfunding.address,
        CREATE_DAC_ROLE,
        deployer,
        { from: deployer }
    );

    // Se permite al DacCrowdfunding poder crear entities.
    await acl.createPermission(
        dacCrowdfunding.address,
        crowdfunding.address,
        CREATE_ENTITY_ROLE,
        deployer,
        { from: deployer }
    );

    await crowdfunding.initialize();
    await dacCrowdfunding.initialize(crowdfunding.address);
}

const getEventArgument = (receipt, event, arg) => {
    return receipt.logs.filter(l => l.event === event)[0].args[arg]
};