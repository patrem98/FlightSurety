# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`
`truffle compile`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate`
`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder

## User interaction 

In the given use-case there are primarily two involved parties, that each have their own requirements: The airline company & the passenger.
On the basic front-end developped the section "Register, Activate & Output Airlines" is designed for various airline companies (with respect wallet-addresses). Airlines can that way be registered, activate themselves (by submitting 10 ether) and request all other registered airlines.

The section "Register & Output Flights" is designed for both airlines and passengers. While the "register Flight" button is designated for airlines, the "getFlightStatus" button allows passengers to check the current status of their flight. The flight status will be displayed for the passenger and if the majority of oracles (simulated by server) output a delayed flight due to an airline error (status code = 20), the refund-amount will automatically be changed in the flights-data-structure (see FlightSuretyApp.sol). Attention: The refund-amount is however, not directly transferred to the passengers wallet (i.a.w. smart contract good practices). The passenger will withdraw the amount in a separate step.

The section "Buying Insurance" and "Withdrawing Refund" are designed for passengers wanting to buy an insurance for a specific flight, wanting to know how much they paid for an insurance in the first place and (if a particular flight is delayed, due to the airline's fault) wanting to withdraw their refund (refund is received as ether in metamask-wallet).

Some important notes:
* Flights can only be registered by the respective airline (that's why no additional box for inputting the airline address is provided in the front-end)
* The time of the flights has to inputted (both for registration and for demanding the flight-status) in the following format: Milliseconds elapsed since January 1, 1970 00:00:00 UTC. This is of course not an ideal solution, but should suffice for a simplified comparison of actual time (when passenger demands flight status) and time inputted by airline when registering the flight.


## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)
