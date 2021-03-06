import DOM from './dom'; //Document Object Model (DOM) - programming API for HTML and XML documents, defines logical structure of documents and the way it is accessed and manipulated.
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
    

        // User-submitted transaction

        //++++++++++++++++++ Flight-related functions +++++++++++++++++++++++++++

        //Fetching Flight Status
        DOM.elid('get-status').addEventListener('click', () => {
            let addressAirline = DOM.elid('address-airline2').value;
            let flight = DOM.elid('flight2').value;
            let timestamp = DOM.elid('timestamp2').value;
            contract.fetchFlightStatus(addressAirline, flight, timestamp, (flight, status, timestamp) => {
                console.log(flight);
                console.log(status);
                console.log(timestamp);
                display('Oracles', 'Oracles response', [ { label: 'Flight Status', value: '\n | Flight:' + flight + '\n | Time:' + timestamp + '\n | Status:' + status }]);
            });
        });

        //Submitting Flight
        DOM.elid('register-flight').addEventListener('click', () => {
            let flight = DOM.elid('flight').value;
            let timestamp = DOM.elid('timestamp').value;
            //Write transaction
            contract.registerFlight(flight, timestamp, (error, result) => {
                console.log(error,result);
                alert("New Flight registered!");
            });
        });

        //++++++++++++++++++ Airline-related functions +++++++++++++++++++++++++++

        //Registering Airline (from index.html - address-airline, submit-airline)
        DOM.elid('register-airline').addEventListener('click', () => {
            let addressAirline = DOM.elid('address-airline').value;
            let nameAirline = DOM.elid('name-airline').value;
            //Write transaction
            contract.registerAirline(addressAirline, nameAirline, (error, result) => {
                console.log(error,result);
                alert("New Airline registered!");
            });
        });

        //Activating Airline
        DOM.elid('activate-airline').addEventListener('click', () => {
            let prizePaid = DOM.elid('funding-airline').value;
            //Write transaction
            contract.activateRegisteredAirline(prizePaid, (error, result) => {
                console.log(error, result);
                alert("Airline activated!");
            });
        })

        //Getting registered Airlines
        DOM.elid('get-airlines').addEventListener('click', () => {
            contract.getAirlines((error, result) => {
                console.log(error,result);
                //display('Airlines:', [ { label: 'Already registered Airlines:', error: error, value: result} ]);
                alert(`Following airline addresses are already registered: ${result}`);
            });
        })

        //++++++++++++++++++ Passenger-related functions +++++++++++++++++++++++++++

        //Purchasing insurance
        DOM.elid('buy').addEventListener('click', () => {
            let prizePaid = DOM.elid('buying-insurance').value;
            let flight = DOM.elid('flight3').value;
            let addressAirline = DOM.elid('address-airline3').value;
            let timestamp = DOM.elid('timestamp3').value;

            console.log(prizePaid, flight, addressAirline, timestamp);

            //Write transaction
            contract.passengerPayment(flight, addressAirline, timestamp, prizePaid, (error, result) => {
                console.log(error, result);
                alert("Insurance paid!");
            });
        })
            
        //Withdraw refund
        /*passengerRepayment()-function must be called before passenger withdrawal by the 
        respective airline (via cli, no front-end implemented (yet))*/
        DOM.elid('withdraw').addEventListener('click', () => {
            let flight = DOM.elid('flight4').value;
            let addressAirline = DOM.elid('address-airline4').value;
            let timestamp = DOM.elid('timestamp4').value;

            //Write transaction
            contract.passengerWithdrawal(flight, addressAirline, timestamp, (error, result) => {
                console.log(error, result);
                alert("Refund withdrawn!");
            });
        })

        //Getting insurance paid by passenger
        DOM.elid('get-insurance').addEventListener('click', () => {
            let flight = DOM.elid('flight5').value;
            let addressAirline = DOM.elid('address-airline5').value;
            let timestamp = DOM.elid('timestamp5').value;

            contract.getPassengerPaidAmount(flight, timestamp, addressAirline, (error, result) => {
                console.log(error,result);
                //display('Already registered Airlines:', [ { label: 'Already registered Airlines:', error: error, value: result[1]} ]);
                alert(result);
            });
        })

    });
    

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}
