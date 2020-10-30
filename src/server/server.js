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
  'label': 'STATUS_CODE_LATE_AIRLINE', 'code': 20},{
  'label': 'STATUS_CODE_LATE_WEATHER', 'code': 30},{
  'label': 'STATUS_CODE_LATE_TECHNICAL', 'code': 40},{
  'label': 'STATUS_CODE_LATE_OTHER', 'code': 50}];

  let oracles = [];
  let matchingOracles = [];

//Register oracles
async function registerOracles(){

  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  let accounts = await web3.eth.getAccounts();

  for(let i = 0; i < 20; i++){
    console.log(accounts[i]);
    await flightSuretyApp.methods.registerOracle().send({
      'from': accounts[i],
      'value': fee,
      'gas': 4712388,
      'gasPrice': 100000000000
    });
    let index = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[i]});
    oracles.push({ 'accounts': accounts[i], 'index': index, 'status': STATUS[1].code });
    //console.log(`Oracle with address: ${accounts[i]} and index: ${index} registered!`);
  }
  //console.log(oracles);
  return oracles;
}

//Self-invoking anonymous function in order to register oracles automatically
(async() => {

 let oracles = await registerOracles();

})();
//Submit oracle responses, when flight status request is emitted
/*Following procedure shall be followed:
1. The user clicks in a button present in the dapp
2. This button calls a method on your smart contract
3. This method emits the event
4. The node.js listening the event will perform the registered callback for that event.*/

flightSuretyApp.events.OracleRequest({})
.on('data', async function(event){
        console.log(event.returnValues);
 
    //Store return values of emitted event during execution of "fetchtflightStatus()"-function
    let index = event.returnValues.index;
    let airline = event.returnValues.airline;
    let flight = event.returnValues.flight;
    let timestamp = event.returnValues.timestamp; //Passenger has to input the date in the right way (see README on Github)!

    //Checking status of flight
    let status = STATUS[0]; //default status code!

    //Defining status code (only simulation, in production these would (or could) be varying!)
    if(timestamp < Date.now()){
      status = STATUS[2].code;
      console.log(Date.now());
    }

    //Creating reference for number of "randomly selected" oracles for status submission (see App-contract, submitOracleResponse)
    for(let i = 0; i < oracles.length; i++){
      if((oracles[i].index[0] == index) || (oracles[i].index[1] == index) || (oracles[i].index[2] == index)){
        matchingOracles.push(oracles[i]);
      }
    }
    let matchingOraclesLength = matchingOracles.length;
    console.log(matchingOracles.length);
    //Identifying all oracles with matching indices
     for(let k = 0; k < oracles.length; k++){
      if((oracles[k].index[0] == index) || (oracles[k].index[1] == index) || (oracles[k].index[2] == index)){
    
        await flightSuretyApp.methods
        .submitOracleResponse(index, airline, flight, timestamp, status, matchingOraclesLength)
        .send({from: oracles[k].accounts,
          gasPrice: '100000000000',
          gas: '4712388'});
      }

    //Resetting array for next cycle
    matchingOracles = [];

    }
  
}).on('error', console.error);
  
const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


