
//By Joshua Brewster (MIT License)
export class CSV { //data=["1|2","11|22"], or data=[[1,2,"xyz"],[2,3,"abc"],etc]
    constructor(onOpen=this.onOpen, saveButtonId=null, openButtonId=null) {

        this.onOpen = onOpen;
        this.notes = [{idx:0,text:"comment"}]; //order comments by data index

        if(saveButtonId !== null) {
            document.getElementById(saveButtonId).addEventListener('click', this.saveCSV);
        }
        if(openButtonId !== null) {
            document.getElementById(openButtonId).addEventListener('click', this.openCSV);
        }
    }

    processArraysForCSV(data=["1|2|3","3|2|1"],  delimiter="|", header="a,b,c",saveNotes=false) {
        let csvDat = header+"\n";
        let noteIdx = 0;
        data.forEach((line, i) => { //Add comments from an array with this structure this.notes = [{idx:n, text: "comment"},{...}]       
            if(data[i] === "string" && delimiter !== ",") { csvDat += line.split(delimiter).join(","); } 
            else{ csvData += line.join(",");} // Data can just be an array of arrays
            if (saveNotes === true) {
                if(this.notes[noteIdx].idx === i) {
                    line += this.notes[noteIdx].text;
                    noteIdx++;
                }
            }
            if(line.indexOf('\n') < 0) {csvDat+="\n";} //Add line endings exist in unprocessed array data
        });

        return csvDat;
    }

    //Converts an array of strings (e.g. raw data stream text) or an array of arrays representing lines of data into CSVs
    static saveCSV(csvDat="a,b,c\n1,2,3\n3,2,1\n",name=new Date().toISOString()){
        var hiddenElement = document.createElement('a');
        hiddenElement.href = "data:text/csv;charset=utf-8," + encodeURI(csvDat);
        hiddenElement.target = "_blank";
        if (name !== "") {
            hiddenElement.download = name+".csv";
        } else{
            hiddenElement.download = Date().toISOString()+".csv";
        }
        hiddenElement.click();
    }

    static openCSV(delimiter = ",", onOpen = (csvDat, header, path)=>{return csvDat, header, path;}) {
        var input = document.createElement('input');
        input.accept = '.csv';
        input.type = 'file';

        input.onchange = (e) => {
            var file = e.target.files[0];
            var reader = new FileReader();
            reader.onload = (event) => {
                var tempcsvData = event.target.result;
                var tempcsvArr = tempcsvData.split("\n");
                let header = [];
                var csvDat = [];
                tempcsvArr.pop();
                tempcsvArr.forEach((row,i) => {
                    if(i==0){ header = row.split(delimiter); }
                    else{
                        var temp = row.split(delimiter);
                        csvDat.push(temp);
                    }
                });
                onOpen(csvDat,header,input.value);
                input.value = '';
            }
            reader.readAsText(file);
        }
        input.click();
    } 

    //Dump CSV data without parsing it.
    static openCSVRaw(onOpen = (csvDat, path)=>{return csvDat, path;}) {
        var input = document.createElement('input');
        input.accept = '.csv';
        input.type = 'file';

        input.onchange = (e) => {
            var file = e.target.files[0];
            var reader = new FileReader();
            reader.onload = (event) => {
                var tempcsvData = event.target.result;
                onOpen(tempcsvData, input.value);
                input.value = '';
            }
            reader.readAsText(file);
        }
        input.click();
    }

    onOpen(csvDat=[],header=[]) { // Customize this function in your init script, access data with ex. console.log(serialMonitor.csvDat), where var serialMonitor = new chromeSerial(defaultUI=false)
        console.log("CSV Opened!",header, csvDat);
    }
}



//e.g. let csv = CSV.openCSV(',',(data,head,path) => {
//   let name = path.split('/').pop();
//   result = parseCSVData(data,head,name);
//   console.log(result);
//})
export const parseCSVData = (
    data,
    head,
    filename,
    hasend=true,
    parser=(lines,head,filename) => { //generic parser for CSV files
        let result = {filename:filename,head:head};
        let headers = head; if(typeof head === 'string') headers = head.split(',');
        for(let i = 0; i < lines.length; i++){
            let line = lines[i].split(',');
            for(let j = 0; j < line.length; j++){
                if(!result[headers[j]]) result[headers[j]]
                result[headers[j]] = line[j];
            }
        }
    
        return result; 
    
    }
) => {
    let lines = data.split('\n'); 
    lines.shift(); 

    if(hasend === false) lines.pop(); //pop last row if they are likely incomplete
    let result = parser(lines,head,filename);
    return result;
}



