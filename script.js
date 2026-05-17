const modalBackdrop = document.getElementById('modal-backdrop');
const cardElement = document.getElementById('card'); // Элемент, по которому кликают

// Открытие модалки
cardElement.addEventListener('click', () => {
    modalBackdrop.classList.add('active');
});

// Закрытие модалки при клике на размытый фон (мимо центрального блока)
modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) {
        modalBackdrop.classList.remove('active');
    }
});





// === ЭЛЕМЕНТЫ ===
const modalWishes = document.getElementById('modal-wishes');
const modalCart = document.getElementById('modal-cart');
const modalSettings = document.getElementById('modal-settings'); // Новое окно

const mainWishesImg = document.querySelector('#main-wishes-btn img');
const mainCartImg = document.querySelector('#main-cart-btn img');
const settingsBtns = document.querySelectorAll('#main-settings-btn, #modal-settings-close-btn');

// Кнопки тем
const lightThemeBtn = document.querySelector('.light-btn');
const darkThemeBtn = document.querySelector('.dark-btn');
const mainSettingsBtn = document.getElementById('main-settings-btn');

if (mainSettingsBtn) {
    mainSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        modalSettings.classList.contains('active') ? closeSettings() : openSettings();
    });
} else {
    console.error('Ошибка: Ты не добавил id="main-settings-btn" кнопке настроек в HTML!');
}

// === ЛОГИКА ТЕМ (LOCAL STORAGE) ===
// Функция применения темы
function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
        lightThemeBtn.classList.add('active');
        darkThemeBtn.classList.remove('active');
    } else {
        document.body.classList.remove('light-mode');
        darkThemeBtn.classList.add('active');
        lightThemeBtn.classList.remove('active');
    }
    // Сохраняем в память
    localStorage.setItem('app_theme', theme);
}

// Загрузка темы при старте страницы
const savedTheme = localStorage.getItem('app_theme') || 'dark'; // По умолчанию темная
applyTheme(savedTheme);

// Обработчики кликов по квадратикам темы
lightThemeBtn.addEventListener('click', () => applyTheme('light'));
darkThemeBtn.addEventListener('click', () => applyTheme('dark'));


// === БАЗОВЫЕ ФУНКЦИИ ЗАКРЫТИЯ ===
function closeWishes() {
    modalWishes.classList.remove('active');
    if (mainWishesImg) mainWishesImg.src = './media/love_off.svg';
}

function closeCart() {
    modalCart.classList.remove('active');
    if (mainCartImg) mainCartImg.src = './media/basket_off.svg';
}

function closeSettings() {
    modalSettings.classList.remove('active');
}

// === ФУНКЦИИ ОТКРЫТИЯ ===
function openWishes() {
    closeCart(); 
    closeSettings(); // Закрываем другие
    modalWishes.classList.add('active');
    if (mainWishesImg) mainWishesImg.src = './media/love_on.svg';
}

function openCart() {
    closeWishes();
    closeSettings();
    modalCart.classList.add('active');
    if (mainCartImg) mainCartImg.src = './media/basket_on.svg';
}

function openSettings() {
    closeWishes();
    closeCart();
    modalSettings.classList.add('active');
}

// === НАВЕШИВАНИЕ СОБЫТИЙ НА КНОПКИ ===

// Бажане
document.querySelectorAll('#main-wishes-btn, #modal-cart-wishes-btn, #modal-wishes-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        modalWishes.classList.contains('active') ? closeWishes() : openWishes();
    });
});

// Кошик
document.querySelectorAll('#main-cart-btn, #modal-wishes-cart-btn, #modal-cart-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        modalCart.classList.contains('active') ? closeCart() : openCart();
    });
});

// Настройки
settingsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        modalSettings.classList.contains('active') ? closeSettings() : openSettings();
    });
});

