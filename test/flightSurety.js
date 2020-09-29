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

  it(`multiparty has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  //ADD - TEST FOR PREVENTING LOCKOUT BUG!!!

  it(`multiparty can block access to setOperatingStatus()`, async function () {

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
            
  });

  it(`multiparty can allow change of state of contract if majority is reached`, async function () {

    // ARRANGE
    let newAirline1 = accounts[2];
    let newAirline2 = accounts[3];
    let newAirline3 = accounts[4];

    //Saving the initial contract state
    let originalState = await config.flightSuretyData.isOperational.call();
    console.log(originalState);

    // ACT
    try {
        //Registering four new airlines
        await config.flightSuretyApp.registerAirline(newAirline1, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(newAirline3, {from: config.firstAirline});

        //Ensuring that all newly registered airlines have paid the requested amount of 10 Ether as funding
        await config.flightSuretyApp.activateRegisteredAirline(web3.utils.toWei("10", "ether"), {from: newAirline1});
        await config.flightSuretyApp.activateRegisteredAirline(web3.utils.toWei("10", "ether"), {from: newAirline2});
        await config.flightSuretyApp.activateRegisteredAirline(web3.utils.toWei("10", "ether"), {from: newAirline3});

        //Change operating status if majority is reached
        await config.flightSuretyApp.setOperatingStatus(false, {from: newAirline1});
        await config.flightSuretyApp.setOperatingStatus(false, {from: newAirline2});
        await config.flightSuretyApp.setOperatingStatus(false, {from: newAirline3});
    }
    catch(e) {
      console.log("Error!");
    }

    //State of contrat after voting of three registered and active airlines
    let changedState = await config.flightSuretyData.isOperational.call();
    console.log(changedState);

    // ASSERT
    assert.equal(changedState, !originalState, "State of contract has not changed!");

  });

    it(`multiparty can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);
      let reverted = false;

      try 
      {
          //await config.flightSurety.setTestingMode(true);
          await config.flightSuretyData.getAirlines();
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");     

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  /*---------------------------------------------- Airline testing -------------------------------------------------------*/

  it('Airline can be registered, but does not participate in contract until it submits funding of 10 ether', async () => {
    
    // ARRANGE
    //let firstAirline = accounts[2];
    //let newAirline = accounts[3];

    let firstAirline = config.testAddresses[0];
    let newAirline = config.testAddresses[1];

    // ACT
    //try {
        await config.flightSuretyData.registerFirstAirline({from: firstAirline}, "First Airline", web3.utils.toWei("10", "ether"));
        await config.flightSuretyApp.registerAirline(newAirline, {from: firstAirline});
    //}
    //catch(e) {

    //}
        let result = await config.flightSuretyData.IsAirlineRegistered.call(newAirline); 

    // ASSERT
    //assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding (incl. first airline)");
    assert.equal(result, true, "(First) Airline should be able to register up to 4 other airlines after transfering required funds!");

  });

  it('Registration process takes place as planned (first four airlines registered by first airline, then multi-party consensus (>= 50%) required', async () => {
    
    // ARRANGE
    let newAirline1 = accounts[2];
    let newAirline2 = accounts[3];
    let newAirline3 = accounts[4];
    let newAirline4 = accounts[5];
    let newAirline5 = accounts[6];

    // ACT
    try {
        //Registering four new airlines
        await config.flightSuretyApp.registerAirline(newAirline1, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(newAirline2, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(newAirline3, {from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(newAirline4, {from: config.firstAirline});

        //Ensuring that all newly registered airlines have paid the requested amount of 10 Ether as funding
        await config.flightSuretyApp.activateRegisteredAirline(web3.utils.toWei("10", "ether"), {from: newAirline1});
        await config.flightSuretyApp.activateRegisteredAirline(web3.utils.toWei("10", "ether"), {from: newAirline2});
        await config.flightSuretyApp.activateRegisteredAirline(web3.utils.toWei("10", "ether"), {from: newAirline3});
        await config.flightSuretyApp.activateRegisteredAirline(web3.utils.toWei("10", "ether"), {from: newAirline4});

        //Registering fifth Airline through multi-party consensus
        await config.flightSuretyApp.registerAirline(newAirline5, {from: firstAirline, newAirline1, newAirline2, newAirline3});
    }
    catch(e) {

    }
    //Results for the registration process of the first four airlines
    let result1 = await config.flightSuretyData.IsAirlineRegistered.call(newAirline1); 
    let result2 = await config.flightSuretyData.IsAirlineRegistered.call(newAirline2); 
    let result3 = await config.flightSuretyData.IsAirlineRegistered.call(newAirline3); 
    let result4 = await config.flightSuretyData.IsAirlineRegistered.call(newAirline4); 

    //Result for the fifth registration process
    let result5 = await config.flightSuretyData.IsAirlineRegistered.call(newAirline5);

    // ASSERT
    assert.equal(result1, false, "First Airline should be able to register first airline!");
    assert.equal(result2, false, "First Airline should be able to register second airline!");
    assert.equal(result3, false, "First Airline should be able to register third airline!");
    assert.equal(result4, false, "First Airline should be able to register forth airline!");

    assert.equal(result4, false, "Fifth Airline can only be registered if more than 50% of registered and active Airlines agree!");

  });

  /*---------------------------------------------- Passenger testing -------------------------------------------------------*/

  it('Passenger can purchase insurance (up to 1 Ether)', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    //let passenger = accounts[3];

    // ACT
    try {
        await config.flightSuretyApp.passengerPayment("Flight 100", 100, {from: config.newAirline, value: web3.utils.toWei("1", "ether")});
    }
    catch(e) {

    }
    let result = await config.flightSuretyApp.getPassengerPaidAmount.call("Flight 100", 100, newAirline); 

    // ASSERT
    assert.equal(result, web3.utils.toWei("1", "ether"), "Amount paid should be > 0 Ether!");

  });

  it('Passenger can withdraw and receives 1.5 times amount paid', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    let passenger = accounts[3];

    // ACT
    try {
        await config.flightSuretyApp.passengerRepayment("Flight 100", 100, {from: config.newAirline, value: web3.utils.toWei("1", "ether")});
        await config.flightSuretyApp.passengerWithdrawal("Flight 100", 100, {from: config.newAirline, value: web3.utils.toWei("1", "ether"), passenger});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.getRepaidAmountPassenger.call("Flight 100", 100, newAirline); 
    let balance = await web3.eth.getBalance(passenger);

    // ASSERT
    assert.equal(result, false, "Passenger is not getting the 1.5x amount of his purchase as refund!");
    assert.equal(result, balance, "Passenger cannot withdraw correct amount!");
  });

});
