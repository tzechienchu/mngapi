const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')

module.exports = function(expense) {
    expense.createNewExpense = NanUtil.getCreateFN(expense) 
    expense.newExpense = function(type,supplierId,artistNo,exhibitionNo,items,deliveryDate,total,
        note,createBy,cb) {
        co(function*() {
            var newData = {
                type,
                supplierId,
                artistNo,
                exhibitionNo,
                items,
                deliveryDate,
                total,
                note,
                state:1,
                createBy,
                createDTUTC:NanUtil.getUTCTime()
            }
            var resp1 = yield expense.createNewExpense(newData)
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    expense.remoteMethod(
        'newExpense',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'type', type: 'string', required: true, description:'type'},
            {arg: 'supplierId', type: 'string', description:'supplierId'},
            {arg: 'artistNo', type: 'string', description:'artistNo'},		  
            {arg: 'exhibitionNo', type: 'string', description:'exhibitionNo'},
            {arg: 'items', type: 'string', description:'[item,price,descrioption]'},
            {arg: 'deliveryDate', type: 'string', description:'2020-01-01'},
            {arg: 'total', type: 'number', description:'total'},
            {arg: 'note', type: 'string', description:'note'},            
            {arg: 'createBy', type: 'string', description:'createBy Id'}
           ],
          returns: {arg: 'response', type: 'object'},
          description:'New Expense'
        }
    )  
    expense.updateExpense = function(expenseId,type,supplierId,artistNo,exhibitionNo,items,deliveryDate,total,
        note,cb) {
        co(function*() {
            var expenseData = yield expense.findById(expenseId)
            var updateData = {
                type,
                supplierId,
                artistNo,
                exhibitionNo,
                items,
                deliveryDate,
                total,
                note,
                modifyDTUTC:NanUtil.getUTCTime()
            }
            var resp1 = yield expenseData.updateAttributes(updateData)
            cb(null,resp1)
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    expense.remoteMethod(
        'updateExpense',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'expenseId', type: 'string', required: true, description:'expenseId'},
            {arg: 'type', type: 'string', required: true, description:'type'},
            {arg: 'supplierId', type: 'string', description:'supplierId'},
            {arg: 'artistNo', type: 'string', description:'artistNo'},		  
            {arg: 'exhibitionNo', type: 'string', description:'exhibitionNo'},
            {arg: 'items', type: 'string', description:'[item,price,descrioption]'},
            {arg: 'deliveryDate', type: 'string', description:'2020-01-01'},
            {arg: 'total', type: 'number', description:'total'},
            {arg: 'note', type: 'string', description:'note'},                     
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Update Expense'
        }
    )
    expense.getAllExpenses = NanUtil.getGetAllFN(expense)
    expense.remoteMethod(
      'getAllExpenses',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'limit', type: 'string', description:'limit'},
          {arg: 'skip', type: 'string', description:'skip'},
          {arg: 'state', type: 'string', description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get All Expense'
      }
    ) 
    expense.deleteExpense = function(expenseId,cb) {
      co(function*() {
        //Check In Purchase
        var resp = yield expense.destroyById(expenseId)
        cb(null,resp);
      })
      .catch(function(err){
          cb(null,{err:err});
      })
    }
    expense.remoteMethod(
      'deleteExpense',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'expenseId', type: 'string', required: true, description:'collectorId'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Delete Expense'
      }
    )         
    expense.updateExpenseState = NanUtil.getUpdateStateFN(expense) 
    expense.remoteMethod(
      'updateExpenseState',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'expenseId', type: 'string', required: true, description:'collectorId'},
          {arg: 'state', type: 'number', required: true, description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Expense Id'
      }
    )          
} 