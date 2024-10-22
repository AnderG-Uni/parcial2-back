const express = require('express');
const router = express.Router();
const userController = require('../controllers/Controller.js');


router.post('/login', userController.Login); // Valido los intentos de login
router.post('/new_user', userController.NewUser); // creo los registros de los nuevos usuarios
router.post('/new_admin', userController.NewAdmin); // creo los registros de los nuevos admin
router.post('/Registro_codigo', userController.RegistroCodigo); // creo los registros de los datos de codigo
router.post('/info_user', userController.InfoUser); // obtener los datos de la vista user
router.post('/info_admin', userController.InfoAdmin); // obtener los datos de la vista admin

module.exports = router;