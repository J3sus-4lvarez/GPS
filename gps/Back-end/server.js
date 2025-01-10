const net = require('net');
const axios = require('axios'); // Asegúrate de tener axios instalado e importado
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const path = require('path'); 
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const Gt06 = require('./gt06'); // Asegúrate de tener el módulo Gt06
const mqtt = require('mqtt');
const routes = require('./routes/routes');
const notificacionRoutes = require('./routes/notificaciones');
const iniciarWatcher = require('./utils/notificationWatcher');
const  Notification  = require('./models/notification'); // Importa el modelo de notificación
const Alert = require('./models/Alert'); // Importa el modelo de alerta
const geozoneRoutes = require('./routes/geozone');
const { Device, DeviceStatus} = require('./models/Device');
const geolib = require('geolib');
const WebSocket = require('ws');
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.GT06_SERVER_PORT || 4000;
const HTTP_PORT = process.env.HTTP_PORT || 80;
const rootTopic = process.env.MQTT_ROOT_TOPIC || 'gt06';
const brokerUrl = process.env.MQTT_BROKER_URL || '11ec3ffa829840c785105a23a3994db1.s1.eu.hivemq.cloud';
const brokerPort = process.env.MQTT_BROKER_PORT || 1883;
const mqttProtocol = process.env.MQTT_BROKER_PROTO || 'mqtt';
const brokerUser = process.env.MQTT_BROKER_USER || 'DiegoGPS';
const brokerPasswd = process.env.MQTT_BROKER_PASSWD || 'Dl1042248136!';

let previousSpeed = 0;
const BRAKING_THRESHOLD = 30;

app.get('/send-command/:commandNumber', (req, res) => {
    const commandNumber = parseInt(req.params.commandNumber, 10);
    SendCommand(commandNumber);
    res.send(`Command ${commandNumber} sent to GPS`);
}); 
// Configuración del cliente MQTT
const mqttClient = mqtt.connect({
    protocol: mqttProtocol,
    host: brokerUrl,
    port: brokerPort,
    username: brokerUser,
    password: brokerPasswd
});

mqttClient.on('connect', () => {
    console.log('Cliente MQTT conectado');
});

mqttClient.on('error', (err) => {
    console.error('Error en la conexión MQTT:', err);
});

// Servidor TCP
let cliente = null;

