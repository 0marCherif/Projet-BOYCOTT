// ====================================
// BOYCOTT CHECKER - Content Script v2
// Approche simple : scan du texte de la page
// ====================================

let boycottedBrands = [];
let isEnabled = true;
let foundElements = [];
let alertBanner = null;

// ====================================
// INITIALISATION
// ====================================

async function init() {
  console.log('[Boycott Checker] Initialisation...');
  await loadSettings();
  
  if (!isEnabled) {
    console.log('[Boycott Checker] Extension désactivée');
    return;
  }
  
  console.log('[Boycott Checker] Marques à surveiller:', boycottedBrands);
  
  // Scanner la page après un court délai (pour laisser le contenu charger)
  setTimeout(() => {
    scanPageForBrands();
  }, 1000);
  
  // Observer les changements dans le DOM (pour les SPA et contenu dynamique)
  observeDOM();
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['brands', 'isEnabled']);
    boycottedBrands = result.brands || getDefaultBrands();
    isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    console.log('[Boycott Checker] Settings chargés:', { brandsCount: boycottedBrands.length, isEnabled });
  } catch (error) {
    console.error('[Boycott Checker] Erreur chargement settings:', error);
    boycottedBrands = getDefaultBrands();
  }
}

function getDefaultBrands() {
  return [
    'Coca-Cola',
    'Pepsi',
    'Nestlé',
    'McDonald\'s',
    'Starbucks',
    'KFC',
    'Pizza Hut',
    'Burger King',
    'Danone',
    'Puma',
    'HP',
    'Carrefour',
    'Lay\'s',
    'Doritos',
    'Lipton',
    'Schweppes',
    'Fanta',
    'Sprite',
    'Tropicana',
    'Activia',
    'Evian',
    'Maggi',
    'Nescafé',
    'Kit Kat',
    'Häagen-Dazs'
  ];
}

// ====================================
// NORMALISATION DU TEXTE
// ====================================