// Закрытие при клике на прозрачный фон мимо контента
window.addEventListener('click', (e) => {
    if (e.target === modalWishes) closeWishes();
    if (e.target === modalCart) closeCart();
    if (e.target === modalSettings) closeSettings(); // Закрываем настройки при клике мимо меню
});


if (mainSettingsBtn) {
    mainSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (modalSettings) {
            modalSettings.classList.toggle('active');
            console.log('3. Текущие классы модалки после клика:', modalSettings.className);
        } else {
            console.error('Ошибка: Скрипт не может найти элемент модалки настроек в HTML! Проверь ID.');
        }
    });
}



const checkoutBackdrop = document.getElementById('checkout-backdrop');
const btnBuy = document.getElementById('buy');
const btnCheckoutBack = document.getElementById('checkout-btn-back');
const checkoutForm = document.getElementById('checkout-form');
const checkoutItemsContainer = document.getElementById('checkout-items-container');
const checkoutTotalSum = document.getElementById('checkout-total-sum');

// Тестовый массив (временно используем для проверки скролла)
let checkoutItems = [
    { id: 1, name: '"Назва 1"', price: 100, img: './media/no-photo.png' },
    { id: 2, name: '"Назва 2"', price: 100, img: './media/no-photo.png' },
    { id: 3, name: '"Назва 3 (для скролла)"', price: 100, img: './media/no-photo.png' }, // Добавил 3-й для теста
];

// Функция отрисовки товаров в жестко фиксированном контейнере
function renderCheckoutItems() {
    checkoutItemsContainer.innerHTML = '';
    let total = 0;

    checkoutItems.forEach((item, index) => {
        total += item.price;
        const itemEl = document.createElement('div');
        itemEl.className = 'checkout-item';
        itemEl.innerHTML = `
            <img src="${item.img}" alt="Item">
            <div class="checkout-item-info">
                <span>${item.name}</span>
                <span>Ціна - ${item.price}₴</span>
            </div>
            <button type="button" class="checkout-item-delete" data-index="${index}">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        `;
        checkoutItemsContainer.appendChild(itemEl);
    });

    checkoutTotalSum.textContent = total;

    // Привязка удаления крестиком
    document.querySelectorAll('.checkout-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.currentTarget.getAttribute('data-index');
            checkoutItems.splice(idx, 1); // Удаляем товар из массива
            
            // Если товаров не осталось — автоматически закрываем окно
            if (checkoutItems.length === 0) {
                closeCheckout();
            } else {
                // Иначе перерисовываем скроллбокс
                renderCheckoutItems();
            }
        });
    });
}

// Управление окном
function openCheckout() {
    if (checkoutItems.length > 0) {
        renderCheckoutItems();
        checkoutBackdrop.classList.add('active');
    }
}

function closeCheckout() {
    checkoutBackdrop.classList.remove('active');
    checkoutForm.reset(); // Очистка формы при закрытии
}

// Слушатели событий
if (btnBuy) {
    btnBuy.addEventListener('click', openCheckout);
}

if (btnCheckoutBack) {
    btnCheckoutBack.addEventListener('click', closeCheckout);
}

// ↓↓↓ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ ДЛЯ UX ↓↓↓
// УДАЛЕНО: Клик мимо модального окна больше не закрывает его,
// чтобы покупатель случайно не потерял введенные в форму данные.

// Отправка формы (валидация required полей)
checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Заказ оформлен! Данные отправляются...');
    // Здесь будет логика отправки данных
    
    // Очищаем кошик после успешного заказа
    checkoutItems = []; 
    closeCheckout();
});














const addItemBackdrop = document.getElementById('add-item-backdrop');
const addItemForm = document.getElementById('add-item-form');
const btnAddCancel = document.getElementById('add-btn-cancel');

const photoInput = document.getElementById('photo-input');
const photoPreviewContainer = document.getElementById('photo-preview-container');
const addPhotoBtnLabel = document.getElementById('add-photo-btn');

