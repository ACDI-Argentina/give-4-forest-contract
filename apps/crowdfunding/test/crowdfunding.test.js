const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { newDao, newApp } = require('./helpers/dao')
const { setPermission } = require('./helpers/permissions')
const { newCrowdfunding,
    newDac,
    newCampaign,
    newMilestone,
    newDonation,
    INFO_CID } = require('./helpers/crowdfunding')
const { assertEntity,
    assertDac,
    assertCampaign,
    assertMilestone,
    assertDonation,
    assertButget } = require('./helpers/asserts')
const { errors } = require('./helpers/errors')
const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')

// Mocks
const EtherTokenConstantMock = artifacts.require('EtherTokenConstantMock')
const TokenMock = artifacts.require('TokenMock')

// Tests for different token interfaces
const tokenTestGroups = [
    {
        title: 'standards compliant, reverting token',
        tokenContract: TokenMock,
    }
];

// 0: EntityType.Dac;
// 1: EntityType.Campaign;
// 2: EntityType.Milestone;
const ENTITY_TYPE_DAC = 0;
const ENTITY_TYPE_CAMPAIGN = 1;
const ENTITY_TYPE_MILESTONE = 2;

const VAULT_INITIAL_TOKEN1_BALANCE = 100;

// 0: DacStatus.Active;
const DAC_STATUS_ACTIVE = 0;

// 0: CampaignStatus.Active;
const CAMPAIGN_STATUS_ACTIVE = 0;

// 0: MilestoneStatus.Active;
const MILESTONE_STATUS_ACTIVE = 0;

// 0: DonationStatus.Available;
const DONATION_STATUS_AVAILABLE = 0;

// 0: ButgetStatus.Butgeted;
const BUTGET_STATUS_BUTGETED = 0;

