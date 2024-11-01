const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { getImei, setImei } = require('../config');

// Listar todos los dispositivos
router.get('/', async (req, res) => {
    try {
        const devices = await Device.find({}, 'deviceName responsible status imei phoneNumber coordenadas');
        res.json(devices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Agregar un nuevo dispositivo
router.post('/', async (req, res) => {
    try {
        const { deviceName, responsible, imei, status, phoneNumber } = req.body;
        
        if (!deviceName || !responsible || !imei || !status) {
            return res.status(400).json({ error: 'Los campos deviceName, responsible, imei y status son obligatorios.' });
        }

        const nuevoDispositivo = new Device({
            deviceName,
            responsible,
            imei,
            status,
            phoneNumber,
            coordenadas: { latitud: null, longitud: null },
            kilometraje: null,
            velocidad: null
        });

        const dispositivoGuardado = await nuevoDispositivo.save();
        setImei(dispositivoGuardado._id.toString(), imei);
        console.log('IMEI guardado para dispositivo:', dispositivoGuardado._id, getImei(dispositivoGuardado._id.toString()));

        res.status(201).json(dispositivoGuardado);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al agregar el dispositivo: ' + error.message });
    }
});

// Actualizar un dispositivo
router.put('/:id', async (req, res) => {
    try {
        const updatedDevice = await Device.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!updatedDevice) {
            return res.status(404).json({ message: 'Dispositivo no encontrado' });
        }
        res.json(updatedDevice);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error al actualizar el dispositivo: ' + error.message });
    }
});

// Eliminar un dispositivo
router.delete('/:id', async (req, res) => {
    try {
        const deletedDevice = await Device.findByIdAndDelete(req.params.id);
        if (!deletedDevice) {
            return res.status(404).json({ message: 'Dispositivo no encontrado' });
        }
        res.json({ message: 'Dispositivo eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar el dispositivo: ' + error.message });
    }
});

module.exports = router;
