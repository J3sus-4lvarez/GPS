<template>
  <section class="home">
    <div class="overlay"></div>
    <NavBar />

    <div class="crud">
      <div class="titu">
        <h1><i class='bx bx-car icoon'></i> Mis Dispositivos</h1>
      </div>

      <div class="listad">
        <div>
          <h1>Lista de Dispositivos</h1>
        </div>

        <div class="boton cssbuttons-io-button">
          <button @click="insertarDispositivo()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"></path>
            </svg>
            <span>Agregar Dispositivo</span>
          </button>
        </div>
      </div>

      <div class="cruds">
        <div class="arriba">
          <div>
            <i class='bx bx-location-plus iconD'></i>
          </div>
          <div class="group">
            <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
              <g>
                <path
                  d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z">
                </path>
              </g>
            </svg>
            <input placeholder="Buscar" type="search" class="input" v-model="searchTerm">
          </div>
        </div>

        <div class="tabla">
          <table>
            <thead>
              <tr>
                <th>Id</th>
                <th>Dispositivo</th>
                <th>Responsable</th>
                <th>IMEI</th>
                <th>Teléfono</th> <!-- Nueva columna -->
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dispositivo, index) in filteredDispositivos" :key="dispositivo._id">
                <td>{{ index + 1 }}</td>
                <td>{{ dispositivo.deviceName }}</td>
                <td>{{ dispositivo.responsible }}</td>
                <td>{{ dispositivo.imei }}</td>
                <td>{{ dispositivo.phoneNumber }}</td> <!-- Nueva celda -->
               
                <td>
                  <i class='bx bx-edit iconD' @click="editarDispositivo(index)"></i>
                  <i class='bx bx-trash iconD' @click="eliminarDispositivo(index)"></i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Swal from 'sweetalert2';
import NavBar from '../components/NavBar.vue';

// Variables reactivas
const dropdownOpen = ref(false);
const searchTerm = ref('');
const dispositivos = ref([]);
const displayedText = ref("");

// Variables para el efecto de texto
const fullText = "Navify";
let currentIndex = 0;
let isDeleting = false;
let typingInterval;

// Computed properties
const filteredDispositivos = computed(() => {
  return dispositivos.value.filter(dispositivo =>
    dispositivo.deviceName.toLowerCase().includes(searchTerm.value.toLowerCase())
  );
});

// Funciones auxiliares
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

// Funciones principales
const cargarDispositivos = async () => {
  try {
    const response = await fetch('http://13.219.21.71/devices');
    if (!response.ok) {
      throw new Error('Error en la respuesta de la API');
    }
    const data = await response.json();
    console.log('Respuesta de la API:', data);
    dispositivos.value = data;
  } catch (error) {
    console.error('Error al cargar dispositivos:', error);
  }
};

const editarDispositivo = (index) => {
  const dispositivo = dispositivos.value[index];

  Swal.fire({
    title: 'Editar Dispositivo',
    html: ` 
      <input id="nombre" class="swal2-input" placeholder="Nombre" value="${dispositivo.deviceName}">
      <input id="responsable" class="swal2-input" placeholder="Responsable" value="${dispositivo.responsible}">
      <input id="imei" class="swal2-input" placeholder="IMEI" value="${dispositivo.imei}">
      <input id="telefono" class="swal2-input" placeholder="Teléfono" value="${dispositivo.phoneNumber || ''}"> <!-- Nuevo campo -->
      <input id="estatus" class="swal2-input" placeholder="Estatus" value="${dispositivo.status}">
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const nombre = document.getElementById('nombre').value;
      const responsable = document.getElementById('responsable').value;
      const imei = document.getElementById('imei').value;
      const telefono = document.getElementById('telefono').value; // Nuevo campo
      const estatus = document.getElementById('estatus').value;

      if (!nombre || !responsable || !imei || !estatus) {
        Swal.showValidationMessage('Por favor, complete todos los campos obligatorios.');
        return false;
      }

      return { 
        deviceName: nombre, 
        responsible: responsable, 
        imei, 
        phoneNumber: telefono, // Nuevo campo
        status: estatus 
      };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`http://13.219.21.71/devices/${dispositivo._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(result.value)
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Error al editar dispositivo');
          }
          return response.json();
        })
        .then(data => {
          dispositivos.value.splice(index, 1, data);
          console.log('Dispositivo editado:', data);
          Swal.fire('¡Dispositivo editado!', '', 'success');
        })
        .catch((error) => {
          console.error('Error al editar dispositivo:', error);
          Swal.fire('Error', 'No se pudo editar el dispositivo', 'error');
        });
    }
  });
};

