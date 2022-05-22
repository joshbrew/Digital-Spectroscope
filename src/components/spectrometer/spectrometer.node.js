import { imgOverlayPicker, getBMP, convertBMPToPNG, backupData, dumpSpectrogramsToCSV,graphXIntensities, reconstructImageData, recordCanvas, drawImage, mapBitmapXIntensities, autocorrelateImage } from '../../utils/canvasMapping';
import { CanvasToBMP } from "../../utils/CanvasToBMP";
import {NodeDiv} from '../acyclicgraph/graph.node'
import {WorkerManager} from 'magicworker'

let component = require('./spectrometer.node.html');

//TODO:
/*
    - Image mixing and comparing, e.g. normalizing and cancelling out ambient intensities then doing variance between two corrected images to look at similarity. 
        Visual confirmation can be quicker than data driven analysis in the field!
    
    - Averaging e.g. a video capture or multiple captures with the same tag.

    - As a local db is built up, take anything with similar tags and provide dynamic stats e.g. storing up comparison results for quicker 
        cross correlation, this should lead into a database tooling more easily

    - Make rectangle dynamically resizable (can use an invisible element overlay to be lazy).
    
    - Make an interactive x-plot on the results chart to estimate three positions in the spectrogram to generate the x-axis. 
        2 tags on the endpoints where you can set the wavelength manually, then you can drag them to squish/stretch the x-axis to set the wavelength values for each y. 

    - Build a log of the images in memory/indexeddb and a quick comparison feature. 

    - Web hooks/sockets for passing data to/from the classifier model. Keep this super general so we can start to identify all kinds of materials!

    - Style, accounting for all of the above

    Bugs:
    
    

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
    capturegraph;
    capturegraphctx;
    graphVideoSnip = false;
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
    comparing = {
        sample1:undefined,
        sample2:undefined,
        baseline:undefined,
        s2_s1:undefined,
        a1:undefined,
        a2:undefined,
        a2_a1:undefined
    } //images being compared and their current settings

    //set the template string or function (which can input props to return a modified string)
    template=component;

    props={
        workers:new WorkerManager(3), //3 workers + main thread = 4 threads (e.g. if your processor can handle a minimum of 4 threads (8 is typical for a 4-core processor which is common nowadays))
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

        this.props.workers.addFunction('autocorrelateImage',(self,args,origin)=>{
                let arr = Array.from(args[0]);
                
                let bmp = {
                    r:[[]],g:[[]],b:[[]],s:[[]]
                };
                let x = 0;
                let y = 0;
                arr.forEach((v,i)=> {
                    if(i%4 == 0 || i == 0 )
                        bmp.r[y].push(v);
                    else if ((i-1)%4 == 0 || i == 1)
                        bmp.g[y].push(v);
                    else if ((i-2)%4 == 0 ||i == 2)
                        bmp.b[y].push(v);
                    else if ((i-3)%4 == 0 || i == 3) {
                        bmp.s[y].push(v);
                        x++;
            
                        if(x == args[1]) {
                            x = 0;
                            y++;
                            if(y !== args[2]) {
                                bmp.r.push([]); bmp.g.push([]); bmp.b.push([]); bmp.s.push([]);
                            }
                        }
                    }
                    // if(i == 0 || i%4 == 0)
                    //     bmp[pidx] = { r:v };
                    // else if (i == 1 || (i-1)%4 == 0)
                    //     bmp[pidx].g = v;
                    // else if (i == 2 || (i-2)%4 == 0)
                    //     bmp[pidx].b = v;
                    // else if (i == 3 || (i-3)%4 == 0) {
                    //     bmp[pidx].s = v;
                    //     pidx++;
                    // }
                });
            
                let res = {
                    r:undefined,g:undefined,b:undefined,s:undefined
                }
            
            
                //console.log(bmp.r,bmp.g,bmp.b,bmp.s);
                res.r = self.Math2.autocorrelation2d(bmp.r);
                res.g = self.Math2.autocorrelation2d(bmp.g);
                res.b = self.Math2.autocorrelation2d(bmp.b);
                res.s = bmp.s;//Math2.autocorrelation2dNormalized(bmp.s);
            
                //return res;
            
                let resultsconcat = {r:[],g:[],b:[],s:[]};
            
                res.r.forEach(a => resultsconcat.r.push(...a))
                res.g.forEach(a => resultsconcat.g.push(...a))
                res.b.forEach(a => resultsconcat.b.push(...a))
            
                resultsconcat.r = self.Math2.normalizeSeries(resultsconcat.r,true).map(v => v*255);
                resultsconcat.g = self.Math2.normalizeSeries(resultsconcat.g,true).map(v => v*255);
                resultsconcat.b = self.Math2.normalizeSeries(resultsconcat.b,true).map(v => v*255);
                
                let reconstructed = [];
            
                resultsconcat.r.forEach((v,i)=> {
                    reconstructed.push(v,resultsconcat.g[i],resultsconcat.b[i],255);
                })
            
                // res.r.forEach((p,i) => {
                //     p.forEach((v,j) => {
                //         reconstructed.push(v,res.g[i][j],res.b[i][j],0);
                //     })
                // })
            
                // reconstructed = Math2.normalizeSeries(reconstructed,true).map((v,i) => {
                //     if(i === 3 || (i-3)%4 === 0) {
                //         return 255;
                //     }
                //     else return v*255        
                // })
            
                //console.log('reconstructed',reconstructed)
            
                return Uint8ClampedArray.from(reconstructed);
            
                // return new ImageData(uintarr,bitmapImageData.width,bitmapImageData.height);
            
        }); //pass image data uint8clamped array and get a filtered image array back you can reconstruct

        this.canvas = this.querySelector('#picker');
        this.pickerDiv = this.querySelector('#pickerDiv');
        this.captureDiv = this.querySelector('#captureDiv');
        this.imgmenu = this.querySelector('#imgmenu');
        this.videomenu = this.querySelector('#videomenu');
        this.urlmenu = this.querySelector('#urlmenu');
        this.imgselect = this.querySelector('#imgselect');
        this.select = this.querySelector('#imgselect');
        this.capture = this.querySelector('#capture');
        this.capturectx = this.capture.getContext('2d');
        this.capturegraph = this.querySelector('#capturegraph');
        this.capturegraphctx = this.capturegraph.getContext('2d');
        this.menu = this.querySelector('#menu');
        this.toggleMenu = this.querySelector('#toggleMenu');

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

        this.querySelector('#showgraph').onclick = () => { //live graph on video snip
            this.graphVideoSnip = !this.graphVideoSnip;
        }

        this.img = this.querySelector('img');

        this.img.addEventListener('load', (ev)=>{
            this.props.mode = 'img';
            this.imgmenu.style.display = '';
            this.videomenu.style.display = 'none';
            this.urlmenu.style.display = 'none';
            this.querySelector('#sourcedeets').innerHTML = `Source Resolution: ${this.img.naturalWidth}x${this.img.naturalHeight}`;
            this.onresize();
        })

        this.video = this.querySelector('video');

        this.video.addEventListener('canplay', (ev)=>{
            this.props.mode = 'video';
            this.imgmenu.style.display = 'none';
            this.videomenu.style.display = '';
            this.urlmenu.style.display = 'none';

            this.querySelector('#sourcedeets').innerHTML = `Source Resolution: ${this.video.videoWidth}x${this.video.videoHeight}`;
            this.onresize();
        })

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
                this.querySelector('#record').innerHTML = "🟥";
                this.querySelector('#record').onclick = () => {
                    this.props.running = false;
                    mediaRecorder.stop();
                    this.querySelector('#record').innerHTML = "🔴";
                    this.querySelector('#record').onclick = recordButton;
                }
                
                mediaRecorder.start();
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


    useWebcam = () => {
        this.props.running = false;
        this.img.style.display = 'none';
        if(this.video.src) {
            this.graphVideoSnip = false;
            this.capturegraphctx.clearRect(0,0,this.capturegraph.width,this.capturegraph.height);
            this.video.pause();
            this.video.src = '';
        }
        this.video.style.display = '';

        if(navigator.getUserMedia) {
            navigator.getUserMedia(
                {
                    audio:false,
                    video:{
                        optional: [
                            {minWidth: 320},
                            {minWidth: 640},
                            {minWidth: 1024},
                            {minWidth: 1280},
                            {minWidth: 1920},
                            {minWidth: 2560},
                          ]
                    }
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
            this.graphVideoSnip = false;
            this.capturegraphctx.clearRect(0,0,this.capturegraph.width,this.capturegraph.height);
            this.video.pause();
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
                this.graphVideoSnip = false;
                this.capturegraphctx.clearRect(0,0,this.capturegraph.width,this.capturegraph.height);
                this.video.pause();
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
            if(this.video.src) {
                this.graphVideoSnip = false;
                this.capturegraphctx.clearRect(0,0,this.capturegraph.width,this.capturegraph.height);
                this.video.pause();
                this.video.src = '';
            }
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
                this.graphVideoSnip = false;
                this.capturegraphctx.clearRect(0,0,this.capturegraph.width,this.capturegraph.height);
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

            this.querySelector('#capturedeets').innerHTML = `Snip Resolution (actual): ${Math.round(Math.abs(this.props.imgpicked.x1-this.props.imgpicked.x0))}x${Math.round(Math.abs(this.props.imgpicked.y1-this.props.imgpicked.y0))}`

          
            //console.log(this.props.imgpicked)
            // Scale Capture
            this.capture.width = this.captureDiv.clientWidth; //Math.abs(this.props.imgpicked.x1 - this.props.imgpicked.x0);
            this.capture.height = this.captureDiv.clientHeight;  //Math.abs(this.props.imgpicked.y1 - this.props.imgpicked.y0)
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
    async continuousCapture(img) {
        if(this.props.imgpicked.x1 && this.props.imgpicked.x0 && this.props.imgpicked.y1 && this.props.imgpicked.y0) {
            this.capturectx.drawImage(
                img,
                this.props.imgpicked.x0, //srcrc
                this.props.imgpicked.y0,
                Math.abs(this.props.imgpicked.x1-this.props.imgpicked.x0),
                Math.abs(this.props.imgpicked.y1-this.props.imgpicked.y0),
                0,0,this.capture.width,this.capture.height //dest
            );
            if(this.graphVideoSnip) {
                let imgdata = this.capturectx.getImageData(0,0,this.capture.width,this.capture.height);
                let mapped = mapBitmapXIntensities(imgdata);
                graphXIntensities(
                    this.capturectx,
                    mapped.xrgbintensities,
                    mapped.xintmax
                );
            }
            setTimeout(()=>{requestAnimationFrame(async ()=>{this.continuousCapture(img);})},33.3333);
        }
    }

    
    processCapture = (img) => {
        let capture = this.createBitmapCanvasWithMenu(
            img,
            this.querySelector('#capturelist'),
            '100%'
        )
        if(capture.timestamp) {
            this.captures[capture.timestamp] = capture;
        }
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

    async createBitmapCanvasWithMenu(img, parentNode, w='320px', h='180px') {

        let captureheight = '30%';
        let graphheight = '54%';
        
        if(!h.includes('%')) {
            let ext = `${h[h.length-2]}${h[h.length-1]}`;
            h = h.substring(0,h.length-2);
            captureheight = (0.3 * parseFloat(h)) + ext; console.log(captureheight)
            graphheight = (.54 * parseFloat(h)) + ext;
        }

        let template = `
        <div style='width:${w}; max-height:${h}; border: 1px solid white; border-radius:3px; padding:2px;'>
            <span style='height:6%;'>
                <input id='title' type='text' placeholder='Name/Tag' style='padding:4px; font-size:8px; width:15%;'>
                <button id='savepng' title='Save PNG?' style='font-size:8px;'>🖼️(png)</button>
                <button id='savecsv' title='Save CSV?' style='font-size:8px;'>📄(csv)</button>
                <button id='savebmp' title='Save BMP?' style='font-size:8px;'>🖼️(bmp)</button>
                <button id='backup' title='Backup (cache)?' style='font-size:8px;'>📋
                </button><button  title='Close?' id='X' style='font-size:8px; float:right;'>❌</button>
                <button id='toggledisplay' title='Toggle display?' style='font-size:8px; float:right;'>👓</button>
                <button id='setsample2' title='Compare as Sample 2' style='font-size:8px; float:right;'>S2</button>
                <button id='setsample1' title='Compare as Sample 1' style='font-size:8px; float:right;'>S1</button>
                <button id='setbaseline' title='Compare as Baseline' style='font-size:8px; float:right;'>B</button>
            </span><br>
            <canvas id='capturecanvas' style='width:100%; max-height:${captureheight};'></canvas>
            <canvas id='graphcanvas' style='width:100%; height:${graphheight}; background-color:black;'></canvas>
        </div><br>`;
    
        if(typeof parentNode === 'string') {
            parentNode = document.getElementById(parentNode);
        } 
         
        if(parentNode) {
            parentNode.insertAdjacentHTML('afterbegin',template);
            
            let canvas = document.querySelector('#capturecanvas');
            canvas.width = img.width;
            canvas.height = img.height;
            let ctx = canvas.getContext('2d')
            ctx.drawImage(img,0,0);
    
            let input = document.querySelector('#title');
            //console.log(img);
            let bmp = ctx.getImageData(0,0,canvas.width,canvas.height);
            let graph = document.querySelector('#graphcanvas');
            graph.width = canvas.width;
            graph.height = canvas.height;
            let mapped = mapBitmapXIntensities(bmp);
            graphXIntensities(graph.getContext('2d'),mapped.xrgbintensities,mapped.xintmax);
    
            let capture = {
                node:canvas.parentNode,
                parentNode:parentNode,
                width:img.width,
                height:img.height,
                canvas,
                graph,
                input,
                timestamp:Date.now(),
                mapped
            };

            parentNode.querySelector('#setsample1').onclick = () => {
                this.addBitmapComparison(
                    mapped,
                    input.value,
                    1,
                    canvas
                );
            }
            parentNode.querySelector('#setsample2').onclick = () => {
                this.addBitmapComparison(
                    mapped,
                    input.value,
                    2,
                    canvas
                );
            }
            parentNode.querySelector('#setbaseline').onclick = () => {
                this.addBitmapComparison(
                    mapped,
                    input.value,
                    3,
                    canvas
                );
            }
    
            parentNode.querySelector('#toggledisplay').onclick = () => {
                if(canvas.style.display == '' && graph.style.display == '') {
                    canvas.style.display = 'none';
                } else if (canvas.style.display == 'none') {
                    canvas.style.display = '';
                    graph.style.display = 'none';
                } else if (graph.style.display == 'none') {
                    graph.style.display = '';
                }
            }
        
            parentNode.querySelector('#backup').onclick = () => {
                backupData(capture.mapped,input.value+'_'+new Date().toISOString());
            } 
    
            parentNode.querySelector('#savepng').onclick = () => {
    
                //not super efficient but w/e
                let tmp = new OffscreenCanvas(capture.mapped.bitmap.width,capture.mapped.bitmap.height);
                tmp.getContext('2d').drawImage(img,0,0);
    
                let reader = new FileReader();
    
                reader.addEventListener("load", function () {
                    // convert image file to base64 string
    
                    var hiddenElement = document.createElement('a');
                    hiddenElement.href =  reader.result;
                    hiddenElement.target = "_blank";
                    if (input.value !== "") {
                        hiddenElement.download = input.value+'_'+new Date().toISOString()+".png";
                    } else{
                        hiddenElement.download = new Date().toISOString()+".png";
                    }
                    hiddenElement.click();
                }, false);
                
                tmp.convertToBlob({type:'image/png'}).then((blob) => {
                    reader.readAsDataURL(blob);
                })
               
    
    
            }
                
            parentNode.querySelector('#savebmp').onclick = () => {
    
                let dataurl = CanvasToBMP.ImageDatatoDataURL(
                    reconstructImageData(
                        capture.mapped.bitarr,
                        capture.mapped.width,
                        capture.mapped.height
                    )
                );
                var hiddenElement = document.createElement('a');
                hiddenElement.href = dataurl;
                hiddenElement.target = "_blank";
                if (input.value !== "") {
                    hiddenElement.download = input.value+'_'+new Date().toISOString()+".bmp";
                } else{
                    hiddenElement.download = new Date().toISOString()+".bmp";
                }
                hiddenElement.click();
            }
    
            parentNode.querySelector('#savecsv').onclick = () => {
                dumpSpectrogramsToCSV(capture.mapped.xrgbintensities,input.value);
            } 
    
            parentNode.querySelector('#X').onclick = () => {
                canvas.parentNode.parentNode.removeChild(canvas.parentNode);
            }
    
            return capture;
        }
    
    
        return template;
    }

    //pass results from mapBitmapXIntensities/graphXIntensities
    //spaghetti-in-progress
    async addBitmapComparison(
        mapped, //result from createBitmapCanvasMenu provided a parentNode
        title=new Date().toISOString(), //for downloading the csv
        sample=1, //sample 1, 2, 3 (baseline) ?
        underlayimg=undefined
    ) {
        if(sample !== 1 && sample !== 2 && sample !== 3) return;

        let canvas;

        if(!title) title = new Date().toISOString();
        
        if(sample === 1) { 
            canvas = this.querySelector('#sample1');
            this.comparing.sample1 = mapped;

            this.querySelector('#sample1csv').onclick = () => {
                dumpSpectrogramsToCSV(mapped.xrgbintensities,'Sample1_'+title)
            }
            //console.log(mapped.bitmap);
            
            //run fat thread operation asynchronously
            this.props.workers.run(
                'autocorrelateImage',
                [mapped.bitmap.data,mapped.width,mapped.height]
            ).then(
                (autocorrelated) => {
                //console.log(worked!)
                let imgdata = new ImageData(autocorrelated, mapped.width,mapped.height);

                let offscreen = new OffscreenCanvas(mapped.width,mapped.height);
                let offscreenctx = offscreen.getContext('2d');
                offscreenctx.putImageData(imgdata,0,0);

                let cv = this.querySelector('#sample1a');
                cv.width = mapped.width; cv.height = mapped.height;
                let cvx = cv.getContext('2d');

                drawImage(cvx,offscreen);
                //console.log(autocorrelated);
            });
        }
        else if(sample === 2) { 
            canvas = this.querySelector('#sample2');
            this.comparing.sample2 = mapped;

            this.querySelector('#sample2csv').onclick = () => {
                dumpSpectrogramsToCSV(mapped.xrgbintensities,'Sample2_'+title)
            }
                        
            //run fat thread operation asynchronously
            this.props.workers.run(
                'autocorrelateImage',
                [mapped.bitmap.data,mapped.width,mapped.height]
            ).then(
                (autocorrelated) => {
                //console.log(worked!)
                let imgdata = new ImageData(autocorrelated, mapped.width,mapped.height);

                let offscreen = new OffscreenCanvas(mapped.width,mapped.height);
                let offscreenctx = offscreen.getContext('2d');
                offscreenctx.putImageData(imgdata,0,0);

                let cv = this.querySelector('#sample2a');
                cv.width = mapped.width; cv.height = mapped.height;
                let cvx = cv.getContext('2d');

                drawImage(cvx,offscreen);
                //console.log(autocorrelated);
            });
        }
        else if(sample === 3) { 
            canvas = this.querySelector('#baseline');
            this.comparing.baseline = mapped;

            this.querySelector('#baselinecsv').onclick = () => {
                dumpSpectrogramsToCSV(mapped.xrgbintensities,'Baseline_'+title)
            }
                   
            //run fat thread operation asynchronously
            this.props.workers.run(
                'autocorrelateImage',
                [mapped.bitmap.data,mapped.width,mapped.height]
            ).then(
                (autocorrelated) => {
                //console.log(worked!)
                let imgdata = new ImageData(autocorrelated, mapped.width,mapped.height);

                let offscreen = new OffscreenCanvas(mapped.width,mapped.height);
                let offscreenctx = offscreen.getContext('2d');
                offscreenctx.putImageData(imgdata,0,0);

                let cv = this.querySelector('#baselinea');
                cv.width = mapped.width; cv.height = mapped.height;
                let cvx = cv.getContext('2d');

                drawImage(cvx,offscreen);
                //console.log(autocorrelated);
            });
        }

        canvas.height = canvas.clientHeight;
        canvas.width = canvas.clientWidth;
        let ctx = canvas.getContext('2d');

        if(underlayimg) drawImage(ctx,underlayimg);

        graphXIntensities(
            ctx,
            mapped.xrgbintensities,
            mapped.xintmax
        );

        if(sample === 1 || sample === 2) {
            if(this.comparing.sample1 && this.comparing.sample2) {
                let s2_s1 = this.querySelector('#s2-s1');
                s2_s1.height = s2_s1.clientHeight;
                s2_s1.width = s2_s1.clientWidth;

                this.comparing.s2_s1 = this.comparing.sample2.xrgbintensities.map((yrgbi,i) => {
                    if(!this.comparing.sample1.xrgbintensities[i]) return yrgbi;
                    return {
                        r: yrgbi.r - this.comparing.sample1.xrgbintensities[i].r,
                        g: yrgbi.g - this.comparing.sample1.xrgbintensities[i].g,
                        b: yrgbi.b - this.comparing.sample1.xrgbintensities[i].b,
                        i: yrgbi.i - this.comparing.sample1.xrgbintensities[i].i,
                    }
                });

                this.querySelector('#s2-s1csv').onclick = () => {
                    dumpSpectrogramsToCSV(xrgbintensities,'Difference_Sample1_vs_'+title);
                }

                graphXIntensities(s2_s1.getContext('2d'),this.comparing.s2_s1);
            }
        }

        if(sample === 1 || sample === 3) {
            if(this.comparing.sample1 && this.comparing.baseline) {
                let a1 = this.querySelector('#b-s1');
                a1.height = a1.clientHeight;
                a1.width = a1.clientWidth;

                this.comparing.a1 = this.comparing.baseline.xrgbintensities.map((yrgbi,i) => {
                    if(!this.comparing.sample1.xrgbintensities[i]) return yrgbi;
                    return {
                        r: yrgbi.r - this.comparing.sample1.xrgbintensities[i].r,
                        g: yrgbi.g - this.comparing.sample1.xrgbintensities[i].g,
                        b: yrgbi.b - this.comparing.sample1.xrgbintensities[i].b,
                        i: yrgbi.i - this.comparing.sample1.xrgbintensities[i].i,
                    }
                });

                this.querySelector('#a1csv').onclick = () => {
                    dumpSpectrogramsToCSV(xrgbintensities,'BaselineCorrected_'+title)
                }

                graphXIntensities(a1.getContext('2d'),this.comparing.a1);
            }
        }

        if(sample === 2 || sample === 3) {
            if(this.comparing.sample2 && this.comparing.baseline) {
                let a2 = this.querySelector('#b-s2');
                a2.height = a2.clientHeight;
                a2.width = a2.clientWidth;

                this.comparing.a2 = this.comparing.baseline.xrgbintensities.map((yrgbi,i) => {
                    if(!this.comparing.sample2.xrgbintensities[i]) return yrgbi;
                    return {
                        r: yrgbi.r - this.comparing.sample2.xrgbintensities[i].r,
                        g: yrgbi.g - this.comparing.sample2.xrgbintensities[i].g,
                        b: yrgbi.b - this.comparing.sample2.xrgbintensities[i].b,
                        i: yrgbi.i - this.comparing.sample2.xrgbintensities[i].i,
                    }
                });

                this.querySelector('#a2csv').onclick = () => {
                    dumpSpectrogramsToCSV(xrgbintensities,'BaselineCorrected_'+title)
                }

                graphXIntensities(a2.getContext('2d'),this.comparing.a2);
            }
        }

        if(this.comparing.sample1 && this.comparing.sample2 && this.comparing.baseline) {
            let d2_d1 = this.querySelector('#d2-d1');
            d2_d1.height = d2_d1.clientHeight;
            d2_d1.width = d2_d1.clientWidth;

            this.comparing.d2_d1 = this.comparing.a2.map((yrgbi,i) => {
                if(!this.comparing.a1[i]) return yrgbi;
                return {
                    r: yrgbi.r - this.comparing.a1[i].r,
                    g: yrgbi.g - this.comparing.a1[i].g,
                    b: yrgbi.b - this.comparing.a1[i].b,
                    i: yrgbi.i - this.comparing.a1[i].i,
                }
            });

            this.querySelector('#d2-d1csv').onclick = () => {
                dumpSpectrogramsToCSV(xrgbintensities,'D2minusD1_'+title)
            }

            graphXIntensities(d2_d1.getContext('2d'),this.comparing.d2_d1);
        }

        return canvas;
    }


}

//window.customElements.define('custom-', Custom);

Spectrometer.addElement('spectrometer-node');
