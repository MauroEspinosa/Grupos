var mongoose=require("mongoose");
var Schema=mongoose.Schema;

//mongoose.connect("mongodb://localhost/grupos");

mongoose.connect("mongodb://grupos:1234@ds127801.mlab.com:27801/heroku_ph61txgp");

var nuevo_grupo=new Schema({grupo: String,
                           materia: String,
                           profesor: String,
                           miembros: [{type:Schema.Types.ObjectId, ref: "User"}]});

var Grupo=mongoose.model("Grupo", nuevo_grupo);

module.exports=Grupo;
