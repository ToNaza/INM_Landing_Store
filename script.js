import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, setDoc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
let newsCarouselInterval = null;

let allProducts = [];
let savedWishesIds = [];
let savedCartIds = [];

let isOneClickCheckout = false;
let oneClickItem = null;

// Глобальні змінні для новин
let uploadedNewsFiles = [];

const modalBackdrop = document.getElementById('modal-backdrop');
const modalWishes = document.getElementById('modal-wishes');
const modalCart = document.getElementById('modal-cart');
const modalSettings = document.getElementById('modal-settings');
const modalInfo = document.getElementById('modal-info');
const modalAdminUsers = document.getElementById('modal-admin-users');
const modalAdminNews = document.getElementById('modal-admin-news');
const modalUserNews = document.getElementById('modal-user-news');
const checkoutBackdrop = document.getElementById('checkout-backdrop');
const addItemBackdrop = document.getElementById('add-item-backdrop');

const infoBtn = document.getElementById('info');
const userNameEl = document.getElementById('user-name');
const userAvatarImg = document.querySelector('.user-avatar img');
const productsContainer = document.querySelector('.list');

function loadSavedUserData() {
    if (localStorage.getItem('checkout_name')) document.getElementById('checkout-name').value = localStorage.getItem('checkout_name');
    if (localStorage.getItem('checkout_phone')) document.getElementById('checkout-phone').value = localStorage.getItem('checkout_phone');
    if (localStorage.getItem('checkout_email')) document.getElementById('checkout-email').value = localStorage.getItem('checkout_email');
    if (localStorage.getItem('checkout_city')) document.getElementById('checkout-city').value = localStorage.getItem('checkout_city');
    if (localStorage.getItem('checkout_branch')) document.getElementById('checkout-branch').value = localStorage.getItem('checkout_branch');
}
loadSavedUserData();

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

async function saveUserDataToFirebase() {
    if (!currentUser) return;
    try {
        savedWishesIds = wishesList.map(item => item.id);
        savedCartIds = checkoutItems.map(item => item.id);
        await updateDoc(doc(db, "users", currentUser.uid), {
            wishes: savedWishesIds,
            cart: savedCartIds
        });
    } catch (e) {
        console.error("Помилка збереження даних користувача:", e);
    }
}

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
        
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                
                if (data.banned) {
                    window.location.href = 'bun.html';
                    return;
                }

                if (!data.email) {
                    await updateDoc(doc(db, "users", user.uid), { email: user.email });
                }

                savedWishesIds = data.wishes || [];
                savedCartIds = data.cart || [];
            } else {
                await setDoc(doc(db, "users", user.uid), {
                    email: user.email,
                    banned: false,
                    wishes: [],
                    cart: []
                });
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

    if (event.shiftKey && event.code === 'KeyP') {
        event.preventDefault();
        if (currentUser && currentUser.uid === ADMIN_UID) {
            openAdminUsersModal();
        } else {
            alert("Доступ обмежено. Необхідні права адміністратора.");
        }
    }

    if (event.shiftKey && (event.code === 'KeyN' || event.key === 'N' || event.key === 'н' || event.key === 'Н')) { 
        event.preventDefault();
        if (currentUser && currentUser.uid === ADMIN_UID) {
            openAdminNewsModal();
        } else {
            alert("Доступ обмежено. Необхідні права адміністратора.");
        }
    }

    if (event.shiftKey && (event.code === 'KeyT' || event.key === 'T' || event.key === 'е' || event.key === 'Е')) {
        event.preventDefault();
        if (currentUser && currentUser.uid === ADMIN_UID) {
            openAdminTechModal();
        }
    }
});

