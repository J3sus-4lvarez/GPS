<template>
    <section class="home">
        <div class="overlay"></div>
        <NavBar />
        <div class="report">
            <div class="titu">
                <h1><i class='bx bxs-report icoon'></i> Reporte del Dispositivo</h1>
            </div>
            <div class="search-container">
                <div class="group">
                    <button class="button" type="button" @click="downloadReport">
                        <span class="button__text">Download</span>
                        <span class="button__icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35"
                                id="bdd05811-e15d-428c-bb53-8661459f9307" data-name="Layer 2" class="svg">
                                <path
                                    d="M17.5,22.131a1.249,1.249,0,0,1-1.25-1.25V2.187a1.25,1.25,0,0,1,2.5,0V20.881A1.25,1.25,0,0,1,17.5,22.131Z">
                                </path>
                                <path
                                    d="M17.5,22.693a3.189,3.189,0,0,1-2.262-.936L8.487,15.006a1.249,1.249,0,0,1,1.767-1.767l6.751,6.751a.7.7,0,0,0,.99,0l6.751-6.751a1.25,1.25,0,0,1,1.768,1.767l-6.752,6.751A3.191,3.191,0,0,1,17.5,22.693Z">
                                </path>
                                <path
                                    d="M31.436,34.063H3.564A3.318,3.318,0,0,1,.25,30.749V22.011a1.25,1.25,0,0,1,2.5,0v8.738a.815.815,0,0,0,.814.814H31.436a.815.815,0,0,0,.814-.814V22.011a1.25,1.25,0,1,1,2.5,0v8.738A3.318,3.318,0,0,1,31.436,34.063Z">
                                </path>
                            </svg></span>
                    </button>
                </div>
                <div class="select">
                    <input type="text" readonly
                        :value="selectedDevice ? selectedDevice.deviceName : 'Seleccione un dispositivo'"
                        @click="toggleDeviceDropdown" />
                    <i class="arrow" @click="toggleDeviceDropdown">&#9660;</i>
                </div>
                <ul v-if="deviceDropdownOpen" class="dropdown-menu">
                    <li v-for="device in devices" :key="device.imei" @click="selectDevice(device)">
                        <i class='bx bxs-bus iconn'></i>
                        <span>{{ device.deviceName }}</span>
                    </li>
                </ul>
            </div>
            <div class="tabla">
                <table>
                    <thead>
                        <tr>
                            <th>Notificación</th>
                            <th>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="alert in alerts" :key="alert._id">
                            <td>{{ alert.alertName }}</td>
                            <td>{{formatDate(utc(alert.alertTime)) }}</td>
                        </tr>
                        <tr v-if="alerts.length === 0">
                            <td colspan="2">No hay alertas disponibles</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios'
import imgPath from '../assets/LP.png'; // Importa la imagen aquí
import iziToast from 'izitoast';
import NavBar from '../components/NavBar.vue';
import  { formatDate, utc } from '../../Back-end/utils/formatearFecha';
// Variables reactivas
const devices = ref([]);
const deviceDropdownOpen = ref(false);
const selectedDevice = ref(null);
const displayedText = ref("");
const dropdownOpen = ref(false);
const fullText = "Navify";
let currentIndex = 0;
let isDeleting = false;
let typingInterval;
const isDownloading = ref(false);
const alerts = ref([]);

const cargarDispositivos = async () => {
    try {
        const response = await fetch('http://54.160.235.122/devices');
        if (!response.ok) {
            throw new Error('Error en la respuesta de la API');
        }
        const data = await response.json();
        devices.value = data
    } catch (error) {
        console.error('Error al cargar dispositivos:', error);
    }
};

const selectDevice = async (device) => {
    console.log('Dispositivo seleccionado:', device); // Verifica el dispositivo seleccionado
    if (!device.imei) {
        console.error('IMEI del dispositivo no disponible');
        return;
    }
    selectedDevice.value = device;
    deviceDropdownOpen.value = false;
    await cargarAlertas(device.imei); // Llamada para cargar alertas
};


const toggleDeviceDropdown = () => {
    deviceDropdownOpen.value = !deviceDropdownOpen.value;
};

