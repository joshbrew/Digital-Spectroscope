
import {addCustomElement} from 'fragelement';

import {NodeDiv} from '../acyclicgraph/graph.node'

//let component = require('./physicsbody.node.html');

//See: https://github.com/brainsatplay/domelement
export class PhysicsBodyNode extends NodeDiv {

    
    operator = (input,node,origin,cmd) => {
        
        let tstep;

        if(typeof input === 'object') {
            if(input.position) this.props.position = input.position;
            if(input.velocity) this.props.velocity = input.velocity;
            if(input.acceleration) this.props.acceleration = input.acceleration;
            if(input.force) this.props.force = input.force;
            if(input.tstep) tstep = input.tstep;
        } else if (typeof input === 'number') {
            tstep = input;
        } else if (typeof input === 'string') {
            tstep = parseInt(input);
        } else {
            
        }

        let f = this.props.force;
        let a = this.props.acceleration;
        let v = this.props.velocity;
        let p = this.props.position;
        
        if(tstep && this.props.fixed === false) {
            if(f.x) { 
                a.x+=f.x/this.props.mass;
                f.x = 0;
            }
            if(f.y) {
                a.y+=f.y/this.props.mass;
                f.y = 0;
            }
            if(f.z) {
                a.z+=f.z/this.props.mass;
                f.z = 0;
            }

            // let vxn = v.x*tstep;
            // let vyn = v.y*tstep;
            // let vzn = v.z*tstep;

            if(a.x) v.x+=a.x*tstep;//-this.props.vloss*vxn;
            if(a.y) v.y+=a.y*tstep;//-this.props.vloss*vyn;
            if(a.z) v.z+=a.z*tstep;//-this.props.vloss*vzn;
            if(v.x) p.x+=v.x*tstep;
            if(v.y) p.y+=v.y*tstep;
            if(v.z) p.z+=v.z*tstep;

            if(this.props.bounded) this.checkBoundaries(p,v);

            // this.props.prevCollidedWith = this.props.collidedWith; //prevent overlapping collisions from adding too many forces etc on.
            // this.props.collidedWith = {};                

            //update reference values
            this.props.distance = this.magnitude(this.props.position);
            this.props.azimuth = this.calcAzimuth(this.props.position);
            this.props.zenith = this.calcZenith(this.props.position,this.props.distance);

            if(this.parentNode.props?.useHTML  || !this.parentNode.props) {
                this.props.div.style.left = (this.parentNode.clientWidth*0.5+this.props.position.x/this.parentNode.props.meter_per_px)+'px';
                this.props.div.style.top = (this.parentNode.clientHeight*0.5-this.props.position.y/this.parentNode.props.meter_per_px)+'px';
                let z = Math.floor(this.props.position.z/this.parentNode.props.meter_per_px);
                if(this.parentNode.props.zind > z) {this.parentNode.props.zind = z;}
                let pind = parseInt(this.parentNode.props.canvas.style.zIndex);
                if(!pind) pind = 1;
                this.props.div.style.zIndex = z + pind - this.parentNode.props.zind;
            }
        }

        return input; 

    }