async function openAdminUsersModal() {
    closeWishes();
    closeCart();
    closeSettings();
    closeInfo();
    closeAdminNewsModal();
    
    if (modalAdminUsers) modalAdminUsers.classList.add('active');

    const container = document.getElementById('admin-users-list');
    if (container) container.innerHTML = '<span style="color:#000;">Завантаження...</span>';

    try {
        const usersSnap = await getDocs(collection(db, "users"));
        if (!container) return;
        container.innerHTML = '';

        usersSnap.forEach(docSnap => {
            const userData = docSnap.data();
            const uid = docSnap.id;
            
            if (uid === ADMIN_UID) return;

            const email = userData.email || 'Немає пошти';
            const isBanned = userData.banned || false;

            const userRow = document.createElement('div');
            userRow.className = 'admin-user-row';
            userRow.innerHTML = `
                <span class="admin-user-email">${email}</span>
                <button class="admin-ban-btn ${isBanned ? 'banned' : ''}">${isBanned ? 'Розбанити' : 'Забанити'}</button>
            `;

            userRow.querySelector('.admin-ban-btn').onclick = async () => {
                const newBanState = !isBanned;
                await updateDoc(doc(db, "users", uid), { banned: newBanState });
                openAdminUsersModal(); 
            };

            container.appendChild(userRow);
        });

        if (container.innerHTML === '') {
            container.innerHTML = '<span style="color:#444;">Користувачів не знайдено</span>';
        }
    } catch (e) {
        console.error(e);
        if (container) container.innerHTML = '<span style="color:#ef4444;">Помилка завантаження</span>';
    }
}

function closeAdminUsers() {
    if (modalAdminUsers) modalAdminUsers.classList.remove('active');
}

function closeWishes() {
    if (modalWishes) modalWishes.classList.remove('active');
    if (document.querySelector('#main-wishes-btn img')) {
        document.querySelector('#main-wishes-btn img').src = './media/love_off.svg';
    }
}

function closeCart() {
    if (modalCart) modalCart.classList.remove('active');
    if (document.querySelector('#main-cart-btn img')) {
        document.querySelector('#main-cart-btn img').src = './media/basket_off.svg';
    }
}

function closeSettings() {
    if (modalSettings) modalSettings.classList.remove('active');
}

function closeInfo() {
    if (modalInfo) modalInfo.classList.remove('active');
}

function openAdminNewsModal() {
    closeWishes();
    closeCart();
    closeSettings();
    closeInfo();
    closeAdminUsers();
    if (modalAdminNews) modalAdminNews.classList.add('active');
    loadCurrentNewsInAdmin();
}

function closeAdminNewsModal() {
    if (modalAdminNews) modalAdminNews.classList.remove('active');
    const form = document.getElementById('admin-news-form');
    if (form) form.reset();
    uploadedNewsFiles = [];
    document.querySelectorAll('.photo-preview-news').forEach(p => p.remove());
}

function closeUserNewsModal() {
    if (modalUserNews) modalUserNews.classList.remove('active');
    if (newsCarouselInterval) clearInterval(newsCarouselInterval);
}

function openWishes() {
    closeCart(); 
    closeSettings(); 
    closeInfo();
    closeAdminUsers();
    closeAdminNewsModal();
    if (modalWishes) modalWishes.classList.add('active');
    if (document.querySelector('#main-wishes-btn img')) {
        document.querySelector('#main-wishes-btn img').src = './media/love_on.svg';
    }
}

function openCart() {
    closeWishes();
    closeSettings();
    closeInfo();
    closeAdminUsers();
    closeAdminNewsModal();
    if (modalCart) modalCart.classList.add('active');
    if (document.querySelector('#main-cart-btn img')) {
        document.querySelector('#main-cart-btn img').src = './media/basket_on.svg';
    }
}

function openSettings() {
    closeWishes();
    closeCart();
    closeInfo();
    closeAdminUsers();
    closeAdminNewsModal();
    if (modalSettings) modalSettings.classList.add('active');
}

if (infoBtn) {
    infoBtn.addEventListener('click', () => {
        closeWishes();
        closeCart();
        closeSettings();
        closeAdminUsers();
        closeAdminNewsModal();
        if (modalInfo) modalInfo.classList.add('active');
    });
}

document.querySelectorAll('#main-wishes-btn, #modal-cart-wishes-btn, #modal-wishes-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        modalWishes.classList.contains('active') ? closeWishes() : openWishes();
    });
});

