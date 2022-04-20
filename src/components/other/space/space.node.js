
import {addCustomElement} from 'fragelement';

import {NodeDiv} from '../acyclicgraph/graph.node'

import { DynamicParticles } from 'dynamicparticles'

let component = require('./space.node.html');

//See: https://github.com/brainsatplay/domelement
export class SpaceNode extends NodeDiv {
    props={
        bodies:{}, //the orbital body nodes we're updating
        speed:300000, //time multiplier
        lastTime:undefined,
        now:undefined,
        canvas:undefined,
        ctx:undefined,
        useCanvas:true,
        useHTML:true,
        meter_per_px: 1e9, //viewport scales according to this
        px_per_meter: 1/1e9,
        zind:0,

        stars:[],
        boids:undefined,
        nstars:undefined,
        nboids:undefined,
         
        operator:(
            input,
            node,
            origin,
            cmd
        )=>{ 

            if(cmd === 'animate') {
                this.props.lastTime = this.props.now;
                this.props.now = Date.now();

                let tstep;
                let tminus = (this.props.now - this.props.lastTime)*0.001;
                if(tminus > 0.1) tminus = 0.1; //prevent overly long time jumps  

                tstep = tminus*this.props.speed; //seconds                
               
                let bodies = this.props.bodies;

                let keys = Object.keys(bodies);

                for(let i = 0; i < keys.length; i++) {
                    for(let j = 0; j < keys.length; j++) {
                        if(i !== j && !bodies[keys[i]].fixed && !bodies[keys[j]].fixed) {
                            this.newtonianMechanics(bodies[keys[i]],bodies[keys[j]],tstep);
                        }
                    }
                }

                this.props.node.callChildren(tstep); // this will update positions

                //draw loop
                if(this.props.useCanvas) {
                    this.draw(input,node,origin,cmd);
                    for(let i = 0; i < this.drawFuncs.length; i++) { //lets use other nodes to send draw functions to the canvas
                        let f = this.drawFuncs[i];
                        if(typeof f === 'function') {
                            f(input,node,origin,cmd); //pass the args in (need these if you pass arrow functions)
                        }
                    }
                }

            } else {
                //e.g. input commands
                if(typeof input === 'object') {
                    
                } else if (typeof input === 'number') {
                    
                } else if (typeof input === 'string') {
                    
                } else {
                    
                }
            }
        },
        forward:true, //pass output to child nodes
        backward:false, //pass output to parent node
        children:undefined, //child node(s), can be tags of other nodes, properties objects like this, or graphnodes, or null
        delay:false, //ms delay to fire the node
        repeat:false, // set repeat as an integer to repeat the input n times
        recursive:false, //or set recursive with an integer to pass the output back in as the next input n times
        animate:true, //true or false
        loop:undefined, //milliseconds or false
        tag:undefined, //generated if not specified, or use to get another node by tag instead of generating a new one
        input:undefined,// can set on the attribute etc
        graph:undefined, //parent AcyclicGraph instance, can set manually or via enclosing acyclic-graph div
        node:undefined, //GraphNode instance, can set manually or as a string to grab a node by tag (or use tag)
    }; //can specify properties of the element which can be subscribed to for changes.

    //set the template string or function (which can input props to return a modified string)
    template=component;

    draw(input,node,origin,cmd) {
        let canvas = this.props.canvas;
        let ctx = this.props.ctx;

        //draw a star map on the base canvas
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = '#111111';
        ctx.fillRect(0,0,canvas.width,canvas.height);

        this.props.stars.forEach((p,i) => {   
            ctx.fillStyle = p.color;
            ctx.fillRect(
                p.x*canvas.width,
                p.y*canvas.height,
                2,  //p.position.x+1, //adds some funk
                2  //p.position.y+1,
            );
        });

        this.props.boids.particles.forEach((group,j) => {

            if(j === 0)  {
                group.particles.forEach((p,i) => {
                    if(this.props.bodies.saturn) {
                        //console.log(p)
                        p.boid.attractor.x = this.canvas.clientWidth*0.5  + this.props.bodies.saturn.position.x*this.props.px_per_meter;
                        p.boid.attractor.y = this.canvas.clientHeight*0.5 - this.props.bodies.saturn.position.y*this.props.px_per_meter;
                        p.boid.attractor.z = this.canvas.clientWidth*0.5  + this.props.bodies.saturn.position.z*this.props.px_per_meter;
                    }
                    p.boid.swirl.x = p.boid.attractor.x;
                    p.boid.swirl.y = p.boid.attractor.y;
                    p.boid.swirl.z = p.boid.attractor.z;
                    
                    //instead we could find the nearest neighbor planet and attract to that

                    let r = Math.floor(10+(i/group.particles.length)*90);

                    ctx.fillStyle = p.color;
                    ctx.fillRect(
                        p.position.x,
                        p.position.y,
                        2,  //p.position.x+1, //adds some funk
                        2  //p.position.y+1,
                    );
                });
            }
            if(j === 1) {
                group.particles.forEach((p,i) => {   
                    ctx.fillStyle = p.color;
                    ctx.fillRect(
                        p.position.x,
                        p.position.y,
                        2,  //p.position.x+1, //adds some funk
                        2  //p.position.y+1,
                    );
                });
            }
        })

    }