//pass an object with settings and data to process into CSV format
/**
 * option format:
 * {
 *  filename: 'filename',
 *  save: true, //will write a local CSV
 *  write:true, //will write to indexedDB, appending a file if it already exists
 *  dir: '/data', //directory if you want to save with browserfs
 *  header: ['timestamp','UTC','FP1','etc'],
 *  data: [{ //order of data is order of columns 
 *      x: [], //e.g. utc times. Used to create rows of data with the first column set to this
 *      timestamp: [], //e.g. ISO timestamps
 *      FP1; [1,2,3,4,5] //e.g.  filtered or raw data
 *    },
 *    {
 *      x: [], //e.g. utc times. Will splice rows with different timings into the same CSV
 *      timestamp: [], //e.g. ISO timestamps     
 *      FP1_FFT: [[0,1,2,3],[...],...], //e.g. periodic FFT data with different timing. Arrays of arrays get multiple columns
 *      FP2:[etc],...   
 *    }]
 *  }
 * }
 * 
 * result: [
 *  'timestamp,UTC,FP1,FP1_FFT,...,\n',
 *  '2012-12-12T12:12:12.000Z,123456,12345,123,...,\n',
 * ]
 * 
 */
//spits out an array of CSV rows in string format with endlines added
export const processDataForCSV = (options={}) => {
    let header = '';
    if(typeof options.data[0] === 'object' && !Array.isArray(options.data[0])){
        if(options.data[0].x) header = 'x,';
        else if (options.data[0].timestamp) header = 'timestamp,localtime,';
    }

    let headeridx = 0;
    let lines = {}; //associative array (e.g. timestamp = row)
    options.data.forEach((obj, i) => {
        if(Array.isArray(obj)) { //unstructured data just gets pushed into a column
            for(let j = 0; j < obj.length; j++) {
                if(!lines[j]) lines[j] = '';
                
                if(Array.isArray(obj[j])) {
                    if(j === 0) header[headeridx] += options.header[headeridx]+new Array(obj[j].length-1).fill('').join(','); //add empty spaces
                    lines[j] += obj[j].join(',') + ',';
                    headeridx+=obj[j].length;
                }
                else {
                    if(j === 0) header[headeridx] += options.header[headeridx]+',';
                    lines[j] += obj[j] + ',';
                    headeridx++;
                }
            }
        } else if (typeof obj === 'object'){
            let x;
            if(obj.x) {
               x = obj.x; 
            } else if (obj.timestamp) {
                x = obj.timestamp;
            }
            for(let j = 0; j < x.length; j++) {
                
                if(!lines[x[j]]) lines[x[j]] = x[j] + ',';
                if(obj.timestamp) {
                    lines[x[j]] += toISOLocal(obj.timestamp[j]) + ','; //add local timezone data
                } 

                for(const prop in obj) {
                    if(prop !== 'x') {
                        if(!lines[x[j]]) lines[x[j]] = '';
                
                        if(Array.isArray(obj[prop][j])) {
                            if(j === 0) header[headeridx] += options.header[headeridx]+Array(obj[prop][j].length-1).fill('').join(','); //add empty spaces
                            lines[x[j]] += obj[prop][j].join(',') + ',';
                            headeridx+=obj[prop][j].length;
                        }
                        else {
                            if(j === 0) header[headeridx] += options.header[headeridx]+',';
                            lines[x[j]] += obj[prop][j] + ',';
                            headeridx++;
                        }
                    }
                }
            }  
        }
    });

    header.splice(header.length-1,1); //remove last comma
    header += '\n';

    let joined = '';

    for(const prop in lines) {
        lines[prop].splice(lines[prop].length-1,1); //splice off the trailing comma
        joined +=  lines[prop] + '\n'; //add a newline
    }

    let result = {filename:options.filename,header:header,body:joined};

    if(options.save) {
        CSV.saveCSV(header+joined,options.filename);
    }

    if(options.write) {
        fs.exists(options.filename, (exists) => {
            if(exists) 
                appendFile(options.filename, joined, options.dir);
            else
                appendFile(options.filename, header+joined, options.dir);
        });
    }

    return result;
}