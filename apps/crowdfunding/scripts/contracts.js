const generateClass = require('eth-contract-class').default;

const CrowdfundingArtifact = require('../artifacts/Crowdfunding.json');
const ExchangeRateProviderArtifact = require('../artifacts/ExchangeRateProvider.json');

module.exports = {
  Crowdfunding: generateClass(
    CrowdfundingArtifact.abi,
    CrowdfundingArtifact.bytecode
  ),
  CrowdfundingAbi: CrowdfundingArtifact.abi,
  ExchangeRateProvider: generateClass(
    ExchangeRateProviderArtifact.abi,
    ExchangeRateProviderArtifact.bytecode
  )
};