const pool = require('../database/connect_mongo.js')
const axios = require('axios');
const CryptoJS = require("crypto-js");
const moment = require('moment-timezone');

//--------------- Login validacion de usuario ---------------------  En curso
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
    const registroCodigo =  await pool.db('Parcial2').collection('codigos').insertOne({codigo: datos.codigo, premio: datos.premio, estado: datos.estado, fecha: datos.fecha});
    if (registroCodigo.acknowledged) {
      res.json({ status: "Codigo registrado exitosamente."});
      console.log("status: Registro del codigo  exitoso.")
    } else {
      res.json({ status: "ErrorCreandoRegistro" });
      console.log("status: ErrorCreandoRegistro")
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};

//------------- metodo  para actualizar los premios --------------------- TERMINADO, Validado
function ActualizaPremio (IDCOD, IDUSER){
  try{
    //Actualizo el codigo utilizado con los datos de fecha
    console.log("id del document codigo: ", IDCOD);
    const FechaActual = moment().tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
    const registroCodigo =  pool.db('Parcial2').collection('codigos').updateOne({ _id: IDCOD}, { $set: {estado: IDUSER, fecha: FechaActual} } );
    if (registroCodigo) {
      //res.json({ status: "Codigo registrado."});
      console.log("Codigo registrado al usuario.");
      return  "Codigo registrado";
    } else {
      //res.json({ status: "Error actualicanzo registro del codigo." });
      console.log("Error actualicanzo registro del codigo al usuario.");
      return "Error actualicanzo registro del codigo.";
    }

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "ha ocurrido un error con la base de datos." });
  }
}

//------------- metodo  para actualizar los Codigos --------------------- TERMINADO, por validar con el id_user
const UpdateCodigo = async (req, res) => {
  const datos = req.body;
  console.log("DATOS actualizar de codigo: ", datos);

  try{

    //consulto los datos del codigo que el user trata de registrar para ganar
    //const COD_PREMIO = datos.codigo;
    const CodigoUtilizado = await pool.db('Parcial2').collection('codigos').findOne({codigo: datos.codigo});
    console.log("status: datos encontrados: ", CodigoUtilizado)

    if (CodigoUtilizado) {
      //res.json({ status: "Codigo encontrado."});
      //console.log("status: Codigo encontrado: ", CodigoUtilizado.codigo)

        //valido si el estado del premio esta LIBRE
        if(CodigoUtilizado.estado == "Libre"){

          //variables necesarias para actualizar el registro
          const Premio = CodigoUtilizado.premio;  // valor del premio
          const Idpremio = CodigoUtilizado._id;   // id del documento registrado ObjecID
          const Iduser = datos.iduser;            // id del usuario ObjecID

          //decido que hacer con cada tipo de premio
          switch (Premio) {
            
            case "No Ganaste":
              const resultado1 = ActualizaPremio(Idpremio, Iduser);
              if(resultado1 == "Codigo registrado"){
                res.json({ status: "No ganaste con el codigo ingresado, intenta con otros códigos. "});
              }else{ res.json({ status: "Error actualizando registro del codigo ingresado."}); }
              break;

            case "Ganaste 1.000.000":
              const resultado2 = ActualizaPremio(Idpremio, Iduser);
              if(resultado2 == "Codigo registrado"){
                res.json({ status: "Felicidades! has ganado 1.000.000 de pesos. "});
              }else{ res.json({ status: "Error actualizando registro del codigo ingresado."}); }
              break;
            
            case "Ganaste 10.000":
              const resultado3 = ActualizaPremio(Idpremio, Iduser);
              if(resultado3 == "Codigo registrado"){
                res.json({ status: "exitoso! "});
              }else{ res.json({ status: "Error actualizando registro del codigo ingresado."}); }
              break;
            
            case "Ganaste 50.000":
              const resultado4 = ActualizaPremio(Idpremio, Iduser);
              if(resultado4 == "Codigo registrado"){
                res.json({ status: "exitoso! "});
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
    const usertemp = "jhmithert@gmail.com";
    //const DatosPremio = await pool.db('Parcial2').collection('users').find({estado: datos.user}).toArray();
    const DatosUser = await pool.db('Parcial2').collection('users').find({user: usertemp}).toArray();
    
    if (!Object.keys(DatosUser).length == 0 ) {

      console.log('Información del usuario: ', DatosUser);
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


const InfoTablaUser = async (req, res) => {
  const datos = req.body;
  try {
    // Buscar en la colección 'codigos' los documentos que tengan el estado  con el id del user  autenticado
    const IDTEMP = "671af37c7fc3093fbd22a47e";
    //const DatosPremio = await pool.db('Parcial2').collection('codigos').find({estado: datos.iduser}).toArray();
    const DatosPremio = await pool.db('Parcial2').collection('codigos').find({estado: "671af37c7fc3093fbd22a47e"}).toArray();
    
    if (!Object.keys(DatosPremio).length == 0 ) {

      console.log('Codigos registrados para el usuario: ', DatosPremio);
      res.json( DatosPremio );

    }else{
      console.log('No hay codigos registrados para el usuario.');
      res.json({ status: "No hay codigos registrados para el usuario." });
    }

  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};




//---------------metodo para buscar la info del admin ---------------------
// trer fecha, nombre, cedula, telefono, codigo, premio
const InfoAdmin = async (req, res) => {
  const datos = req.body;
  try {
    // Buscar en la colección 'codigos' los documentos que tengan el estado  con el id del user  autenticado
    const DatosPremio = await pool.db('Parcial2').collection('codigos').find({estado: datos.iduser}).toArray();
    
    if (!Object.keys(DatosPremio).length == 0 ) {

      console.log('Codigos registrados para el usuario: ', DatosPremio);
      res.json({ DatosPremio });

    }else{
      console.log('No hay codigos registrados para el usuario.');
      res.json({ status: "No hay codigos registrados para el usuario." });
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
    RegistroCodigo,
    UpdateCodigo,
    InfoUser,
    InfoTablaUser,
    InfoAdmin
  };