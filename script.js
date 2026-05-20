import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const firebaseConfig = {
    apiKey: "AIzaSyCqYzKEVWops5qTt1Iw_qvm6b42VhuFgaA",
    authDomain: "inmlandingshop.firebaseapp.com",
    projectId: "inmlandingshop",
    storageBucket: "inmlandingshop.firebasestorage.app",
    messagingSenderId: "56300741868",
    appId: "1:56300741868:web:e5a90e942a81d7424031c9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const SUPABASE_URL = "https://rvpfmnrvcbtcbxonczcv.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cGZtbnJ2Y2J0Y2J4b25jemN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwOTc4NTIsImV4cCI6MjA5NDY3Mzg1Mn0.BPD8k6VifoylRQO-afoRXfdDsM0rPE36LASckwNiCJ0"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TG_BOT_TOKEN = '8810566355:AAGya-exuy_8cDHY8YzDiZLH0refamQcwTQ';
const TG_CHAT_ID = '-5289386929'; 
const ADMIN_UID = "ciDwSBtZ7OMo8Cxd1jfcSZQVpa63"; 

let currentUser = null;
let wishesList = [];
let checkoutItems = [];
let editingProductId = null; 
let modalCarouselInterval = null;

// Хранилища для синхронизации ID из аккаунта
let allProducts = [];
let savedWishesIds = [];
let savedCartIds = [];

// Стан для замовлення в 1 клік
let isOneClickCheckout = false;
let oneClickItem = null;

const modalBackdrop = document.getElementById('modal-backdrop');
const modalWishes = document.getElementById('modal-wishes');
const modalCart = document.getElementById('modal-cart');
const modalSettings = document.getElementById('modal-settings');
const modalInfo = document.getElementById('modal-info');
const checkoutBackdrop = document.getElementById('checkout-backdrop');
const addItemBackdrop = document.getElementById('add-item-backdrop');

const infoBtn = document.getElementById('info');
const userNameEl = document.getElementById('user-name');
const userAvatarImg = document.querySelector('.user-avatar img');
const productsContainer = document.querySelector('.list');

// ЗАВАНТАЖЕННЯ ЗБЕРЕЖЕНИХ ДАНИХ КОРИСТУВАЧА (Форма)
function loadSavedUserData() {
    if (localStorage.getItem('checkout_name')) document.getElementById('checkout-name').value = localStorage.getItem('checkout_name');
    if (localStorage.getItem('checkout_phone')) document.getElementById('checkout-phone').value = localStorage.getItem('checkout_phone');
    if (localStorage.getItem('checkout_email')) document.getElementById('checkout-email').value = localStorage.getItem('checkout_email');
    if (localStorage.getItem('checkout_city')) document.getElementById('checkout-city').value = localStorage.getItem('checkout_city');
    if (localStorage.getItem('checkout_branch')) document.getElementById('checkout-branch').value = localStorage.getItem('checkout_branch');
}
loadSavedUserData();

// СИНХРОНІЗАЦІЯ ДАНИХ З ОБЕКТАМИ БАЗИ ДАНИХ
function syncListsWithAllProducts() {
    if (currentUser) {
        wishesList = allProducts.filter(p => savedWishesIds.includes(p.id));
        checkoutItems = allProducts.filter(p => savedCartIds.includes(p.id));
    } else {
        wishesList = wishesList.map(item => allProducts.find(p => p.id === item.id) || item);
        checkoutItems = checkoutItems.map(item => allProducts.find(p => p.id === item.id) || item);
    }
    updateListsUI();
}

// ЗБЕРЕЖЕННЯ СПИСКІВ В FIRESTORE
async function saveUserDataToFirebase() {
    if (!currentUser) return;
    try {
        savedWishesIds = wishesList.map(item => item.id);
        savedCartIds = checkoutItems.map(item => item.id);
        await setDoc(doc(db, "users", currentUser.uid), {
            wishes: savedWishesIds,
            cart: savedCartIds
        }, { merge: true });
    } catch (e) {
        console.error("Помилка збереження даних користувача:", e);
    }
}

// АВТОРИЗАЦІЯ
document.querySelector('.user-row').addEventListener('click', () => {
    if (!currentUser) {
        signInWithPopup(auth, provider).catch(err => console.error(err));
    } else {
        if (confirm("Вийти з акаунту?")) signOut(auth);
    }
});

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        if (userNameEl) userNameEl.textContent = user.displayName || user.email;
        if (userAvatarImg) userAvatarImg.src = user.photoURL || "./media/profile.svg";
        
        // Завантаження списків з аккаунту
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                savedWishesIds = data.wishes || [];
                savedCartIds = data.cart || [];
            } else {
                savedWishesIds = [];
                savedCartIds = [];
            }
            syncListsWithAllProducts();
        } catch (e) {
            console.error("Помилка завантаження даних користувача:", e);
        }
    } else {
        if (userNameEl) userNameEl.textContent = "Увійти";
        if (userAvatarImg) userAvatarImg.src = "./media/profile.svg";
        savedWishesIds = [];
        savedCartIds = [];
        wishesList = [];
        checkoutItems = [];
        updateListsUI();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.shiftKey && event.code === 'KeyA') {
        event.preventDefault();
        if (currentUser && currentUser.uid === ADMIN_UID) {
            editingProductId = null; 
            document.getElementById('add-btn-create').textContent = "Створити";
            addItemBackdrop.classList.add('active');
        } else {
            alert("Доступ обмежено. Необхідні права адміністратора.");
        }
    }
});

