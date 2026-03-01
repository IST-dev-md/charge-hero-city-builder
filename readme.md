# ⚡ Charge Hero – City Builder

Mini application fullstack développée dans le cadre d’un test technique.

Application interactive permettant de gérer des bornes de recharge sur une grille 40×20, avec mise à jour temps réel via WebSocket.

---

## 🧱 Stack Technique

### Backend
- PHP 8.2  
- Symfony 7  
- API REST  
- Stockage léger 
- Tests unitaires avec PHPUnit  

### WebSocket
- Node.js  
- ws (WebSocket natif)  
- Bridge HTTP → WebSocket  

### Frontend
- React + TypeScript  
- Vite  
- Zustand (store léger)  
- SCSS structuré  
- WebSocket natif  
- Responsive  

---

## 🏗 Architecture

```
charge-hero-project/
├── charge-hero-api/      (Symfony API)
├── charge-hero-ws/       (Node WebSocket server)
├── charge-hero-front/    (React + TS frontend)
```

---

## 🚀 Installation & Lancement

### 1️⃣ Backend (Symfony)

```bash
cd charge-hero-api
composer install
php bin/console cache:clear
symfony serve
```

API disponible sur :  
http://127.0.0.1:8000

---

### 2️⃣ WebSocket Server

```bash
cd charge-hero-ws
npm install
node server.js
```

WebSocket :  
ws://127.0.0.1:8080  

Bridge HTTP :  
http://127.0.0.1:8081/broadcast  

---

### 3️⃣ Frontend

```bash
cd charge-hero-front
npm install
npm run dev
```

Application :  
http://localhost:8082  

---

## 🧪 Tests unitaires Backend

```bash
cd charge-hero-api
php vendor/bin/phpunit -c phpunit.dist.xml
```

---

## ⚙️ Configuration

### Backend (.env)

```
WS_BRIDGE_URL=http://127.0.0.1:8081/broadcast
```

### Frontend (.env)

```
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_WS_PORT=8080
VITE_WS_RECONNECT_DELAY=3000
```

---

## 🔄 Fonctionnement temps réel

Toute action backend déclenche un broadcast :

- `station_created`
- `station_updated`
- `station_deleted`
- `stations_simulated`

Le frontend écoute via WebSocket et met à jour son store en temps réel.

---

## 📦 Stockage

Le projet utilise un fichier JSON (`var/stations.json`) pour :

- rester léger  
- éviter une base de données complète  
- conserver une persistance simple  

En production, une base relationnelle serait utilisée.

---

## 🎯 Choix techniques

- Pas d’over-engineering  
- Pas de Mercure / Ratchet  
- WebSocket Node simple  
- Configuration via variables d’environnement  
- Architecture claire et explicable en entretien  
- Typage strict côté frontend  
- Tests unitaires backend  

---

## 📌 Remarques

L’infrastructure est volontairement minimale pour :

- Maximiser la lisibilité  
- Faciliter l’exécution locale  
- Se concentrer sur l’architecture et la qualité du code  
- Un Launcher (start.bat) est disponible pour faciliter le lancement !

---

## 👨‍💻 Auteur

Médérick Delos  
Architecte Logiciel / Lead Tech PHP Symfony - React