function normalizeText(text) {
  return text
    .toLowerCase()
    // Supprimer les accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remplacer les tirets et underscores par des espaces
    .replace(/[-_]/g, ' ')
    // Supprimer les apostrophes
    .replace(/[''`]/g, '')
    // Supprimer la ponctuation
    .replace(/[.,!?;:]/g, ' ')
    // Réduire les espaces multiples
    .replace(/\s+/g, ' ')
    .trim();
}

// Vérifier si une marque est dans le texte (avec plusieurs variantes)
function brandMatchesText(brand, text) {
  const normalizedText = normalizeText(text);
  const normalizedBrand = normalizeText(brand);
  
  // Recherche directe normalisée
  if (normalizedText.includes(normalizedBrand)) {
    return true;
  }
  
  // Recherche sans espaces (pour "Coca Cola" vs "CocaCola")
  const textNoSpaces = normalizedText.replace(/\s/g, '');
  const brandNoSpaces = normalizedBrand.replace(/\s/g, '');
  if (textNoSpaces.includes(brandNoSpaces)) {
    return true;
  }
  
  return false;
}

// ====================================
// SCAN DE LA PAGE - APPROCHE SIMPLE
// ====================================

function scanPageForBrands() {
  if (!isEnabled || boycottedBrands.length === 0) {
    console.log('[Boycott Checker] Scan annulé (désactivé ou pas de marques)');
    return 0;
  }
  
  console.log('[Boycott Checker] Début du scan...');
  console.log('[Boycott Checker] Marques surveillées:', boycottedBrands);
  
  // Nettoyer les anciens résultats
  removeHighlights();
  foundElements = [];
  
  // Récupérer tout le texte visible de la page
  const pageText = document.body.innerText;
  
  // Vérifier quelles marques sont présentes dans la page
  const brandsFoundInPage = [];
  
  for (const brand of boycottedBrands) {
    if (brandMatchesText(brand, pageText)) {
      brandsFoundInPage.push(brand);
      console.log(`[Boycott Checker] ✓ Marque trouvée: ${brand}`);
    }
  }
  
  if (brandsFoundInPage.length === 0) {
    console.log('[Boycott Checker] Aucune marque boycottée trouvée');
    removeAlertBanner();
    return 0;
  }
  
  // Trouver et mettre en surbrillance les éléments contenant ces marques
  const elementsWithBrands = findElementsWithBrands(brandsFoundInPage);
  
  console.log(`[Boycott Checker] ${elementsWithBrands.length} éléments trouvés`);
  
  // Mettre en surbrillance
  elementsWithBrands.forEach(item => {
    highlightElement(item.element, item.brands);
    foundElements.push(item);
  });
  
  // Afficher la bannière d'alerte
  if (foundElements.length > 0) {
    showAlertBanner(brandsFoundInPage);
    incrementAlertCount();
  }
  
  return foundElements.length;
}

function findElementsWithBrands(brandsToFind) {
  const results = [];
  const processedElements = new Set();
  
  // Parcourir tous les éléments de la page
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent;
    if (!text || text.trim().length < 3) continue;
    
    for (const brand of brandsToFind) {
      if (brandMatchesText(brand, text)) {
        // Trouver l'élément parent approprié (pas trop grand, pas trop petit)
        let element = node.parentElement;
        if (!element) continue;
        
        // Remonter jusqu'à trouver un élément de taille raisonnable
        let attempts = 0;
        while (element && 
               element.innerText && 
               element.innerText.length < 50 && 
               element.parentElement &&
               attempts < 5) {
          element = element.parentElement;
          attempts++;
        }
        
        // Éviter les éléments trop grands (comme body, main, etc.)
        const bigElements = ['BODY', 'MAIN', 'HTML', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV'];
        if (bigElements.includes(element.tagName) || element.innerText.length > 1500) {
          // Utiliser l'élément parent direct du nœud texte
          element = node.parentElement;
        }
        
        // Éviter les doublons
        if (element && !processedElements.has(element)) {
          processedElements.add(element);
          
          // Trouver toutes les marques dans cet élément
          const brandsInElement = brandsToFind.filter(b => 
            brandMatchesText(b, element.innerText)
          );
          
          if (brandsInElement.length > 0) {
            results.push({
              element: element,
              text: element.innerText.substring(0, 100),
              brands: brandsInElement
            });
          }
        }
      }
    }
  }
  
  return results;
}

// ====================================
// MISE EN SURBRILLANCE
// ====================================

function highlightElement(element, brands) {
  // Éviter de mettre en surbrillance nos propres éléments
  if (element.classList.contains('boycott-checker-banner') ||
      element.classList.contains('boycott-checker-badge')) {
    return;
  }
  
  // Ajouter la classe de surbrillance
  element.classList.add('boycott-checker-highlighted');
  
  // S'assurer que l'élément peut contenir le badge
  const computedStyle = getComputedStyle(element);
  if (computedStyle.position === 'static') {
    element.style.position = 'relative';
  }
  
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
  
  element.appendChild(badge);
}

function removeHighlights() {
  // Supprimer les classes
  document.querySelectorAll('.boycott-checker-highlighted').forEach(el => {
    el.classList.remove('boycott-checker-highlighted');
    el.style.position = '';
  });
  
  // Supprimer les badges
  document.querySelectorAll('.boycott-checker-badge').forEach(el => {
    el.remove();
  });
}

// ====================================
// BANNIÈRE D'ALERTE
// ====================================

function showAlertBanner(brands) {
  removeAlertBanner();
  
  const uniqueBrands = [...new Set(brands)];
  
  alertBanner = document.createElement('div');
  alertBanner.className = 'boycott-checker-banner';
  alertBanner.innerHTML = `
    <div class="boycott-banner-content">
      <span class="boycott-banner-icon">⚠️</span>
      <div class="boycott-banner-text">
        <strong>Attention !</strong> Produit(s) de marque(s) boycottée(s) détecté(s) sur cette page :
        <span class="boycott-banner-brands">${uniqueBrands.join(', ')}</span>
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
    
    if (alertsMonth !== currentMonth) {
      alertsCount = 0;
    }
    
    alertsCount++;
    
    await chrome.storage.local.set({ 
      alertsCount, 
      alertsMonth: currentMonth 
    });
  } catch (error) {
    console.error('[Boycott Checker] Erreur stats:', error);
  }
}

// ====================================
// OBSERVATION DU DOM
// ====================================

function observeDOM() {
  let timeout;
  let lastScan = 0;
  
  const observer = new MutationObserver((mutations) => {
    // Éviter de scanner trop souvent
    const now = Date.now();
    if (now - lastScan < 2000) return;
    
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      lastScan = Date.now();
      console.log('[Boycott Checker] Changement DOM détecté, re-scan...');
      scanPageForBrands();
    }, 1500);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// ====================================
// COMMUNICATION AVEC LE POPUP
// ====================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Boycott Checker] Message reçu:', message.type);
  
  switch (message.type) {
    case 'UPDATE_BRANDS':
      boycottedBrands = message.brands || [];
      isEnabled = message.isEnabled;
      console.log('[Boycott Checker] Marques mises à jour:', boycottedBrands.length);
      
      removeHighlights();
      removeAlertBanner();
      
      if (isEnabled) {
        setTimeout(() => scanPageForBrands(), 500);
      }
      sendResponse({ success: true });
      break;
      
    case 'SCAN_PAGE':
      console.log('[Boycott Checker] Scan manuel demandé');
      removeHighlights();
      removeAlertBanner();
      
      // Recharger les settings avant de scanner
      loadSettings().then(() => {
        const found = scanPageForBrands();
        sendResponse({ found });
      });
      return true; // Réponse asynchrone
      
    case 'GET_STATUS':
      sendResponse({ 
        foundCount: foundElements.length,
        brands: boycottedBrands.length,
        isEnabled
      });
      break;
  }
  
  return true;
});

// ====================================
// DÉMARRAGE
// ====================================

// Attendre que le DOM soit complètement chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else if (document.readyState === 'interactive') {
  setTimeout(init, 500);
} else {
  init();
}

// Re-scanner lors de la navigation
window.addEventListener('popstate', () => {
  setTimeout(scanPageForBrands, 1000);
});

// Re-scanner quand la page est complètement chargée
window.addEventListener('load', () => {
  setTimeout(scanPageForBrands, 1500);
});

console.log('[Boycott Checker] Content script chargé');
