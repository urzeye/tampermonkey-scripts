# Gemini-helper

> Gemini Helper : Gestion et export des conversations, navigation par plan, gestion des prompts, améliorations des onglets (statut/confidentialité/notification), historique de lecture et restauration, ancre bidirectionnelle/manuelle, suppression du filigrane, correction du gras, copie formule/tableau, verrouillage de modèle, embellissement de page, changement de thème, mode sombre intelligent (Gemini/Gemini Enterprise)

🌐 **Langue**: [简体中文](README.md) | [English](README_EN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | **Français** | [Español](README_ES.md) | [Português](README_PT.md) | [Русский](README_RU.md)

## ✨ Fonctionnalités

### 📝 Gestion des Prompts

- **Insertion rapide** : Insérer en un clic les prompts fréquemment utilisés dans le chat
- **Gestion des catégories** : Filtrer, renommer et supprimer les catégories
- **Fonction de recherche** : Trouver rapidement les prompts dont vous avez besoin
- **Opérations CRUD** : Personnaliser et gérer votre bibliothèque de prompts
- **Fonction de copie** : Copier en un clic le contenu du prompt dans le presse-papiers
- **Glisser & Trier** : Ajuster librement l'ordre d'affichage des prompts

### 📁 Gestion des Conversations

- **Archive de dossiers** : Créer des dossiers personnalisés pour organiser l'historique des chats
- **Tags multicolores** : Plus de 30 couleurs traditionnelles chinoises, prend en charge les couleurs personnalisées et la gestion multi-tags
- **Recherche en temps réel** : Filtre rapide par titre, prend en charge le filtrage par combinaison de tags
- **Opérations par lots** : Multi-sélection pour suppression, déplacement et archivage en masse
- **Export de conversation** : Export au format Markdown/JSON/TXT, images convertibles en Base64
- **Synchronisation fluide** : Synchronisation automatique des dernières données depuis la barre latérale Gemini (compatible Standard/Enterprise)

### 📑 Navigation par Plan

- **Extraction automatique** : Extraire la structure des titres des réponses IA (prend en charge Standard et Enterprise Shadow DOM)
- **Groupement des requêtes utilisateur** : Grouper le plan par tours de conversation, requêtes utilisateur comme en-têtes de groupe (icône 💬)
- **Indentation intelligente** : Ajustement automatique de l'indentation selon le niveau le plus élevé pour réduire l'espace blanc à gauche
- **Saut rapide** : Cliquer sur un élément du plan pour défiler en douceur et mettre en surbrillance pendant 2 secondes
- **Défilement synchronisé** : Mise en surbrillance automatique de l'élément du plan correspondant lors du défilement de la page (basculable dans les paramètres)
- **Filtre de niveau** : Définir l'affichage du niveau de titre, Niveau 0 pour replier rapidement aux requêtes utilisateur uniquement
- **Contrôle de bascule** : Masquage automatique de l'onglet plan lors de la désactivation

### 🚀 Navigation Rapide

- **Aller en haut/bas** : Positionnement rapide dans les longues conversations
- **Groupe de boutons flottants** : Accessible même lorsque le panneau est replié

### 📐 Largeur de Page

- **Largeur personnalisée** : Prend en charge les unités pixels (px) et pourcentage (%)
- **Application instantanée** : Appliquer immédiatement après ajustement, pas de rafraîchissement nécessaire
- **Configuration indépendante** : Paramètres différents pour différents sites

### ⚓ Système de Positionnement Intelligent

Deux systèmes d'enregistrement de position indépendants :

- **Historique de lecture (Reading Progress)** :
  - "Mémoire de progression de lecture" à long terme, prend en charge la restauration inter-rafraîchissement/session
  - Enregistrement automatique lors du défilement, persisté dans GM_storage
  - Restauration automatique au chargement de la page ou changement de conversation

- **Ancre Bidirectionnelle** :
  - "Point de retour" à court terme, similaire au retour du navigateur ou `git switch -`
  - Sauvegarde automatique de la position actuelle lors du clic sur les boutons plan/haut/bas
  - Prend en charge le basculement aller-retour entre deux positions

### 🏷️ Améliorations des Onglets

- **Affichage du statut de génération** : Affichage automatique de l'icône ⏳ (génération) ou ✅ (terminé) dans le titre de l'onglet
- **Format de titre personnalisé** : Prend en charge les combinaisons de placeholder `{status}{title}[{model}]`
- **Mode Confidentialité (Touche Boss)** : Déguiser en un clic le titre de l'onglet en "Google", masquer le contenu de la conversation
- **Notification de fin** : Envoyer une notification bureau lorsque la génération en arrière-plan est terminée
- **Focus automatique de fenêtre** : Ramener automatiquement la fenêtre du navigateur au premier plan lorsque la génération est terminée

### ⚙️ Panneau de Paramètres

- **Changement d'onglet** : Trois onglets - Prompts, Plan, Paramètres
- **Paramètres du panneau** : Personnaliser le déploiement/repliement par défaut, masquage automatique au clic extérieur
- **Correction de saisie chinoise** : Bascule optionnelle pour corriger le problème du premier caractère en Enterprise
- **Changement de langue** : Prend en charge Chinois simplifié/Chinois traditionnel/Anglais

### 🎯 Adaptation Intelligente

- ✅ Gemini Standard (gemini.google.com)
- ✅ Gemini Enterprise (business.gemini.google)

### 🌓 Mode Sombre Automatique

- **Détection intelligente** : Suivi en temps réel du basculement mode clair/sombre du système/page
- **Adaptation complète** : Schéma de couleurs du thème sombre soigneusement ajusté, confortable pour les yeux

### 📋 Assistance au Contenu

- **Copie formule par double-clic** : Double-cliquer sur une formule mathématique pour copier la source LaTeX, ajout automatique des délimiteurs
- **Copie tableau Markdown** : Ajouter un bouton de copie en haut à droite du tableau, copie directe au format Markdown
- **Suppression de filigrane** : Suppression automatique du filigrane NanoBanana des images générées par Gemini AI
- **Accrochage aux bords** : Masquage automatique lors du glissement du panneau vers le bord de l'écran, affichage au survol
- **Ancre manuelle** : Définir/retourner/effacer la position d'ancre avec la barre d'outils rapide

## 📸 Aperçu

- Panneau flottant sur le côté droit, prend en charge le glisser-déplacer (expérience optimisée, pas de sélection de texte accidentelle)
- Thème dégradé, belle apparence
- Barre flottante affiche le prompt actuel, prend en charge l'effacement en un clic

![Conversations](https://raw.githubusercontent.com/urzeye/tampermonkey-scripts/refs/heads/main/gemini-helper/images/gemini-helper-6.png)

## 🔧 Utilisation

1. Installer l'extension de navigateur Tampermonkey
2. Installer ce script
3. Ouvrir la page Gemini, le panneau de gestion des prompts apparaît sur le côté droit
4. Cliquer sur un prompt pour l'insérer rapidement

## ⌨️ Opérations Rapides

| Opération | Description |
| --- | --- |
| Cliquer sur prompt | Insérer dans la zone de saisie |
| 📋 Bouton copier | Copier le contenu du prompt |
| ☰ Poignée de glissement | Glisser pour ajuster l'ordre |
| ✏ Bouton éditer | Éditer le prompt |
| 🗑 Bouton supprimer | Supprimer le prompt |
| ⚙ Gestion des catégories | Renommer/supprimer la catégorie |
| Cliquer bouton × | Effacer le contenu inséré |
| Entrée pour envoyer | Masquer automatiquement la barre flottante |
| Boutons ⬆ / ⬇ | Aller en haut/bas de la page |

## 🐛 Retours

Pour les problèmes ou suggestions, veuillez donner vos retours sur [GitHub Issues](https://github.com/urzeye/tampermonkey-scripts/issues)

## 📄 Licence

MIT License
