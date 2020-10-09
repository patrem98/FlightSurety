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
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        //Submitting Flight


        //++++++++++++++++++ Airline-related functions +++++++++++++++++++++++++++

        //Registering Airline (from index.html - address-airline, submit-airline)
        DOM.elid('submit-airline').addEventListener('click', () => {
            let airline = DOM.elid('address-airline').value;
            //Write transaction
            contract.registerAirline(airline, (error, result) => {
                display();
            });
        })

        //Activating Airline




        //++++++++++++++++++ Passenger-related functions +++++++++++++++++++++++++++
    
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







