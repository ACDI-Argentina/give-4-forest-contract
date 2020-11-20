const generateClass = require('eth-contract-class').default;

const CrowdfundingArtifact = require('../artifacts/Crowdfunding.json');

module.exports = {
  Crowdfunding: generateClass(
    CrowdfundingArtifact.abi,
    CrowdfundingArtifact.bytecode
  ),
  CrowdfundingAbi: CrowdfundingArtifact.abi
};