// Datos de la tabla como un array
const reportData = ref([
    { placa: "ABC123", notificacion: "Alerta de velocidad", fecha: "2023-10-01" },
    { placa: "XYZ456", notificacion: "Entrada a geozona", fecha: "2023-10-02" },
    { placa: "LMN789", notificacion: "Alerta de batería baja", fecha: "2023-10-03" },
    { placa: "DEF012", notificacion: "Reporte de actividad", fecha: "2023-10-04" },
    { placa: "GHI345", notificacion: "Salida de geozona", fecha: "2023-10-05" },
    { placa: "JKL678", notificacion: "Alerta de conexión", fecha: "2023-10-06" },
    { placa: "MNO901", notificacion: "Reporte de error", fecha: "2023-10-07" },
    { placa: "PQR234", notificacion: "Geozona activada", fecha: "2023-10-08" },
    { placa: "STU567", notificacion: "Alerta de movimiento", fecha: "2023-10-09" },
]);

// Variable para el buscador
const searchQuery = ref("");
const filteredReportData = computed(() => {
    if (!searchQuery.value) {
        return reportData.value;
    }
    return reportData.value.filter(row => {
        return Object.values(row).some(value =>
            String(value).toLowerCase().includes(searchQuery.value.toLowerCase())
        );
    });
});

// Función para descargar el reporte en PDF
const downloadReport = () => {
    isDownloading.value = true;

    const doc = new jsPDF();

    const img = new Image();
    img.src = imgPath; // Usa la variable importada

    img.onload = () => {
        doc.addImage(img, 'PNG', 13, 2, 15, 15);
        doc.text("Reporte del dispositivo", 13, 27);

        // Encabezado de la tabla
        const headers = [["Notificación", "Fecha"]];
        const data = filteredReportData.value.map(row => [row.notificacion, row.fecha]);

        // Establecer el estilo del encabezado
        doc.autoTable({
            head: headers,
            body: data,
            startY: 30, // Ajustar la posición de inicio de la tabla
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] }, // Color de fondo del encabezado
            styles: { cellPadding: 5, fontSize: 10 },
        });

        doc.save("reporte_dispositivo.pdf");

        setTimeout(() => {
            isDownloading.value = false;
        }, 2000);
    };

    img.onerror = () => {
        console.error("Error al cargar la imagen.");
        isDownloading.value = false;
    };
};

// Alterna la visibilidad del menú desplegable principal
const toggleDropdown = () => {
    dropdownOpen.value = !dropdownOpen.value;
};

// Crea un efecto de escritura para el texto del título
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

