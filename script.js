/* ===== CONFIGURATION ===== */

// DEVELOPER: Replace these placeholder URLs with your actual n8n webhook endpoints.

// ORDER WEBHOOK: sends the order to n8n when user clicks "Confirm Order".
const N8N_ORDER_WEBHOOK = 'https://shining-padding-willow.ngrok-free.dev/webhook/rtbeats-order';

// FEEDBACK WEBHOOK: sends feedback to n8n when user submits.
const N8N_FEEDBACK_WEBHOOK = 'https://shining-padding-willow.ngrok-free.dev/webhook-test/rtbeats-feedback';

/* ===== MEAL DATA ===== */

const meals = [
  { name: 'Burger', image: 'images/burger.jpg' },
  { name: 'Cheese Burger', image: 'images/cheese-burger.jpg' },
  { name: 'Pizza', image: 'images/pizza.png' },
  { name: 'Couscous', image: 'images/couscous.jpg' },
  { name: 'Mkhla3', image: 'images/mkhla3.jpg' },
  { name: 'Rejla', image: 'images/rejla.jpg' },
];

// DEVELOPER: For each meal above, replace the empty image string with the actual image path,
// e.g., 'assets/images/burger.jpg'. The placeholder icon will display until images are provided.

/* ===== GREETING ROTATION ===== */

const greetings = ['Welcome', 'مرحبا', 'Bienvenido'];
let greetingIndex = 0;
const greetingEl = document.getElementById('greeting');

function rotateGreeting() {
  greetingIndex = (greetingIndex + 1) % greetings.length;
  greetingEl.style.opacity = '0';
  setTimeout(() => {
    greetingEl.textContent = greetings[greetingIndex];
    greetingEl.style.opacity = '1';
  }, 300);
}

setInterval(rotateGreeting, 3000);

/* ===== RENDER MENU ===== */

const menuGrid = document.getElementById('menuGrid');

meals.forEach((meal, index) => {
  const card = document.createElement('div');
  card.className = 'meal-card';
  card.dataset.index = index;

  const imgSrc = meal.image || '';
  card.innerHTML = imgSrc
    ? `<img class="meal-img" src="${imgSrc}" alt="${meal.name}">
       <p class="meal-name">${meal.name}</p>`
    : `<div class="meal-placeholder">
        <i class="fas fa-image"></i>
       </div>
       <p class="meal-name">${meal.name}</p>`;

  card.addEventListener('click', () => openModal(index));
  menuGrid.appendChild(card);
});

/* ===== MODAL LOGIC ===== */

const modalOverlay = document.getElementById('modalOverlay');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const orderBtn = document.getElementById('orderBtn');
const orderForm = document.getElementById('orderForm');
const confirmBtn = document.getElementById('confirmBtn');
const customerName = document.getElementById('customerName');
const orderModule = document.getElementById('orderModule');
const confirmationScreen = document.getElementById('confirmationScreen');
const confOrderNumber = document.getElementById('confOrderNumber');
const confName = document.getElementById('confName');
const confMeal = document.getElementById('confMeal');
const doneBtn = document.getElementById('doneBtn');

let currentMealIndex = null;

// Global order counter (shared across all users)
const COUNTER_KEY = 'rtbeats-orders';
async function getNextOrderNumber() {
  try {
    const res = await fetch(`https://countapi.mileshilliard.com/api/v1/hit/${COUNTER_KEY}`);
    const data = await res.json();
    return data.value;
  } catch {
    // fallback: use localStorage if the API fails
    let c = parseInt(localStorage.getItem('rtbeats_order_fallback'), 10);
    if (isNaN(c)) c = 0;
    c++;
    localStorage.setItem('rtbeats_order_fallback', c);
    return c;
  }
}

function openModal(index) {
  currentMealIndex = index;
  const meal = meals[index];

  modalImage.src = meal.image || 'https://via.placeholder.com/400x240?text=' + encodeURIComponent(meal.name);
  modalImage.alt = meal.name;
  modalTitle.textContent = meal.name;

  orderForm.classList.remove('active');
  orderBtn.style.display = 'block';
  customerName.value = '';
  confirmBtn.disabled = false;
  confirmBtn.textContent = 'Confirm Order';
  orderModule.style.display = '';
  confirmationScreen.classList.remove('active');
  document.getElementById('n8nError').classList.remove('active');

  modalOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.body.style.overflow = '';
  confirmationScreen.classList.remove('active');
}

modalClose.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ===== ORDER FLOW ===== */

orderBtn.addEventListener('click', () => {
  orderForm.classList.add('active');
  orderBtn.style.display = 'none';
});

confirmBtn.addEventListener('click', async () => {
  const name = customerName.value.trim();
  if (!name) {
    customerName.focus();
    return;
  }

  const mealName = meals[currentMealIndex].name;

  confirmBtn.disabled = true;
  confirmBtn.textContent = 'جاري تسجيل الطلب...';

  const orderNumber = await getNextOrderNumber();

  orderModule.style.display = 'none';
  confOrderNumber.textContent = orderNumber;
  confName.textContent = name;
  confMeal.textContent = mealName;
  confirmationScreen.classList.add('active');

  const n8nError = document.getElementById('n8nError');

  fetch(N8N_ORDER_WEBHOOK, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({
      orderNumber,
      meal: mealName,
      customer: name,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    n8nError.classList.add('active');
  });
});

doneBtn.addEventListener('click', closeModal);

/* ===== FEEDBACK ===== */

const feedbackSubmit = document.getElementById('feedbackSubmit');
const feedbackText = document.getElementById('feedbackText');

feedbackSubmit.addEventListener('click', async () => {
  const message = feedbackText.value.trim();
  if (!message) {
    feedbackText.focus();
    return;
  }

    feedbackSubmit.disabled = true;
  feedbackSubmit.textContent = 'جاري الإرسال...';

  try {
    await fetch(N8N_FEEDBACK_WEBHOOK, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: message, date: new Date().toISOString() }),
    });
  } catch {
    // إذا فشل الاتصال بـ n8n، احفظ محلياً
    const saved = JSON.parse(localStorage.getItem('rtbeats_feedback') || '[]');
    saved.push({ message, date: new Date().toISOString() });
    localStorage.setItem('rtbeats_feedback', JSON.stringify(saved));
  }

  alert('Thank you for your feedback!');
  feedbackText.value = '';
  feedbackSubmit.disabled = false;
  feedbackSubmit.textContent = 'Submit';
});
