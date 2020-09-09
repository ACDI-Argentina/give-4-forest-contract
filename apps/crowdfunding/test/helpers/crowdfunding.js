const { getEventArgument } = require('@aragon/test-helpers/events')

const Crowdfunding = artifacts.require('Crowdfunding')
const ArrayLib = artifacts.require('ArrayLib')
const EntityLib = artifacts.require('EntityLib')
const DacLib = artifacts.require('DacLib')
const CampaignLib = artifacts.require('CampaignLib')
const MilestoneLib = artifacts.require('MilestoneLib')
const ActivityLib = artifacts.require('ActivityLib')
const DonationLib = artifacts.require('DonationLib')
const BudgetLib = artifacts.require('BudgetLib')
const BN = require('bn.js');

// Ejemplo de IPFS CID con datos JSON
// https://ipfs.io/ipfs/Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM
const INFO_CID = 'Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM';
// 100 USD = 10000 Centavos USD
const FIAT_AMOUNT_TARGET = new BN('10000');

// Por versión de Solidity (0.4.24), el placeholder de la libraría aún se arma
// con el nombre y no el hash.
// En la versión 0.5.0 este mecanismo se reemplaza por el hast del nombre de la librería.
// https://github.com/ethereum/solidity/blob/develop/Changelog.md#050-2018-11-13
// Commandline interface: Use hash of library name for link placeholder instead of name itself.
const ARRAY_LIB_PLACEHOLDER = '__contracts/ArrayLib.sol:ArrayLib_______';
const ENTITY_LIB_PLACEHOLDER = '__contracts/EntityLib.sol:EntityLib_____';
const DAC_LIB_PLACEHOLDER = '__contracts/DacLib.sol:DacLib___________';
const CAMPAIGN_LIB_PLACEHOLDER = '__contracts/CampaignLib.sol:CampaignLi__';
const MILESTONE_LIB_PLACEHOLDER = '__contracts/MilestoneLib.sol:Milestone__';
const ACTIVITY_LIB_PLACEHOLDER = '__contracts/ActivityLib.sol:ActivityLi__';
const DONATION_LIB_PLACEHOLDER = '__contracts/DonationLib.sol:DonationLi__';
const BUDGET_LIB_PLACEHOLDER = '__contracts/BudgetLib.sol:BudgetLib_____';

const linkLib = async (lib, destination, libPlaceholder) => {
  let libAddr = lib.address.replace('0x', '').toLowerCase()
  destination.bytecode = destination.bytecode.replace(new RegExp(libPlaceholder, 'g'), libAddr)
}

const newCrowdfunding = async (deployer) => {
  // Link Crowdfunding > ArrayLib
  const arrayLib = await ArrayLib.new({ from: deployer });
  await linkLib(arrayLib, Crowdfunding, ARRAY_LIB_PLACEHOLDER);
  // Link Crowdfunding > EntityLib
  const entityLib = await EntityLib.new({ from: deployer });
  await linkLib(entityLib, Crowdfunding, ENTITY_LIB_PLACEHOLDER);
  // Link Crowdfunding > DacLib
  const dacLib = await DacLib.new({ from: deployer });
  await linkLib(dacLib, Crowdfunding, DAC_LIB_PLACEHOLDER);
  // Link Crowdfunding > CampaignLib
  const campaignLib = await CampaignLib.new({ from: deployer });
  await linkLib(campaignLib, Crowdfunding, CAMPAIGN_LIB_PLACEHOLDER);
  // Link Crowdfunding > MilestoneLib
  const milestoneLib = await MilestoneLib.new({ from: deployer });
  await linkLib(milestoneLib, Crowdfunding, MILESTONE_LIB_PLACEHOLDER);
  // Link Crowdfunding > ActivityLib
  const activityLib = await ActivityLib.new({ from: deployer });
  await linkLib(activityLib, Crowdfunding, ACTIVITY_LIB_PLACEHOLDER);
  // Link Crowdfunding > DonationLib
  const donationLib = await DonationLib.new({ from: deployer });
  await linkLib(donationLib, Crowdfunding, DONATION_LIB_PLACEHOLDER);
  // Link Crowdfunding > BudgetLib
  const budgetLib = await BudgetLib.new({ from: deployer });
  await linkLib(budgetLib, Crowdfunding, BUDGET_LIB_PLACEHOLDER);
  return await Crowdfunding.new({ from: deployer });
}

const newDac = async (crowdfunding, delegate) => {
  let receipt = await crowdfunding.newDac(INFO_CID, { from: delegate });
  return getEventArgument(receipt, 'NewDac', 'id').toNumber();
}

const saveCampaign = async (crowdfunding, manager, reviewer, dacId, campaignId = 0) => {
  const receipt = await crowdfunding.saveCampaign(INFO_CID, dacId, reviewer, campaignId, { from: manager });
  return getEventArgument(receipt, 'SaveCampaign', 'id').toNumber();
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

const getDacs = async (crowdfunding) => {
  let ids = await crowdfunding.getDacIds();
  let dacs = [];
  for (i = 0; i < ids.length; i++) {
    dacs.push(await crowdfunding.getDac(ids[i]));
  }
  return dacs;
}

const getCampaigns = async (crowdfunding) => {
  let ids = await crowdfunding.getCampaignIds();
  let campaigns = [];
  for (i = 0; i < ids.length; i++) {
    campaigns.push(await crowdfunding.getCampaign(ids[i]));
  }
  return campaigns;
}

const getMilestones = async (crowdfunding) => {
  let ids = await crowdfunding.getMilestoneIds();
  let milestones = [];
  for (i = 0; i < ids.length; i++) {
    milestones.push(await crowdfunding.getMilestone(ids[i]));
  }
  return milestones;
}

const getBudgets = async (crowdfunding, entity) => {
  let budgets = [];
  for (i = 0; i < entity.budgetIds.length; i++) {
    budgets.push(await crowdfunding.getBudget(entity.budgetIds[i]));
  }
  return budgets;
}

const getBudget = async (crowdfunding, entityId, token) => {
  let entity = await crowdfunding.getEntity(entityId);
  for (i = 0; i < entity.budgetIds.length; i++) {
    let budget = await crowdfunding.getBudget(entity.budgetIds[i]);
    if (budget.token == token) {
      return budget;
    }
  }
  return null;
}

const getDonations = async (crowdfunding, donationIds) => {
  let donations = [];
  for (i = 0; i < donationIds.length; i++) {
    donations.push(await crowdfunding.getDonation(donationIds[i]));
  }
  return donations;
}

module.exports = {
  newCrowdfunding,
  newDac,
  saveCampaign,
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
  FIAT_AMOUNT_TARGET
}
