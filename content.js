// ====================================
// BOYCOTT CHECKER - Content Script
// ====================================

let boycottedBrands = [];
let isEnabled = true;
let foundProducts = [];
let alertBanner = null;

// Patterns pour détecter les pages panier sur différents sites
const CART_PAGE_PATTERNS = [
  // URLs
  /cart/i,
  /panier/i,
  /basket/i,
  /bag/i,
  /checkout/i,
  /warenkorb/i,
  /carrito/i,
  /carrello/i,
  /winkelwagen/i,
  /koszyk/i,
  // Sélecteurs de pages panier courants
  'cart', 'shopping-cart', 'panier', 'basket'
];

// Sites e-commerce populaires avec leurs sélecteurs spécifiques
const SITE_CONFIGS = {
  'amazon': {
    cartSelector: '#sc-active-cart, #activeCartViewForm, .sc-list-item',
    productSelector: '.sc-list-item, .sc-item-content-group',
    nameSelector: '.sc-product-title, .sc-item-product-title, a.a-link-normal',
  },
  'cdiscount': {
    cartSelector: '.lpMain, .cart-product-list',
    productSelector: '.lpInfo, .cart-product',
    nameSelector: '.prdtBILTit, .product-name',
  },
  'fnac': {
    cartSelector: '.cart-content, .f-basketPage',
    productSelector: '.Article, .f-productCard',
    nameSelector: '.Article-desc, .f-productCard-title',
  },
  'carrefour': {
    cartSelector: '.cart-items, .pl-cart-content',
    productSelector: '.cart-item, .pl-product',
    nameSelector: '.product-name, .pl-product-title',
  },
  'leclerc': {
    cartSelector: '.cart-content',
    productSelector: '.cart-product',
    nameSelector: '.product-title',
  },
  'auchan': {
    cartSelector: '.cart-content, .basket-products',
    productSelector: '.cart-product, .basket-product-item',
    nameSelector: '.product-name, .product-title',
  },
  'default': {
    cartSelector: '[class*="cart"], [class*="panier"], [class*="basket"], [id*="cart"], [id*="panier"], [id*="basket"]',
    productSelector: '[class*="product"], [class*="item"], [class*="article"], li, tr, .row',
    nameSelector: '[class*="name"], [class*="title"], [class*="product"], h2, h3, h4, a',
  }
};

// ====================================
// INITIALISATION
// ====================================

async function init() {
  await loadSettings();
  
  if (!isEnabled) return;
  
  // Vérifier si c'est une page panier
  if (isCartPage()) {
    console.log('[Boycott Checker] Page panier détectée!');
    scanPage();
  }
  
  // Observer les changements dans le DOM (pour les SPA)
  observeDOM();
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['brands', 'isEnabled']);
    boycottedBrands = result.brands || [];
    isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
  } catch (error) {
    console.error('[Boycott Checker] Erreur chargement settings:', error);
  }
}

// ====================================
// DÉTECTION DE PAGE PANIER
// ====================================

function isCartPage() {
  const url = window.location.href.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  
  // Vérifier l'URL
  for (const pattern of CART_PAGE_PATTERNS) {
    if (pattern instanceof RegExp) {
      if (pattern.test(url) || pattern.test(path)) return true;
    } else if (url.includes(pattern) || path.includes(pattern)) {
      return true;
    }
  }
  
  // Vérifier les éléments de la page
  const cartIndicators = [
    '[class*="cart-item"]',
    '[class*="panier-item"]',
    '[class*="basket-item"]',
    '[data-testid*="cart"]',
    '#cart-items',
    '#panier-items',
    '.cart-summary',
    '.panier-recap'
  ];
  
  for (const selector of cartIndicators) {
    if (document.querySelector(selector)) return true;
  }
  
  // Vérifier le titre de la page
  const title = document.title.toLowerCase();
  if (title.includes('panier') || title.includes('cart') || title.includes('basket')) {
    return true;
  }
  
  return false;
}

// ====================================
// SCAN DE LA PAGE
// ====================================

function scanPage() {
  if (!isEnabled || boycottedBrands.length === 0) return;
  
  foundProducts = [];
  
  // Déterminer le site
  const hostname = window.location.hostname;
  let config = SITE_CONFIGS.default;
  
  for (const [site, siteConfig] of Object.entries(SITE_CONFIGS)) {
    if (hostname.includes(site)) {
      config = siteConfig;
      break;
    }
  }
  
  // Chercher les produits dans la page
  const products = findProducts(config);
  
  // Analyser chaque produit
  products.forEach(product => {
    const productText = getProductText(product, config);
    const matchedBrands = checkForBoycottedBrands(productText);
    
    if (matchedBrands.length > 0) {
      foundProducts.push({
        element: product,
        text: productText,
        brands: matchedBrands
      });
      highlightProduct(product, matchedBrands);
    }
  });
  
  // Afficher le résultat
  if (foundProducts.length > 0) {
    showAlertBanner();
    incrementAlertCount();
  } else {
    removeAlertBanner();
  }
  
  return foundProducts.length;
}

function findProducts(config) {
  const products = [];
  
  // Essayer les sélecteurs spécifiques du site
  const selectors = config.productSelector.split(', ');
  
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Éviter les doublons et les éléments trop petits
        if (!products.includes(el) && el.textContent.trim().length > 10) {
          products.push(el);
        }
      });
    } catch (e) {}
  }
  
  // Fallback: chercher dans tout le body
  if (products.length === 0) {
    const allElements = document.body.querySelectorAll('*');
    allElements.forEach(el => {
      const text = el.textContent.toLowerCase();
      if ((text.includes('€') || text.includes('$') || text.includes('prix')) && 
          el.children.length < 10 &&
          el.textContent.trim().length > 20 &&
          el.textContent.trim().length < 500) {
        products.push(el);
      }
    });
  }
  
  return products;
}