document.querySelectorAll('#main-cart-btn, #modal-wishes-cart-btn, #modal-cart-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        modalCart.classList.contains('active') ? closeCart() : openCart();
    });
});

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
    if (e.target === modalAdminUsers) closeAdminUsers();
    if (e.target === modalAdminNews) closeAdminNewsModal();
    if (e.target === modalUserNews) closeUserNewsModal();
    if (e.target === modalBackdrop) {
        modalBackdrop.classList.remove('active');
        if (modalCarouselInterval) clearInterval(modalCarouselInterval);
    }
});

function createCardElement(product) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const isAvailable = product.qty > 0;
    const statusClass = isAvailable ? 'status-available' : 'status-sold';
    const statusText = isAvailable ? `В наявності ${product.qty}шт.` : 'Продано';
    
    // ЛОГИКА СКИДКИ ДЛЯ КАРТОЧКИ
    const discount = product.discount || 0;
    let priceHTML = '';
    
    if (discount > 0) {
        const finalPrice = Math.round(product.price * (1 - discount / 100));
        priceHTML = `
            <div class="product-price-container">
                <span class="price-old">${product.price}₴</span>
                <span class="price-new">${finalPrice}₴</span>
            </div>
        `;
    } else {
        priceHTML = `<span>Ціна - ${product.price}₴</span>`;
    }

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
                ${priceHTML}
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        closeWishes();
        closeCart();
        closeSettings();
        closeInfo();
        closeAdminUsers();
        closeAdminNewsModal();
        openProductModal(product);
    });

    return card;
}

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

function updateCheckoutUI() {
    const checkoutContainer = document.getElementById('checkout-items-container');
    const totalSumEl = document.getElementById('checkout-total-sum');
    
    if (!checkoutContainer) return;

    let itemsToRender = isOneClickCheckout ? [oneClickItem] : checkoutItems;

    const renderItem = (item) => {
        const discount = item.discount || 0;
        const currentPrice = discount > 0 ? Math.round(item.price * (1 - discount / 100)) : item.price;
        
        return `
            <div class="checkout-item" style="display:flex; align-items:center; gap:10px; background:#a3a3a3; padding:10px; border-radius:10px; margin-bottom:10px; width: 100%; box-sizing: border-box;">
                <img src="${item.images?.length ? item.images[0] : './media/no-photo.png'}" style="width:50px; height:50px; object-fit:cover; border-radius:5px;">
                <div style="flex-grow:1; color:#000;">
                    <b>${item.name}</b><br>${discount > 0 ? `<span style="text-decoration:line-through; font-size:12px; color:#555;">${item.price}₴</span> ` : ''}${currentPrice}₴
                </div>
            </div>`;
    };

    checkoutContainer.innerHTML = itemsToRender.map(renderItem).join('');
    
    if (totalSumEl) {
        totalSumEl.textContent = itemsToRender.reduce((sum, item) => {
            const discount = item.discount || 0;
            const currentPrice = discount > 0 ? Math.round(item.price * (1 - discount / 100)) : item.price;
            return sum + currentPrice;
        }, 0);
    }
}

onSnapshot(collection(db, "products"), (snapshot) => {
    allProducts = [];
    if (productsContainer) productsContainer.innerHTML = '';
    snapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        allProducts.push(product);
        const card = createCardElement(product);
        if (productsContainer) productsContainer.appendChild(card);
    });
    syncListsWithAllProducts();
});

