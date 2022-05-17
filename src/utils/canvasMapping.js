//Josh B

import { readFileAsText, writeFile } from "./BFSUtils";
import { CanvasToBMP } from "./CanvasToBMP";
import { CSV } from "./csv";
//import { Buffer } from 'buffer';

//if we're clicking on a canvas and want to scale the coordinates to the image (which may be squashed or stretched to the canvas in html)
export function imgOverlayPicker(img, canvasOverlay, canvasX, canvasY, imgOffsetX=0, imgOffsetY=0) {
    if(img.naturalWidth) {
        return {
            x: img.naturalWidth * (canvasX - imgOffsetX)/canvasOverlay.width,
            y: img.naturalHeight * (canvasY - imgOffsetY)/canvasOverlay.height
        };
    } else if (img.videoWidth) {
        return {
            x: img.videoWidth * (canvasX - imgOffsetX)/canvasOverlay.width,
            y: img.videoHeight * (canvasY - imgOffsetY)/canvasOverlay.height
        };
    } else if (img.width) {
        return {
            x: img.width * (canvasX - imgOffsetX)/canvasOverlay.width,
            y: img.height * (canvasY - imgOffsetY)/canvasOverlay.height
        } //what I should do is account for a potentially offset image inside a canvas (e.g. if you want multiple images in a canvas)
    }

    return undefined;
} 


export async function captureBitmap(img, x0=0, y0=0, w, h) {

    if(!w || !h) {
        if(img.naturalWidth) {
            w = img.naturalWidth;
            h = img.naturalHeight;
        } else if (img.videoWidth) {
            w=img.videoWidth;
            h=img.videoHeight;
        } else {
            w = img.width;
            h = img.height;
        }
    }

    return await createImageBitmap(img, x0, y0, w, h);
}

export function getCanvasBitmap(context,x0=0,y0=0,w=context.canvas.width,h=context.canvas.height) {
    return context.getImageData(x0,y0,w,h);
}



//pass context.getImageData() result
export function mapBitmapXIntensities(bitmapImageData) {
    let bitarr = Array.from(bitmapImageData.data);

    //intensities along the x axis (summing the y column image data)
    let xrgbintensities = [];

    let x = 0;

    //srgb format
    for(let i = 0; i < bitarr.length; i+=4) {
        if((i/4) % bitmapImageData.width === 0) x = 0;

        if(!xrgbintensities[x]) {
            xrgbintensities[x] = {
                i:parseFloat(bitarr[i]+bitarr[i+1]+bitarr[i+2]),
                r:parseFloat(bitarr[i]),
                g:parseFloat(bitarr[i+1]),
                b:parseFloat(bitarr[i+2])
            }
        }
        else {
            xrgbintensities[x].i += parseFloat(bitarr[i]+bitarr[i+1]+bitarr[i+2]);
            xrgbintensities[x].r += parseFloat(bitarr[i]);
            xrgbintensities[x].g += parseFloat(bitarr[i+1]);
            xrgbintensities[x].b += parseFloat(bitarr[i+2]);
        }
        x++;
    }

    let xintmax  = Math.max(...xrgbintensities.map((x) => {return x.i}));
    let xrintmax = Math.max(...xrgbintensities.map((x) => {return x.r}));
    let xbintmax = Math.max(...xrgbintensities.map((x) => {return x.b}));
    let xgintmax = Math.max(...xrgbintensities.map((x) => {return x.g}));

    let xrgbmax  = Math.max(xrintmax,xbintmax,xgintmax);

    return {
        bitmap:bitmapImageData, 
        width:bitmapImageData.width,
        height:bitmapImageData.height,
        bitarr:bitarr, //generic array you can read/write normally
        xrgbintensities, //rgb intensities summed for each component and together (rgbi)
        xintmax, //max of total intensities for scaling
        xrintmax, //max of r intensities
        xbintmax, //max of b intensities
        xgintmax, //max of g intensities
        xrgbmax //max of rgb intensities (not the i which is a much larger number)
    }
}


//browserfs back up our results from mapBitmapXIntensities to browserfs local indexeddb
export async function backupData(mapBitmapXIntensitiesResult,title) {
    let res = Object.assign({},mapBitmapXIntensitiesResult);
    delete res.bitmap; //delete the typed array that we can reconstruct later
    let str = JSON.stringify(res);
    return await writeFile(title, str, 'processed');
}

