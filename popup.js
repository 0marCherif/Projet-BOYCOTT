// État de l'application
let brands = [];
let isEnabled = true;
let alertsCount = 0;

// Éléments DOM
const extensionToggle = document.getElementById('extensionToggle');
const statusBar = document.getElementById('statusBar');
const brandInput = document.getElementById('brandInput');
const addBrandBtn = document.getElementById('addBrandBtn');
const brandsList = document.getElementById('brandsList');
const scanPageBtn = document.getElementById('scanPageBtn');
const importListBtn = document.getElementById('importListBtn');
const exportListBtn = document.getElementById('exportListBtn');
const importModal = document.getElementById('importModal');
const importTextarea = document.getElementById('importTextarea');
const cancelImportBtn = document.getElementById('cancelImportBtn');
const confirmImportBtn = document.getElementById('confirmImportBtn');
const brandsCount = document.getElementById('brandsCount');
const alertsCountEl = document.getElementById('alertsCount');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  renderBrands();
  updateStats();
  updateStatusBar();
});

// Charger les données depuis le stockage
async function loadData() {
  try {
    const result = await chrome.storage.local.get(['brands', 'isEnabled', 'alertsCount']);
    brands = result.brands || getDefaultBrands();
    isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
    alertsCount = result.alertsCount || 0;
    extensionToggle.checked = isEnabled;
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
    brands = getDefaultBrands();
  }
}

// Marques par défaut (exemples courants de boycott)
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

// Sauvegarder les données
async function saveData() {
  try {
    await chrome.storage.local.set({ brands, isEnabled, alertsCount });
    // Notifier le content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'UPDATE_BRANDS', 
        brands, 
        isEnabled 
      }).catch(() => {});
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
  }
}

// Afficher les marques
function renderBrands() {
  if (brands.length === 0) {
    brandsList.innerHTML = '<div class="empty-state">Aucune marque ajoutée.<br>Commencez par ajouter des marques à boycotter.</div>';
    return;
  }

  brandsList.innerHTML = brands.map((brand, index) => `
    <div class="brand-item" data-index="${index}">
      <span class="brand-name">${escapeHtml(brand)}</span>
      <button class="btn-remove" data-brand="${escapeHtml(brand)}" title="Supprimer">×</button>
    </div>
  `).join('');

  // Ajouter les événements de suppression
  brandsList.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const brandToRemove = e.target.dataset.brand;
      removeBrand(brandToRemove);
    });
  });
}

// Échapper le HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Ajouter une marque
function addBrand(brandName) {
  const trimmed = brandName.trim();
  if (!trimmed) return false;
  
  // Vérifier si la marque existe déjà (insensible à la casse)
  if (brands.some(b => b.toLowerCase() === trimmed.toLowerCase())) {
    showToast('Cette marque existe déjà', 'warning');
    return false;
  }
  
  brands.unshift(trimmed);
  saveData();
  renderBrands();
  updateStats();
  showToast(`"${trimmed}" ajoutée à la liste`);
  return true;
}

// Supprimer une marque
function removeBrand(brandName) {
  brands = brands.filter(b => b !== brandName);
  saveData();
  renderBrands();
  updateStats();
  showToast(`"${brandName}" supprimée`);
}

// Mettre à jour les statistiques
function updateStats() {
  brandsCount.textContent = brands.length;
  alertsCountEl.textContent = alertsCount;
}

// Mettre à jour la barre de statut
function updateStatusBar() {
  const statusText = statusBar.querySelector('.status-text');
  if (isEnabled) {
    statusBar.classList.remove('inactive');
    statusText.textContent = 'Extension active';
  } else {
    statusBar.classList.add('inactive');
    statusText.textContent = 'Extension désactivée';
  }
}

// Afficher un toast
function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  toast.querySelector('.toast-icon').textContent = type === 'warning' ? '⚠️' : '✓';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Scanner la page actuelle
async function scanCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' }, (response) => {
        if (chrome.runtime.lastError) {
          showToast('Impossible de scanner cette page', 'warning');
          return;
        }
        if (response?.found > 0) {
          showToast(`${response.found} produit(s) boycotté(s) trouvé(s)!`, 'warning');
        } else {
          showToast('Aucun produit boycotté trouvé');
        }
      });
    }
  } catch (error) {
    showToast('Erreur lors du scan', 'warning');
  }
}

// Event Listeners
extensionToggle.addEventListener('change', () => {
  isEnabled = extensionToggle.checked;
  saveData();
  updateStatusBar();
  showToast(isEnabled ? 'Extension activée' : 'Extension désactivée');
});

addBrandBtn.addEventListener('click', () => {
  if (addBrand(brandInput.value)) {
    brandInput.value = '';
  }
});

brandInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (addBrand(brandInput.value)) {
      brandInput.value = '';
    }
  }
});

scanPageBtn.addEventListener('click', scanCurrentPage);

importListBtn.addEventListener('click', () => {
  importModal.classList.add('active');
  importTextarea.value = '';
  importTextarea.focus();
});

cancelImportBtn.addEventListener('click', () => {
  importModal.classList.remove('active');
});

confirmImportBtn.addEventListener('click', () => {
  const lines = importTextarea.value.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  let added = 0;
  lines.forEach(line => {
    if (!brands.some(b => b.toLowerCase() === line.toLowerCase())) {
      brands.push(line);
      added++;
    }
  });
  
  if (added > 0) {
    saveData();
    renderBrands();
    updateStats();
    showToast(`${added} marque(s) importée(s)`);
  } else {
    showToast('Aucune nouvelle marque à importer', 'warning');
  }
  
  importModal.classList.remove('active');
});

exportListBtn.addEventListener('click', () => {
  const text = brands.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('Liste copiée dans le presse-papier');
  }).catch(() => {
    // Fallback: créer un fichier texte
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'boycott-list.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Liste exportée');
  });
});

// Fermer la modal en cliquant en dehors
importModal.addEventListener('click', (e) => {
  if (e.target === importModal) {
    importModal.classList.remove('active');
  }
});

