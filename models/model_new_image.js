var mongoose=require("mongoose");
var Schema=mongoose.Schema;

var imagen=new Schema({comentario: String,
                       respuestas:[],
                       grupo: String,
                       nombre: String,
                       extension: String});

var Imagen=mongoose.model("Imagen", imagen);

module.exports=Imagen;
