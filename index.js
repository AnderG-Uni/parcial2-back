const express = require('express');
const cors = require('cors');
const pool = require('./database/connect_mongo.js');
require('dotenv').config();
const app = express();
const port = process.env.PORT;

// Permitir todos los orígenes
app.use(cors());
app.use(express.json());

//Ruta raiz
app.get('/', async (req, res) => {
  res.send("Prueba que funciona");
});


//configuración de rutas
const userRoutes = require('./routes/routers.js');
app.use('/apiv1', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
