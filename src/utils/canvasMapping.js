//Josh B

import { readFileAsText, writeFile } from "./BFSUtils";
import { CanvasToBMP } from "./CanvasToBMP";
import { CSV } from "./csv";
import {Math2} from 'brainsatplay-math'
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

    return await createImageBitmap(img, x0, y0, w+1, h+1);
}

export function getCanvasBitmap(context,x0=0,y0=0,w=context.canvas.width,h=context.canvas.height) {
    return context.getImageData(x0,y0,w,h);
}

export function getMaxima(xrgbintensities=[{r,g,b,i}]) {
    let xintmax  = Math.max(...xrgbintensities.map((x) => {return x.i}));
    let xrintmax = Math.max(...xrgbintensities.map((x) => {return x.r}));
    let xbintmax = Math.max(...xrgbintensities.map((x) => {return x.b}));
    let xgintmax = Math.max(...xrgbintensities.map((x) => {return x.g}));

    let xrgbmax  = Math.max(xrintmax,xbintmax,xgintmax);

    return {
        xintmax,
        xrintmax,
        xbintmax,
        xgintmax,
        xrgbmax
    }
}

//pass context.getImageData() result
export function mapBitmapXIntensities(bitmapImageData) {
    let bitarr = Array.from(bitmapImageData.data);

    //intensities along the x axis (summing the y column image data)
    let xrgbintensities = [];
    let i = [];
    let r = [];
    let g = [];
    let b = [];

    let x = 0;

    //srgb format
    for(let j = 0; j < bitarr.length; j+=4) {
        if((j/4) % bitmapImageData.width === 0) x = 0;

        if(!i[x]) {
            i[x]=parseFloat(bitarr[j]+bitarr[j+1]+bitarr[j+2]),
            r[x]=parseFloat(bitarr[j]),
            g[x]=parseFloat(bitarr[j+1]),
            b[x]=parseFloat(bitarr[j+2])
        }
        else {
            i[x] += parseFloat(bitarr[j]+bitarr[j+1]+bitarr[j+2]);
            r[x] += parseFloat(bitarr[j]);
            g[x] += parseFloat(bitarr[j+1]);
            b[x] += parseFloat(bitarr[j+2]);
        }
        x++;
    }

    function clamp(arr,max=Math.max(...arr)) { //Clamp array to max (assuming all positive and absolute values are relative to the sensor)
        if(!max) max = Math.max(...arr);

        return arr.map(v => v/max);
    }

    //we need to normalize the arrays
    let max =  Math.max(...i);
    i = clamp(i,max);
    r = clamp(r,max);
    g = clamp(g,max);
    b = clamp(b,max);

    xrgbintensities = i.map((v,j) => {
        return {
            i:i[j],
            r:r[j],
            g:g[j],
            b:b[j]
        }
    })
    

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

export async function autocorrelateImage(bitmapImageDataArray,imageWidth,imageHeight) {
    let arr = Array.from(bitmapImageDataArray);
    
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

            if(x == imageWidth) {
                x = 0;
                y++;
                if(y !== imageHeight) {
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
    res.r = Math2.autocorrelation2d(bmp.r);
    res.g = Math2.autocorrelation2d(bmp.g);
    res.b = Math2.autocorrelation2d(bmp.b);
    res.s = bmp.s;//Math2.autocorrelation2dNormalized(bmp.s);

    //return res;

    let resultsconcat = {r:[],g:[],b:[],s:[]};

    res.r.forEach(a => resultsconcat.r.push(...a))
    res.g.forEach(a => resultsconcat.g.push(...a))
    res.b.forEach(a => resultsconcat.b.push(...a))

    resultsconcat.r = Math2.normalizeSeries(resultsconcat.r,true).map(v => v*255);
    resultsconcat.g = Math2.normalizeSeries(resultsconcat.g,true).map(v => v*255);
    resultsconcat.b = Math2.normalizeSeries(resultsconcat.b,true).map(v => v*255);
    
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

    console.log('reconstructed',reconstructed)

    return Uint8ClampedArray.from(reconstructed);

    // return new ImageData(uintarr,bitmapImageData.width,bitmapImageData.height);

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
        if((i-1)%3 !== 0 || i !== 3) {
            res[i] = arr2[i] - arr[i];
        } else res[i] = v; //ignore the s in rgb in position 4;
    });

    return reconstructImageData(res,bitmap1.width,bitmap1.height);

}

export function graphXIntensities(context, xrgbintensities, xintmax, xintmin, x0=0, y0=0, width=context.canvas.width, height=context.canvas.height) {

    //console.log(xintmax);
    context.fillStyle = 'black';
    context.lineWidth = 1;

    //draw the x axis

    if(!xintmax) {
        xintmax = Math.max(...xrgbintensities.map(y => y.i));
    }
    if(!xintmin) {
        xintmin = Math.min(...xrgbintensities.map(y => y.i));
    }
    if(xintmin > 0) xintmin = 0;

    context.strokeStyle = 'gray';
    context.beginPath();
    let zeroHeight = height*(1-(0-xintmin)/(xintmax-xintmin));
    context.moveTo(0,zeroHeight);
    context.lineTo(width,zeroHeight);
    context.stroke();
    
    let mapped = {
        xrgbintensities,
        xintmax,
        xintmin
    }

    let npixels = mapped.xrgbintensities.length;
    let xscalar = width/npixels;


    context.strokeStyle = 'ghostwhite';
    context.beginPath();

    mapped.xrgbintensities.forEach((yrgbi,i) => {
        if(i === 0) {
            context.moveTo(x0,y0+height*(1-(yrgbi.i - xintmin)/(mapped.xintmax-mapped.xintmin)));
        }
        else {
            context.lineTo(x0+i*xscalar,y0+height*(1-(yrgbi.i - xintmin)/(mapped.xintmax-mapped.xintmin)));
        }
    });


    context.stroke();
    
    context.strokeStyle = 'tomato';
    context.lineWidth = 1;

    context.beginPath();

    mapped.xrgbintensities.forEach((yrgbi,i) => {
        if(i === 0) {
            context.moveTo(x0,y0+height*(1-(yrgbi.r - xintmin)/(mapped.xintmax-mapped.xintmin)));
        }
        else {
            context.lineTo(x0+i*xscalar,y0+height*(1-(yrgbi.r - xintmin)/(mapped.xintmax-mapped.xintmin)));
        }
    });

    context.stroke();
    
    context.strokeStyle = '#00b8f5';

    context.beginPath();

    
    mapped.xrgbintensities.forEach((yrgbi,i) => {
        if(i === 0) {
            context.moveTo(x0,y0+height*(1-(yrgbi.b - xintmin)/(mapped.xintmax-mapped.xintmin)));
        }
        else {
            context.lineTo(x0+i*xscalar,y0+height*(1-(yrgbi.b - xintmin)/(mapped.xintmax-mapped.xintmin)));
        }
    });
    
    context.stroke();
    
    context.strokeStyle = 'chartreuse';

    context.beginPath();
    

    mapped.xrgbintensities.forEach((yrgbi,i) => {
        if(i === 0) {
            context.moveTo(x0,y0+height*(1-(yrgbi.g - xintmin)/(mapped.xintmax-mapped.xintmin)));
        }
        else {
            context.lineTo(x0+i*xscalar,y0+height*(1-(yrgbi.g - xintmin)/(mapped.xintmax-mapped.xintmin)));
        }
    });

    context.stroke();
    //update the plot from the bitmap
    
   // console.log(this.bitmap, xintensities, xrgbintensities);
    return mapped;
}

//we have a list of canvases to populate as new captures stream in
//we also have a list on the right side of saved canvases we are comparing
//lets bump off canvases past a certain limit, offscreencanvas?


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
export function recordCanvas(canvas, fps=30, withVideoURL=downloadMP4URL, nSec=null) { //can specify number of seconds to record after calling start();
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
    
    if(nSec) {
        mediaRecorder.onstart = (e) => {        
            setTimeout(()=>{
                try{ mediaRecorder.stop(); } catch(err) {}
            },nSec*1000);
        }
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

export function dumpBMPToCSV(arr,title,w,h) { //dump the raw srgb array from our graphIntensityMap result to CSV or the intensity map(s)
    
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
