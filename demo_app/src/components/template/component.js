
import {DOMElement} from 'fragelement';

let component = require('./component.html');

//See: https://github.com/brainsatplay/domelement
export class Custom extends DOMElement {
    props={} //can specify properties of the element which can be subscribed to for changes.
    
    //set the template string or function (which can input props to return a modified string)
    template=component;

    //DOMElement custom callbacks:
    oncreate=(props)=>{
        //set up the business logic for the component
        let button = this.querySelector('button');
        let div = this.querySelector('div');
        if(button) button.onclick = (ev)=>{
            div.innerHTML = 'Clicked!'
        };
    }
    //onresize=(props)=>{} //on window resize
    //onchanged=(props)=>{} //on props changed
    //ondelete=(props)=>{} //on element deleted. Can remove with this.delete() which runs cleanup functions
}

//window.customElements.define('custom-', Custom);

Custom.addElement('custom-');
