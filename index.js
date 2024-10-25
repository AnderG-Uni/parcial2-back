const express = require('express');
const cors = require('cors');
const pool = require('./database/connect_mongo.js');
require('dotenv').config();
const app = express();
const port = process.env.PORT;

app.use(cors()); // Permitir todos los orígenes
app.use(express.json());

app.get('/', async (req, res) => {
  res.send("Prueba que funciona");
});

const userRoutes = require('./routes/routers.js');
app.use('/apiv1', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
