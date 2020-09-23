pragma solidity >=0.4.25;

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

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => Airline) private airlines;                               // Mapping for storing user profiles
    address[] airlineAccts = new address[](0); 

    uint256 constant M = 2;                                             // M = number of required addresses for consensus
    address[] multiCalls = new address[](0);                            // Array of addresses to prevent multiple calls of the same address (short array only --> lockout bug thru gaslimit!)

    //uint256 buyLimit = 600;                                             // 600 equals 10 times 60 seconds, meaning min 10 minutes between two function calls when buying!
    //uint256 private enabled = block.timestamp;                          // "Timer"-variable for Rate Limiting modifier
    //uint256 payoutLimit = 600;                                          // 600 equals 10 times 60 seconds, meaning min 10 minutes between two function calls when paying insurees!

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
        bool isDuplicate = false;
        for(uint c=0; c<multiCalls.length; c++) {
            if (multiCalls[c] == msg.sender) {
                isDuplicate = true;
                break;
            }
        }
        require(!isDuplicate, "Caller has already called this function.");

        multiCalls.push(msg.sender);
        if (multiCalls.length >= M) {
            operational = mode;      
            multiCalls = new address[](0);      
        }
        _;
    }

    /** 
    * @dev Modifier that implements "Rate Limiting" as a payment protection pattern (in general limiting function calls when applied)
    */ /*
    modifier rateLimit(uint256 time) {
        require(block.timestamp >= enabled, "Rate limiting in effect");
        enabled = enabled.add(time);
        _;
    } */

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
                            public 
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
                            isCallerAuthorized
                            // requireContractOwner --> After implementation of Multi-party consensus no longer valid/necessary
    {   
        require(mode != operational, "New mode must be different from existing mode");
        //require(airlines[msg.sender].isAdmin, "Caller is not an admin");
    }

    /**
    * @dev Gets specific element / address from airlines mapping!
    */    
    function getAirlines() view public returns(address[]) {
        return airlineAccts;
    }


    /**
    * @dev Gets the amount of airlines already registered
    */    
    function numberRegisteredAirlines() external view  returns(uint256) {
        return airlineAccts.length;
    }

    /**
    * @dev In order to access airlines from the FlightSuretyApp contract
    */    
    function IsAirlineActive (address addressAirline) external view returns(bool) {
        //equire(addressAirline != address(0), "0x0 address not allowed!");
        return airlines[addressAirline].isActive;
    }   

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                address addressAirline,
                                string nameAirline
                            )
                            external
                            //requireMultiPartyConsensus(mode) 
                            isCallerAuthorized
                            requireIsAirline
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
                                address addressRegisteredAirline,
                                uint256 amountFund
                            )
                            public
                            payable
                            isCallerAuthorized
    {
        airlines[addressRegisteredAirline].fund.transfer(amountFund);

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
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

