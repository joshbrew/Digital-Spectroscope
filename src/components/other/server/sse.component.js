
import {DOMElement, addCustomElement} from 'fragelement';
import {settings} from '../../../../node_server/server_settings'

let component = require('./sse.component.html');

//See: https://github.com/brainsatplay/domelement
export class SSE extends DOMElement {
    props={
        protocol:settings.protocol,
        host:settings.host, 
        port:settings.python, 
        subdomain:'sse',
        sse:undefined,
        logger:undefined //logger node
    } //can specify properties of the element which can be subscribed to for changes.
    
    //set the template string or function (which can input props to return a modified string)
    template=component;

    constructor(){
        super();
    }

    onmessage = async (event) => {

        let ts = new Date(Date.now());
        let tsm = ts.getHours()+':'+ts.getMinutes()+':'+ts.getSeconds();

        let msg = event.data;
        if(event.data.constructor.name === 'Blob') msg = await event.data.text();

        let message = `${tsm}:: SSE ${this.props.host}:${this.props.port} message:\n ${msg}`;
        let template = `<tr><td style='color:yellow;'>${message}</tr></td>`;

        if(this.props.logger) this.props.logger.props.log(message,template);
        else console.log(message);
    }

    //DOMElement custom callbacks:
    oncreate=(props)=>{
        //let host = 'localhost';
        //let port = 7000;

        if(!props.logger) props.logger = document.querySelector('logger-');
        else if(typeof props.logger === 'string') props.logger = document.getElementById(props.logger);

        try {
            props.sse = new EventSource(`${props.protocol}://${props.host}:${props.port}/${props.subdomain}`);
            this.sse = props.sse;

            if(props.sse) props.sse.onmessage = this.onmessage;

            props.sse.onerror = (er) => { 
                console.error(er);
                props.sse.close(); 
            }
            
        }
        catch(err) {
            console.error(err);
        }
    }
    //onresize=(props)=>{} //on window resize
    //onchanged=(props)=>{} //on props changed
    ondelete=(props)=>{
        props.sse.close()
    } //on element deleted. Can remove with this.delete() which runs cleanup functions
}

//window.customElements.define('custom-', Custom);

addCustomElement(SSE,'sse-');
