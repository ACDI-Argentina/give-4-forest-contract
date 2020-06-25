const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { newDao, newApp } = require('./helpers/dao')
const { setPermission } = require('./helpers/permissions')
const { newCrowdfunding, newDac, newCampaign, INFO_CID } = require('./helpers/crowdfunding')
const { errors } = require('./helpers/errors')
const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')

contract('Crowdfunding App - Milestone', ([deployer, giver, registeredUser, delegate, campaignManager, campaignReviewer, milestoneManager, milestoneReviewer, milestoneRecipient, notAuthorized]) => {
    let crowdfundingBase, crowdfunding;
    let vaultBase, vault;
    let CREATE_DAC_ROLE
    let CREATE_CAMPAIGN_ROLE
    let CREATE_MILESTONE_ROLE

    before(async () => {
        crowdfundingBase = await newCrowdfunding(deployer);
        vaultBase = await Vault.new({ from: deployer });
        // Setup constants
        CREATE_DAC_ROLE = await crowdfundingBase.CREATE_DAC_ROLE();
        CREATE_CAMPAIGN_ROLE = await crowdfundingBase.CREATE_CAMPAIGN_ROLE();
        CREATE_MILESTONE_ROLE = await crowdfundingBase.CREATE_MILESTONE_ROLE();
    })

    beforeEach(async () => {
        const { dao, acl } = await newDao(deployer);
        const crowdfundingAddress = await newApp(dao, "crowdfunding", crowdfundingBase.address, deployer);
        const vaultAddress = await newApp(dao, "vault", vaultBase.address, deployer);
        crowdfunding = await Crowdfunding.at(crowdfundingAddress);
        vault = await Vault.at(vaultAddress);
        await setPermission(acl, delegate, crowdfunding.address, CREATE_DAC_ROLE, deployer);
        await setPermission(acl, campaignManager, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
        await setPermission(acl, milestoneManager, crowdfunding.address, CREATE_MILESTONE_ROLE, deployer);
        await vault.initialize()
        await crowdfunding.initialize(vault.address);
    })

    context('Seguridad', function() {

        it('Usuario no autorizado', async () => {

            let dacId = await newDac(crowdfunding, delegate, '1');
            let campaignId = await newCampaign(crowdfunding, campaignManager, campaignReviewer, dacId);

            let maxAmount = 10;

            // El delegate no tiene configurada la autorización para crear milestones.
            await assertRevert(
                crowdfunding.newMilestone(
                    INFO_CID,
                    campaignId,
                    maxAmount,
                    milestoneReviewer,
                    milestoneRecipient,
                    campaignReviewer,
                    { from: delegate })
                , errors.APP_AUTH_FAILED)
        })
    })

    context('Flujo normal de Campaigns', function() {

        it('Creación de Milestone', async () => {

            let dacId = await newDac(crowdfunding, delegate, '1');
            let campaignId = await newCampaign(crowdfunding, campaignManager, campaignReviewer, dacId);

            let maxAmount = 10;

            // 2: Crowdfunding.EntityType.Milestone;
            let entityType = 2;

            let receipt = await crowdfunding.newMilestone(
                INFO_CID,
                campaignId,
                maxAmount,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                { from: milestoneManager });

            let milestoneId = getEventArgument(receipt, 'NewMilestone', 'id');
            assert.equal(milestoneId, 3);

            let milestones = await crowdfunding.getAllMilestones();
            assert.equal(milestones.length, 1)
            let milestone = milestones[0];
            assert.equal(milestone.id, 3);
            assert.equal(milestone.idIndex, 0);
            assert.equal(milestone.infoCid, INFO_CID);
            assert.equal(milestone.maxAmount, maxAmount);
            assert.equal(milestone.manager, milestoneManager);
            assert.equal(milestone.reviewer, milestoneReviewer);
            assert.equal(milestone.recipient, milestoneRecipient);
            assert.equal(milestone.campaignReviewer, campaignReviewer);
            assert.equal(milestone.campaignId, campaignId);

            let entities = await crowdfunding.getAllEntities();
            assert.equal(entities.length, 3);
            // El elemento 0 es la Dac
            // El elemento 1 es la Campaign
            // El elemento 2 es el Milestone
            let entity = entities[2];
            assert.equal(entity.id, 3);
            assert.equal(entity.idIndex, 2);
            assert.equal(entity.entityType, entityType);
        })
    })

    context('Flujos alternativos de Milestone', function() {

        it('Creación de Milestone con Campaign inexistente', async () => {

            // La Campaign con Id 1 no existe.
            let campaignId = 1;

            let maxAmount = 10;

            await assertRevert(crowdfunding.newMilestone(
                INFO_CID,
                campaignId,
                maxAmount,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                { from: milestoneManager }), errors.CROWDFUNDING_CAMPAIGN_NOT_EXIST)
        })
    })
})
