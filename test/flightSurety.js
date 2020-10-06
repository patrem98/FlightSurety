var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`first Airline is correctly registered and activated`, async function () {

    await config.flightSuretyData.registerFirstAirline(config.firstAirline, web3.utils.toWei("10", "ether"));

    let status = await config.flightSuretyData.numberRegisteredAirlines();
    //let status1 = await config.flightSuretyData.getAirlines();
    //let status2 = await config.flightSuretyData.getAirlineName(config.firstAirline);

    //console.log(status);
    //console.log(status1);
    //console.log(status2);
  
    assert.equal(status, 2, "First Airline could not be properly registered!");
    
    /*Remark: Number of registered addresses must be two (therefore also the length of the array), 
    as the 0x00 address is already registered with the initialization and the first airline ist therefore the secon address in the array!*/ 

  });

  it(`multiparty has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    //console.log(status);
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  //ADD - TEST FOR PREVENTING LOCKOUT BUG!!!

  /*it(`multiparty can block access to setOperatingStatus()`, async function () {

      let accessDenied = false;
      let newAirline = accounts[2];

      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: newAirline });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted by multiparty consensus mechanism");
            
  });*/

  it(`multiparty can allow & block change of state of contract if majority is reached`, async function () {

    // ARRANGE
    let newAirline2 = accounts[2];

    //Saving the initial contract state
    let originalState = await config.flightSuretyData.isOperational.call();

    // ACT
        //Registering one new airline in order to simulate a two-third majority 
        await config.flightSuretyApp.registerAirline(newAirline2, "Airline2", {from: config.firstAirline});
        
        //Ensuring that all newly registered airlines have paid the requested amount of 10 Ether as funding
        await config.flightSuretyApp.activateRegisteredAirline({from: newAirline2, value: web3.utils.toWei("10", "ether")});

        //Change operating status if majority is reached
        await config.flightSuretyData.setOperatingStatus(false, "Something wrong with the registration process!", {from: config.firstAirline});
        await config.flightSuretyData.setOperatingStatus(false, "Something wrong with the registration process!", {from: newAirline2});

    //State of contrat after voting of three registered and active airlines
    let changedState = await config.flightSuretyData.isOperational.call();
    //console.log(changedState);

    // ASSERT
    assert.equal(changedState, !originalState, "State of contract has not changed!");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true, "Setting back for further testing", {from: newAirline2});
    await config.flightSuretyData.setOperatingStatus(true, "Setting back for further testing", {from: config.firstAirline});
    
    //let changedState1 = await config.flightSuretyData.isOperational.call();
    //console.log(changedState1);
  });

    it(`multiparty can block access to functions using requireIsOperational when operating status is false`, async function () {
    
      // ARRANGE

      //New airlines to be registered for simulating two-third majority (multiparty-testing)
      let newAirline3 = accounts[3];
      let newAirline4 = accounts[4];

      //Referene variable
      let reverted = false;

      try 
      {
        //Registering one more airline 
        await config.flightSuretyApp.registerAirline(newAirline3, "Airline3", {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(newAirline4, "Airline4", {from: config.firstAirline});

        //Ensuring that all newly registered airlines have paid the requested amount of 10 Ether as funding
        await config.flightSuretyApp.activateRegisteredAirline({from: newAirline3, value: web3.utils.toWei("10", "ether")});
        await config.flightSuretyApp.activateRegisteredAirline({from: newAirline4, value: web3.utils.toWei("10", "ether")});

        //Change operating status if majority is reached
        await config.flightSuretyData.setOperatingStatus(false, "Something wrong with the registration process!", {from: newAirline3});
        await config.flightSuretyData.setOperatingStatus(false, "Something wrong with the registration process!", {from: newAirline4});

        await config.flightSuretyData.getAirlines();
                   
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for registerAirline!");     

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true, "Setting back for further testing", {from: newAirline3});
      await config.flightSuretyData.setOperatingStatus(true, "Setting back for further testing", {from: newAirline4});

      let changedState1 = await config.flightSuretyData.isOperational.call();
      //console.log(changedState1);
  });

  /*---------------------------------------------- Airline testing -------------------------------------------------------*/

  it('Airline can be registered, but does not participate in contract until it submits funding of 10 ether', async () => {
    
    // ARRANGE
    let newAirline5 = accounts[5];
    let reverted = false;

    // ACT
    try{
        //Registering new airline with first one
        await config.flightSuretyApp.registerAirline(newAirline5, "Airline5", {from: config.firstAirline});
        await config.flightSuretyData.registerAirline(newAirline6, "Airline6", {from: newAirline5});
        //await config.flightSuretyApp.activateRegisteredAirline(web3.utils.toWei("10", "ether"), {from: newAirline1});     
    }
    catch(e){
      reverted = true;
    }
    
    assert.equal(reverted, true, "Airline should not be able to register another airline if it hasn't provided funding (incl. first airline)"); 
  });

  it('Registration process takes place as planned (first four airlines registered by first airline, then multi-party consensus (>= 50%) required', async () => {
    
    // ARRANGE
    let currentAirlines = await config.flightSuretyData.getAirlines();
    let Airline2 = currentAirlines[2];
    let Airline3 = currentAirlines[3];
    let Airline4 = currentAirlines[4];

    let newAirline6 = accounts[6];
    
    //Registering "fifth" Airline through multi-party consensus

    /*ATTENTION: Although every test needs to re-define his invidual variables (e.g. Airlines), the total number of Airlines
    is stored, so that for the multiparty voting process the previous registered Airlines need to be taken into account for a majority!*/

    //await config.flightSuretyApp.registerAirline(newAirline6, "Airline 6", {from: config.firstAirline});
    await config.flightSuretyApp.registerAirline(newAirline6, "Airline 6", {from:  Airline2});
    await config.flightSuretyApp.registerAirline(newAirline6, "Airline 6", {from:  Airline3});
    await config.flightSuretyApp.registerAirline(newAirline6, "Airline 6", {from:  Airline4});

    //Results for the registration process of the four airlines
    let result1 = await config.flightSuretyData.IsAirlineRegistered.call(config.firstAirline); 
    let result2 = await config.flightSuretyData.IsAirlineRegistered.call(Airline2); 
    let result3 = await config.flightSuretyData.IsAirlineRegistered.call(Airline3); 
    let result4 = await config.flightSuretyData.IsAirlineRegistered.call(Airline4); 
    let result5 = await config.flightSuretyData.IsAirlineRegistered.call(newAirline6);

    // ASSERT
    assert.equal(result5, true, "Fifth Airline can only be registered if more than 50% of registered and active Airlines agree!");

  });

  /*---------------------------------------------- Passenger testing -------------------------------------------------------*/

  it('Passenger can purchase insurance (up to 1 Ether)', async () => {
    
    // ARRANGE
    let currentAirlines = await config.flightSuretyData.getAirlines();
    let Airline2 = currentAirlines[2];
    let Passenger1 = accounts[8];

    // ACT
    try {
        await config.flightSuretyApp.passengerPayment("Flight 100", Airline2, 100, {from: Passenger1, value: web3.utils.toWei("1", "ether")});
    }
    catch(e) {
        console.log("Error with passenger payment!");
        //let check = await config.flightSuretyData.IsAirlineRegistered(Airline3);
        //let check1 = await config.flightSuretyData.IsAirlineActive(Airline3);
        //console.log(check);
        //console.log(check1);
    }
    let result = await config.flightSuretyApp.getPassengerPaidAmount.call("Flight 100", 100, Airline2); 

    // ASSERT
    assert.equal(result, web3.utils.toWei("1", "ether"), "Amount paid should be > 0 Ether!");

  });

  it('Passenger can withdraw and receives 1.5 times amount paid', async () => {
    
    // ARRANGE
    let currentAirlines = await config.flightSuretyData.getAirlines();
    let Airline6 = currentAirlines[2];
    let Passenger1 = accounts[8];

    //Checking balance before withdrawal and after payment
    let balance1 = await web3.eth.getBalance(Passenger1);     

    // ACT
    //try {
        //Sending additional 10 ether to the data contract (by a already registered and active Airline), in order to have enough ether to pay the refund!
        await config.flightSuretyData.fund(Airline6, {value: web3.utils.toWei("10", "ether")});

        //await config.flightSuretyApp.activateRegisteredAirline({from: Airline6, value: web3.utils.toWei("10", "ether")});
       
        await config.flightSuretyApp.passengerPayment("Flight 100", Airline6, 100, {from: Passenger1, value: web3.utils.toWei("1", "ether")});
        await config.flightSuretyApp.passengerRepayment("Flight 100", Airline6, 100);
        await config.flightSuretyApp.passengerWithdrawal("Flight 100", Airline6, 100, Passenger1);
    /*}
    catch(e) {
        console.log("Error!");
    }*/
    let paidAmount = await config.flightSuretyApp.getPassengerPaidAmount.call("Flight 100", 100, Airline6);
    let refund = await config.flightSuretyApp.getRepaidAmountPassenger.call("Flight 100", 100, Airline6); 

    //Checking balance after withdrawal
    let balance2 = await web3.eth.getBalance(Passenger1);

    /*console.log(balance1);
    console.log(balance2);
    console.log(balance2-balance1);
    console.log(balance3);
    console.log(balance4);
    console.log(balance4-balance3);*/
    
    //console.log(refund);
    //console.log(paidAmount);

    // ASSERT
    
    assert.equal(refund, 1.5*paidAmount, "Passenger is not getting the 1.5x amount of his purchase as refund!");
    
    //Alternative assert method (see all available methods at "Assert.sol" - https://github.com/trufflesuite/truffle/blob/develop/packages/core/lib/testing/Assert.sol)
    /*Test scheme: The passenger has invested 1 ether in a flight insurance. The flight is delayed, therefore he gets 1.5 ether back as refund.
    In total his balances before and after the payment and refund should therefore differ +0.5 ether (passenger has gained 0.5 ether). As however, the transaction
    costs a bit of gas, the refund amount wont be exactly 0.5 ether but a bit less. The assert function therefore makes sure, that the error is smaller then 1 ether, thereby
    making sure that 0.5 ether were indead sent as refund. Is there a way of sending exactly 0.5 ether?*/

    assert.isTrue((web3.utils.toWei("0.5", "ether")-(balance2-balance1)) <= web3.utils.toWei("1", "ether"), "Passenger cannot withdraw correct amount!");
  });

});
