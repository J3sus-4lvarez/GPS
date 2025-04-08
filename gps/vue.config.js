const { defineConfig } = require('@vue/cli-service');
const path = require('path');

module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].title = 'Navify';
        return args;
      });

    // Configuración para resolver archivos TypeScript y establecer alias
    config.resolve.alias
      .set('@', path.resolve(__dirname, 'src'))
      .set('vue$', 'vue/dist/vue.esm-bundler.js');

    config.resolve.extensions
      .merge(['.ts', '.js', '.vue', '.json']);
  }
});
module.exports = {
  devServer: {
    proxy: {
      '/send-command': {
        target: 'http://13.219.21.71', // Cambia esto al puerto de tu servidor backend
        changeOrigin: true
      },
      '/test': {
        target: 'http://13.219.21.71', // Cambia esto al puerto de tu servidor backend
        changeOrigin: true
      }
    }
  }
};