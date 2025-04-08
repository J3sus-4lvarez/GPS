<template>
  <section class="home">
    <div class="overlay"></div>
    <NavBar />
    <div class="tituloo">
      <div class="hone">
        <h1>Lista de Dispositivos</h1>
        <div class="group">
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <g>
              <path
                d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z">
              </path>
            </g>
          </svg>
          <input placeholder="Buscar" type="search" class="input" v-model="searchQuery" @input="filterResults">
        </div>
        <div class="device-list-container">
          <ul class="device-list">
            <li v-for="item in filteredResults" :key="item._id" @click="showAlert(item)">
              <i class='bx bxs-car'></i>
              {{ item.deviceName }}
            </li>
          </ul>
        </div>
      </div>

      <div class="hone2">
        <h1>Dispositivo</h1>
      </div>

      <div id="map" class="map-container"></div>
    </div>

    <div class="cuadro">
      <div class="control-container">
        <p>Dispositivo: <span>{{ deviceName }}</span></p>
        
        <p v-if="fixTimeDOM">Tiempo: <span>{{ formatDate(utc(fixTimeDOM)) }}</span></p>
        <p>Velocidad: <span>{{ speedDOM }} km/h</span></p>
        <p>Encendido: <span>{{ ignitionDOM }}</span></p>
        <p>Cargando: <span>{{ chargingDOM }}</span></p>
        <div class="button-container">
          <button @click="sendCommand(0)">Apagar</button>
          <button @click="sendCommand(1)">Encender</button>
        </div>
      </div>
    </div>
  </section>
</template>



<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import NavBar from '../components/NavBar.vue';
import Swal from 'sweetalert2';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { formatDate, utc } from '../../Back-end/utils/formatearFecha';
import axios from 'axios';
import 'leaflet.marker.slideto';

// Configuración de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
});

// Variables reactivas
let map;
let marker = null;
const deviceName = ref('');
const fixTimeDOM = ref('');
const speedDOM = ref(0);
const ignitionDOM = ref('');
const chargingDOM = ref('');
const dropdownOpen = ref(false);
const searchQuery = ref('');
const devices = ref([]);
const filteredResults = ref([]);
let ws = null;

// Inicializa el mapa de Leaflet
function initMap() {
  var colombia = { lat: 10.9685, lng: -74.7813 };
  const mapOptions = {
    center: colombia,
    zoom: 12.4
  };

  // Crear el objeto de mapa de Leaflet
  map = L.map('map').setView([colombia.lat, colombia.lng], mapOptions.zoom);

  // Agregar una capa de mapa
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
}

// Alterna la visibilidad del menú desplegable
function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
}

// Filtra los dispositivos basados en la búsqueda del usuario
function filterResults() {
  const query = searchQuery.value.toLowerCase();
  filteredResults.value = devices.value.filter(item =>
    item.deviceName.toLowerCase().includes(query)
  );
}

