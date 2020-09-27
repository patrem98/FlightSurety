const HDWalletProvider = require('truffle-hdwallet-provider');
//const infuraKey = "eb6644b399534df5bdf13303801657a7";

//const fs = require('fs');
//const mnemonic = fs.readFileSync(".secret").toString().trim();
const mnemonic = "target wheel foot believe wrist rapid clock horse educate someone perfect frame";

module.exports = {
 networks: {
   development: {
     host: "127.0.0.1",
     port: 8545,
     network_id: "*" // Match any network id
   },
 
 /*rinkeby: {
   provider: () => new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/37af04f894eb4a518e36f687d17ed1a9`),
   network_id: 4,       // rinkeby's id
   gas: 4500000,        // Rinkeby has a lower block limit than mainnet
   gasPrice: 10000000000
   }*/
 },

 compilers: {
  solc: {
    version: "0.6.0",
    }
  }
};