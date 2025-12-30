# Gemini-helper

> Gemini Helfer: Konversationsverwaltung & Export, Gliederungsnavigation, Prompt-Verwaltung, Tab-Erweiterungen (Status/Datenschutz/Benachrichtigung), Leseverlauf & Wiederherstellung, bidirektionaler/manueller Anker, Bildwasserzeichen-Entfernung, Fettschrift-Fix, Formel/Tabellen-Kopie, Modellsperre, Seitenverschönerung, Theme-Wechsel, Smart Dark Mode (Gemini/Gemini Enterprise)

🌐 **Sprache**: [简体中文](README.md) | [English](README_EN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | **Deutsch** | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Русский](README_RU.md)

## ✨ Funktionen

### 📝 Prompt-Verwaltung

- **Schnelles Einfügen**: Häufig verwendete Prompts mit einem Klick in den Chat einfügen
- **Kategorieverwaltung**: Kategorien filtern, umbenennen und löschen
- **Suchfunktion**: Schnell benötigte Prompts finden
- **CRUD-Operationen**: Prompt-Bibliothek anpassen und verwalten
- **Kopierfunktion**: Prompt-Inhalt mit einem Klick in die Zwischenablage kopieren
- **Drag & Sort**: Anzeigereihenfolge der Prompts frei anpassen

### 📁 Konversationsverwaltung

- **Ordner-Archiv**: Benutzerdefinierte Ordner erstellen, um Chat-Verlauf zu organisieren
- **Mehrfarbige Tags**: 30+ traditionelle chinesische Farben, unterstützt benutzerdefinierte Farben und Multi-Tag-Verwaltung
- **Echtzeit-Suche**: Schnelles Filtern nach Titel, unterstützt Tag-Kombinationsfilterung
- **Stapeloperationen**: Mehrfachauswahl für Stapellöschung, Verschieben und Archivieren
- **Konversation exportieren**: Export in Markdown/JSON/TXT-Format, Bilder können in Base64 konvertiert werden
- **Nahtlose Synchronisierung**: Automatische Synchronisierung der neuesten Daten aus der Gemini-Seitenleiste (kompatibel mit Standard/Enterprise)

### 📑 Gliederungsnavigation

- **Automatische Extraktion**: Überschriftenstruktur aus KI-Antworten extrahieren (unterstützt Standard und Enterprise Shadow DOM)
- **Benutzeranfragen-Gruppierung**: Gliederung nach Konversationsrunden gruppieren, Benutzeranfragen als Gruppenkopfzeilen (💬 Symbol)
- **Intelligente Einrückung**: Automatische Einrückungsanpassung basierend auf höchster Ebene zur Reduzierung des linken Leerraums
- **Schnellsprung**: Klick auf Gliederungselement für sanftes Scrollen und 2-Sekunden-Hervorhebung
- **Synchronisiertes Scrollen**: Automatische Hervorhebung des entsprechenden Gliederungselements beim Seitenscroll (in Einstellungen umschaltbar)
- **Ebenenfilter**: Überschriftenebene-Anzeige einstellen, Ebene 0 für schnelles Zusammenfalten nur auf Benutzeranfragen
- **Umschaltsteuerung**: Automatisches Ausblenden des Gliederungs-Tabs bei Deaktivierung

### 🚀 Schnellnavigation

- **Zum Anfang/Ende springen**: Schnelle Positionierung in langen Konversationen
- **Schwebende Schaltflächengruppe**: Auch bei zugeklapptem Panel zugänglich

### 📐 Seitenbreite

- **Benutzerdefinierte Breite**: Unterstützt sowohl Pixel (px) als auch Prozent (%) Einheiten
- **Sofortige Anwendung**: Sofort nach Anpassung anwenden, kein Aktualisieren nötig
- **Unabhängige Konfiguration**: Unterschiedliche Einstellungen für verschiedene Seiten

### ⚓ Intelligentes Positionierungssystem

Zwei unabhängige Positionsaufzeichnungssysteme:

- **Leseverlauf (Reading Progress)**:
  - Langfristiges "Lesefortschritts-Gedächtnis", unterstützt Wiederherstellung über Aktualisierungen/Sitzungen hinweg
  - Automatische Aufzeichnung beim Scrollen, persistent in GM_storage
  - Automatische Wiederherstellung beim Laden der Seite oder Konversationswechsel

- **Bidirektionaler Anker**:
  - Kurzfristiger "Rückkehrpunkt", ähnlich wie Browser-Zurück oder `git switch -`
  - Automatisches Speichern der aktuellen Position beim Klicken auf Gliederung/Anfang/Ende-Schaltflächen
  - Unterstützt Hin-und-Her-Wechsel zwischen zwei Positionen

