const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')

module.exports = function(supplier) { 
    supplier.createNewSupplier = NanUtil.getCreateFN(supplier)
    supplier.newSupplier = function(company,contact,types,phone1,phone2,address1,address2,note,createBy,cb) {
        co(function*() {
            var newData = {
                company,
                contact,
                types,
                phone1,
                phone2,
                address1,
                address2,
                note,
                createBy,
                state:1,
                createDTUTC:NanUtil.getUTCTime()
            }
            var resp1 = yield supplier.createNewSupplier(newData)
            cb(null,resp1)
            //After Process
            var glossary = supplier.app.models.glossary
            var newKeys = types.splite(',')
            var resp2 = yield newKeys.map(function(k) {
              return promisify(glossary.newOrUpdateTermWithUsage)(k,'SupplierType',undefined,createBy,"skip")
            })         
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    supplier.remoteMethod(
        'newSupplier',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'company', type: 'string', required: true, description:'comapny'},
            {arg: 'contact', type: 'string', required: true, description:'contact'},
            {arg: 'types', type: 'string', description:'print,flower'},
            {arg: 'phone1', type: 'string', description:'phone1'},		  
            {arg: 'phone2', type: 'string', description:'phone2'},
            {arg: 'address1', type: 'string', description:'address1'},
            {arg: 'address2', type: 'string', description:'address2'},
            {arg: 'note', type: 'string', description:'note'},            
            {arg: 'createBy', type: 'string', description:'createBy Id'}
           ],
          returns: {arg: 'response', type: 'object'},
          description:'New Supplier'
        }
    )
    supplier.updateSupplier = function(supplierId,company,contact,types,phone1,phone2,address1,address2,note,cb) {
        co(function*() {
            var supplierData = yield supplier.findById(supplierId)
            var updateData = {
                company,
                contact,
                types,
                phone1,
                phone2,
                address1,
                address2,
                note,
                modifyDTUTC:NanUtil.getUTCTime()
            }
            var resp1 = yield supplierData.updateAttributes(updateData)
            cb(null,resp1)
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }    
    supplier.remoteMethod(
        'updateSupplier',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'supplierId', type: 'string', required: true, description:'supplierId'},
            {arg: 'company', type: 'string', description:'comapny'},
            {arg: 'contact', type: 'string', description:'contact'},
            {arg: 'types', type: 'string', description:'print,flower'},
            {arg: 'phone1', type: 'string', description:'phone1'},		  
            {arg: 'phone2', type: 'string', description:'phone2'},
            {arg: 'address1', type: 'string', description:'address1'},
            {arg: 'address2', type: 'string', description:'address2'},
            {arg: 'note', type: 'string', description:'note'}
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Update Supplier'
        }
    )
    supplier.getAllSuppliers = NanUtil.getGetAllFN(supplier)
    supplier.remoteMethod(
      'getAllSuppliers',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'limit', type: 'string', description:'limit'},
          {arg: 'skip', type: 'string', description:'skip'},
          {arg: 'state', type: 'string', description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get All Supplier'
      }
    ) 
    supplier.deleteSupplier = function(supplierId,cb) {
      co(function*() {
        //Check In Purchase
        var resp = yield supplier.destroyById(supplierId)
        cb(null,resp);
      })
      .catch(function(err){
          cb(null,{err:err});
      })
    }
    supplier.remoteMethod(
      'deleteSupplier',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'supplierId', type: 'string', required: true, description:'supplierId'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Delete Supplier'
      }
    )    
    supplier.updateSupplierState = NanUtil.getUpdateStateFN(supplier) 
    supplier.remoteMethod(
      'updateSupplierState',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'supplierId', type: 'string', required: true, description:'supplierId'},
          {arg: 'state', type: 'number', required: true, description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get All Supplier'
      }
    )
    supplier.getAllSupplierForUI = function(cb) {
      co(function*() {
        const cache = artist.app.models.cache
        const CKEY = "SupplierUI"
        const cacheData = yield cache.get(CKEY)
        if (NanUtil.emptyObject(cacheData)) {
          var query = {
            fields:{
              company:true,
              types:true,
              contact:true,
              id:true
            }
          }
          const allData = yield supplier.find(query)
          var nameDict = {}
          allData.map(function(d){
            if (nameDict[d.company] === undefined) {
              nameDict[d.company] = d
            }
          })
          var dict = {nameDict}
          const newCacheData = JSON.parse(JSON.stringify(dict))
          var resp = yield cache.set(CKEY,newCacheData,APIConst.TTL.HOUR_8) 
          cb(null,dict)
        } else {
           console.log('cache')
           cb(null,cacheData)
         }
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
    supplier.remoteMethod(
      'getAllSupplierForUI',
      {
        http: {verb: 'post'} ,
        accepts: [
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get All Supplier for UI'
      }
    )              
}