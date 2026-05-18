// === 1. ИМПОРТЫ МОДУЛЕЙ (Firebase и Supabase) ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Конфигурация Firebase (Вставь свои данные из консоли Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyCqYzKEVWops5qTt1Iw_qvm6b42VhuFgaA",
    authDomain: "inmlandingshop.firebaseapp.com",
    projectId: "inmlandingshop",
    storageBucket: "inmlandingshop.firebasestorage.app",
    messagingSenderId: "56300741868",
    appId: "1:56300741868:web:e5a90e942a81d7424031c9"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Инициализация Supabase (Данные уже подставлены)
const SUPABASE_URL = "https://rvpfmnrvcbtbxonczcv.supabase.co";
const SUPABASE_KEY = "sb_publishable_Xbtp8BJos4Vmh22pcVuUMg_HQGuFS1s";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Конфигурация Telegram и Админки
const TG_BOT_TOKEN = '8810566355:AAGya-exuy_8cDHY8YzDiZLH0refamQcwTQ';
const TG_CHAT_ID = '-5289386929'; 
const ADMIN_UID = "ciDwSBtZ7OMo8Cxd1jfcSZQVpa63"; // Появится после первого входа

// Локальное состояние
let currentUser = null;
let wishesList = [];
let checkoutItems = [];

// Селекторы элементов
const modalBackdrop = document.getElementById('modal-backdrop');
const modalWishes = document.getElementById('modal-wishes');
const modalCart = document.getElementById('modal-cart');
const modalSettings = document.getElementById('modal-settings');
const checkoutBackdrop = document.getElementById('checkout-backdrop');
const addItemBackdrop = document.getElementById('add-item-backdrop');

const userNameEl = document.getElementById('user-name');
const userAvatarImg = document.querySelector('.user-avatar img');
const productsContainer = document.querySelector('.list');

// === 2. АВТОРИЗАЦИЯ (GOOGLE AUTH) ===
document.querySelector('.user-row').addEventListener('click', () => {
    if (!currentUser) {
        signInWithPopup(auth, provider).catch(err => console.error("Ошибка входа:", err));
    } else {
        if (confirm("Вийти з акаунту?")) signOut(auth);
    }
});

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        if (userNameEl) userNameEl.textContent = user.displayName || user.email;
        if (userAvatarImg) userAvatarImg.src = user.photoURL || "./media/profile.svg";
        console.log("Твой UID для админки:", user.uid); // Скопируй его отсюда в переменную ADMIN_UID
    } else {
        if (userNameEl) userNameEl.textContent = "Увійти";
        if (userAvatarImg) userAvatarImg.src = "./media/profile.svg";
    }
});

document.addEventListener('keydown', (event) => {
    if (event.shiftKey && event.code === 'KeyA') {
        event.preventDefault();
        
        // ДОБАВЬ ЭТУ СТРОКУ ДЛЯ ПРОВЕРКИ:
        console.log("Мой UID в браузере:", currentUser?.uid, "UID админа в коде:", ADMIN_UID);

        if (currentUser && currentUser.uid === ADMIN_UID) {
            addItemBackdrop.classList.add('active');
        } else {
            alert("Доступ обмежено. Необхідні права адміністратора.");
        }
    }
});

// === 3. СИНХРОНИЗАЦИЯ ТОВАРОВ И КАРУСЕЛЬ ===
function startImageCarousel(imgElement, imagesArray) {
    if (!imagesArray || imagesArray.length <= 1) return;
    let currentIndex = 0;
    setInterval(() => {
        currentIndex = (currentIndex + 1) % imagesArray.length;
        imgElement.src = imagesArray[currentIndex];
    }, 3000); 
}

