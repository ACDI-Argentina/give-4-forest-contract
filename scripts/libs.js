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

const linkLib = async (lib, destination, libPlaceholder) => {
  let libAddr = lib.address.replace('0x', '').toLowerCase()
  destination.bytecode = destination.bytecode.replace(new RegExp(libPlaceholder, 'g'), libAddr)
}

const linkLibByAddress = async (libAddr, destination, libPlaceholder) => {
  libAddr = libAddr.replace('0x', '').toLowerCase()
  destination.bytecode = destination.bytecode.replace(new RegExp(libPlaceholder, 'g'), libAddr)
}

module.exports = {
  linkLib,
  linkLibByAddress,
  ARRAY_LIB_PLACEHOLDER,
  ENTITY_LIB_PLACEHOLDER,
  DAC_LIB_PLACEHOLDER,
  CAMPAIGN_LIB_PLACEHOLDER,
  MILESTONE_LIB_PLACEHOLDER,
  ACTIVITY_LIB_PLACEHOLDER,
  DONATION_LIB_PLACEHOLDER
}
