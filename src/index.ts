import * as csv from "fast-csv";
import * as express from "express";
import * as fs from "fs";
var data_arr;
var data_temp;
var app = express();
app.get('/:file/:methods',(req,res,next)=>{
    process(req.params.file,res,req.params.methods);
});
app.get('/:file/output',(req,res,next)=>{
    let file = "./data/file_"+req.params.file+".csv";
    process(file,res,output);
});

app.listen(3000, function () {
    console.log(`Express Listening on 3000 ! `)
  });


let process = (file,res,param?:any)=>{
    let filepath = "./data/file_"+file+".csv";    
    data_arr = new Array();
    data_temp = new Array();
    csv.fromPath(filepath)
    .on("data",(data) => {
        let val = data[0].split(";");
        let last_col = val.length-1;
        let temp = new Array();
        let i = 0;
        for (let dt of val){
            let arr_data = parseFloat(dt);
            if(i==last_col){
                data_temp.push(dt);
            }
            else{
                temp.push(arr_data);            
            }
            i++;
        }
        data_arr.push(temp);
    })
    .on("end",() => {
        let result = {};
        result['minmax'] = minmax(data_arr);
        result['zscore'] = zscore(data_arr);
        result['decimal_scaling'] =decimalScaling(data_arr);
        result['sigmoidal'] = sigmoidal(data_arr);
        result['softmax'] = softmax(data_arr);        
        result = reJoin(result);
        
        if(param != "output"){
            res.send(JSON.stringify(result[param],null,2));            
        }
        else{
            let outputFile = "./output/file_" + file;            
            output(outputFile,result,res);
        }

    });
}

let output = (file,data,res)=>{
    
        for(let key in data){
            let data_arr = data[key];
            let methods = key;
    
            var csvStream = csv.createWriteStream({ headers: true }),
            writableStream = fs.createWriteStream(file+"_"+methods+".csv");
        
            writableStream.on("finish", function () {
                console.log("DONE!");
            });
            csvStream.pipe(writableStream);
    
            let dt_row = data_arr.length;
            for(let i=0;i<dt_row;i++){
                csvStream.write(data_arr[i]);
            }
            csvStream.end();
        }
    
        res.send({"status":"OK"}); 
        
    }

let reJoin = (res:any)=>{
    for(let key in res){
        let data_arr = res[key];
        let dt_row = data_arr.length;

        for(let i =0;i<dt_row;i++){
            data_arr[i].push(data_temp[i]);
        }
        res[key] = data_arr;
    }
    return res;
}

let softmax = (data:any) => {
    let dt_col = data[0].length;
    let dt_row = data.length;
    // newdata = 1/1(1+e^(-transfdata))

    // transfdata = (data-mean)/(x* (std/2*3.14))
    // x = respon linier di devias standar

    let mean = new Array();
    for(let i = 0;i<dt_col;i++){
        let temp = 0;
        for(let j=0;j<dt_row;j++){
            temp += data[j][i];
        }
        mean[i] = temp/dt_row;
    }
    let std = findStd(mean,data);

    let ndata_arr = new Array();    
    for(let i=0;i<dt_row;i++){
        let e = 2.718281828;        
        let temp_arr = new Array();
        for(let j=0;j<dt_col;j++){
            // newdata = (1-e^(-x))/(1+e^(-x))
            let transfdata = (data[i][j]-mean[j]) / (5*(std[j]/(2*3.14)));            
            let n_data = 1 / (1 + Math.pow(e,-1*transfdata));
            n_data = +n_data.toFixed(2);            
            temp_arr.push(n_data);
        }
        ndata_arr.push(temp_arr);
    }
    return ndata_arr;

}

