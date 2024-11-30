const pool = require('../database/connect_mongo.js')
const axios = require('axios');
const multer = require('multer');
const AWS = require('aws-sdk');
const mime = require('mime-types');
const CryptoJS = require("crypto-js");
const moment = require('moment-timezone');
const { ObjectId } = require('mongodb');

// Configuración de S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Configuración de multer - reproducir videos
const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // Límite de 100MB
  fileFilter: (req, file, cb) => {
    const mimeType = mime.lookup(file.originalname);
    if (mimeType && mimeType.startsWith('video/')) {
      cb(null, true);
    } else {      
      cb(new Error('Cuidado! Solo se permiten archivos de video'));
    }
  },
});


//--------------- Login validacion de usuario ---------------------  Terminado, por validar
const Login = async (req, res) => {
  const datos = req.body;
  //console.log("LOGIN: ", datos);
  const hashedPassword = CryptoJS.SHA256(datos.password, process.env.CODE_SECRET_DATA).toString();
  console.log("PASSS: ", hashedPassword);
  try{
    const users =  await pool.db('Parcial2').collection('users').find().toArray()
    console.log("USERS: ", users);
    const login =  await pool.db('Parcial2').collection('users').findOne({ user: datos.correo, password: hashedPassword });
    if (login) {
      // Obtener la fecha y hora actual en formato Bogotá
      const currentDateTime = moment().tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
      // Almacenar en la colección log_login
      await pool.db('Parcial2').collection('log_login').insertOne({ user: datos.correo, rol: login.rol, fecha: currentDateTime });
      res.json({ status: "Bienvenido", id: login._id, user: login.user, rol: login.rol});
    } else {
      res.json({ status: "Error en las credenciales" });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//------- metodo buscar información de ultimos inicio de sesion --------- , TERMINADO, validado
const InfoRegistroLogin = async (req, res) => {
  const datos = req.body;
  try {

    const DatosLogUsers = await pool.db('Parcial2').collection('log_login').find({user: datos.user}).sort({_id:-1}).limit(1).toArray();
    if (!Object.keys(DatosLogUsers).length == 0 ) {
      res.json( DatosLogUsers );

    }else{
      console.log('No hay datos registrados para el usuario.');
      res.json({ status: "No hay datos registrados para el usuario." });
    }

  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//------------- metodo  para registrar usuarios --------------------- TERMINDO, validado
const NewUser = async (req, res) => {

  const datos = req.body;
  console.log("DATOS enviados: ", datos);

  const PasswordEncrypt = CryptoJS.SHA256(datos.password, process.env.CODE_SECRET_DATA).toString();
  //console.log("PASS Encryp: ", PasswordEncrypt);
  const Role = "User";
  
  try{ 

    //valido que los datos envidos no existan en la BD
    const ValidaUser = await pool.db('Parcial2').collection('users').findOne({user: datos.correo, rol: Role });
    if(!ValidaUser){

      // Registro el user
      const registroUser =  await pool.db('Parcial2').collection('users').insertOne({user: datos.correo, password: PasswordEncrypt, rol: Role });
      console.log("se creo el usuario exitosamente: ");

      if (registroUser.acknowledged) {
        //console.log("status: Registro de usuario exitoso.")
        //Consulto el id del usuario ya creado
        const DatosUser = await pool.db('Parcial2').collection('users').findOne({user: datos.correo, password: PasswordEncrypt });
        if (DatosUser) {
          //console.log("DATOS DEL USUARIO: ", DatosUser)
          // Regsitro los datos del usuario en user_info
          const IDUSER = DatosUser._id;
          const registroUserInfo =  await pool.db('Parcial2').collection('user_info').insertOne({user_id: IDUSER, nombre: datos.nombre, fecha_nacimiento: datos.fechaN, cedula: datos.cedula, celular: datos.celular, ciudad: datos.ciudad});
          if (registroUserInfo.acknowledged) {
            console.log("se Guardo la info del usuario exitosamente: ");
            res.json({ status: "Se creo el usuario exitosamente." });
            //res.send("Se creo el usuario exitosamente.");
          }
          else{
            console.log("No se Guardo la info del usuario: ");
            res.send("Ha ocurrido un error, no se guardo la información.");
          }

        }else{
          res.send("Usuario no existe!");
          console.log("No existe el usuario ingresado")
        }
      
      } else {
        res.json({ status: "Error Creando Registro" });
        console.log("status: Error Creando Registro")
      }

    }else{
      res.json({ status: "El usuario ya existe en el sistema, por favor ingresa un correo diferente."});
      console.log("El usuario ya existe en el sistema:");
    }

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "Ha ocurrido un error con la BD." });
  }
};


// ------------ metodo guardar archivos

// Ruta para subir video
const UploadVideo = async (req, res) => {
  const file = req.file;
  const FechaActual = moment().tz('America/Bogota').format('YYYY-MM-DD');
  const { nombrevideo, user, iduser } = req.body;
  console.log("Archivo que llego: ", file, nombrevideo, iduser, FechaActual);

  if (!file) return res.status(400).json({ message: 'No se subió ningún archivo.' });
  if (!nombrevideo || !user || !iduser) {
    return res.status(400).json({ message: 'Faltan el nombre del video' });
  }

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `videos/${Date.now()}-${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const s3Result = await s3.upload(uploadParams).promise();
    const videoURL = s3Result.Location;

    // Guardar la URL en MongoDB
    const userObjectId = new ObjectId(iduser);
    const result = await pool.db('Parcial2').collection('videos').insertOne({ NombreVideo: nombrevideo, Url: videoURL, user: user, iduser: userObjectId, Fecha: FechaActual });
    return res.status(201).json({ message: 'Video subido correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error subiendo el video', error });
  }
};

// Función para obtener la URL de todos los videos desde MongoDB
const GetAllVideos = async (req, res) => {
  try {
    const video = await pool.db('Parcial2').collection('videos').find().toArray();
    if (!video) return res.status(404).json({ message: 'No se encontraron videos en la plataforma' });
    res.status(200).json(video);
    console.log ("Todos los videos encontrados: ", video);
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo los videos.', error });
  }
};

// Función para obtener la URL del video de un usuario desde MongoDB
const GetUserVideo = async (req, res) => {
  const User  = req.body;
  console.log("info id:", User.user);
  try {
    const videouser = await pool.db('Parcial2').collection('videos').find({user: User.user}).toArray();
    if (!videouser.length){
      //console.log ("DATOS del video seleccionado1: ", videouser);
      return res.status(200).json({ message: 'El usuario no tiene videos' });
       
    }else{
      console.log ("Datos de los videos encontrados para el usuario: ", videouser);
      return res.status(200).json(videouser);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo los videos.', error });
  }
};

// Función para obtener la URL de todos los videos desde MongoDB
const GetVideo = async (req, res) => {
  const idvideo  =  req.body;
  console.log ("El id del video a reproducir es: ", idvideo.id);
  const IDVIDEO = new ObjectId(idvideo.id);

  try {
    const videoR = await pool.db('Parcial2').collection('videos').find({_id: IDVIDEO}).toArray();
    console.log ("DATOS DEL VIDEO]: ", videoR);
    if (!videoR.length) {
      console.log ("No hay datos del video: ", videoR);
      return res.status(404).json({ message: 'No se encontraron videos en la plataforma' });
    }else{
      console.log ("DATOS del video seleccionado: ", videoR);
      return res.status(200).json(videoR);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo los videos.', error });
  }
};



//  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::v
//  ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::


//------------- metodo  para registrar administradores --------------------- TERMINDO, Validado
const NewAdmin = async (req, res) => {

  const datos = req.body;
  console.log("DATOS enviados Admin: ", datos);
  const PasswordEncrypt = CryptoJS.SHA256(datos.password, process.env.CODE_SECRET_DATA).toString();
  //console.log("PASS Encryp: ", PasswordEncrypt);
  const Role = "Admin";
  
  try{ 
    const registro =  await pool.db('Parcial2').collection('users').insertOne({user: datos.correo,  password: PasswordEncrypt, rol: Role});
    if (registro.acknowledged) {
      res.json({ status: "Usuario administrador creado exitosamente."});
      console.log("status: Registro de usuario exitoso.")
    } else {
      res.json({ status: "Error rreando el registro" });
      console.log("status: Error creando el registro")
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//------------- metodo  para registrar Codigo --------------------- TEMP
const RegistroCodigo = async (req, res) => {
  const datos = req.body;
  console.log("DATOS enviados de codigo: ", datos);
  // codigo, premio, estado, fecha
  try{

    // Códigos generados
    const codes = new Set();  // Usamos Set para evitar duplicados


        // Generar 50 códigos de 1.000.000
        while (codes.size < 50) {
          const code = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
          codes.add({ codigo: code, premio: 'Ganaste 1.000.000', estado: "Libre", fecha: "" });
        }

      //Generar 150 códigos de 50.000
       while (codes.size < 200) {  // 50 + 150 = 200
        const code = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        codes.add({ codigo: code, premio: 'Ganaste 50.000', estado: "Libre", fecha: "" });
      }

      // Generar 200 códigos de 10.000
    while (codes.size < 400) {  // 50 + 150 + 200 = 400
      const code = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      codes.add({ codigo: code, premio: 'Ganaste 10.000', estado: "Libre", fecha: ""  });
    }

        // Generar los códigos restantes como "No ganaste"
        for (let i = 0; i < 1000; i++) {
          const code = String(i).padStart(3, '0'); // Genera códigos del 000 al 999
          if (!Array.from(codes).find(c => c.code === code)) {
            codes.add({ codigo: code, premio: 'No Ganaste', estado: "Libre", fecha: ""   });
          }
        }

    // Insertar los códigos en la base de datos
    await pool.db('Parcial2').collection('codigos').insertMany(Array.from(codes));  // Convertir el Set en un array para MongoDB
    console.log('Códigos generados e insertados en la base de datos');


    /*const registroCodigo =  await pool.db('Parcial2').collection('codigos').insertOne({codigo: datos.codigo, premio: datos.premio, estado: datos.estado, fecha: datos.fecha});
    if (registroCodigo.acknowledged) {
      res.json({ status: "Codigo registrado exitosamente."});
      console.log("status: Registro del codigo  exitoso.")
    } else {
      res.json({ status: "ErrorCreandoRegistro" });
      console.log("status: ErrorCreandoRegistro")
    }*/

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//------------- metodo  para registrar la auditoria de los codigos --------------------- TERMINDO, validado
async function RegistroIntentosCodigo (IDUSER, CODIGO, PREMIO, FECHA, res, req){
  try{

    //Busco la información en user info con el IDCOD  que pertenece al usuario
    var ID_USER = new ObjectId(IDUSER);
    const DatosUsuario = await pool.db('Parcial2').collection('user_info').findOne({user_id: ID_USER });
    if (DatosUsuario) {

      try {

        const RegistroIntentos = await pool.db('Parcial2').collection('intentos').insertOne({nombre: DatosUsuario.nombre,  cedula: DatosUsuario.cedula, telefono: DatosUsuario.celular, codigo: CODIGO, premio: PREMIO, fecha: FECHA });
        if (RegistroIntentos.acknowledged) {
          console.log("status: Registro de auditoria del codigo exitoso.");
          return "Auditoria registrada exitosamente";
        } else {
          console.log("status: Error creando el registro de auditoria");
          return "error Auditoria no registrada";
        }
        
      } catch (error) {
        console.error('Error registrando información de auditoria del codigo: ', error);
      }
      return  "Intento de validacion de premio registrado";
    } else {
      console.log("Error actualicanzo registro del codigo al usuario.");
      return "Error actualicanzo registro del codigo.";
    }

  } catch (error) {
    console.error('Error buscando información del usuario:', error);
    res.status(500).json({ status: "Error", message: "ha ocurrido un error con la base de datos." });
  }
}

//------------- metodo  para actualizar los premios --------------------- TERMINADO, Validado
function ActualizaPremio (IDCOD, IDUSER, FECHA){
  try{
    //Actualizo el codigo utilizado con los datos de fecha
    const registroCodigo =  pool.db('Parcial2').collection('codigos').updateOne({ _id: IDCOD}, { $set: {estado: IDUSER, fecha: FECHA} } );
    if (registroCodigo) {
      console.log("Codigo registrado al usuario.");
      return  "Codigo registrado";
    } else {
      console.log("Error actualicanzo registro del codigo al usuario.");
      return "Error actualicanzo registro del codigo.";
    }

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "ha ocurrido un error con la base de datos." });
  }
}

//------------- metodo  para actualizar los Codigos ------------------- TERMINADO, validado
const UpdateCodigo = async (req, res) => {
  const datos = req.body;
  //console.log("DATOS enviados del front: ", datos);

  try{
    //consulto los datos del codigo que el user trata de registrar para ganar
    const CodigoUtilizado = await pool.db('Parcial2').collection('codigos').findOne({codigo: datos.codigo});

    if (CodigoUtilizado) {
        //valido si el estado del premio esta LIBRE
        if(CodigoUtilizado.estado == "Libre"){

          //variables necesarias para actualizar el registro
          const Premio = CodigoUtilizado.premio;  // valor del premio
          const Idpremio = CodigoUtilizado._id;   // id del documento registrado ObjecID
          const Iduser = datos.iduser.toString();       // id del usuario en cadena
          const CodigoPremio = CodigoUtilizado.codigo;  // codigo con el premio 001 - 002 - 003
          const FechaActual = moment().tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');

          //decido que hacer con cada tipo de premio
          switch (Premio) {
            
            case "No Ganaste":
              const resultado1 = ActualizaPremio(Idpremio, Iduser, FechaActual);
              if(resultado1 == "Codigo registrado"){
                
                //registro el intento de validación del codigo
                const resultado3 = RegistroIntentosCodigo(Iduser, CodigoPremio,  Premio, FechaActual);
                if(resultado3 == "Auditoria registrada exitosamente"){
                  res.json({ status: "Error creando el registro de auditoria"});
                }else{
                  res.json({ status: " Con el código ingresado NO GANASTE ningún premio. "});
                }

              }else{ res.json({ status: "Error actualizando registro del codigo ingresado."}); }
              break;

            case "Ganaste 1.000.000":
              const resultado2 = ActualizaPremio(Idpremio, Iduser, FechaActual);
              if(resultado2 == "Codigo registrado"){

                  //registro el intento de validación del codigo
                  const resultado3 = RegistroIntentosCodigo(Iduser, CodigoPremio,  Premio, FechaActual);
                  if(resultado3 == "Auditoria registrada exitosamente"){
                    res.json({ status: "Error creando el registro de auditoria"});
                  }else{
                    res.json({ status: "Felicidades! HAS GANADO 1.000.000 de pesos."});
                  }

              }else{ res.json({ status: "Error actualizando registro del codigo ingresado."}); }
              break;
            
            case "Ganaste 10.000":
              const resultado3 = ActualizaPremio(Idpremio, Iduser);
              if(resultado3 == "Codigo registrado"){

                  //registro el intento de validación del codigo
                  const resultado3 = RegistroIntentosCodigo(Iduser, CodigoPremio,  Premio, FechaActual);
                  if(resultado3 == "Auditoria registrada exitosamente"){
                    res.json({ status: "Error creando el registro de auditoria"});
                  }else{
                    res.json({ status: "Felicidades! HAS GANADO 10.000 mil pesos."});
                  }

              }else{ res.json({ status: "Error actualizando registro del codigo ingresado."}); }
              break;
            
            case "Ganaste 50.000":
              const resultado4 = ActualizaPremio(Idpremio, Iduser);
              if(resultado4 == "Codigo registrado"){

                  //registro el intento de validación del codigo
                  const resultado3 = RegistroIntentosCodigo(Iduser, CodigoPremio,  Premio, FechaActual);
                  if(resultado3 == "Auditoria registrada exitosamente"){
                    res.json({ status: "Error creando el registro de auditoria"});
                  }else{
                    res.json({ status: "Felicidades! HAS GANADO 50.000 mil pesos."});
                  }
                  
              }else{ res.json({ status: "Error actualizando registro del codigo ingresado."}); }
              break;
          
            default: "" //si no existe un premio cofigurado para un documento(registro) devuelve: 
              console.log("El codigo ingresado no tiene un premio configurado.")
              res.json({ status: "El codigo ingresado no tiene un premio configurado."});
              break;
          }

        }else{
          console.log("El código utilizado ya fue redimido, intenta con otro código por favor.")
          res.json({ status: "El codigo ya fue redimido (utilizado). "});
        }

    } else {
      res.json({ status: "El codigo no existe" });
      console.log("El codigo no existe:")
    }

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "ha ocurrido un error, por favor comunicate con el administrador." });
  }
};

//---------------metodo para buscar la info del usuario--------------------- TERMINADO, verificar
const InfoUser = async (req, res) => {
  const datos = req.body;
  try {

    // Buscar en la colección 'codigos' los documentos que tengan el estado  con el id del user  autenticado
    const DatosUser = await pool.db('Parcial2').collection('users').find({user: datos.user}).toArray();
    if (!Object.keys(DatosUser).length == 0 ) {
      res.json( DatosUser );
    }else{
      console.log('No hay datos registrados para el usuario.');
      res.json({ status: "No hay datos registrados para el usuario." });
    }

  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//------ metodo para buscar la info de la tabla de codigos user -------------- TERMINADO, verificar
const InfoTablaUser = async (req, res) => {
  const datos = req.body;
  try {
    // Buscar en la colección 'codigos' los documentos que tengan el estado  con el id del user  autenticado
    const DatosPremio = await pool.db('Parcial2').collection('codigos').find({estado: datos.iduser}).toArray();
    
    if (!Object.keys(DatosPremio).length == 0 ) {
      res.json( DatosPremio );
    }else{
      res.json([{ status: "No hay codigos registrados para el usuario", _id: "", codigo: "", premio: "", estado: "", fecha: "" }] );
    }

  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//---------------metodo para buscar la info del admin --------------------- en curso
const InfoTablaAdmin1 = async (req, res) => {
  try {
    // Buscar en la colección 'codigos' los documentos que tengan el estado  con el id del user  autenticado
    const DatosPremio = await pool.db('Parcial2').collection('intentos').find({premio: "Ganaste 1.000.000"}).toArray();
    
    if (!Object.keys(DatosPremio).length == 0 ) {
      res.json( DatosPremio );
    }else{
      res.json([{ status: "No hay registros de codigos validados.", _id: "", nombre: "", cedula: "", telefono: "", codigo: "", premio: "", fecha: ""  }]);
    }

  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//---------------metodo para buscar la info del admin --------------------- en curso
const InfoTablaAdmin2 = async (req, res) => {
  try {
    // Buscar en la colección 'codigos' los documentos que tengan el estado  con el id del user  autenticado
    const DatosPremio = await pool.db('Parcial2').collection('intentos').find({premio: "Ganaste 50.000"}).toArray();
    
    if (!Object.keys(DatosPremio).length == 0 ) {
      res.json( DatosPremio );
    }else{
      res.json([{ status: "No hay registros de codigos validados.", _id: "", nombre: "", cedula: "", telefono: "", codigo: "", premio: "", fecha: ""  }]);
    }

  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//---------------metodo para buscar la info del admin --------------------- en curso
const InfoTablaAdmin3 = async (req, res) => {
  try {
    // Buscar en la colección 'codigos' los documentos que tengan el estado  con el id del user  autenticado
    const DatosPremio = await pool.db('Parcial2').collection('intentos').find({premio: "Ganaste 10.000"}).toArray();
    
    if (!Object.keys(DatosPremio).length == 0 ) {
      res.json( DatosPremio );
    }else{
      res.json([{ status: "No hay registros de codigos validados.", _id: "", nombre: "", cedula: "", telefono: "", codigo: "", premio: "", fecha: ""  }]);
    }

  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//---------------metodo para buscar la info del admin --------------------- en curso
const InfoTablaAdmin4 = async (req, res) => {
  try {
    // Buscar en la colección 'codigos' los documentos que tengan el estado  con el id del user  autenticado
    const DatosPremio = await pool.db('Parcial2').collection('intentos').find({premio: "No Ganaste"}).toArray();
    
    if (!Object.keys(DatosPremio).length == 0 ) {
      res.json( DatosPremio );
    }else{
      res.json([{ status: "No hay registros de codigos validados.", _id: "", nombre: "", cedula: "", telefono: "", codigo: "", premio: "", fecha: ""  }]);
    }

  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};



module.exports = {
    Login,
    NewUser,
    NewAdmin,
    upload,
    UploadVideo,
    GetUserVideo,
    GetVideo,
    GetAllVideos,
    RegistroCodigo,
    UpdateCodigo,
    InfoUser,
    InfoTablaUser,
    InfoTablaAdmin1,
    InfoTablaAdmin2,
    InfoTablaAdmin3,
    InfoTablaAdmin4,
    InfoRegistroLogin,
    RegistroIntentosCodigo
  };