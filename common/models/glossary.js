const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')
const APIConst = require('./apiConst.js')

module.exports = function(glossary) {
    var getModel = function(table) {
      return glossary.app.models[table]
    } 
    glossary.createNewGlossary = NanUtil.getCreateFN(glossary)
    glossary.defaultTermOfUsage = [
      ["Material","油畫"],
      ["Material","水彩"],
      ["Material","雕刻"],
    ]
    glossary.buidlDefault = function(cb) {
      co(function*() {
        var resp = yield glossary.defaultTermOfUsage.map(function(d){
          return promisify(glossary.newOrUpdateTermWithUsage)(d[1],d[0],100,"System","skip")
        })
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }    
    glossary.getUIUsage = function(cb) {
      co(function*() {
        const systemKV = glossary.app.models.systemKV
        var UIUsages = yield systemKV.getV("SYSTEMUI")
        UIUsages = NanUtil.parseKV(UIUsages) 
        var resp = yield UIUsages.value.map(function(usage){
          console.log(usage)
          return {usage:usage,terms:promisify(glossary.findTermsWithUsage)(usage)}
        })
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    } 
    glossary.remoteMethod(
      'getUIUsage',
      {
        http: {verb: 'post'},
        accepts: [
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get Glossary In Usage Category'
      }
    )      
    glossary.findTermWithUsage = promisify(function(term,usage,cb) {
      co(function*() {
        var query = {
          where:{
            term,
            usage
          }
        }
        var existTerm = yield glossary.findOne(query)        
        cb(null,existTerm);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    })
    glossary.findTermsWithUsage = function(usage,cb) {
      co(function*() {
        const cache = getModel('cache')
        const cacheData = yield cache.get(usage)
        if (NanUtil.emptyObject(cacheData)) {
          console.log('db')
          var query = {
            where:{
              usage
            }
          }
          var usageTerms = yield glossary.find(query)
          cb(null,usageTerms);
          const newCacheData = JSON.parse(JSON.stringify(usageTerms))
          var resp = yield cache.set(usage,newCacheData,APIConst.TTL.HOUR_8) 
        } else {
          console.log('cache')
          cb(null,cacheData)
        }
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
    glossary.remoteMethod(
      'findTermsWithUsage',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'usage', type: 'string', required: true, description:'usage'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get Glossary In Usage Category'
      }
    )       
    glossary.newOrUpdateTermWithUsage = function(term,usage,priority=100,createBy,mode="skip",cb) {
      co(function*() {
        if (usage === undefined) return cb(null,{})
        if (term === undefined) return cb(null,{})
        var existTerm = yield glossary.findTermWithUsage(term,usage)
        if (NanUtil.emptyObject(existTerm)) {
          var newData = {
            term,
            usage,
            priority,
            termTran:[],
            createBy,
            createDTUTC:NanUtil.getUTCTime()
          }
          var resp = yield glossary.createNewGlossary(newData)
          cb(null,resp);
        } else {
          if (mode === "update") {
            var updateData = {
              priority,
              termTran:[],
              modifyDTUTC:NanUtil.getUTCTime()
            }            
            var resp = yield existTerm.updateAttributes(updateData)
            cb(null,resp);
          } else {
            cb(null,existTerm)
          }
        }
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
    glossary.remoteMethod(
      'newOrUpdateTermWithUsage',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'term', type: 'string', required: true, description:'term'},
          {arg: 'usage', type: 'string', required: true, description:'usage'},
          {arg: 'priority', type: 'number', description:'priprity'},
          {arg: 'createBy', type: 'string', description:'createBy Id'},
          {arg: 'mode', type: 'string', description:'update | skip'}
         ],
        returns: {arg: 'response', type: 'object'},
        description:'New Glossary In Usage'
      }
    )  
    glossary.deleteTermWithUsage = function(term,usage,cb) {
      co(function*() {
        var existTerm = yield glossary.findTermWithUsage(term,usage)
        var resp = yield glossary.destroyById(existTerm.id)
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }   
    glossary.remoteMethod(
      'deleteTermWithUsage',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'term', type: 'string', required: true, description:'term'},
          {arg: 'usage', type: 'string', required: true, description:'usage'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Delete Glossary In Usage'
      }
    )     
}