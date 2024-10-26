const express = require('express');
const router = express.Router();
const userController = require('../controllers/Controller.js');

router.post('/login', userController.Login); // Valido los intentos de login
router.post('/new_user', userController.NewUser); // creo los registros de los nuevos usuarios
router.post('/new_admin', userController.NewAdmin); // creo los registros de los nuevos admin
router.post('/Registro_codigo', userController.RegistroCodigo); // creo los registros de los datos de codigo
router.post('/update_codigo', userController.UpdateCodigo); // creo los registros de los datos de codigo
router.post('/info_user', userController.InfoUser); // obtener los datos de la vista user
router.post('/info_user_tabla', userController.InfoTablaUser); // obtener los datos de la vista user
router.post('/info_audit_users', userController.InfoRegistroLogin); // obtener la fecha de inicio de sesión
router.post('/info_admin_tabla1', userController.InfoTablaAdmin1); // obtener los datos de tabla de la vista admin 1 milon
router.post('/info_admin_tabla2', userController.InfoTablaAdmin2); // obtener los datos de tabla de la vista admin 50 mil
router.post('/info_admin_tabla3', userController.InfoTablaAdmin3); // obtener los datos de tabla de la vista admin 10 mil
router.post('/info_admin_tabla4', userController.InfoTablaAdmin4); // obtener los datos de tabla de la vista admin no gano


module.exports = router;