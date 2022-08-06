const abiDecoder = require('abi-decoder'); // NodeJS

const CrowdfundingArtifact = require('../../artifacts/Crowdfunding.json');
abiDecoder.addABI(CrowdfundingArtifact.abi);

console.log(abiDecoder);
const testData = "0x25fb2680000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a7640000";
const decodedData = abiDecoder.decodeMethod(testData);
console.log(decodedData);