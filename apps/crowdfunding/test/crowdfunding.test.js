const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { newDao, newApp } = require('./helpers/dao')
const { newCrowdfunding } = require('./helpers/crowdfunding')
const { errors } = require('./helpers/errors')

const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')

contract('Crowdfunding App', ([deployer, giver, registeredUser, delegate, campaignManager, campaignReviewer, notAuthorized]) => {
    let crowdfundingBase, crowdfunding;
    

    before(async () => {
        crowdfundingBase = await newCrowdfunding(deployer);
        vaultBase = await Vault.new({ from: deployer });
    })

    beforeEach(async () => {
        const { dao, acl } = await newDao(deployer);
        const crowdfundingAddress = await newApp(dao, "crowdfunding", crowdfundingBase.address, deployer);
        const vaultAddress = await newApp(dao, "vault", vaultBase.address, deployer);
        crowdfunding = await Crowdfunding.at(crowdfundingAddress);
        vault = await Vault.at(vaultAddress);
        await vault.initialize()
        await crowdfunding.initialize(vault.address);
    })

    context('Inicialización', function() {

        it.skip('Falla al reinicializar', async () => {
            await assertRevert(crowdfunding.initialize(), errors.INIT_ALREADY_INITIALIZED)
        })
    })
})
