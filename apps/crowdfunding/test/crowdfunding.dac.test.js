const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { newDao, newApp } = require('./helpers/dao')
const { setPermission } = require('./helpers/permissions')
const { newCrowdfunding, INFO_CID } = require('./helpers/crowdfunding')
const { errors } = require('./helpers/errors')
const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')

contract('Crowdfunding App - Dac', ([deployer, giver, registeredUser, delegate, campaignManager, campaignReviewer, notAuthorized]) => {
    let crowdfundingBase, crowdfunding;
    let vaultBase, vault;
    let CREATE_DAC_ROLE

    before(async () => {
        crowdfundingBase = await newCrowdfunding(deployer);
        vaultBase = await Vault.new({ from: deployer });
        // Setup constants
        CREATE_DAC_ROLE = await crowdfundingBase.CREATE_DAC_ROLE();
    })

    beforeEach(async () => {
        const { dao, acl } = await newDao(deployer);
        const crowdfundingAddress = await newApp(dao, "crowdfunding", crowdfundingBase.address, deployer);
        const vaultAddress = await newApp(dao, "vault", vaultBase.address, deployer);
        crowdfunding = await Crowdfunding.at(crowdfundingAddress);
        vault = await Vault.at(vaultAddress);
        await setPermission(acl, delegate, crowdfunding.address, CREATE_DAC_ROLE, deployer);
        await vault.initialize()
        await crowdfunding.initialize(vault.address);
    })

    context('Seguridad', function() {

        it('Usuario no autorizado', async () => {

            await assertRevert(crowdfunding.newDac(
                INFO_CID,
                { from: notAuthorized }
            ), errors.APP_AUTH_FAILED)
        })
    })

    context('Flujo normal de DACs', function() {

        it('Creación de Dac', async () => {

            // 0: Crowdfunding.EntityType.Dac;
            let entityType = 0;

            let receipt = await crowdfunding.newDac(INFO_CID, { from: delegate });

            let dacId = getEventArgument(receipt, 'NewDac', 'id');
            assert.equal(dacId, 1);

            let dacs = await crowdfunding.getAllDacs();
            assert.equal(dacs.length, 1)
            let dac = dacs[0];
            assert.equal(dac.id, 1);
            assert.equal(dac.idIndex, 0);
            assert.equal(dac.infoCid, INFO_CID);
            assert.equal(dac.delegate, delegate);
            assert.equal(dac.campaignIds.length, 0);

            let entities = await crowdfunding.getAllEntities();
            assert.equal(entities.length, 1)
            let entity = entities[0];
            assert.equal(entity.id, 1);
            assert.equal(entity.idIndex, 0);
            assert.equal(entity.entityType, entityType);
        })
    })
})