    props={
        mass:5.972e24,              //kg  //e.g. earth's mass
        radius:6.3781e9,            //body radius (m)   //e.g. earth's radius
        distance:undefined, //distance from origin, can be used to set initial position with theta and azimuth
        theta:undefined,   //xy circular angle (0-365 deg), can set this instead of initial position
        azimuth:undefined, //z angle (0 - 180 deg), can set this instead of initial position coordinates 
        position:{x:150e9,y:0,z:0}, //center is origin (0,0,0), position represents distance from center (m)
        velocity:{x:0,y:0,z:0}, //m/s
        acceleration:{x:0,y:0,z:0}, //m/s^2
        force:{x:0,y:0,z:0},        //Newtons 
        restitution:0.01,
        vloss:0.00000000000001,                  //velocity loss multiplier (loss = 1-vloss), this causes more loss at higher speeds
        fixed:false,
        bounded:true, //bounded by parentNode clientRect
        // collidedWith:{}, //last tick 
        // prevCollidedWith:{}, //last last tick
        operator:this.operator, //Operator to handle I/O on this node. Returned inputs can propagate according to below settings
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
    template=(props)=>{
        let display = `''`;
        if(props.display === false || props.display === 'none' || this.parentNode.props?.useHTML === false) display = `'none'`; //can not display the html element (e.g. to use canvas)

        if(this.parentNode.props?.useHTML === false) return ``;

        let style;
        if(props.img) 
            return `
                <div>
                    <img src=${props.img} height="100%" width="100%" style="position:absolute;"></img>
                </div>
            `;
        else if (props.style) style = props.style;
        else style = `"display:${display}; background-color:blue;"`;

        return `
            <div style=${style}></div>
        `;
    };


    d2r(d) {
        return Math.PI*d/180;
    }

    r2d(r) {
        return 180*r/Math.PI;
    }

    magnitude(vec={}) { //nDimensional magnitude
        let sqrd = 0;
        Object.keys(vec).forEach((c) => {
            sqrd+=vec[c]*vec[c];
        })
        return Math.sqrt(sqrd);
    }

    distance(point1={}, point2={}) { //nDimensional vector distance function
        let dsqrd = 0;
        Object.keys(point1).forEach((c,i) => {
            let pp = (point2[c] - point1[c]);
            dsqrd += pp*pp;
        })
        return Math.sqrt(dsqrd);
    }

    makeVec(point1={},point2={}) {  //Make vector from two nDimensional points (arrays)
        var vec = {};
        Object.keys(point1).forEach((c,i) => {
            vec[c] = point2[c] - point1[c];
        })
        return vec;
    }

    normalize(vec={}) { //nDimensional normalization
        let _mag = 1/this.magnitude(vec);
        let vecn = {};
        Object.keys(vec).forEach((c,i) => {
            vecn[c] = vec[c]*_mag;
        })
        return vecn;
    }

    //angle in xy plane from positive x-axis
    calcAzimuth(position={x:1,y:1,z:0}) {
        return Math.atan2(position.x,position.y);
    }
    
    //z angle from origin
    calcZenith(position={x:1,y:0,z:1}, magnitude=this.magnitude(position)) {
        if(magnitude) return Math.acos(position.z/magnitude);
        let mag = this.magnitude(position)
        if(mag = 0) return 0;
        return Math.acos(position.z/mag);
    }

    //set azimuth xy-plane angle from +x-axis (rad)
    setAzimuth(az) {
        this.props.azimuth = az;
        props.position.z = props.distance*Math.sin(2*props.azimuth);
    }

    //zenith z-angle from +z-axis (rad)
    setZenith(zen) {
        this.props.theta = zen;
        this.props.position.x = this.props.distance*Math.cos(this.props.theta);
        this.props.position.y = this.props.distance*Math.sin(this.props.theta);
    }

    checkBoundaries = (position, velocity) => {
        //this.props.position.x 
        let prect = this.parentNode.getBoundingClientRect();
        //let rect = this.getBoundingClientRect();

        let _mpx = 1/this.parentNode.props.meter_per_px;

        //absolute pixel values of position
        let pxx = prect.left+this.parentNode.clientWidth*0.5 - position.x*_mpx;
        let pxy = prect.top+this.parentNode.clientHeight*0.5 - position.y*_mpx;
        let pxz = prect.left+this.parentNode.clientWidth*0.5 - position.z*_mpx;

        let rs = this.props.radius*_mpx;

        //if(this.props.tag === 'sun') console.log(pxx+rs,prect.left,prect.right);

        if(pxx+rs >= prect.right) {
            position.x = -(this.parentNode.clientWidth*0.5)*this.parentNode.props.meter_per_px + this.props.radius;
            if(velocity.x < 0) velocity.x = -velocity.x;
        }
        if(pxx-rs <= prect.left) {
            position.x = (this.parentNode.clientWidth*0.5)*this.parentNode.props.meter_per_px - this.props.radius;
            if(velocity.x > 0) velocity.x = -velocity.x;
        }

        //if(this.props.tag === 'sun') console.log(pxy-rs,prect.bottom)
        if(pxy-rs <= prect.top) {
            position.y = (this.parentNode.clientHeight*0.5)*this.parentNode.props.meter_per_px - this.props.radius;
            if(velocity.y > 0) velocity.y = -velocity.y;
        }
        if(pxy+rs >= prect.bottom) {
            position.y = (this.parentNode.clientHeight*0.5 - (prect.bottom-prect.top))*this.parentNode.props.meter_per_px + this.props.radius;
            if(velocity.y < 0) velocity.y = -velocity.y;
        }

        if(pxz+rs >= prect.right) {
            position.z = -(this.parentNode.clientWidth*0.5)*this.parentNode.props.meter_per_px + this.props.radius;
            if(velocity.z < 0) velocity.z = -velocity.z;
        }
        if(pxz-rs <= prect.left) {
            position.z = (this.parentNode.clientWidth*0.5)*this.parentNode.props.meter_per_px - this.props.radius;
            if(velocity.z > 0) velocity.z = -velocity.z;
        }
    }

    //set position using the spherical coordinats
    setPositionFromSpherical(props) {
        
        if(!props.distance) {
            props.distance = this.magnitude(props.position);
            
            if(props.azimuth) {
                props.position.z = props.distance*Math.sin(2*props.azimuth);
                props.div.style.top = (this.parentNode.clientHeight*0.5-props.position.y/this.parentNode.props.meter_per_px)+'px';
            } else {
                props.azimuth = this.calcZenith(props.position);
            }
            if(props.theta) {
                props.position.x = props.distance*Math.cos(props.theta);
                props.position.y = props.distance*Math.sin(props.theta);
                props.div.style.left = (this.parentNode.clientWidth*0.5-props.position.x/this.parentNode.props.meter_per_px)+'px';
            } else {
                props.theta = this.calcAzimuth(props.position);
            }
        } else {
            if(!props.azimuth) {
                props.azimuth = this.calcZenith(props.position);
            }
            props.position.z = props.distance*Math.sin(2*props.azimuth);
            if(!props.theta) {
                props.theta = this.calcAzimuth(props.position);
            }
            props.position.x = props.distance*Math.cos(props.theta);
            props.position.y = props.distance*Math.sin(props.theta);
            
            if(this.parentNode.props?.useHTML || !this.parentNode.props) {
                props.div.style.left = (this.parentNode.clientWidth*0.5+props.position.x/this.parentNode.props.meter_per_px)+'px';
                props.div.style.top = (this.parentNode.clientHeight*0.5-props.position.y/this.parentNode.props.meter_per_px)+'px';
                let z = Math.floor(props.position.z/this.parentNode.props.meter_per_px);
                if(Math.abs(this.parentNode.props.zind) > z) {this.parentNode.props.zind = z}
                props.div.style.zIndex = z + parseInt(this.parentNode.props.canvas.style.zIndex) + this.parentNode.props.zind;
            }
        }
    }

    //gotta customize this a little from the default DOMElement
    render = (props=this.props) => {

        if(typeof this.template === 'function') this.templateString = this.template(props); //can pass a function
        else this.templateString = this.template;

        //this.innerHTML = this.templateString;

        const t = document.createElement('template');
        t.innerHTML = this.templateString;
        const fragment = t.content;
        if(this.fragment) { //will reappend the fragment without reappending the whole node if already rendered once
            this.removeChild(this.fragment); 
        }
        this.fragment = fragment;
        this.appendChild(fragment);
        
        
        //add this here which will run a routine AFTER rendering so the elements can be updated
        this.setupNode(this.props);
        if(this.props.input) { //e.g. run the node on input
            setTimeout(async()=>{
                this.props.node.runNode(this.props.node,this.props.input,this.props.graph); //run the inputs on the nodes once the children are loaded on the DOM so things propagate correctly
            },
            this.input_delay //makes sure children are loaded (e.g. on a DOM with a lot of loading, should add some execution delay to anticipate it as initial nodes are not aware of later-rendered nodes on the DOM)
            );
        }

        this.setupPhysicsBody(props); //setup the physics logic
        
        if(this.oncreate) this.oncreate(props); //set scripted behaviors
    }

    setupPhysicsBody(props) {
        
        if(typeof props.px === 'number') props.position.x = props.px;
        if(typeof props.py === 'number') props.position.y = props.py;
        if(typeof props.pz === 'number') props.position.z = props.pz;
        if(typeof props.vx === 'number') props.velocity.x = props.vx;
        if(typeof props.vy === 'number') props.velocity.y = props.vy;
        if(typeof props.vz === 'number') props.velocity.z = props.vz;

        let div = this.querySelector('div');
        props.div = div;

        let rad = props.radius;
        if(this.parentNode?.props?.meter_per_px) {
            rad = rad/this.parentNode.props.meter_per_px;
        }

        if(this.parentNode.props?.useHTML || !this.parentNode.props) {
            let left = this.parentNode.clientWidth*0.5+props.position.x/this.parentNode.props.meter_per_px;
            let top = this.parentNode.clientHeight*0.5-props.position.y/this.parentNode.props.meter_per_px;

            div.style.position = 'absolute';
            div.style.height = 2*rad+'px';
            div.style.width = 2*rad+'px';
            div.style.borderRadius = rad+'px';
            div.style.left = left+'px';
            div.style.top = top+'px';
            div.style.transform = 'translate(-'+rad+'px,-'+rad+'px)';

            if(this.style.backgroundColor) div.style.backgroundColor = this.style.backgroundColor;
        }
        this.setPositionFromSpherical(props);

        this.dragElement(div);

        if(this.parentNode.props?.bodies) this.parentNode.props.bodies[props.tag] = props;
    }

    //DOMElement custom callbacks:
    oncreate=(props)=>{

    } //after rendering
    //onresize=(props)=>{} //on window resize
    //onchanged=(props)=>{} //on props changed
    //ondelete=(props)=>{} //on element deleted. Can remove with this.delete() which runs cleanup functions

    dragElement = (elmnt) => {
      
        const dragMouseDown = (e) => {
          e = e || window.event;
          e.preventDefault();
          // get the mouse cursor position at startup:

          // call a function whenever the cursor moves:
          let cancel = false;
          setTimeout(() => {
            if(!cancel) {
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;
            }
          },200); //don't accidentally drag if you want to just click
          document.onmouseup = () => {
            cancel = true;
          }
        }
      
        const elementDrag = (e) => {
          e = e || window.event;
          e.preventDefault();
          // calculate the new cursor position:

          if(this.parentNode.props?.meter_per_px) {
              let rect = this.parentNode.getBoundingClientRect()
            this.props.position.x = -(this.parentNode.clientWidth*0.5 + rect.x - e.clientX)*this.parentNode.props.meter_per_px;
            this.props.position.y = (this.parentNode.clientHeight*0.5 + rect.y - e.clientY)*this.parentNode.props.meter_per_px;
            this.props.velocity.x = 0;
            this.props.velocity.y = 0;
          }
          // set the element's new position:
          if(this.parentNode.props?.useHTML || !this.parentNode.props) {
            elmnt.style.top =  e.clientY + "px";
            elmnt.style.left = e.clientX + "px";
          }
        }
      
        const closeDragElement = () => {
          // stop moving when mouse button is released:
          document.onmouseup = null;
          document.onmousemove = null;
        }
    

        if (elmnt) {
            // otherwise, move the DIV from anywhere inside the DIV:
            elmnt.style.cursor = 'pointer';
            elmnt.onmousedown = dragMouseDown;
        }
    }
}

//window.customElements.define('custom-', Custom);

addCustomElement(PhysicsBodyNode,'physics-body');
