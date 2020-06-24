const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { newDao, newApp } = require('./helpers/dao')
const { setPermission } = require('./helpers/permissions')
const { newCrowdfunding, createDac, INFO_CID } = require('./helpers/crowdfunding')
const { errors } = require('./helpers/errors')
const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')
const BN = web3.utils.BN;

// Mocks
const EtherTokenConstantMock = artifacts.require('EtherTokenConstantMock')

contract('Crowdfunding App - Donate', ([deployer, giver, registeredUser, delegate, campaignManager, campaignReviewer, notAuthorized]) => {
    let crowdfundingBase, crowdfunding;
    let vaultBase, vault;
    let CREATE_DAC_ROLE
    let CREATE_CAMPAIGN_ROLE
    let ETH

    before(async () => {
        crowdfundingBase = await newCrowdfunding(deployer);
        vaultBase = await Vault.new({ from: deployer });
        // Setup constants
        CREATE_DAC_ROLE = await crowdfundingBase.CREATE_DAC_ROLE();
        CREATE_CAMPAIGN_ROLE = await crowdfundingBase.CREATE_CAMPAIGN_ROLE();

        const ethConstant = await EtherTokenConstantMock.new()
        ETH = await ethConstant.getETHConstant()
    })

    beforeEach(async () => {
        const { dao, acl } = await newDao(deployer);
        const crowdfundingAddress = await newApp(dao, "crowdfunding", crowdfundingBase.address, deployer);
        const vaultAddress = await newApp(dao, "vault", vaultBase.address, deployer);
        crowdfunding = await Crowdfunding.at(crowdfundingAddress);
        vault = await Vault.at(vaultAddress);
        await setPermission(acl, delegate, crowdfunding.address, CREATE_DAC_ROLE, deployer);
        await setPermission(acl, campaignManager, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
        await vault.initialize()
        await crowdfunding.initialize(vault.address);
    })

    context('Flujo normal de Donación', function () {

        

        it('Donar a Dac', async () => {

            const dacId = await createDac(crowdfunding, delegate);
            const amount = 10

            const receipt = await crowdfunding.donate(dacId, ETH, amount, { from: giver, value: amount });
            const receiptEntityId = getEventArgument(receipt, 'Donate', 'entityId');
            const receiptToken = getEventArgument(receipt, 'Donate', 'token');
            const receiptAmount = getEventArgument(receipt, 'Donate', 'amount');

            assert.equal(receiptEntityId, dacId);
            assert.equal(receiptToken, ETH);
            assert.equal(receiptAmount, amount);

            assert.equal(await vault.balance(ETH), amount, 'El monto donado debe estar en el Vault');
        })
    })
})