//pull results from browserfs and reload the bitmap data.
export async function pullBackedUpData(title) {
    let data = await readFileAsText(title,'processed');
    let parsed = JSON.parse(data);
    parsed.bitmap = reconstructImageData(parsed.bitarr,parsed.width,parsed.height);
    return parsed;
}

export function reconstructImageData(array, width, height) {
    return new ImageData(Uint8ClampedArray.from(array),width,height)
}

//subtract bitmap1 from bitmap2, bitmaps are ImageData or ImageBitmaps in srgb format. Returns a reconstructed image
export function compareBitmaps(bitmap1,bitmap2) {
    if(bitmap1.width !== bitmap2.width && bitmap1.height !== bitmap2.height) {
        console.error('compared bitmaps must be the same dimensions!')
        return undefined;
    }
    let arr = Array.from(bitmap1.data);
    let arr2 = Array.from(bitmap2.data);
    let res = new Array(arr.length);

    arr.forEach((v,i) => {
        if(i%3 !== 0) {
            res[i] = arr2[i] - arr[i];
        } else res[i] = v; //ignore the s in rgb in position 4;
    });

    return reconstructImageData(res,bitmap1.width,bitmap1.height);

}

//return an array estimating the wavelengths of light along the x axis
export function targetSpectrogram(xrgbintensities, xrintmax, xgintmax, xbintmax, peakR=650, peakG=520, peakB=450) {
    let ri, gi, bi;

    xrgbintensities.forEach((x,i) => {
        if(xrintmax === x.r) ri = i;
        if(xgintmax === x.g) gi = i;
        if(xbintmax === x.b) bi = i;
    });

    let spectrumEstimate = new Array(xrgbintensities.length);

    let incr = ((ri - bi)/(peakR - peakB) + (ri-gi)/(peakR-peakG) + (gi-bi)/(peakG-peakB))/3;

    let peaki;

    let peakPeak = Math.max(xrintmax,xgintmax,xbintmax);
    if(peakPeak === xrintmax) {
        peaki = ri;
        spectrumEstimate[peaki] = peakR;
    }
    if(peakPeak === xgintmax) {
        peaki = gi;
        spectrumEstimate[peaki] = peakG;
    }
    if(peakPeak === xbintmax) {
        peaki = bi;
        spectrumEstimate[peaki] = peakB;
    }

    let i = peaki - 1;
    let curWavelength = spectrumEstimate[peaki] - incr;
    while(i >= 0) {
        spectrumEstimate[i] = curWavelength;
        curWavelength -= incr;
        i--;
    }

    let j = peaki + 1;
    curWavelength = spectrumEstimate[peaki] + incr;
    while(j < spectrumEstimate.length) {
        spectrumEstimate[j] = curWavelength;
        curWavelength += incr;
        j++;
    }

    return spectrumEstimate;

}


export function drawImage(
    context,
    img,
    sx0=0,
    sy0=0,
    sw=img.width,
    sh=img.height,
    dx0=0,
    dy0=0,
    dw=context.canvas.width,
    dh=context.canvas.height
) {
    return context.drawImage(img,sx0,sy0,sw,sh,dx0,dy0,dw,dh);
}