### 🏷️ Tab-Erweiterungen

- **Generierungsstatus-Anzeige**: Automatische Anzeige von ⏳ (generierend) oder ✅ (fertig) Status-Symbol im Tab-Titel
- **Benutzerdefiniertes Titelformat**: Unterstützt `{status}{title}[{model}]` Platzhalter-Kombinationen
- **Datenschutzmodus (Boss-Taste)**: Tab-Titel mit einem Klick als "Google" tarnen, Konversationsinhalt verbergen
- **Abschlussbenachrichtigung**: Desktop-Benachrichtigung senden, wenn Hintergrundgenerierung abgeschlossen ist
- **Automatischer Fensterfokus**: Browserfenster automatisch in den Vordergrund bringen, wenn Generierung abgeschlossen ist

### ⚙️ Einstellungspanel

- **Tab-Wechsel**: Drei Tabs - Prompts, Gliederung, Einstellungen
- **Panel-Einstellungen**: Standard-Erweitern/Zuklappen anpassen, automatisches Ausblenden bei Klick außerhalb
- **Chinesische Eingabe-Fix**: Optionaler Schalter zur Behebung des Erstzeichen-Problems in Enterprise
- **Sprachwechsel**: Unterstützt Vereinfachtes Chinesisch/Traditionelles Chinesisch/Englisch

### 🎯 Intelligente Anpassung

- ✅ Gemini Standard (gemini.google.com)
- ✅ Gemini Enterprise (business.gemini.google)

### 🌓 Automatischer Dark Mode

- **Intelligente Erkennung**: Echtzeit-Verfolgung von System-/Seiten-Hell-/Dunkel-Modus-Umschaltung
- **Volle Anpassung**: Sorgfältig abgestimmtes Dark-Theme-Farbschema, augenschonend

### 📋 Inhaltsunterstützung

- **Formel-Doppelklick-Kopie**: Doppelklick auf mathematische Formel zum Kopieren von LaTeX-Quelle, automatisches Hinzufügen von Trennzeichen
- **Tabellen-Markdown-Kopie**: Kopierschaltfläche oben rechts an Tabelle hinzufügen, direktes Kopieren im Markdown-Format
- **Wasserzeichen-Entfernung**: Automatisches Entfernen des NanoBanana-Wasserzeichens von Gemini-KI-generierten Bildern
- **Randeinrastung**: Automatisches Ausblenden beim Ziehen des Panels zum Bildschirmrand, Anzeigen bei Hover
- **Manueller Anker**: Ankerposition setzen/zurückkehren/löschen mit Schnellzugriffs-Symbolleiste

## 📸 Vorschau

- Schwebendes Panel auf der rechten Seite, unterstützt Drag & Verschieben (optimierte Erfahrung, kein versehentliches Textauswählen)
- Verlaufsthema, schöne Erscheinung
- Schwebende Leiste zeigt aktuellen Prompt, unterstützt Ein-Klick-Löschen

![Konversationen](https://raw.githubusercontent.com/urzeye/tampermonkey-scripts/refs/heads/main/gemini-helper/images/gemini-helper-6.png)

## 🔧 Verwendung

1. Tampermonkey-Browsererweiterung installieren
2. Dieses Skript installieren
3. Gemini-Seite öffnen, Prompt-Verwaltungspanel erscheint auf der rechten Seite
4. Auf Prompt klicken zum schnellen Einfügen

## ⌨️ Schnelloperationen

| Operation | Beschreibung |
| --- | --- |
| Prompt anklicken | In Eingabefeld einfügen |
| 📋 Kopieren-Schaltfläche | Prompt-Inhalt kopieren |
| ☰ Ziehgriff | Ziehen zum Anpassen der Reihenfolge |
| ✏ Bearbeiten-Schaltfläche | Prompt bearbeiten |
| 🗑 Löschen-Schaltfläche | Prompt löschen |
| ⚙ Kategorieverwaltung | Kategorie umbenennen/löschen |
| × Schaltfläche anklicken | Eingefügten Inhalt löschen |
| Enter zum Senden | Schwebende Leiste automatisch ausblenden |
| ⬆ / ⬇ Schaltflächen | Zum Seitenanfang/-ende springen |

## 🐛 Feedback

Bei Problemen oder Vorschlägen geben Sie bitte Feedback unter [GitHub Issues](https://github.com/urzeye/tampermonkey-scripts/issues)

## 📄 Lizenz

MIT License
