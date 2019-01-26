let HDWalletProvider = require("truffle-hdwallet-provider");
let mnemonic = "entry approve skill history ticket sure whip reject glad keen swear odor";

module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // for more about customizing your Truffle configuration!
    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*" // Match any network id
        },
        ropsten: {
            provider: function () {
                return new HDWalletProvider(mnemonic, "https://ropsten.infura.io/441ef6f84de54e668675a87d5c139e4d")
            },
            network_id: "3"
        }
    }
};
