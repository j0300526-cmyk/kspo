import '@tabler/core/dist/css/tabler.min.css';
import './styles/workbench.css';
import { applyColorTokens } from './design/colors.js';
import { createApplication } from './app/application.js';
applyColorTokens();
createApplication()
  .then((app) => {
    window.garimZeroApp = app;
  })
  .catch((error) => {
    document.querySelector('#app').textContent =
      '앱을 시작하지 못했습니다. 새로고침 후 다시 시도해주세요.';
    console.error(error);
  });
