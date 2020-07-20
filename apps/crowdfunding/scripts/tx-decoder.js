const abiDecoder = require('abi-decoder'); // NodeJS

const CrowdfundingArtifact = require('../artifacts/Crowdfunding.json');
abiDecoder.addABI(CrowdfundingArtifact.abi);

//console.log(CrowdfundingArtifact.abi);
console.log(abiDecoder);
const testData = "0xf71b9022000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000342f697066732f516d63455576794a783664436633536f6934437947516141787738506856525972557271646d5a64724356703446000000000000000000000000";
const decodedData = abiDecoder.decodeMethod(testData);
console.log(decodedData);