// Muestra un dispositivo seleccionado en el mapa
async function showDeviceOnMap(data) {
  const { lat, lon, fixTime, speed, ignition, charging, deviceName:name } = data;
  if (lat === undefined || lon === undefined) {
    console.error('Latitud o longitud no definida');
    Swal.fire({
      title: 'Error',
      text: 'No se pudo obtener la ubicación del dispositivo.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }
  if (!map) {
    console.error('El mapa no está inicializado');
    return;
  }


  deviceName.value = name;
  fixTimeDOM.value = fixTime;
  speedDOM.value = speed;
  ignitionDOM.value = ignition ? 'Sí' : 'No';
  chargingDOM.value = charging ? 'Sí' : 'No';

  // Centrar el mapa en la ubicación del dispositivo
  map.setView([lat, lon], 18);

  // Añadir un nuevo marcador para el dispositivo
  if (!marker) {
    marker = L.marker([lat, lon]).addTo(map);
  } else {
    marker.slideTo([lat, lon], {
      duration: 1000,
      keepAtCenter: true
    });
  }
  // Mostrar información del dispositivo en un popup

  // Forzar una actualización del mapa
  map.invalidateSize();

  // Asegurar que el mapa se centre después de un breve retraso
  setTimeout(() => {
    map.setView([lat, lon], 18);
    map.invalidateSize();
  }, 100);

  console.log('Marcador añadido y mapa centrado');
  Swal.close(); // Cerrar el indicador de carga
}
async function startTracking(device) {
  // Conectar al servidor WebSocket
  const response = await fetch(`http://13.219.21.71/devices/status/${device.imei}`);
    if (!response.ok) {
      throw new Error('Error en la respuesta de la API');
    }
    const data = await response.json();
    showDeviceOnMap(data); // Mostrar la última ubicación en el mapa

  if (ws) {
    ws.close();
  }
  ws = new WebSocket('ws://13.219.21.71');

  ws.onopen = () => {
    console.log('Conectado al servidor WebSocket');
    // Enviar el IMEI del dispositivo para obtener actualizaciones
    ws.send(JSON.stringify({ imei: device.imei }));
  };

  ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.lat !== undefined && data.lon !== undefined) {
    showDeviceOnMap(data); // Llamar a showDeviceOnMap con los datos recibidos
  } else {
    console.error('Datos de ubicación no definidos');
    
  }
};
  ws.onclose = () => {
    console.log('Desconectado del servidor WebSocket');
  };

  ws.onerror = (error) => {
    console.error('Error en la conexión WebSocket:', error);
    Swal.fire({
      title: 'Error',
      text: 'No se pudo establecer la conexión con el servidor WebSocket.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  };
}
const sendCommand = async (commandNumber) => {
  try {
    const response = await axios.get(`http://13.219.21.71/send-command/${commandNumber}`);
    console.log(response.data);
    Swal.fire({
      title: 'Comando Enviado',
      text: `El comando ${commandNumber} ha sido enviado al GPS.`,
      icon: 'success',
      confirmButtonText: 'OK'
    });
  } catch (error) {
    console.error('Error al enviar el comando:', error.message);
    Swal.fire({
      title: 'Error',
      text: `Hubo un error al enviar el comando ${commandNumber}.`,
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
};
// Muestra una alerta con los detalles del dispositivo
const showAlert = (item) => {
  console.log(JSON.stringify(item, null, 2));
  Swal.fire({
    title: 'Detalles del Dispositivo',
    html: `
      <p><strong>Nombre:</strong> ${item.deviceName}</p>
      <p><strong>Responsable:</strong> ${item.responsible}</p>
      <p><strong>IMEI:</strong> ${item.imei}</p>
      <p><strong>Estado:</strong> ${item.status}</p>
    `,
    confirmButtonText: 'Mostrar en Mapa',
    showCancelButton: true,
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      startTracking(item); // Iniciar el seguimiento del dispositivo
      const cuadro = document.querySelector('.cuadro');
      cuadro.style.display = 'flex';
    } else {
      Swal.close(); // Cerrar el indicador de carga si se cancela
    }
  });
};

// Carga los dispositivos desde la API
const cargarDispositivos = async () => {
  try {
    const response = await fetch('http://13.219.21.71/devices');
    if (!response.ok) {
      throw new Error('Error en la respuesta de la API');
    }
    const data = await response.json();
    console.log(data);
    devices.value = data;
    filteredResults.value = devices.value;
  } catch (error) {
    console.error('Error al cargar dispositivos:', error);
  }
};

// Lifecycle hooks
onUnmounted(() => {
  if (ws) {
    ws.close();
  }
});

onMounted(() => {
  initMap();
  cargarDispositivos();
});
</script>



<style scoped>
/* Estilos del mapa */
.map-container {
  height: calc(100vh - 60px);
  width: 100%;
  z-index: 0;
}

/* Estilos generales */
.home {
  height: 100vh;
  overflow: hidden;
  position: relative;
}

/* Estilos de la barra de navegación */
.home .navar {
  background-color: var(--sidebar-color);
  border-bottom: 3px solid var(--body-color);
  z-index: 2;

}

.home .text {
  position: relative;
  z-index: 2;
}

.home .actions {
  display: flex;
  align-items: center;
}

.actions {
  display: flex;
  align-items: center;
}

.notification-btn {
  background: none;
  border: none;
  color: var(--text-colar);
  font-size: 1.7rem;
  cursor: pointer;
  margin-right: 15px;
  margin-top: 10px;
  position: relative;
}

.notification-indicator {
  position: absolute;
  right: -1px;
  width: 15px;
  height: 15px;
  background-color: var(--text-colar);
  border-radius: 50%;
}

.titulo {
  display: inline-block;
  min-width: 100px;
  /* Ajusta según sea necesario */
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropbtn {
  background-color: var(--sidebar-color);
  color: var(--text-colar);
  padding: 10px 15px;
  font-size: 16px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  border-radius: 5px;
  transition: background-color 0.3s, box-shadow 0.3s;
}

.dropbtn:hover {
  background-color: var(--body-color);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.dropdown-content {
  display: none;
  position: absolute;
  margin-right: 30px;
  background-color: var(--sidebar-color);
  min-width: 200px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  z-index: 3;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-content.show {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

.dropdown-item {
  color: var(--text-colar);
  padding: 12px 16px;
  text-decoration: none;
  display: flex;
  align-items: center;
  transition: background-color 0.2s, transform 0.2s;
}

.dropdown-item:hover {
  background-color: var(--body-color);
  transform: translateX(5px);
  color: var(--text-colar);
}

.dropdown-item i {
  margin-right: 12px;
  font-size: 1.2em;
  width: 20px;
  text-align: center;
}

.dropdown-item span {
  font-weight: 500;
}

/* Separador entre elementos */
.dropdown-item:not(:last-child) {
  border-bottom: 1px solid rgba(var(--text-colar-rgb), 0.1);
}

.hone {
  margin-left: 30px;
  width: 17%;
  background-color: var(--sidebar-color);
  height: 280px;
  position: absolute;
  top: 35%;
  z-index: 2;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  border: 1px solid;
}

.hone h1 {
  margin-top: 10px;
  font-size: 16px;
  text-align: center;
  color: var(--text-color);

}

.hone2 {
  margin-left: 30px;
  background-color: var(--sidebar-color);
  height: 50px;
  position: absolute;
  top: 25%;
  z-index: 2;
  border-radius: 10px;
  padding: 5px 15px;
  border: 1px solid;
}

.hone2 h1 {
  text-align: center;
  margin-top: 10px;
  font-size: 14px;
  color: var(--text-color);
}

.group {
  display: flex;
  line-height: 28px;
  align-items: center;
  justify-content: center;
  position: relative;
  max-width: 250px;
  margin-top: 10px;
}

.input {
  width: 100%;
  height: 40px;
  line-height: 28px;
  padding: 0 1rem;
  padding-left: 2.5rem;
  border: 2px solid;
  border-radius: 8px;
  outline: none;
  background-color: var(--body-color);
  color: var(--text-color);
  transition: .3s ease;
}

.input::placeholder {
  color: var(--text-color);
}

.icon {
  position: absolute;
  left: 1rem;
  fill: var(--text-color);
  width: 1rem;
  height: 1rem;
  font-size: 21px;

}

.device-list-container {
  flex-grow: 1;
  overflow-y: auto;
  margin-top: 10px;
}

.device-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.device-list li {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  color: var(--text-color);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.device-list li:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.device-list li i {
  margin-right: 10px;
  font-size: 21px;
  flex-shrink: 0;
}

/* Estilos para la barra de desplazamiento */
.device-list-container::-webkit-scrollbar {
  width: 6px;
}

.device-list-container::-webkit-scrollbar-track {
  background: var(--sidebar-color);
}

.device-list-container::-webkit-scrollbar-thumb {
  background-color: var(--body-color);
  border-radius: 3px;
}

.cuadro {
  background: var(--body-color);
  max-width: 320px;
  margin: 1rem auto;
  border-radius: 16px;
  box-shadow: rgba(17, 12, 46, 0.05) 0px 48px 100px 0px;
  overflow: hidden;
  position: fixed;
  top: 0;
  right: 0;
  display: none;
  margin: 4rem 20px;
}

.control-container {
  display: flex;
  flex-direction: column;
}

/* Título del dashboard */
.control-container::before {
  content: "Panel de Control";
  background: var(--body-color);
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  border-bottom: 1px solid #edf2f7;
}

/* Estilos para los párrafos de información */
.control-container p {
  margin: 0;
  padding: 0.8rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #edf2f7;
  font-size: 0.9rem;
  color: var(--text-color);
  transition: all 0.2s ease;
}

.control-container p:hover {
  background-color: var(--body-color);
}

/* Valores específicos con estilos personalizados */
.control-container p span {
  font-weight: 500;
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  background: var(--body-color);
  color: var(--text-color);
}

.button-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(to bottom, var(--body-color), var(--body-color));
}

button {
  padding: 0.8rem;
  border: none;
  border-radius: 8px;
  font-size: 0.70rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}


button:first-child { 
  background-color: #fff;
  color: #e53e3e;
  border: 1px solid #e53e3e;
}

button:first-child:hover {
  background-color: #e53e3e;
  color: white;
  box-shadow: 0 2px 8px rgba(229, 62, 62, 0.2);
}

/* Botón de encendido */
button:last-child {
  background-color: #fff;
  color: #38a169;
  border: 1px solid #38a169;
}

button:last-child:hover {
  background-color: #38a169;
  color: white;
  box-shadow: 0 2px 8px rgba(56, 161, 105, 0.2);
}

@keyframes valueChange {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }
}
</style>