// === ФУНКЦИИ ОТКРЫТИЯ / ЗАКРЫТИЯ ===
function closeWishes() {
    modalWishes.classList.remove('active');
    if (document.querySelector('#main-wishes-btn img')) {
        document.querySelector('#main-wishes-btn img').src = './media/love_off.svg';
    }
}

function closeCart() {
    modalCart.classList.remove('active');
    if (document.querySelector('#main-cart-btn img')) {
        document.querySelector('#main-cart-btn img').src = './media/basket_off.svg';
    }
}

function closeSettings() {
    modalSettings.classList.remove('active');
}

function closeInfo() {
    if (modalInfo) modalInfo.classList.remove('active');
}

function openWishes() {
    closeCart(); 
    closeSettings(); 
    closeInfo();
    modalWishes.classList.add('active');
    if (document.querySelector('#main-wishes-btn img')) {
        document.querySelector('#main-wishes-btn img').src = './media/love_on.svg';
    }
}

function openCart() {
    closeWishes();
    closeSettings();
    closeInfo();
    modalCart.classList.add('active');
    if (document.querySelector('#main-cart-btn img')) {
        document.querySelector('#main-cart-btn img').src = './media/basket_on.svg';
    }
}

function openSettings() {
    closeWishes();
    closeCart();
    closeInfo();
    modalSettings.classList.add('active');
}

// === НАВЕШИВАНИЕ СОБЫТИЙ НА КНОПКИ ===

if (infoBtn) {
    infoBtn.addEventListener('click', () => {
        closeWishes();
        closeCart();
        closeSettings();
        modalInfo.classList.add('active');
    });
}

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
document.querySelectorAll('#main-settings-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        modalSettings.classList.contains('active') ? closeSettings() : openSettings();
    });
});

window.addEventListener('click', (e) => {
    if (e.target === modalSettings) closeSettings();
    if (e.target === modalWishes) closeWishes();
    if (e.target === modalCart) closeCart();
    if (e.target === modalInfo) closeInfo();
    if (e.target === modalBackdrop) {
        modalBackdrop.classList.remove('active');
        if (modalCarouselInterval) clearInterval(modalCarouselInterval);
    }
});

document.getElementById('modal-wishes-close-btn').addEventListener('click', () => modalWishes.classList.remove('active'));
document.getElementById('modal-cart-close-btn').addEventListener('click', () => modalCart.classList.remove('active'));

