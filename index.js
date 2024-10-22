const express = require('express');
const cors = require('cors');
const pool = require('./database/connect_mongo.js');
require('dotenv').config();
const app = express();
const port = process.env.PORT;

app.use(cors()); // Permitir todos los orígenes
app.use(express.json());

//connectToDatabase();

app.get('/', async (req, res) => {
  res.send("Prueba que funciona");
}); 

const userRoutes = require('./routes/userRoutes');
app.use('/api', userRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
