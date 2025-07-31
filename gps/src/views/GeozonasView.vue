<template>
  <section class="home">
    <div class="overlay"></div>
    <NavBar />
    <div class="hone2">
      <h1>Geozona</h1>
    </div>
    <div class="tituloo">
      <div class="hone">
        <h1>Crear Geozonas</h1>
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
            <li @click="selectGeozone(item)" v-for="item in filteredResults" :key="item._id">
              <i class='bx bxs-car'></i>
              {{ item.name }}
            </li>
          </ul>
        </div>
      </div>

      <div id="map" class="map-container"></div>
    </div>
    <div class="modal" v-if="showModal" @click.self="closeModal">
      <div class="modal-content">
        <span class="close" @click="closeModal">&times;</span>
        <h2>Guardar Geozona</h2>
        <input v-model="geozoneName" placeholder="Nombre de la geozona" class="inputt" @keyup.enter="saveGeozone" />
        <button @click="saveGeozone">Guardar Geozona</button>
      </div>
    </div>
    <!-- Modal para seleccionar dispositivo -->
    <div v-if="showDeviceModal" class="modal">
      <div class="modal-content">
        <span class="close" @click="closeDeviceModal">&times;</span>
        <h2>Seleccionar Dispositivo</h2>
        <ul class="device-list-modal">
          <li v-for="device in devices" :key="device.id" class="device-item">
            <input type="checkbox" :checked="selectedDevices.includes(device)" @click="toggleDeviceSelection(device)" />
            {{ device.deviceName }}
          </li>
        </ul>
        <button @click="confirmCreateGeozona" class="create-button">Crear Geozona</button>
      </div>
    </div>
  </section>
</template>


<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import NavBar from '../components/NavBar.vue';
import * as L from 'leaflet';
import Swal from 'sweetalert2';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

const map = ref(null);
const drawnItems = ref(new L.FeatureGroup());
const searchQuery = ref('');
const geozones = ref([]);
const filteredResults = ref([]);
const selectedGeozone = ref(null); // Referencia reactiva para almacenar la geozona seleccionada
const geozoneShapes = ref({});
const dropdownOpen = ref(false);
import { formatDate, utc } from '../../Back-end/utils/formatearFecha';
const fullText = "Navify";
const displayedText = ref("");
let currentIndex = 0;
let isDeleting = false;
let typingInterval;
let routingControl = null;
let geozoneMarker = null;
let coordinates = null;
let ws = null;

const deviceName = ref('');
const showModal = ref(false);
const showDeviceModal = ref(false);
const geozoneName = ref('');
const selectedDevices = ref([]);
const devices = ref([]); // Variable reactiva para almacenar los dispositivos

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl
});

const typeEffect = () => {
  const current = currentIndex;

  if (!isDeleting && current < fullText.length) {
    displayedText.value = fullText.slice(0, current + 1);
    currentIndex++;
    if (currentIndex === fullText.length) {
      typingInterval = setTimeout(() => {
        isDeleting = true;
        typeEffect();
      }, 5000);
      return;
    }
  } else if (isDeleting && current > 0) {
    displayedText.value = fullText.slice(0, current - 1);
    currentIndex--;
  } else {
    isDeleting = false;
    currentIndex = 0;
  }

  const typingSpeed = isDeleting ? 100 : 200;
  typingInterval = setTimeout(typeEffect, typingSpeed);
};

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value;
};

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
  if (!map.value) {
    console.error('El mapa no está inicializado');
    return;
  }
  map.value.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      map.value.removeLayer(layer);
    }
  });
  // Limpiar marcadores existentes

  // Centrar el mapa en la ubicación del dispositivo

  // Añadir un nuevo marcador para el dispositivo
  const marker = L.marker([lat, lon]).addTo(map.value);

  // Mostrar información del dispositivo en un popup
  marker.bindPopup(`
    <b>${name}</b><br>
    Tiempo: ${formatDate(utc(fixTime))}<br>
    Velocidad: ${speed} km/h <br>
  `).openPopup();

  // Forzar una actualización del mapa
  map.value.invalidateSize();

  // Asegurar que el mapa se centre después de un breve retraso
  setTimeout(() => {
    map.value.setView([lat, lon], 18);
    map.value.invalidateSize();
  }, 100);

  console.log('Marcador añadido y mapa centrado');
  Swal.close(); // Cerrar el indicador de carga
}



