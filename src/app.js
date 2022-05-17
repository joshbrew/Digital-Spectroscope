import './components/components.index'

import {initFS} from './utils/BFSUtils'

initFS(
    ['processed']
)

let elm = document.createElement('spectrometer-node');

document.body.appendChild(elm);