// ====================================
// BOYCOTT CHECKER - Background Service Worker
// ====================================

// Installation de l'extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialiser les données par défaut
    chrome.storage.local.set({
      brands: getDefaultBrands(),
      isEnabled: true,
      alertsCount: 0,
      alertsMonth: new Date().getMonth()
    });
    
    console.log('[Boycott Checker] Extension installée avec succès!');
  }
});

// Marques par défaut
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

// Écouter les messages du content script ou du popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_BRANDS':
      chrome.storage.local.get(['brands', 'isEnabled'], (result) => {
        sendResponse({
          brands: result.brands || [],
          isEnabled: result.isEnabled !== undefined ? result.isEnabled : true
        });
      });
      return true; // Indique une réponse asynchrone
      
    case 'INCREMENT_ALERT':
      incrementAlertCount();
      sendResponse({ success: true });
      break;
      
    case 'OPEN_POPUP':
      // Ouvrir le popup (si supporté)
      chrome.action.openPopup();
      break;
  }
});

// Incrémenter le compteur d'alertes
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

// Mettre à jour le badge de l'extension quand des produits sont trouvés
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    const count = message.count;
    
    if (count > 0) {
      chrome.action.setBadgeText({ 
        text: count.toString(),
        tabId: sender.tab?.id 
      });
      chrome.action.setBadgeBackgroundColor({ 
        color: '#ff4757',
        tabId: sender.tab?.id 
      });
    } else {
      chrome.action.setBadgeText({ 
        text: '',
        tabId: sender.tab?.id 
      });
    }
  }
});

// Nettoyer le badge quand on change d'onglet
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // Le badge est spécifique à chaque onglet, pas besoin de nettoyer
});

// Réinitialiser le compteur mensuel
chrome.alarms.create('monthlyReset', {
  periodInMinutes: 60 * 24 // Vérifier chaque jour
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'monthlyReset') {
    chrome.storage.local.get(['alertsMonth'], (result) => {
      const currentMonth = new Date().getMonth();
      if (result.alertsMonth !== currentMonth) {
        chrome.storage.local.set({ 
          alertsCount: 0, 
          alertsMonth: currentMonth 
        });
      }
    });
  }
});

