import './components/components.index'

import {initFS} from './utils/BFSUtils'

// import {WorkerManager} from 'magicworker'
// let workers = new WorkerManager(1);
// console.log(workers);

// let p = workers.run('ping').then(alert)

//console.log(p);

initFS(
    ['processed']
)

let elm = document.createElement('spectrometer-node');

document.body.appendChild(elm);
