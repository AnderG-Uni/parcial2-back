const pool = require('../database/connect_mongo.js')
const axios = require('axios');
const CryptoJS = require("crypto-js");
const moment = require('moment-timezone');



//---------------Login---------------------
const Login = async (req, res) => {
  const datos = req.body;
  //console.log("LOGIN: ", datos);
  const hashedPassword = CryptoJS.SHA256(datos.password, process.env.CODE_SECRET_DATA).toString();
  console.log("PASSS: ", hashedPassword);
  try{
    const users =  await pool.db('Parcial2').collection('users').find().toArray()
    console.log("USERS: ", users);
    const login =  await pool.db('Parcial2').collection('users').findOne({ email: datos.email, password: hashedPassword });
    if (login) {
      // Obtener la fecha y hora actual en formato Bogotá
      const currentDateTime = moment().tz('America/Bogota').format('YYYY-MM-DD HH:mm:ss');
      // Almacenar en la colección log_login
      await pool.db('Parcial2').collection('log_login').insertOne({ email: datos.email, role: login.role, date: currentDateTime });
      res.json({ status: "Bienvenido! ", user: datos.email, role: login.role});
    } else {
      res.json({ status: "Error en las credenciales" });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};


//------------- metodo  para registrar usuarios ---------------------
const NewUser = async (req, res) => {

  const datos = req.body;
  console.log("DATOS enviados: ", datos);

  const PasswordEncrypt = CryptoJS.SHA256(datos.password, process.env.CODE_SECRET_DATA).toString();
  //console.log("PASS Encryp: ", PasswordEncrypt);
  const Role = "User";
  const IDUSER = "5sdfs55sf8fgs5s";
  
  try{ 
    // Registro el user
    const registroUser =  await pool.db('Parcial2').collection('users').insertOne({user: datos.correo, password: PasswordEncrypt, rol: Role });
    console.log("se creo el usuario exitosamente: ");

    //Consulto el id del usuario ya creado
    const ConsultaUser = await pool.db('Parcial2').collection('users').findOne({user: datos.correo, password: PasswordEncrypt });
    if (!ConsultaUser) {
      res.status(401).send("Usuario no existe!");
      return;
    }s
    //console.log("DATOS USER:   ", ConsultaUser);
    //IDUSER = ConsultaUser.ObjectId(_id);
    //console.log("ID USER:   ", IDUSER);

    // Regsitro los datos del usuario
    const registroUserInfo =  await pool.db('Parcial2').collection('user_info').insertOne({user_id: ObjectId(IDUSER), nombre: datos.nombre, fecha_nacimiento: datos.fechaN, cedula: datos.cedula, celular: datos.celular, ciudad: datos.ciudad});
    console.log("se Guardo la info del usuario exitosamente: ");

    if (registroUser.acknowledged && registroUserInfo.acknowledged) {
      res.json({ status: "Usuario creado exitosamente."});
      console.log("status: Registro de usuario exitoso.")
    } else {
      res.json({ status: "ErrorCreandoRegistro" });
      console.log("status: ErrorCreandoRegistro")
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};


//------------- metodo  para registrar administradores ---------------------
const NewAdmin = async (req, res) => {

  const datos = req.body;
  console.log("DATOS enviados Admin: ", datos);

  const PasswordEncrypt = CryptoJS.SHA256(datos.password, process.env.CODE_SECRET_DATA).toString();
  //console.log("PASS Encryp: ", PasswordEncrypt);
  const Role = "Admin";
  
  try{ 
    const registro =  await pool.db('Parcial2').collection('users').insertOne({user: datos.user,  password: PasswordEncrypt, rol: Role});
    if (registro.acknowledged) {
      res.json({ status: "Usuario creado exitosamente."});
      console.log("status: Registro de usuario exitoso.")
    } else {
      res.json({ status: "ErrorCreandoRegistro" });
      console.log("status: ErrorCreandoRegistro")
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};


//------------- metodo  para registrar Codigo ---------------------
const RegistroCodigo = async (req, res) => {

  const datos = req.body;
  console.log("DATOS enviados codigo: ", datos);
  
  try{ 
    const registroCodigo =  await pool.db('Parcial2').collection('codigos').insertOne({codigo: datos.user,  premio: datos.user, estado: datos.user, fecha: datos.fecha});
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



//---------------metodo para buscar la info del usuario---------------------
const InfoUser = async (req, res) => {
  const datos = req.body;

  const { user, pass, request } = datos;

  try {
    // Buscar en la colección 'endpoints' si el usuario y la contraseña existen
    const endpoint = await pool.db('pocketux').collection('endpoints').findOne({ user: user, pass: pass });

    if (!endpoint) {
      res.status(401).send("Usuario no existe");
      return;
    }

    // Validar el estado del usuario
    if (endpoint.status !== "active") {
      res.status(403).send("Usuario Inactivo");
      return;
    }

    // Enviar el contenido del campo 'request' a la URL contenida en el campo 'url'
    const axios_url = endpoint.url;

    const config = {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };

    try {
      const response = await axios.post(axios_url, request, config);
      console.log('Respuesta del servidor:', response.data);
      res.send(response.data); // Enviar la respuesta de vuelta al cliente
    } catch (error) {
      console.error('Error al enviar la solicitud:', error);
      res.status(500).send('Error al enviar la solicitud');
    }
  } catch (error) {
    console.error('Error al consultar la base de datos:', error);
    res.status(500).json({ status: "Error", message: "Internal Server Error" });
  }
};



//---------------metodo para buscar la info del admin ---------------------
const InfoAdmin = async (req, res) => {
  const datos = req.body;

  const { user, pass, request } = datos;

  try {
    // Buscar en la colección 'endpoints' si el usuario y la contraseña existen
    const endpoint = await pool.db('pocketux').collection('endpoints').findOne({ user: user, pass: pass });

    if (!endpoint) {
      res.status(401).send("Usuario no existe");
      return;
    }

    // Validar el estado del usuario
    if (endpoint.status !== "active") {
      res.status(403).send("Usuario Inactivo");
      return;
    }

    // Enviar el contenido del campo 'request' a la URL contenida en el campo 'url'
    const axios_url = endpoint.url;

    const config = {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };

    try {
      const response = await axios.post(axios_url, request, config);
      console.log('Respuesta del servidor:', response.data);
      res.send(response.data); // Enviar la respuesta de vuelta al cliente
    } catch (error) {
      console.error('Error al enviar la solicitud:', error);
      res.status(500).send('Error al enviar la solicitud');
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
    InfoUser,
    InfoAdmin
  };