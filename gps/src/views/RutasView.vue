<template>
  <div class="home">
    <div class="overlay"></div>
    <NavBar />
    <div id="map" class="map-container"></div>
    <div class="hone2">
      <h1>Rutas</h1>
    </div>
    <div class="tituloo">
      <div class="hone">
        <h1>Seleccionar Ruta</h1>
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
            <li @click="selectRoute(route)" v-for="route in filteredResults" :key="route._id">
              <i class='bx bxs-map'></i>
              {{ route.name }}
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="modal" v-if="showModal" @click.self="closeModal">
      <div class="modal-content">
        <span class="close" @click="closeModal">&times;</span>
        <h2>Guardar Ruta</h2>
        <input v-model="routeName" placeholder="Nombre de la ruta" class="inputt" @keyup.enter="saveRoute" />
        <button @click="saveRoute">Guardar Ruta</button>
      </div>
    </div>
    <div v-if="showDeviceModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="closeDeviceModal">&times;</span>
        <h2>Seleccionar Dispositivo</h2>
        <ul class="device-list-modal">
          <li v-for="device in devices" :key="device.id" class="device-item">
            <input type="checkbox" :checked="selectedDevices.includes(device)"
              @click.stop="toggleDeviceSelection(device)" />
            {{ device.deviceName }}
          </li>
        </ul>
        <button @click="confirmCreateRoute" class="create-button">Crear Ruta</button>
      </div>
    </div>

    <div class="btns">
      <button id="saveRoute" class="boton">Guardar Ruta</button>
      <button id="clearRoute" class="boton">Limpiar</button>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import NavBar from '../components/NavBar.vue';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import 'leaflet-control-geocoder/dist/Control.Geocoder.js';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import Swal from 'sweetalert2';

let map;
let waypoints = [];
let routeControl = null;
const searchQuery = ref('');
const routes = ref([]);
const filteredResults = ref([]);
const routeName = ref('');
let routeid = "";
let routeNamed = ""; // Definir routeName como una referencia reactiva
// Definir routeName como una referencia reactiva
const showModal = ref(false);
const showDeviceModal = ref(false);
const devices = ref([]);
const selectedDevices = ref([]);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
});