    addDraw(f) {
        if(typeof f === 'function') this.drawFuncs.push(f);
    }

    drawFuncs = []; // draw(input,args,origin,cmd){} <--- passes operator args

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
    calcZenith(position={x:1,y:0,z:1}) {
        return Math.acos(position.z/this.magnitude(position));
    }

    sphereCollision(body1,body2) {
        let dist = this.distance(body1.position,body2.position);
        if(dist < body1.radius + body2.radius) {
            return (body1.radius + body2.radius) - dist; //overlap dist
        } 
        return false; //no overlap
    }
    
    //newton's gravity and third law for spherical masses
    newtonianMechanics(body1,body2,tstep) {
        if(!body1.mass || !body2.mass) return;
        if(body1.mass == 0 && body2.mass === 0) return;
        
        //Gravitational pull of nBodies
        
        let dist = this.distance(body1.position,body2.position);
        let vecn = this.normalize(this.makeVec(body1.position,body2.position)); // a to b

        let isColliding = this.sphereCollision(body1,body2); //This will miss if the bodies move past each other faster than a frame (have to do curr/prev comparison method instead or a faster dynamic model)
     
        if(isColliding) { //add a displaceent if there is overlap
            let sumMass = body1.mass+body2.mass;
            let ratio = body1.mass/sumMass; //displace proportional to mass
            let rmin = 1-ratio;

            if(body1.fixed === false) {
                body1.position.x += vecn.x*isColliding*rmin*1.01;
                body1.position.y += vecn.y*isColliding*rmin*1.01;
                body1.position.z += vecn.z*isColliding*rmin*1.001;
            } else {
                body2.position.x -= vecn.x*isColliding*1.01;
                body2.position.y -= vecn.y*isColliding*1.01;
                body2.position.z -= vecn.z*isColliding*1.01;
            }
            if(body2.fixed === false) {
                body2.position.x += vecn.x*isColliding*ratio*1.01;
                body2.position.y += vecn.y*isColliding*ratio*1.01;
                body2.position.z += vecn.z*isColliding*ratio*1.01;
            } else {
                body1.position.x += vecn.x*isColliding*1.01;
                body1.position.y += vecn.y*isColliding*1.01;
                body1.position.z += vecn.z*isColliding*1.01;
            }

            dist = this.distance(body1.position,body2.position);

            let vrel = {
                x:body1.velocity.x - body2.velocity.x,
                y:body1.velocity.y - body2.velocity.y,
                z:body1.velocity.z - body2.velocity.z
            };

            let speed = vrel.x*vecn.x + vrel.y*vecn.y + vrel.z*vecn.z;

            if(speed > 0) {
                let impulse = 2*speed/sumMass;
                if(body1.fixed === false) {
                    body1.velocity.x -= impulse*vecn.x*body2.mass*body1.restitution///body1.mass;
                    body1.velocity.y -= impulse*vecn.y*body2.mass*body1.restitution///body1.mass;
                    body1.velocity.z -= impulse*vecn.z*body2.mass*body1.restitution///body1.mass;
                }

                if(body2.fixed === false) {
                    body2.velocity.x += impulse*vecn.x*body2.mass*body2.restitution/body2.mass;
                    body2.velocity.y += impulse*vecn.y*body2.mass*body2.restitution/body2.mass;
                    body2.velocity.z += impulse*vecn.z*body2.mass*body2.restitution/body2.mass;
                }
            }
            //if(!body1.collidedWith[body2.tag] && !body1.prevCollidedWith[body2.tag]) {
            //}
            // body1.collidedWith[body2.tag] = body2.tag;
            // body2.collidedWith[body1.tag] = body1.tag;
            
        }

        let mass1Inv = 1/body1.mass;
        let mass2Inv = 1/body2.mass;
    
        //Newton's law of gravitation
        let Fg = 0.00000000006674 * body1.mass * body2.mass / (dist*dist);

        //Get force vectors
        let FgOnBody1 = {x: vecn.x*Fg, y: vecn.y*Fg, z: vecn.z*Fg};
        let FgOnBody2 = {x:-vecn.x*Fg, y:-vecn.y*Fg, z:-vecn.z*Fg};
        
        if(!body1.fixed) {
            body1.velocity.x += tstep*FgOnBody1.x*mass1Inv;
            body1.velocity.y += tstep*FgOnBody1.y*mass1Inv;
            body1.velocity.z += tstep*FgOnBody1.z*mass1Inv;
        }
            
        if(!body2.fixed) {
            body2.velocity.x += tstep*FgOnBody2.x*mass2Inv;
            body2.velocity.y += tstep*FgOnBody2.y*mass2Inv;
            body2.velocity.z += tstep*FgOnBody2.z*mass2Inv;
        }


        //need to limit the number of collisions
        
    }

