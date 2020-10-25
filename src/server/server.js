import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import "babel-polyfill";


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

//Defining all possible status codes
let STATUS = [{
  'label': 'STATUS_CODE_UNKNOWN', 'code': 0},{
  'label': 'STATUS_CODE_ON_TIME', 'code': 10},{
  'label': 'STATUS_CODE_LATE_AIRLINE', 'code': 20}, {
  'label': 'STATUS_CODE_LATE_WEATHER', 'code': 30}, {
  'label': 'STATUS_CODE_LATE_TECHNICAL', 'code': 40}, {
  'label': 'STATUS_CODE_LATE_OTHER', 'code': 50}];

  let oracles = [];
  let matchingOracles = [];

//Register oracles
async function registerOracles(){

  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  let accounts = await web3.eth.getAccounts();
  console.log(accounts);

  for(let i = 0; i < accounts.length; i++){
    let registrationResult = await flightSuretyApp.methods.registerOracle().send({
      'from': accounts[i],
      'value': fee,
      'gas': 4712388,
      'gasPrice': 100000000000
    });
    oracles.push(registrationResult);
  }
  //console.log(oracles);
  return oracles;
}

//Self-invoking anonymous function in order to register oracles automatically
(async() => {

  const oracles = await registerOracles();

})();

//Submit oracle responses, when flight status request is emitted
/*Following procedure shall be followed:
1. The user clicks in a button present in the dapp
2. This button calls a method on your smart contract
3. This method emits the event
4. The node.js listening the event will perform the registered callback for that event.*/
flightSuretyApp.events.OracleRequest({
  fromBlock: 'latest'
}, async function (error, event){

  if(error){
    console.log(error);
  }
  console.log('Caught an event: '+event);

  //Store return values of emitted event during execution of "fetchtflightStatus()"-function
  let index = event.returnValues.index;
  let airline = event.returnValues.airline;
  let flight = event.returnValues.flight;
  let timestamp = event.returnValues.timestamp;

  //Checking status of flight
  let status = 0;
  let time = (timestamp * 1000); //JS counts in ms, Solidity counts in s!

  if(time < Date.now()){
    status = STATUS_CODE[2];
  }

  //Identifying all oracles with matching indices
  oracles.forEach(oracle => {
    if((oracle.indexes[0] == index) || (oracle.indexes[1] == index) || (oracle.indexes[2] == index)){
      matchingOracles.push(oracle);
    }
  });
  console.log(matchingOracles);

  //Iterate through all oracle responses (only oracles with matching index are considered) and get majority response
  for(let j = 0; j < matchingOracles.length; j++){

    await self.flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, status).send({from: oracle});
    ??? --> How to implement the requirement, that status is send that majority of oracles output????
  }

});


const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


