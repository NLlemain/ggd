const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;

// Data file paths
const PACKAGES_FILE = path.join(__dirname, 'data', 'packages.json');
const RATES_FILE = path.join(__dirname, 'data', 'rates.json');
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Helper functions for file-based storage
function readDataFile(filePath, defaultData) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
    }
    return defaultData;
}

function writeDataFile(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
    }
}

// Default data
const defaultPackages = [
    { id: 1, naam: 'Basis Pakket', beschrijving: 'Grasmaaien, bladeren ruimen, basis onderhoud', prijs: 100 },
    { id: 2, naam: 'Premium Pakket', beschrijving: 'Basis + heg snoeien, onkruid verwijderen, borders', prijs: 150 },
    { id: 3, naam: 'Deluxe Pakket', beschrijving: 'Premium + tuinontwerp advies, prioriteit service', prijs: 250 }
];

const defaultRates = {
    gras: 2.5,
    tegels: 5,
    heg: 8
};

// Load data from files
let packages = readDataFile(PACKAGES_FILE, defaultPackages);
let rates = readDataFile(RATES_FILE, defaultRates);
let orders = readDataFile(ORDERS_FILE, []);

// Calculate next IDs
let nextOrderId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 1;
let nextPackageId = packages.length > 0 ? Math.max(...packages.map(p => p.id)) + 1 : 4;

// Admin credentials
const adminCredentials = {
    username: 'admin',
    password: 'admin123'
};

// ============================================
// PAGE ROUTES
// ============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ============================================
// LOGIN API
// ============================================

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === adminCredentials.username && password === adminCredentials.password) {
        res.json({ success: true, message: 'Login succesvol' });
    } else {
        res.status(401).json({ success: false, message: 'Ongeldige gebruikersnaam of wachtwoord' });
    }
});

// ============================================
// ORDERS API
// ============================================

// GET all orders
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// POST new order (from package selection)
app.post('/api/orders', (req, res) => {
    const { pakket, offerte } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const newOrder = {
        id: nextOrderId++,
        pakket: pakket,
        offerte: parseFloat(offerte) || 0,
        status: 'Nieuw',
        datum: today
    };

    orders.push(newOrder);
    writeDataFile(ORDERS_FILE, orders);
    res.json({ success: true, order: newOrder });
});

// POST custom offerte
app.post('/api/offerte', (req, res) => {
    const { m2gras, m2tegels, heg, opties } = req.body;

    // Calculate quote using dynamic rates
    const grasPrijs = parseFloat(m2gras || 0) * rates.gras;
    const tegelsPrijs = parseFloat(m2tegels || 0) * rates.tegels;
    const hegPrijs = parseFloat(heg || 0) * rates.heg;
    const totaal = Math.round(grasPrijs + tegelsPrijs + hegPrijs);

    const today = new Date().toISOString().split('T')[0];

    // Build details string
    let details = [];
    if (m2gras > 0) details.push(`${m2gras}m² gras`);
    if (m2tegels > 0) details.push(`${m2tegels}m² tegels`);
    if (heg > 0) details.push(`${heg}m heg`);
    if (opties && opties.length > 0) details.push(`Opties: ${opties.join(', ')}`);

    const newOrder = {
        id: nextOrderId++,
        pakket: 'Custom Offerte',
        details: details.join(', '),
        offerte: totaal,
        status: 'Nieuw',
        datum: today
    };

    orders.push(newOrder);
    writeDataFile(ORDERS_FILE, orders);
    res.json({ success: true, order: newOrder, totaal: totaal });
});

// PUT update order status
app.put('/api/orders/:id', (req, res) => {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = status;
        writeDataFile(ORDERS_FILE, orders);
        res.json({ success: true, order: order });
    } else {
        res.status(404).json({ success: false, message: 'Order niet gevonden' });
    }
});

// DELETE order
app.delete('/api/orders/:id', (req, res) => {
    const orderId = parseInt(req.params.id);
    const index = orders.findIndex(o => o.id === orderId);

    if (index !== -1) {
        orders.splice(index, 1);
        writeDataFile(ORDERS_FILE, orders);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Order niet gevonden' });
    }
});

// ============================================
// PACKAGES API
// ============================================

// GET all packages
app.get('/api/packages', (req, res) => {
    res.json(packages);
});

// GET single package
app.get('/api/packages/:id', (req, res) => {
    const pkg = packages.find(p => p.id === parseInt(req.params.id));
    if (pkg) {
        res.json(pkg);
    } else {
        res.status(404).json({ success: false, message: 'Pakket niet gevonden' });
    }
});

// POST new package
app.post('/api/packages', (req, res) => {
    const { naam, beschrijving, prijs } = req.body;

    const newPackage = {
        id: nextPackageId++,
        naam: naam || '',
        beschrijving: beschrijving || '',
        prijs: parseFloat(prijs) || 0
    };

    packages.push(newPackage);
    writeDataFile(PACKAGES_FILE, packages);
    res.json({ success: true, package: newPackage });
});

// PUT update package
app.put('/api/packages/:id', (req, res) => {
    const packageId = parseInt(req.params.id);
    const { naam, beschrijving, prijs } = req.body;

    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
        if (naam !== undefined) pkg.naam = naam;
        if (beschrijving !== undefined) pkg.beschrijving = beschrijving;
        if (prijs !== undefined) pkg.prijs = parseFloat(prijs);
        writeDataFile(PACKAGES_FILE, packages);
        res.json({ success: true, package: pkg });
    } else {
        res.status(404).json({ success: false, message: 'Pakket niet gevonden' });
    }
});

// DELETE package
app.delete('/api/packages/:id', (req, res) => {
    const packageId = parseInt(req.params.id);
    const index = packages.findIndex(p => p.id === packageId);

    if (index !== -1) {
        packages.splice(index, 1);
        writeDataFile(PACKAGES_FILE, packages);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Pakket niet gevonden' });
    }
});

// ============================================
// RATES API
// ============================================

// GET rates
app.get('/api/rates', (req, res) => {
    res.json(rates);
});

// PUT update rates
app.put('/api/rates', (req, res) => {
    const { gras, tegels, heg } = req.body;

    if (gras !== undefined) rates.gras = parseFloat(gras);
    if (tegels !== undefined) rates.tegels = parseFloat(tegels);
    if (heg !== undefined) rates.heg = parseFloat(heg);

    writeDataFile(RATES_FILE, rates);
    res.json({ success: true, rates });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`Server draait op http://localhost:${PORT}`);
});
