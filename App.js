/*
  =====================================================================
  PocketWise · app.js
  Finnova — Frontend by: [Your Name]

  BACKEND TEAM: Search for "TODO:" to find every integration point.
  Each TODO block shows exactly what data shape the UI expects.

  API_BASE is the only variable you need to change when your backend
  is deployed. Everything else wires up automatically.
  =====================================================================
*/

const API_BASE = "http://localhost:5000/api"; // TODO: replace with your deployed backend URL

const Auth = {
  getToken: () => localStorage.getItem("pw_token"),
  setToken: (t) => localStorage.setItem("pw_token", t),
  clearToken: () => localStorage.removeItem("pw_token"),
  isLoggedIn: () => !!localStorage.getItem("pw_token"),
};

async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    Auth.clearToken();
    showToast("Session expired. Please log in again.", "error");
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  return res.json();
}


/* =====================================================================
   AUTH — Sign Up & Login
   ===================================================================== */

async function handleSignUp(email, password, name) {
  /*
    TODO (Backend team):
    POST /api/auth/signup
    Body:   { email, password, name }
    Returns: { token, user: { id, name, email } }
  */
  try {
    const data = await apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    if (!data) return;
    Auth.setToken(data.token);
    showToast(`Welcome to PocketWise, ${data.user.name}!`, "success");
    updateNavForLoggedInUser(data.user);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleLogin(email, password) {
  /*
    TODO (Backend team):
    POST /api/auth/login
    Body:   { email, password }
    Returns: { token, user: { id, name, email } }
  */
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!data) return;
    Auth.setToken(data.token);
    showToast(`Welcome back, ${data.user.name}!`, "success");
    updateNavForLoggedInUser(data.user);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function handleLogout() {
  Auth.clearToken();
  showToast("You have been logged out.", "success");
  updateNavForGuest();
}


/* =====================================================================
   DASHBOARD — Summary Metrics
   ===================================================================== */

async function loadDashboardSummary() {
  /*
    TODO (Backend team):
    GET /api/dashboard/summary
    Headers: Authorization: Bearer <token>
    Returns: {
      totalIncome:   number,   // e.g. 8000
      totalExpenses: number,   // e.g. 4760
      totalSaved:    number,   // e.g. 3240
      savingsGoal:   number,   // e.g. 5000
      savingsStreak: number,   // days tracked in a row
    }
  */
  if (!Auth.isLoggedIn()) return;

  try {
    const data = await apiFetch("/dashboard/summary");
    if (!data) return;
    renderDashboardMetrics(data);
  } catch (err) {
    showToast("Failed to load dashboard summary.", "error");
  }
}

function renderDashboardMetrics(data) {
  const incomeEl  = document.getElementById("dm-income");
  const spentEl   = document.getElementById("dm-spent");
  const savedEl   = document.getElementById("dm-saved");
  const balanceEl = document.getElementById("hero-balance");
  const spentHeroEl = document.getElementById("hero-spent");
  const goalEl    = document.getElementById("savings-goal-text");
  const goalBarEl = document.getElementById("savings-goal-bar");
  const streakEl  = document.getElementById("mini-streak");

  if (incomeEl)  incomeEl.textContent  = formatCurrency(data.totalIncome);
  if (spentEl)   spentEl.textContent   = formatCurrency(data.totalExpenses);
  if (savedEl)   savedEl.textContent   = formatCurrency(data.totalSaved);
  if (balanceEl) balanceEl.textContent = formatCurrency(data.totalIncome - data.totalExpenses);
  if (spentHeroEl) spentHeroEl.textContent = formatCurrency(data.totalExpenses);

  if (goalEl && data.savingsGoal) {
    goalEl.textContent = `${formatCurrency(data.totalSaved)} / ${formatCurrency(data.savingsGoal)}`;
  }
  if (goalBarEl && data.savingsGoal) {
    const pct = Math.min((data.totalSaved / data.savingsGoal) * 100, 100).toFixed(1);
    goalBarEl.style.width = `${pct}%`;
    const labelEl = document.getElementById("savings-goal-label");
    if (labelEl) labelEl.textContent = `${pct}% of monthly goal`;
  }
  if (streakEl) streakEl.textContent = `${data.savingsStreak} days tracked`;
}


/* =====================================================================
   EXPENSES — Category Breakdown
   ===================================================================== */

async function loadCategoryBreakdown() {
  /*
    TODO (Backend team):
    GET /api/expenses/breakdown?month=YYYY-MM
    Headers: Authorization: Bearer <token>
    Returns: [
      { category: "Food",          icon: "🍱", spent: 2100, limit: 2500 },
      { category: "Transport",     icon: "🚌", spent: 640,  limit: 1000 },
      { category: "Books",         icon: "📚", spent: 400,  limit: 600  },
      { category: "Entertainment", icon: "🎮", spent: 1020, limit: 800  },
      { category: "Health",        icon: "🏥", spent: 300,  limit: 500  },
    ]
  */
  if (!Auth.isLoggedIn()) return;

  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const data = await apiFetch(`/expenses/breakdown?month=${month}`);
    if (!data) return;
    renderCategoryBars(data);
    renderHeroBudgetBars(data);
  } catch (err) {
    showToast("Failed to load expense breakdown.", "error");
  }
}

function renderCategoryBars(categories) {
  const container = document.getElementById("category-bars");
  if (!container) return;
  container.innerHTML = "";

  categories.forEach((cat) => {
    const pct = Math.min((cat.spent / cat.limit) * 100, 100).toFixed(0);
    const overBudget = cat.spent > cat.limit;
    const barColor = overBudget
      ? "linear-gradient(to right,#f87171,#fb923c)"
      : "linear-gradient(to right,#4F6EF7,#7B94FF)";

    const row = document.createElement("div");
    row.className = "cat-row";
    row.innerHTML = `
      <span class="cat-icon">${cat.icon}</span>
      <span class="cat-name">${cat.category}</span>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:${pct}%;background:${barColor};"></div>
      </div>
      <span class="cat-amount">${formatCurrency(cat.spent)}</span>
    `;
    container.appendChild(row);
  });
}

function renderHeroBudgetBars(categories) {
  const container = document.getElementById("hero-budget-bars");
  if (!container) return;
  container.innerHTML = "";

  categories.slice(0, 3).forEach((cat) => {
    const pct = Math.min((cat.spent / cat.limit) * 100, 100).toFixed(0);
    const overBudget = cat.spent > cat.limit;
    const barColor = overBudget
      ? "linear-gradient(to right,#f87171,#fb923c)"
      : "linear-gradient(to right,#4F6EF7,#7B94FF)";
    const amountColor = overBudget ? "#f87171" : "var(--warm-white)";

    container.innerHTML += `
      <div class="budget-row">
        <span>${cat.category}</span>
        <span style="color:${amountColor};font-weight:600;">
          ${formatCurrency(cat.spent)} / ${formatCurrency(cat.limit)}
        </span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:${barColor};"></div>
      </div>
    `;
  });
}


/* =====================================================================
   EXPENSE — Add New Expense
   ===================================================================== */

async function addExpense(amount, category, description, date) {
  /*
    TODO (Backend team):
    POST /api/expenses
    Headers: Authorization: Bearer <token>
    Body:   { amount, category, description, date }
    Returns: { id, amount, category, description, date, createdAt }
  */
  try {
    const data = await apiFetch("/expenses", {
      method: "POST",
      body: JSON.stringify({ amount, category, description, date }),
    });
    if (!data) return;
    showToast(`Expense of ${formatCurrency(amount)} added!`, "success");
    loadDashboardSummary();
    loadCategoryBreakdown();
  } catch (err) {
    showToast(err.message, "error");
  }
}


/* =====================================================================
   BUDGET — Load & Update Monthly Budget
   ===================================================================== */

async function loadBudget() {
  /*
    TODO (Backend team):
    GET /api/budget/current
    Headers: Authorization: Bearer <token>
    Returns: {
      month: "2025-01",
      totalBudget: 8000,
      categories: [
        { category: "Food", limit: 2500 },
        ...
      ]
    }
  */
  if (!Auth.isLoggedIn()) return;
  try {
    const data = await apiFetch("/budget/current");
    if (!data) return;
    // TODO (Frontend): wire to budget planner UI when that page is built
    console.log("Budget loaded:", data);
  } catch (err) {
    showToast("Failed to load budget.", "error");
  }
}

async function updateBudgetCategory(category, limit) {
  /*
    TODO (Backend team):
    PUT /api/budget/category
    Headers: Authorization: Bearer <token>
    Body:   { category, limit }
    Returns: { category, limit, updatedAt }
  */
  try {
    const data = await apiFetch("/budget/category", {
      method: "PUT",
      body: JSON.stringify({ category, limit }),
    });
    if (!data) return;
    showToast(`Budget for ${category} updated to ${formatCurrency(limit)}.`, "success");
    loadCategoryBreakdown();
  } catch (err) {
    showToast(err.message, "error");
  }
}


/* =====================================================================
   EDUCATION — Load Articles & Quizzes
   ===================================================================== */

async function loadEducationContent() {
  /*
    TODO (Backend team):
    GET /api/education
    Returns: [
      {
        id: "1",
        type: "lesson" | "tip" | "quiz",
        title: "The 50/30/20 Rule",
        description: "...",
        readTime: "5 min read",
        bannerEmoji: "💡",
        bannerColor: "...",
        tagColor: "...",
        tagBg: "..."
      },
      ...
    ]
  */
  try {
    const data = await apiFetch("/education");
    if (!data) return;
    renderEducationCards(data);
  } catch (err) {
    // If backend not ready, education section keeps its static markup
    console.warn("Education content API not ready:", err.message);
  }
}

function renderEducationCards(articles) {
  const grid = document.getElementById("edu-grid");
  if (!grid || articles.length === 0) return;
  grid.innerHTML = "";

  articles.forEach((item, i) => {
    const delay = i > 0 ? `reveal-delay-${i}` : "";
    grid.innerHTML += `
      <div class="edu-card reveal ${delay}">
        <div class="edu-banner" style="background:${item.bannerColor};">${item.bannerEmoji}</div>
        <div class="edu-body">
          <span class="edu-tag" style="background:${item.tagBg};color:${item.tagColor};">
            ${item.type}
          </span>
          <div class="edu-title">${item.title}</div>
          <div class="edu-desc">${item.description}</div>
          <div class="edu-footer">
            <span class="edu-read">${item.readTime}</span>
            <button class="edu-btn" onclick="openArticle('${item.id}')">
              ${item.type === "quiz" ? "Start quiz" : "Read"} →
            </button>
          </div>
        </div>
      </div>
    `;
  });

  reRegisterReveal();
}

async function openArticle(id) {
  /*
    TODO (Backend team):
    GET /api/education/:id
    Returns: { id, title, content (HTML string), type }
  */
  try {
    const data = await apiFetch(`/education/${id}`);
    if (!data) return;
    // TODO (Frontend): open a modal or navigate to an article page with data.content
    console.log("Article:", data);
  } catch (err) {
    showToast("Could not load article.", "error");
  }
}


/* =====================================================================
   REAL-TIME — WebSocket / Socket.io
   ===================================================================== */

let socket = null;

function connectSocket() {
  /*
    TODO (Backend team):
    Set up a Socket.io or native WebSocket server.
    Events the frontend listens for:
      "budget:alert"   → { category, spent, limit }
      "expense:added"  → { amount, category }
      "summary:update" → fresh dashboard summary object
  */

  // TODO: uncomment and replace URL once socket server is live
  // socket = io("http://localhost:5000");

  // socket.on("connect", () => console.log("Socket connected:", socket.id));

  // socket.on("budget:alert", (data) => {
  //   showToast(`⚠️ ${data.category} budget ${Math.round((data.spent/data.limit)*100)}% used!`, "error");
  // });

  // socket.on("expense:added", (data) => {
  //   showToast(`New expense: ${formatCurrency(data.amount)} in ${data.category}`, "success");
  //   loadDashboardSummary();
  //   loadCategoryBreakdown();
  // });

  // socket.on("summary:update", (data) => {
  //   renderDashboardMetrics(data);
  // });

  console.log("Socket stub loaded — uncomment connectSocket() body when backend is ready.");
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}


/* =====================================================================
   UI UTILITIES
   ===================================================================== */

function formatCurrency(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slide-out 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function updateNavForLoggedInUser(user) {
  const ctaBtn = document.getElementById("nav-cta-btn");
  if (ctaBtn) {
    ctaBtn.textContent = user.name.split(" ")[0];
    ctaBtn.onclick = handleLogout;
  }
}

function updateNavForGuest() {
  const ctaBtn = document.getElementById("nav-cta-btn");
  if (ctaBtn) {
    ctaBtn.textContent = "Get Started →";
    ctaBtn.onclick = () => showToast("Sign up coming soon!", "success");
  }
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1600;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function reRegisterReveal() {
  const els = document.querySelectorAll(".reveal:not(.visible)");
  els.forEach((el) => revealObserver.observe(el));
}

function attachRipple(btn) {
  btn.addEventListener("click", function (e) {
    const rect = this.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position:absolute;width:${size}px;height:${size}px;
      border-radius:50%;background:rgba(255,255,255,0.2);
      top:${e.clientY - rect.top - size / 2}px;
      left:${e.clientX - rect.left - size / 2}px;
      transform:scale(0);animation:ripple-anim 0.5s ease forwards;
      pointer-events:none;
    `;
    this.style.position = "relative";
    this.style.overflow = "hidden";
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}


/* =====================================================================
   SCROLL OBSERVERS
   ===================================================================== */

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        revealObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12 }
);

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        counterObserver.unobserve(e.target);
      }
    });
  },
  { threshold: 0.5 }
);


/* =====================================================================
   INIT
   ===================================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const style = document.createElement("style");
  style.textContent = `@keyframes ripple-anim { to { transform:scale(2.5); opacity:0; } }`;
  document.head.appendChild(style);

  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 40);
  });

  document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));
  document.querySelectorAll(".counter").forEach((el) => counterObserver.observe(el));
  document.querySelectorAll(".btn-primary, .btn-nav, .btn-ghost").forEach(attachRipple);

  const navCta = document.getElementById("nav-cta-btn");
  if (navCta) {
    navCta.addEventListener("click", () => {
      if (Auth.isLoggedIn()) {
        handleLogout();
      } else {
        showToast("Sign up coming soon!", "success");
      }
    });
  }

  if (Auth.isLoggedIn()) {
    loadDashboardSummary();
    loadCategoryBreakdown();
    loadBudget();
    loadEducationContent();
    connectSocket();
  } else {
    loadEducationContent();
  }
});