export function graphXintensities(context, bitmapImageData, x0=0, y0=0, width=context.canvas.width, height=context.canvas.height) {

    let results = mapBitmapXIntensities(bitmapImageData);
    //console.log(xintmax);
    context.fillStyle = 'white';

    context.strokeStyle = 'ghostwhite';
    context.lineWidth = 1;

    context.beginPath();

    let npixels = results.xrgbintensities.length;
    let xscalar = width/npixels;
    results.xrgbintensities.forEach((yrgbi,i) => {
        if(i === 0) {
            context.moveTo(x0,y0+height*(1-yrgbi.i/results.xintmax));
        }
        else {
            context.lineTo(x0+i*xscalar,y0+height*(1-yrgbi.i/results.xintmax));
        }
    });


    context.stroke();
    
    context.strokeStyle = 'tomato';
    context.lineWidth = 1;

    context.beginPath();

    results.xrgbintensities.forEach((yrgbi,i) => {
        if(i === 0) {
            context.moveTo(x0,y0+height*(1-yrgbi.r/results.xintmax));
        }
        else {
            context.lineTo(x0+i*xscalar,y0+height*(1-yrgbi.r/results.xintmax));
        }
    });

    context.stroke();
    
    context.strokeStyle = '#00b8f5';

    context.beginPath();

    
    results.xrgbintensities.forEach((yrgbi,i) => {
        if(i === 0) {
            context.moveTo(x0,y0+height*(1-yrgbi.b/results.xintmax));
        }
        else {
            context.lineTo(x0+i*xscalar,y0+height*(1-yrgbi.b/results.xintmax));
        }
    });
    
    context.stroke();
    
    context.strokeStyle = 'chartreuse';

    context.beginPath();
    

    results.xrgbintensities.forEach((yrgbi,i) => {
        if(i === 0) {
            context.moveTo(x0,y0+height*(1-yrgbi.g/results.xintmax));
        }
        else {
            context.lineTo(x0+i*xscalar,y0+height*(1-yrgbi.g/results.xintmax));
        }
    });

    context.stroke();
    //update the plot from the bitmap
    
   // console.log(this.bitmap, xintensities, xrgbintensities);
    return results;
}

//we have a list of canvases to populate as new captures stream in
//we also have a list on the right side of saved canvases we are comparing
//lets bump off canvases past a certain limit, offscreencanvas?


//scrollwheel of canvases, anything past the renderlimit gets turned into an offscreen canvas
export function bufferCanvas(canvas, buffer=[], idx=0, renderlimit=10, offscreenlimit=40) {
    
    if(buffer.length > renderlimit+offscreenlimit) {
        buffer.pop();
    }
    if(buffer.length > renderlimit) {
        //transfer the canvas to an offscreen canvas
        let ofcpy = new OffscreenCanvas(buffer[renderlimit].width,buffer[renderlimit].height);
        let ofctx = ofcpy.getContext('2d');
        ofctx.drawImage(buffer[renderlimit]);
        if(buffer[renderlimit].parentNode) buffer[renderlimit].parentNode.removeChild(buffer[renderlimit]) //pop off the dom
        buffer[renderlimit] = ofcpy; //replace with the offscreen canvas in buffer

    }

    let copy;
    if(idx === 0) {
        copy = document.createElement('canvas');
        copy.width = canvas.width;
        copy.height = canvas.height;
        let ctx = copy.getContext('2d');
        ctx.drawImage(canvas,0,0);
    } else {
        copy = new OffscreenCanvas(canvas.width,canvas.height);
        let ctx = copy.getContext('2d');
        ctx.drawImage(canvas,0,0);
    }

    buffer.unshift(copy);

    return buffer;
}

export function unbufferCanvas(buffer=[], idx=0, renderlimit=10) {
    if(buffer[idx]) {
        if(buffer[idx].parentNode) buffer[idx].parentNode.removeChild(buffer[idx]);
        buffer.splice(idx,1)[0];
        if(idx <= renderlimit && buffer.length >= renderlimit) {
            //we popped a rendered canvas, so swap an offscreencanvas back in
            let copy = document.createElement('canvas');
            copy.width = buffer[renderlimit].width;
            copy.height = buffer[renderlimit].height;
            let ctx = copy.getContext('2d');
            ctx.drawImage(buffer[renderlimit],0,0);
            buffer[renderlimit] = copy; //replace the offscreen canvas
        }
    }
}

//capture a video clip for playback, we should save the video 
//clip in these cases and reprocess instead of keeping giant bitmap 
//collections except as needed
export function recordCanvas(canvas, fps=30, withVideoURL=downloadMP4URL) {
    let videoSrc = canvas.captureStream(fps);
    let mediaRecorder = new MediaRecorder(videoSrc); //https://medium.com/@amatewasu/how-to-record-a-canvas-element-d4d0826d3591

    let chunks = [];
    mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data);
    }

    mediaRecorder.onstop = function(e) {
        let blob = new Blob(chunks, {'type':'video/mp4'});
        chunks = [];
        let videoURL = URL.createObjectURL(blob);
        withVideoURL(videoURL);
    }

    return mediaRecorder;

}

