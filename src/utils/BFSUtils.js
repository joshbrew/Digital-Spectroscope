import {CSV} from './csv'

export let fsInited = false;
import * as BrowserFS from 'browserfs'
export const fs = BrowserFS.BFSRequire('fs');
const BFSBuffer = BrowserFS.BFSRequire('buffer').Buffer;

//TODO:
//Generic reimplementation of reading/writing buffered objects from/to CSVs and IndexedDB
//Josh B.

// ----------------------------- Generic Functions for BrowserFS -----------------------------
export const initFS = async (
    dirs = ['data','projects','extensions','settings','plugins'],
    oninit=()=>{}, 
    onerror=()=>{}
) => {
    if (fsInited) return true
    else {
    return new Promise (resolve => {
        let oldmfs = fs.getRootFS();
        BrowserFS.FileSystem.IndexedDB.Create({}, (e, rootForMfs) => {
            if (e) throw e;
            if (!rootForMfs) {
                onerror();
                throw new Error(`Error creating BrowserFS`);
            }
            BrowserFS.initialize(rootForMfs); //fs now usable with imports after this

        let promises = [];

        dirs.forEach(async (dir) => {
            promises.push(dirExists(fs,dir));
        })

        Promise.all(promises).then((values) => {
            oninit();
            fsInited = true
            resolve(true)
        })
    })
})
    }
}

export const exists = async (filename='',dir='data') => {
    return new Promise(resolve => {
        fs.exists('/'+dir+'/'+filename, function(exists) {
            resolve(exists);
        });
    })
}


export const readFile = async (filename='sessionName',dir='data') => {
    if (!fsInited) await initFS()
    return new Promise(resolve => {
        fs.readFile('/'+dir+'/'+filename, function(e, output) {
            if (e) throw e;
            resolve(output);
        });
    })
}


export async function readFileChunk (filename='sessionName', dir='data', begin = 0, end = 5120, onread=(data)=>{}) {
    
    if (filename != ''){
        return new Promise(async resolve => { 
            fs.open('/'+dir+'/' + filename, 'r', (e, fd) => {
                if (e) throw e;

                fs.read(fd, end, begin, 'utf-8', (er, output, bytesRead) => {
                    if (er) throw er;
                    if (bytesRead !== 0) {
                        let data = output.toString();
                    //Now parse the data back into the buffers.
                        fs.close(fd, () => {
                            onread(data,filename);
                            resolve(data);
                        });
                    } else resolve(undefined);
                });
            });
        });
    } else {
        console.error('Path name is not defined')
        return undefined;
    }
}


export const getFilenames = (onload=(directory)=>{}, directory = '/data') => {
    return new Promise(resolve => {
        fs.readdir(directory, (e, dir) => {
            if (e) throw e;
            if (dir) {
                console.log("files", dir);
                onload(dir);
                resolve(dir);
            }
            else resolve(undefined);
        });
    });
}

export const writeFile = async (filename, data, dir='data', onwrite=(data)=>{}) => {
    return new Promise(resolve => {
        fs.writeFile('/'+dir+'/'+filename, data, (err) => {
            if (err) throw err;
            onwrite(data);
            resolve(true);
        });
    });
}

export const appendFile = async (filename, data, dir='data', onwrite=(data)=>{}) => {
    return new Promise(resolve => {
        fs.appendFile('/'+dir+'/'+filename, data, (err) => {
            if (err) throw err;
            onwrite(data);
            resolve(true);
        });
    });
}

export const deleteFile = (filename='sessionName', dir='data', ondelete=listFiles) => {
    return new Promise(resolve => {
        if (filename != ''){
            fs.unlink('/'+dir+'/'+filename, (e) => {
                if (e) console.error(e);
                ondelete();
                resolve(true);
            });
        } else {
            console.error('Path name is not defined')
            resolve(false);
        }
    });
}

//read a browserfs file
export const readFileAsText = async (
    filename='sessionName.csv', 
    dir='data', 
    end='end',
    begin=0,
    onread=(data,filename)=>{
        //console.log(filename,data);
    }) => {
    
    return new Promise(async resolve => {

        let size = await getFileSize(filename,dir)
        
        if(end === 'end') {
            end = size;
        } else if (typeof end === 'number') {
            if(end > size) end = size;
        }

        fs.open('/'+dir+'/'+filename, 'r', (e, fd) => {
            if (e) throw e;
            fs.read(fd, end, begin, 'utf-8', (er, output, bytesRead) => {
                if (er) throw er;
                if (bytesRead !== 0) {
                    let data = output.toString();
                    //Now parse the data back into the buffers.
                    fs.close(fd, () => {
                        onread(data,filename);
                        resolve(data);
                    });
                } else resolve(undefined);
            });
        });
    });
}




export const getFileSize = async (filename,dir='data',onread=(size)=>{console.log(size);}) => {
    return new Promise(resolve => {
        fs.stat('/'+dir + '/' +filename,(e,stats) => {
            if(e) throw e;
            let filesize = stats.size;
            onread(filesize);
            resolve(filesize);
        });
    });
}


export const getCSVHeader = async (filename='', dir='data', onopen=(header, filename)=>{console.log(header,filename);}) => {
    
    return new Promise(resolve => {
        fs.open('/'+dir + '/' +filename,'r',(e,fd) => {
            if(e) throw e;
            fs.read(fd,65535,0,'utf-8',(er,output,bytesRead) => {  //could be a really long header for all we know
                if (er) throw er;
                if(bytesRead !== 0) {
                    let data = output.toString();
                    let lines = data.split('\n');
                    let header = lines[0];
                    //Now parse the data back into the buffers.
                    fs.close(fd,()=>{   
                        onopen(header, filename);
                        resolve(header);
                    });
                }
                else resolve(undefined);
            }); 
        });
    });
}

