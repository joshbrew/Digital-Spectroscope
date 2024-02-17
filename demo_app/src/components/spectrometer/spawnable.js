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

