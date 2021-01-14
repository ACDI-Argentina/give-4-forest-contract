const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { newDao, newApp } = require('../scripts/dao')
const { createPermission, grantPermission } = require('../scripts/permissions')
const { newCrowdfunding,
    saveDac,
    saveCampaign,
    saveMilestone,
    newDonationEther,
    newDonationToken,
    getDacs,
    getCampaigns,
    getMilestones,
    getDonations,
    INFO_CID,
    FIAT_AMOUNT_TARGET } = require('./helpers/crowdfunding')
const { assertDac,
    assertCampaign,
    assertMilestone,
    assertActivity,
    assertDonation } = require('./helpers/asserts')
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

//Price providers
const ExchangeRateProvider = artifacts.require('ExchangeRateProvider');
const PriceProviderMock = artifacts.require('./mocks/PriceProviderMock')


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

// Equivalencia de 0.01 USD en Ether (Wei)
// 1 ETH = 1E+18 Wei = 100 USD > 0.01 USD = 1E+14 Wei
// TODO Este valor debe establerse por un Oracle.

const USD_ETH_RATE = new BN('766260038006'); //Correspond to BTC Price of 13.0504

contract('Crowdfunding App', (accounts) => {
    const [
        deployer,
        giver,
        registeredUser,
        delegate,
        campaignManager,
        campaignReviewer,
        milestoneManager,
        milestoneReviewer,
        milestoneRecipient,
        notAuthorized,
        campaignManager2,
        campaignManager3,
    ] = accounts;

    let crowdfundingBase, crowdfunding;
    let vaultBase, vault;
    let CREATE_DAC_ROLE, CREATE_CAMPAIGN_ROLE, CREATE_MILESTONE_ROLE, EXCHANGE_RATE_ROLE, ENABLE_TOKEN_ROLE, SET_EXCHANGE_RATE_PROVIDER;
    let TRANSFER_ROLE;
    let RBTC

    before(async () => {
        crowdfundingBase = await newCrowdfunding(deployer);
        vaultBase = await Vault.new({ from: deployer });
        // Setup constants
        CREATE_DAC_ROLE = await crowdfundingBase.CREATE_DAC_ROLE();
        CREATE_CAMPAIGN_ROLE = await crowdfundingBase.CREATE_CAMPAIGN_ROLE();
        CREATE_MILESTONE_ROLE = await crowdfundingBase.CREATE_MILESTONE_ROLE();
        EXCHANGE_RATE_ROLE = await crowdfundingBase.EXCHANGE_RATE_ROLE();
        SET_EXCHANGE_RATE_PROVIDER = await crowdfundingBase.SET_EXCHANGE_RATE_PROVIDER();
        ENABLE_TOKEN_ROLE = await crowdfundingBase.ENABLE_TOKEN_ROLE();
        TRANSFER_ROLE = await vaultBase.TRANSFER_ROLE()

        const ethConstant = await EtherTokenConstantMock.new()
        RBTC = await ethConstant.getETHConstant()
    })

    beforeEach(async () => {
        try {
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
            await createPermission(acl, deployer, crowdfunding.address, SET_EXCHANGE_RATE_PROVIDER, deployer);
            await createPermission(acl, deployer, crowdfunding.address, ENABLE_TOKEN_ROLE, deployer);
            await createPermission(acl, crowdfunding.address, vault.address, TRANSFER_ROLE, deployer);

            await grantPermission(acl, campaignManager2, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);
            await grantPermission(acl, campaignManager3, crowdfunding.address, CREATE_CAMPAIGN_ROLE, deployer);

            // Inicialización
            await vault.initialize()
            await crowdfunding.initialize(vault.address);

        } catch (err) {
            console.log(err);
        }
    });

    context('Inicialización', function () {

        it('Falla al reinicializar', async () => {
            await assertRevert(crowdfunding.initialize(vault.address), errors.INIT_ALREADY_INITIALIZED)
        })
    });

    context('Manejo de DACs', function () {

        it('Creación de Dac', async () => {

            let receipt = await crowdfunding.saveDac(INFO_CID, 0,{ from: delegate });

            let dacId = getEventArgument(receipt, 'SaveDac', 'id');
            assert.equal(dacId, 1);

            let dacs = await getDacs(crowdfunding);

            assert.equal(dacs.length, 1)
            assertDac(dacs[0], {
                id: 1,
                infoCid: INFO_CID,
                users: [delegate],
                campaignIds: [],
                budgetDonationIdsLength: 0,
                status: DAC_STATUS_ACTIVE
            });
        });

        it('Creación de Dac no autorizado', async () => {

            await assertRevert(crowdfunding.saveDac(
                INFO_CID,
                0,
                { from: notAuthorized }
            ), errors.APP_AUTH_FAILED)
        });

        it('Edición de Dac', async () => {
            const receipt = await crowdfunding.saveDac(INFO_CID, 0,{ from: delegate });
            const dacId = getEventArgument(receipt, 'SaveDac', 'id');

            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";
            const receiptUpdated = await crowdfunding.saveDac(NEW_INFO_CID, dacId,{ from: delegate });
            const updatedDacId = getEventArgument(receiptUpdated, 'SaveDac', 'id');

            assert.equal(dacId.toNumber(), updatedDacId.toNumber());
                      
            const updatedDac = await crowdfunding.getDac(dacId);
        
            assertDac(updatedDac, {
                id: dacId.toNumber(),
                infoCid: NEW_INFO_CID,
                users: [delegate],
                campaignIds: [],
                budgetDonationIdsLength: 0,
                status: DAC_STATUS_ACTIVE
            });
        });
        it('Edición de Dac no autorizado', async () => {

            const receipt = await crowdfunding.saveDac(INFO_CID, 0,{ from: delegate });
            const dacId = getEventArgument(receipt, 'SaveDac', 'id');

            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";

            await assertRevert(
                crowdfunding.saveDac(NEW_INFO_CID, dacId,{ from: campaignManager }),
                errors.APP_AUTH_FAILED
            );

 
        });
        it('Edición de Dac inexistente', async () => {
            await assertRevert(
                crowdfunding.saveDac(INFO_CID, 10,{ from: delegate }),
                errors.CROWDFUNDING_DAC_NOT_EXIST
            );
        });


    });

    context('Manejo de Campaigns', function () {

        it('Creación de Campaign', async () => {

            let dacId = await saveDac(crowdfunding, delegate);

            let receipt = await crowdfunding.saveCampaign(INFO_CID, dacId, campaignReviewer, 0, { from: campaignManager });

            let campaignId = getEventArgument(receipt, 'SaveCampaign', 'id');
            assert.equal(campaignId, 2);

            let campaigns = await getCampaigns(crowdfunding);
            assert.equal(campaigns.length, 1)
            assertCampaign(campaigns[0], {
                id: 2,
                infoCid: INFO_CID,
                users: [campaignManager, campaignReviewer],
                dacIds: [dacId],
                milestoneIds: [],
                budgetDonationIdsLength: 0,
                status: CAMPAIGN_STATUS_ACTIVE
            });
        });

        it('Creación de Campaign no autorizado', async () => {

            let dacId = await saveDac(crowdfunding, delegate);

            // El delegate no tiene configurada la autorización para crear campaigns.
            await assertRevert(
                crowdfunding.saveCampaign(
                    INFO_CID,
                    dacId,
                    campaignReviewer,
                    0,
                    { from: delegate })
                , errors.APP_AUTH_FAILED)
        });

        it('Creación de Campaign con Dac inexistente', async () => {

            // La Dac con Id 1 no existe.
            let dacId = 1;

            await assertRevert(crowdfunding.saveCampaign(
                INFO_CID,
                dacId,
                campaignReviewer,
                0,
                { from: campaignManager }), errors.CROWDFUNDING_DAC_NOT_EXIST)
        })

        it('Modificación de Campaign', async () => {

            const dacId = await saveDac(crowdfunding, delegate);
            const campaignId = await saveCampaign(crowdfunding, campaignManager, campaignReviewer, dacId, 0);

            //modificamos la campaign creada
            const NEW_INFO_CID = "b4B1A3935bF977bad5Ec753325B4CD8D889EF0e7e7c7424";
            const newCampaignReviewer = campaignManager2;
            const receipt = await crowdfunding.saveCampaign(
                NEW_INFO_CID,
                dacId,
                newCampaignReviewer,
                campaignId,
                { from: campaignManager }
            );

            //comprobar que los cambios se realizaron correctamente 
            const updatedCampaignId = getEventArgument(receipt, 'SaveCampaign', 'id');
            const updatedCampaign = await crowdfunding.getCampaign(campaignId);

            assert.equal(updatedCampaignId.toNumber(), campaignId);
            assert.equal(updatedCampaign.infoCid, NEW_INFO_CID);
            assert.equal(updatedCampaign.users[0], campaignManager); //el manager debe permanecer siendo el mismo  
            assert.equal(updatedCampaign.users[1], newCampaignReviewer);

        });

        it('Modificación de Campaign asociación a otra dac', async () => {
            const dacId = await saveDac(crowdfunding, delegate);
            const newDacId = await saveDac(crowdfunding, delegate);

            const campaignId = await saveCampaign(crowdfunding, campaignManager, campaignReviewer, dacId, 0);
            const campaign = await crowdfunding.getCampaign(campaignId);
            const reviewer = campaign.users[1];

            const receipt = await crowdfunding.saveCampaign(
                campaign.infoCid,
                newDacId,
                reviewer,
                campaignId,
                { from: campaignManager }
            );

            //comprobar que los cambios se realizaron correctamente 
            const updatedCampaignId = getEventArgument(receipt, 'SaveCampaign', 'id');
            const updatedCampaign = await crowdfunding.getCampaign(campaignId);

            assert.equal(updatedCampaignId.toNumber(), campaignId);
            assert.equal(updatedCampaign.dacIds[0], newDacId);

            const sourceDac = await crowdfunding.getDac(dacId);
            const targetDac = await crowdfunding.getDac(newDacId);

            const campaignIdBN = new BN(campaignId);
            campaignInSourceDac = sourceDac.campaignIds.find(_campaignId => _campaignId.eq(campaignIdBN))
            campaignInTargetDac = targetDac.campaignIds.find(_campaignId => _campaignId.eq(campaignIdBN))

            assert.notEqual(campaignInTargetDac, undefined, `El campaignId:${campaignId} debe encontrarse en el campaignIds destino`);
            assert.equal(campaignInSourceDac, undefined, `El campaignId:${campaignId} no debe encontrarse en el campaignIds original`);
        });


        it('Modificación de Campaign inexistente', async () => {
            const inexistentCampaignId = 1;
            const dacId = await saveDac(crowdfunding, delegate);
            await assertRevert(
                crowdfunding.saveCampaign(
                    INFO_CID,
                    dacId,
                    campaignReviewer,
                    inexistentCampaignId,
                    { from: campaignManager }
                )
                , errors.CROWDFUNDING_CAMPAIGN_NOT_EXIST)
        });

        it('Modificación de Campaign no autorizada', async () => {
            const dacId = await saveDac(crowdfunding, delegate);
            const campaignId = await saveCampaign(crowdfunding, campaignManager, campaignReviewer, dacId);

            await assertRevert(
                crowdfunding.saveCampaign(
                    INFO_CID,
                    dacId,
                    campaignReviewer,
                    campaignId,
                    { from: campaignManager2 }
                )
                , errors.CROWDFUNDING_AUTH_FAILED)
        });

        it('Modificación de Campaign asociación a dac inexistente', async () => {
            const dacId = await saveDac(crowdfunding, delegate);
            const campaignId = await saveCampaign(crowdfunding, campaignManager, campaignReviewer, dacId, 0);
            const inexistentDacId = 25;

            await assertRevert(
                crowdfunding.saveCampaign(
                    INFO_CID,
                    inexistentDacId,
                    campaignReviewer,
                    campaignId,
                    { from: campaignManager }
                )
                , errors.CROWDFUNDING_DAC_NOT_EXIST)
        });

    });

    context('Manejo de Milestones', function () {

        it('Creación de Milestone', async () => {

            const dacId = await saveDac(crowdfunding, delegate);
            const campaignId = await saveCampaign(crowdfunding, campaignManager, campaignReviewer, dacId);

            let fiatAmountTarget = 10;

            let receipt = await crowdfunding.saveMilestone(
                INFO_CID,
                campaignId,
                fiatAmountTarget,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                0,
                { from: milestoneManager });

            let milestoneId = getEventArgument(receipt, 'SaveMilestone', 'id');
            assert.equal(milestoneId, 3);

            let milestones = await getMilestones(crowdfunding);
            assert.equal(milestones.length, 1)
            assertMilestone(milestones[0], {
                id: 3,
                infoCid: INFO_CID,
                fiatAmountTarget: fiatAmountTarget,
                users: [milestoneManager, milestoneReviewer, campaignReviewer, milestoneRecipient],
                campaignId: campaignId,
                budgetDonationIdsLength: 0,
                activityIdsLength: 0,
                status: MILESTONE_STATUS_ACTIVE
            });
        });

        it('Creación de Milestone no autorizado', async () => {

            const dacId = await saveDac(crowdfunding, delegate);
            let campaignId = await saveCampaign(crowdfunding, campaignManager, campaignReviewer, dacId);

            let fiatAmountTarget = 10;

            // El delegate no tiene configurada la autorización para crear milestones.
            await assertRevert(
                crowdfunding.saveMilestone(
                    INFO_CID,
                    campaignId,
                    fiatAmountTarget,
                    milestoneReviewer,
                    milestoneRecipient,
                    campaignReviewer,
                    0,
                    { from: delegate })
                , errors.APP_AUTH_FAILED)
        });

        it('Creación de Milestone con Campaign inexistente', async () => {

            // La Campaign con Id 1 no existe.
            let campaignId = 1;

            let fiatAmountTarget = 10;

            await assertRevert(crowdfunding.saveMilestone(
                INFO_CID,
                campaignId,
                fiatAmountTarget,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                0,
                { from: milestoneManager }), errors.CROWDFUNDING_CAMPAIGN_NOT_EXIST)
        });
    })

    context('Donación de ETH', function () {

        let dacId, campaignId, milestoneId;

        beforeEach(async () => {

            dacId = await saveDac(crowdfunding, delegate);
            campaignId = await saveCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId);
            milestoneId = await saveMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId);
        });

        it('Donar a Dac con ETH no permido', async () => {

            const amount = 10;

            await assertRevert(crowdfunding.donate(dacId, RBTC, amount, { from: giver }), errors.CROWDFUNDING_DONATE_TOKEN_NOT_ENABLED)
        });

        it('Donar a Dac', async () => {

            await crowdfunding.enableToken(RBTC, { from: deployer });

            const amount = 10

            const receipt = await crowdfunding.donate(dacId, RBTC, amount, { from: giver, value: amount });
            const receiptId = getEventArgument(receipt, 'NewDonation', 'id');
            const receiptEntityId = getEventArgument(receipt, 'NewDonation', 'entityId');
            const receiptToken = getEventArgument(receipt, 'NewDonation', 'token');
            const receiptAmount = getEventArgument(receipt, 'NewDonation', 'amount');

            assert.equal(receiptId, 1);
            assert.equal(receiptEntityId, dacId);
            assert.equal(receiptToken, RBTC);
            assert.equal(receiptAmount, amount);

            let dac = await crowdfunding.getDac(dacId);
            assert.equal(dac.donationIds.length, 1);
            assert.equal(dac.budgetDonationIds.length, 1);

            let donations = await getDonations(crowdfunding, dac.donationIds);
            assert.equal(donations.length, 1)
            assertDonation(donations[0], {
                id: 1,
                giver: giver,
                token: RBTC,
                amount: amount,
                amountRemainding: amount,
                entityId: dacId,
                budgetEntityId: dacId,
                status: DONATION_STATUS_AVAILABLE
            });

            // Assert desde el Vault
            assert.equal(await vault.balance(RBTC), amount, 'Los tokens donados deben estar en el Vault.');
        })

        it('Donar a Campaign', async () => {

            await crowdfunding.enableToken(RBTC, { from: deployer });

            const amount = 10

            const receipt = await crowdfunding.donate(campaignId, RBTC, amount, { from: giver, value: amount });
            const receiptId = getEventArgument(receipt, 'NewDonation', 'id');
            const receiptEntityId = getEventArgument(receipt, 'NewDonation', 'entityId');
            const receiptToken = getEventArgument(receipt, 'NewDonation', 'token');
            const receiptAmount = getEventArgument(receipt, 'NewDonation', 'amount');

            assert.equal(receiptId, 1);
            assert.equal(receiptEntityId, campaignId);
            assert.equal(receiptToken, RBTC);
            assert.equal(receiptAmount, amount);

            let campaign = await crowdfunding.getCampaign(campaignId);
            assert.equal(campaign.donationIds.length, 1);
            assert.equal(campaign.budgetDonationIds.length, 1);

            let donations = await getDonations(crowdfunding, campaign.donationIds);
            assert.equal(donations.length, 1)
            assertDonation(donations[0], {
                id: 1,
                giver: giver,
                token: RBTC,
                amount: amount,
                amountRemainding: amount,
                entityId: campaignId,
                budgetEntityId: campaignId,
                status: DONATION_STATUS_AVAILABLE
            });

            // Assert desde el Vault
            assert.equal(await vault.balance(RBTC), amount, 'Los tokens donados deben estar en el Vault.');
        })

        it('Donar a Milestone', async () => {

            await crowdfunding.enableToken(RBTC, { from: deployer });

            const amount = 10

            const receipt = await crowdfunding.donate(milestoneId, RBTC, amount, { from: giver, value: amount });
            const receiptId = getEventArgument(receipt, 'NewDonation', 'id');
            const receiptEntityId = getEventArgument(receipt, 'NewDonation', 'entityId');
            const receiptToken = getEventArgument(receipt, 'NewDonation', 'token');
            const receiptAmount = getEventArgument(receipt, 'NewDonation', 'amount');

            assert.equal(receiptId, 1);
            assert.equal(receiptEntityId, milestoneId);
            assert.equal(receiptToken, RBTC);
            assert.equal(receiptAmount, amount);

            let milestone = await crowdfunding.getMilestone(milestoneId);
            assert.equal(milestone.donationIds.length, 1);
            assert.equal(milestone.budgetDonationIds.length, 1);

            let donations = await getDonations(crowdfunding, milestone.donationIds);
            assert.equal(donations.length, 1)
            assertDonation(donations[0], {
                id: 1,
                giver: giver,
                token: RBTC,
                amount: amount,
                amountRemainding: amount,
                entityId: milestoneId,
                budgetEntityId: milestoneId,
                status: DONATION_STATUS_AVAILABLE
            });

            // Assert desde el Vault
            assert.equal(await vault.balance(RBTC), amount, 'Los tokens donados deben estar en el Vault.');
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
                dacId = await saveDac(crowdfunding, delegate);
                campaignId = await saveCampaign(crowdfunding,
                    campaignManager,
                    campaignReviewer,
                    dacId);
                milestoneId = await saveMilestone(crowdfunding,
                    milestoneManager,
                    milestoneReviewer,
                    milestoneRecipient,
                    campaignReviewer,
                    campaignId);
            })

            it('Donar a Dac con token no permido', async () => {

                await assertRevert(crowdfunding.donate(dacId, tokenInstance.address, amount, { from: giver }), errors.CROWDFUNDING_DONATE_TOKEN_NOT_ENABLED)
            });

            it('Donar a Dac', async () => {

                await crowdfunding.enableToken(tokenInstance.address, { from: deployer });

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
                assert.equal(dac.donationIds.length, 1);
                assert.equal(dac.budgetDonationIds.length, 1);

                let donations = await getDonations(crowdfunding, dac.donationIds);
                assert.equal(donations.length, 1)
                assertDonation(donations[0], {
                    id: 1,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: dacId,
                    budgetEntityId: dacId,
                    status: DONATION_STATUS_AVAILABLE
                });

                // Assert desde el Vault
                assert.equal(await vault.balance(tokenInstance.address), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
                // Assert desde el Token
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
            });

            it('Donar a Campaign', async () => {

                await crowdfunding.enableToken(tokenInstance.address, { from: deployer });

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
                assert.equal(campaign.donationIds.length, 1);
                assert.equal(campaign.budgetDonationIds.length, 1);

                let donations = await getDonations(crowdfunding, campaign.donationIds);
                assert.equal(donations.length, 1)
                assertDonation(donations[0], {
                    id: 1,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: campaignId,
                    budgetEntityId: campaignId,
                    status: DONATION_STATUS_AVAILABLE
                });

                // Assert desde el Vault
                assert.equal(await vault.balance(tokenInstance.address), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
                // Assert desde el Token
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE.add(amount).toString(), 'Los tokens donados deben estar en el Vault.');
            });

            it('Donar a Milestone', async () => {

                await crowdfunding.enableToken(tokenInstance.address, { from: deployer });

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
                assert.equal(milestone.donationIds.length, 1);
                assert.equal(milestone.budgetDonationIds.length, 1);

                let entityDonations = await getDonations(crowdfunding, milestone.donationIds);
                assert.equal(entityDonations.length, 1)
                assertDonation(entityDonations[0], {
                    id: 1,
                    giver: giver,
                    token: tokenInstance.address,
                    amount: amount,
                    amountRemainding: amount,
                    entityId: milestoneId,
                    budgetEntityId: milestoneId,
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

            await crowdfunding.enableToken(RBTC, { from: deployer });
            dacId1 = await saveDac(crowdfunding, delegate);
            dacId2 = await saveDac(crowdfunding, delegate);
            campaignId1 = await saveCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId1);
            campaignId2 = await saveCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId2);
            milestoneId1 = await saveMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId1);
            milestoneId2 = await saveMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId2);
            donationAmount = new BN('10');
            // Donación de RBTC a DAC 1
            donationId1 = await newDonationEther(crowdfunding,
                dacId1,
                RBTC,
                donationAmount,
                giver);
            // Donación de RBTC a Campaign 1
            donationId2 = await newDonationEther(crowdfunding,
                campaignId1,
                RBTC,
                donationAmount,
                giver);
            // Donación de RBTC a Milestone 1
            donationId3 = await newDonationEther(crowdfunding,
                milestoneId1,
                RBTC,
                donationAmount,
                giver);
            // Donación de RBTC a DAC 2
            donationId4 = await newDonationEther(crowdfunding,
                dacId2,
                RBTC,
                donationAmount,
                giver);
        });

        it('Transferencia de ETH de Dac a Campaign', async () => {

            const receipt = await crowdfunding.transfer(dacId1, campaignId1, [donationId1], { from: delegate });
            const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
            const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
            const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');

            assert.equal(receiptEntityIdFrom, dacId1);
            assert.equal(receiptEntityIdTo, campaignId1);
            assert.equal(receiptDonationId, donationId1);

            let dac = await crowdfunding.getDac(dacId1);
            assert.equal(dac.donationIds.length, 1);
            assert.equal(dac.budgetDonationIds.length, 0);

            let campaign = await crowdfunding.getCampaign(campaignId1);
            assert.equal(campaign.donationIds.length, 1);
            assert.equal(campaign.budgetDonationIds.length, 2);
        })

        it('Transferencia de ETH de Dac a Milestone', async () => {

            const receipt = await crowdfunding.transfer(dacId1, milestoneId1, [donationId1], { from: delegate });
            const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
            const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
            const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');

            assert.equal(receiptEntityIdFrom, dacId1);
            assert.equal(receiptEntityIdTo, milestoneId1);
            assert.equal(receiptDonationId, donationId1);

            let dac = await crowdfunding.getDac(dacId1);
            assert.equal(dac.donationIds.length, 1);
            assert.equal(dac.budgetDonationIds.length, 0);

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.donationIds.length, 1);
            assert.equal(milestone.budgetDonationIds.length, 2);
        })

        it('Transferencia de ETH de Campaign a Milestone', async () => {

            const receipt = await crowdfunding.transfer(campaignId1, milestoneId1, [donationId2], { from: campaignManager });
            const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
            const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
            const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');

            assert.equal(receiptEntityIdFrom, campaignId1);
            assert.equal(receiptEntityIdTo, milestoneId1);
            assert.equal(receiptDonationId, donationId2);

            let campaign = await crowdfunding.getCampaign(campaignId1);
            assert.equal(campaign.donationIds.length, 1);
            assert.equal(campaign.budgetDonationIds.length, 0);

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.donationIds.length, 1);
            assert.equal(milestone.budgetDonationIds.length, 2);
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
                errors.CROWDFUNDING_TRANSFER_DONATION_NOT_BELONGS_BUDGET);
        })
    })

    for (const { title, tokenContract } of tokenTestGroups) {
        context(`Transferencia de Token ERC20 (${title})`, () => {
            let tokenInstance;
            let dacId, campaignId, milestoneId;
            let donationAmount, donationId1, donationId2, donationId3;

            beforeEach(async () => {

                await crowdfunding.enableToken(RBTC, { from: deployer });
                dacId = await saveDac(crowdfunding, delegate);
                campaignId = await saveCampaign(crowdfunding,
                    campaignManager,
                    campaignReviewer,
                    dacId);
                milestoneId = await saveMilestone(crowdfunding,
                    milestoneManager,
                    milestoneReviewer,
                    milestoneRecipient,
                    campaignReviewer,
                    campaignId);
                donationAmount = new BN('10');

                // Set up a new token similar to token1's distribution
                tokenInstance = await tokenContract.new(giver, 10000 + VAULT_INITIAL_TOKEN1_BALANCE)
                await tokenInstance.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE, { from: giver })
                await crowdfunding.enableToken(tokenInstance.address, { from: deployer });
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

                assert.equal(receiptEntityIdFrom, dacId);
                assert.equal(receiptEntityIdTo, campaignId);
                assert.equal(receiptDonationId, donationId1);

                let dac = await crowdfunding.getDac(dacId);
                assert.equal(dac.donationIds.length, 1);
                assert.equal(dac.budgetDonationIds.length, 0);

                let campaign = await crowdfunding.getCampaign(campaignId);
                assert.equal(campaign.donationIds.length, 1);
                assert.equal(campaign.budgetDonationIds.length, 2);
            })

            it(`Transferencia de Token ERC20 (${title}) de Dac a Milestone`, async () => {

                const receipt = await crowdfunding.transfer(dacId, milestoneId, [donationId1], { from: delegate });
                const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
                const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
                const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');

                assert.equal(receiptEntityIdFrom, dacId);
                assert.equal(receiptEntityIdTo, milestoneId);
                assert.equal(receiptDonationId, donationId1);

                let dac = await crowdfunding.getDac(dacId);
                assert.equal(dac.donationIds.length, 1);
                assert.equal(dac.budgetDonationIds.length, 0);

                let milestone = await crowdfunding.getMilestone(milestoneId);
                assert.equal(milestone.donationIds.length, 1);
                assert.equal(milestone.budgetDonationIds.length, 2);
            })

            it(`Transferencia de Token ERC20 (${title}) de Campaign a Milestone`, async () => {

                const receipt = await crowdfunding.transfer(campaignId, milestoneId, [donationId2], { from: campaignManager });
                const receiptEntityIdFrom = getEventArgument(receipt, 'Transfer', 'entityIdFrom');
                const receiptEntityIdTo = getEventArgument(receipt, 'Transfer', 'entityIdTo');
                const receiptDonationId = getEventArgument(receipt, 'Transfer', 'donationId');

                assert.equal(receiptEntityIdFrom, campaignId);
                assert.equal(receiptEntityIdTo, milestoneId);
                assert.equal(receiptDonationId, donationId2);

                let campaign = await crowdfunding.getCampaign(campaignId);
                assert.equal(campaign.donationIds.length, 1);
                assert.equal(campaign.budgetDonationIds.length, 0);

                let milestone = await crowdfunding.getMilestone(milestoneId);
                assert.equal(milestone.donationIds.length, 1);
                assert.equal(milestone.budgetDonationIds.length, 2);
            })
        })
    }

    context('Milestone - Operaciones', function () {

        let dacId1, campaignId1, milestoneId1;

        beforeEach(async () => {

            dacId1 = await saveDac(crowdfunding, delegate);
            campaignId1 = await saveCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId1);
            milestoneId1 = await saveMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId1);
        });

        it('Milestone Completado en estado Activo', async () => {

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

        it('Milestone Completado en estado Rechazado', async () => {

            // Se completa inicialmente.
            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });

            // Se rechaza la completitud del milestone.
            await crowdfunding.milestoneReview(milestoneId1, false, INFO_CID, { from: milestoneReviewer });

            // Se vuelve a completar tras el rechazo.
            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.status, MILESTONE_STATUS_COMPLETED);

            assert.equal(milestone.activityIds.length, 3);

            let activity1 = await crowdfunding.getActivity(1);
            assertActivity(activity1, {
                id: 1,
                infoCid: INFO_CID,
                user: milestoneManager,
                milestoneId: milestoneId1
            });

            let activity2 = await crowdfunding.getActivity(2);
            assertActivity(activity2, {
                id: 2,
                infoCid: INFO_CID,
                user: milestoneReviewer,
                milestoneId: milestoneId1
            });

            let activity3 = await crowdfunding.getActivity(3);
            assertActivity(activity3, {
                id: 3,
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

        it('Milestone Completado no activo ni rechazo', async () => {

            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });
            await crowdfunding.milestoneReview(milestoneId1, true, INFO_CID, { from: milestoneReviewer });

            // Un Milestone Aprobado no puede volver a estar Completado.
            await assertRevert(
                crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager }),
                errors.CROWDFUNDING_MILESTONE_CANNOT_COMPLETE);
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

            await crowdfunding.enableToken(RBTC, { from: deployer });

            //Inicializacion de price provider
            priceProviderMock = await PriceProviderMock.new("13050400000000000000000");
            exchangeRateProvider = await ExchangeRateProvider.new(priceProviderMock.address);
            await crowdfunding.setExchangeRateProvider(exchangeRateProvider.address);

            dacId1 = await saveDac(crowdfunding, delegate);
            campaignId1 = await saveCampaign(crowdfunding,
                campaignManager,
                campaignReviewer,
                dacId1);
            milestoneId1 = await saveMilestone(crowdfunding,
                milestoneManager,
                milestoneReviewer,
                milestoneRecipient,
                campaignReviewer,
                campaignId1);
            // Donación de RBTC a DAC 1
            donationId1 = await newDonationEther(crowdfunding,
                dacId1,
                RBTC,
                donationAmount,
                giver);
            // Donación de RBTC a Campaign 1
            donationId2 = await newDonationEther(crowdfunding,
                campaignId1,
                RBTC,
                donationAmount,
                giver);
            // Donación de RBTC a Milestone 1
            donationId3 = await newDonationEther(crowdfunding,
                milestoneId1,
                RBTC,
                donationAmount,
                giver);
        });

        it('Withdraw ETH', async () => {

            // Inicialmente de completa y aprueba el milestone.
            await crowdfunding.milestoneComplete(milestoneId1, INFO_CID, { from: milestoneManager });
            await crowdfunding.milestoneReview(milestoneId1, true, INFO_CID, { from: campaignReviewer });

            let receipt = await crowdfunding.milestoneWithdraw(milestoneId1, { from: milestoneRecipient });

            let milestone = await crowdfunding.getMilestone(milestoneId1);
            assert.equal(milestone.status, MILESTONE_STATUS_FINISHED);

            // Estado de los presupuestos

            assert.equal(milestone.donationIds.length, 1);
            assert.equal(milestone.budgetDonationIds.length, 0);

            let campaign = await crowdfunding.getCampaign(campaignId1);
            assert.equal(campaign.donationIds.length, 1);
            assert.equal(campaign.budgetDonationIds.length, 2);

            // Estado de la donación sobre el Milestone
            // Se transfirió el remanente a la Campaign.

            let donations = await getDonations(crowdfunding, campaign.budgetDonationIds);
            assert.equal(donations.length, 2);
            // La 2da donación es la transferida.
            assertDonation(donations[1], {
                id: donationId3,
                giver: giver,
                token: RBTC,
                amount: donationAmount,
                amountRemainding: donationAmount.sub(FIAT_AMOUNT_TARGET.mul(USD_ETH_RATE)),
                entityId: milestoneId1,
                budgetEntityId: campaignId1,
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
            // El Milestone no está aprobado, por lo que no pueden retirarse los fondos.
            await assertRevert(
                crowdfunding.milestoneWithdraw(milestoneId1, { from: milestoneRecipient }),
                errors.CROWDFUNDING_WITHDRAW_NOT_APPROVED);
        })

        xit('Withdraw ETH sin cotización', async () => {  //TODO: CRITICAL: AGREGAR MANEJO DE ERRORES SI NO HAY COTIZACION

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

        const randomAddr = "0xD059764e0B0C949001bF19F9cd06eA7D9e4090D7";

        beforeEach(async () => {
            //Inicializacion de price provider
            priceProviderMock = await PriceProviderMock.new("13050400000000000000000");
            exchangeRateProvider = await ExchangeRateProvider.new(priceProviderMock.address);
            await crowdfunding.setExchangeRateProvider(exchangeRateProvider.address);

        });

        it('setExchangeRateProvider autorizado', async () => {
            await crowdfunding.setExchangeRateProvider(randomAddr,{from:deployer});
            const exchangeRateProvider = await crowdfunding.exchangeRateProvider();
            assert.equal(exchangeRateProvider,randomAddr)
        })

        it('setExchangeRateProvider no autorizado', async () => {
            await assertRevert(
                crowdfunding.setExchangeRateProvider(randomAddr,{from:notAuthorized}),
                errors.APP_AUTH_FAILED
            )
        })

    })
})