export function downloadMP4URL(videoURL, title=new Date().toISOString()) {
    var hiddenElement = document.createElement('a');
    hiddenElement.href = videoURL;
    hiddenElement.target = "_blank";
    if (title !== "") {
        hiddenElement.download = title+".mp4";
    } else{
        hiddenElement.download = new Date().toISOString()+".mp4";
    }
    hiddenElement.click();
}


//https://www.i-programmer.info/projects/36-web/6234-reading-a-bmp-file-in-javascript.html?start=1
export function getBMP(buffer) {
    var datav = new DataView(buffer);
    var bitmap = {};

    bitmap.fileheader = {}; 
    bitmap.fileheader.bfType =
                    datav.getUint16(0, true);
    bitmap.fileheader.bfSize =
                    datav.getUint32(2, true);
    bitmap.fileheader.bfReserved1 =
                    datav.getUint16(6, true);
    bitmap.fileheader.bfReserved2 =
                    datav.getUint16(8, true);
    bitmap.fileheader.bfOffBits =
                    datav.getUint32(10, true);

    bitmap.infoheader = {};
    bitmap.infoheader.biSize =
                    datav.getUint32(14, true);
    bitmap.infoheader.biWidth =
                    datav.getUint32(18, true);
    bitmap.infoheader.biHeight =
                    datav.getUint32(22, true);
    bitmap.infoheader.biPlanes =
                    datav.getUint16(26, true);
    bitmap.infoheader.biBitCount =
                    datav.getUint16(28, true);
    bitmap.infoheader.biCompression =
                    datav.getUint32(30, true);
    bitmap.infoheader.biSizeImage =
                    datav.getUint32(34, true);
    bitmap.infoheader.biXPelsPerMeter =
                    datav.getUint32(38, true);
    bitmap.infoheader.biYPelsPerMeter =
                    datav.getUint32(42, true);
    bitmap.infoheader.biClrUsed =
                    datav.getUint32(46, true);
    bitmap.infoheader.biClrImportant =
                    datav.getUint32(50, true);

    var start = bitmap.fileheader.bfOffBits;  bitmap.stride =
    Math.floor((bitmap.infoheader.biBitCount
        *bitmap.infoheader.biWidth +
                                31) / 32) * 4;
    bitmap.pixels =
            new Uint8Array(buffer, start);
    return bitmap;
}

export function convertBMPToPNG(bitmap) {
    canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var Width = bitmap.infoheader.biWidth;
    var Height = bitmap.infoheader.biHeight;
    canvas.width = Width; canvas.height = Height;
    var imageData = ctx.createImageData(Width, Height);
    var data = imageData.data;
    var bmpdata = bitmap.pixels;
    var stride = bitmap.stride;
    for (var y = 0; y < Height; ++y) {
        for (var x = 0; x < Width; ++x) {
         var index1 = (x+Width*(Height-y))*4;
         var index2 = x * 3 + stride * y;
         data[index1] = bmpdata[index2 + 2];
         data[index1 + 1] = bmpdata[index2 + 1];
         data[index1 + 2] = bmpdata[index2];
         data[index1 + 3] = 255;
        }
    }
    ctx.putImageData(imageData,0,0);

    return canvas.toDataURL('image/png');
}   

export function convertBMPToImageData(bitmap) {
    canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var Width = bitmap.infoheader.biWidth;
    var Height = bitmap.infoheader.biHeight;
    var imageData = ctx.createImageData(
                              Width, Height);
    var data = imageData.data;
    var bmpdata = bitmap.pixels;
    var stride = bitmap.stride;
    for (var y = 0; y < Height; ++y) {
        for (var x = 0; x < Width; ++x) {
         var index1 = (x+Width*(Height-y))*4;
         var index2 = x * 3 + stride * y;
         data[index1] = bmpdata[index2 + 2];
         data[index1 + 1] = bmpdata[index2 + 1];
         data[index1 + 2] = bmpdata[index2];
         data[index1 + 3] = 255;8
        }
    }
    return imageData;
}  

export function processBMPimage(e) {
    var buffer = e.target.result;
    var bitmap = getBMP(buffer); 
    var imageData = convertBMPToImageData(bitmap);  
    return imageData;
}

