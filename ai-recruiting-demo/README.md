# AI-Recruiting-Public Demo

**Privacy-First Recruiting Assistant für Jobsuchende**

Ein vollständig im Browser laufender Recruiting-Assistant, der Jobsuchende bei der Analyse ihrer Bewerbungsprofile unterstützt. **100% Privacy-First** - alle Daten werden lokal im Browser verarbeitet, keine Daten werden an Server übertragen.

## 🎯 Features

- ✅ **Profile Input** - Erfassen Sie Ihr Profil mit Erfahrungen, Ausbildung, Skills und Projekten
- ✅ **Job Analysis** - Analysieren Sie Stellenausschreibungen gegen Ihr Profil
- ✅ **ATS Score** - Berechnung des Applicant Tracking System (ATS) Scores
- ✅ **Skill Gap Analysis** - Identifikation von Skill-Lücken und Handlungsempfehlungen
- ✅ **Role Focus Risk Assessment** - Bewertung der Rollenfokussierung
- ✅ **Profile Management** - Speichern, Laden, Exportieren und Importieren von Profilen
- ✅ **100% Lokale Verarbeitung** - Keine Datenübertragung, vollständige Privatsphäre

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 18+ und npm (oder yarn/pnpm)
- Moderne Browser mit IndexedDB-Unterstützung (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Repository klonen
git clone <repository-url>
cd ai-recruiting-demo

# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

Die Anwendung läuft dann auf `http://localhost:5173`

### Build für Production

```bash
# Production Build erstellen
npm run build

# Build Preview testen
npm run preview
```

Die gebauten Dateien befinden sich im `dist/` Verzeichnis und können auf jedem statischen Host (Vercel, Netlify, GitHub Pages, etc.) gehostet werden.

## 🧪 Tests

```bash
# Tests ausführen
npm test

# Tests einmalig ausführen (ohne Watch Mode)
npm run test:run

# Tests mit Coverage
npm test -- --coverage
```

## 📁 Projektstruktur

```
ai-recruiting-demo/
├── src/
│   ├── components/        # Wiederverwendbare UI-Komponenten
│   │   ├── forms/        # Form-Komponenten (ExperienceCard, EducationCard)
│   │   ├── results/      # Results-Komponenten (GapActionCard, ATSScoreBreakdown, etc.)
│   │   ├── shared/       # Shared-Komponenten (PrivacyNotice, NotFound)
│   │   └── ui/           # shadcn/ui Basis-Komponenten
│   ├── features/         # Feature-basierte Screens
│   │   ├── landing/      # Landing Screen
│   │   ├── input/        # Input Screen
│   │   ├── analysis/     # Analysis Engine & Loading Screen
│   │   ├── results/      # Results Screen
│   │   └── profile/      # Profile Management
│   ├── contexts/         # React Contexts (ProfileContext, AnalysisContext)
│   ├── services/         # Business Logic Services
│   ├── lib/              # Bibliotheken (idb, zod)
│   ├── utils/            # Utility-Funktionen
│   ├── types/            # TypeScript Type Definitions
│   └── App.tsx           # Main App Component
├── public/               # Statische Assets
└── dist/                 # Production Build Output
```

## 🔒 Privacy-First Architektur

**Wichtige Privacy-Garantien:**

- ✅ **100% Lokale Verarbeitung** - Alle Analysen laufen im Browser
- ✅ **Keine Server-Kommunikation** - Keine API-Calls, keine Datenübertragung
- ✅ **IndexedDB Speicherung** - Profile werden nur lokal im Browser gespeichert
- ✅ **Optional Export/Import** - Profile können als JSON exportiert/importiert werden
- ✅ **Open Source** - Code ist vollständig einsehbar

Sie können die Privacy-Garantien verifizieren durch:
1. Browser Developer Tools → Network Tab (sollte keine Requests zeigen)
2. Source Code Review (keine API-Calls im Code)
3. Offline-Funktionalität (funktioniert ohne Internet)

## 🛠️ Tech Stack

- **Frontend Framework:** React 19.2.0 + TypeScript
- **Build Tool:** Vite 7.2.4
- **Styling:** Tailwind CSS 3.4.19
- **UI Components:** shadcn/ui (Radix UI)
- **Routing:** React Router v7.11.0
- **State Management:** React Context API
- **Data Persistence:** IndexedDB (via idb)
- **Validation:** Zod 4.2.1
- **Testing:** Vitest + Testing Library

## 📝 Development

### Code-Formatierung

```bash
# Code formatieren
npm run format

# Format-Check
npm run format:check

# Linting
npm run lint
```

### Type Checking

TypeScript wird automatisch während des Build-Prozesses geprüft:

```bash
npm run build
```

## 🚢 Deployment

### Statisches Hosting

Das Projekt kann auf jedem statischen Host gehostet werden:

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**GitHub Pages:**
1. Build erstellen: `npm run build`
2. `dist/` Inhalt zu GitHub Pages Repository pushen

### Build-Konfiguration

Die Build-Konfiguration ist in `vite.config.ts` definiert. Das Projekt erstellt eine optimierte Production-Build im `dist/` Verzeichnis.

## 📖 Verwendung

### User Journey

1. **Landing Screen** (`/`)
   - Privacy Notice lesen
   - "Analyse starten" klicken

2. **Input Screen** (`/input`)
   - Profil-Daten eingeben (Skills, Erfahrungen, Ausbildung, etc.)
   - Stellenausschreibung eingeben
   - Optional: Profil speichern/laden/exportieren
   - "Analyse starten" klicken

3. **Loading Screen** (`/analysis`)
   - Analyse läuft im Hintergrund
   - Stepper Messages zeigen Fortschritt

4. **Results Screen** (`/results`)
   - Executive Summary
   - Skill Fit Analysis
   - Skill Gaps
   - ATS Score Breakdown
   - Role Focus Risk Assessment
   - Next Steps Checklist
   - Optional: Prompt Export für ChatGPT/Claude

## 🤝 Contributing

Dieses Projekt ist ein Demo-Projekt. Für Verbesserungen:

1. Fork das Repository
2. Erstellen Sie einen Feature Branch
3. Committen Sie Ihre Änderungen
4. Pushen Sie zum Branch
5. Erstellen Sie einen Pull Request

## 📄 Lizenz


---

**Wichtig:** Diese Anwendung verarbeitet alle Daten vollständig lokal in Ihrem Browser. Keine Daten werden an Server übertragen. Ihre Privatsphäre steht an erster Stelle.