function openProductModal(product) {
    if (modalCarouselInterval) clearInterval(modalCarouselInterval);

    document.getElementById('modal-name').textContent = `“${product.name}”`;
    document.getElementById('modal-status').textContent = product.qty > 0 ? `В наявності ${product.qty}шт.` : 'Продано';
    document.getElementById('modal-description').textContent = product.desc;
    
    // ЛОГИКА СКИДКИ В МОДАЛКЕ ТОВАРА
    const discount = product.discount || 0;
    const priceEl = document.getElementById('modal-price');
    
    if (discount > 0) {
        const finalPrice = Math.round(product.price * (1 - discount / 100));
        priceEl.innerHTML = `<span class="price-old" style="text-decoration: line-through; color: #505050; font-size: 14px; margin-right: 8px;">${product.price}₴</span><span class="price-new" style="color: #ef4444; font-weight: bold; font-size: 18px;">${finalPrice}₴</span>`;
    } else {
        priceEl.textContent = `Ціна - ${product.price}₴`;
    }
    
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

    if (heartBtnImg) heartBtnImg.src = wishesList.some(item => item.id === product.id) ? './media/love_on.svg' : './media/love_off.svg';
    if (basketBtnImg) basketBtnImg.src = checkoutItems.some(item => item.id === product.id) ? './media/basket_on.svg' : './media/basket_off.svg';

    document.getElementById('modal-heart').onclick = async (e) => {
        e.stopPropagation();
        const idx = wishesList.findIndex(item => item.id === product.id);
        if (idx > -1) wishesList.splice(idx, 1);
        else wishesList.push(product);
        if (heartBtnImg) heartBtnImg.src = wishesList.some(item => item.id === product.id) ? './media/love_on.svg' : './media/love_off.svg';
        await saveUserDataToFirebase();
        updateListsUI();
    };

    document.getElementById('modal-basket').onclick = async (e) => {
        e.stopPropagation();
        const idx = checkoutItems.findIndex(item => item.id === product.id);
        if (idx > -1) checkoutItems.splice(idx, 1);
        else checkoutItems.push(product);
        if (basketBtnImg) basketBtnImg.src = checkoutItems.some(item => item.id === product.id) ? './media/basket_on.svg' : './media/basket_off.svg';
        await saveUserDataToFirebase();
        updateListsUI();
    };

    const textButtonsContainer = document.querySelector('.text-buttons');
    if (!textButtonsContainer) return;
    
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

// script.js -> внутри кнопки редактирования товара
document.getElementById('modal-edit-btn').onclick = () => {
    if (modalCarouselInterval) clearInterval(modalCarouselInterval);
    editingProductId = product.id;
    document.getElementById('add-name').value = product.name;
    document.getElementById('add-desc').value = product.desc;
    document.getElementById('add-price').value = product.price;
    
    // ↓↓↓ Добавляем подтягивание скидки (если её нет, будет пустая строка)
    document.getElementById('add-discount').value = product.discount || "";
    
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

const photoInput = document.getElementById('photo-input');
let uploadedFiles = [];

if (photoInput) {
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
}

const addItemForm = document.getElementById('add-item-form');
if (addItemForm) {
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser || currentUser.uid !== ADMIN_UID) return;

        const createBtn = document.getElementById('add-btn-create');
        if (!createBtn) return;

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

            // Считываем скидку
            const discountInput = document.getElementById('add-discount');
            const discount = discountInput ? parseInt(discountInput.value, 10) || 0 : 0;


        const productData = {
            name: document.getElementById('add-name').value,
            desc: document.getElementById('add-desc').value,
            price: Number(document.getElementById('add-price').value),
            discount: Number(document.getElementById('add-discount').value) || 0,
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
            console.error(err);
            alert(`Не вдалося зберегти: ${err.message || err.code || err}`);
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = (typeof editingProductId !== 'undefined' && editingProductId) ? "Зберегти" : "Створити";
        }
    });
}

function closeAddItemModal() {
    if (addItemBackdrop) addItemBackdrop.classList.remove('active');
    const form = document.getElementById('add-item-form');
    if (form) form.reset();
    uploadedFiles = [];
    document.querySelectorAll('.photo-preview').forEach(p => p.remove());
    const addPhotoBtn = document.getElementById('add-photo-btn');
    if (addPhotoBtn) addPhotoBtn.style.display = 'flex';
    editingProductId = null;
}

const cancelBtn = document.getElementById('add-btn-cancel');
if (cancelBtn) cancelBtn.addEventListener('click', closeAddItemModal);