const eliminarDispositivo = (index) => {
  const dispositivo = dispositivos.value[index];

  Swal.fire({
    title: '¿Estás seguro?',
    text: `¿Deseas eliminar el dispositivo ${dispositivo.deviceName}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      fetch(`http://13.219.21.71/devices/${dispositivo._id}`, {
        method: 'DELETE'
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Error al eliminar dispositivo');
          }
          return response.json();
        })
        .then(() => {
          dispositivos.value.splice(index, 1);
          console.log('Dispositivo eliminado:', dispositivo);
          Swal.fire('¡Dispositivo eliminado!', '', 'success');
        })
        .catch((error) => {
          console.error('Error al eliminar dispositivo:', error);
          Swal.fire('Error', 'No se pudo eliminar el dispositivo', 'error');
        });
    }
  });
};

const insertarDispositivo = async () => {
  const { value: imei } = await Swal.fire({
    title: 'Agregar Dispositivo',
    html: ` 
      <input id="nombre" class="swal2-input" placeholder="Nombre del dispositivo">
      <input id="responsable" class="swal2-input" placeholder="Responsable">
      <input id="imei" class="swal2-input" placeholder="IMEI">
      <input id="telefono" class="swal2-input" placeholder="Teléfono"> <!-- Nuevo campo -->
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Agregar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const nombre = document.getElementById('nombre').value;
      const responsable = document.getElementById('responsable').value;
      const imei = document.getElementById('imei').value;
      const telefono = document.getElementById('telefono').value; // Nuevo campo

      if (!nombre || !responsable || !imei) {
        Swal.showValidationMessage('Por favor, complete todos los campos obligatorios.');
        return false;
      }

      const existingDevice = dispositivos.value.find(device => device.imei === imei);
      if (existingDevice) {
        Swal.showValidationMessage('El IMEI ya está en uso.');
        return false;
      }

      return { 
        deviceName: nombre, 
        responsible: responsable, 
        imei, 
        phoneNumber: telefono, // Nuevo campo
      };
    }
  });

  if (imei) {
    fetch('http://13.219.21.71/devices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(imei)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al agregar dispositivo');
        }
        return response.json();
      })
      .then(data => {
        dispositivos.value.push(data);
        Swal.fire('¡Dispositivo agregado!', '', 'success');
      })
      .catch((error) => {
        console.error('Error al agregar dispositivo:', error);
        Swal.fire('Error', 'No se pudo agregar el dispositivo', 'error');
      });
  }
};

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value;
};

// Hooks del ciclo de vida
onMounted(() => {
  typeEffect();
  cargarDispositivos();
});

onUnmounted(() => {
  clearTimeout(typingInterval);
});
</script>

<style scoped>
/* Estilos generales */
.home {
  height: 100vh;
  overflow: hidden;
}

/* Estilos de la barra de navegación */
.actions {
  display: flex;
  align-items: center;
}

.dropdown {
  position: relative;
  display: inline-block;
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
  display: flex;
  align-items: center;
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

/* Estilos de la sección CRUD */
.crud {
  display: flex;
  flex-direction: column;
}

.cruds {
  background-color: var(--sidebar-color);
  border-radius: 10px;
  height: 500px;
  margin: 20px 20px;
  padding: 15px;
}

.cruds .arriba {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.cruds .tabla {
  background-color: var(--sidebar-color);
  margin: 20px 10px;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px 10px;
}

.cssbuttons-io-button button {
  align-items: center;
  background: var(--body-color);
  border: 1px solid;
  border-radius: 20em;
  color: var(--text-colar);
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  padding: 0.5em 1.4em;
  transition: box-shadow 0.3s ease;
}

.cssbuttons-io-button button:active {
  box-shadow: 0 0.3em 1em -0.5em #14a73e98;
}

.cssbuttons-io-button button:hover {
  box-shadow: 0 0.5em 1.5em -0.5em #d5010198;
}

.cssbuttons-io-button button svg {
  margin-right: 6px;
}

.group {
  align-items: center;
  display: flex;
  line-height: 28px;
  max-width: 190px;
  position: relative;
}

.icon {
  fill: var(--text-colar);
  height: 1rem;
  left: 1rem;
  position: absolute;
  width: 1rem;
}

.iconD {
  color: var(--text-colar);
  font-size: 30px;
}

.input {
  background-color: var(--sidebar-color);
  border: 2px solid;
  border-radius: 8px;
  color: var(--text-colar);
  height: 40px;
  line-height: 28px;
  outline: none;
  padding: 0 1rem;
  padding-left: 2.5rem;
  transition: .3s ease;
  width: 100%;
}

.input::placeholder {
  color: var(--text-colar);
}

.listad {
  align-items: center;
  display: flex;
  font-size: 12px;
  justify-content: space-between;
  margin-left: 50px;
  margin-top: 10px;
}

.listad .boton {
  margin-right: 50px;
}

.listad h1 {
  color: var(--text-colar);
  font-weight: 400;
}

.titu {
  display: flex;
  margin-left: 50px;
  margin-top: 40px;
}

.titu h1 {
  color: var(--text-colar);
}

.titu h1 i {
  margin-right: 10px;
}

/* Estilos de la tabla */
table {
  border-collapse: collapse;
  height: 100%;
  width: 100%;
}

td,
th {
  color: var(--text-colar);
  padding: 15px;
  text-align: center;
}
</style>


