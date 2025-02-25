require('dotenv').config({ path: `./scripts/utils/.env.${process.env.NODE_ENV}` });

var Web3 = require('web3');

async function main() {

    const { NETWORK_NODE_URL,
        RIF_TOKEN_ADDRESS,
        DOC_TOKEN_ADDRESS } = process.env;

    console.log('');
    console.log('RSK Node Status');
    console.log('  Network: ' + NETWORK_NODE_URL);
    console.log('-------------------------------------------');

    var web3 = new Web3(NETWORK_NODE_URL);

    // Ver https://github.com/trufflesuite/truffle/issues/2160

    var from = '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826';
    var value = web3.utils.toWei('1');

    // Account 1
    await web3.eth.sendTransaction({
        from: from,
        to: '0xee4b388fb98420811C9e04AE8378330C05A2735a',
        value: value
    })/*.once('confirmation', function (confNumber, receipt) {
    console.log(`Confirmation Number: ${confNumber}`);
    console.log(`Receipt`, receipt);
});*/

    // Account 2
    await web3.eth.sendTransaction({
        from: from,
        to: '0x0bfA3B6b0E799F2eD34444582187B2cDf2fB11a7',
        value: value
    })/*.once('confirmation', function (confNumber, receipt) {
    console.log(`Confirmation Number: ${confNumber}`);
    console.log(`Receipt`, receipt);
});*/

    // Account 3
    await web3.eth.sendTransaction({
        from: from,
        to: '0x36d1d3c43422EF3B1d7d23F20a25977c29BC3f0e',
        value: value
    })/*.once('confirmation', function (confNumber, receipt) {
    console.log(`Confirmation Number: ${confNumber}`);
    console.log(`Receipt`, receipt);
});*/

    // Account 4
    await web3.eth.sendTransaction({
        from: from,
        to: '0x9063541acBD959baeB6Bf64158944b7e5844534a',
        value: value
    })/*.once('confirmation', function (confNumber, receipt) {
    console.log(`Confirmation Number: ${confNumber}`);
    console.log(`Receipt`, receipt);
});*/

    // Account 5
    await web3.eth.sendTransaction({
        from: from,
        to: '0xd703eE823B2A2466F22147bfE74a0F605EbB20a4',
        value: value
    })/*.once('confirmation', function (confNumber, receipt) {
    console.log(`Confirmation Number: ${confNumber}`);
    console.log(`Receipt`, receipt);
});*/

    // ERC20 Token

    let minAbi = [
        // transfer
        {
            "constant": false,
            "inputs": [
                {
                    "name": "_to",
                    "type": "address"
                },
                {
                    "name": "_value",
                    "type": "uint256"
                }
            ],
            "name": "transfer",
            "outputs": [
                {
                    "name": "",
                    "type": "bool"
                }
            ],
            "type": "function"
        }
    ];

    let fromAddress = '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826';
    let toAddress = '0xee4b388fb98420811C9e04AE8378330C05A2735a';
    // Use BigNumber
    let decimals = web3.utils.toBN(18);
    let amount = web3.utils.toBN(10);
    // calculate ERC20 token amount
    value = amount.mul(web3.utils.toBN(10).pow(decimals));

    // RIF Token
    // Get ERC20 Token contract instance
    let rifContract = new web3.eth.Contract(minAbi, RIF_TOKEN_ADDRESS);
    // call transfer function
    await rifContract.methods.transfer(toAddress, value).send({ from: fromAddress });

    // DOC Token
    // Get ERC20 Token contract instance
    let docContract = new web3.eth.Contract(minAbi, DOC_TOKEN_ADDRESS);
    // call transfer function
    await docContract.methods.transfer(toAddress, value).send({ from: fromAddress });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });