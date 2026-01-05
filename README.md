# 🚫 Boycott Checker - Extension Chrome

Une extension Chrome qui détecte automatiquement les produits de marques boycottées dans votre panier d'achat.

![Version](https://img.shields.io/badge/version-1.0.0-red)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Fonctionnalités

- **Détection automatique** des pages panier sur la plupart des sites e-commerce
- **Analyse en temps réel** des produits dans votre panier
- **Alerte visuelle** avec bannière et mise en surbrillance des produits concernés
- **Liste personnalisable** de marques à boycotter
- **Import/Export** de vos listes de marques
- **Statistiques** du nombre d'alertes par mois
- **Compatible** avec les principaux sites : Amazon, Cdiscount, Fnac, Carrefour, Auchan, Leclerc, et plus...

## 📦 Installation

### Étape 1 : Générer les icônes

1. Ouvrez le fichier `icons/generate-icons.html` dans votre navigateur
2. Cliquez sur **"Télécharger toutes les icônes"**
3. Déplacez les fichiers téléchargés (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`) dans le dossier `icons/`

### Étape 2 : Charger l'extension dans Chrome

1. Ouvrez Chrome et allez à `chrome://extensions/`
2. Activez le **Mode développeur** (bouton en haut à droite)
3. Cliquez sur **"Charger l'extension non empaquetée"**
4. Sélectionnez le dossier `Projet BOYCOTT`
5. L'extension est maintenant installée ! 🎉

## 🚀 Utilisation

### Gestion des marques

1. Cliquez sur l'icône de l'extension dans la barre d'outils
2. Ajoutez des marques via le champ de saisie
3. Supprimez des marques en cliquant sur le ×

### Fonctionnement automatique

- L'extension détecte automatiquement quand vous êtes sur une page panier
- Si des produits de marques boycottées sont trouvés :
  - Une **bannière rouge** apparaît en haut de la page
  - Les produits concernés sont **mis en surbrillance**
  - Un **badge** indique la marque boycottée

### Scan manuel

- Cliquez sur **"Scanner cette page"** dans le popup pour forcer une analyse

### Import/Export

- **Importer** : Collez une liste de marques (une par ligne)
- **Exporter** : Copie votre liste dans le presse-papier

## 📁 Structure du projet

```
Projet BOYCOTT/
├── manifest.json          # Configuration de l'extension
├── popup.html             # Interface du popup
├── popup.css              # Styles du popup
├── popup.js               # Logique du popup
├── content.js             # Script injecté dans les pages
├── content-styles.css     # Styles injectés
├── background.js          # Service worker
├── icons/
│   ├── generate-icons.html # Générateur d'icônes
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 🛠️ Configuration avancée

### Ajouter un nouveau site

Pour optimiser la détection sur un site spécifique, modifiez `SITE_CONFIGS` dans `content.js` :

```javascript
'nomdusite': {
  cartSelector: '.cart-container',    // Sélecteur du panier
  productSelector: '.product-item',   // Sélecteur des produits
  nameSelector: '.product-name',      // Sélecteur du nom du produit
}
```

### Marques par défaut

Modifiez la fonction `getDefaultBrands()` dans `popup.js` et `background.js` pour changer les marques pré-configurées.

## 🌐 Sites supportés

| Site | Statut |
|------|--------|
| Amazon | ✅ Optimisé |
| Cdiscount | ✅ Optimisé |
| Fnac | ✅ Optimisé |
| Carrefour | ✅ Optimisé |
| Auchan | ✅ Optimisé |
| Leclerc | ✅ Optimisé |
| Autres sites | ⚡ Détection générique |

## 🐛 Dépannage

**L'extension ne détecte pas la page panier ?**
- Essayez le bouton "Scanner cette page"
- Vérifiez que l'extension est activée (toggle ON)

**Aucune alerte malgré des produits boycottés ?**
- Vérifiez l'orthographe des marques dans votre liste
- La détection est sensible aux mots exacts

**Le badge ne s'affiche pas ?**
- Certains sites peuvent bloquer les styles injectés
- La bannière en haut de page devrait toujours apparaître

## 📝 License

MIT License - Fait avec ❤️ pour un monde meilleur

## 🤝 Contribuer

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer de nouveaux sites à supporter
- Améliorer le code

---

**Note** : Cette extension est un outil d'aide à la décision. La responsabilité des choix de consommation revient à l'utilisateur.

