import { backupData, dumpSpectrogramsToCSV, graphXintensities, reconstructImageData } from "../../utils/canvasMapping";
import { CanvasToBMP } from "../../utils/CanvasToBMP";

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
        <canvas id='capturecanvas' style='width:100%; height:100%;'></canvas>
        <canvas id='graphcanvas' style='width:100%; height:100%;'></canvas>
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