contract('Crowdfunding App', ([
    deployer,
    giver,
    registeredUser,
    delegate,
    campaignManager,
    campaignReviewer,
    milestoneManager,
    milestoneReviewer,
    milestoneRecipient,
    notAuthorized]) => {

    let crowdfundingBase, crowdfunding;
    let vaultBase, vault;
    let CREATE_DAC_ROLE, CREATE_CAMPAIGN_ROLE, CREATE_MILESTONE_ROLE;
    let ETH

    before(async () => {
        crowdfundingBase = await newCrowdfunding(deployer);
        vaultBase = await Vault.new({ from: deployer });
        // Setup constants
        CREATE_DAC_ROLE = await crowdfundingBase.CREATE_DAC_ROLE();
        CREATE_CAMPAIGN_ROLE = await crowdfundingBase.CREATE_CAMPAIGN_ROLE();
        CREATE_MILESTONE_ROLE = await crowdfundingBase.CREATE_MILESTONE_ROLE();

        const ethConstant = await EtherTokenConstantMock.new()
        ETH = await ethConstant.getETHConstant()
    })

    beforeEach(async () => {

        // Deploy de la DAO
        const { dao, acl } = await newDao(deployer);

        // Deploy de contratos y proxies
        const crowdfundingAddress = await newApp(dao, "crowdfunding", crowdfundingBase.address, deployer);
        const vaultAddress = await newApp(dao, "vault", vaultBase.address, deployer);
        crowdfunding = await Crowdfunding.at(crowdfundingAddress);
        vault = await Vault.at(vaultAddress);

        // Configuración de permisos
        await setPermission(acl, delegate, crowdfunding.address, CREATE_DAC_ROLE, deployer);
        await setPermission(acl, campaignManager, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
        await setPermission(acl, milestoneManager, crowdfunding.address, CREATE_MILESTONE_ROLE, deployer);

        // Inicialización
        await vault.initialize()
        await crowdfunding.initialize(vault.address);
    });

    context('Inicialización', function () {

        it('Falla al reinicializar', async () => {
            await assertRevert(crowdfunding.initialize(vault.address), errors.INIT_ALREADY_INITIALIZED)
        })
    });

    context('Manejo de DACs', function () {

        it('Creación de Dac', async () => {

            let receipt = await crowdfunding.newDac(INFO_CID, { from: delegate });

            let dacId = getEventArgument(receipt, 'NewDac', 'id');
            assert.equal(dacId, 1);

            let dacs = await crowdfunding.getAllDacs();
            assert.equal(dacs.length, 1)
            assertDac(dacs[0], {
                id: 1,
                idIndex: 0,
                infoCid: INFO_CID,
                delegate: delegate,
                campaignIds: [],
                status: DAC_STATUS_ACTIVE
            });

            let entities = await crowdfunding.getAllEntities();
            assert.equal(entities.length, 1)
            assertEntity(entities[0], {
                id: 1,
                idIndex: 0,
                entityType: ENTITY_TYPE_DAC,
                butgetIdsLength: 0
            });
        });

        it('Creación de Dac no autorizado', async () => {

            await assertRevert(crowdfunding.newDac(
                INFO_CID,
                { from: notAuthorized }
            ), errors.APP_AUTH_FAILED)
        });
    });

    context('Manejo de Campaigns', function () {

        it('Creación de Campaign', async () => {

            let dacId = await newDac(crowdfunding, delegate);

            let receipt = await crowdfunding.newCampaign(INFO_CID, dacId, campaignReviewer, { from: campaignManager });

            let campaignId = getEventArgument(receipt, 'NewCampaign', 'id');
            assert.equal(campaignId, 2);

            let campaigns = await crowdfunding.getAllCampaigns();
            assert.equal(campaigns.length, 1)
            assertCampaign(campaigns[0], {
                id: 2,
                idIndex: 0,
                infoCid: INFO_CID,
                manager: campaignManager,
                reviewer: campaignReviewer,
                dacIds: [dacId],
                milestoneIds: [],
                status: CAMPAIGN_STATUS_ACTIVE
            });

            let entities = await crowdfunding.getAllEntities();
            assert.equal(entities.length, 2);
            assertEntity(entities[1], {
                id: 2,
                idIndex: 1,
                entityType: ENTITY_TYPE_CAMPAIGN,
                butgetIdsLength: 0
            });
        });

        it('Creación de Campaign no autorizado', async () => {

            let dacId = await newDac(crowdfunding, delegate);

            // El delegate no tiene configurada la autorización para crear campaigns.
            await assertRevert(
                crowdfunding.newCampaign(
                    INFO_CID,
                    dacId,
                    campaignReviewer,
                    { from: delegate })
                , errors.APP_AUTH_FAILED)
        });

        it('Creación de Campaign con Dac inexistente', async () => {

            // La Dac con Id 1 no existe.
            let dacId = 1;

            await assertRevert(crowdfunding.newCampaign(
                INFO_CID,
                dacId,
                campaignReviewer,
                { from: campaignManager }), errors.CROWDFUNDING_DAC_NOT_EXIST)
        })
    });

    context('Manejo de Milestones', function () {

        it('Creación de Milestone', async () => {

            let dacId = await newDac(crowdfunding, delegate, '1');
            let campaignId = await newCampaign(crowdfunding, campaignManager, campaignReviewer, dacId);

            let maxAmount = 10;

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
            assertMilestone(milestones[0], {
                id: 3,
                idIndex: 0,
                infoCid: INFO_CID,
                maxAmount: maxAmount,
                manager: milestoneManager,
                reviewer: milestoneReviewer,
                recipient: milestoneRecipient,
                campaignReviewer: campaignReviewer,
                campaignId: campaignId,
                status: MILESTONE_STATUS_ACTIVE
            });

            let entities = await crowdfunding.getAllEntities();
            assert.equal(entities.length, 3);
            assertEntity(entities[2], {
                id: 3,
                idIndex: 2,
                entityType: ENTITY_TYPE_MILESTONE,
                butgetIdsLength: 0
            });
        });

        it('Creación de Milestone no autorizado', async () => {

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
        });

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
        });
    })

    context('Donación de ETH', function () {

        let dacId, campaignId, milestoneId;

        beforeEach(async () => {

            dacId = await newDac(crowdfunding, delegate);
            campaignId = await newCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId);
            milestoneId = await newMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId);
        });

        it('Donar a Dac', async () => {

            const amount = 10

            const receipt = await crowdfunding.donate(dacId, ETH, amount, { from: giver, value: amount });
            const receiptId = getEventArgument(receipt, 'NewDonation', 'id');
            const receiptEntityId = getEventArgument(receipt, 'NewDonation', 'entityId');
            const receiptToken = getEventArgument(receipt, 'NewDonation', 'token');
            const receiptAmount = getEventArgument(receipt, 'NewDonation', 'amount');

            assert.equal(receiptId, 1);
            assert.equal(receiptEntityId, dacId);
            assert.equal(receiptToken, ETH);
            assert.equal(receiptAmount, amount);

            let donations = await crowdfunding.getAllDonations();
            assert.equal(donations.length, 1)
            assertDonation(donations[0], {
                id: 1,
                idIndex: 0,
                giver: giver,
                token: ETH,
                amount: amount,
                amountRemainding: amount,
                entityId: dacId,
                status: DONATION_STATUS_AVAILABLE
            });

            let butgets = await crowdfunding.getAllButgets();
            assert.equal(butgets.length, 1)
            assertButget(butgets[0], {
                id: 1,
                idIndex: 0,
                entityId: dacId,
                token: ETH,
                amount: amount,
                status: BUTGET_STATUS_BUTGETED
            });

            // Assert desde el Vault
            assert.equal(await vault.balance(ETH), amount, 'Los tokens donados deben estar en el Vault.');
        })

        it('Donar a Campaign', async () => {

            const amount = 10

            const receipt = await crowdfunding.donate(campaignId, ETH, amount, { from: giver, value: amount });
            const receiptId = getEventArgument(receipt, 'NewDonation', 'id');
            const receiptEntityId = getEventArgument(receipt, 'NewDonation', 'entityId');
            const receiptToken = getEventArgument(receipt, 'NewDonation', 'token');
            const receiptAmount = getEventArgument(receipt, 'NewDonation', 'amount');

            assert.equal(receiptId, 1);
            assert.equal(receiptEntityId, campaignId);
            assert.equal(receiptToken, ETH);
            assert.equal(receiptAmount, amount);

            let donations = await crowdfunding.getAllDonations();
            assert.equal(donations.length, 1)
            assertDonation(donations[0], {
                id: 1,
                idIndex: 0,
                giver: giver,
                token: ETH,
                amount: amount,
                amountRemainding: amount,
                entityId: campaignId,
                status: DONATION_STATUS_AVAILABLE
            });

            let butgets = await crowdfunding.getAllButgets();
            assert.equal(butgets.length, 1)
            assertButget(butgets[0], {
                id: 1,
                idIndex: 0,
                entityId: campaignId,
                token: ETH,
                amount: amount,
                status: BUTGET_STATUS_BUTGETED
            });

            // Assert desde el Vault
            assert.equal(await vault.balance(ETH), amount, 'Los tokens donados deben estar en el Vault.');
        })

        it('Donar a Milestone', async () => {

            const amount = 10

            const receipt = await crowdfunding.donate(milestoneId, ETH, amount, { from: giver, value: amount });
            const receiptId = getEventArgument(receipt, 'NewDonation', 'id');
            const receiptEntityId = getEventArgument(receipt, 'NewDonation', 'entityId');
            const receiptToken = getEventArgument(receipt, 'NewDonation', 'token');
            const receiptAmount = getEventArgument(receipt, 'NewDonation', 'amount');

            assert.equal(receiptId, 1);
            assert.equal(receiptEntityId, milestoneId);
            assert.equal(receiptToken, ETH);
            assert.equal(receiptAmount, amount);

            let donations = await crowdfunding.getAllDonations();
            assert.equal(donations.length, 1)
            assertDonation(donations[0], {
                id: 1,
                idIndex: 0,
                giver: giver,
                token: ETH,
                amount: amount,
                amountRemainding: amount,
                entityId: milestoneId,
                status: DONATION_STATUS_AVAILABLE
            });

            let butgets = await crowdfunding.getAllButgets();
            assert.equal(butgets.length, 1)
            assertButget(butgets[0], {
                id: 1,
                idIndex: 0,
                entityId: milestoneId,
                token: ETH,
                amount: amount,
                status: BUTGET_STATUS_BUTGETED
            });

            // Assert desde el Vault
            assert.equal(await vault.balance(ETH), amount, 'Los tokens donados deben estar en el Vault.');
        })
    })

    for (const { title, tokenContract } of tokenTestGroups) {
        context(`Token ERC20 (${title})`, () => {
            let tokenInstance;
            let dacId, campaignId, milestoneId;
            const amount = 10;

            beforeEach(async () => {
                // Set up a new token similar to token1's distribution
                tokenInstance = await tokenContract.new(giver, 10000 + VAULT_INITIAL_TOKEN1_BALANCE)
                await tokenInstance.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE, { from: giver })
                // Se aprueba al Crowdfunding para depositar los Tokens en el Vault.
                await tokenInstance.approve(crowdfunding.address, amount, { from: giver });
                dacId = await newDac(crowdfunding, delegate);
                campaignId = await newCampaign(crowdfunding,
                    campaignManager,
                    campaignReviewer,
                    dacId);
                milestoneId = await newMilestone(crowdfunding,
                    milestoneManager,
                    milestoneReviewer,
                    milestoneRecipient,
                    campaignReviewer,
                    campaignId);
            })

            it('Donar a Dac', async () => {
                const receipt = await crowdfunding.donate(dacId, tokenInstance.address, amount, { from: giver });
                const receiptId = getEventArgument(receipt, 'NewDonation', 'id');
                const receiptEntityId = getEventArgument(receipt, 'NewDonation', 'entityId');
                const receiptToken = getEventArgument(receipt, 'NewDonation', 'token');
                const receiptAmount = getEventArgument(receipt, 'NewDonation', 'amount');

                assert.equal(receiptId, 1);
                assert.equal(receiptEntityId, dacId);
                assert.equal(receiptToken, tokenInstance.address);
                assert.equal(receiptAmount, amount);

                let donations = await crowdfunding.getAllDonations();
                assert.equal(donations.length, 1)
                assertDonation(donations[0], {
                    id: 1,
                    idIndex: 0,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: dacId,
                    status: DONATION_STATUS_AVAILABLE
                });

                let butgets = await crowdfunding.getAllButgets();
                assert.equal(butgets.length, 1)
                assertButget(butgets[0], {
                    id: 1,
                    idIndex: 0,
                    entityId: dacId,
                    token: tokenInstance.address,
                    amount: amount,
                    status: BUTGET_STATUS_BUTGETED
                });

                // Assert desde el Vault
                assert.equal(await vault.balance(tokenInstance.address), VAULT_INITIAL_TOKEN1_BALANCE + amount, 'Los tokens donados deben estar en el Vault.');
                // Assert desde el Token
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE + amount, 'Los tokens donados deben estar en el Vault.');
            });

            it('Donar a Campaign', async () => {

                const receipt = await crowdfunding.donate(campaignId, tokenInstance.address, amount, { from: giver });
                const receiptId = getEventArgument(receipt, 'NewDonation', 'id');
                const receiptEntityId = getEventArgument(receipt, 'NewDonation', 'entityId');
                const receiptToken = getEventArgument(receipt, 'NewDonation', 'token');
                const receiptAmount = getEventArgument(receipt, 'NewDonation', 'amount');

                assert.equal(receiptId, 1);
                assert.equal(receiptEntityId, campaignId);
                assert.equal(receiptToken, tokenInstance.address);
                assert.equal(receiptAmount, amount);

                let donations = await crowdfunding.getAllDonations();
                assert.equal(donations.length, 1)
                assertDonation(donations[0], {
                    id: 1,
                    idIndex: 0,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: campaignId,
                    status: DONATION_STATUS_AVAILABLE
                });

                let butgets = await crowdfunding.getAllButgets();
                assert.equal(butgets.length, 1)
                assertButget(butgets[0], {
                    id: 1,
                    idIndex: 0,
                    entityId: campaignId,
                    token: tokenInstance.address,
                    amount: amount,
                    status: BUTGET_STATUS_BUTGETED
                });

                // Assert desde el Vault
                assert.equal(await vault.balance(tokenInstance.address), VAULT_INITIAL_TOKEN1_BALANCE + amount, 'Los tokens donados deben estar en el Vault.');
                // Assert desde el Token
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE + amount, 'Los tokens donados deben estar en el Vault.');
            });

            it('Donar a Milestone', async () => {

                const receipt = await crowdfunding.donate(milestoneId, tokenInstance.address, amount, { from: giver });
                const receiptId = getEventArgument(receipt, 'NewDonation', 'id');
                const receiptEntityId = getEventArgument(receipt, 'NewDonation', 'entityId');
                const receiptToken = getEventArgument(receipt, 'NewDonation', 'token');
                const receiptAmount = getEventArgument(receipt, 'NewDonation', 'amount');

                assert.equal(receiptId, 1);
                assert.equal(receiptEntityId, milestoneId);
                assert.equal(receiptToken, tokenInstance.address);
                assert.equal(receiptAmount, amount);

                let donations = await crowdfunding.getAllDonations();
                assert.equal(donations.length, 1)
                assertDonation(donations[0], {
                    id: 1,
                    idIndex: 0,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: milestoneId,
                    status: DONATION_STATUS_AVAILABLE
                });

                let butgets = await crowdfunding.getAllButgets();
                assert.equal(butgets.length, 1)
                assertButget(butgets[0], {
                    id: 1,
                    idIndex: 0,
                    entityId: milestoneId,
                    token: tokenInstance.address,
                    amount: amount,
                    status: BUTGET_STATUS_BUTGETED
                });

                // Assert desde el Vault
                assert.equal(await vault.balance(tokenInstance.address), VAULT_INITIAL_TOKEN1_BALANCE + amount, 'Los tokens donados deben estar en el Vault.');
                // Assert desde el Token
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE + amount, 'Los tokens donados deben estar en el Vault.');
            })
        })
    }

    context('Transferencia', function () {

        let dacId, campaignId, milestoneId;
        let donationAmount, donationId1, donationId2, donationId3, donationId4;

        beforeEach(async () => {

            dacId = await newDac(crowdfunding, delegate);
            campaignId = await newCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId);
            milestoneId = await newMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId);
            donationAmount = 10;
            // Donación de ETH a DAC
            donationId1 = await newDonation(crowdfunding,
                dacId,
                ETH,
                donationAmount,
                giver);
            for (const { tokenContract } of tokenTestGroups) {
                // Set up a new token similar to token1's distribution
                tokenInstance = await tokenContract.new(giver, 10000 + VAULT_INITIAL_TOKEN1_BALANCE)
                await tokenInstance.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE, { from: giver })
                // Se aprueba al Crowdfunding para depositar los Tokens en el Vault.
                await tokenInstance.approve(crowdfunding.address, donationAmount, { from: giver });
                // Donación del Token a DAC
                donationId2 = await newDonation(crowdfunding,
                    dacId,
                    tokenInstance.address,
                    donationAmount,
                    giver);
                // Se aprueba al Crowdfunding para depositar los Tokens en el Vault.
                await tokenInstance.approve(crowdfunding.address, donationAmount, { from: giver });
                // Donación del Token a Campaign
                donationId3 = await newDonation(crowdfunding,
                    campaignId,
                    tokenInstance.address,
                    donationAmount,
                    giver);
                // Se aprueba al Crowdfunding para depositar los Tokens en el Vault.
                await tokenInstance.approve(crowdfunding.address, donationAmount, { from: giver });
                // Donación del Token a Milestone
                donationId4 = await newDonation(crowdfunding,
                    milestoneId,
                    tokenInstance.address,
                    donationAmount,
                    giver);
            }
        });

        it('Transferencia de ETH de Dac a Campaign', async () => {

            const receipt = await crowdfunding.transfer(dacId, campaignId, [donationId1], { from: delegate });
            const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
            const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
            const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');
            const receiptAmount = getEventArgument(receipt, 'Transfer', 'amount');

            assert.equal(receiptEntityIdFrom, dacId);
            assert.equal(receiptEntityIdTo, campaignId);
            assert.equal(receiptDonationId, donationId1);
            assert.equal(receiptAmount, donationAmount);

            let butgetFrom = await crowdfunding.getButget(dacId, ETH);
            assertButget(butgetFrom, {
                entityId: dacId,
                token: ETH,
                amount: 0,
                status: BUTGET_STATUS_BUTGETED
            });

            let butgetTo = await crowdfunding.getButget(campaignId, ETH);
            assertButget(butgetTo, {
                entityId: campaignId,
                token: ETH,
                amount: donationAmount,
                status: BUTGET_STATUS_BUTGETED
            });
        })

        it('Transferencia de ETH de Dac a Milestone', async () => {

            const receipt = await crowdfunding.transfer(dacId, milestoneId, [donationId1], { from: delegate });
            const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
            const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
            const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');
            const receiptAmount = getEventArgument(receipt, 'Transfer', 'amount');

            assert.equal(receiptEntityIdFrom, dacId);
            assert.equal(receiptEntityIdTo, milestoneId);
            assert.equal(receiptDonationId, donationId1);
            assert.equal(receiptAmount, donationAmount);

            let butgetFrom = await crowdfunding.getButget(dacId, ETH);
            assertButget(butgetFrom, {
                entityId: dacId,
                token: ETH,
                amount: 0,
                status: BUTGET_STATUS_BUTGETED
            });

            let butgetTo = await crowdfunding.getButget(milestoneId, ETH);
            assertButget(butgetTo, {
                entityId: milestoneId,
                token: ETH,
                amount: donationAmount,
                status: BUTGET_STATUS_BUTGETED
            });
        })
    })
})