async function startTracking(device) {
  try {
    // Conectar al servidor WebSocket
    const response = await fetch(`http://18.223.186.201/devices/status/${device.imei}`);
    if (!response.ok) {
      throw new Error('Error en la respuesta de la API');
    }
    const data = await response.json();
    showDeviceOnMap(data);
  } catch (error) {
    console.error('Error al iniciar el seguimiento:', error);
    // Aquí puedes manejar el error de manera adecuada, por ejemplo, mostrando un mensaje al usuario
    alert('Hubo un problema al iniciar el seguimiento del dispositivo. Por favor, inténtalo de nuevo más tarde.');
  }
}




const cargarDispositivos = async () => {
  try {
    const response = await fetch('http://18.223.186.201/devices');
    if (!response.ok) {
      throw new Error('Error en la respuesta de la API');
    }
    const data = await response.json();
    console.log(data);
    devices.value = data;

 // Actualizar los resultados filtrados
  } catch (error) {
    console.error('Error al cargar dispositivos:', error);
  }
};

const cargarGeozonas = async () => {
  try {
    const response = await fetch('http://18.223.186.201/geozone/geozones');
    if (!response.ok) {
      throw new Error('Error en la respuesta de la API');
    }
    const data = await response.json();
    geozones.value = data.filter(item => item.name); // Filtrar geozonas sin nombre
    filteredResults.value=geozones.value
    console.log('Geozonas cargadas:', geozones.value);
// Actualizar los resultados filtrados
  } catch (error) {
    console.error('Error al cargar geozonas:', error);
  }
};
const initMap = () => {
  if (!map.value) {
    map.value = L.map('map').setView([10.96854, -74.78132], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map.value);

    drawnItems.value.addTo(map.value);

    map.value.pm.addControls({
      position: 'topright',
      drawPolygon: true,
      drawPolyline: true,
      drawRectangle: true,
      drawCircle: true,
      drawCircleMarker: false,
      drawMarker: false,
      editMode: true,
      deleteMode: true,
      createZone: true,
    });

    map.value.on('pm:create', (e) => {
      const layer = e.layer;
      drawnItems.value.addLayer(layer);

      if (layer instanceof L.Circle) {
        coordinates = {
          center: layer.getLatLng(),
          radius: layer.getRadius()
        };
        console.log('Circunferencia creada - Centro:', coordinates.center, 'Radio:', coordinates.radius);
      } else {
        coordinates = layer.getLatLngs();
        console.log('Coordenadas de la geozona creada:', coordinates);
      }

      showModal.value = true; // Mostrar el modal para guardar la geozona
    });

    map.value.on('pm:remove', (e) => {
      console.log('Forma eliminada:', e.layer);
    });
  }
};

const storeShape = (layer, geozoneId) => {
  if (!geozoneShapes.value[geozoneId]) {
    geozoneShapes.value[geozoneId] = [];
  }
  geozoneShapes.value[geozoneId].push(layer);
};

const showGeozoneOnMap = (geozone) => {
  if (!map.value) {
    console.error('El mapa no está inicializado');
    return;
  }

  // Limpiar las capas existentes
  drawnItems.value.clearLayers();

  let layer;
  if (geozone.type === 'Circle') {
    const center = L.latLng(geozone.center.lat, geozone.center.lng);
    layer = L.circle(center, { radius: geozone.radius }).addTo(map.value);
    map.value.setView(center, 15);
  } else if (geozone.type === 'Polygon') {
    const vertices = geozone.vertices.map(vertex => [vertex.lat, vertex.lng]);
    layer = L.polygon(vertices).addTo(map.value);
    map.value.fitBounds(layer.getBounds());
  }

  drawnItems.value.addLayer(layer);
  layer._permanent = true;
};

const selectGeozone = (geozone) => {
  selectedGeozone.value = geozone; // Almacenar la geozona seleccionada en selectedGeozone

  if (geozoneShapes.value[geozone.id]) {
    geozoneShapes.value[geozone.id].forEach(layer => {
      drawnItems.value.addLayer(layer);
    });
  } else {
    showGeozoneOnMap(geozone);
  }
};

const deleteLastShape = () => {
  if (!selectedGeozone.value || !geozoneShapes.value[selectedGeozone.value.id]) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No hay formas asociadas a esta geozona.',
    });
    return;
  }

  const shapesForGeozone = geozoneShapes.value[selectedGeozone.value.id];
  if (shapesForGeozone.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Sin Geozonas',
      text: 'Esta geozona no tiene formas creadas.',
    });
    return;
  }

  const lastShape = shapesForGeozone.pop();
  if (lastShape) {
    map.value.removeLayer(lastShape);
    Swal.fire({
      icon: 'success',
      title: 'Geozona Eliminada',
      text: 'La última forma creada ha sido eliminada.',
    });
  }
};