//
export const listFiles = async (dir='data', onload=(directory)=>{},fs_html_id=undefined) => {
    return new Promise(resolve => {
        fs.readdir('/'+dir, (e, directory) => {
            if (e) throw e;
            if (directory) {
                console.log("files", directory);
                onload(directory);
                // if(fs_html_id){
                //     let filediv = document.getElementById(fs_html_id);
                //     filediv.innerHTML = "";
                //     directory.forEach((str, i) => {
                //         if (str !== "settings.json") {
                //             filediv.innerHTML += file_template({ id: str });
                //         }
                //     });
                //     directory.forEach((str, i) => {
                //         if (str !== "settings.json") {
                //             document.getElementById(str + "svg").onclick = () => {
                //                 console.log(str);
                //                 writeToCSV(str);
                //             }
                //             document.getElementById(str + "delete").onclick = () => {
                //                 deleteFile(dir + '/' + str);
                //             }
                //         }
                //     });
                // } 
            }
            resolve(directory);
        });
    });
    }

    //Write IndexedDB data (preprocessed) into a CSV, in chunks to not overwhelm memory. This is for pre-processed data
    export const writeToCSVFromDB = async (filename='sessionName',dir='data',fileSizeLimitMb=10) => {
        return new Promise(resolve => {
        if (filename != ''){
            fs.stat('/' + dir + '/' + filename, (e, stats) => {
                if (e) throw e;
                let filesize = stats.size;
                console.log(filesize)
                fs.open(dir + '/' + filename, 'r', (e, fd) => {
                    if (e) throw e;
                    let i = 0;
                    let maxFileSize = fileSizeLimitMb * 1024 * 1024;
                    let end = maxFileSize;
                    if (filesize < maxFileSize) {
                        end = filesize;
                        fs.read(fd, end, 0, 'utf-8', (e, output, bytesRead) => {
                            if (e) throw e;
                            if (bytesRead !== 0) CSV.saveCSV(output.toString(), filename);
                            fs.close(fd);
                            resolve(true);
                        });
                    }
                    else {
                        const writeChunkToFile = async () => {
                            if (i < filesize) {
                                if (i + end > filesize) { end = filesize - i; }
                                let chunk = 0;
                                fs.read(fd, end, i, 'utf-8', (e, output, bytesRead) => {
                                    if (e) throw e;
                                    if (bytesRead !== 0) {
                                        CSV.saveCSV(output.toString(), filename + "_" + chunk);
                                        i += maxFileSize;
                                        chunk++;
                                        writeChunkToFile();
                                        fs.close(fd);
                                        resolve(true);
                                    }
                                });
                            }
                        }
                    }
                    //let file = fs.createWriteStream('./'+State.data.sessionName+'.csv');
                    //file.write(data.toString());
                });
            });
        } else {
            console.error('File name is not defined.');
            resolve(false);
        }
    });
}


//returns an object with the headers and correctly sized outputs (e.g. single values or arrays pushed in columns)
export async function readCSVChunkFromDB(filename,dir='data',start=0,end='end') {

    
    let head = await getCSVHeader(filename);

    if(head) head = head.split(',');
    else return undefined;

    let resultLengths = [];
    let resultNames = [];
    let results = {};

    head.forEach((v) => {
        if(v) {
            resultNames.push(v);
            resultLengths.push(1);
        }
        else resultLengths[resultLengths.length-1]++;
    });
    
    let size = await getFileSize(filename,dir);
    if(end === 'end') end = size;
    else if(end > size) {
        start = size-(end-start);
        end = size;
    }

    let data = await readFileChunk(filename,dir,start,end);

    let headeridx = 0;
    let lastIdx = 0;
    data.forEach((r,i) => {
        let row = r.split(',');
        while(lastIdx < row.length-1) {
            let l = resultLengths[headeridx]; 
            if(l === 1) {
                results[resultNames[headeridx]].push(row[lastIdx]); 
                lastIdx++;
            }
            else {
                results[resultNames[headeridx]].push(row[lastIdx].slice(lastIdx,l)); 
                lastIdx+=l;
            }
        } 
    });

    return results;

}


export const saveToFS = async (data, filename='sessionName',dir='data') => {
    
    if (!fsInited) await initFS()
    // Assumes content is text
    return new Promise(async resolve => {

        await dirExists(fs, dir)

        fs.writeFile('/'+dir+'/'+filename,data,(e)=>{
            if(e) throw e;
            resolve(data);
        });
    })
}

let directories = {};
export const dirExists = async (fs, directory) => {
    return new Promise(resolve => {
        if (directories[directory] === 'exists' || directories[directory] === 'created'){
            resolve()
        } else {
            fs.exists(`/${directory}`, (exists) => {
                if (exists) {
                    directories[directory] = 'exists'
                    console.log(`/${directory} exists!`)
                    resolve();
                }
                else if (directories[directory] === 'creating'){
                    console.log(directory + ' is still being created.')
                    resolve();
                }
                else {
                    console.log('creating ' + directory)
                    directories[directory] = 'creating'
                    fs.mkdir(directory, (err) => {
                        if (err) throw err;
                        directories[directory] = 'created'
                        setTimeout(resolve, 500)
                    });
                }

            });
        }
    });
}
