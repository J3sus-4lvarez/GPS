import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import iziToast from 'izitoast';
import 'izitoast/dist/css/iziToast.min.css';
import gasolinaImage from './assets/gasolina.png'; // Importa la imagen
import maxSpeed from  './assets/maxSpeed.png'
import accidente from  './assets/accidente.jpg'
import radar from  './assets/radar-de-velocidad.png'
import mapas from  './assets/mapas.png'
import freno from  './assets/freno.png'
import motor from './assets/motor.png'
// Configurar WebSocket
const ws = new WebSocket('ws://18.223.186.201');
ws.onmessage = (event) => {
    const notificacion = JSON.parse(event.data);

    (notificacion.notificationType=="maxSpeed")
    ?  iziToast.info({
        title: 'Notificación',
        message: notificacion.notificationName || 'Nueva notificación',
        position: 'bottomRight',
        image: radar,
        timeout: 5000 // Mostrar la alerta durante 5 segundos
    }):(notificacion.notificationType=="control")?
    iziToast.info({
        title: 'Notificación',
        message: notificacion.notificationName || 'Nueva notificación',
        position: 'bottomRight',
        image: gasolinaImage,
        timeout: 5000 // Mostrar la alerta durante 5 segundos
    }):(notificacion.notificationType=="hardBraking")?
iziToast.warning({
    title: 'Notificación',
    message: notificacion.notificationName || 'Nueva notificación',
    position: 'bottomRight',
    image: freno,
    timeout: 5000 // Mostrar la alerta durante 5 segundos
}):(notificacion.notificationType=="geozone")?
iziToast.warning({
    title: 'Notificación',
    message: notificacion.notificationName || 'Nueva notificación',
    position: 'bottomRight',
    image: mapas,
    timeout: 8000 // Mostrar la alerta durante 5 segundos
}):(notificacion.notificationType=="moto")?
iziToast.warning({
    title: 'Notificación',
    message: notificacion.notificationName || 'Nueva notificación',
    position: 'bottomRight',
    image: motor,
    timeout: 5000 // Mostrar la alerta durante 5 segundos
}):null;



};
ws.onclose = () => {
    console.log('WebSocket cerrado. Reintentando...');
    setTimeout(() => {
        const newWs = new WebSocket('ws://18.223.186.201');
        window.ws = newWs;
    }, 5000);
};
ws.onerror = (error) => {
    console.error('Error en WebSocket:', error);
};

window.ws = ws;

const app = createApp(App);
app.config.globalProperties.$ws = ws;

app.use(store).use(router).mount('#app');