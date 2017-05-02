var express=require("express");
var http=require("http");
var app=express();
var server=http.createServer(app);
var io=require("socket.io")(server);
var Grupo=require("./models/model_new_group");
var Imagen=require("./models/model_new_image");
var bodyParser=require("body-parser");
var formidable=require("express-formidable");
var cookieSession=require("cookie-session");
var User=require("./models/model_users");
var fs=require("fs");
var path = require ('path');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(formidable.parse({keepExtensions:true}));
app.use(cookieSession({
  name:"session",
  keys:["key1","key2"]
}));
app.set('views', path.join(process.cwd() +'/views'));
app.use(express.static(path.join(process.cwd() + '/public')));
app.set("view engine", "ejs");


io.on("connection",function(socket){
  console.log("Usuario conectado");
  socket.on("subscribe",function(data){
    User.findOne({_id:data.id},function(err,doc){
      if(doc.grupos.indexOf(data.grupo)!=-1){
        socket.emit("suscrito")
      }
      if(doc.grupos.indexOf(data.grupo)==-1){
        console.log(doc.grupos);
        doc.grupos.push(data.grupo);
        doc.save(function(err){
          //socket.emit("guardado",doc);
          Grupo.findOne({grupo:data.grupo},function(err, info){
            info.miembros.push(doc._id);
            info.save(function(err){
              socket.emit("guardado",doc);
              console.log(info);
            });
          });
        });
      }
    });
  });

  socket.on("comentario",function(res){
    Imagen.findOne({_id:res.publicacion},function(err,pub){
      pub.respuestas.push(res.respuesta);
      pub.save(function(err){
        console.log(pub);
      });
    });
  });
});


app.get("/signup",function(req,res){
  res.render("signup");
});

app.post("/registrar",function(req,res){
  User.findOne({correo:req.body.correo},function(err,user){
    if(user){
      res.send("Este usuario ya existe");
    }
    if(err){
      res.send("Hubo algun error. Intentalo de nuevo");
    }
    if(!user){
      var usuario=new User({correo:req.body.correo,
                            nombre:req.body.nombre,
                            contraseña:req.body.contraseña
                          });
      usuario.save(function(err,doc){
        req.session.user=doc._id;
        console.log(usuario);
        res.redirect("/");
      });
    }
  });
});

app.post("/iniciar",function(req,res){
  User.findOne({correo:req.body.correo,contraseña:req.body.contraseña},function(err,user){
    if(user){
      req.session.user=user._id;
      //console.log(req.session.user);
      res.redirect("/");
    }
    if(!user){
      res.send("Aun no estas registrado");
    }
  });
});

app.get("/", function(req, res){

  res.render("home");
})

app.get("/descargar/:id", function(req,res){
  Imagen.findById({_id: req.params.id}, function(err, doc){
    console.log(doc);
    res.download(__dirname+"/public/imagenes/"+req.params.id+"."+doc.extension, doc.nombre);
  });
});

app.get("/nuevo-grupo",function(req,res){
  res.render("nuevo_grupo");
});

app.post("/buscar", function(req,res){
  Grupo.find({grupo: req.body.busqueda}, function(err,doc){
    if(doc.length<=0){
      res.send("El grupo que buscas aun no ha sido creado o lo tecleaste mal... <a href='/nuevo-grupo'>Crearlo ahora</a>");
    }
    else{
      res.redirect("/grupos/"+req.body.busqueda);
    }
  });
});

/*
app.get("/grupos/:grupo", function(req,res){
  Grupo.findOne({grupo: req.params.grupo}, function(err, info){
    Imagen.find({grupo: req.params.grupo}, function(fail, imagenes){
      if(req.session.user){
        res.locals.user=req.session.user;
        res.render("single", {info:info, imagenes:imagenes});
      }
      if(!req.session.user){
        res.render("single", {info:info, imagenes:imagenes});
      }
       console.log(info);
       console.log(imagenes);
    });
  });
});
*/

app.get("/grupos/:grupo", function(req,res){
  Grupo.findOne({grupo:req.params.grupo}).populate("miembros").exec(function(err,info){
    Imagen.find({grupo: req.params.grupo}, function(fail, imagenes){
      if(req.session.user){
        res.locals.user=req.session.user;
        User.findById({_id:req.session.user},function(err,doc){
          if(doc.grupos.indexOf(req.params.grupo)!=-1){
            res.render("single", {info:info, imagenes:imagenes, suscrito:true});
          }
          if(doc.grupos.indexOf(req.params.grupo)==-1){
            res.render("single", {info:info, imagenes:imagenes, suscrito:false});
          }
        });
      }
      if(!req.session.user){
        res.redirect("/signup");
      }
      console.log(info);
    });
  });
});

