import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

/*const Web3 = require("web3");
const ethEnabled = () => {
  if (window.ethereum) {
    window.Web3 = new Web3(window.ethereum);
    window.ethereum.enable();
    return true;
  }
  return false;
}*/

//contract module API (pre-injecting contract ABI (?))
export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        //this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress, config.dataAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {

        /*if (!ethEnabled()) {
            alert("Please install an Ethereum-compatible browser or extension like MetaMask to use this dApp!");
          }*/

        this.web3.eth.getAccounts(async (error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       //console.log('Heyho!');
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: '0x8ff108e710b648Aee4eD69B0AaE1c66A52F47B65'}, callback);
    }

    //++++++++++++++++++ Flight-related functions +++++++++++++++++++++++++++

    async registerFlight(flight, timestamp, callback){
        let self = this;
        let currentAddress = await ethereum.request({method: 'eth_accounts'});

        console.log(flight);
        console.log(timestamp);

        self.flightSuretyApp.methods
        .registerFlight(flight, timestamp)
        .send({from: currentAddress[0]}, (error, result) => {
            console.log(error, result);
            callback(error, result);
        });

    } 

    //processFlightStatus() --> Done via cli (not implemented as front-end!)
    
    async fetchFlightStatus(addressAirline, flight, timestamp, callback) {
        let self = this;
        let currentAddress = await ethereum.request({method: 'eth_accounts'});
        /*let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }*/

        self.flightSuretyApp.methods
            .fetchFlightStatus(addressAirline, flight, timestamp)
            .send({ from: currentAddress[0]}, (error, result) => {
                console.log(error, result);
                callback(error, result);
            });
    }

    //++++++++++++++++++ Airline-related functions +++++++++++++++++++++++++++

    //registerFirstAirline() --> Done via cli (not implemented as front-end!)

    async registerAirline(addressAirline, nameAirline, callback) {
        let self = this;
        let currentAddress = await ethereum.request({ method: 'eth_accounts' });

        /*Retrieving current user address from metamask account! Make sure that first the right address is
        retrieved and only after retrieving it the registerAirline function is called!*/
        /*let getCurrentAddress = function(){
            return new Promise(async function(resolve, reject) {
                let currentAddress = await ethereum.request({ method: 'eth_accounts' });
                resolve(currentAddress[0]);
            });
        }

        let registerAirline = function(address){
            return new Promise(function(resolve, reject) {
                resolve(self.flightSuretyApp.methods
                    .registerAirline(addressAirline, nameAirline)
                    .send({from: address}));
            });
        }

        getCurrentAddress().then(function(address){
            return registerAirline(address);
        });*/

        //console.log(currentAddress[0]);
        console.log(self.owner);
        console.log(addressAirline);
        console.log(currentAddress[0]);
        console.log(nameAirline);
        
        self.flightSuretyApp.methods
        .registerAirline(addressAirline, nameAirline)
        .send({from: currentAddress[0]}, (error, result) => {
            console.log(error, result);
            callback(error, result);
        });
        
        alert("Check!");
    }

    async activateRegisteredAirline(prizePaid, callback){
        let self = this;
        console.log(prizePaid)
        let currentAddress = await ethereum.request({ method: 'eth_accounts' });
        self.flightSuretyApp.methods.activateRegisteredAirline().send({from: currentAddress[0], value: self.web3.utils.toWei(prizePaid, 'ether')}, (error, result) => {
            console.log(error,result);
            callback(error, result);
        });
    }

    async getAirlines(callback){
        let self = this;
        let currentAddress = await ethereum.request({ method: 'eth_accounts' });
        self.flightSuretyData.methods.getAirlines().call({from: currentAddress[0]}, callback);
    }

    //++++++++++++++++++ Passenger-related functions +++++++++++++++++++++++++++

    async passengerPayment(flight, addressAirline, timestamp, prizePaid, callback){
        let self = this;
        console.log(prizePaid);
        console.log(flight);
        console.log(addressAirline);
        console.log(timestamp);

        let currentAddress = await ethereum.request({method: 'eth_accounts'});
        self.flightSuretyApp.methods.passengerPayment(flight, addressAirline, timestamp).send({from: currentAddress[0], value: self.web3.utils.toWei(prizePaid, 'ether')}, (error, result) => {
            console.log(error, result);
            callback(error, result);
        });
    }

    async passengerWithdrawal(flight, addressAirline, timestamp, callback){
        let self = this;
        console.log(flight);
        console.log(addressAirline);
        console.log(timestamp);

        let currentAddress = await ethereum.request({method: 'eht_accounts'});
        self.flightSuretyApp.methods.passengerWithdrawal(flight, addressAirline, timestamp, currentAddress[0]).send((error, result) => {
            console.log(error, result);
            callback(error, result);
        });
    }
    
    async getPassengerPaidAmount(flight, timestamp, addressAirline, callback){
        let self = this;
        let currentAddress = await ethereum.request({method: 'eth_accounts'});
        self.flightSuretyApp.methods.getPassengerPaidAmount(flight, timestamp, addressAirline).call({from: currentAddress[0], callback})
    }

}