let sigmoidal = (data:any)=>{
    let dt_col = data[0].length;
    let dt_row = data.length;
    // range -1 - 1
    // newdata = (1-e^(-x))/(1+e^(-x))
    // e = 2,718281828
    // x = (data-mean) / std

    let mean = new Array();
    for(let i = 0;i<dt_col;i++){
        let temp = 0;
        for(let j=0;j<dt_row;j++){
            temp += data[j][i];
        }
        mean[i] = temp/dt_row;
    }

    let std = findStd(mean,data);
    let xdata_arr = new Array();
    for(let i=0;i<dt_row;i++){
        let temp_arr = new Array();
        for(let j=0;j<dt_col;j++){
            let n_data = (data[i][j]-mean[j]) / std[j];
            temp_arr.push(n_data);
        }
        xdata_arr.push(temp_arr);
    }

    let ndata_arr = new Array();    
    for(let i=0;i<dt_row;i++){
        let e = 2.718281828;
        let temp_arr = new Array();
        for(let j=0;j<dt_col;j++){
            // newdata = (1-e^(-x))/(1+e^(-x))
            // x = (data-mean)/std
            let n_data = (1-Math.pow(e,-1*xdata_arr[i][j])) / (1+Math.pow(e,-1*xdata_arr[i][j]));
            n_data = +n_data.toFixed(2);            
            temp_arr.push(n_data);
        }
        ndata_arr.push(temp_arr);
    }
    return ndata_arr;
    
}

let decimalScaling = (data:any) => {
    // newdata digeser menjadi 0,xx

    let dt_col = data[0].length;
    let dt_row = data.length;
    let max = new Array();
    let min = new Array();

    for(let i = 0;i < dt_col;i++){
        max[i] = findMax(i,dt_row,data);
    } 

    let ndata_arr = new Array(); 
    for(let i = 0;i<dt_row;i++){
        let temp_arr = new Array();
        for(let j=0;j<dt_col;j++){
            //newdata = data/10^i
            let n_data = data[i][j]/ Math.pow(10,findDecimal(max[j]));
            n_data = +n_data.toFixed(2);            
            temp_arr.push(n_data);
        }
        ndata_arr.push(temp_arr);
    }
    return ndata_arr;
    
}

let zscore = (data:any)=>{
    let dt_col = data[0].length;
    let dt_row = data.length;

    let mean = new Array();
    
    for(let i = 0;i<dt_col;i++){
        let temp = 0;
        for(let j=0;j<dt_row;j++){
            temp += data[j][i];
        }
        mean[i] = temp/dt_row;
    }

    let std = findStd(mean,data);
    let ndata_arr = new Array();
    for(let i=0;i<dt_row;i++){
        let temp_arr = new Array();
        for(let j=0;j<dt_col;j++){
            let n_data = (data[i][j]-mean[j]) / std[j];
            n_data = +n_data.toFixed(2);            
            temp_arr.push(n_data);
        }
        ndata_arr.push(temp_arr);
    }
    return ndata_arr;
    
}

let minmax = (data:any)=>{
    let dt_col = data[0].length;
    let dt_row = data.length;
    const newmax = 1;
    const newmin = 0;
    let max = new Array();
    let min = new Array();

    for(let i = 0;i < dt_col;i++){
        max[i] = findMax(i,dt_row,data);
        min[i] = findMin(i,dt_row,data);
    }     

    // newdata = (data-min) * (newmax-newmin) / (max-min) + newmin

    let ndata_arr = new Array();
    for(let i=0;i<dt_row;i++){
        let temp_arr = new Array();
        for(let j=0;j<dt_col;j++){
            let n_data = (data[i][j] - min[j]) * (newmax-newmin) / ((max[j]-min[j]) + newmin );
            n_data = +n_data.toFixed(2);
            temp_arr.push(n_data);
        }
        ndata_arr.push(temp_arr);
    }
    return ndata_arr;
    
}

let findDecimal = (num:number) :number=>{
    let count=0;
    while(true){
        num = num/10;
        count++;
        if(num == 1 || num <1){
            break;
        }
    }
    return count;
}

let findStd = (mean,data) :any=>{
    // rumus = squareroot((xi - mean)^2/jmldata-1)
    let dt_col = data[0].length;
    let dt_row = data.length;
    let std = new Array();
    for(let i=0;i<dt_col;i++){
        let res = 0;
        for(let j=0;j<dt_row;j++){
            res += Math.pow(data[j][i]-mean[i],2);    
        }       
        std[i] = Math.sqrt(res/((dt_row)-1));
    }
    return std;
}

let findMax = (col:number,row:number,data:any) :number=>{
    let res = 0;
    
    for(let i = 0; i < row; i++){
        if (res < data[i][col]){
            res = data[i][col];
        }
    }
    return res;
    
}

let findMin = (col:number,row:number,data:any) :number=>{
    let res = data[0][col];
    for(let i = 0; i < row; i++){
        if (res > data[i][col]){
            res = data[i][col];
        }
    }
    return res;
    
}

