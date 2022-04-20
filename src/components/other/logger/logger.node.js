
import {NodeDiv} from '../acyclicgraph/graph.node'

let component = require('./logger.node.html');

//See: https://github.com/brainsatplay/domelement
export class LoggerDiv extends NodeDiv {

    log = (
        message,  //the message
        templateString=`<tr><td>${message}</td></tr>` //can apply any template string you want per-line
    ) => {

        const t = document.createElement('template');
        t.innerHTML = templateString;
        const fragment = t.content;

        if(!this.props.div) {     
            this.props.div = this.querySelector('table');
            if(this.props.scrollable) this.props.div.style.overflow = 'hidden';
        }

        if(this.props.messages.length >= this.props.max) {
            this.props.messages.shift();
            this.props.messagedivs[0].remove();
            this.props.messagedivs.shift();
        }
        
        this.props.messages.push(message);

        this.props.div.appendChild(fragment);

        let children = this.querySelectorAll('tr');
        this.props.messagedivs.push(children[children.length-1]);

        
        if(this.props.messagedivs.length+2 >= this.props.max) {
            if(this.props.messagedivs[this.props.max-3]) {
                if(this.props.messagedivs.length === this.props.max)
                    this.props.messagedivs[0].style.opacity = '0.25'; //add some fade out                }
            }
            if(this.props.messagedivs[this.props.max-2]) {
                if(this.props.messagedivs.length === this.props.max) {
                    this.props.messagedivs[1].style.opacity = '0.5'; 
                } else {    
                    this.props.messagedivs[0].style.opacity = '0.5';
                }
            }
            if (this.props.messagedivs.length === this.props.max) {
                this.props.messagedivs[2].style.opacity = '0.75';
            }
            else if(this.props.messagedivs.length+1 >= this.props.max) {
                this.props.messagedivs[1].style.opacity = '0.75'; 
            } else{
                this.props.messagedivs[0].style.opacity = '0.75';
            } 
        }

    }
    

    props={
        messages:[],
        messagedivs:[],
        max:5, //max messages in div
        scrollable:false,
        div:undefined,
        log:this.log,

        operator:(
            input, //input, e.g. output from another node
            node,  //'this' node
            origin, //origin node
            cmd    //e.g. 'loop' or 'animate' will be defined if the operator is running on the loop or animate routines, needed something. Can define more commands but you might as well use an object in input for that. 
        )=>{ console.log(input); return input; }, //Operator to handle I/O on this node. Returned inputs can propagate according to below settings
        forward:true, //pass output to child nodes
        backward:false, //pass output to parent node
        children:undefined, //child node(s), can be tags of other nodes, properties objects like this, or graphnodes, or null
        parent:undefined, //parent graph node
        delay:false, //ms delay to fire the node
        repeat:false, // set repeat as an integer to repeat the input n times
        recursive:false, //or set recursive with an integer to pass the output back in as the next input n times
        animate:false, //true or false
        loop:undefined, //milliseconds or false
        tag:undefined, //generated if not specified, or use to get another node by tag instead of generating a new one
        input:undefined,// can set on the attribute etc
        graph:undefined, //parent AcyclicGraph instance, can set manually or via enclosing acyclic-graph div
        node:undefined, //GraphNode instance, can set manually or as a string to grab a node by tag (or use tag)
    }; //can specify properties of the element which can be subscribed to for changes.

    //set the template string or function (which can input props to return a modified string)
    template=component;

    //DOMElement custom callbacks:
    oncreate=(props)=>{
    } //after rendering
    //onresize=(props)=>{} //on window resize
    //onchanged=(props)=>{} //on props changed
    //ondelete=(props)=>{} //on element deleted. Can remove with this.delete() which runs cleanup functions
}

//window.customElements.define('custom-', Custom);

LoggerDiv.addElement('logger-');
