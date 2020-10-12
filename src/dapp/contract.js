import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
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
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    //++++++++++++++++++ Flight-related functions +++++++++++++++++++++++++++

    //registerFlight()

    //processFlightStatus()
    
    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    //++++++++++++++++++ Airline-related functions +++++++++++++++++++++++++++

    //registerFirstAirline()

    registerAirline(addressAirline, nameAirline, callback) {
        let self = this;
        
        self.flightSuretyApp.methods
            .registerAirline(addressAirline, nameAirline)
            .send({from: self.airlines[1]}, (error, result) => {
                callback(error, addressAirline);
                alert("New Airline on BC now!");
            }); 
    }

    //activateRegisteredAirline()

    //getAirlines()

    //++++++++++++++++++ Passenger-related functions +++++++++++++++++++++++++++

    //passengerPayment()

    //passengerRepayment()

    //passengerWithdrawal()
    
    //getPassengerPaidAmount()

}