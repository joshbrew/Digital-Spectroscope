
import {DOMElement, addCustomElement} from 'fragelement';
import {settings} from '../../../../node_server/server_settings'

let component = require('./socket.component.html');

//See: https://github.com/brainsatplay/domelement
export class Socket extends DOMElement {
    props={
        protocol:settings.socket_protocol,
        host:settings.host, 
        port:settings.python, //settings.python_node 
        subdomain:'',
        ws:undefined,
        logger:undefined //logger node
    } //can specify properties of the element which can be subscribed to for changes.
    
    //set the template string or function (which can input props to return a modified string)
    template=component;

    constructor(){
        super();

        //if(settings.protocol === 'http') this.props.protocol = 'ws'; //still ws for node sockets in https
    }

    //default
    onmessage = async (event) => {

        let ts = new Date(Date.now());
        let tsm = ts.getHours()+':'+ts.getMinutes()+':'+ts.getSeconds();

        let msg = event.data;

        if(event.data.constructor.name === 'Blob') msg = await event.data.text();

        let message = `${tsm}:: WS ${this.props.host}:${this.props.port} message:\n ${msg}`;
        let template = `<tr><td style='color:lightgreen;'>${message}</tr></td>`;

        if(this.props.logger) this.props.logger.props.log(message,template);
        else console.log(message);
    }

    onopen=undefined;
    onclose=undefined;

    //DOMElement custom callbacks:
    oncreate=(props)=>{
        //let host = 'localhost';
        //let port = 7000;

        if(!props.logger) props.logger = document.querySelector('logger-');
        else if(typeof props.logger === 'string') props.logger = document.getElementById(props.logger);

        try {
            props.ws = new WebSocket(`${props.protocol}://${props.host}:${props.port}/${props.subdomain}`);  
            props.ws.onmessage = this.onmessage;
            this.ws = props.ws;

            if(this.onopen) props.ws.addEventListener('open', this.onopen);
            if(this.onclose) props.ws.addEventListener('close', this.onclose);

            props.ws.onerror = (er) => {
                props.ws.close();
            };
        } catch (err) {}
      
    }
    //onresize=(props)=>{} //on window resize
    //onchanged=(props)=>{} //on props changed
    ondelete=(props)=>{
        props.ws.close();
    } //on element deleted. Can remove with this.delete() which runs cleanup functions
}

//window.customElements.define('custom-', Custom);

addCustomElement(Socket,'socket-');