var tcpServer = net.createServer((client) => {
    var gt06 = new Gt06();
    cliente=client;
    console.log('client connected');
    
    client.on('error', (err) => {
        console.error('client error', err);
    });

    client.on('close', () => {
        console.log('client disconnected');
    });

    client.on('data', async (data) => {
        try {
            gt06.parse(data);
        } catch (e) {
            console.log('err', e);
            return;
        }
        console.log(gt06);
        if (gt06.expectsResponse) {
            client.write(gt06.responseMsg);
        }
        gt06.msgBuffer.forEach(async (msg) => {
            mqttClient.publish(rootTopic + '/' + gt06.imei + '/pos', JSON.stringify(msg));
            
            // Preparar los datos para enviar a la ruta /update-from-gps
            if (gt06.event.string === 'location') {
                const gpsTime = new Date();

                previousSpeed=gt06.speed
        // Variable para almacenar la velocidad anterior
                 // Umbral de frenado brusco en km/h

                // Convertir a la hora local
                const localTime = new Date(gpsTime.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
                
                // Formatear la hora local en ISO 8601
                const localTimeISO = localTime.toISOString();

                //agregar alertas y notificaciones de velocidad
                if (gt06.speed > 35) {
                    console.log(`Velocidad de ${gt06.speed} km/h detectada, creando alerta...`);
                    const notificacion = new Notification({
                        imei: gt06.imei,
                        notificationName: `Exceso de velocidad: ${gt06.speed} km/h`,
                        notificationTime: localTimeISO,   
                        notificationType: 'maxSpeed' // Tipo de notificación
                    });
                    const alert = new Alert({
                        imei: gt06.imei,
                        alertName: `Exceso de velocidad: ${gt06.speed} km/h`,
                        alertTime: localTimeISO,
                        alertType: 'maxSpeed'
                    });
                    try {
                        await notificacion.save();
                        await alert.save();
                        console.log(`Notificación de exceso de velocidad guardada para IMEI: ${gt06.imei}`);
                    } catch (error) {
                        console.error('Error al guardar la notificación:', error);
                    }
                }

                if (previousSpeed - gt06.speed >= previousSpeed-5&&previousSpeed>=30) {
                    console.log(`Frenado brusco detectado, creando alerta...`);
                    const notificacion = new Notification({
                        imei: gt06.imei,
                        notificationName: `Frenado brusco: de ${previousSpeed} km/h a ${gt06.speed} km/h`,
                        notificationTime: localTimeISO,
                        notificationType: 'hardBraking' // Tipo de notificación
                    });
                    const alert = new Alert({
                        imei: gt06.imei,
                        alertName: `Frenado brusco: de ${previousSpeed} km/h a ${gt06.speed} km/h`,
                        alertTime: localTimeISO
                    });
                    try {
                        await notificacion.save();
                        await alert.save();
                        console.log(`Notificación de frenado brusco guardada para IMEI: ${gt06.imei}`);
                    } catch (error) {
                        console.error('Error al guardar la notificación:', error);
                    }
                }
                previousSpeed = gt06.speed;

                const deviceData = {
                    imei: gt06.imei,
                    Lat: gt06.lat,
                    Lon: gt06.lon,
                    speed: gt06.speed,
                    course: gt06.course,
                    time: localTimeISO,
                    ignition: gt06.terminalInfo ? Boolean(gt06.terminalInfo.ignition) : false,
                    charging: gt06.terminalInfo ? Boolean(gt06.terminalInfo.charging) : false,
                    gpsTracking: gt06.terminalInfo ? Boolean(gt06.terminalInfo.gpsTracking) : false,
                    relayState: gt06.terminalInfo ? Boolean(gt06.terminalInfo.relayState) : false
                };
                const historyData = {
                    imei: gt06.imei,
                    lat: gt06.lat,
                    lon: gt06.lon,
                    speed: gt06.speed,
                    course: gt06.course,
                    fixTime: localTimeISO
                };
            
                console.log(
                    gt06.terminalInfo ? gt06.terminalInfo.ignition : 'undefined',
                    gt06.terminalInfo ? gt06.terminalInfo.charging : 'undefined',
                    gt06.terminalInfo ? gt06.terminalInfo.gpsTracking : 'undefined',
                    gt06.terminalInfo ? gt06.terminalInfo.relayState : 'undefined'
                );
            
                // Enviar los datos a la ruta /update-from-gps
                try {
                    await axios.post(`http://3.92.51.134/devices/update-from-gps`, deviceData);
                    await axios.post(`http://3.92.51.134/devices/save-history`, historyData);  

                    console.log(`Datos enviados a /update-from-gps para IMEI: ${gt06.imei}`);
                } catch (error) {
                    console.error('Error al enviar los datos:', error);
                }
            }
           
        }); 
       
               
        
        gt06.clearMsgBuffer();
    });
}); 

// Inicia el servidor TCP en el puerto especificado
tcpServer.listen(PORT, () => {
    console.log(`Servidor TCP corriendo en el puerto ${PORT}`);
});
const server=app.listen(HTTP_PORT, () => {
    console.log(`Servidor HTTP corriendo en http://localhost:${HTTP_PORT}`);
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conexión a MongoDB
mongoose.connect('mongodb+srv://lospopulare:gps1234@gps.zgbl7.mongodb.net/proyecto?retryWrites=true&w=majority&appName=gps', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
   
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error de conexión a MongoDB:', err));

// Rutas
app.use('/auth', authRoutes);
app.use('/devices', deviceRoutes);
app.use('/routes', routes);
app.use('/notificaciones', notificacionRoutes);
app.use('/geozone', geozoneRoutes);

async function SendCommand(commandNumber) {
  let commandBuffer;
  let alertaName;
  switch (commandNumber) {
      case 0: // Apagar el carro
        commandBuffer = Buffer.from([0x78, 0x78, 0x15, 0x80, 0x0F, 0x00, 0x01, 0xA9, 0x61, 0x44, 0x59, 0x44, 0x2C, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x23, 0x00, 0xA0, 0x3E, 0x10, 0x0D, 0x0A]);
        alertaName = 'Combustible cortado';
        break;
      case 1: // Encender el carro
        commandBuffer = Buffer.from([0x78, 0x78, 0x16, 0x80, 0x10, 0x00, 0x01, 0xA9, 0x63, 0x48, 0x46, 0x59, 0x44, 0x2C, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x23, 0x00, 0xA0, 0x7B, 0xDC, 0x0D, 0x0A]);
        alertaName = 'Combustible restablecido';
        break;
      default:
        console.error('Comando no reconocido');
        return;
    }
  
    if (cliente) {
      cliente.write(commandBuffer);
      console.log('Command sent:', commandBuffer.toString('hex'));
      const time = new Date();
      // Guardar la notificación en la base de datos
      const localTimeString = time.toLocaleString('en-US', { timeZone: 'America/Bogota' });
      const localTime = new Date(localTimeString);

      const notification = new Notification({
          imei: "863829070233398",
          notificationName: alertaName ,
          notificationTime: localTime,
          notificationType: 'control'
        });

        const alert = new Alert({
          imei: "863829070233398",
          alertName: alertaName,
          alertTime: localTime,
          alertType: 'control'
      });
        try {
          await notification.save();
          await alert.save();
          console.log('Notificación guardada en la base de datos');
        } catch (error) {
          console.error('Error al guardar la notificación en la base de datos:', error);
        }
  } else {
      console.error('No GPS client connected');
  }
}














const deviceStatusMap = new Map();
const wss = new WebSocketServer({ server });
// Iniciar el watcher para cambios en la base de datos

// Iniciar el watcher para cambios en la base de datos
const changeStream = DeviceStatus.watch();

changeStream.on('change', async (change) => {
  try {
    if (change.operationType === 'insert' || change.operationType === 'update') {
      const latestDeviceStatus = await DeviceStatus.findOne().sort({ fixTime: -1 }).exec();
      console.log('Último estado del dispositivo:', latestDeviceStatus);
      if (latestDeviceStatus) {
        const device = await Device.findOne({ imei: latestDeviceStatus.imei }).populate('geozoneId');
        console.log('Dispositivo encontrado:', device);
        if (device) {
          // Verificar si el dispositivo está fuera de la geozona
          if (device.geozoneId) {
            const geozone = device.geozoneId;
            let isOutsideGeozone = false;

            if (geozone.type === 'Polygon') {
              let points = geozone.vertices.map(point => [point.lng, point.lat]);
              // Asegurarse de que el primer y último punto sean iguales
              if (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1]) {
                points.push(points[0]);
              }
              isOutsideGeozone = !geolib.isPointInPolygon(
                { latitude: latestDeviceStatus.lat, longitude: latestDeviceStatus.lon },
                points.map(point => ({ latitude: point[1], longitude: point[0] }))
              );
              console.log('Punto dentro del polígono:', !isOutsideGeozone);
            } else if (geozone.type === 'Circle') {
              const center = { latitude: geozone.center.lat, longitude: geozone.center.lng };
              const point = { latitude: latestDeviceStatus.lat, longitude: latestDeviceStatus.lon };
              const distance = geolib.getDistance(center, point);
              isOutsideGeozone = distance > geozone.radius;
              console.log('Distancia desde el centro:', distance, 'Fuera de la geozona:', isOutsideGeozone);
            }

            const deviceKey = `${device.imei}-${geozone._id}`;
            const previousStatus = deviceStatusMap.get(deviceKey);

            if (isOutsideGeozone && !previousStatus) {
              console.log(`Dispositivo ${device.deviceName} está fuera de la geozona ${geozone.name}`);
              const notificacion = new Notification({
                imei: latestDeviceStatus.imei,
                notificationName: `Fuera de la geozona ${geozone.name}`,
                notificationTime: latestDeviceStatus.fixTime,
                notificationType: 'geozone'
              });
              const alert = new Alert({
                imei: latestDeviceStatus.imei,
                alertName: `Fuera de la geozona ${geozone.name}`,
                alertTime: latestDeviceStatus.fixTime,
                alertType: 'geozone'
              });
              try {
                await notificacion.save();
                await alert.save();
                console.log(`Notificación de geozona guardada para IMEI: ${latestDeviceStatus.imei}`);
                deviceStatusMap.set(deviceKey, true); // Actualizar el estado del dispositivo
              } catch (error) {
                console.error('Error al guardar la notificación:', error);
              }
            } else if (!isOutsideGeozone && previousStatus) {
              console.log(`Dispositivo ${device.deviceName} ha regresado a la geozona ${geozone.name}`);
              const notificacion = new Notification({
                imei: latestDeviceStatus.imei,
                notificationName: `Regreso a la geozona ${geozone.name}`,
                notificationTime: latestDeviceStatus.fixTime,
                notificationType: 'geozone'
              });
              const alert = new Alert({
                imei: latestDeviceStatus.imei,
                alertName: `Regreso a la geozona ${geozone.name}`,
                alertTime: latestDeviceStatus.fixTime,
                alertType: 'geozone'
              });
              try {
                await notificacion.save();
                await alert.save();
                console.log(`Notificación de regreso a la geozona guardada para IMEI: ${latestDeviceStatus.imei}`);
                deviceStatusMap.set(deviceKey, false); // Actualizar el estado del dispositivo
              } catch (error) {
                console.error('Error al guardar la notificación:', error);
              }
            }

            // Detectar cambios en el estado de ignition
            const previousIgnitionStatus = deviceStatusMap.get(`${device.imei}-ignition`);
            if (previousIgnitionStatus !== undefined && previousIgnitionStatus !== latestDeviceStatus.ignition) {
              const ignitionNotification = new Notification({
                imei: latestDeviceStatus.imei,
                notificationName: latestDeviceStatus.ignition ? 'Motor encendido' : 'Motor apagado',
                notificationTime: latestDeviceStatus.fixTime,
                notificationType: 'moto'
              });
              const ignitionAlert = new Alert({
                imei: latestDeviceStatus.imei,
                alertName: latestDeviceStatus.ignition ? 'Motor encendido' : 'Motor apagado',
                alertTime: latestDeviceStatus.fixTime,
                alertType: 'moto'
              });
              try {
                await ignitionNotification.save();
                await ignitionAlert.save();
                console.log(`Notificación de ${latestDeviceStatus.ignition ? 'motor encendido' : 'motor apagado'} guardada para IMEI: ${latestDeviceStatus.imei}`);
                deviceStatusMap.set(`${device.imei}-ignition`, latestDeviceStatus.ignition); // Actualizar el estado del dispositivo
              } catch (error) {
                console.error('Error al guardar la notificación de ignition:', error);
              }
            }
          } else {
            console.log('El dispositivo no tiene una geozona asignada.');
          }
        } else {
          console.log('Dispositivo no encontrado.');
        }
      } else {
        console.log('No se encontró el último estado del dispositivo.');
      }

      // Enviar el estado más reciente del dispositivo a todos los clientes conectados
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(latestDeviceStatus));
        }
      });
    }
  } catch (error) {
    console.error('Error al procesar el cambio:', error);
  }
});

iniciarWatcher(wss);
wss.on('connection', (ws) => {
  ws.on('close', () => {
      console.log('Cliente WebSocket desconectado');
  });
});
app.use(express.static(path.join(__dirname, 'dist' )));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});