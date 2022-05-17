import { imgOverlayPicker, getBMP, convertBMPToPNG, recordCanvas, drawImage, createBitmapCanvasWithMenu } from '../../utils/canvasMapping';
import {NodeDiv} from '../acyclicgraph/graph.node'

let component = require('./spectrometer.node.html');

//TODO:
/*
    Make rectangle dynamically resizable (can use an invisible element overlay to be lazy).
    
    Make an interactive x-plot on the results chart to estimate three positions in the spectrogram to generate the x-axis. 
    2 tags on the endpoints where you can set the wavelength manually, then you can drag them to squish/stretch the x-axis to set the wavelength values for each y. 

    Hook up file input, merge video/image url inputs

    CSV of raw data & summary.

    Save the image snip made with the chart.

    Build a log of the images in memory/indexeddb and a quick comparison feature. Visual confirmation can be quicker than data driven analysis in the field!

    Web hooks/sockets for passing data to/from the classifier model. Keep this super general so we can start to identify all kinds of materials!

    Style, accounting for all of the above

    Bugs:
    Video snip proportions are still a little off
    

*/

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
    img; //img tag
    video; //video tag
    imgselect; //select options
    captures = {};
    loaded = {}; //loaded images and videos

    //set the template string or function (which can input props to return a modified string)
    template=component;

    props={
        picking:0,
        picked:{x0:undefined,x1:undefined,y0:undefined,y1:undefined},
        imgpicked:{x0:undefined,x1:undefined,y0:undefined,y1:undefined},
        running:false,//running capture loop?
        mode:'img',
        animation:(input,node,origin,cmd) => {

        },
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
        animate:false, //true or false
        loop:undefined, //milliseconds or false
        tag:undefined, //generated if not specified, or use to get another node by tag instead of generating a new one
        input:undefined,// can set on the attribute etc
        graph:undefined, //parent AcyclicGraph instance, can set manually or via enclosing acyclic-graph div
        node:undefined //GraphNode instance, can set manually or as a string to grab a node by tag (or use tag)
    }; //can specify properties of the element which can be subscribed to for changes.

    //DOMElement custom callbacks:
    oncreate=(props)=>{
        this.canvas = this.querySelector('#picker');
        this.img = this.querySelector('img');
        this.video = this.querySelector('video');
        this.select = this.querySelector('#imgselect');
        this.capture = this.querySelector('#capture');
        
        //fileinput
        this.querySelector('#fileinput').onchange = this.handleFileInput;

        this.querySelector('#snip').onclick = (ev) => {
            if(this.props.picked.y1 && this.props.picked.x1) {
                this.canvasCapture(ev);
            }
        }


        const recordButton = () => {
            if(this.props.mode === 'video' && this.props.picked.y1 && this.props.picked.x1) {
                this.props.running = true;

                let mediaRecorder = recordCanvas(this.capture);
                this.querySelector('#animate').innerHTML = "Recording...";
                this.querySelector('#animate').onclick = () => {
                    this.props.running = false;
                    mediaRecorder.stop();
                    this.querySelector('#animate').innerHTML = "Record";
                    this.querySelector('#animate').onclick = recordButton;
                }
                
                // let anim = () => {
                //     if(!this.props.running || !(this.props.picked.y1 && this.props.picked.x1)) return;
                //     this.canvasCapture();
                //     setTimeout(()=>{
                //         requestAnimationFrame(anim);
                //     },1000/60); //60fps hard cap
                // }
                // anim()
            }
        }

        this.querySelector('#animate').onclick = recordButton;

        this.select.onchange = (ev) => {
            if(this.props.mode === 'img') this.useImage();
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

        this.props.picked.x0 = 0;
        this.props.picked.y0 = 0;

        this.props.picked.x1 = this.canvas.width;
        this.props.picked.y1 = this.canvas.height;

        this.canvas.onclick = this.canvasClicked;

        setTimeout(()=>{if(props.animate) props.node.runAnimation();},10)
        
        try{
            this.useImage();
        } catch(er) {
            console.error(er);
        }

    }


    useWebcam = () => {
        this.props.running = false;
        this.img.style.display = 'none';
        if(this.video.src) {
            this.video.pause();;
            this.video.src = '';
        }
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

    loadFile() {
        var input = document.createElement('input');
        input.accept = '.mp4,.png,.bmp,.jpg';
        input.type = 'file';
    
        input.onchange = (e) => {
            let file = e.target.files[0];

            let dataurl = URL.createObjectURL(file);
            
            this.loaded[input.value] = dataurl;

            if(this.video.src) {
                this.video.pause();;
                this.video.src = '';
                this.video.style.display = 'none';
            }
            if(input.value.endsWith('.mp4')) {
                this.props.mode = 'video';
                this.video.src = dataurl;
                this.video.play();
            } else {
                this.props.mode = 'img';
                
                if(input.value.endsWith('.bmp')) {
                    var reader = new FileReader();  
                    reader.onload = (e) => {
                        var buffer = e.target.result;
                        var bitmap = getBMP(buffer);
                        let pngconverted = convertBMPToPNG(bitmap);
                        this.img.src = pngconverted;
                    }
                    reader.readAsArrayBuffer(file);
                }
                else this.img.src = dataurl;
            }

        }
        input.click();
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
            let imgpicked; 
            if(this.props.mode === 'img') imgpicked = imgOverlayPicker(this.img,this.canvas,this.props.picked.x0,this.props.picked.y0);
            else if (this.props.mode === 'video') imgpicked = imgOverlayPicker(this.video,this.canvas,this.props.picked.x0,this.props.picked.y0);

            this.props.imgpicked.x0 = imgpicked.x;
            this.props.imgpicked.y0 = imgpicked.y;

            this.props.imgpicked.x1 = undefined;
            this.props.imgpicked.y1 = undefined;

            this.drawCircle(this.props.picked.x0, this.props.picked.y0, 2.5, 'orange', 1, 'orange'); //show targeted point
            
            this.props.picking = 1;
        }
        else {
             
            this.props.picked.x1 = ev.pageX  - this.canvas.offsetLeft;
            this.props.picked.y1 = ev.pageY  - this.canvas.offsetTop;

            let imgpicked;
            if(this.props.mode === 'img') imgpicked = imgOverlayPicker(this.img,this.canvas,this.props.picked.x1,this.props.picked.y1);
            else if (this.props.mode === 'video') imgpicked = imgOverlayPicker(this.video,this.canvas,this.props.picked.x1,this.props.picked.y1);

            this.props.imgpicked.x1 = imgpicked.x;
            this.props.imgpicked.y1 = imgpicked.y;
            
            if(this.props.picked.x1 < this.props.picked.x0) {
                let temp = this.props.picked.x1;
                this.props.picked.x1 = this.props.picked.x0;
                this.props.picked.x0 = temp;
                temp = this.props.imgpicked.x1;
                this.props.imgpicked.x1 = this.props.imgpicked.x0;
                this.props.imgpicked.x0 = temp;
            }
            if(this.props.picked.y1 < this.props.picked.y0) {
                let temp = this.props.picked.y1;
                this.props.picked.y1 = this.props.picked.y0;
                this.props.picked.y0 = temp;
                temp = this.props.imgpicked.y1;
                this.props.imgpicked.y1 = this.props.imgpicked.y0;
                this.props.imgpicked.y0 = temp;
            }

            this.props.picking = 0;

            this.ctx.lineWidth = 3;
        
            this.ctx.beginPath();
            
            this.ctx.strokeStyle = 'orange';
            this.ctx.rect(
                this.props.picked.x0,
                this.props.picked.y0,
                Math.abs(this.props.picked.x1-this.props.picked.x0),
                Math.abs(this.props.picked.y1-this.props.picked.y0)
            );
            this.ctx.stroke();

          
            console.log(this.props.imgpicked)

            if(this.props.mode === 'video') {
                this.continuousCapture(this.video); 
            }
            else {
                drawImage(
                    this.capturectx,
                    this.img,
                    this.props.imgpicked.x0,
                    this.props.imgpicked.y0,
                    Math.abs(this.props.imgpicked.x1 - this.props.imgpicked.x0),
                    Math.abs(this.props.imgpicked.y1 - this.props.imgpicked.y0),
                    0,0,
                    this.capture.width,
                    this.capture.height
                    )
            }

        }
        
    }

    //continuously draw the section of the video we're capturing.
    continuousCapture(img) {
        if(this.props.imgpicked.x1 && this.props.imgpicked.x0 && this.props.imgpicked.y1 && this.props.imgpicked.y0) {
            this.capturectx.drawImage(
                img,
                this.props.imgpicked.x0, //srcrc
                this.props.imgpicked.y0,
                Math.abs(this.props.imgpicked.x1-this.props.imgpicked.x0),
                Math.abs(this.props.imgpicked.y1-this.props.imgpicked.y0),
                0,0,this.capturectx.width,this.capturectx.height //dest
            );
            this.continuousCapture(img);
        }
    }

    
    processCapture = (img) => {
        createBitmapCanvasWithMenu(
            img,
            this.querySelector('#captured'),
            '49.99%',
            '200px'
        )
    }


    //pull the bitmap into canvas;
    canvasCapture(ev) {

        if(this.props.mode === 'img') {

            if(!this.img.src) return;
            
            createImageBitmap(
                this.img, 
                this.props.imgpicked.x0,
                this.props.imgpicked.y0, 
                Math.abs(this.props.imgpicked.x1-this.props.imgpicked.x0),
                Math.abs(this.props.imgpicked.y1-this.props.imgpicked.y0)
            ).then(this.processCapture);

        }   
        else if(this.props.mode === 'video') {
            
            if(!this.video.src) return;

            createImageBitmap(
                this.video,
                this.props.imgpicked.x0,
                this.props.imgpicked.y0, 
                Math.abs(this.props.imgpicked.x1-this.props.imgpicked.x0),
                Math.abs(this.props.imgpicked.y1-this.props.imgpicked.y0)

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
