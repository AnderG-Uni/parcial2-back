const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGO_URI
//const uri = 'mongodb+srv://Anderson:d5f1aA8sE51YfsRII81@cluster0.ulqna.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})

const validatedb = async  () => {
    try {
      await  client.connect()
      console.log('Conexion a mongodb exitosa!');
    } catch (error) {
      console.error(error);
    }
}


validatedb();


module.exports = client;