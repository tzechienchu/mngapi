const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')
const APIConst = require('./apiConst.js')

module.exports = function(systemKV) {
    var getModel = function(table) {
      return systemKV.app.models[table]
    } 
    systemKV.createNewKV = NanUtil.getCreateFN(systemKV)    
    systemKV.DefaultKeys = {
        "SYSTEMUI":NanUtil.makeKV("SYSTEMUI",
                 ["WorkTitle","Material","Style","ArtistName"],
                 "array")
    }
    systemKV.buidlDefault = function(cb) {
        co(function*() {
          var keys = Object.keys(systemKV.DefaultKeys)        
          var respC = yield keys.map(function(d){
            var kvData = systemKV.DefaultKeys[d]
            //console.log(kvData)
            return promisify(systemKV.newOrUpdateKV)(kvData.key,kvData.value,kvData.type,"update")
          })
          cb(null,respC);
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    systemKV.getV = promisify(function(key,cb) {
        co(function*() {
          const query = {
              where:{
                  key
              }
          }
          var kvData = yield systemKV.findOne(query)
          cb(null,kvData);
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    })
    systemKV.getVbyK = promisify(function(key,cb) {
        co(function*() {
            var kvData = yield systemKV.getV(key)
            cb(null,kvData);
          })
          .catch(function(err){
            cb(null,{err:err});
          })
    })    
    systemKV.remoteMethod(
        'getVbyK',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'key', type: 'string', required: true, description:'key'},  
        ],
          returns: {arg: 'response', type: 'object'},
          description:'Get Value By Key'
        }
    )
    systemKV.getAllKV = promisify(function(cb) {
      co(function*() {
        var allKV = yield systemKV.find({})
        cb(null,allKV);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    })           
    systemKV.newOrUpdateKV = function(key,value,type,mode="skip",cb) {
        co(function*() {
          var existKV = yield systemKV.getV(key)
          if (NanUtil.emptyObject(existKV)) {
            var newData = {
              key,
              value,
              type,
              createDTUTC:NanUtil.getUTCTime()
            }
            var resp = yield systemKV.createNewKV(newData)
            cb(null,resp);
          } else {
            if (mode === 'update') {
              var resp = yield existKV.updateAttributes({
                value,
                type,                  
                modifyDTUTC:NanUtil.getUTCTime()
              })
              cb(null,resp) 
            } else {
              cb(null,existKV) 
            }
          }
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    systemKV.remoteMethod(
        'newOrUpdateKV',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'key', type: 'string', required: true, description:'key'},
            {arg: 'value', type: 'string', required: true, description:'value'},
            {arg: 'type', type: 'string', required: true, description:'int,float,obj'},
            {arg: 'mode', type: 'string', required: true, description:'update | skip'},   
        ],
          returns: {arg: 'response', type: 'object'},
          description:'New Key Value'
        }
    )  
    systemKV.deleteKV = function(key,cb) {
        co(function*() {
          var existKV = yield systemKV.getV(key)
          if (NanUtil.emptyObject(existKV)) {
            cb(null,{});
          } else {
            var resp = yield systemKV.destroyById(existKV.id)
            cb(null,resp)
          }
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }     
    systemKV.remoteMethod(
        'deleteKV',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'key', type: 'string', required: true, description:'key'},
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Delete Key Value'
        }
    )        
}