    //DOMElement custom callbacks:
    oncreate=(props)=>{

        this.canvas = this.querySelector('canvas');

        if(props.meter_per_px) props.px_per_meter = 1/props.meter_per_px;

        if(props.width) {
            this.canvas.width = props.width;
            this.canvas.style.height = props.height;
        }
        if(props.height) {
            this.canvas.height = props.height;
            this.canvas.style.height = props.height;
        }
        if(props.style) {
            this.canvas.style = props.style;
            setTimeout(()=>{
                this.canvas.height = this.canvas.clientHeight;
                this.canvas.width = this.canvas.clientWidth;

                if(props.useCanvas) {
                    //do some setup
                    if(!props.nstars) {
                        props.nstars = 200;
                    }
                    if(!props.nboids) {
                        props.nboids = 100;
                    }

                    props.stars = [];
                    let ct = 0;
                    while(ct < props.nstars) {
                        let white = Math.floor(Math.random()*100);
                        if(white < 20) white = 20;
                        props.stars.push({
                            x:Math.random(),
                            y:Math.random(),
                            z:Math.random(),
                            color:`#${white}${white}${white}`
                        });
                        ct++;
                    }

                    let rules = [['boids',props.nboids],['default',200]];
                    props.boids = new DynamicParticles(rules,this.canvas,false);
                    this.props.boids.particles.forEach((group,j) => {
                        if(j === 0) {
                            group.particles.forEach((p,i) => {
                                p.maxSpeed = 70;
                                p.boid.separation = 0.1;
                                p.boid.attractor.mul = 0.02;
                                p.boid.swirl.mul = 0.1;
                                let r = Math.floor(Math.random()*100);
                                if(r < 10) r = 10;
                                p.color=`#${r}DDFF`;
                                
                            });
                        }
                        if(j === 1) {
                            group.particles.forEach((p,i) => {
                                p.velocity = {
                                    x:Math.random()*10-5,
                                    y:Math.random()*10-5,
                                    z:Math.random()*10-5
                                }
                                let r = Math.floor(Math.random()*100);
                                if(r < 30) r = 30;
                                let g = Math.floor(Math.random()*100);
                                if(g < 30) g = 30;
                                let b = Math.floor(Math.random()*100);
                                if(b < 30) b = 30;
                                p.color = `#${r}${g}${b}`;
                            });
                        }
                    })
                }

            },10); //slight recalculation delay time
        }

        props.canvas = this.canvas;
        if(props.context) props.context = this.canvas.getContext(props.context);
        else props.context = this.canvas.getContext('2d');
        this.context = props.context;
        this.ctx = this.context;
        props.ctx = this.context;

        setTimeout(()=>{
            if(props.animate) {
                props.now = Date.now();
                props.node.runAnimation();
            }
        },10)

    }

    //after rendering
    onresize=(props)=>{
        if(this.canvas) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.canvas.style.width = this.canvas.clientWidth;
            this.canvas.style.height = this.canvas.clientHeight;
            props.width = this.canvas.clientWidth;
            props.height = this.canvas.clientHeight;
        }

        let bodies = props.bodies;
        let keys = Object.keys(bodies);

        for(let i = 0; i < bodies.length; i++) {
            if(bodies[keys[i]].props.display === false && bodies[keys[i]].props.display === 'none') //scale the html elements
            {
                bodies[keys[i]].div.style.height = 2*bodies[keys[i]].radius/props.meter_per_px;
                bodies[keys[i]].div.style.width = 2*bodies[keys[i]].radius/props.meter_per_px;
                bodies[keys[i]].div.style.borderRadius = bodies[keys[i]].radius/props.meter_per_px;
            }
        }

    } //on window resize
    //onchanged=(props)=>{} //on props changed
    //ondelete=(props)=>{} //on element deleted. Can remove with this.delete() which runs cleanup functions
}

//window.customElements.define('custom-', Custom);

addCustomElement(SpaceNode,'space-node');