const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
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
            const discount = item.discount || 0;
            const currentPrice = discount > 0 ? Math.round(item.price * (1 - discount / 100)) : item.price;
            
            itemsText += `📦 *${item.name}* — ${currentPrice}₴ ${discount > 0 ? `(Знижка ${discount}%, стара ціна ${item.price}₴)` : ''}\n`;
            totalSum += currentPrice;
        });

        const message = `🚨 *Нове замовлення!*\n\n👤 *Покупець:* ${nameWithEmail}\n📞 *Телефон:* ${phone}\n📧 *Email:* ${email}\n📍 *Місто:* ${city}\n🚚 *Служба:* ${delivery}\n🏢 *Відділення/Поштомат:* ${branch}\n\n🛒 *Товари:*\n${itemsText}\n💰 *Всього до сплати:* ${totalSum}₴`;

        try {
            await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TG_CHAT_ID, text: message, parse_mode: 'Markdown' })
            });
            
            alert('Замовлення успішно надіслано!');

            if (confirm("Бажаєте зберегти дані для майбутніх покупок?")) {
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
            
            checkoutForm.reset();
            loadSavedUserData(); 

            updateListsUI();
            if (checkoutBackdrop) checkoutBackdrop.classList.remove('active');
            
        } catch (err) {
            console.error(err);
            alert(`Не вдалося надіслати: ${err.message || err.code || err}`);
        }
    });
}

const buyBtn = document.getElementById('buy');
if (buyBtn) {
    buyBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert("Перш ніж оформляти замовлення ви маєте зареєструватись, «Налаштування - увійти»");
            return;
        }
        if (checkoutItems.length > 0) {
            isOneClickCheckout = false;
            oneClickItem = null;
            updateCheckoutUI();
            modalCart.classList.remove('active'); 
            if (checkoutBackdrop) checkoutBackdrop.classList.add('active');
        }
    });
}

const backBtn = document.getElementById('checkout-btn-back');
if (backBtn) {
    backBtn.addEventListener('click', () => {
        if (checkoutBackdrop) checkoutBackdrop.classList.remove('active');
        isOneClickCheckout = false;
        oneClickItem = null;
    });
}

/* ==========================================================================
   ЛОГІКА УПРАВЛІННЯ ТА ВІДОБРАЖЕННЯ НОВИН (FIRESTORE & SUPABASE)
   ========================================================================== */

let localExistingNewsImages = []; 
let currentNewsTimestamp = null;  

function handleNewsPhotoSelect(event) {
    const files = Array.from(event.target.files);
    if (uploadedNewsFiles.length + localExistingNewsImages.length + files.length > 5) {
        alert("Можна завантажити не більше 5 зображень для новини");
        event.target.value = "";
        return;
    }

    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            uploadedNewsFiles.push(file);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.classList.add('photo-preview-news');
                img.dataset.filename = file.name; 
                
                img.onclick = function() {
                    uploadedNewsFiles = uploadedNewsFiles.filter(f => f.name !== img.dataset.filename);
                    img.remove();
                };

                const container = document.getElementById('news-photo-preview-container');
                const btn = document.getElementById('add-news-photo-btn');
                if (container && btn) container.insertBefore(img, btn);
            }
            reader.readAsDataURL(file);
        }
    });
    event.target.value = "";
}

async function loadCurrentNewsInAdmin() {
    try {
        const newsDoc = await getDoc(doc(db, "news", "current"));
        if (newsDoc.exists()) {
            const data = newsDoc.data();
            document.getElementById('news-active').checked = data.active || false;
            document.getElementById('news-text').value = data.text || "";
            document.getElementById('news-text-first').checked = data.textFirst || false;
            
            localExistingNewsImages = data.images || [];
            document.querySelectorAll('.photo-preview-news').forEach(p => p.remove());
            
            const container = document.getElementById('news-photo-preview-container');
            const btn = document.getElementById('add-news-photo-btn');
            
            localExistingNewsImages.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.classList.add('photo-preview-news');
                
                img.onclick = function() {
                    if (confirm("Видалити це фото з новини? (Зміни наберуть сили після збереження)")) {
                        localExistingNewsImages = localExistingNewsImages.filter(u => u !== url);
                        img.remove();
                    }
                };

                if (container && btn) container.insertBefore(img, btn);
            });
        }
    } catch (e) {
        console.error("Помилка завантаження поточної новини в адмінку:", e);
    }
}