onMounted(() => {
  cargarRutas();
  cargarDispositivos();
  map = L.map('map').setView([10.9685, -74.7813], 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  map.on('click', function (e) {
    const latlng = e.latlng;
    waypoints.push(latlng);
    L.marker(latlng).addTo(map);

    if (waypoints.length > 1) {
      if (routeControl) {
        map.removeControl(routeControl);
      }
      routeControl = L.Routing.control({
        waypoints: waypoints,
        createMarker: function () { return null; },
        routeWhileDragging: true,
        geocoder: L.Control.Geocoder.nominatim()
      }).addTo(map);
    }
  });

  const saveRouteButton = document.getElementById('saveRoute');
  if (saveRouteButton) {
    saveRouteButton.addEventListener('click', function () {
      showModal.value = true;
    });
  }

  const clearRouteButton = document.getElementById('clearRoute');
  if (clearRouteButton) {
    clearRouteButton.addEventListener('click', function () {
      waypoints = [];
      if (routeControl) {
        map.removeControl(routeControl);
        routeControl = null;
      }
      map.eachLayer(function (layer) {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });
    });
  }
});

const cargarRutas = async () => {
  try {
    const response = await fetch('http://54.160.235.122/routes');
    if (!response.ok) {
      throw new Error('Error en la respuesta de la API');
    }
    const data = await response.json();
    routes.value = data;
    console.log('Rutas Cargadas:', routes.value);
    filteredResults.value = routes.value;
  } catch (error) {
    console.error('Error al cargar rutas:', error);
  }
};

const cargarDispositivos = async () => {
  try {
    const response = await fetch('http://54.160.235.122/devices');
    if (!response.ok) {
      throw new Error('Error en la respuesta de la API');
    }
    const data = await response.json();
    devices.value = data;
  } catch (error) {
    console.error('Error al cargar dispositivos:', error);
  }
};

const filterResults = () => {
  const query = searchQuery.value.toLowerCase();
  filteredResults.value = routes.value.filter(route => {
    return route.name.toLowerCase().includes(query);
  });
};

const selectRoute = async (route) => {
  console.log('Ruta seleccionada:', route);

  try {
    const response = await axios.get(`http://54.160.235.122/routes/get-route/${route._id}`);
    const routeData = response.data.waypoints;
    waypoints = routeData.map(point => L.latLng(point.lat, point.lng));

    const primerPunto = waypoints[0];
    const ultimoPunto = waypoints[waypoints.length - 1];
    console.log('Primer punto:', primerPunto);
    console.log('Último punto:', ultimoPunto);

    // Crear marcadores para el primer y último punto usando el ícono predeterminado
    L.marker([primerPunto.lat, primerPunto.lng]).addTo(map).bindPopup('Inicio de la ruta: ' + route.name).openPopup;
    L.marker([ultimoPunto.lat, ultimoPunto.lng]).addTo(map).bindPopup('Fin de la ruta: ' + route.name).openPopup;
    if (routeControl) {
      map.removeControl(routeControl);
    }
    routeControl = L.Routing.control({
      waypoints: waypoints,
      createMarker: function () { return null; },
      routeWhileDragging: true,
      geocoder: L.Control.Geocoder.nominatim()
    }).addTo(map);
  } catch (error) {
    console.error('Error al cargar la ruta:', error.message);
    if (error.response) {
      console.error('Error data:', error.response.data);
      console.error('Error status:', error.response.status);
      console.error('Error headers:', error.response.headers);
      alert(`Error al cargar la ruta: ${error.response.data.error}`);
    } else if (error.request) {
      console.error('Error request:', error.request);
      alert('Error al cargar la ruta: No se recibió respuesta del servidor.');
    } else {
      console.error('Error message:', error.message);
      alert(`Error al cargar la ruta: ${error.message}`);
    }
  }
};

const closeModal = () => {
  showModal.value = false;
};

const closeDeviceModal = () => {
  showDeviceModal.value = false;
};

const saveRoute = async () => {
  if (waypoints.length > 1) {
    const route = waypoints.map(point => ({ lat: point.lat, lng: point.lng }));

    try {
      const response = await axios.post('http://54.160.235.122/routes/save-route', { name: routeName.value, waypoints: route });
      console.log('Ruta guardada:', response.data);
      routeNamed = routeName.value;
      routeid = response.data._id;
      // Mostrar mensaje de confirmación con Swal.fire
      Swal.fire({
        title: 'Ruta guardada',
        text: 'La ruta ha sido guardada exitosamente en la base de datos.',
        icon: 'success',
        confirmButtonText: 'OK'
      });

      cargarRutas();
      routeName.value = '';
      closeModal();
      waypoints = [];
      map.eachLayer(function (layer) {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });
      showDeviceModal.value = true; // Mostrar el modal de selección de dispositivos
    } catch (error) {
      console.error('Error al guardar la ruta:', error.message);
      if (error.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        console.error('Error data:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
        alert(`Error al guardar la ruta: ${error.response.data.error}`);
      } else if (error.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        console.error('Error request:', error.request);
        alert('Error al guardar la ruta: No se recibió respuesta del servidor.');
      } else {
        // Algo pasó al configurar la solicitud
        console.error('Error message:', error.message);
        alert(`Error al guardar la ruta: ${error.message}`);
      }
    }
  } else {
    alert('Primero debes crear la ruta antes de guardarla.');
  }
};

const toggleDeviceSelection = (device) => {
  const index = selectedDevices.value.indexOf(device);
  if (index === -1) {
    selectedDevices.value.push(device);
  } else {
    selectedDevices.value.splice(index, 1);
  }
};

const confirmCreateRoute = async () => {
  try {
    const imeis = selectedDevices.value.map(device => device.imei);
    const routeData = {
      name: routeNamed,
      imeis: imeis
    };

    // Imprimir routeData antes de enviar
    console.log('Datos de la ruta a enviar con dispositivos:', routeData);

    // Hacer el PUT para actualizar el parámetro routeName de los dispositivos seleccionados
    const putResponse = await axios.put(`http://54.160.235.122/devices/update-route/${routeid}`, routeData);
    console.log('Dispositivos actualizados:', putResponse.data);

    // Mostrar mensaje de confirmación con Swal.fire
    Swal.fire({
      title: 'Ruta asignada y dispositivos actualizados',
      text: 'La ruta ha sido asignada y los dispositivos han sido actualizados exitosamente.',
      icon: 'success',
      confirmButtonText: 'OK'
    });

    closeDeviceModal();
  } catch (error) {
    console.error('Error al asignar la ruta y actualizar los dispositivos:', error);
    Swal.fire({
      title: 'Error',
      text: 'Hubo un error al asignar la ruta y actualizar los dispositivos.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
};
</script>


<style scoped>
.map-container {
  height: calc(100vh - 60px);
  width: 100%;
  z-index: 0;
}

.home {
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.btns {
  margin-left: 30px;
  height: 50px;
  position: absolute;
  top: 75%;
  z-index: 2;
  display: flex;
  gap: 10px;
}

.boton {
  background-color: var(--sidebar-color);
  border: none;
  color: var(--text-color);
  padding: 5px 15px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  cursor: pointer;
  border-radius: 12px;
}

.home {
  height: 100vh;
  overflow: hidden;
}

.actions {
  align-items: center;
  display: flex;
}

.dropdown {
  display: inline-block;
  position: relative;
}

.dropdown-content {
  background-color: var(--sidebar-color);
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  display: none;
  margin-right: 30px;
  min-width: 200px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  z-index: 3;
}

.dropdown-content.show {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

.dropdown-item {
  align-items: center;
  color: var(--text-colar);
  display: flex;
  padding: 12px 16px;
  text-decoration: none;
  transition: background-color 0.2s, transform 0.2s;
}

.dropdown-item:hover {
  background-color: var(--body-color);
  color: var(--text-colar);
  transform: translateX(5px);
}

.dropdown-item i {
  font-size: 1.2em;
  margin-right: 12px;
  text-align: center;
  width: 20px;
}

.dropdown-item span {
  font-weight: 500;
}

.dropdown-item:not(:last-child) {
  border-bottom: 1px solid rgba(var(--text-colar-rgb), 0.1);
}

.dropbtn {
  align-items: center;
  background-color: var(--sidebar-color);
  border: none;
  border-radius: 5px;
  color: var(--text-colar);
  cursor: pointer;
  display: flex;
  font-size: 16px;
  gap: 5px;
  padding: 10px 15px;
  transition: background-color 0.3s, box-shadow 0.3s;
}

.dropbtn:hover {
  background-color: var(--body-color);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.home .actions {
  align-items: center;
  display: flex;
}

.home .navar {
  background-color: var(--sidebar-color);
  border-bottom: 3px solid var(--body-color);
}

.home .text {
  position: relative;
  z-index: 2;
}

.notification-btn {
  background: none;
  border: none;
  color: var(--text-colar);
  cursor: pointer;
  font-size: 1.7rem;
  margin-right: 15px;
  margin-top: 10px;
  position: relative;
}

.notification-indicator {
  background-color: var(--text-colar);
  border-radius: 50%;
  height: 15px;
  position: absolute;
  right: -1px;
  width: 15px;
}

.coordinates-table {
  border-collapse: collapse;
  width: 100%;
}

.coordinates-table,
.coordinates-table th,
.coordinates-table td {
  border: 1px solid black;
  font-size: 10px;
  padding: 8px;
  text-align: center;
}

.iframe-container {
  align-items: center;
  display: flex;
  height: 650px;
  justify-content: center;
  position: relative;
  width: 100%;
}

.iframe-container iframe {
  position: relative;
  z-index: 0;
}

.tituloo {
  display: flex;
  justify-content: flex-start;
  position: relative;
  z-index: 1;
  top: -475px;
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
  font-size: 15px;
  color: var(--text-color);
}

.hone {
  margin-left: 30px;
  width: 17%;
  background-color: var(--sidebar-color);
  height: 280px;
  position: absolute;
  top: 30%;
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


.group {
  align-items: center;
  display: flex;
  justify-content: center;
  line-height: 28px;
  margin-top: 10px;
  max-width: 250px;
  position: relative;
}

.input {
  background-color: var(--body-color);
  border: 2px solid;
  border-radius: 8px;
  color: var(--text-color);
  height: 40px;
  line-height: 28px;
  outline: none;
  padding: 0 1rem;
  padding-left: 2.5rem;
  transition: .3s ease;
  width: 100%;
}

.input::placeholder {
  color: var(--text-color);
}

.icon {
  fill: #9e9ea7;
  font-size: 21px;
  height: 1rem;
  left: 1rem;
  position: absolute;
  width: 1rem;
}

.icoon {
  fill: #9e9ea7;
  font-size: 21px;
  height: 1rem;
  right: 4rem;
  position: relative;
  width: 1rem;
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

.generate-route-btn {
  padding: 4px;
  border-radius: 5px;
  border: 1px solid var(--text-color);
  margin-right: 5px;
  color: var(--text-color);
  background-color: var(--sidebar-color);
  font-weight: 600;
  cursor: pointer;
}

.dark-mode-table {
  background-color: #333;
  color: #fff;
  border: 1px solid #444;
}

.dark-mode-table th,
.dark-mode-table td {
  border: 1px solid #444;
}

.dark-mode-table th {
  background-color: #444;
}

.dark-mode-table tr:nth-child(even) {
  background-color: #555;
}

.dark-mode-table tr:nth-child(odd) {
  background-color: #666;
}

/* Fondo del modal con efecto de desenfoque */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

/* Contenido del modal */
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  transform: translateY(0);
  animation: slideIn 0.3s ease;
}

/* Título del modal */
.modal-content h2 {
  color: #2d3436;
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
}

/* Botón de cerrar */
.close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 1.5rem;
  color: #a0aec0;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: #f7fafc;
}

.close:hover {
  background: #edf2f7;
  color: #4a5568;
  transform: rotate(90deg);
}

/* Input personalizado */
.inputt {
  width: 100%;
  padding: 0.8rem 1rem;
  border: 2px solid #edf2f7;
  border-radius: 8px;
  font-size: 1rem;
  color: #4a5568;
  transition: all 0.2s ease;
  margin-bottom: 1.5rem;
  outline: none;
}

.inputt:focus {
  border-color: #4299e1;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.inputt::placeholder {
  color: #a0aec0;
}

/* Botón de guardar */
.modal-content button {
  width: 100%;
  padding: 0.8rem;
  background: var(--sidebar-color);
  color: var(--text-colar);
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modal-content button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.2);
}

.modal-content button:active {
  transform: translateY(0);
}

/* Animaciones */
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Animación de salida */
.modal.closing {
  animation: fadeOut 0.3s ease forwards;
}

.modal.closing .modal-content {
  animation: slideOut 0.3s ease forwards;
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }

  to {
    opacity: 0;
    transform: translateY(20px);
  }
}


.device-list-modal {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
}

.device-item {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin: 5px 0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.device-item:hover {
  background-color: #f0f0f0;
}

.create-button {
  background-color: #4CAF50;
  /* Verde */
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 15px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
  transition: background-color 0.3s;
}

.create-button:hover {
  background-color: #45a049;
  /* Verde más oscuro */
}
</style>