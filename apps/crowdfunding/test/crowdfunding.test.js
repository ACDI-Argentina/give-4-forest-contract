const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { newDao, newApp } = require('../scripts/dao')
const { createPermission } = require('../scripts/permissions')
const { newCrowdfunding,
    newDac,
    newCampaign,
    newMilestone,
    newDonationEther,
    newDonationToken,
    getDacs,
    getCampaigns,
    getMilestones,
    getBudgets,
    getBudget,
    getDonations,
    INFO_CID,
    FIAT_AMOUNT_TARGET } = require('./helpers/crowdfunding')
const { assertEntity,
    assertDac,
    assertCampaign,
    assertMilestone,
    assertActivity,
    assertDonation,
    assertBudget } = require('./helpers/asserts')
const { errors } = require('./helpers/errors')
const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')
const BN = require('bn.js');

// Mocks
const EtherTokenConstantMock = artifacts.require('EtherTokenConstantMock')
const TokenMock = artifacts.require('TokenMock')

// Tests for different token interfaces
const tokenTestGroups = [
    {
        title: 'Standards compliant',
        tokenContract: TokenMock,
    }
];

// 0: EntityType.Dac;
// 1: EntityType.Campaign;
// 2: EntityType.Milestone;
const ENTITY_TYPE_DAC = 0;
const ENTITY_TYPE_CAMPAIGN = 1;
const ENTITY_TYPE_MILESTONE = 2;

const VAULT_INITIAL_TOKEN1_BALANCE = new BN('100');

// 0: Status.Active;
const DAC_STATUS_ACTIVE = 0;

// 0: Status.Active;
const CAMPAIGN_STATUS_ACTIVE = 0;

// 0: Status.Active;
const MILESTONE_STATUS_ACTIVE = 0;
const MILESTONE_STATUS_CANCELLED = 1;
const MILESTONE_STATUS_COMPLETED = 2;
const MILESTONE_STATUS_APPROVED = 3;
const MILESTONE_STATUS_REJECTED = 4;
const MILESTONE_STATUS_FINISHED = 5;

// 0: DonationStatus.Available;
const DONATION_STATUS_AVAILABLE = 0;

// 0: Status.Budgeted;
const BUDGET_STATUS_BUDGETED = 0;
const BUDGET_STATUS_PAYING = 1;
const BUDGET_STATUS_CLOSED = 2;
const BUDGET_STATUS_PAID = 3;

