var co = require('co') 
const promisify = require("es6-promisify") 
var fs = require("fs") 
var path = require('path') 

var LogToS3 = (function () {
  var S3Config =  {
    "key": "AKIAJA2VVDRTFSGSPVBQ",
    "secret": "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",
    "bucket": "mohoterplog",
    //"destination": "/oplog",
    "encrypt": true,
    "region": "us-west-1"
  }
  var log = console.log
  function sendToS3(options, destination, directory, target, callback) {
    var knox = require('knox')
      , sourceFile = path.join(directory, target)
      , s3client
      //, destination = options.destination || '/'
      , headers = {} 

    callback = callback || function() { } 

    // Deleting destination because it's not an explicitly named knox option
    delete options.destination 
    s3client = knox.createClient(options) 

    if (options.encrypt)
      headers = {"x-amz-server-side-encryption": "AES256"}

    log('Attemping to upload ' + target + ' to the ' + options.bucket + ' s3 bucket') 
    s3client.putFile(sourceFile, path.join(destination, target), headers, function(err, res){
      if(err) {
        return callback(err) 
      }

      res.setEncoding('utf8') 

      res.on('data', function(chunk){
        if(res.statusCode !== 200) {
          log(chunk, 'error') 
        } else {
          log(chunk) 
        }
      }) 

      res.on('end', function(chunk) {
        if (res.statusCode !== 200) {
          return callback(new Error('Expected a 200 response from S3, got ' + res.statusCode)) 
        }
        log('Successfully uploaded to s3') 
        return callback() 
      }) 
    }) 
  }    

  var instance;
  function init() { 
    var objToCSV = function(jsonData) {
      //Flat Each Object
      var flatData = jsonData.map(function(rawData) {
        return JSON.parse(JSON.stringify(rawData))
        //return JSON.flatten(rawData)
      })
      //console.log(flatData) 
      //Obj to CSV
      var fields = Object.keys(flatData[0]) 
      //console.log(fields) 
      var csv = flatData.map(function(row){
        return fields.map(function(fieldName){
          return JSON.stringify(row[fieldName] || '') 
        }) 
      })  
      csv.unshift(fields)  // add header column
      return csv 
    } 
    var saveSTRToS3 = function(str,fileName,S3destination) {
      var tmpDir = path.join(__dirname, '../../erplog')
      fs.writeFileSync(path.join(tmpDir, fileName),str)
      sendToS3(S3Config,S3destination,tmpDir,fileName,function(err,resp){
        if (err) console.log(err)
      })
    }
    var saveCSVToS3 = function(csv,fileName,S3destination) {
      var tmpDir = path.join(__dirname, '../../erplog')
      var csvString = csv.join('\n')
      saveSTRToS3(csvString,fileName,S3destination)
      // fs.writeFileSync(path.join(tmpDir, fileName),csvString)
      // sendToS3(S3Config,S3destination,tmpDir,fileName,function(err,resp){
      //   if (err) console.log(err)
      // })
    }
    return {
      objToCSV:objToCSV,
      saveCSVToS3:saveCSVToS3,
      saveSTRToS3:saveSTRToS3
    }    
  }
  return {
    getInstance: function () {
      if ( !instance ) {
        instance = init();
      }
      return instance;
    }
  };  
})();

module.exports = LogToS3;  