app.get("/grupos/:grupo/:publicacion",function(req,res){
  Grupo.findOne({grupo:req.params.grupo}).populate("miembros").exec(function(err,info){
    Imagen.find({_id:req.params.publicacion},function(err,imagenes){
      if(req.session.user){
        res.locals.user=req.session.user;
        User.findOne({_id:req.session.user},function(err,doc){
          if(doc.grupos.indexOf(req.params.grupo)!=-1){
            res.render("single",{imagenes:imagenes, info:info, suscrito:true});
          }
          if(doc.grupos.indexOf(req.params.grupo)==-1){
            res.render("single",{imagenes:imagenes, info:info, suscrito:false});
          }
        });
      }
      if(!req.session.user){
        res.redirect("/signup");
      }
    });
  });
});

app.post("/crear", function(req,res){
  Grupo.find({grupo: req.body.grupo}, function(err,doc){
    if(doc.length>=1){
      res.send("Este grupo ya existe. <a href='/'>Buscar grupo</a>");
    }
    else{
      var grupo= new Grupo({grupo: req.body.grupo,
                           materia: req.body.materia,
                           profesor: req.body.profesor});
      grupo.save(function(err,doc){
        console.log(doc);
        res.redirect("/grupos/"+grupo.grupo);
      });
    }
  });
});

app.post("/grupos/:grupo/nuevo-post", function(req,res){
  var extension=req.body.archivo.name.split(".").pop();
  var nombre=req.body.archivo.name;
  var imagen=new Imagen({grupo:req.params.grupo,
                         comentario: req.body.titulo,
                         nombre: nombre,
                         extension:extension});
  imagen.save(function(err){
    User.find({grupos:imagen.grupo},function(err,doc){
      console.log(doc);
      for(i=0;i<doc.length;i++){
        var date=Date.now();
        if(doc[i].notificaciones.length>7){
          doc[i].notificaciones.shift();
        }
        doc[i].notificaciones.push({info:"Nueva publicacion",grupo:imagen.grupo,id:imagen.id});
        doc[i].save(function(err){
          //console.log(doc[i]);
        });
      }
    });
    if(imagen.extension!=""){
      fs.rename(req.body.archivo.path, "public/imagenes/"+imagen._id+"."+extension);
    }
    res.redirect("/grupos/"+req.params.grupo);
  });
});

app.get("/perfil",function(req,res){
  if(!req.session.user){
    res.redirect("/signup");
  }
  if(req.session.user){
    res.redirect("/perfil/"+req.session.user);
  }
});

app.get("/perfil/:id",function(req,res){
  if(req.session.user==req.params.id){
    User.findOne({_id:req.params.id},function(err,doc){
      res.render("perfil",{doc:doc});
    });
  }
  if(req.session.user!=req.params.id){
    User.findOne({_id:req.params.id},function(err,doc){
      res.render("visit_perfil",{doc:doc});
    });
  }
});

app.post("/actualizar_foto",function(req,res){
  User.findOne({_id:req.session.user},function(err,doc){
    doc.extension=req.body.foto.name.split(".").pop();
    doc.save(function(err){
      fs.rename(req.body.foto.path, "public/imagenes/"+doc._id+"."+doc.extension);
      res.redirect("/perfil");
    });
  });
});

app.get("/unsuscribe", function(req,res){
  User.findOne({_id:req.session.user},function(err,usuario){
    var posicion=usuario.grupos.indexOf(req.query.grupo);
    usuario.grupos.splice(posicion,1);
    usuario.save(function(err){
      Grupo.findOne({grupo:req.query.grupo},function(err,grupo){
        var position=grupo.miembros.indexOf(req.session.user);
        grupo.miembros.splice(position,1);
        grupo.save(function(err){
          res.redirect("/perfil");
        });
      });
    });
  });
});

app.get("/actualizar_info",function(req,res){
  User.findOne({_id:req.session.user},function(err,usuario){
    usuario.descripcion=req.query.descripcion;
    usuario.nombre=req.query.nombre;
    usuario.facebook=req.query.facebook;
    usuario.instagram=req.query.instagram;
    usuario.save(function(err){
      console.log(usuario);
      res.redirect("/perfil");
    });
  });
});

app.get("/eliminar",function(req,res){
  User.remove({},function(err){
    res.redirect("/");
  });
});

server.listen(process.env.PORT || 8080, function(){
  console.log("Coneccion lista");
});
