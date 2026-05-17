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