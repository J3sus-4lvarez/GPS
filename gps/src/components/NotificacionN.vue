<template>
    <div class="notification-container">
        <div class="notification-header">
            <div class="header-content">
                <h1 class="title">
                    <i class='bx bx-bell'></i>
                    Notificaciones
                </h1>
                <span class="unread-count">{{ notifications.length }}</span>
            </div>
            <button class="menu-button" @click="toggleMenu" :class="{ 'active': showMenu }">
                <i class='bx bx-dots-vertical-rounded'></i>
            </button>
        </div>

        <Transition name="fade">
            <div v-if="showMenu" class="menu-overlay" @click="toggleMenu"></div>
        </Transition>

        <Transition name="slide">
            <div v-if="showMenu" class="menu-panel">
                <div class="menu-header">Opciones</div>
                <div class="menu-items">
                    <a href="#" @click.prevent="clearNotifications" class="menu-item">
                        <i class='bx bx-trash'></i>
                        <span>Limpiar todo</span>
                    </a>
                    <router-link to="/reporte2" class="menu-item">
                        <i class='bx bx-folder-open'></i>
                        <span>Ver historial</span>
                    </router-link>
                </div>
            </div>
        </Transition>

        <div class="notifications-wrapper">
            <TransitionGroup name="notification" tag="ul" class="notifications-list">
                <li v-for="(notification, index) in notifications" :key="index" class="notification-item"
                    :class="{ 'unread': !notification.read }">
                    <div class="notification-icon">
                        <i class='bx bx-message-rounded-dots'></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-text">{{ notification.notificationName }}</div>
                        <div class="notification-time">{{formatDate(utc(notification.notificationTime) ) }}</div>
                    </div>
                    <button class="notification-action" @click="markAsRead(index)">
                        <i class='bx bx-check'></i>
                    </button>
                </li>
            </TransitionGroup>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import iziToast from 'izitoast';
import  { formatDate, utc } from '../../Back-end/utils/formatearFecha';
const notifications = ref([]);

const showMenu = ref(false);

const toggleMenu = () => {
    showMenu.value = !showMenu.value;
};

const markAsRead = (index) => {
    notifications.value[index].read = true;
};

const cargarNotificaciones = async () => {
  try {
    const response = await fetch('http://3.92.51.134/notificaciones');
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error del servidor:', errorText);
      return;
    }
    const data = await response.json();
    console.log(data); // Verifica los datos recibidos

    // Filtrar nuevas alertas
    const nuevasAlertas = data.filter(alerta => !notifications.value.some(a => a._id === alerta._id));
    if (nuevasAlertas.length > 0) {
      notifications.value = [...notifications.value, ...nuevasAlertas];
    }

    // Ordenar las notificaciones por fecha en orden descendente
    notifications.value.sort((a, b) => new Date(b.notificationTime) - new Date(a.notificationTime));
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
  }
};

const clearNotifications = async () => {
    try {
        await fetch('http://3.92.51.134/notificaciones', {
            method: 'DELETE'
        });
        notifications.value = [];
    } catch (error) {
        console.error('Error al eliminar notificaciones:', error);
    }
};

onMounted(() => {
  cargarNotificaciones();

  let ws = new WebSocket('ws://3.92.51.134');
  ws.onmessage = (event) => {
    const notificacion = JSON.parse(event.data);
    if (!notifications.value.some(alert => alert._id === notificacion._id)) {
      notifications.value.push(notificacion);
    }
  };
  ws.onclose = () => {
    console.log('WebSocket cerrado. Reintentando...');
    setTimeout(() => {
      const newWs = new WebSocket('ws://3.92.51.134');
      ws = newWs;
    }, 5000);
  };
  ws.onerror = (error) => {
    console.error('Error en WebSocket:', error);
  };
});
</script>

<style scoped>
.notification-container {
    position: fixed;
    top: 48%;
    left: 80%;
    transform: translate(-50%, -50%);
    width: 380px;
    height: 600px;
    background: var(--body-color);
    border-radius: 24px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 999;
}

.notification-header {
    padding: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #f0f0f0;
    background: var(--body-color);
}

.header-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-color);
    display: flex;
    align-items: center;
    gap: 8px;
}

.title i {
    font-size: 24px;
    color: var(--text-color);
}

.unread-count {
    background: var(--text-color);
    color: var(--body-color);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.menu-button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    transition: all 0.3s ease;
}

.menu-button:hover {
    background: var(--body-color);
}

.menu-button.active {
    color: var(--text-color);
    background: var(--body-color);
}

.menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.menu-panel {
    position: absolute;
    top: 80px;
    right: 24px;
    width: 200px;
    background: var(--body-color);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 101;
    overflow: hidden;
}

.menu-header {
    padding: 16px;
    font-weight: 600;
    color: var(--text-color);
    border-bottom: 1px solid #f0f0f0;
}

.menu-items {
    padding: 8px;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    color: var(--text-color);
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.2s ease;
    
}

.menu-item:hover {
    background: var(--body-color);
    color: var(--text-color);
}

.notifications-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.notifications-list {
    list-style: none;
    padding: 0;
    margin: 0;
}



.notification-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    margin-bottom: 8px;
    background: var(--body-color);
    border-radius: 16px;
    border: 1px solid var(--text-color);
    transition: all 0.3s ease;
    animation: slideIn 0.5s ease forwards;
}

.notification-item:hover {
    transform: translateX(4px);
}

.notification-item.unread {
    background: var(--body-color);
    border-color: var(--text-color);
}

.notification-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--body-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color);
    font-size: 20px;
}

.notification-content {
    flex: 1;
}

.notification-text {
    color: var(--text-color);
    font-size: 14px;
    margin-bottom: 4px;
}

.notification-time {
    color: var(--text-color);
    font-size: 12px;
}

.notification-action {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--text-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    opacity: 0;
}

.notification-item:hover .notification-action {
    opacity: 1;
}

.notification-action:hover {
    background: var(--body-color);
    color: var(--text-color);
}

/* Animaciones */
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translate(-50%, -40%);
    }

    to {
        opacity: 1;
        transform: translate(-50%, -50%);
    }
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }

    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* Transiciones */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-enter-from,
.slide-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

.notification-enter-active,
.notification-leave-active {
    transition: all 0.5s ease;
}

.notification-enter-from {
    opacity: 0;
    transform: translateX(-30px);
}

.notification-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

/* Scrollbar */
.notifications-wrapper::-webkit-scrollbar {
    width: 6px;
}

.notifications-wrapper::-webkit-scrollbar-track {
    background: transparent;
}

.notifications-wrapper::-webkit-scrollbar-thumb {
    background: #e0e0e0;
    border-radius: 3px;
}

.notifications-wrapper::-webkit-scrollbar-thumb:hover {
    background: #d0d0d0;
}
</style>