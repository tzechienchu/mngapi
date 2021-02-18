
//var POSConst = require('../../common/models/constant.js') 

module.exports = function(app) {
  //return 
  var User = app.models.User
  var Role = app.models.Role
  var RoleMapping = app.models.RoleMapping
  
  User.create([
    {username: 'nanAdmin', 
     email: 'nanadmin@nan.com', 
     password: 'nan12345',
     type:"admin",
     status:1,
     createDTUTC:0
    },
  ], function(err, users) {
    if (err) {
      //console.log(err)
      console.log('Create Admin User Fail(Maybe already got one)')
      return
    }
    console.log('Created users:', users)

    //create the admin role
    Role.create({
      name: "admin"
    }, function(err, role) {
      if (err) throw err
      console.log('Created role:', role)
      role.principals.create({
        principalType: RoleMapping.USER,
        principalId: users[0].id
      }, function(err, principal) {
        if (err) throw err
        console.log('Created principal:', principal)
      })
    })
  })
}