// Масив, куди будуть складатися файли фотографій для подальшої відправки
let uploadedPhotos = []; 

// =====================================================================
// НАЛАШТУВАННЯ ГАРЯЧИХ КЛАВІШ
// =====================================================================
document.addEventListener('keydown', (event) => {
    // 1. event.shiftKey - перевіряє, чи затиснуто Shift
    // 2. event.code === 'KeyA' - перевіряє ФІЗИЧНУ кнопку A на клавіатурі (це буква Ф на кирилиці).
    // Використання 'code' (а не 'key') гарантує, що комбінація спрацює незалежно від розкладки (англ/укр).
    // Якщо захочеш змінити клавішу, міняй 'KeyA' на 'KeyB', 'KeyC' і т.д.
    if (event.shiftKey && event.code === 'KeyA') {
        event.preventDefault(); // Блокуємо стандартну поведінку браузера (якщо є)
        
        // Перевіряємо, чи не відкрите вже інше вікно, щоб не нашаровувати
        // Якщо хочеш щоб відкривалось завжди - прибери цю умову і залиш просто openAddItemModal()
        if (!addItemBackdrop.classList.contains('active')) {
            openAddItemModal();
        }
    }
});

// =====================================================================
// ЛОГІКА ДОДАВАННЯ ФОТО
// =====================================================================
photoInput.addEventListener('change', (event) => {
    // Отримуємо всі вибрані файли (якщо користувач виділив відразу кілька)
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        // Перевіряємо: ліміт 3 фото І файл є зображенням
        if (uploadedPhotos.length < 3 && file.type.startsWith('image/')) {
            
            uploadedPhotos.push(file); // Додаємо файл у наш масив
            
            // Створюємо тимчасове посилання на файл для відображення
            const imageUrl = URL.createObjectURL(file);
            
            // Створюємо тег <img>
            const imgEl = document.createElement('img');
            imgEl.src = imageUrl;
            imgEl.className = 'photo-preview';
            
            // Вставляємо фотографію ПЕРЕД кнопкою-плюсиком
            // Таким чином плюсик завжди буде зсуватися вправо або вниз
            photoPreviewContainer.insertBefore(imgEl, addPhotoBtnLabel);
        }
    });

    // Якщо фотографій стало 3 або більше - ховаємо кнопку-плюсик
    if (uploadedPhotos.length >= 3) {
        addPhotoBtnLabel.style.display = 'none';
    }

    // Очищаємо input. Це потрібно, щоб можна було видалити фото і завантажити той самий файл знову.
    photoInput.value = '';
});

// =====================================================================
// ЛОГІКА ВІКНА ТА КНОПОК
// =====================================================================
function openAddItemModal() {
    addItemBackdrop.classList.add('active');
}

function closeAddItemModal() {
    addItemBackdrop.classList.remove('active');
    addItemForm.reset(); // Очищує всі текстові поля
    
    // Очищуємо завантажені фотографії
    uploadedPhotos = [];
    
    // Знаходимо всі теги <img> з класом .photo-preview і видаляємо їх з HTML
    const previews = photoPreviewContainer.querySelectorAll('.photo-preview');
    previews.forEach(p => p.remove());
    
    // Повертаємо кнопку-плюсик на місце
    addPhotoBtnLabel.style.display = 'flex'; 
}

// Кнопка скасувати
btnAddCancel.addEventListener('click', closeAddItemModal);

// Кнопка Створити (Заглушка)
addItemForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Забороняє перезавантаження сторінки
    
    console.log('--- ЗАГЛУШКА: СТВОРЕННЯ ТОВАРУ ---');
    console.log('Назва:', document.getElementById('add-name').value);
    console.log('Файли фотографій для відправки:', uploadedPhotos);
    
    // ТУТ БУДЕ ТВІЙ КОД ДЛЯ ВІДПРАВКИ ДАНИХ
    
    closeAddItemModal(); // Закриваємо вікно після успішного "створення"
});