const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { getEventArgument } = require('@aragon/test-helpers/events')
const { newDao, newApp } = require('./helpers/dao')
const { setPermission } = require('./helpers/permissions')
const { newCrowdfunding, newDac, INFO_CID } = require('./helpers/crowdfunding')
const { errors } = require('./helpers/errors')
const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')
const BN = web3.utils.BN;

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

const VAULT_INITIAL_TOKEN1_BALANCE = 100;

// 0: DonationStatus.Available;
const DONATION_STATUS_AVAILABLE = 0;

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

    context('Flujo normal de Donación de ETH', function () {



        it('Donar a Dac', async () => {

            const dacId = await newDac(crowdfunding, delegate);
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

            assert.equal(await vault.balance(ETH), amount, 'El monto donado debe estar en el Vault');
        })
    })

    for (const { title, tokenContract } of tokenTestGroups) {
        context(`Token ERC20 (${title})`, () => {
            let tokenInstance;
            let dacId;
            const amount = 10;

            beforeEach(async () => {
                // Set up a new token similar to token1's distribution
                tokenInstance = await tokenContract.new(giver, 10000 + VAULT_INITIAL_TOKEN1_BALANCE)
                await tokenInstance.transfer(vault.address, VAULT_INITIAL_TOKEN1_BALANCE, { from: giver })
                dacId = await newDac(crowdfunding, delegate);
            })

            it('Donar a Dac', async () => {
                // Se aprueba al Crowdfunding para depositar los Tokens en el Vault.
                await tokenInstance.approve(crowdfunding.address, amount, { from: giver })
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
                let donation = donations[0];
                assert.equal(donation.id, 1);
                assert.equal(donation.idIndex, 0);
                assert.equal(donation.giver, giver);
                assert.equal(donation.token, tokenInstance.address);
                assert.equal(donation.amount, amount);
                assert.equal(donation.amountRemainding, amount);
                assert.equal(donation.entityId, dacId);
                assert.equal(donation.status, DONATION_STATUS_AVAILABLE);

                // Assert desde el Vault
                assert.equal(await vault.balance(tokenInstance.address), VAULT_INITIAL_TOKEN1_BALANCE + amount, 'Los tokens donados deben estar en el Vault.');
                // Assert desde el Token
                assert.equal((await tokenInstance.balanceOf(vault.address)).valueOf(), VAULT_INITIAL_TOKEN1_BALANCE + amount, 'Los tokens donados deben estar en el Vault.');
            })
        })
    }
})
