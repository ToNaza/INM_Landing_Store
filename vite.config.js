import { defineConfig } from 'vite';
import { execSync } from 'child_process';

let version = execSync('git describe --tags --always').toString().trim();
try {
  // Команда шукає останній Git-тег у репозиторії
  version = execSync('git describe --tags --abbrev=0').toString().trim();
} catch (e) {
  console.log('Git теги не знайдені, використовується версія за замовчуванням');
}

export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(version),
  },
});