async function saveNewsHandler(e) {
    e.preventDefault();
    if (!currentUser || currentUser.uid !== ADMIN_UID) return;

    const saveBtn = document.getElementById('news-btn-save');
    if (!saveBtn) return;

    saveBtn.disabled = true;
    saveBtn.textContent = "Завантаження...";

    try {
        const imageUrls = [...localExistingNewsImages];

        for (const file of uploadedNewsFiles) {
            const fileExt = file.name.split('.').pop();
            const fileName = `news_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(fileName, file);

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            imageUrls.push(publicUrlData.publicUrl);
        }

        const newsData = {
            active: document.getElementById('news-active').checked,
            text: document.getElementById('news-text').value,
            textFirst: document.getElementById('news-text-first').checked,
            images: imageUrls,
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, "news", "current"), newsData);
        closeAdminNewsModal();
        alert("Новину успішно збережено!");
    } catch (err) {
        console.error(err);
        alert(`Не вдалося зберегти новину: ${err.message || err.code || err}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Зберегти";
    }
}

onSnapshot(doc(db, "news", "current"), (docSnap) => {
    if (!docSnap.exists()) return;
    const newsData = docSnap.data();
    
    if (!newsData.active) return;

    currentNewsTimestamp = newsData.updatedAt || "";
    if (localStorage.getItem('muted_news_timestamp') === currentNewsTimestamp) return;
    if (currentUser && currentUser.uid === ADMIN_UID) return;

    const userNewsBody = document.getElementById('user-news-body');
    if (!userNewsBody) return;

    userNewsBody.innerHTML = '';

    const dontShowCheckbox = document.getElementById('dont-show-news-checkbox');
    if (dontShowCheckbox) dontShowCheckbox.checked = false;

    const openLightbox = (imgSrc) => {
        const lightbox = document.createElement('div');
        lightbox.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:30000; display:flex; align-items:center; justify-content:center; cursor:zoom-out; opacity:0; transition:opacity 0.2s ease;';
        lightbox.innerHTML = `<img src="${imgSrc}" style="max-width:95%; max-height:95%; object-fit:contain; border-radius:10px; box-shadow:0 10px 40px rgba(0,0,0,0.8);">`;
        document.body.appendChild(lightbox);
        setTimeout(() => lightbox.style.opacity = '1', 10);
        lightbox.onclick = () => {
            lightbox.style.opacity = '0';
            setTimeout(() => lightbox.remove(), 200);
        };
    };

    const textHtml = `<div class="news-modal-text">${newsData.text}</div>`;
    
    const createImgEl = (src) => {
        const img = document.createElement('img');
        img.className = 'news-modal-img';
        img.src = src;
        img.alt = "Новина";
        img.style.cursor = "zoom-in";
        img.onclick = () => openLightbox(img.src);
        return img;
    };

    if (newsData.textFirst) {
        userNewsBody.innerHTML = textHtml;
        if (newsData.images && newsData.images.length > 0) {
            userNewsBody.appendChild(createImgEl(newsData.images[0]));
        }
    } else {
        if (newsData.images && newsData.images.length > 0) {
            userNewsBody.appendChild(createImgEl(newsData.images[0]));
        }
        userNewsBody.insertAdjacentHTML('beforeend', textHtml);
    }

    if (newsCarouselInterval) clearInterval(newsCarouselInterval);
    if (newsData.images && newsData.images.length > 1) {
        let imgIndex = 0;
        const newsImgEl = userNewsBody.querySelector('.news-modal-img');
        if (newsImgEl) {
            newsCarouselInterval = setInterval(() => {
                imgIndex = (imgIndex + 1) % newsData.images.length;
                newsImgEl.src = newsData.images[imgIndex];
            }, 5000);
        }
    }

    if (modalUserNews) modalUserNews.classList.add('active');
});

// Ініціалізація подій новини
const newsCloseX = document.getElementById('news-btn-close-x');
if (newsCloseX) newsCloseX.addEventListener('click', closeAdminNewsModal);

const newsBtnCancel = document.getElementById('news-btn-cancel');
if (newsBtnCancel) newsBtnCancel.addEventListener('click', closeAdminNewsModal);

const adminNewsForm = document.getElementById('admin-news-form');
if (adminNewsForm) adminNewsForm.addEventListener('submit', saveNewsHandler);

const newsPhotoInput = document.getElementById('news-photo-input');
if (newsPhotoInput) newsPhotoInput.addEventListener('change', handleNewsPhotoSelect);

const userNewsCloseBtn = document.getElementById('user-news-close-btn');
if (userNewsCloseBtn) userNewsCloseBtn.addEventListener('click', closeUserNewsModal);

const dontShowCheckbox = document.getElementById('dont-show-news-checkbox');
if (dontShowCheckbox) {
    dontShowCheckbox.addEventListener('change', (e) => {
        if (e.target.checked && currentNewsTimestamp) {
            localStorage.setItem('muted_news_timestamp', currentNewsTimestamp);
        } else {
            localStorage.removeItem('muted_news_timestamp');
        }
    });
}

// СКРЫТИЕ ЛОАДЕРА
onSnapshot(collection(db, "products"), (snapshot) => {
    allProducts = [];
    if (productsContainer) productsContainer.innerHTML = '';
    
    snapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        allProducts.push(product);
        const card = createCardElement(product);
        if (productsContainer) productsContainer.appendChild(card);
    });
    
    syncListsWithAllProducts();

    const loadingScreen = document.getElementById('app-loading-screen');
    if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
        loadingScreen.classList.add('hidden');
    }
});

