import {NodeDiv} from '../acyclicgraph/graph.node'

let component = require('./spectrometer.node.html');

//See: https://github.com/brainsatplay/domelement
export class Spectrometer extends NodeDiv {

    bitmap; //raw image data
    bitslice; //slice of bitmap in picked area
    canvas; //draw a capture area 
    ctx;
    offscreen;
    offscreenctx;
    capture;
    capturectx;
    graph;
    graphctx;
    img; //img tag
    video; //video tag
    imgselect; //select options
    

    props={
        picking:0,
        picked:{x0:undefined,x1:undefined,y0:undefined,y1:undefined},
        running:false,//running capture loop?
        mode:'img',
        operator:(
            input,
            node,
            origin,
            cmd
        )=>{ 

            if(cmd === 'animate') {
                //draw loop
                // this.draw(input,node,origin,cmd);
                // for(let i = 0; i < this.drawFuncs.length; i++) { //lets use other nodes to send draw functions to the canvas
                //     let f = this.drawFuncs[i];
                //     if(typeof f === 'function') {
                //         f(input,node,origin,cmd); //pass the args in (need these if you pass arrow functions)
                //     }
                // }
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
        parent:undefined, //parent graph node
        delay:false, //ms delay to fire the node
        repeat:false, // set repeat as an integer to repeat the input n times
        recursive:false, //or set recursive with an integer to pass the output back in as the next input n times
        animate:true, //true or false
        loop:undefined, //milliseconds or false
        tag:undefined, //generated if not specified, or use to get another node by tag instead of generating a new one
        input:undefined,// can set on the attribute etc
        graph:undefined, //parent AcyclicGraph instance, can set manually or via enclosing acyclic-graph div
        node:undefined //GraphNode instance, can set manually or as a string to grab a node by tag (or use tag)
    }; //can specify properties of the element which can be subscribed to for changes.

    //set the template string or function (which can input props to return a modified string)
    template=component;

    //DOMElement custom callbacks:
    oncreate=(props)=>{
        this.canvas = this.querySelector('#picker');
        this.img = this.querySelector('img');
        this.video = this.querySelector('video');
        this.select = this.querySelector('#imgselect');
        this.capture = this.querySelector('#capture');
        this.graph = this.querySelector('#graph');
        
        //fileinput
        this.querySelector('#fileinput').onchange = this.handleFileInput;

        this.querySelector('#snip').onclick = () => {
            if(this.props.picked.y1 && this.props.picked.x1) {
                this.canvasCapture();
            }
        }


        this.querySelector('#animate').onclick = () => {
            if(this.props.running) {
                this.props.running = false;
                this.querySelector('#animate').innerHTML = "Record";
            }
            else if(this.props.picked.y1 && this.props.picked.x1) {
                this.props.running = true;
                let anim = () => {
                    if(!this.props.running) return;
                    this.canvasCapture();

                    setTimeout(()=>{
                        requestAnimationFrame(anim);
                    },1000/60); //60fps hard cap
                }

                anim();
                this.querySelector('#animate').innerHTML = "Capturing";
            }
        }

        this.select.onchange = (ev) => {
            if(this.mode === 'img') this.useImage();
        }
        
        this.querySelector('#webcam').onclick = this.useWebcam;
        this.querySelector('#image').onclick = this.useImage;
        this.querySelector('#setImgUrl').onclick = this.inputImgUrl;
        this.querySelector('#setVideoUrl').onclick = this.inputVideoSrc;

        if(props.width) {
            this.canvas.width = props.width;
            this.canvas.style.width = props.width;
            this.video.width = props.width;
            this.video.style.width = props.width;
            this.img.width = props.width;
            this.img.style.width = props.width;
        }
        if(props.height) {
            this.canvas.height = props.height;
            this.canvas.style.height = props.height;
            this.video.height = props.height;
            this.video.style.height = props.height;
            this.img.height = props.height;
            this.img.style.height = props.height;
        }
        if(props.style) {
            this.canvas.style = props.style;
            this.canvas.zIndex = 3;
            this.video.style = props.style;
            this.video.zIndex = 2;
            this.img.style = props.style;
            this.img.zIndex = 1;
            setTimeout(()=>{
                this.canvas.height = this.canvas.clientHeight;
                this.canvas.width = this.canvas.clientWidth;
                this.img.width = props.width;
                this.img.height = props.height;
                this.video.width = props.width;
                this.video.height = props.height;
            },10); //slight recalculation delay time
        }

        
        // this.offscreen.height = this.canvas.height;
        // this.offscreen.width = this.canvas.width;

        props.canvas = this.canvas;
        if(props.context) props.context = this.canvas.getContext(props.context);
        else props.context = this.canvas.getContext('2d');
        this.context = props.context;
        this.ctx = this.context;
        props.ctx = this.context;


        this.offscreen = new OffscreenCanvas(this.canvas.width,this.canvas.height);
        this.offscreenctx = this.offscreen.getContext('2d');
        
        this.capturectx = this.capture.getContext('2d');
        this.graphctx = this.capture.getContext('2d');

        this.useImage();

        this.props.picked.x1 = this.canvas.width;
        this.props.picked.y1 = this.canvas.height;

        this.canvas.onclick = this.canvasClicked;

        setTimeout(()=>{if(props.animate) props.node.runAnimation();},10)

    }

    draw(input,node,origin,cmd) {
        let canvas = this.props.canvas;
        let ctx = this.props.ctx;
    }

    addDraw(f) {
        if(typeof f === 'function') this.drawFuncs.push(f);
    }

    drawFuncs = []; // draw(input,node,origin,cmd){} <--- passes operator args
    
    useWebcam = () => {
        this.props.running = false;
        this.img.style.display = 'none';
        this.video.style.display = '';

        if(navigator.getUserMedia) {
            navigator.getUserMedia(
                {
                    video:true
                },(stream) => {
                this.video.srcObject = stream;
                this.video.play();
                this.video.width = this.canvas.width;
                this.video.height = this.canvas.height;
                this.props.mode = 'video';
                //     this.canvas.height = this.video.height;
                //     this.canvas.width = this.video.width;
                //     this.canvas.style.width = this.video.style.width;
                //     this.canvas.style.height = this.video.style.height;
                // this.offscreen.height = this.canvas.height;
                // this.offscreen.width = this.canvas.width;
            },console.error);
        }

    }

    useImage = () => {
        this.props.running = false;
        if(this.video.src) {
            this.video.pause();;
            this.video.src = '';
            this.video.style.display = 'none';
        }
        this.img.src = this.select.options[this.select.selectedIndex].value;
        this.img.style.display = '';
        this.props.mode = 'img';

        this.canvas.height = this.img.height;
        this.canvas.width = this.img.width;
        this.canvas.style.width = this.img.style.width;
        this.canvas.style.height = this.img.style.height;
        // this.offscreen.height = this.canvas.height;
        // this.offscreen.width = this.canvas.width;
    }

    

    handleFileInput = (ev) => {
        this.props.running = false;
        //read file, handle if image, video, or error
        let file = ev.target.value;
        
    }

    inputImgUrl() {
        this.props.running = false;
        let input = this.querySelector('#imgurl').value;
        if(input) {
            if(this.video.src) {
                this.video.pause();;
                this.video.src = '';
                this.video.style.display = 'none';
            }
            this.img.src = input;
            this.img.style.display = '';
            this.props.mode = 'img';
    
            this.canvas.height = this.img.height;
            this.canvas.width = this.canvas.width;
            this.canvas.style.width = this.img.style.width;
            this.canvas.style.height = this.img.style.height;
            // this.offscreen.height = this.canvas.height;
            // this.offscreen.width = this.canvas.width;
        }
    }

    //should combine inputs and just read the file type
    inputVideoSrc() {
        this.props.running = false;
        this.img.style.display = 'none';
        this.video.style.display = '';
        
        let input = this.querySelector('#videourl').value;

        if(input) {
            this.video.src = input;
            this.video.play();
            this.props.mode = 'video';
            this.canvas.height = this.video.height;
            this.canvas.width = this.video.width;
            this.canvas.style.width = this.video.style.width;
            this.canvas.style.height = this.video.style.height;
            // this.offscreen.height = this.canvas.height;
            // this.offscreen.width = this.canvas.width;
        }
    }

            
    drawCircle(centerX, centerY, radius, fill='green', strokewidth=5, strokestyle='#003300', ctx=this.ctx) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = strokewidth;
        ctx.strokeStyle = strokestyle;
        ctx.closePath();
        ctx.stroke();
    }

    drawLine(
        from={x:0,y:0},
        to={x:1,y:1},
        strokewidth=5,
        strokestyle='#003300',
        ctx=this.ctx
    ) {
        ctx.beginPath();
        ctx.lineWidth = strokewidth;
        ctx.strokeStyle = strokestyle;
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }

    canvasClicked = (ev) => {
        this.props.running = false;
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        if(this.props.picking === 0) {
            
            this.props.picked.x0 = ev.pageX - this.canvas.offsetLeft;
            this.props.picked.y0 = ev.pageY - this.canvas.offsetTop;

            this.props.picked.x1 = undefined;
            this.props.picked.y1 = undefined;

            this.drawCircle(this.props.picked.x0, this.props.picked.y0, 2.5, 'orange', 1, 'orange'); //show targeted point
            
            this.props.picking = 1;
        }
        else {
             
            this.props.picked.x1 = ev.pageX  - this.canvas.offsetLeft;
            this.props.picked.y1 = ev.pageY  - this.canvas.offsetTop;

            if(this.props.picked.x1 < this.props.picked.x0) {
                let temp = this.props.picked.x1;
                this.props.picked.x1 = this.props.picked.x0;
                this.props.picked.x0 = temp;
            }
            if(this.props.picked.y1 < this.props.picked.y0) {
                let temp = this.props.picked.y1;
                this.props.picked.y1 = this.props.picked.y0;
                this.props.picked.y0 = temp;
            }

            this.props.picking = 0;

            this.ctx.lineWidth = 3;
        
            this.ctx.beginPath();
            
            this.ctx.strokeStyle = 'orange';
            this.ctx.rect(this.props.picked.x0,this.props.picked.y0,this.props.picked.x1-this.props.picked.x0,this.props.picked.y1-this.props.picked.y0);
            this.ctx.stroke();
   
            this.canvasCapture(ev); //new rectangle, capture new image

        }
        
    }

    processCapture = (img) => {
            
        //this.offscreen.width = img.width;
        //this.offscreen.height = img.height;

        //this.offscreenctx.drawImage(img,0,0);
        
        this.capturectx.clearRect(0,0,this.capture.width,this.capture.height);
        this.graphctx.fillStyle = 'gray'
        this.graphctx.fillRect(0,0,this.graph.width,this.graph.height);

        this.capture.width = img.width;
        this.capture.height = img.height;
        this.graph.width = img.width;
        this.graph.height = img.height;


        this.capturectx.drawImage(img,0,0);

        this.bitmap = this.capturectx.getImageData(0,0,this.capture.width,this.capture.height);

        let bitarr = Array.from(this.bitmap.data);
        //console.log(bitarr)

        //intensities along the x axis (summing the y column image data)
        let xintensities = [];
        let xrgbintensities = [];

        let x = 0;

        //srgb format
        for(let i = 0; i < bitarr.length; i+=4) {
            if((i/4) % img.width === 0) x = 0;

            if(!xintensities[x]) {
                xintensities[x] = parseFloat(bitarr[i]+bitarr[i+1]+bitarr[i+2]);
                xrgbintensities[x] = {
                    r:parseFloat(bitarr[i]),
                    g:parseFloat(bitarr[i+1]),
                    b:parseFloat(bitarr[i+2])
                }
            }
            else {
                xintensities[x] += parseFloat(bitarr[i]+bitarr[i+1]+bitarr[i+2]);
                xrgbintensities[x].r += parseFloat(bitarr[i]);
                xrgbintensities[x].g += parseFloat(bitarr[i+1]);
                xrgbintensities[x].b += parseFloat(bitarr[i+2]);
            }
            x++;
        }

        let xintmax = Math.max(...xintensities);
        //console.log(xintmax);
        this.graphctx.fillStyle = 'white';

        this.graphctx.fillText(`Spectrogram pixel width: ${img.width}, height: ${img.height}`,10,10,300);

        this.graphctx.strokeStyle = 'white';
        this.graphctx.lineWidth = 2;

        this.graphctx.beginPath();
        
        xintensities.forEach((y,i) => {
            if(i === 0) {
                this.graphctx.moveTo(0,this.graph.height*(1-y/xintmax));
            }
            else {
                this.graphctx.lineTo(i,this.graph.height*(1-y/xintmax));
            }
        });

        let xrintmax = Math.max(...xrgbintensities.map((x) => {return x.r}));
        let xbintmax = Math.max(...xrgbintensities.map((x) => {return x.b}));
        let xgintmax = Math.max(...xrgbintensities.map((x) => {return x.g}));

        let xrgbmax = Math.max(xrintmax,xbintmax,xgintmax);

        this.graphctx.stroke();
        
        this.graphctx.strokeStyle = 'tomato';
        this.graphctx.lineWidth = 1;

        this.graphctx.beginPath();
        

        xrgbintensities.forEach((yrgb,i) => {
            if(i === 0) {
                this.graphctx.moveTo(0,this.graph.height*(1-yrgb.r/xrgbmax));
            }
            else {
                this.graphctx.lineTo(i,this.graph.height*(1-yrgb.r/xrgbmax));
            }
        });

        this.graphctx.stroke();
        
        this.graphctx.strokeStyle = 'royalblue';

        this.graphctx.beginPath();

        
        xrgbintensities.forEach((yrgb,i) => {
            if(i === 0) {
                this.graphctx.moveTo(0,this.graph.height*(1-yrgb.b/xrgbmax));
            }
            else {
                this.graphctx.lineTo(i,this.graph.height*(1-yrgb.b/xrgbmax));
            }
        });
        
        this.graphctx.stroke();
        
        this.graphctx.strokeStyle = 'chartreuse';

        this.graphctx.beginPath();
        
        

        xrgbintensities.forEach((yrgb,i) => {
            if(i === 0) {
                this.graphctx.moveTo(0,this.graph.height*(1-yrgb.g/xrgbmax));
            }
            else {
                this.graphctx.lineTo(i,this.graph.height*(1-yrgb.g/xrgbmax));
            }
        });

        this.graphctx.stroke();
        //update the plot from the bitmap
        
       // console.log(this.bitmap, xintensities, xrgbintensities);

 
    }

    //pull the bitmap into canvas;
    canvasCapture(ev) {

        if(this.props.mode === 'img') {

            if(!this.img.src) return;
            
            let pickedArea = { //project the canvas rectangle pick coordinates into the image 
                x0:this.img.naturalWidth * this.props.picked.x0/this.canvas.width,
                y0:this.img.naturalHeight * this.props.picked.y0/this.canvas.height,
                x1:this.img.naturalWidth * this.props.picked.x1/this.canvas.width,
                y1:this.img.naturalHeight * this.props.picked.y1/this.canvas.height
            };

            createImageBitmap(
                this.img, 
                pickedArea.x0,
                pickedArea.y0, 
                pickedArea.x1-pickedArea.x0,
                pickedArea.y1-pickedArea.y0
            ).then(this.processCapture);

        }   
        else if(this.props.mode === 'video') {
            
            if(!this.video.src) return;

            let pickedArea = {
                x0:(this.video.videoWidth)*this.props.picked.x0/this.canvas.width - this.video.offsetLeft,
                y0:(this.video.videoHeight + 0.5*(this.video.height - this.video.height*(this.video.videoHeight/this.video.videoWidth)))*this.props.picked.y0/this.canvas.height - this.video.offsetTop,
                x1:this.video.videoWidth*this.props.picked.x1/this.canvas.width - this.video.offsetLeft,
                y1:(this.video.videoHeight + 0.5*(this.video.height - this.video.height*(this.video.videoHeight/this.video.videoWidth)))*this.props.picked.y1/this.canvas.height - this.video.offsetTop
            };

            createImageBitmap(
                this.video,
                pickedArea.x0,
                pickedArea.y0, 
                pickedArea.x1-pickedArea.x0,
                pickedArea.y1-pickedArea.y0

            ).then(this.processCapture);
        }
    }



    //after rendering
    onresize=(props)=>{
        if(this.canvas) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.canvas.style.width = this.canvas.clientWidth;
            this.canvas.style.height = this.canvas.clientHeight;
            this.img.width = this.img.clientWidth;
            this.img.height = this.img.clientHeight;
            this.img.style.width = this.img.clientWidth;
            this.img.style.height = this.img.clientHeight;
            this.video.width = this.video.clientWidth;
            this.video.height = this.video.clientHeight;
            this.video.style.width = this.video.clientWidth;
            this.video.style.height = this.video.clientHeight;
        }
    } //on window resize
    //onchanged=(props)=>{} //on props changed
    //ondelete=(props)=>{} //on element deleted. Can remove with this.delete() which runs cleanup functions
}

//window.customElements.define('custom-', Custom);

Spectrometer.addElement('spectrometer-node');