function getProductText(element, config) {
  // Essayer d'abord les sélecteurs spécifiques pour le nom
  const nameSelectors = config.nameSelector.split(', ');
  
  for (const selector of nameSelectors) {
    try {
      const nameEl = element.querySelector(selector);
      if (nameEl && nameEl.textContent.trim()) {
        return nameEl.textContent.trim();
      }
    } catch (e) {}
  }
  
  // Fallback: tout le texte de l'élément
  return element.textContent.trim();
}

function checkForBoycottedBrands(text) {
  const matchedBrands = [];
  const lowerText = text.toLowerCase();
  
  for (const brand of boycottedBrands) {
    const lowerBrand = brand.toLowerCase();
    
    // Recherche exacte avec limites de mots
    const regex = new RegExp(`\\b${escapeRegex(lowerBrand)}\\b`, 'i');
    if (regex.test(lowerText)) {
      matchedBrands.push(brand);
    }
  }
  
  return matchedBrands;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ====================================
// MISE EN SURBRILLANCE
// ====================================

function highlightProduct(element, brands) {
  // Ajouter une classe pour le style
  element.classList.add('boycott-checker-highlighted');
  
  // Créer le badge d'alerte
  const badge = document.createElement('div');
  badge.className = 'boycott-checker-badge';
  badge.innerHTML = `
    <span class="boycott-badge-icon">🚫</span>
    <span class="boycott-badge-text">
      <strong>BOYCOTT</strong><br>
      ${brands.join(', ')}
    </span>
  `;
  
  // Positionner le badge
  const rect = element.getBoundingClientRect();
  if (getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }
  
  element.appendChild(badge);
}

function removeHighlights() {
  document.querySelectorAll('.boycott-checker-highlighted').forEach(el => {
    el.classList.remove('boycott-checker-highlighted');
  });
  document.querySelectorAll('.boycott-checker-badge').forEach(el => {
    el.remove();
  });
}

// ====================================
// BANNIÈRE D'ALERTE
// ====================================

function showAlertBanner() {
  removeAlertBanner();
  
  const brandsList = [...new Set(foundProducts.flatMap(p => p.brands))];
  
  alertBanner = document.createElement('div');
  alertBanner.className = 'boycott-checker-banner';
  alertBanner.innerHTML = `
    <div class="boycott-banner-content">
      <span class="boycott-banner-icon">⚠️</span>
      <div class="boycott-banner-text">
        <strong>Attention !</strong> ${foundProducts.length} produit(s) de marque(s) boycottée(s) détecté(s) dans votre panier :
        <span class="boycott-banner-brands">${brandsList.join(', ')}</span>
      </div>
      <button class="boycott-banner-close" title="Fermer">×</button>
    </div>
  `;
  
  // Événement de fermeture
  alertBanner.querySelector('.boycott-banner-close').addEventListener('click', () => {
    removeAlertBanner();
  });
  
  document.body.prepend(alertBanner);
  
  // Animation d'entrée
  requestAnimationFrame(() => {
    alertBanner.classList.add('boycott-banner-visible');
  });
}

function removeAlertBanner() {
  if (alertBanner) {
    alertBanner.remove();
    alertBanner = null;
  }
  // Supprimer aussi toutes les bannières existantes
  document.querySelectorAll('.boycott-checker-banner').forEach(el => el.remove());
}

// ====================================
// STATISTIQUES
// ====================================

async function incrementAlertCount() {
  try {
    const result = await chrome.storage.local.get(['alertsCount', 'alertsMonth']);
    const currentMonth = new Date().getMonth();
    
    let alertsCount = result.alertsCount || 0;
    const alertsMonth = result.alertsMonth;
    
    // Réinitialiser si nouveau mois
    if (alertsMonth !== currentMonth) {
      alertsCount = 0;
    }
    
    alertsCount++;
    
    await chrome.storage.local.set({ 
      alertsCount, 
      alertsMonth: currentMonth 
    });
  } catch (error) {
    console.error('[Boycott Checker] Erreur mise à jour stats:', error);
  }
}

// ====================================
// OBSERVATION DU DOM (SPA)
// ====================================

function observeDOM() {
  let timeout;
  
  const observer = new MutationObserver((mutations) => {
    // Debounce pour éviter trop de scans
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (isCartPage()) {
        removeHighlights();
        scanPage();
      }
    }, 500);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ====================================
// COMMUNICATION AVEC LE POPUP
// ====================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'UPDATE_BRANDS':
      boycottedBrands = message.brands || [];
      isEnabled = message.isEnabled;
      if (isEnabled) {
        removeHighlights();
        removeAlertBanner();
        if (isCartPage()) {
          scanPage();
        }
      } else {
        removeHighlights();
        removeAlertBanner();
      }
      sendResponse({ success: true });
      break;
      
    case 'SCAN_PAGE':
      removeHighlights();
      removeAlertBanner();
      const found = scanPage();
      sendResponse({ found });
      break;
      
    case 'GET_STATUS':
      sendResponse({ 
        isCartPage: isCartPage(),
        foundProducts: foundProducts.length,
        isEnabled
      });
      break;
  }
  
  return true; // Garde le canal ouvert pour les réponses asynchrones
});

// ====================================
// DÉMARRAGE
// ====================================

// Attendre que le DOM soit prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-scanner lors de la navigation (pour les SPA)
window.addEventListener('popstate', () => {
  setTimeout(() => {
    if (isCartPage()) {
      removeHighlights();
      scanPage();
    } else {
      removeHighlights();
      removeAlertBanner();
    }
  }, 500);
});

