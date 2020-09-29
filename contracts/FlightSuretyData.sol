pragma solidity >=0.5;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct Airline {
        bool isRegistered;
        bool isActive;                                                   //true if registered airline submits funding of 10 ether
        address addressAirline;
        string airlineName;
        uint256 fund;
    }
    
    mapping(address => uint256) authorizedCallers;                      // To check that only App contract can call in!
    //address private firstairline = 0xf17f52151EbEF6C7334FAD080c5704D77216b732; //Defined in "2_deploy_contracts.js" as first airline and therefore contractOwner!

    address payable contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => Airline) private airlines;                               // Mapping for storing user profiles
    address[] airlineAccts = new address[](0); 
    
    uint256 private constant VOTING_THRESHOLD = 50;    // Implemented voting mechanism bases on multi-party consensus                                      

    uint256 constant M = 2;                                             // M = number of required addresses for consensus
    address[] multiCalls = new address[](0);                            // Array of addresses to prevent multiple calls of the same address (short array only --> lockout bug thru gaslimit!)

    //uint256 buyLimit = 600;                                             // 600 equals 10 times 60 seconds, meaning min 10 minutes between two function calls when buying!
    uint256 private enabled = block.timestamp;                          // "Timer"-variable for Rate Limiting modifier
    uint256 payoutLimit = 600;                                          // 600 equals 10 times 60 seconds, meaning min 10 minutes between two function calls when paying insurees!

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier checking that only the App contract can call in! --> For every externally callable function!
    */
    modifier isCallerAuthorized()
    {
        require(authorizedCallers[msg.sender] == 1, "Caller is not authorized!");
        _;
    }
    
    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /** 
    * @dev Modifier that implements multi-party consensus to execute a specific function
    */
    modifier requireMultiPartyConsensus(bool mode)
    {
        _; 
        
        bool isDuplicate = false;

        for(uint c=0; c<multiCalls.length; c++) {
            if (multiCalls[c] == msg.sender) {
                isDuplicate = true;
                break;
                }
        }

        require(!isDuplicate, "Caller has already called this function.");

        multiCalls.push(msg.sender);
            if (multiCalls.length.div(airlineAccts.length).mul(100) >= VOTING_THRESHOLD) {
                operational = mode;   
                multiCalls = new address[](0);      
            }  

    }

    /** 
    * @dev Modifier that implements "Rate Limiting" as a payment protection pattern (in general limiting function calls when applied)
    */ 
    modifier rateLimit(uint256 time) {
        require(block.timestamp >= enabled, "Rate limiting in effect");
        enabled = enabled.add(time);
        _;
    }

    /**
    * @dev Modifier that requires the function caller to be a registered and participating (submitted funds) Airline
    */
    modifier requireIsAirline()
    {
        require(airlines[msg.sender].isRegistered && airlines[msg.sender].isActive, "Only registered and active airline can register new ones!");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Check if caller is authorized (after update previous authorization should be deleted -> "deauthorizeContract")
    *
    */
    function authorizeContract(address dataContract) external requireContractOwner {
        authorizedCallers[dataContract] = 1;
    }

    function deauthorizeContract(address dataContract) external requireContractOwner {
        delete authorizedCallers[dataContract];
    }

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            external 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireMultiPartyConsensus(mode)
                            //isCallerAuthorized
                            //requireIsAirline
                            //requireIsOperational
                            // requireContractOwner --> After implementation of Multi-party consensus no longer valid/necessary
    {   
        require(mode != operational, "New mode must be different from existing mode");
    }

    /**
    * @dev Gets specific element / address from airlines mapping!
    */    
    function getAirlines() external view requireIsOperational returns(address[] memory) {
        return airlineAccts;
    }

    /**
    * @dev Gets name of specific Airline in airlines mapping!
    */    
    function getAirlineName(address addressAirline) external view requireIsOperational returns(string memory) {
        return airlines[addressAirline].airlineName;
    }

    /**
    * @dev Gets the amount of airlines already registered
    */    
    function numberRegisteredAirlines() external view  requireIsOperational returns(uint256) {
        return airlineAccts.length;
    }

    /**
    * @dev Checking if registered airline is active (has paid the requested fund)
    */    
    function IsAirlineActive (address addressAirline) external view requireIsOperational returns(bool) {
        require(addressAirline != address(0), "0x0 address not allowed!");
        require(airlines[addressAirline].isRegistered, "Airlines is not yet registered, please register and await voting!");
        return airlines[addressAirline].isActive;
    }   

    /**
    * @dev Checking if address is registered airline
    */    
    function IsAirlineRegistered (address addressAirline) external view requireIsOperational returns(bool) {
        require(addressAirline != address(0), "0x0 address not allowed!");
        return airlines[addressAirline].isRegistered;
    } 

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
    * @dev Add the first Airline! An extra function was implemented only for the registration of the first airline, 
    * as from the second one the modifier "isCallerAuthorized" is used to make sure that only the current App-Contract 
    * is able to call in. As the contract address of the App conract is computed out of the senders address and the nonce,
    * it is difficult (but probably also possible) to know it in advance in order to grant permission to the App contract to register the first Airline.
    */   
    function registerFirstAirline
                            (   
                                address payable addressAirline,
                                uint256 amountPaid
                            )
                            external
                            payable
                            requireIsOperational
                            rateLimit(payoutLimit)
                            //requireIsAirline
    {
        require(amountPaid == 10 ether, "The amount must be equal to 10 ether (ETH)!");

        //fund(msg.sender, amountFund);

        addressAirline.transfer(amountPaid);

        airlines[addressAirline] = Airline({
            isRegistered: true,
            isActive: true,
            addressAirline: addressAirline,
            airlineName: "First Airline",
            fund: amountPaid
        });

        airlineAccts.push(addressAirline);

        //Authorize App-contract for all other external functions
        authorizedCallers[msg.sender] = 1;
    }
   
   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                address addressAirline,
                                string calldata nameAirline
                            )
                            external
                            //requireMultiPartyConsensus(mode) 
                            isCallerAuthorized
                            requireIsAirline
                            requireIsOperational
    {
        airlines[addressAirline] = Airline({
            isRegistered: true,
            isActive: false,
            addressAirline: addressAirline,
            airlineName: nameAirline,
            fund: 0
        });

        airlineAccts.push(addressAirline);
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    /*function buy
                            (    
                                address addressAirline
                                //address addressInsuree,
                                //string flight,
                                //uint256 timestamp                         
                            )
                            external
                            payable
                            isCallerAuthorized
                            rateLimit(buyLimit) //Rate Limiting, to prevent customers to potentially drain funds.
    {
        //bytes32 flightkey = getFlightKey(addressAirline, flight, updatedTimestamp);
        airlines[addressAirline].amountPaidInsurances.add(msg.value);
    }*/

    /**
     *  @dev Credits payouts to insurees
    */
    /*function creditInsurees
                                (

                                )
                                external
                                isCallerAuthorized
                                rateLimit(payoutLimit) // Rate Limitting, to limit payouts to insurees
    {

    }*/
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    /*function pay
                            (
                            )
                            external
                            //pure
                            isCallerAuthorized
                            rateLimit(payoutLimit) // Rate Limitting, to limit payouts to insurees
    {
    }*/

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (
                                address payable addressRegisteredAirline,
                                uint256 amountFund
                            )
                            external
                            payable
                            isCallerAuthorized
                            requireIsOperational
    {
        addressRegisteredAirline.transfer(amountFund);

        airlines[addressRegisteredAirline].isActive = true;
        airlines[addressRegisteredAirline].fund = amountFund; 
    }

    /*function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }*/

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function fallback() external payable
    {
        contractOwner.transfer(msg.value);
    }

   // receive() external payable
   // {
   //     contractOwner.transfer(msg.value);
   // }
}

