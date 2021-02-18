const co = require('co') 
const promisify = require("es6-promisify")

module.exports = function(app) {
    var systemKV = app.models.systemKV  
    var glossary = app.models.glossary  
    var buildBasicCache = function(cb) {
        co(function*() {
          var resp1 = yield promisify(systemKV.buidlDefault)()
          console.log(resp1)
          var resp1 = yield promisify(glossary.buidlDefault)()
          console.log(resp1)
          var resp1 = yield promisify(glossary.getUIUsage)()
          console.log(resp1)
          cb(null,resp1);
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    buildBasicCache(function(err,resp){
        if (err) {
            console.log(err)
        } else {
            console.log(resp)
        }
    })  
  }