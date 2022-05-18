import { imgOverlayPicker, getBMP, convertBMPToPNG, recordCanvas, drawImage } from '../../utils/canvasMapping';
import { createBitmapCanvasWithMenu } from './spawned';
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
    imgfiles = {
        'Test Image':'src/assets/spectrum_full.png',
        'Spectrum 1': 'src/assets/spectrum1.png',
        'Spectrum 2': 'src/assets/spectrum2.jpg',
        'Shrimp': 'src/assets/shrimp.jpg',
        'Chicken Fat': 'src/assets/chickenfat.png',
        'Chicken Breast': 'src/assets/chickenbreast.png',
        'Brown Beer Bottle': 'src/assets/brownbeerbottle.png'
    }

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
        this.pickerDiv = this.querySelector('#pickerDiv');
        this.captureDiv = this.querySelector('#captureDiv');
        this.imgmenu = this.querySelector('#imgmenu');
        this.videomenu = this.querySelector('#videomenu');
        this.urlmenu = this.querySelector('#urlmenu');
        this.imgselect = this.querySelector('#imgselect');

        for(const key in this.imgfiles) {
            let template = `<option value="${this.imgfiles[key]}">${key}</option>`
            this.imgselect.insertAdjacentHTML('beforeend',template);
        }

        this.imgselect.options[0].selected = true;

        this.imgselect.oninput = this.useImage;

        this.querySelector('#useurl').onclick = () => {
            if(this.urlmenu.style.display == 'none')
                this.urlmenu.style.display = '';
            else 
                this.urlmenu.style.display = 'none';
        }

        this.querySelector('#help').onclick = () => {
            let instructionDiv = this.querySelector('#instructions');

            if(instructionDiv.style.display == 'none')
                instructionDiv.style.display = '';
            else 
                instructionDiv.style.display = 'none';
        }

        this.img = this.querySelector('img');

        this.img.addEventListener('load', (ev)=>{
            this.props.mode = 'img';
            this.props.picked.x0 = 0;
            this.props.picked.y0 = 0;
            this.props.picked.x1 = this.canvas.width;
            this.props.picked.y1 = this.canvas.height;
            this.videomenu.style.display = 'none';
            this.urlmenu.style.display = 'none';
            this.onresize();
        })

        this.video = this.querySelector('video');

        this.video.addEventListener('load', (ev)=>{
            this.props.mode = 'video';
            this.imgmenu.style.display = 'none';
            this.urlmenu.style.display = 'none';
            this.onresize();
        })

        this.select = this.querySelector('#imgselect');
        this.capture = this.querySelector('#capture');

        this.menu = this.querySelector('#menu');
        this.toggleMenu = this.querySelector('#toggleMenu');
        //this.toggleMenu.style = `position: absolute; bottom: 25px; right: 25px;`
        this.toggleMenu.onclick = () => {
            if (this.menu.style.display === 'none') {
                this.menu.style.display = ''
            }
            else {
                this.menu.style.display = 'none'
            }
        }

        
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
                this.querySelector('#record').innerHTML = "Recording...";
                this.querySelector('#record').onclick = () => {
                    this.props.running = false;
                    mediaRecorder.stop();
                    this.querySelector('#record').innerHTML = "Record";
                    this.querySelector('#record').onclick = recordButton;
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

        this.querySelector('#record').onclick = recordButton;

        this.select.onchange = (ev) => {
            // if(this.props.mode === 'img') this.useImage();
        }
        
        this.querySelector('#webcam').onclick = this.useWebcam;
        this.querySelector('#image').onclick = this.useImage;
        this.querySelector('#seturl').onclick = () => {
            if(this.querySelector('#urlselect').value == img) {
                this.inputImgUrl();
            } else {
                this.inputVideoSrc();
            }
        };
        this.querySelector('#fileinput').onclick = this.loadFile;

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
        this.canvas.onclick = this.canvasClicked;

        setTimeout(()=>{
            if(props.animate) props.node.runAnimation();
        },10)


        try{
            this.useImage();
        } catch(er) {
            console.error(er);
        }

        this.img.width = 0
        setTimeout(() => {
            this.onresize() // RESIZE WHEN INITIALIZED
            
        }, 50)

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
                this.props.mode = 'video';
                // this.video.width = this.canvas.width;
                // this.video.height = this.canvas.height;
                // //this.video.height = this.video.height * this.video.videoHeight/this.video.videoWidth;
                // this.canvas.height = this.video.height;
                // this.canvas.width = this.video.width;
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


        this.onresize()
    }

    inputImgUrl() {
        this.props.running = false;
        let input = this.querySelector('#urlinput').value;
        if(input) {
            if(this.video.src) {
                this.video.pause();;
                this.video.src = '';
                this.video.style.display = 'none';
            }
            this.img.src = input;
            this.img.style.display = '';
            this.props.mode = 'img';
    
           this.onresize()
        }
    }

    //should combine inputs and just read the file type
    inputVideoSrc() {
        this.props.running = false;
        this.img.style.display = 'none';
        this.video.style.display = '';
        
        let input = this.querySelector('#urlinput').value;

        if(input) {
            this.video.src = input;
            this.video.play();
            this.props.mode = 'video';
            this.onresize()
        }
    }

    loadFile = () => {
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

          
            //console.log(this.props.imgpicked)

            if(this.props.mode === 'video') {
                this.continuousCapture(this.video); 
            }
            else {
                       // Scale Capture
                this.capture.width = this.captureDiv.clientWidth ; //Math.abs(this.props.imgpicked.x1 - this.props.imgpicked.x0);
                this.capture.height = this.captureDiv.clientHeight;  //Math.abs(this.props.imgpicked.y1 - this.props.imgpicked.y0)
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
            setTimeout(()=>{requestAnimationFrame(()=>{this.continuousCapture(img);})},33.3333);
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

    correctForRatio = (el, desiredWidth, maxHeight, ratio) => {
        // relative to height
        if (desiredWidth * ratio > maxHeight) {
            el.height = maxHeight
            el.width = el.height / ratio
            // el.removeAttribute('width')
        } 
        // relative to width
        else {
            el.width = desiredWidth
            el.height = el.width * ratio

            // el.removeAttribute('height')
        }
        // el.style.width = '100%'
        // el.style.height = '100%'

    }

    //after rendering
    onresize=(props)=>{
        // Set image size
        let imageRatio;
        const desiredWidth = this.pickerDiv.clientWidth;

        // Relative to Height
        if(this.props.mode === 'img') {
            imageRatio = this.img.naturalHeight/this.img.naturalWidth;
            this.correctForRatio(this.img, desiredWidth, this.pickerDiv.clientHeight, imageRatio);
        }
        else if(this.props.mode === 'video') {
            imageRatio = this.video.videoHeight/this.video.videoWidth;
            this.correctForRatio(this.video, desiredWidth, this.pickerDiv.clientHeight, imageRatio);
        }
        
        if(this.canvas) {
            
            // Match Image
            if(this.props.mode === 'img' && this.img?.naturalWidth > 0) {
                //console.log('IMG correct')
                this.correctForRatio(this.canvas, desiredWidth, this.pickerDiv.clientHeight, imageRatio);
            } 
            
            // Match Video
            else if (this.props.mode === 'video' && this.video && this.video?.videoWidth > 0) {
                this.correctForRatio(this.canvas, desiredWidth, this.pickerDiv.clientHeight, imageRatio);
                // this.canvas.style.height = this.video.parentNode.clientWidth * this.video.videoHeight/this.video.videoWidth;
                //console.log('vid', this.canvas.height)
            } 

            // Fill Parent
            else {
                this.canvas.width = this.canvas.parentNode.clientWidth;
                this.canvas.height = this.canvas.parentNode.clientHeight;
                this.canvas.style.width = this.canvas.parentNode.clientWidth;
                this.canvas.style.height = this.canvas.parentNode.clientHeight;
            }
        }
    } //on window resize
    //onchanged=(props)=>{} //on props changed
    //ondelete=(props)=>{} //on element deleted. Can remove with this.delete() which runs cleanup functions
}

//window.customElements.define('custom-', Custom);

Spectrometer.addElement('spectrometer-node');
