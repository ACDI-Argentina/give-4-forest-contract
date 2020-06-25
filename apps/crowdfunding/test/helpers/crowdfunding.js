const { getEventArgument } = require('@aragon/test-helpers/events')

const Crowdfunding = artifacts.require('Crowdfunding')
const Vault = artifacts.require('Vault')
const EntityLib = artifacts.require('EntityLib')
const DacLib = artifacts.require('DacLib')
const CampaignLib = artifacts.require('CampaignLib')
const MilestoneLib = artifacts.require('MilestoneLib')

// Ejemplo de IPFS CID con datos JSON
// https://ipfs.io/ipfs/Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM
const INFO_CID = 'Qmd4PvCKbFbbB8krxajCSeHdLXQamdt7yFxFxzTbedwiYM';

// Por versión de Solidity (0.4.24), el placeholder de la libraría aún se arma
// con el nombre y no el hash.
// En la versión 0.5.0 este mecanismo se reemplaza por el hast del nombre de la librería.
// https://github.com/ethereum/solidity/blob/develop/Changelog.md#050-2018-11-13
// Commandline interface: Use hash of library name for link placeholder instead of name itself.
const ENTITY_LIB_PLACEHOLDER = '__contracts/EntityLib.sol:EntityLib_____';
const DAC_LIB_PLACEHOLDER = '__contracts/DacLib.sol:DacLib___________';
const CAMPAIGN_LIB_PLACEHOLDER = '__contracts/CampaignLib.sol:CampaignLi__';
const MILESTONE_LIB_PLACEHOLDER = '__contracts/MilestoneLib.sol:Milestone__';

const linkLib = async (lib, destination, libPlaceholder) => {
  let libAddr = lib.address.replace('0x', '').toLowerCase()
  destination.bytecode = destination.bytecode.replace(new RegExp(libPlaceholder, 'g'), libAddr)
}

const newCrowdfunding = async (deployer) => {
  let entityLib = await EntityLib.new({ from: deployer });
  let dacLib = await DacLib.new({ from: deployer });
  let campaignLib = await CampaignLib.new({ from: deployer });
  let milestoneLib = await MilestoneLib.new({ from: deployer });
  await linkLib(entityLib, Crowdfunding, ENTITY_LIB_PLACEHOLDER);
  await linkLib(dacLib, Crowdfunding, DAC_LIB_PLACEHOLDER);
  await linkLib(campaignLib, Crowdfunding, CAMPAIGN_LIB_PLACEHOLDER);
  await linkLib(milestoneLib, Crowdfunding, MILESTONE_LIB_PLACEHOLDER);
  //let vault = await Vault.new({ from: deployer });
  return await Crowdfunding.new({ from: deployer });
}

const newDac = async (crowdfunding, delegate) => {
  let receipt = await crowdfunding.newDac(INFO_CID, { from: delegate });
  return getEventArgument(receipt, 'NewDac', 'id').toNumber();
}

const newCampaign = async (crowdfunding, campaignManager, campaignReviewer, dacId) => {
  let receipt = await crowdfunding.newCampaign(INFO_CID, dacId, campaignReviewer, { from: campaignManager });
  return getEventArgument(receipt, 'NewCampaign', 'id');
}

module.exports = {
  newCrowdfunding,
  newDac,
  newCampaign,
  INFO_CID
}
