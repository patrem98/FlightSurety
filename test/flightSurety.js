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

      // Ensure that access is denied for accounts not holding enough "votes" by the members (registered & active airlines)
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted by multiparty consensus mechanism");
            
  });

  it(`multiparty can allow access to setOperatingStatus()`, async function () {

      // Ensure that access is allowed for accounts not holding enough "votes" by the members (registered & active airlines)
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
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
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.IsAirlineRegistered.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding (incl. first airline)");

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
        await config.flightSuretyApp.activateRegisteredAirline(newAirline1, {from: config.newAirline1});
        await config.flightSuretyApp.activateRegisteredAirline(newAirline2, {from: config.newAirline2});
        await config.flightSuretyApp.activateRegisteredAirline(newAirline3, {from: config.newAirline3});
        await config.flightSuretyApp.activateRegisteredAirline(newAirline4, {from: config.newAirline4});

        //Registering fifth Airline through multi-party consensus
        await config.flightSuretyApp.registerAirline(newAirline5, {from: config.firstAirline, config.newAirline1, config.newAirline2, config.newAirline3});
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

    // ACT
    try {
        await config.flightSuretyApp.passengerPayment(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.IsAirlineRegistered.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding (incl. first airline)");

  });



});