const filterResults = () => {
  const query = searchQuery.value.toLowerCase();
  filteredResults.value = [
    ...devices.value.filter(item => item.deviceName.toLowerCase().includes(query)),
    ...geozones.value.filter(item => item.name && item.name.toLowerCase().includes(query))
  ];
};


const openModal = () => {
  showDeviceModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  showDeviceModal.value = false;
};

const toggleDeviceSelection = (device) => {
  const index = selectedDevices.value.indexOf(device);
  if (index > -1) {
    // Si el dispositivo ya está seleccionado, lo eliminamos
    selectedDevices.value.splice(index, 1);
  } else {
    // Si no está seleccionado, lo agregamos
    selectedDevices.value.push(device);
  }
  // Imprimir selectedDevices después de cada cambio
  console.log('Dispositivos seleccionados:', selectedDevices.value);
};

const saveGeozone = async () => {
  let geozoneData;

  if (coordinates.center) {
    geozoneData = {
      name: geozoneName.value,
      type: 'Circle',
      center: {
        lat: coordinates.center.lat,
        lng: coordinates.center.lng
      },
      radius: coordinates.radius
    };
  } else {
    geozoneData = {
      name: geozoneName.value,
      type: 'Polygon',
      vertices: coordinates[0].map(latlng => ({
        lat: latlng.lat,
        lng: latlng.lng
      }))
    };
  }

  // Guardar la geozona en la base de datos y abrir el modal de dispositivos
  try {
    const response = await axios.post('http://18.223.186.201/geozone/geozones', geozoneData);
    console.log('Geozona guardada:', response.data);
    selectedGeozone.value = response.data; // Almacenar la geozona creada en selectedGeozone
  
      showModal.value = false;
      showDeviceModal.value = true; // Mostrar el modal de dispositivos
      await cargarDispositivos(); // Actualizar la lista de dispositivos
      await cargarGeozonas(); // Actualizar la lista de geozonas
       // Actualizar los resultados filtrados
  } catch (error) {
    console.error('Error al crear la geozona:', error.response ? error.response.data : error.message);
    Swal.fire({
      title: 'Error',
      text: `Hubo un error al crear la geozona: ${error.response ? JSON.stringify(error.response.data) : error.message}`,
      icon: 'error'
    });
  }
};

const confirmCreateGeozona = async () => {
  if (selectedDevices.value.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Sin selección',
      text: 'Por favor, selecciona al menos un dispositivo para asignar a la geozona.',
    });
    return;
  }

  try {
    const imeis = selectedDevices.value.map(device => device.imei);
    const geozoneData = {
      name: selectedGeozone.value.name, // Solo enviar el nombre de la geozona
      imeis: imeis
    };

    // Imprimir geozoneData antes de enviar
    console.log('Datos de la geozona a enviar con dispositivos:', geozoneData);

    const response = await axios.put(`http://18.223.186.201/devices/geozones/${selectedGeozone.value._id}`, geozoneData);
    console.log('Geozona y dispositivos asignados guardados:', response.data);
    Swal.fire({
      title: 'Geozona actualizada',
      text: 'La geozona y los dispositivos han sido actualizados exitosamente.',
      icon: 'success'
    }).then(() => {
      closeModal();
    });
  } catch (error) {
    console.error('Error al actualizar la geozona y los dispositivos:', error);
    Swal.fire({
      title: 'Error',
      text: 'Hubo un error al actualizar la geozona y los dispositivos.',
      icon: 'error'
    });
  }
};
const intervalId = setInterval(() => {
  startTracking(devicea);
}, 2000);
const devicea = {
  imei: "863829070233398",
};
onMounted(() => {
  cargarDispositivos();
  initMap();
  cargarGeozonas();
  typeEffect();
  startTracking(devicea);
});

onUnmounted(() => {
  clearInterval(intervalId);
  clearTimeout(typingInterval);
  if (routingControl) {
    map.value.removeControl(routingControl);
  }
});
</script>
<style scoped>
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

.titulo {
  display: inline-block;
  min-width: 100px;
}

#map {
  height: calc(100vh - 60px);
  width: 100%;
  z-index: 0;
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

.generate-route-btn{
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
  background-color: #4CAF50; /* Verde */
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
  background-color: #45a049; /* Verde más oscuro */
}

</style>