const cargarAlertas = async (imei) => {
    if (!imei) {
        console.error('IMEI no válido');
        return;
    }
    try {
        // Hacer la solicitud para obtener alertas por IMEI
        const response = await fetch(`http://54.160.235.122/devices/alerts/${imei}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error del servidor:', errorText);
            return;
        }
        const data = await response.json();
        console.log(data); // Verifica los datos recibidos
        alerts.value = data;

        // Ordenar las alertas por fecha en orden descendente
        alerts.value.sort((a, b) => new Date(b.alertTime) - new Date(a.alertTime));

        // Mostrar alerta si hay una alerta en la respuesta
        if (data.alert) {
            iziToast.warning({
                title: 'Alerta',
                message: data.alert.alertName,
                position: 'topRight',
                timeout: 5000 // Mostrar la alerta durante 5 segundos
            });
        }
    } catch (error) {
        console.error('Error al cargar alertas:', error);
        alerts.value = [];
    }
};


// Llama a la función en el ciclo de vida
onMounted(() => {
    cargarDispositivos();
    typeEffect();
});

onUnmounted(() => {
    clearTimeout(typingInterval);
});
</script>


<style scoped>
.submenu {
    margin-top: 10px;
    position: relative;
}

.select {
    position: relative;
    display: flex;
    align-items: center;
    width: 30%;
}

.select input {
    width: 100%;
    padding: 12px 15px;
    padding-right: 30px;
    border: 1px solid var(--text-colar);
    border-radius: 8px;
    cursor: pointer;
    background-color: var(--sidebar-color);
    color: var(--text-colar);
    font-weight: 500;
    transition: all 0.3s ease;
}

.select input:hover {
    border-color: var(--primary-color);
}

.select .arrow {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-colar);
    pointer-events: none;
    transition: transform 0.3s ease;
}

.select:hover .arrow {
    transform: translateY(-50%) rotate(180deg);
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 87%;
    width: 10%;
    background-color: var(--sidebar-color);
    border: 2px solid var(--text-colar);
    border-top: none;
    border-radius: 0 0 8px 8px;
    list-style-type: none;
    padding: 0;
    margin: 0;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.dropdown-menu li {
    padding: 12px 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    color: var(--text-colar);
    transition: background-color 0.3s ease;
}

.dropdown-menu li:hover {
    background-color: var(--primary-color-light);
}

.dropdown-menu .iconn {
    margin-right: 15px;
    font-size: 1.2em;
    color: var(--text-colar);
}

.home {
    min-height: 160vh;
}

.home .navar {
    background-color: var(--sidebar-color);
    border-bottom: 3px solid var(--body-color);
}

.home .text {
    position: relative;
    z-index: 2;
}

.home .actions {
    display: flex;
    align-items: center;
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
    z-index: 1;
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

.titu {
    margin-left: 50px;
    margin-top: 40px;
    display: flex;
    color: var(--text-colar);
}

::-webkit-scrollbar {
    width: 6px;
}
::-webkit-scrollbar-track {
    background: var(--sidebar-color);
}
::-webkit-scrollbar-thumb {
    background-color: var(--text-colar);
    border-radius: 3px;
}

.tabla {
    margin: 20px auto;
    width: 90%;
    max-height: 500px;
    overflow-y: auto;
}

.tabla table {
    width: 100%;
    border: 1px solid var(--text-colar);
    border-radius: 10px;
    border: none;
    border-collapse: collapse;
}

.tabla th,
.tabla td {
    border: 1px solid var(--text-colar);
    padding: 10px;
    text-align: center;
}

.tabla th {
    background-color: var(--sidebar-color);
    color: var(--text-colar);
}

.tabla tr td {
    color: var(--text-colar)
}

.tabla tr:nth-child(even) {
    background-color: rgba(var(--text-colar-rgb), 0.1);
}

.tabla tr:hover {
    background-color: var(--body-color);
}

.search-container {
    margin: 20px 0px 0px 70px;
    position: relative;
    display: flex;
    width: 90%;

}

.search-input {
    width: 20%;
    padding: 10px 10px 10px 40px;
    border: 2px solid var(--text-colar);
    border-radius: 8px;
    outline: none;
    background-color: var(--body-color);
    color: var(--text-color);
    transition: .3s ease;
}

.search-input::placeholder {
    color: var(--text-color);
}

.icon {
    position: absolute;
    left: 1rem;
    fill: var(--text-color);
    width: 1rem;
    height: 1rem;
    font-size: 21px;
    top: 50%;
    transform: translateY(-50%);
}

/* From Uiverse.io by andrew-demchenk0 */
.button {
    position: relative;
    width: 150px;
    height: 40px;
    cursor: pointer;
    display: flex;
    align-items: center;
    border: 2px solid var(--text-colar);
    box-shadow: 4px 4px var(--text-colar);
    background-color: var(--sidebar-color);
    border-radius: 10px;
    overflow: hidden;
    color: var(--text-colar);
}

.button,
.button__icon,
.button__text {
    transition: all 0.3s;
}

.button .button__text {
    transform: translateX(22px);
    color: var(--text-colar);
    font-weight: 600;
}

.button .button__icon {
    position: absolute;
    transform: translateX(109px);
    height: 100%;
    width: 39px;
    background-color: var(--body-color);
    display: flex;
    align-items: center;
    justify-content: center;
}

.button .svg {
    width: 20px;
    fill: var(--text-colar);
}

.button:hover {
    background: var(--body-color);
}

.button:hover .button__text {
    color: transparent;
}

.button:hover .button__icon {
    width: 148px;
    transform: translateX(0);
}

.button:active {
    transform: translate(3px, 3px);
    box-shadow: 0px 0px var(--main-color);
}

.group {
    display: flex;
    justify-content: space-between;
    width: 94%;
}
</style>