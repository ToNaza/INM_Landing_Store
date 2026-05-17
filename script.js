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







// Элементы главной страницы
const mainWishesBtn = document.getElementById('main-wishes-btn');
const mainCartBtn = document.getElementById('main-cart-btn');

const mainWishesImg = mainWishesBtn.querySelector('img');
const mainCartImg = mainCartBtn.querySelector('img');

// Модальные окна
const modalWishes = document.getElementById('modal-wishes');
const modalCart = document.getElementById('modal-cart');

// Кнопки закрытия ВНУТРИ модальных окон
const modalWishesCloseBtn = document.getElementById('modal-wishes-close-btn');
const modalCartCloseBtn = document.getElementById('modal-cart-close-btn');

// --- Общие функции закрытия ---

// Функция закрытия "Бажане"
function closeWishesModal() {
    modalWishes.classList.remove('active');
    mainWishesImg.src = './media/love_off.svg'; // Возвращаем иконку _off
}

// Функция закрытия "Кошик"
function closeCartModal() {
    modalCart.classList.remove('active');
    mainCartImg.src = './media/basket_off.svg'; // Возвращаем иконку _off
}

// --- Обработка событий для "Бажане" ---

// 1. Открытие с главной страницы
mainWishesBtn.addEventListener('click', () => {
    modalWishes.classList.add('active');
    mainWishesImg.src = './media/love_on.svg'; // Меняем на _on
});

// 2. Закрытие кнопкой ВНУТРИ модалки (повторный клик)
modalWishesCloseBtn.addEventListener('click', closeWishesModal);

// 3. Закрытие при клике на темный фон
modalWishes.addEventListener('click', (e) => {
    if (e.target === modalWishes) {
        closeWishesModal();
    }
});

// --- Обработка событий для "Кошик" ---

// 1. Открытие с главной страницы
mainCartBtn.addEventListener('click', () => {
    modalCart.classList.add('active');
    mainCartImg.src = './media/basket_on.svg'; // Меняем на _on
});

// 2. Закрытие кнопкой ВНУТРИ модалки (повторный клик)
modalCartCloseBtn.addEventListener('click', closeCartModal);

// 3. Закрытие при клике на темный фон
modalCart.addEventListener('click', (e) => {
    if (e.target === modalCart) {
        closeCartModal();
    }
});