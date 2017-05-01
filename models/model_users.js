var mongoose=require("mongoose");
var Schema=mongoose.Schema;

var user=new Schema({correo: String,
                     nombre: String,
                     contraseña: String,
                     descripcion: String,
                     facebook: String,
                     instagram: String,
                     extension: String,
                     grupos:[],
                     notificaciones:[]
                   });

var User=mongoose.model("User", user);

module.exports=User;
