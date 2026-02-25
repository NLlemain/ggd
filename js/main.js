// Groen & Gewoon Doen - Customer JavaScript (Wireframe Version)

document.addEventListener('DOMContentLoaded', function() {
    loadPackages();
    loadOrders();
    setupOfferteForm();
    setupPackageOrder();
    setupMenuDropdown();
});

// ============================================
// PACKAGES
// ============================================

// Load packages into dropdown
async function loadPackages() {
    try {
        const response = await fetch('/api/packages');
        const packages = await response.json();
        renderPackageDropdown(packages);
    } catch (error) {
        console.error('Error loading packages:', error);
    }
}

// Render package dropdown
function renderPackageDropdown(packages) {
    const select = document.getElementById('pakketSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Kies een pakket</option>';
    packages.forEach(pkg => {
        const option = document.createElement('option');
        option.value = pkg.id;
        option.textContent = `${pkg.naam} - €${pkg.prijs}`;
        option.dataset.price = pkg.prijs;
        option.dataset.name = pkg.naam;
        select.appendChild(option);
    });
}

// Setup package order button
function setupPackageOrder() {
    const btn = document.getElementById('bestelPakketBtn');
    if (!btn) return;

    btn.addEventListener('click', async function() {
        const select = document.getElementById('pakketSelect');
        const selectedOption = select.options[select.selectedIndex];

        if (!select.value) {
            showNotification('Selecteer eerst een pakket');
            return;
        }

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pakket: selectedOption.dataset.name,
                    offerte: selectedOption.dataset.price
                })
            });

            const result = await response.json();
            if (result.success) {
                showNotification('Bestelling geplaatst!');
                loadOrders();
                select.value = '';
                scrollToSection('orders');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            showNotification('Er ging iets mis');
        }
    });
}

// ============================================
// ORDERS
// ============================================

// Load orders
async function loadOrders() {
    try {
        const response = await fetch('/api/orders');
        const orders = await response.json();
        renderOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Render orders with Akkoord/Niet Akkoord buttons for "Ingepland" status
function renderOrders(orders) {
    const tbody = document.getElementById('ordersBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">Geen bestellingen</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        let pakketInfo = order.pakket;
        if (order.details) {
            pakketInfo += `<br><small style="color: #666;">${order.details}</small>`;
        }

        // Show Akkoord/Niet Akkoord buttons only for "Ingepland" status
        let statusCell = order.status;
        if (order.status === 'Ingepland') {
            statusCell = `
                <div>
                    <span style="display: block; margin-bottom: 0.3rem;">${order.status}</span>
                    <button class="btn-akkoord" onclick="respondToOrder(${order.id}, 'akkoord')">Akkoord</button>
                    <button class="btn-niet-akkoord" onclick="respondToOrder(${order.id}, 'niet-akkoord')">Niet Akkoord</button>
                </div>
            `;
        }

        return `
            <tr>
                <td>#${String(order.id).padStart(3, '0')}</td>
                <td>${pakketInfo}</td>
                <td>€${order.offerte}</td>
                <td>${statusCell}</td>
                <td>${order.datum}</td>
            </tr>
        `;
    }).join('');
}

// Respond to scheduled order (Akkoord/Niet Akkoord)
async function respondToOrder(orderId, response) {
    const newStatus = response === 'akkoord' ? 'Bevestigd' : 'Geannuleerd';

    try {
        const res = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await res.json();
        if (result.success) {
            showNotification(response === 'akkoord' ? 'Order bevestigd!' : 'Order geannuleerd');
            loadOrders();
        }
    } catch (error) {
        console.error('Error responding to order:', error);
        showNotification('Er ging iets mis');
    }
}

// ============================================
// OFFERTE FORM
// ============================================

// Setup offerte form
function setupOfferteForm() {
    const form = document.getElementById('offerteForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            m2gras: document.getElementById('m2gras').value || 0,
            m2tegels: document.getElementById('m2tegels').value || 0,
            heg: document.getElementById('metersHeg').value || 0,
            opties: []
        };

        // Collect checked options
        document.querySelectorAll('.opties-row input[type="checkbox"]:checked').forEach(cb => {
            formData.opties.push(cb.value);
        });

        try {
            const response = await fetch('/api/offerte', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            if (result.success) {
                const resultDiv = document.getElementById('offerteResult');
                resultDiv.innerHTML = `<strong>Geschatte prijs: €${result.totaal}</strong><br><small>Order #${String(result.order.id).padStart(3, '0')} aangemaakt</small>`;
                resultDiv.style.display = 'block';
                resultDiv.classList.add('show');

                form.reset();
                loadOrders();
                showNotification('Offerte berekend!');
            }
        } catch (error) {
            console.error('Error calculating offerte:', error);
            showNotification('Er ging iets mis');
        }
    });
}

// ============================================
// NAVIGATION
// ============================================

// Setup menu dropdown navigation
function setupMenuDropdown() {
    const dropdown = document.getElementById('menuDropdown');
    if (!dropdown) return;

    dropdown.addEventListener('change', function() {
        if (this.value === 'admin') {
            window.location.href = '/login';
        } else if (this.value) {
            scrollToSection(this.value);
        }
        this.selectedIndex = 0; // Reset to arrow
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    const nav = document.getElementById('mobileNav');
    if (nav) {
        nav.classList.toggle('active');
    }
}

// Scroll to section
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        const headerHeight = document.querySelector('header').offsetHeight;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
            top: elementPosition - headerHeight - 10,
            behavior: 'smooth'
        });

        // Close mobile menu if open
        const mobileNav = document.getElementById('mobileNav');
        if (mobileNav) {
            mobileNav.classList.remove('active');
        }
    }
}

// ============================================
// UTILITY
// ============================================

// Show notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Make functions globally available
window.scrollToSection = scrollToSection;
window.toggleMobileMenu = toggleMobileMenu;
window.respondToOrder = respondToOrder;