let tempTechActive = false; 

// Единый слушатель базы данных для тех-стопа
onSnapshot(doc(db, "system", "maintenance"), (snapshot) => {
    const techToggleBtn = document.getElementById('tech-toggle-btn');
    const techTextInput = document.getElementById('tech-text-input');
    const maintenanceModal = document.getElementById('modal-tech-maintenance');
    
    if (snapshot.exists()) {
        const data = snapshot.data();
        tempTechActive = data.active || false;
        const techText = data.text || "";
        
        if (techToggleBtn) {
            if (tempTechActive) {
                techToggleBtn.textContent = "Тех стоп: Активно";
                techToggleBtn.className = "tech-btn-active";
            } else {
                techToggleBtn.textContent = "Тех стоп: Неактивно";
                techToggleBtn.className = "tech-btn-inactive";
            }
        }
        
        if (techTextInput && document.activeElement !== techTextInput) {
            techTextInput.value = techText;
        }
        
        if (maintenanceModal) {
            const textElement = maintenanceModal.querySelector('p');
            if (textElement) {
                textElement.textContent = techText || "Ведуться технічні роботи. Будь ласка, зачекайте, скоро ми повернемося!";
            }
        }
    }
    
    handleMaintenanceScreen();
});

function handleMaintenanceScreen() {
    const maintenanceModal = document.getElementById('modal-tech-maintenance');
    if (!maintenanceModal) return;
    
    if (tempTechActive && (!currentUser || currentUser.uid !== ADMIN_UID)) {
        maintenanceModal.style.display = 'flex';
    } else {
        maintenanceModal.style.display = 'none';
    }
}

window.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.code === 'KeyT') {
        e.preventDefault(); 
        if (currentUser && currentUser.uid === ADMIN_UID) {
            const adminTechModal = document.getElementById('modal-admin-tech');
            if (adminTechModal) {
                adminTechModal.classList.add('active');
            }
        } else {
            console.error("Доступ заборонено: гарячі клавіші тех-системы доступні тільки адміну.");
        }
    }
});