// Equivalencia de 0.01 USD en Ether (Wei)
// 1 ETH = 1E+18 Wei = 100 USD > 0.01 USD = 1E+14 Wei
// TODO Este valor debe establerse por un Oracle.
const USD_ETH_RATE = new BN('100000000000000');

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
    let CREATE_DAC_ROLE, CREATE_CAMPAIGN_ROLE, CREATE_MILESTONE_ROLE, EXCHANGE_RATE_ROLE;
    let TRANSFER_ROLE;
    let ETH

    before(async () => {
        crowdfundingBase = await newCrowdfunding(deployer);
        vaultBase = await Vault.new({ from: deployer });
        // Setup constants
        CREATE_DAC_ROLE = await crowdfundingBase.CREATE_DAC_ROLE();
        CREATE_CAMPAIGN_ROLE = await crowdfundingBase.CREATE_CAMPAIGN_ROLE();
        CREATE_MILESTONE_ROLE = await crowdfundingBase.CREATE_MILESTONE_ROLE();
        EXCHANGE_RATE_ROLE = await crowdfundingBase.EXCHANGE_RATE_ROLE();
        TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()

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
        await createPermission(acl, delegate, crowdfunding.address, CREATE_DAC_ROLE, deployer);
        await createPermission(acl, campaignManager, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
        await createPermission(acl, milestoneManager, crowdfunding.address, CREATE_MILESTONE_ROLE, deployer);
        await createPermission(acl, deployer, crowdfunding.address, EXCHANGE_RATE_ROLE, deployer);
        await createPermission(acl, crowdfunding.address, vault.address, TRANSFER_ROLE, deployer);

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

            let dacs = await getDacs(crowdfunding);

            assert.equal(dacs.length, 1)
            assertDac(dacs[0], {
                id: 1,
                infoCid: INFO_CID,
                users: [delegate],
                campaignIds: [],
                budgetIdsLength: 0,
                status: DAC_STATUS_ACTIVE
            });

            let entity = await crowdfunding.getEntity(dacId);
            assertEntity(entity, {
                id: 1,
                entityType: ENTITY_TYPE_DAC,
                budgetIdsLength: 0
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

            let campaigns = await getCampaigns(crowdfunding);
            assert.equal(campaigns.length, 1)
            assertCampaign(campaigns[0], {
                id: 2,
                infoCid: INFO_CID,
                users: [campaignManager, campaignReviewer],
                dacIds: [dacId],
                milestoneIds: [],
                budgetIdsLength: 0,
                status: CAMPAIGN_STATUS_ACTIVE
            });

            let entity = await crowdfunding.getEntity(campaignId);
            assertEntity(entity, {
                id: 2,
                entityType: ENTITY_TYPE_CAMPAIGN,
                budgetIdsLength: 0
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

            let fiatAmountTarget = 10;

            let receipt = await crowdfunding.newMilestone(
                INFO_CID,
                campaignId,
                fiatAmountTarget,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                { from: milestoneManager });

            let milestoneId = getEventArgument(receipt, 'NewMilestone', 'id');
            assert.equal(milestoneId, 3);

            let milestones = await getMilestones(crowdfunding);
            assert.equal(milestones.length, 1)
            assertMilestone(milestones[0], {
                id: 3,
                infoCid: INFO_CID,
                fiatAmountTarget: fiatAmountTarget,
                users: [milestoneManager, milestoneReviewer, campaignReviewer, milestoneRecipient],
                campaignId: campaignId,
                budgetIdsLength: 0,
                activityIdsLength: 0,
                status: MILESTONE_STATUS_ACTIVE
            });

            let entity = await crowdfunding.getEntity(milestoneId);
            assertEntity(entity, {
                id: 3,
                entityType: ENTITY_TYPE_MILESTONE,
                budgetIdsLength: 0
            });
        });

        it('Creación de Milestone no autorizado', async () => {

            let dacId = await newDac(crowdfunding, delegate, '1');
            let campaignId = await newCampaign(crowdfunding, campaignManager, campaignReviewer, dacId);

            let fiatAmountTarget = 10;

            // El delegate no tiene configurada la autorización para crear milestones.
            await assertRevert(
                crowdfunding.newMilestone(
                    INFO_CID,
                    campaignId,
                    fiatAmountTarget,
                    milestoneReviewer,
                    milestoneRecipient,
                    campaignReviewer,
                    { from: delegate })
                , errors.APP_AUTH_FAILED)
        });

        it('Creación de Milestone con Campaign inexistente', async () => {

            // La Campaign con Id 1 no existe.
            let campaignId = 1;

            let fiatAmountTarget = 10;

            await assertRevert(crowdfunding.newMilestone(
                INFO_CID,
                campaignId,
                fiatAmountTarget,
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

            let dac = await crowdfunding.getDac(dacId);

            let budgets = await getBudgets(crowdfunding, dac);
            assert.equal(budgets.length, 1)
            assertBudget(budgets[0], {
                id: 1,
                entityId: dacId,
                token: ETH,
                amount: amount,
                donationIds: [1],
                status: BUDGET_STATUS_BUDGETED
            });

            let entityDonations = await getDonations(crowdfunding, dac.donationIds);
            assert.equal(entityDonations.length, 1)
            assertDonation(entityDonations[0], {
                id: 1,
                giver: giver,
                token: ETH,
                amount: amount,
                amountRemainding: amount,
                entityId: dacId,
                status: DONATION_STATUS_AVAILABLE
            });

            let budgetDonations = await getDonations(crowdfunding, budgets[0].donationIds);
            assert.equal(budgetDonations.length, 1)
            assertDonation(budgetDonations[0], {
                id: 1,
                giver: giver,
                token: ETH,
                amount: amount,
                amountRemainding: amount,
                entityId: dacId,
                status: DONATION_STATUS_AVAILABLE
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

            let campaign = await crowdfunding.getCampaign(campaignId);

            let budgets = await getBudgets(crowdfunding, campaign);
            assert.equal(budgets.length, 1)
            assertBudget(budgets[0], {
                id: 1,
                entityId: campaignId,
                token: ETH,
                amount: amount,
                donationIds: [1],
                status: BUDGET_STATUS_BUDGETED
            });

            let entityDonations = await getDonations(crowdfunding, campaign.donationIds);
            assert.equal(entityDonations.length, 1)
            assertDonation(entityDonations[0], {
                id: 1,
                giver: giver,
                token: ETH,
                amount: amount,
                amountRemainding: amount,
                entityId: campaignId,
                status: DONATION_STATUS_AVAILABLE
            });

            let budgetDonations = await getDonations(crowdfunding, budgets[0].donationIds);
            assert.equal(budgetDonations.length, 1)
            assertDonation(budgetDonations[0], {
                id: 1,
                giver: giver,
                token: ETH,
                amount: amount,
                amountRemainding: amount,
                entityId: campaignId,
                status: DONATION_STATUS_AVAILABLE
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

            let milestone = await crowdfunding.getMilestone(milestoneId);

            let budgets = await getBudgets(crowdfunding, milestone);
            assert.equal(budgets.length, 1)
            assertBudget(budgets[0], {
                id: 1,
                entityId: milestoneId,
                token: ETH,
                amount: amount,
                donationIds: [1],
                status: BUDGET_STATUS_BUDGETED
            });

            let entityDonations = await getDonations(crowdfunding, milestone.donationIds);
            assert.equal(entityDonations.length, 1)
            assertDonation(entityDonations[0], {
                id: 1,
                giver: giver,
                token: ETH,
                amount: amount,
                amountRemainding: amount,
                entityId: milestoneId,
                status: DONATION_STATUS_AVAILABLE
            });

            let budgetDonations = await getDonations(crowdfunding, budgets[0].donationIds);
            assert.equal(budgetDonations.length, 1)
            assertDonation(budgetDonations[0], {
                id: 1,
                giver: giver,
                token: ETH,
                amount: amount,
                amountRemainding: amount,
                entityId: milestoneId,
                status: DONATION_STATUS_AVAILABLE
            });

            // Assert desde el Vault
            assert.equal(await vault.balance(ETH), amount, 'Los tokens donados deben estar en el Vault.');
        })
    })

    for (const { title, tokenContract } of tokenTestGroups) {
        context(`Donación de Token ERC20 (${title})`, () => {
            let tokenInstance;
            let dacId, campaignId, milestoneId;
            const amount = new BN('10');

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
                assert.equal(receiptAmount.toString(), amount.toString());

                let dac = await crowdfunding.getDac(dacId);

                let budgets = await getBudgets(crowdfunding, dac);
                assert.equal(budgets.length, 1)
                assertBudget(budgets[0], {
                    id: 1,
                    entityId: dacId,
                    token: tokenInstance.address,
                    amount: amount,
                    donationIds: [1],
                    status: BUDGET_STATUS_BUDGETED
                });

                let entityDonations = await getDonations(crowdfunding, dac.donationIds);
                assert.equal(entityDonations.length, 1)
                assertDonation(entityDonations[0], {
                    id: 1,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: dacId,
                    status: DONATION_STATUS_AVAILABLE
                });

                let budgetDonations = await getDonations(crowdfunding, budgets[0].donationIds);
                assert.equal(budgetDonations.length, 1)
                assertDonation(budgetDonations[0], {
                    id: 1,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: dacId,
                    status: DONATION_STATUS_AVAILABLE
                });

                // Assert desde el Vault
                assert.equal(await vault.balance(tokenInstance.address), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
                // Assert desde el Token
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
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
                assert.equal(receiptAmount.toString(), amount.toString());

                let campaign = await crowdfunding.getCampaign(campaignId);

                let budgets = await getBudgets(crowdfunding, campaign);
                assert.equal(budgets.length, 1)
                assertBudget(budgets[0], {
                    id: 1,
                    entityId: campaignId,
                    token: tokenInstance.address,
                    amount: amount,
                    donationIds: [1],
                    status: BUDGET_STATUS_BUDGETED
                });

                let entityDonations = await getDonations(crowdfunding, campaign.donationIds);
                assert.equal(entityDonations.length, 1)
                assertDonation(entityDonations[0], {
                    id: 1,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: campaignId,
                    status: DONATION_STATUS_AVAILABLE
                });

                let budgetDonations = await getDonations(crowdfunding, budgets[0].donationIds);
                assert.equal(budgetDonations.length, 1)
                assertDonation(budgetDonations[0], {
                    id: 1,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: campaignId,
                    status: DONATION_STATUS_AVAILABLE
                });

                // Assert desde el Vault
                assert.equal(await vault.balance(tokenInstance.address), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
                // Assert desde el Token
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
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
                assert.equal(receiptAmount.toString(), amount.toString());

                let milestone = await crowdfunding.getMilestone(milestoneId);

                let budgets = await getBudgets(crowdfunding, milestone);
                assert.equal(budgets.length, 1)
                assertBudget(budgets[0], {
                    id: 1,
                    entityId: milestoneId,
                    token: tokenInstance.address,
                    amount: amount,
                    donationIds: [1],
                    status: BUDGET_STATUS_BUDGETED
                });

                let entityDonations = await getDonations(crowdfunding, milestone.donationIds);
                assert.equal(entityDonations.length, 1)
                assertDonation(entityDonations[0], {
                    id: 1,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: milestoneId,
                    status: DONATION_STATUS_AVAILABLE
                });

                let budgetDonations = await getDonations(crowdfunding, budgets[0].donationIds);
                assert.equal(budgetDonations.length, 1)
                assertDonation(budgetDonations[0], {
                    id: 1,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: milestoneId,
                    status: DONATION_STATUS_AVAILABLE
                });

                // Assert desde el Vault
                assert.equal(await vault.balance(tokenInstance.address), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
                // Assert desde el Token
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
            })
        })
    }

    context('Transferencia', function () {

        let dacId1, dacId2, campaignId1, campaignId2, milestoneId1, milestoneId2;
        let donationAmount, donationId1, donationId2, donationId3, donationId4;

        beforeEach(async () => {

            dacId1 = await newDac(crowdfunding, delegate);
            dacId2 = await newDac(crowdfunding, delegate);
            campaignId1 = await newCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId1);
            campaignId2 = await newCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId2);
            milestoneId1 = await newMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId1);
            milestoneId2 = await newMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId2);
            donationAmount = new BN('10');
            // Donación de ETH a DAC 1
            donationId1 = await newDonationEther(crowdfunding,
                dacId1,
                ETH,
                donationAmount,
                giver);
            // Donación de ETH a Campaign 1
            donationId2 = await newDonationEther(crowdfunding,
                campaignId1,
                ETH,
                donationAmount,
                giver);
            // Donación de ETH a Milestone 1
            donationId3 = await newDonationEther(crowdfunding,
                milestoneId1,
                ETH,
                donationAmount,
                giver);
            // Donación de ETH a DAC 2
            donationId4 = await newDonationEther(crowdfunding,
                dacId2,
                ETH,
                donationAmount,
                giver);
        });

        it('Transferencia de ETH de Dac a Campaign', async () => {

            const receipt = await crowdfunding.transfer(dacId1, campaignId1, [donationId1], { from: delegate });
            const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
            const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
            const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');
            const receiptAmount = getEventArgument(receipt, 'Transfer', 'amount');

            assert.equal(receiptEntityIdFrom, dacId1);
            assert.equal(receiptEntityIdTo, campaignId1);
            assert.equal(receiptDonationId, donationId1);
            assert.equal(receiptAmount.toString(), donationAmount.toString());

            let budgetFrom = await getBudget(crowdfunding, dacId1, ETH);
            assertBudget(budgetFrom, {
                entityId: dacId1,
                token: ETH,
                amount: new BN(0),
                donationIds: [],
                status: BUDGET_STATUS_BUDGETED
            });

            let budgetTo = await getBudget(crowdfunding, campaignId1, ETH);
            assertBudget(budgetTo, {
                entityId: campaignId1,
                token: ETH,
                amount: donationAmount.add(donationAmount), // Donación inicial + transferencia
                donationIds: [donationId2, donationId1],
                status: BUDGET_STATUS_BUDGETED
            });
        })

        it('Transferencia de ETH de Dac a Milestone', async () => {

            const receipt = await crowdfunding.transfer(dacId1, milestoneId1, [donationId1], { from: delegate });
            const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
            const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
            const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');
            const receiptAmount = getEventArgument(receipt, 'Transfer', 'amount');

            assert.equal(receiptEntityIdFrom, dacId1);
            assert.equal(receiptEntityIdTo, milestoneId1);
            assert.equal(receiptDonationId, donationId1);
            assert.equal(receiptAmount.toString(), donationAmount.toString());

            let budgetFrom = await getBudget(crowdfunding, dacId1, ETH);
            assertBudget(budgetFrom, {
                entityId: dacId1,
                token: ETH,
                amount: new BN(0),
                donationIds: [],
                status: BUDGET_STATUS_BUDGETED
            });

            let budgetTo = await getBudget(crowdfunding, milestoneId1, ETH);
            assertBudget(budgetTo, {
                entityId: milestoneId1,
                token: ETH,
                amount: donationAmount.add(donationAmount), // Donación inicial + transferencia
                donationIds: [donationId3, donationId1],
                status: BUDGET_STATUS_BUDGETED
            });
        })

        it('Transferencia de ETH de Campaign a Milestone', async () => {

            const receipt = await crowdfunding.transfer(campaignId1, milestoneId1, [donationId2], { from: campaignManager });
            const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
            const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
            const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');
            const receiptAmount = getEventArgument(receipt, 'Transfer', 'amount');

            assert.equal(receiptEntityIdFrom, campaignId1);
            assert.equal(receiptEntityIdTo, milestoneId1);
            assert.equal(receiptDonationId, donationId2);
            assert.equal(receiptAmount.toString(), donationAmount.toString());

            let budgetFrom = await getBudget(crowdfunding, campaignId1, ETH);
            assertBudget(budgetFrom, {
                entityId: campaignId1,
                token: ETH,
                amount: new BN(0),
                donationIds: [],
                status: BUDGET_STATUS_BUDGETED
            });

            let budgetTo = await getBudget(crowdfunding, milestoneId1, ETH);
            assertBudget(budgetTo, {
                entityId: milestoneId1,
                token: ETH,
                amount: donationAmount.add(donationAmount), // Donación inicial + transferencia
                donationIds: [donationId3, donationId2],
                status: BUDGET_STATUS_BUDGETED
            });
        })

        it('Transferencia de ETH de Dac a Campaign no autorizada', async () => {

            // notAuthorized account no es el delegate de la Dac
            await assertRevert(crowdfunding.transfer(
                dacId1,
                campaignId1,
                [donationId1],
                { from: notAuthorized }),
                errors.CROWDFUNDING_TRANSFER_NOT_AUTHORIZED);
        })

        it('Transferencia de ETH de Dac a Milestone no autorizada', async () => {

            // notAuthorized account no es el delegate de la Dac
            await assertRevert(crowdfunding.transfer(
                dacId1,
                milestoneId1,
                [donationId1],
                { from: notAuthorized }),
                errors.CROWDFUNDING_TRANSFER_NOT_AUTHORIZED);
        })

        it('Transferencia de ETH de Campaing a Milestone no autorizada', async () => {

            // notAuthorized account no es el manager de la Campaign
            await assertRevert(crowdfunding.transfer(
                campaignId1,
                milestoneId1,
                [donationId1],
                { from: notAuthorized }),
                errors.CROWDFUNDING_TRANSFER_NOT_AUTHORIZED);
        })

        it('Transferencia de ETH de Dac no activa', async () => {

        })

        it('Transferencia de ETH de Campaign no activa', async () => {

        })

        it('Transferencia de ETH de Dac a Campaign que no le pertenece', async () => {

            // La Campaing 2 no le pertenece al Dac 1
            await assertRevert(crowdfunding.transfer(
                dacId1,
                campaignId2,
                [donationId1],
                { from: delegate }),
                errors.CROWDFUNDING_TRANSFER_CAMPAIGN_NOT_BELONGS_DAC);
        })

        it('Transferencia de ETH de Dac a Campaign de donación que no le pertenece', async () => {

            // La donación 2 no le pertenece a la Dac 2.
            await assertRevert(crowdfunding.transfer(
                dacId1,
                campaignId1,
                [donationId2],
                { from: delegate }),
                errors.CROWDFUNDING_TRANSFER_DONATION_NOT_BELONGS_ORIGIN);
        })
    })

    for (const { title, tokenContract } of tokenTestGroups) {
        context(`Transferencia de Token ERC20 (${title})`, () => {
            let tokenInstance;
            let dacId, campaignId, milestoneId;
            let donationAmount, donationId1, donationId2, donationId3;

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
                donationAmount = new BN('10');

                // Set up a new token similar to token1's distribution
                tokenInstance = await tokenContract.new(giver, 10000 + VAULT_INITIAL_TOKEN1_BALANCE)
                await tokenInstance.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE, { from: giver })
                // Donación del Token a DAC
                donationId1 = await newDonationToken(crowdfunding,
                    tokenInstance,
                    dacId,
                    donationAmount,
                    giver);
                // Donación del Token a Campaign
                donationId2 = await newDonationToken(crowdfunding,
                    tokenInstance,
                    campaignId,
                    donationAmount,
                    giver);
                // Donación del Token a Milestone
                donationId3 = await newDonationToken(crowdfunding,
                    tokenInstance,
                    milestoneId,
                    donationAmount,
                    giver);
            })

            it(`Transferencia de Token ERC20 (${title}) de Dac a Campaign`, async () => {

                const receipt = await crowdfunding.transfer(dacId, campaignId, [donationId1], { from: delegate });
                const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
                const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
                const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');
                const receiptAmount = getEventArgument(receipt, 'Transfer', 'amount');

                assert.equal(receiptEntityIdFrom, dacId);
                assert.equal(receiptEntityIdTo, campaignId);
                assert.equal(receiptDonationId, donationId1);
                assert.equal(receiptAmount.toString(), donationAmount.toString());

                let budgetFrom = await getBudget(crowdfunding, dacId, tokenInstance.address);
                assertBudget(budgetFrom, {
                    entityId: dacId,
                    token: tokenInstance.address,
                    amount: new BN(0),
                    donationIds: [],
                    status: BUDGET_STATUS_BUDGETED
                });

                let budgetTo = await getBudget(crowdfunding, campaignId, tokenInstance.address);
                assertBudget(budgetTo, {
                    entityId: campaignId,
                    token: tokenInstance.address,
                    amount: donationAmount.add(donationAmount), // Donación inicial + transferencia
                    donationIds: [donationId2, donationId1],
                    status: BUDGET_STATUS_BUDGETED
                });
            })

            it(`Transferencia de Token ERC20 (${title}) de Dac a Campaign`, async () => {

                const receipt = await crowdfunding.transfer(dacId, milestoneId, [donationId1], { from: delegate });
                const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
                const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
                const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');
                const receiptAmount = getEventArgument(receipt, 'Transfer', 'amount');

                assert.equal(receiptEntityIdFrom, dacId);
                assert.equal(receiptEntityIdTo, milestoneId);
                assert.equal(receiptDonationId, donationId1);
                assert.equal(receiptAmount.toString(), donationAmount.toString());

                let budgetFrom = await getBudget(crowdfunding, dacId, tokenInstance.address);
                assertBudget(budgetFrom, {
                    entityId: dacId,
                    token: tokenInstance.address,
                    amount: 0,
                    donationIds: [],
                    status: BUDGET_STATUS_BUDGETED
                });

                let budgetTo = await getBudget(crowdfunding, milestoneId, tokenInstance.address);
                assertBudget(budgetTo, {
                    entityId: milestoneId,
                    token: tokenInstance.address,
                    amount: donationAmount.add(donationAmount), // Donación inicial + transferencia
                    donationIds: [donationId3, donationId1],
                    status: BUDGET_STATUS_BUDGETED
                });
            })

            it(`Transferencia de Token ERC20 (${title}) de Campaign a Milestone`, async () => {

                const receipt = await crowdfunding.transfer(campaignId, milestoneId, [donationId2], { from: campaignManager });
                const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
                const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
                const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');
                const receiptAmount = getEventArgument(receipt, 'Transfer', 'amount');

                assert.equal(receiptEntityIdFrom, campaignId);
                assert.equal(receiptEntityIdTo, milestoneId);
                assert.equal(receiptDonationId, donationId2);
                assert.equal(receiptAmount.toString(), donationAmount.toString());

                let budgetFrom = await getBudget(crowdfunding, campaignId, tokenInstance.address);
                assertBudget(budgetFrom, {
                    entityId: campaignId,
                    token: tokenInstance.address,
                    amount: 0,
                    donationIds: [],
                    status: BUDGET_STATUS_BUDGETED
                });

                let budgetTo = await getBudget(crowdfunding, milestoneId, tokenInstance.address);
                assertBudget(budgetTo, {
                    entityId: milestoneId,
                    token: tokenInstance.address,
                    amount: donationAmount.add(donationAmount), // Donación inicial + transferencia
                    donationIds: [donationId3, donationId2],
                    status: BUDGET_STATUS_BUDGETED
                });
            })
        })
    }

    context('Milestone - Operaciones', function () {

        let dacId1, campaignId1, milestoneId1;

        beforeEach(async () => {

            dacId1 = await newDac(crowdfunding, delegate);
            campaignId1 = await newCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId1);
            milestoneId1 = await newMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId1);
        });

        it('Milestone Completado', async () => {

            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.status, MILESTONE_STATUS_COMPLETED);

            let activityId = 1;
            assert.equal(milestone.activityIds.length, 1);
            let activity = await crowdfunding.getActivity(activityId);
            assertActivity(activity, {
                id: activityId,
                infoCid: INFO_CID,
                user: milestoneManager,
                milestoneId: milestoneId1
            });
        })

        it('Milestone Completado no autorizado', async () => {

            // notAuthorized account no es el manager del milestone.
            await assertRevert(
                crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: notAuthorized }),
                errors.CROWDFUNDING_AUTH_FAILED);
        })

        it('Milestone Completado no activo', async () => {

            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });
            await crowdfunding.milestoneReview(milestoneId1, true, INFO_CID, { from: milestoneReviewer });

            // Un Milestone Aprobado no puede volver a estar Completado.
            await assertRevert(
                crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager }),
                errors.CROWDFUNDING_MILESTONE_COMPLETE_NOT_ACTIVE);
        })

        it('Milestone Aprobado por Milestone Reviewer', async () => {

            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });
            await crowdfunding.milestoneReview(milestoneId1, true, INFO_CID, { from: milestoneReviewer });

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.status, MILESTONE_STATUS_APPROVED);
        })

        it('Milestone Aprobado por Campaign Reviewer', async () => {

            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });
            await crowdfunding.milestoneReview(milestoneId1, true, INFO_CID, { from: campaignReviewer });

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.status, MILESTONE_STATUS_APPROVED);
        })

        it('Milestone Aprobado no autorizado', async () => {

            // notAuthorized account no es el reviewer del milestone ni el campaign manager.
            await assertRevert(
                crowdfunding.milestoneReview(milestoneId1, true, INFO_CID, { from: notAuthorized }),
                errors.CROWDFUNDING_AUTH_FAILED);
        })

        it('Milestone Rechazado por Milestone Reviewer', async () => {

            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });
            await crowdfunding.milestoneReview(milestoneId1, false, INFO_CID, { from: milestoneReviewer });

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.status, MILESTONE_STATUS_REJECTED);
        })

        it('Milestone Rechazado por Campaign Reviewer', async () => {

            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });
            await crowdfunding.milestoneReview(milestoneId1, false, INFO_CID, { from: campaignReviewer });

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.status, MILESTONE_STATUS_REJECTED);
        })

        it('Milestone Rechazado no autorizado', async () => {

            // notAuthorized account no es el reviewer del milestone ni el campaign manager.
            await assertRevert(
                crowdfunding.milestoneReview(milestoneId1, false, INFO_CID, { from: notAuthorized }),
                errors.CROWDFUNDING_AUTH_FAILED);
        })
    })

    context('Withdraw', function () {

        let dacId1, campaignId1, milestoneId1;
        let donationId1, donationId2, donationId3;
        // 10 ETH > 1E+019 Wei
        const donationAmount = new BN('10000000000000000000');

        beforeEach(async () => {

            dacId1 = await newDac(crowdfunding, delegate);
            campaignId1 = await newCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId1);
            milestoneId1 = await newMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId1);
            // Donación de ETH a DAC 1
            donationId1 = await newDonationEther(crowdfunding,
                dacId1,
                ETH,
                donationAmount,
                giver);
            // Donación de ETH a Campaign 1
            donationId2 = await newDonationEther(crowdfunding,
                campaignId1,
                ETH,
                donationAmount,
                giver);
            // Donación de ETH a Milestone 1
            donationId3 = await newDonationEther(crowdfunding,
                milestoneId1,
                ETH,
                donationAmount,
                giver);
        });

        it('Withdraw ETH', async () => {

            // Se carga cotización de ETH
            // TODO Esto debiera hacerse a través de un Oracle.
            await crowdfunding.setExchangeRate(ETH, USD_ETH_RATE, { from: deployer });

            // Inicialmente de completa y aprueba el milestone.
            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });
            await crowdfunding.milestoneReview(milestoneId1, true, INFO_CID, { from: campaignReviewer });

            let receipt = await crowdfunding.milestoneWithdraw(milestoneId1, { from: milestoneRecipient });

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.status, MILESTONE_STATUS_FINISHED);

            // Estado de los presupuestos

            let budgetMilestone = await getBudget(crowdfunding, milestoneId1, ETH);
            assertBudget(budgetMilestone, {
                entityId: milestoneId1,
                token: ETH,
                amount: FIAT_AMOUNT_TARGET.mul(USD_ETH_RATE), // El presupuesto pagado es el target dividido la cotización.
                donationIds: [],
                status: BUDGET_STATUS_PAID
            });

            let budgetCampaign = await getBudget(crowdfunding, campaignId1, ETH);
            assertBudget(budgetCampaign, {
                entityId: campaignId1,
                token: ETH,
                amount: donationAmount.add(donationAmount.sub(FIAT_AMOUNT_TARGET.mul(USD_ETH_RATE))), // La donación inicial + el restante del retiro del milestone.
                donationIds: [donationId2, donationId3],
                status: BUDGET_STATUS_BUDGETED
            });

            // Estado de la donación sobre el Milestone
            // Se transfirió el remanente a la Campaign.

            let donations = await getDonations(crowdfunding, budgetCampaign.donationIds);
            assert.equal(donations.length, 2);
            // La 2da donación es la transferida.
            assertDonation(donations[1], {
                id: 3,
                giver: giver,
                token: ETH,
                amount: donationAmount,
                amountRemainding: donationAmount.sub(FIAT_AMOUNT_TARGET.mul(USD_ETH_RATE)),
                entityId: milestoneId1,
                status: DONATION_STATUS_AVAILABLE
            });
        })

        it('Withdraw ETH no autorizado', async () => {

            // notAuthorized account no es el destinatario del milestone.
            await assertRevert(
                crowdfunding.milestoneWithdraw(milestoneId1, { from: notAuthorized }),
                errors.CROWDFUNDING_AUTH_FAILED);
        })

        it('Withdraw ETH no aprobado', async () => {

            // Se carga cotización de ETH
            // TODO Esto debiera hacerse a través de un Oracle.
            await crowdfunding.setExchangeRate(ETH, USD_ETH_RATE, { from: deployer });

            // El Milestone no está aprobado, por lo que no pueden retirarse los fondos.
            await assertRevert(
                crowdfunding.milestoneWithdraw(milestoneId1, { from: milestoneRecipient }),
                errors.CROWDFUNDING_WITHDRAW_NOT_APPROVED);
        })

        it('Withdraw ETH sin cotización', async () => {

            // Inicialmente de completa y aprueba el milestone.
            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });
            await crowdfunding.milestoneReview(milestoneId1, true, INFO_CID, { from: campaignReviewer });

            // Como no se determinó la cotización del ETH, entonces debe recharse el retiro.
            await assertRevert(
                crowdfunding.milestoneWithdraw(milestoneId1, { from: milestoneRecipient }),
                errors.CROWDFUNDING_EXCHANGE_RATE_NOT_EXISTS);
        })
    })

    context('Exchange Rate', function () {

        beforeEach(async () => {


        });

        it('Set Exchange Rate ETH', async () => {

            await crowdfunding.setExchangeRate(ETH, USD_ETH_RATE, { from: deployer });

            let exchangeRate = await crowdfunding.exchangeRates(ETH);
            assert.equal(exchangeRate.token, ETH);
            assert.equal(exchangeRate.rate.toString(), USD_ETH_RATE.toString());
            //assert.isAbove(exchangeRate.date.toNumber(), before);
        })

        it('Set Exchange Rate ETH no autorizado', async () => {

            // notAuthorized account no está autorizado a cambiar la cotización del ETH
            await assertRevert(
                crowdfunding.setExchangeRate(
                    ETH,
                    USD_ETH_RATE,
                    { from: notAuthorized }),
                errors.APP_AUTH_FAILED)
        })
    })
})
