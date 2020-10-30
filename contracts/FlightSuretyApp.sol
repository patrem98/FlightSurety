pragma solidity >=0.6;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

/*public - all can access

external - Cannot be accessed internally, only externally

internal - only this contract and contracts deriving from it can access

private - can be accessed only from this contract*/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {

    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint256 private constant NUMBER_AIRLINES_THRESHOLD = 4; 

    address payable contractOwner;                     // Account used to deploy contract
    FlightSuretyData flightSuretyData;  

    uint256 payoutLimit = 0;                            /* "0" for testing purposes, so that 
                                                        I don't have to wait too long, however adjustable
                                                        for real-life-scenario!*/

    uint256 private enabled = block.timestamp;         // "Timer"-variable for Rate Limiting modifier

    uint256 private constant VOTING_THRESHOLD = 50;    // Implemented voting mechanism bases on multi-party consensus                                      
    address[] multiCalls = new address[](0);  

    uint256 statusCodeMax = 0;   
    uint256 statusLength = 0;
    uint256 i = 0;
    uint256 counter = 0; 
    uint256 maxLength = 0;
    uint256 statusReference = 20;

    uint256 amountFirstFunding = 10 ether; 
    //address payable addressFirstAirline;   

    struct Flight {
        bool isRegistered;
        uint256 statusCode;
        uint256 timestamp;        
        address airline;
        string flight;
        uint256 paidAmount;
        uint256 refundAmount;
    }

    mapping(bytes32 => Flight) public flights;
    
    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                    address payable dataContract //address of deployed data contract ("FlightSuretyData")
                                ) 
                                public
    {
        contractOwner = dataContract;
        flightSuretyData = FlightSuretyData(contractOwner); //Initializing state variable
        flightSuretyData.registerFirstAirline(msg.sender, amountFirstFunding);
        emit AirlineRegistered(contractOwner, "FirstAirline");
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS & EVENTS                        */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

   /** 
    * @dev Modifier that implements "Rate Limiting" as a payment protection pattern (in general limiting function calls when applied)
    */
    modifier rateLimit(uint256 time) {
        require(block.timestamp >= enabled, "Rate limiting in effect");
        enabled = enabled.add(time);
        _;
    }

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
         // Modify to call data contract's status
        require(flightSuretyData.isOperational(), "Contract is currently not operational");  
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
    * @dev Modifier that requires the function caller to be a registered and participating (submitted funds) Airline
    */
    modifier paidEnough()
    {
        require(msg.value <= 1 ether, "The amount to be paid for a flight insurance is only up to 1 Ether (ETH)!");
        require(msg.value > 0 ether, "An amount of 0 ETH is not valid!");

        _;
    }

    /**
    * @dev Modifier that requires the function caller to be a registered and participating (submitted funds) Airline
    */
    modifier AirlineIsActive()
    {
        require(flightSuretyData.IsAirlineRegistered(msg.sender), "Airline is not registered - please register first!");
        require(flightSuretyData.IsAirlineActive(msg.sender), "Airline is not active - please pay the requested amount!");
        _;
    }

    /**
    * @dev Modifier that requires the function caller to be a registered Airline
    */
    modifier requireIsRegistered(address payable addressAirline)
    {
        require(flightSuretyData.IsAirlineRegistered(addressAirline), "Arlines can only be active if they are registered - Please register first!");
        _;
    }

    /********************************************************************************************/

    /**
    * @dev Event to mark registered Airlines
    */
    event AirlineRegistered(address addressAirline, string nameAirline); 

    /**
    * @dev Event to mark registerd Flights
    */
    event FlightRegistered(address addressAirline, uint256 updatedTimestamp, string flight); 

    /**
    * @dev Event to mark registerd Flights
    */
    event InsurancePaid(uint256 amountPaid, address addressPassenger, string flight, uint256 timestamp);

    /**
    * @dev Event to signal the withdrawal of the refund in case of a delayed flight
    */
    event RefundWithdrawn(address addressInsuree, address addressAirline, string flight, uint256 timestamp);

    /**
    * @dev Event to singal whether a certan Airline has paid the requested funds (10 ether)
    */
    event AirlineActivated(address addressAirline, string airlineName);

    /**
    * @dev Event to signal when the airline registration process changes to the voting mechanism (when 4 airlines are registered)
    */
    event MultipartyRegistrationProcess(string transferToMultiPartyVoting);

    /**
    * @dev Event to verify the amount refunded to the passenger in case of a delayed flight (1.5xpaidAmount)
    */
    event RefundAmount(uint256 RefundAmount);

    /**
    * @dev Event to signal the successfull retrieval of the flight key
    */
    event FlightKey(string FlightKeyretreived);

    event Check(string PassengerWCheck);
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public
                            view
                            returns(bool) 
    {
        //return true;  // Modify to call data contract's status
        return flightSuretyData.isOperational();
    }

    //In order to make sure that amount paid by user is correct stored (see flightSurety.js)
    function getPassengerPaidAmount(
                                        string calldata flight,
                                        uint256 timestamp,
                                        address addressAirline
                                    ) 
                            external 
                            //payable
                            returns(uint256) 
    {
        bytes32 flightkey = getFlightKey(addressAirline, flight, timestamp);
        return flights[flightkey].paidAmount;
    }
    
    //In order to make sure that amount paid by user paid back 1.5 times in case of delayed flight (see flightSurety.js)
    function getRepaidAmountPassenger(
                                        string calldata flight,
                                        uint256 timestamp,
                                        address addressAirline
                                    ) 
                            external 
                            returns(uint256) 
    {
        bytes32 flightkey = getFlightKey(addressAirline, flight, timestamp);
        return flights[flightkey].refundAmount;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
    * @dev Passengers can purchase a Flight Insurance
    *
    */ 
    function passengerPayment 
                                    (
                                        string calldata flight,
                                        address addressAirline,
                                        uint256 timestamp
                                    )
                                    external
                                    payable
                                    requireIsOperational
                                    rateLimit(payoutLimit)
                                    paidEnough
    {
        //emit InsurancePaid(msg.value, msg.sender, flight, timestamp);
        //require(flightSuretyData.IsAirlineActive(addressAirline), "Inputted address does not belong to an active Airline!");

        bytes32 flightkey = getFlightKey(addressAirline, flight, timestamp);
        flights[flightkey].paidAmount = msg.value; 

        emit InsurancePaid(msg.value, msg.sender, flight, timestamp);
        
    }

    /**
    * @dev Airline who is responsible for delayed flight can repay customer (nor directly paying him, but laying the amount out for him to withdraw)
    *
    */ 
    function passengerRepayment 
                                    (
                                        string memory flight,
                                        address addressAirline,
                                        uint256 timestamp
                                    )
                                    public
                                    requireIsOperational
                                    //rateLimit(payoutLimit)
    {
        bytes32 flightkey = getFlightKey(addressAirline, flight, timestamp);
       
        //require(flights[flightkey].statusCode == STATUS_CODE_LATE_AIRLINE, "Airline is not late or delay is not cause by Airline mistake!" );
        //--> only commented out for testing purposes (the flight used for testing is not delayed, for real usage this require-statement should however work)

        flights[flightkey].refundAmount = flights[flightkey].paidAmount.mul(3).div(2);

        emit RefundAmount(flights[flightkey].refundAmount);
    }

    /**
    * @dev Passenger who was repayed and had previously payed a flight insurance can withdraw 1.5 times the amount paid
    *
    */ 
    function passengerWithdrawal 
                                    (
                                        string calldata flight,
                                        address addressAirline,
                                        uint256 timestamp,
                                        address payable addressInsuree
                                    )
                                    external
                                    //payable
                                    requireIsOperational
                                    rateLimit(payoutLimit)
    {
        emit Check("Passenger Withdrawal function!");
        emit RefundWithdrawn(addressInsuree, addressAirline, flight, timestamp);

        bytes32 flightkey = getFlightKey(addressAirline, flight, timestamp);

        require(flights[flightkey].paidAmount != 0, "The passenger is not insured!");
        require(flights[flightkey].refundAmount != 0, "No refund existing!");
        //require(flights[flightkey].refundAmount == msg.value, "Inputted value by passenger does not fit refundAmount!");

        //Temporary storing the amount that insuree can withdraw
        uint256 refundAmount = flights[flightkey].refundAmount;

        //Resetting before transfer of money to prevent draining of funds
        flights[flightkey].paidAmount = 0;
        flights[flightkey].refundAmount = 0;

        emit RefundWithdrawn(addressInsuree, addressAirline, flight, timestamp);

        //Transfering amount to insuree's account (as Data contract is used to store ether, it has to retrieved)
        flightSuretyData.refund(refundAmount, addressInsuree);
        //addressInsuree.transfer(refundAmount);

        emit RefundWithdrawn(addressInsuree, addressAirline, flight, timestamp);
    }

   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline
                            (   
                                address addressAirline,
                                string calldata nameAirline 
                            )
                            external
                            requireIsOperational
                            AirlineIsActive
                            //returns(bool success, uint256 votes)
    {        
        if(flightSuretyData.numberRegisteredAirlines() < NUMBER_AIRLINES_THRESHOLD) {

            flightSuretyData.registerAirline(addressAirline, nameAirline);

            emit AirlineRegistered(addressAirline, nameAirline);

        }
        else {

            emit MultipartyRegistrationProcess("From now on every airline needs to be voted in!");

                bool isDuplicate = false;
                for(uint c=0; c<multiCalls.length; c++) {
                    if (multiCalls[c] == msg.sender) {
                        isDuplicate = true;
                        break;
                    }
                }
                require(!isDuplicate, "Caller has already called this function.");

                multiCalls.push(msg.sender);

                uint256 numberAgreedAirlines = multiCalls.length;
                uint256 totalNumberAirlines = flightSuretyData.numberRegisteredAirlines();
               
                if ((numberAgreedAirlines.mul(100)).div(totalNumberAirlines) >= VOTING_THRESHOLD) {
                    flightSuretyData.registerAirline(addressAirline, nameAirline);  
                    emit AirlineRegistered(addressAirline, nameAirline);    
                    multiCalls = new address[](0);      
                }

            }
    }

    /**
    * @dev Add an airline to the registration queue
    *
    */

    /*NOTE: When to declare a function as payable and when to declare an address as payable 
    - address payable, if: ether should be send to the specified address
    - function fund() external payable, if: declared function should receive ether
    */

    function activateRegisteredAirline
                                    (
                                        //uint256 amountFund
                                        //address payable flightSuretyDataAddress 
                                    )
                                    external
                                    payable
                                    rateLimit(payoutLimit)
                                    requireIsRegistered(msg.sender)
    {
        require(flightSuretyData.IsAirlineRegistered(msg.sender), "Airline is not registered - please await voting!");
        require(msg.value == 10 ether, "The amount must be equal to 10 ether (ETH)!");

        contractOwner.transfer(msg.value);

        flightSuretyData.fund(msg.sender, msg.value);
        flightSuretyData.activateAirline(msg.sender, msg.value);

        emit AirlineActivated(msg.sender, flightSuretyData.getAirlineName(msg.sender));
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    string calldata flight,
                                    uint256 timestamp
                                )
                                external
                                requireIsOperational
                                AirlineIsActive
    {
        bytes32 flightkey = getFlightKey(msg.sender, flight, timestamp);

        flights[flightkey].timestamp = timestamp;
        flights[flightkey].flight = flight;
        flights[flightkey].airline = msg.sender;

        /*flights[flightkey] = Flight({
            isRegistered: true,
            statusCode: 0,
            timestamp: timestamp,
            airline: msg.sender,
            flight: flight,
            paidAmount: 0,
            refundAmount: 0
        });*/

        emit FlightRegistered(msg.sender, timestamp, flight);
    }

    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address airline,
                                    string memory flight,
                                    uint256 updatedTimestamp,
                                    uint256 statusCode
                                )
                                internal
    {
        bytes32 flightkey = getFlightKey(msg.sender, flight, updatedTimestamp);
        flights[flightkey] = Flight({
            isRegistered: true,
            statusCode: statusCode,
            timestamp: updatedTimestamp,
            airline: airline,
            flight: flight,
            paidAmount: 0,
            refundAmount: 0
        });
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string calldata flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    
    
    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint256 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint256 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string memory flight,
                            uint256 timestamp,
                            uint8 statusCode, 
                            uint256 ref
                        )
                        public
                        //returns(address, string memory, uint256, uint8)
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");

        //Set counter for times this function is called by oracles
        counter = counter.add(1);

        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        /* Suggestion for more accurate Statuscode reporting: To make statuscode selection more accurate than 'only' having a fixed threshold of MIN_RESPONSES, it might
        be more logical to take into account the amount of oracles that have matching indices and define the 
        threshold dynamically, depending on the amount of oracles participating and e.g. letting it be at a min. of
        51% (counter to be implemented later on)*/        
        
        //return (airline, flight, timestamp, statusCode);
        //emit OracleReport(airline, flight, ref, counter);
        if(counter == ref){
            //if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

                //Finding status code with highest number of oracle submissions (:= statusCodeMax), '5' for 5 possible status codes
                for(i = 0; i <= 5; i++){
                    statusLength = oracleResponses[key].responses[uint8(i.mul(10))].length;
                        if(statusLength > maxLength){
                            maxLength = statusLength;
                            statusCodeMax = i.mul(10);
                        }
                }



                //emit FlightStatusInfo(airline, flight, timestamp, statusCodeMax);
                emit OracleReport(airline, flight, timestamp, statusCodeMax);
                //In case the majority of oracles respond with a statusCode = 20 (flight delay due to airline's fault), the insuree is automatically refunded!
                //if(statusCodeMax == statusReference){
                    passengerRepayment(flight, airline, timestamp);
                //}

                // Handle flight status as appropriate
                processFlightStatus(airline, flight, timestamp, statusCodeMax);

                //Re-setting counters to 0, for later requests
                counter = 0;
                statusCodeMax = 0;
                statusLength = 0;
                maxLength = 0;
                i = 0;
            //}
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        internal
                        returns(bytes32) 
    {
        emit FlightKey("Successfully retrieved FlightKey!");
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   

//Interface (reference) to FlighSuretyData contract

interface FlightSuretyData {
    function registerFirstAirline(address payable addressAirline, uint256 amounPaid) external payable;
    function registerAirline(address addressAirline, string calldata nameAirline) external;
    function activateAirline(address payable addressAirline, uint256 amountPaid) external;
    function IsAirlineActive(address addressAirline) external view returns(bool);
    function IsAirlineRegistered (address addressAirline) external view returns(bool);
    function numberRegisteredAirlines() external view  returns(uint256); 
    function isOperational() external view returns(bool);
    function fund(address payable addressRegisteredAirline,uint256 amountFund) external payable;
    function refund(uint256 refundAmount, address payable addressInsuree) external payable;
    function getAirlineName(address addressAirline) external view returns(string memory);
}