function createCardElement(product) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const isAvailable = product.qty > 0;
    const statusClass = isAvailable ? 'status-available' : 'status-sold';
    const statusText = isAvailable ? `В наявності ${product.qty}шт.` : 'Продано';

    card.innerHTML = `
        <div class="card-img-wrapper">
            <img class="product-card-img" src="${product.images?.length ? product.images[0] : './media/no-photo.png'}" alt="Товар">
        </div>
        <div class="card-info">
            <div class="info-left">
                <span>“${product.name}”</span>
                <span class="${statusClass}">
                    ${statusText}
                </span>
            </div>
            <div class="info-right">
                <span>Ціна - ${product.price}₴</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        closeWishes();
        closeCart();
        closeSettings();
        closeInfo();
        openProductModal(product);
    });

    return card;
}

// ОНОВЛЕННЯ UI СПИСКІВ
function updateListsUI() {
    const wishesContainer = document.querySelector('#modal-wishes .list');
    const cartContainer = document.querySelector('#modal-cart .list');
    
    if (wishesContainer) {
        wishesContainer.innerHTML = '';
        wishesList.forEach(item => wishesContainer.appendChild(createCardElement(item)));
    }
    
    if (cartContainer) {
        cartContainer.innerHTML = '';
        checkoutItems.forEach(item => cartContainer.appendChild(createCardElement(item)));
    }
    
    updateCheckoutUI();
}

// ОНОВЛЕННЯ ВІКНА ЗАМОВЛЕННЯ
function updateCheckoutUI() {
    const checkoutContainer = document.getElementById('checkout-items-container');
    const totalSumEl = document.getElementById('checkout-total-sum');
    
    if (!checkoutContainer) return;

    let itemsToRender = isOneClickCheckout ? [oneClickItem] : checkoutItems;

    const renderItem = (item) => `
        <div class="checkout-item" style="display:flex; align-items:center; gap:10px; background:#a3a3a3; padding:10px; border-radius:10px; margin-bottom:10px; width: 100%; box-sizing: border-box;">
            <img src="${item.images?.length ? item.images[0] : './media/no-photo.png'}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">
            <div style="flex-grow:1; color:#000;">
                <b>${item.name}</b><br>${item.price}₴
            </div>
        </div>`;

    checkoutContainer.innerHTML = itemsToRender.map(renderItem).join('');
    
    if (totalSumEl) {
        totalSumEl.textContent = itemsToRender.reduce((sum, item) => sum + item.price, 0);
    }
}

function startImageCarousel(imgElement, imagesArray) {
    if (!imagesArray || imagesArray.length <= 1) return;
    let currentIndex = 0;
    setInterval(() => {
        currentIndex = (currentIndex + 1) % imagesArray.length;
        imgElement.src = imagesArray[currentIndex];
    }, 6000); 
}

// СИНХРОНІЗАЦІЯ ТОВАРІВ
onSnapshot(collection(db, "products"), (snapshot) => {
    allProducts = [];
    productsContainer.innerHTML = '';
    snapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        allProducts.push(product);
        const card = createCardElement(product);
        productsContainer.appendChild(card);
    });
    syncListsWithAllProducts();
});

function openProductModal(product) {
    if (modalCarouselInterval) clearInterval(modalCarouselInterval);

    document.getElementById('modal-name').textContent = `“${product.name}”`;
    document.getElementById('modal-price').textContent = `Ціна - ${product.price}₴`;
    document.getElementById('modal-status').textContent = product.qty > 0 ? `В наявності ${product.qty}шт.` : 'Продано';
    document.getElementById('modal-description').textContent = product.desc;
    
    const modalImg = document.getElementById('modal-img');
    modalImg.src = product.images?.length ? product.images[0] : './media/no-photo.png';

    if (product.images?.length > 1) {
        let currentIndex = 0;
        modalCarouselInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % product.images.length;
            modalImg.src = product.images[currentIndex];
        }, 6000);
    }

    modalImg.style.cursor = 'zoom-in';
    modalImg.onclick = () => {
        if (!product.images || product.images.length === 0) return;

        let currentImgIdx = product.images.indexOf(modalImg.src);
        if (currentImgIdx === -1) currentImgIdx = 0;

        const lightbox = document.createElement('div');
        lightbox.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:20000; display:flex; align-items:center; justify-content:center; user-select:none;';

        lightbox.innerHTML = `
            <span id="lb-close" style="position:absolute; top:20px; right:30px; color:#fff; font-size:40px; cursor:pointer; font-weight:bold;">&times;</span>
            ${product.images.length > 1 ? '<span id="lb-prev" style="position:absolute; left:30px; color:#fff; font-size:50px; cursor:pointer; font-family:monospace; padding:10px;">&lt;</span>' : ''}
            <img id="lb-img" src="${product.images[currentImgIdx]}" style="max-width:90%; max-height:90%; object-fit:contain; border-radius:10px;">
            ${product.images.length > 1 ? '<span id="lb-next" style="position:absolute; right:30px; color:#fff; font-size:50px; cursor:pointer; font-family:monospace; padding:10px;">&gt;</span>' : ''}
        `;

        document.body.appendChild(lightbox);

        const lbImg = document.getElementById('lb-img');
        if (product.images.length > 1) {
            document.getElementById('lb-prev').onclick = (e) => {
                e.stopPropagation();
                currentImgIdx = (currentImgIdx - 1 + product.images.length) % product.images.length;
                lbImg.src = product.images[currentImgIdx];
            };
            document.getElementById('lb-next').onclick = (e) => {
                e.stopPropagation();
                currentImgIdx = (currentImgIdx + 1) % product.images.length;
                lbImg.src = product.images[currentImgIdx];
            };
        }

        document.getElementById('lb-close').onclick = () => lightbox.remove();
        lightbox.onclick = (e) => { if (e.target === lightbox) lightbox.remove(); };
    };

    const heartBtnImg = document.querySelector('#modal-heart img');
    const basketBtnImg = document.querySelector('#modal-basket img');

    heartBtnImg.src = wishesList.some(item => item.id === product.id) ? './media/love_on.svg' : './media/love_off.svg';
    basketBtnImg.src = checkoutItems.some(item => item.id === product.id) ? './media/basket_on.svg' : './media/basket_off.svg';

    document.getElementById('modal-heart').onclick = async (e) => {
        e.stopPropagation();
        const idx = wishesList.findIndex(item => item.id === product.id);
        if (idx > -1) wishesList.splice(idx, 1);
        else wishesList.push(product);
        heartBtnImg.src = wishesList.some(item => item.id === product.id) ? './media/love_on.svg' : './media/love_off.svg';
        await saveUserDataToFirebase();
        updateListsUI();
    };

    document.getElementById('modal-basket').onclick = async (e) => {
        e.stopPropagation();
        const idx = checkoutItems.findIndex(item => item.id === product.id);
        if (idx > -1) checkoutItems.splice(idx, 1);
        else checkoutItems.push(product);
        basketBtnImg.src = checkoutItems.some(item => item.id === product.id) ? './media/basket_on.svg' : './media/basket_off.svg';
        await saveUserDataToFirebase();
        updateListsUI();
    };

    const textButtonsContainer = document.querySelector('.text-buttons');
    
    if (currentUser && currentUser.uid === ADMIN_UID) {
        textButtonsContainer.innerHTML = `
            <button id="modal-edit-btn" style="background-color: #f59e0b; color: #000;">Редагувати</button>
            <button id="modal-delete-btn" style="background-color: #ef4444; color: #fff;">Видалити</button>
        `;
        
        document.getElementById('modal-delete-btn').onclick = async () => {
            if (confirm("Точно видалити цей товар?")) {
                if (modalCarouselInterval) clearInterval(modalCarouselInterval);
                await deleteDoc(doc(db, "products", product.id));
                modalBackdrop.classList.remove('active');
                
                wishesList = wishesList.filter(i => i.id !== product.id);
                checkoutItems = checkoutItems.filter(i => i.id !== product.id);
                await saveUserDataToFirebase();
                updateListsUI();
            }
        };

        document.getElementById('modal-edit-btn').onclick = () => {
            if (modalCarouselInterval) clearInterval(modalCarouselInterval);
            editingProductId = product.id;
            document.getElementById('add-name').value = product.name;
            document.getElementById('add-desc').value = product.desc;
            document.getElementById('add-price').value = product.price;
            document.getElementById('add-qty').value = product.qty;
            document.getElementById('add-link').value = product.olxLink || "";
            document.getElementById('add-btn-create').textContent = "Зберегти";
            
            modalBackdrop.classList.remove('active');
            addItemBackdrop.classList.add('active');
        };
    } else {
        textButtonsContainer.innerHTML = `
            <button id="modal-buy-1click">Замовити в 1 клік</button>
            <button id="modal-buy-olx">Замовити через OLX</button>
        `;
        const buyOlxBtn = document.getElementById('modal-buy-olx');
        if (product.olxLink) {
            buyOlxBtn.style.display = 'block';
            buyOlxBtn.onclick = () => window.open(product.olxLink, '_blank');
        } else {
            buyOlxBtn.style.display = 'none';
        }

        const buy1ClickBtn = document.getElementById('modal-buy-1click');
        if (buy1ClickBtn) {
            buy1ClickBtn.onclick = () => {
                if (!currentUser) {
                    alert("Перш ніж оформляти замовлення ви маєте зареєструватись, «Налаштування - увійти»");
                    return;
                }
                if (modalCarouselInterval) clearInterval(modalCarouselInterval);
                isOneClickCheckout = true;
                oneClickItem = product;
                updateCheckoutUI();
                modalBackdrop.classList.remove('active');
                checkoutBackdrop.classList.add('active');
            };
        }
    }

    modalBackdrop.classList.add('active');
}

// ДОБАВЛЕНИЕ / РЕДАКТИРОВАНИЕ ТОВАРА
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

    const createBtn = document.getElementById('add-btn-create');
    if (!createBtn) return console.error("Кнопка #add-btn-create не знайдена в HTML");

    createBtn.disabled = true;
    createBtn.textContent = "Завантаження...";

    try {
        const imageUrls = [];

        for (const file of uploadedFiles) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(fileName, file);

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            imageUrls.push(publicUrlData.publicUrl);
        }

        const productData = {
            name: document.getElementById('add-name').value,
            desc: document.getElementById('add-desc').value,
            price: Number(document.getElementById('add-price').value),
            qty: Number(document.getElementById('add-qty').value),
            olxLink: document.getElementById('add-link').value || ""
        };

        if (typeof editingProductId !== 'undefined' && editingProductId) {
            if (imageUrls.length > 0) productData.images = imageUrls;
            await updateDoc(doc(db, "products", editingProductId), productData);
        } else {
            productData.images = imageUrls;
            await addDoc(collection(db, "products"), productData);
        }

        closeAddItemModal();
    } catch (err) {
        console.error("Помилка при збереженні товару:", err);
        alert(`Не вдалося зберегти: ${err.message || err.code || err}`);
    } finally {
        createBtn.disabled = false;
        createBtn.textContent = (typeof editingProductId !== 'undefined' && editingProductId) ? "Зберегти" : "Створити";
    }
});

function closeAddItemModal() {
    addItemBackdrop.classList.remove('active');
    document.getElementById('add-item-form').reset();
    uploadedFiles = [];
    document.querySelectorAll('.photo-preview').forEach(p => p.remove());
    document.getElementById('add-photo-btn').style.display = 'flex';
    editingProductId = null;
}
document.getElementById('add-btn-cancel').addEventListener('click', closeAddItemModal);

// ОФОРМЛЕНИЕ ЗАКАЗА В TELEGRAM
document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let itemsToProcess = isOneClickCheckout ? [oneClickItem] : checkoutItems;
    if (itemsToProcess.length === 0) return alert("Корзина порожня!");

    const pib = document.getElementById('checkout-name').value;
    const phone = document.getElementById('checkout-phone').value;
    const email = document.getElementById('checkout-email').value || 'Не вказано';
    const city = document.getElementById('checkout-city').value;
    const branch = document.getElementById('checkout-branch').value;
    const delivery = document.querySelector('input[name="delivery"]:checked')?.value || 'Нова Пошта';

    const userEmail = currentUser ? currentUser.email : "немає пошти";
    const nameWithEmail = `${pib} — ${userEmail}`;

    let itemsText = '';
    let totalSum = 0;
    itemsToProcess.forEach(item => {
        itemsText += `📦 *${item.name}* — ${item.price}₴\n`;
        totalSum += item.price;
    });

    const message = `🚨 *Нове замовлення!*\n\n👤 *Покупець:* ${nameWithEmail}\n📞 *Телефон:* ${phone}\n📧 *Email:* ${email}\n📍 *Місто:* ${city}\n🚚 *Служба:* ${delivery}\n🏢 *Відділення/Поштомат:* ${branch}\n\n🛒 *Товари:*\n${itemsText}\n💰 *Всього до сплати:* ${totalSum}₴`;

    try {
        await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: message, parse_mode: 'Markdown' })
        });
        
        alert('Замовлення успешно надіслано!');

        if (confirm("Бажаєте зберігти дані для майбутніх покупок?")) {
            localStorage.setItem('checkout_name', pib);
            localStorage.setItem('checkout_phone', phone);
            localStorage.setItem('checkout_email', email);
            localStorage.setItem('checkout_city', city);
            localStorage.setItem('checkout_branch', branch);
        }

        if (!isOneClickCheckout) {
            checkoutItems = []; 
            await saveUserDataToFirebase();
        }
        
        isOneClickCheckout = false;
        oneClickItem = null;
        
        document.getElementById('checkout-form').reset();
        loadSavedUserData(); 

        updateListsUI();
        checkoutBackdrop.classList.remove('active');
        
    } catch (err) {
        console.error("Помилка при надсиланні замовлення:", err);
        alert(`Не вдалося надіслати: ${err.message || err.code || err}`);
    }
});

// ТЕМЫ И НАСТРОЙКИ
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

document.getElementById('buy').addEventListener('click', () => {
    if (!currentUser) {
        alert("Перш ніж оформляти замовлення ви маєте зареєструватись, «Налаштування - увійти»");
        return;
    }
    if (checkoutItems.length > 0) {
        isOneClickCheckout = false;
        oneClickItem = null;
        updateCheckoutUI();
        modalCart.classList.remove('active'); 
        checkoutBackdrop.classList.add('active');
    }
});

document.getElementById('checkout-btn-back').addEventListener('click', () => {
    checkoutBackdrop.classList.remove('active');
    isOneClickCheckout = false;
    oneClickItem = null;
});