const adminMenuTechBtn = document.getElementById('admin-menu-tech');
if (adminMenuTechBtn) {
    adminMenuTechBtn.addEventListener('click', () => {
        const adminMenu = document.getElementById('modal-admin-menu');
        const adminTechModal = document.getElementById('modal-admin-tech');
        
        if (adminMenu) adminMenu.classList.remove('active');
        if (adminTechModal) adminTechModal.classList.add('active');
    });
}

const techToggleBtn = document.getElementById('tech-toggle-btn');
if (techToggleBtn) {
    techToggleBtn.addEventListener('click', () => {
        tempTechActive = !tempTechActive;
        if (tempTechActive) {
            techToggleBtn.textContent = "Тех стоп: Активно";
            techToggleBtn.className = "tech-btn-active";
        } else {
            techToggleBtn.textContent = "Тех стоп: Неактивно";
            techToggleBtn.className = "tech-btn-inactive";
        }
    });
}

const techSaveBtn = document.getElementById('tech-save-btn');
if (techSaveBtn) {
    techSaveBtn.addEventListener('click', async () => {
        const techTextInput = document.getElementById('tech-text-input');
        const textInputVal = techTextInput ? techTextInput.value : "";
        
        try {
            await setDoc(doc(db, "system", "maintenance"), {
                active: tempTechActive,
                text: textInputVal
            }, { merge: true });
            
            alert("Дані тех-стопу успішно оновлено!");
            const adminTechModal = document.getElementById('modal-admin-tech');
            if (adminTechModal) adminTechModal.classList.remove('active');
        } catch (e) {
            console.error("Помилка збереження статусу тех-стопу:", e);
            alert("Критична помилка при збереженні.");
        }
    });
}

const logoImg = document.getElementById('logo');
if (logoImg) {
    logoImg.addEventListener('click', (e) => {
        if (e.detail === 3) {
            if (currentUser && currentUser.uid === ADMIN_UID) {
                if (typeof closeWishes === 'function') closeWishes();
                if (typeof closeCart === 'function') closeCart();
                if (typeof closeSettings === 'function') closeSettings();
                if (typeof closeInfo === 'function') closeInfo();
                if (typeof closeAdminUsers === 'function') closeAdminUsers();
                if (typeof closeAdminNewsModal === 'function') closeAdminNewsModal();
                
                const adminMenu = document.getElementById('modal-admin-menu');
                if (adminMenu) adminMenu.classList.add('active');
            } else {
                console.error("Доступ отклонен: вы не авторизованы как admin.");
            }
        }
    });
}

const adminMenuProducts = document.getElementById('admin-menu-products');
if (adminMenuProducts) {
    adminMenuProducts.addEventListener('click', () => {
        const adminMenu = document.getElementById('modal-admin-menu');
        if (adminMenu) adminMenu.classList.remove('active');
        editingProductId = null; 
        const addBtnCreate = document.getElementById('add-btn-create');
        if (addBtnCreate) addBtnCreate.textContent = "Створити";
        if (typeof addItemBackdrop !== 'undefined') addItemBackdrop.classList.add('active');
    });
}

const adminMenuNews = document.getElementById('admin-menu-news');
if (adminMenuNews) {
    adminMenuNews.addEventListener('click', () => {
        const adminMenu = document.getElementById('modal-admin-menu');
        if (adminMenu) adminMenu.classList.remove('active');
        if (typeof openAdminNewsModal === 'function') openAdminNewsModal();
    });
}

const adminMenuUsers = document.getElementById('admin-menu-users');
if (adminMenuUsers) {
    adminMenuUsers.addEventListener('click', () => {
        const adminMenu = document.getElementById('modal-admin-menu');
        if (adminMenu) adminMenu.classList.remove('active');
        if (typeof openAdminUsersModal === 'function') openAdminUsersModal();
    });
}

const adminMenuModalElement = document.getElementById('modal-admin-menu');
if (adminMenuModalElement) {
    adminMenuModalElement.addEventListener('click', (e) => {
        if (e.target === adminMenuModalElement) {
            adminMenuModalElement.classList.remove('active');
        }
    });
}