// Получение данных из Firestore в реальном времени
onSnapshot(collection(db, "products"), (snapshot) => {
    productsContainer.innerHTML = '';
    snapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-img-wrapper">
                <img class="product-card-img" src="${product.images?.length ? product.images[0] : './media/no-photo.png'}" alt="${product.name}">
            </div>
            <div class="card-info">
                <div class="info-left">
                    <span>“${product.name}”</span>
                    <span style="color: ${product.qty > 0 ? '#00FF00' : '#FF0000'}">
                        ${product.qty > 0 ? 'В наявності' : 'Продано'}
                    </span>
                </div>
                <div class="info-right">
                    <span>Ціна - ${product.price}₴</span>
                </div>
            </div>
        `;

        const cardImg = card.querySelector('.product-card-img');
        if (product.images?.length > 1) startImageCarousel(cardImg, product.images);

        card.addEventListener('click', () => openProductModal(product));
        productsContainer.appendChild(card);
    });
});

// Модальное окно товара
function openProductModal(product) {
    document.getElementById('modal-name').textContent = `“${product.name}”`;
    document.getElementById('modal-price').textContent = `Ціна - ${product.price}₴`;
    document.getElementById('modal-status').textContent = product.qty > 0 ? 'В наявності' : 'Продано';
    document.getElementById('modal-description').textContent = product.desc;
    
    const modalImg = document.getElementById('modal-img');
    modalImg.src = product.images?.length ? product.images[0] : './media/no-photo.png';

    const heartBtnImg = document.querySelector('#modal-heart img');
    const basketBtnImg = document.querySelector('#modal-basket img');

    heartBtnImg.src = wishesList.some(item => item.id === product.id) ? './media/love_on.svg' : './media/love_off.svg';
    basketBtnImg.src = checkoutItems.some(item => item.id === product.id) ? './media/basket_on.svg' : './media/basket_off.svg';

    document.getElementById('modal-heart').onclick = (e) => {
        e.stopPropagation();
        const idx = wishesList.findIndex(item => item.id === product.id);
        if (idx > -1) {
            wishesList.splice(idx, 1);
            heartBtnImg.src = './media/love_off.svg';
        } else {
            wishesList.push(product);
            heartBtnImg.src = './media/love_on.svg';
        }
    };

    document.getElementById('modal-basket').onclick = (e) => {
        e.stopPropagation();
        const idx = checkoutItems.findIndex(item => item.id === product.id);
        if (idx > -1) {
            checkoutItems.splice(idx, 1);
            basketBtnImg.src = './media/basket_off.svg';
        } else {
            checkoutItems.push(product);
            basketBtnImg.src = './media/basket_on.svg';
        }
    };

    const buyOlxBtn = document.getElementById('modal-buy-olx');
    if (product.olxLink) {
        buyOlxBtn.style.display = 'block';
        buyOlxBtn.onclick = () => window.open(product.olxLink, '_blank');
    } else {
        buyOlxBtn.style.display = 'none';
    }

    modalBackdrop.classList.add('active');
}

// === 4. ЗАГРУЗКА ФОТО В SUPABASE И СОХРАНЕНИЕ В FIREBASE ===
const photoInput = document.getElementById('photo-input');
let uploadedFiles = [];

photoInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if (uploadedFiles.length < 3 && file.type.startsWith('image/')) {
            uploadedFiles.push(file);
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'photo-preview';
            img.style.width = '60px'; 
            img.style.height = '60px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            document.getElementById('photo-preview-container').insertBefore(img, document.getElementById('add-photo-btn'));
        }
    });
    if (uploadedFiles.length >= 3) document.getElementById('add-photo-btn').style.display = 'none';
});

document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUser.uid !== ADMIN_UID) return;

    const createBtn = document.querySelector('.btn-add-create');
    createBtn.disabled = true;
    createBtn.textContent = "Завантаження...";

    try {
        const imageUrls = [];

        // Цикл загрузки картинок в Supabase Storage
        for (const file of uploadedFiles) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(fileName, file);

            if (error) throw error;

            // Получаем публичную прямую ссылку на файл
            const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            imageUrls.push(publicUrlData.publicUrl);
        }

        // Сохранение всех полей и массива ссылок в Firestore
        await addDoc(collection(db, "products"), {
            name: document.getElementById('add-name').value,
            desc: document.getElementById('add-desc').value,
            price: Number(document.getElementById('add-price').value),
            qty: Number(document.getElementById('add-qty').value),
            olxLink: document.getElementById('add-link').value || "",
            images: imageUrls
        });

        closeAddItemModal();
    } catch (err) {
        console.error("Помилка при створенні товару:", err);
        alert("Не вдалося зберегти товар.");
    } finally {
        createBtn.disabled = false;
        createBtn.textContent = "Створити";
    }
});

function closeAddItemModal() {
    addItemBackdrop.classList.remove('active');
    document.getElementById('add-item-form').reset();
    uploadedFiles = [];
    document.querySelectorAll('.photo-preview').forEach(p => p.remove());
    document.getElementById('add-photo-btn').style.display = 'flex';
}
document.getElementById('add-btn-cancel').addEventListener('click', closeAddItemModal);

// === 5. ОФОРМЛЕНИЕ ЗАКАЗА В TELEGRAM ===
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (checkoutItems.length === 0) return alert("Корзина порожня!");

    const pib = document.getElementById('checkout-name').value;
    const phone = document.getElementById('checkout-phone').value;
    const email = document.getElementById('checkout-email').value || 'Не вказано';
    const city = document.getElementById('checkout-city').value;
    const branch = document.getElementById('checkout-branch').value;
    const delivery = document.querySelector('input[name="delivery"]:checked')?.value || 'Нова Пошта';

    let itemsText = '';
    let totalSum = 0;
    checkoutItems.forEach(item => {
        itemsText += `📦 *${item.name}* — ${item.price}₴\n`;
        totalSum += item.price;
    });

    const message = `🚨 *Нове замовлення!*\n\n` +
                    `👤 *Покупець:* ${pib}\n` +
                    `📞 *Телефон:* ${phone}\n` +
                    `📧 *Email:* ${email}\n` +
                    `📍 *Місто:* ${city}\n` +
                    `🚚 *Служба:* ${delivery}\n` +
                    `🏢 *Відділення/Поштомат:* ${branch}\n\n` +
                    `🛒 *Товари:*\n${itemsText}\n` +
                    `💰 *Всього до сплати:* ${totalSum}₴`;

    try {
        await fetch(`https://api.telegram.org/bot8810566355:AAGya-exuy_8cDHY8YzDiZLH0refamQcwTQ/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: -5289386929,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        alert('Замовлення успішно надіслано!');
        checkoutItems = [];
        checkoutBackdrop.classList.remove('active');
    } catch (err) {
        console.error("Помилка відправки в ТГ:", err);
        alert('Сталася помилка. Спробуйте ще раз.');
    }
});

// === ТЕМЫ И МОДАЛКИ (ОСТАВЛЕНО БЕЗ ИЗМЕНЕНИЙ) ===
const lightThemeBtn = document.querySelector('.light-btn');
const darkThemeBtn = document.querySelector('.dark-btn');
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
    localStorage.setItem('app_theme', theme);
}
applyTheme(localStorage.getItem('app_theme') || 'dark');
lightThemeBtn.addEventListener('click', () => applyTheme('light'));
darkThemeBtn.addEventListener('click', () => applyTheme('dark'));

document.getElementById('main-settings-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    modalSettings.classList.toggle('active');
});
window.addEventListener('click', (e) => {
    if (e.target === modalSettings) modalSettings.classList.remove('active');
    if (e.target === modalBackdrop) modalBackdrop.classList.remove('active');
});
document.getElementById('buy').addEventListener('click', () => {
    if(checkoutItems.length > 0) checkoutBackdrop.classList.add('active');
});
document.getElementById('checkout-btn-back').addEventListener('click', () => checkoutBackdrop.classList.remove('active'));