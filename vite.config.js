import { defineConfig } from 'vite';
import { execSync } from 'child_process';

let version = 'v0.0.0'; // Значення за замовчуванням, якщо тегів ще немає

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