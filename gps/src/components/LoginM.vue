<template>
  <div class="login-container">
    <div class="login-box">
      <div class="logo">
        <img :src="require('../assets/satellite.png')" alt="Satellite logo" class="satellite-logo">
        <h1>Inicia Sesión</h1>
      </div>

      <form @submit.prevent="login" class="login-form">
        <h2 ref="typedText" class="typed-text">{{ displayText }}</h2>
        <div class="input-group">
          <input type="text" v-model="email" required>
          <label>Correo electrónico</label>
          <i class="fas fa-envelope"></i>
        </div>
        <div class="input-group">
          <input type="password" v-model="password" required>
          <label>Contraseña</label>
          <i class="fas fa-lock"></i>
        </div>
        <button type="submit" class="login-btn">
          Iniciar Sesión <i class="fas fa-arrow-right"></i>
        </button>
      </form>
    </div>
    <div class="map-overlay"></div>
  </div>
</template>

<script setup>
import { ref, defineEmits, onMounted } from 'vue';
import Swal from 'sweetalert2';
import '../styles_App/login.css';
import router from '../router';


const emit = defineEmits(['loginSuccess']);
const email = ref('');
const password = ref('');
const displayText = ref('');
const text = "Descubre con Navify GPS"; 
let index = 0;

const login = async () => {
    try {
        const response = await fetch('http://18.223.186.201/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.value, password: password.value }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('isAuthenticated', 'true');
            router.push({ name: 'Home' });
            emit('loginSuccess'); 
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Credenciales incorrectas',
                text: data.message || 'Por favor, verifica tu usuario y contraseña',
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error del servidor',
            text: 'No se pudo conectar con el servidor. Intenta nuevamente.',
        });
    }
};


const typeWriter = () => {
  if (index < text.length) {
    displayText.value += text.charAt(index);
    index++;
    setTimeout(typeWriter, 100);
  } else {
    setTimeout(() => {
      displayText.value = "";
      index = 0;
      typeWriter();
    }, 5000);
  }
};

onMounted(() => {
  typeWriter();
});
</script>

