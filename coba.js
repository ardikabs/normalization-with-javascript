var csv = require("fast-csv");
var fs = require("fs");
var csvStream = csv.createWriteStream({ headers: true }),
    writableStream = fs.createWriteStream("my.csv");

writableStream.on("finish", function () {
    console.log("DONE!");
});

csvStream.pipe(writableStream);
csvStream.write([1,2,3,4,5]);
csvStream.write([1,2,3,4,5]);
csvStream.write([1,2,3,5]);
csvStream.end();