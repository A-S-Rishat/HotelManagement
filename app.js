// Hotel Management System - Bootstrap Edition
(() => {
    'use strict';

    const STORAGE_KEY = 'hotelManagement.v1';

    // Data structure
    let data = {
        rooms: [],
        guests: [],
        bookings: [],
        nextId: { room: 1, guest: 1, booking: 1 }
    };

    // Load data from localStorage
    function loadData() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            data = JSON.parse(saved);
        }
    }

    // Save data to localStorage
    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // View Navigation
    function setupNavigation() {
        const navLinks = document.querySelectorAll('[data-view]');
        const viewButtons = document.querySelectorAll('[data-view-btn]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                showView(view);
                
                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.viewBtn;
                showView(view);
                
                // Update active nav link
                navLinks.forEach(l => l.classList.remove('active'));
                const navLink = document.querySelector(`[data-view="${view}"]`);
                if (navLink) navLink.classList.add('active');
            });
        });
    }

    function showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.add('d-none');
        });
        
        // Show selected view
        const selectedView = document.getElementById(`view-${viewName}`);
        if (selectedView) {
            selectedView.classList.remove('d-none');
        }

        // Refresh data for the view
        if (viewName === 'rooms') renderRooms();
        if (viewName === 'guests') renderGuests();
        if (viewName === 'bookings') renderBookings();
    }

    // Update Dashboard Stats
    function updateDashboard() {
        document.getElementById('totalRooms').textContent = data.rooms.length;
        document.getElementById('availableRooms').textContent = 
            data.rooms.filter(r => r.status === 'Available').length;
        document.getElementById('totalGuests').textContent = data.guests.length;
        document.getElementById('totalBookings').textContent = 
            data.bookings.filter(b => b.status === 'Confirmed' || b.status === 'Checked-in').length;
    }

    // ROOMS
    window.saveRoom = function() {
        const id = document.getElementById('roomId').value;
        const room = {
            id: id || data.nextId.room++,
            number: document.getElementById('roomNumber').value,
            type: document.getElementById('roomType').value,
            capacity: parseInt(document.getElementById('roomCapacity').value),
            price: parseFloat(document.getElementById('roomPrice').value),
            status: document.getElementById('roomStatus').value
        };

        if (id) {
            // Update existing room
            const index = data.rooms.findIndex(r => r.id == id);
            if (index !== -1) data.rooms[index] = room;
        } else {
            // Add new room
            data.rooms.push(room);
        }

        saveData();
        renderRooms();
        updateDashboard();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('roomModal')).hide();
        document.getElementById('roomForm').reset();
        document.getElementById('roomId').value = '';
    };

    window.editRoom = function(id) {
        const room = data.rooms.find(r => r.id == id);
        if (!room) return;

        document.getElementById('roomId').value = room.id;
        document.getElementById('roomNumber').value = room.number;
        document.getElementById('roomType').value = room.type;
        document.getElementById('roomCapacity').value = room.capacity;
        document.getElementById('roomPrice').value = room.price;
        document.getElementById('roomStatus').value = room.status;

        const modal = new bootstrap.Modal(document.getElementById('roomModal'));
        modal.show();
    };

    window.deleteRoom = function(id) {
        if (!confirm('Are you sure you want to delete this room?')) return;
        
        data.rooms = data.rooms.filter(r => r.id != id);
        saveData();
        renderRooms();
        updateDashboard();
    };

    function renderRooms() {
        const tbody = document.getElementById('roomsTableBody');
        
        if (data.rooms.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No rooms added yet</td></tr>';
            return;
        }

        tbody.innerHTML = data.rooms.map(room => {
            const statusBadge = getStatusBadge(room.status);
            return `
                <tr>
                    <td><strong>${room.number}</strong></td>
                    <td>${room.type}</td>
                    <td>${room.capacity}</td>
                    <td>$${room.price.toFixed(2)}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editRoom(${room.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteRoom(${room.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // GUESTS
    window.saveGuest = function() {
        const id = document.getElementById('guestId').value;
        const guest = {
            id: id || data.nextId.guest++,
            name: document.getElementById('guestName').value,
            email: document.getElementById('guestEmail').value,
            phone: document.getElementById('guestPhone').value
        };

        if (id) {
            const index = data.guests.findIndex(g => g.id == id);
            if (index !== -1) data.guests[index] = guest;
        } else {
            data.guests.push(guest);
        }

        saveData();
        renderGuests();
        updateDashboard();
        
        bootstrap.Modal.getInstance(document.getElementById('guestModal')).hide();
        document.getElementById('guestForm').reset();
        document.getElementById('guestId').value = '';
    };

    window.editGuest = function(id) {
        const guest = data.guests.find(g => g.id == id);
        if (!guest) return;

        document.getElementById('guestId').value = guest.id;
        document.getElementById('guestName').value = guest.name;
        document.getElementById('guestEmail').value = guest.email;
        document.getElementById('guestPhone').value = guest.phone;

        const modal = new bootstrap.Modal(document.getElementById('guestModal'));
        modal.show();
    };

    window.deleteGuest = function(id) {
        if (!confirm('Are you sure you want to delete this guest?')) return;
        
        data.guests = data.guests.filter(g => g.id != id);
        saveData();
        renderGuests();
        updateDashboard();
    };

    function renderGuests() {
        const tbody = document.getElementById('guestsTableBody');
        
        if (data.guests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No guests registered yet</td></tr>';
            return;
        }

        tbody.innerHTML = data.guests.map(guest => `
            <tr>
                <td><strong>${guest.name}</strong></td>
                <td>${guest.email}</td>
                <td>${guest.phone}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editGuest(${guest.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteGuest(${guest.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // BOOKINGS
    window.saveBooking = function() {
        const id = document.getElementById('bookingId').value;
        const guestId = document.getElementById('bookingGuest').value;
        const roomId = document.getElementById('bookingRoom').value;
        const checkIn = document.getElementById('bookingCheckIn').value;
        const checkOut = document.getElementById('bookingCheckOut').value;
        const status = document.getElementById('bookingStatus').value;

        if (!guestId || !roomId || !checkIn || !checkOut) {
            alert('Please fill all required fields');
            return;
        }

        const room = data.rooms.find(r => r.id == roomId);
        const days = calculateDays(checkIn, checkOut);
        const total = days * room.price;

        const booking = {
            id: id || data.nextId.booking++,
            guestId: parseInt(guestId),
            roomId: parseInt(roomId),
            checkIn,
            checkOut,
            status,
            total
        };

        if (id) {
            const index = data.bookings.findIndex(b => b.id == id);
            if (index !== -1) data.bookings[index] = booking;
        } else {
            data.bookings.push(booking);
        }

        saveData();
        renderBookings();
        updateDashboard();
        
        bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
        document.getElementById('bookingForm').reset();
        document.getElementById('bookingId').value = '';
    };

    window.editBooking = function(id) {
        const booking = data.bookings.find(b => b.id == id);
        if (!booking) return;

        document.getElementById('bookingId').value = booking.id;
        document.getElementById('bookingGuest').value = booking.guestId;
        document.getElementById('bookingRoom').value = booking.roomId;
        document.getElementById('bookingCheckIn').value = booking.checkIn;
        document.getElementById('bookingCheckOut').value = booking.checkOut;
        document.getElementById('bookingStatus').value = booking.status;

        populateBookingSelects();
        const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
        modal.show();
    };

    window.deleteBooking = function(id) {
        if (!confirm('Are you sure you want to delete this booking?')) return;
        
        data.bookings = data.bookings.filter(b => b.id != id);
        saveData();
        renderBookings();
        updateDashboard();
    };

    function renderBookings() {
        const tbody = document.getElementById('bookingsTableBody');
        
        if (data.bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No bookings yet</td></tr>';
            return;
        }

        tbody.innerHTML = data.bookings.map(booking => {
            const guest = data.guests.find(g => g.id == booking.guestId);
            const room = data.rooms.find(r => r.id == booking.roomId);
            const statusBadge = getBookingStatusBadge(booking.status);
            
            return `
                <tr>
                    <td><strong>#${booking.id}</strong></td>
                    <td>${guest ? guest.name : 'N/A'}</td>
                    <td>${room ? room.number : 'N/A'}</td>
                    <td>${booking.checkIn}</td>
                    <td>${booking.checkOut}</td>
                    <td>${statusBadge}</td>
                    <td><strong>$${booking.total.toFixed(2)}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editBooking(${booking.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteBooking(${booking.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function populateBookingSelects() {
        const guestSelect = document.getElementById('bookingGuest');
        const roomSelect = document.getElementById('bookingRoom');

        guestSelect.innerHTML = '<option value="">Select Guest</option>' + 
            data.guests.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        
        roomSelect.innerHTML = '<option value="">Select Room</option>' + 
            data.rooms.filter(r => r.status === 'Available').map(r => 
                `<option value="${r.id}">Room ${r.number} - ${r.type} ($${r.price}/night)</option>`
            ).join('');
    }

    // Helper Functions
    function getStatusBadge(status) {
        const badges = {
            'Available': 'success',
            'Occupied': 'warning',
            'Maintenance': 'danger'
        };
        return `<span class="badge bg-${badges[status] || 'secondary'}">${status}</span>`;
    }

    function getBookingStatusBadge(status) {
        const badges = {
            'Confirmed': 'primary',
            'Checked-in': 'success',
            'Checked-out': 'secondary',
            'Cancelled': 'danger'
        };
        return `<span class="badge bg-${badges[status] || 'secondary'}">${status}</span>`;
    }

    function calculateDays(checkIn, checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diff = end - start;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    // Modal event listeners
    document.getElementById('roomModal').addEventListener('show.bs.modal', function () {
        if (!document.getElementById('roomId').value) {
            document.getElementById('roomForm').reset();
        }
    });

    document.getElementById('guestModal').addEventListener('show.bs.modal', function () {
        if (!document.getElementById('guestId').value) {
            document.getElementById('guestForm').reset();
        }
    });

    document.getElementById('bookingModal').addEventListener('show.bs.modal', function () {
        populateBookingSelects();
        if (!document.getElementById('bookingId').value) {
            document.getElementById('bookingForm').reset();
        }
    });

    // Initialize
    loadData();
    setupNavigation();
    updateDashboard();
    
    // Add sample data if empty
    if (data.rooms.length === 0) {
        // Sample rooms
        data.rooms = [
            { id: 1, number: '101', type: 'Single', capacity: 1, price: 80, status: 'Available' },
            { id: 2, number: '102', type: 'Double', capacity: 2, price: 120, status: 'Available' },
            { id: 3, number: '201', type: 'Suite', capacity: 4, price: 250, status: 'Available' }
        ];
        data.nextId.room = 4;

        // Sample guests
        data.guests = [
            { id: 1, name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '+0987654321' }
        ];
        data.nextId.guest = 3;

        saveData();
        updateDashboard();
    }
})();
