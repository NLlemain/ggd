// Admin Panel JavaScript (Wireframe Version)

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!sessionStorage.getItem('adminLoggedIn')) {
        window.location.href = '/login';
        return;
    }

    setupTabs();
    loadOrders();
    loadPackages();
    loadRates();
    setupPackageForm();
    setupRatesForm();
    setupDeleteSelectedBtn();
});

// ============================================
// TAB NAVIGATION
// ============================================

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;

            // Update active states
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// ============================================
// ORDERS MANAGEMENT
// ============================================

async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        const orders = await response.json();
        renderAdminOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function renderAdminOrders(orders) {
    const tbody = document.getElementById('adminOrdersBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Geen orders</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const klantInfo = order.contact ? order.contact.naam : '-';
        const details = order.details || order.pakket;

        return `
            <tr>
                <td>#${String(order.id).padStart(3, '0')}</td>
                <td>${klantInfo}</td>
                <td>${details}</td>
                <td>€${order.offerte}</td>
                <td>${order.status}</td>
                <td>
                    <button class="btn-inplannen" onclick="updateOrderStatus(${order.id}, 'Ingepland')">Inplannen</button>
                    <button class="btn-afwijzen" onclick="updateOrderStatus(${order.id}, 'Afgewezen')">Afwijzen</button>
                    <button class="btn-afgerond" onclick="updateOrderStatus(${order.id}, 'Afgerond')">Afgerond</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Status bijgewerkt');
            loadOrders();
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Fout bij bijwerken');
    }
}

// ============================================
// PACKAGES MANAGEMENT
// ============================================

let selectedPackages = new Set();

async function loadPackages() {
    try {
        const response = await fetch('/api/packages');
        const packages = await response.json();
        renderPackages(packages);
    } catch (error) {
        console.error('Error loading packages:', error);
    }
}

function renderPackages(packages) {
    const tbody = document.getElementById('packagesBody');
    if (!tbody) return;

    if (packages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">Geen pakketten</td></tr>';
        return;
    }

    tbody.innerHTML = packages.map(pkg => `
        <tr>
            <td>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" class="package-checkbox" data-id="${pkg.id}" onchange="togglePackageSelection(${pkg.id})">
                    ${pkg.naam}
                </label>
            </td>
            <td>€${pkg.prijs}</td>
            <td>
                <button class="btn-bewerk" onclick="editPackage(${pkg.id})">Bewerk</button>
            </td>
            <td>
                <button class="btn-verwijder" onclick="deletePackage(${pkg.id})">Verwijder</button>
            </td>
        </tr>
    `).join('');
}

function togglePackageSelection(packageId) {
    if (selectedPackages.has(packageId)) {
        selectedPackages.delete(packageId);
    } else {
        selectedPackages.add(packageId);
    }
}

function setupPackageForm() {
    const form = document.getElementById('newPackageForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const packageData = {
            naam: document.getElementById('pakketNaam').value,
            beschrijving: document.getElementById('pakketBeschrijving').value,
            prijs: document.getElementById('pakketPrijs').value
        };

        try {
            const response = await fetch('/api/packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(packageData)
            });

            const result = await response.json();
            if (result.success) {
                showNotification('Pakket toegevoegd');
                form.reset();
                loadPackages();
            }
        } catch (error) {
            console.error('Error adding package:', error);
            showNotification('Fout bij toevoegen');
        }
    });
}

function setupDeleteSelectedBtn() {
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteSelectedPackages);
    }
}

async function editPackage(packageId) {
    // Get current package data
    try {
        const response = await fetch(`/api/packages/${packageId}`);
        const pkg = await response.json();

        const naam = prompt('Nieuwe naam:', pkg.naam);
        if (naam === null) return; // Cancelled

        const prijs = prompt('Nieuwe prijs:', pkg.prijs);
        if (prijs === null) return; // Cancelled

        const updateResponse = await fetch(`/api/packages/${packageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ naam, prijs: parseFloat(prijs) })
        });

        const result = await updateResponse.json();
        if (result.success) {
            showNotification('Pakket bijgewerkt');
            loadPackages();
        }
    } catch (error) {
        console.error('Error updating package:', error);
        showNotification('Fout bij bijwerken');
    }
}

async function deletePackage(packageId) {
    if (!confirm('Weet u zeker dat u dit pakket wilt verwijderen?')) return;

    try {
        const response = await fetch(`/api/packages/${packageId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Pakket verwijderd');
            loadPackages();
        }
    } catch (error) {
        console.error('Error deleting package:', error);
        showNotification('Fout bij verwijderen');
    }
}

async function deleteSelectedPackages() {
    if (selectedPackages.size === 0) {
        showNotification('Selecteer eerst pakketten');
        return;
    }

    if (!confirm(`Weet u zeker dat u ${selectedPackages.size} pakket(ten) wilt verwijderen?`)) return;

    for (const packageId of selectedPackages) {
        try {
            await fetch(`/api/packages/${packageId}`, { method: 'DELETE' });
        } catch (error) {
            console.error('Error deleting package:', error);
        }
    }

    selectedPackages.clear();
    showNotification('Pakketten verwijderd');
    loadPackages();
}

// ============================================
// RATES MANAGEMENT
// ============================================

async function loadRates() {
    try {
        const response = await fetch('/api/rates');
        const rates = await response.json();

        const grasInput = document.getElementById('prijsGras');
        const tegelsInput = document.getElementById('prijsTegels');

        if (grasInput) grasInput.value = rates.gras || 0;
        if (tegelsInput) tegelsInput.value = rates.tegels || 0;
    } catch (error) {
        console.error('Error loading rates:', error);
    }
}

function setupRatesForm() {
    const form = document.getElementById('ratesForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const ratesData = {
            gras: parseFloat(document.getElementById('prijsGras').value),
            tegels: parseFloat(document.getElementById('prijsTegels').value)
        };

        try {
            const response = await fetch('/api/rates', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ratesData)
            });

            const result = await response.json();
            if (result.success) {
                showNotification('Tarieven opgeslagen');
            }
        } catch (error) {
            console.error('Error saving rates:', error);
            showNotification('Fout bij opslaan');
        }
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showNotification(message) {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.href = '/login';
}

// Make functions globally available
window.updateOrderStatus = updateOrderStatus;
window.editPackage = editPackage;
window.deletePackage = deletePackage;
window.togglePackageSelection = togglePackageSelection;
window.logout = logout;
