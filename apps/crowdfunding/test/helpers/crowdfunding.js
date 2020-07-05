const { getEventArgument } = require('@aragon/test-helpers/events')

const Crowdfunding = artifacts.require('Crowdfunding')
const BN = require('bn.js');

// Ejemplo de IPFS CID con datos JSON
// https://ipfs.io/ipfs/Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM
const INFO_CID = 'Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM';
// 100 USD = 10000 Centavos USD
const FIAT_AMOUNT_TARGET = new BN('10000');

const linkLib = async (lib, destination, libPlaceholder) => {
  let libAddr = lib.address.replace('0x', '').toLowerCase()
  destination.bytecode = destination.bytecode.replace(new RegExp(libPlaceholder, 'g'), libAddr)
}

const newCrowdfunding = async (deployer) => {
  return await Crowdfunding.new({ from: deployer });
}

const newDac = async (crowdfunding, delegate) => {
  let receipt = await crowdfunding.newDac(INFO_CID, { from: delegate });
  return getEventArgument(receipt, 'NewDac', 'id').toNumber();
}

const newCampaign = async (crowdfunding, manager, reviewer, dacId) => {
  let receipt = await crowdfunding.newCampaign(INFO_CID, dacId, reviewer, { from: manager });
  return getEventArgument(receipt, 'NewCampaign', 'id').toNumber();
}

const newMilestone = async (crowdfunding, manager, reviewer, recipient, campaignReviewer, campaignId) => {
  let receipt = await crowdfunding.newMilestone(INFO_CID, campaignId, FIAT_AMOUNT_TARGET, reviewer, recipient, campaignReviewer, { from: manager });
  return getEventArgument(receipt, 'NewMilestone', 'id').toNumber();
}

const newDonationEther = async (crowdfunding, entityId, token, amount, giver) => {
  let receipt = await crowdfunding.donate(entityId, token, amount, { from: giver, value: amount });
  return getEventArgument(receipt, 'NewDonation', 'id').toNumber();
}

const newDonationToken = async (crowdfunding, token, entityId, amount, giver) => {
  // Se aprueba al Crowdfunding para depositar los Tokens en el Vault.
  await token.approve(crowdfunding.address, amount, { from: giver });
  let receipt = await crowdfunding.donate(entityId, token.address, amount, { from: giver });
  return getEventArgument(receipt, 'NewDonation', 'id').toNumber();
}

module.exports = {
  newCrowdfunding,
  newDac,
  newCampaign,
  newMilestone,
  newDonationEther,
  newDonationToken,
  INFO_CID,
  FIAT_AMOUNT_TARGET
}