export function handleBMPFiles(e) {
    var file = e.target.files[0];
    var reader = new FileReader();  
    reader.addEventListener(
        "load",
        processBMPimage, 
        false
    );  
    reader.readAsArrayBuffer(file);
}

export function loadBMP(context) {
    var input = document.createElement('input');
    input.accept = '.bmp';
    input.type = 'file';

    input.onchange = (e) => {
        handleBMPFiles(e);
    }
    input.click();
}

export function processVideoBitmaps(recording) {

}

export function dumpSpectrogramsToCSV(xrgbintensities, title) {
    let header = 'x,r,g,b,i\n';

    let body = '';
    xrgbintensities.forEach((x,i) => {
        body += `${i},${x.r},${x.g},${x.b},${x.i}\n`;
    });

    let csv = header + body;

    CSV.saveCSV(
        csv,
        title+'_'+new Date().toISOString()
    );
}

export function dumpBMPToCSV(arr,title,w,h) { //dump the raw srgb array from our graphxintensities result to CSV or the intensity map(s)
    
    let csvraw = ``;
    let j = 0;

    let x = 0;
    let y = 0;
    for(let i = 0; i < arr.length; i++) {
        if(j === 0) {
            csvraw += `${arr[i]},`;
            j++;
        }
        if(j === 3) {
            csvraw += `${arr[i]},${x},${y}\n`;
            x++;
            if(x === w) {
                y++;
                x = 0;
            }
            j = 0;
        }
        else {
            csvraw += `${arr[i]},`;
            j++;
        }
    }

    let csv = 's,r,g,b,x,y\n' + toJoin.join('\n');
    
    CSV.saveCSV(
        csv,
        title
    )
}

//download bmp file from canvas
export function downloadBMP(canvas, title) {
        //Converts an array of strings (e.g. raw data stream text) or an array of arrays representing lines of data into CSVs
        let dataurl = CanvasToBMP.toDataURL(canvas);
        var hiddenElement = document.createElement('a');
        hiddenElement.href = dataurl;
        hiddenElement.target = "_blank";
        if (title !== "") {
            hiddenElement.download = title + new Date().toISOString()+".bmp";
        } else{
            hiddenElement.download = new Date().toISOString()+".bmp";
        }
        hiddenElement.click();
}

//image with clickable canvas overlay
export function createImageWithOverlay(src, parentNode, typ='img', w='320px', h='180px', onClick=(ev)=>{}) {

    let template = `<div style='width:${w}; height:${h};'>`;

    if(typ === 'img') {
        template += `<img src=${src} style='position:absolute; width:100%; height:100%; z-index:4;'></img>`;
    }
    else if (typ === 'video') {
        template += `<video src=${src} style='position:absolute; width:100%; height:100%; z-index:4;'></video>`;
    }

    template+= `<canvas style='position:absolute; width:100%; height:100%; z-index:5;'></canvas>
    </div>
    `;

    if(typeof parentNode === 'string') {
        parentNode = document.getElementById(parentNode);
    } 
     
    if(parentNode) {
        parentNode.insertAdjacentHTML('afterbegin',template);
    }

    return template;
}

//image with labeling inputs
export async function createBitmapCanvasWithMenu(img, parentNode, w='320px', h='180px') {
    let template = `
    <div style='width:${w}; height:${h};'>
        <div>
            <input id='title' type='text' placeholder='name'>
            <button id='toggledisplay'>Toggle Display</button>
            <button id='savepng'>Save PNG</button>
            <button id='savebmp'>Save BMP</button>
            <button id='savecsv'>Save CSV</button>
            <button id='backup'>Backup</button>
            <button id='X'>X</button>
        </div>
        <canvas id='capturecanvas' style='width:100%; height:100%; z-index:5;'></canvas>
        <canvas id='graphcanvas' style='width:100%; height:100%; z-index:6;'></canvas>
    </div>`;

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
        console.log(img)
        let bmp = ctx.getImageData(0,0,canvas.width,canvas.height);
        let graph = document.querySelector('#graphcanvas');
        let mapped = graphXintensities(graph.getContext('2d'), bmp);

        

        let capture= {
            parentNode:parentNode,
            width:img.width,
            height:img.height,
            canvas,
            input,
            mapped
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

