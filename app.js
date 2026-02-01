/* Basic Hotel Management System (front-end only)
 * - Rooms, Guests, Bookings
 * - Local persistence via localStorage
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'hotelManagement.v1';

  /** @type {{rooms:any[], guests:any[], bookings:any[], counters:{room:number, guest:number, booking:number}}} */
  let state = loadState();

  const el = {
    // nav
    navBtns: [...document.querySelectorAll('[data-view]')].filter((b) => b.matches('button')),

    // dashboard
    kpiTotalRooms: document.getElementById('kpiTotalRooms'),
    kpiRoomTypes: document.getElementById('kpiRoomTypes'),
    kpiAvailable: document.getElementById('kpiAvailable'),
    kpiOccupied: document.getElementById('kpiOccupied'),
    kpiActiveBookings: document.getElementById('kpiActiveBookings'),
    kpiUpcoming: document.getElementById('kpiUpcoming'),
    kpiGuests: document.getElementById('kpiGuests'),
    kpiRevenue: document.getElementById('kpiRevenue'),
    todayEmpty: document.getElementById('todayEmpty'),
    todayList: document.getElementById('todayList'),
    alertsEmpty: document.getElementById('alertsEmpty'),
    alertsList: document.getElementById('alertsList'),

    // global actions
    btnExport: document.getElementById('btnExport'),
    btnReset: document.getElementById('btnReset'),
    linkSeed: document.getElementById('linkSeed'),

    // rooms
    roomsTbody: document.getElementById('roomsTbody'),
    btnAddRoom: document.getElementById('btnAddRoom'),
    roomFilterStatus: document.getElementById('roomFilterStatus'),

    // guests
    guestsTbody: document.getElementById('guestsTbody'),
    btnAddGuest: document.getElementById('btnAddGuest'),
    guestSearch: document.getElementById('guestSearch'),

    // bookings
    bookingsTbody: document.getElementById('bookingsTbody'),
    btnAddBooking: document.getElementById('btnAddBooking'),
    bookingFilterStatus: document.getElementById('bookingFilterStatus'),
    quickBookingForm: document.getElementById('quickBookingForm'),
    qbGuest: document.getElementById('qbGuest'),
    qbRoom: document.getElementById('qbRoom'),
    qbIn: document.getElementById('qbIn'),
    qbOut: document.getElementById('qbOut'),
    btnOpenFullBooking: document.getElementById('btnOpenFullBooking'),

    // dialogs
    dlgRoom: document.getElementById('dlgRoom'),
    roomForm: document.getElementById('roomForm'),
    roomDlgTitle: document.getElementById('roomDlgTitle'),
    roomId: document.getElementById('roomId'),
    roomNumber: document.getElementById('roomNumber'),
    roomType: document.getElementById('roomType'),
    roomCapacity: document.getElementById('roomCapacity'),
    roomPrice: document.getElementById('roomPrice'),
    roomStatus: document.getElementById('roomStatus'),

    dlgGuest: document.getElementById('dlgGuest'),
    guestForm: document.getElementById('guestForm'),
    guestDlgTitle: document.getElementById('guestDlgTitle'),
    guestId: document.getElementById('guestId'),
    guestName: document.getElementById('guestName'),
    guestPhone: document.getElementById('guestPhone'),
    guestEmail: document.getElementById('guestEmail'),

    dlgBooking: document.getElementById('dlgBooking'),
    bookingForm: document.getElementById('bookingForm'),
    bookingDlgTitle: document.getElementById('bookingDlgTitle'),
    bookingId: document.getElementById('bookingId'),
    bookingGuest: document.getElementById('bookingGuest'),
    bookingRoom: document.getElementById('bookingRoom'),
    bookingIn: document.getElementById('bookingIn'),
    bookingOut: document.getElementById('bookingOut'),
    bookingStatus: document.getElementById('bookingStatus'),
    bookingCostHint: document.getElementById('bookingCostHint'),

    // toast
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toastMsg'),
  };

  wireUp();
  refreshAll();

  function wireUp() {
    // navigation
    for (const btn of el.navBtns) {
      btn.addEventListener('click', () => setView(btn.dataset.view));
    }

    // global actions
    el.btnReset.addEventListener('click', () => {
      if (!confirm('Reset all data? This clears localStorage for this app.')) return;
      state = emptyState();
      saveState(state);
      toast('Reset complete.');
      refreshAll();
    });

    el.btnExport.addEventListener('click', () => {
      const json = JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotel-management-export-${isoDate(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    el.linkSeed.addEventListener('click', (e) => {
      e.preventDefault();
      if (!confirm('Add sample rooms, guests, and bookings?')) return;
      seedIfEmpty(true);
      toast('Sample data added.');
      refreshAll();
    });

    // rooms
    el.roomFilterStatus.addEventListener('change', () => renderRooms());
    el.btnAddRoom.addEventListener('click', () => openRoomDialog());
    el.roomForm.addEventListener('submit', (e) => {
      e.preventDefault();
      upsertRoomFromForm();
    });

    // guests
    el.btnAddGuest.addEventListener('click', () => openGuestDialog());
    el.guestSearch.addEventListener('input', () => renderGuests());
    el.guestForm.addEventListener('submit', (e) => {
      e.preventDefault();
      upsertGuestFromForm();
    });

    // bookings
    el.bookingFilterStatus.addEventListener('change', () => renderBookings());
    el.btnAddBooking.addEventListener('click', () => openBookingDialog());
    el.btnOpenFullBooking.addEventListener('click', () => openBookingDialog());

    el.quickBookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const guestId = Number(el.qbGuest.value);
      const roomId = Number(el.qbRoom.value);
      const checkIn = el.qbIn.value;
      const checkOut = el.qbOut.value;
      const status = 'reserved';
      const result = createOrUpdateBooking({ id: null, guestId, roomId, checkIn, checkOut, status });
      if (!result.ok) {
        toast(result.error, 'danger');
        return;
      }
      toast('Booking created.');
      refreshAll();
      setView('bookings');
    });

    // booking full form
    el.bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      upsertBookingFromForm();
    });

    for (const input of [el.bookingRoom, el.bookingIn, el.bookingOut]) {
      input.addEventListener('change', updateBookingCostHint);
      input.addEventListener('input', updateBookingCostHint);
    }

    // close dialog buttons
    document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dlg = btn.closest('dialog');
        if (dlg) dlg.close('cancel');
      });
    });

    // initial seed (only if empty)
    seedIfEmpty(false);
  }

  function setView(viewName) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('is-active'));
    document.querySelectorAll('.segmented__btn').forEach((b) => b.classList.remove('is-active'));

    const view = document.querySelector(`.view[data-view="${cssEscape(viewName)}"]`);
    if (view) view.classList.add('is-active');

    const btn = document.querySelector(`.segmented__btn[data-view="${cssEscape(viewName)}"]`);
    if (btn) btn.classList.add('is-active');

    // keep selects updated when switching
    if (viewName === 'bookings') {
      fillBookingSelects();
      setDefaultQuickDates();
    }
  }

  function refreshAll() {
    normalizeDerivedRoomStatuses();
    saveState(state);

    renderDashboard();
    renderRooms();
    renderGuests();
    fillBookingSelects();
    renderBookings();
    setDefaultQuickDates();
  }

  // -----------------
  // State persistence
  // -----------------

  function emptyState() {
    return {
      rooms: [],
      guests: [],
      bookings: [],
      counters: { room: 0, guest: 0, booking: 0 },
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyState();
      if (!Array.isArray(parsed.rooms) || !Array.isArray(parsed.guests) || !Array.isArray(parsed.bookings)) {
        return emptyState();
      }
      if (!parsed.counters) parsed.counters = { room: 0, guest: 0, booking: 0 };
      return parsed;
    } catch {
      return emptyState();
    }
  }

  function saveState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  function seedIfEmpty(force) {
    const isEmpty = state.rooms.length === 0 && state.guests.length === 0 && state.bookings.length === 0;
    if (!force && !isEmpty) return;

    if (isEmpty) state = emptyState();

    const r101 = addRoom({ number: '101', type: 'standard', capacity: 2, price: 89, status: 'available' });
    const r102 = addRoom({ number: '102', type: 'deluxe', capacity: 3, price: 119, status: 'available' });
    const r201 = addRoom({ number: '201', type: 'suite', capacity: 4, price: 179, status: 'available' });

    const g1 = addGuest({ name: 'Ava Patel', phone: '+1 555 0110', email: 'ava@example.com' });
    const g2 = addGuest({ name: 'Noah Kim', phone: '+1 555 0111', email: 'noah@example.com' });

    const today = new Date();
    const in1 = isoDate(addDays(today, 1));
    const out1 = isoDate(addDays(today, 3));
    createOrUpdateBooking({ id: null, guestId: g1.id, roomId: r102.id, checkIn: in1, checkOut: out1, status: 'reserved' });

    const in2 = isoDate(today);
    const out2 = isoDate(addDays(today, 2));
    createOrUpdateBooking({ id: null, guestId: g2.id, roomId: r201.id, checkIn: in2, checkOut: out2, status: 'checked-in' });

    // keep status derived
    normalizeDerivedRoomStatuses();
    saveState(state);
  }

  // -----------------
  // Rooms
  // -----------------

  function addRoom(room) {
    const id = ++state.counters.room;
    const next = {
      id,
      number: String(room.number).trim(),
      type: String(room.type || 'standard'),
      capacity: clampInt(room.capacity ?? 2, 1, 12),
      price: clampMoney(room.price ?? 0),
      status: String(room.status || 'available'),
    };
    state.rooms.push(next);
    return next;
  }

  function updateRoom(id, patch) {
    const room = state.rooms.find((r) => r.id === id);
    if (!room) return false;
    Object.assign(room, patch);
    return true;
  }

  function deleteRoom(id) {
    // block delete if any non-cancelled booking exists
    const hasBookings = state.bookings.some((b) => b.roomId === id && b.status !== 'cancelled');
    if (hasBookings) return { ok: false, error: 'Cannot delete: room has bookings.' };
    state.rooms = state.rooms.filter((r) => r.id !== id);
    return { ok: true };
  }

  function renderRooms() {
    const filter = el.roomFilterStatus.value;
    const rooms = [...state.rooms]
      .filter((r) => !filter || r.status === filter)
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

    el.roomsTbody.innerHTML = rooms
      .map((r) => {
        const statusPill = pillForRoomStatus(r.status);
        return `
          <tr>
            <td><strong>${escapeHtml(r.number)}</strong></td>
            <td>${escapeHtml(capitalize(r.type))}</td>
            <td>${escapeHtml(String(r.capacity))}</td>
            <td>${escapeHtml(money(r.price))}</td>
            <td>${statusPill}</td>
            <td>
              <div class="actions">
                <button class="btn btn--ghost" type="button" data-action="edit-room" data-id="${r.id}">Edit</button>
                <button class="btn btn--danger" type="button" data-action="delete-room" data-id="${r.id}">Delete</button>
              </div>
            </td>
          </tr>
        `.trim();
      })
      .join('');

    el.roomsTbody.querySelectorAll('[data-action="edit-room"]').forEach((b) => {
      b.addEventListener('click', () => openRoomDialog(Number(b.dataset.id)));
    });
    el.roomsTbody.querySelectorAll('[data-action="delete-room"]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = Number(b.dataset.id);
        if (!confirm('Delete this room?')) return;
        const result = deleteRoom(id);
        if (!result.ok) {
          toast(result.error, 'danger');
          return;
        }
        toast('Room deleted.');
        refreshAll();
      });
    });
  }

  function openRoomDialog(roomId = null) {
    const isEdit = roomId != null;
    el.roomDlgTitle.textContent = isEdit ? 'Edit Room' : 'Add Room';

    if (isEdit) {
      const room = state.rooms.find((r) => r.id === roomId);
      if (!room) return;
      el.roomId.value = String(room.id);
      el.roomNumber.value = room.number;
      el.roomType.value = room.type;
      el.roomCapacity.value = String(room.capacity);
      el.roomPrice.value = String(room.price);
      el.roomStatus.value = room.status;
    } else {
      el.roomId.value = '';
      el.roomNumber.value = '';
      el.roomType.value = 'standard';
      el.roomCapacity.value = '2';
      el.roomPrice.value = '99';
      el.roomStatus.value = 'available';
    }

    safeShowModal(el.dlgRoom);
    el.roomNumber.focus();
  }

  function upsertRoomFromForm() {
    const idRaw = el.roomId.value.trim();
    const isEdit = idRaw.length > 0;

    const number = el.roomNumber.value.trim();
    const type = el.roomType.value;
    const capacity = clampInt(Number(el.roomCapacity.value), 1, 12);
    const price = clampMoney(Number(el.roomPrice.value));
    const status = el.roomStatus.value;

    if (!number) {
      toast('Room number is required.', 'danger');
      return;
    }

    const duplicate = state.rooms.some((r) => r.number === number && (!isEdit || r.id !== Number(idRaw)));
    if (duplicate) {
      toast('Room number must be unique.', 'danger');
      return;
    }

    if (isEdit) {
      const id = Number(idRaw);
      const blocked = isRoomOccupiedNow(id) && status !== 'occupied';
      if (blocked) {
        toast('Room has an active checked-in booking. Use check-out first.', 'danger');
        return;
      }
      updateRoom(id, { number, type, capacity, price, status });
      toast('Room updated.');
    } else {
      addRoom({ number, type, capacity, price, status });
      toast('Room added.');
    }

    el.dlgRoom.close('ok');
    refreshAll();
  }

  // -----------------
  // Guests
  // -----------------

  function addGuest(guest) {
    const id = ++state.counters.guest;
    const next = {
      id,
      name: String(guest.name).trim(),
      phone: String(guest.phone || '').trim(),
      email: String(guest.email || '').trim(),
    };
    state.guests.push(next);
    return next;
  }

  function updateGuest(id, patch) {
    const guest = state.guests.find((g) => g.id === id);
    if (!guest) return false;
    Object.assign(guest, patch);
    return true;
  }

  function deleteGuest(id) {
    const hasBookings = state.bookings.some((b) => b.guestId === id && b.status !== 'cancelled');
    if (hasBookings) return { ok: false, error: 'Cannot delete: guest has bookings.' };
    state.guests = state.guests.filter((g) => g.id !== id);
    return { ok: true };
  }

  function renderGuests() {
    const q = el.guestSearch.value.trim().toLowerCase();
    const guests = [...state.guests]
      .filter((g) => {
        if (!q) return true;
        return (
          g.name.toLowerCase().includes(q) ||
          (g.phone || '').toLowerCase().includes(q) ||
          (g.email || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    el.guestsTbody.innerHTML = guests
      .map((g) => {
        return `
          <tr>
            <td><strong>${escapeHtml(g.name)}</strong></td>
            <td>${escapeHtml(g.phone || '—')}</td>
            <td>${escapeHtml(g.email || '—')}</td>
            <td>
              <div class="actions">
                <button class="btn btn--ghost" type="button" data-action="edit-guest" data-id="${g.id}">Edit</button>
                <button class="btn btn--danger" type="button" data-action="delete-guest" data-id="${g.id}">Delete</button>
              </div>
            </td>
          </tr>
        `.trim();
      })
      .join('');

    el.guestsTbody.querySelectorAll('[data-action="edit-guest"]').forEach((b) => {
      b.addEventListener('click', () => openGuestDialog(Number(b.dataset.id)));
    });
    el.guestsTbody.querySelectorAll('[data-action="delete-guest"]').forEach((b) => {
      b.addEventListener('click', () => {
        const id = Number(b.dataset.id);
        if (!confirm('Delete this guest?')) return;
        const result = deleteGuest(id);
        if (!result.ok) {
          toast(result.error, 'danger');
          return;
        }
        toast('Guest deleted.');
        refreshAll();
      });
    });
  }

  function openGuestDialog(guestId = null) {
    const isEdit = guestId != null;
    el.guestDlgTitle.textContent = isEdit ? 'Edit Guest' : 'Add Guest';

    if (isEdit) {
      const guest = state.guests.find((g) => g.id === guestId);
      if (!guest) return;
      el.guestId.value = String(guest.id);
      el.guestName.value = guest.name;
      el.guestPhone.value = guest.phone || '';
      el.guestEmail.value = guest.email || '';
    } else {
      el.guestId.value = '';
      el.guestName.value = '';
      el.guestPhone.value = '';
      el.guestEmail.value = '';
    }

    safeShowModal(el.dlgGuest);
    el.guestName.focus();
  }

  function upsertGuestFromForm() {
    const idRaw = el.guestId.value.trim();
    const isEdit = idRaw.length > 0;

    const name = el.guestName.value.trim();
    const phone = el.guestPhone.value.trim();
    const email = el.guestEmail.value.trim();

    if (!name) {
      toast('Guest name is required.', 'danger');
      return;
    }

    if (isEdit) {
      updateGuest(Number(idRaw), { name, phone, email });
      toast('Guest updated.');
    } else {
      addGuest({ name, phone, email });
      toast('Guest added.');
    }

    el.dlgGuest.close('ok');
    refreshAll();
  }

  // -----------------
  // Bookings
  // -----------------

  function addBooking(booking) {
    const id = ++state.counters.booking;
    const next = {
      id,
      guestId: Number(booking.guestId),
      roomId: Number(booking.roomId),
      checkIn: String(booking.checkIn),
      checkOut: String(booking.checkOut),
      status: String(booking.status || 'reserved'),
      createdAt: new Date().toISOString(),
    };
    state.bookings.push(next);
    return next;
  }

  function updateBooking(id, patch) {
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return false;
    Object.assign(b, patch);
    return true;
  }

  function deleteBooking(id) {
    state.bookings = state.bookings.filter((b) => b.id !== id);
  }

  function fillBookingSelects() {
    const guestOptions = state.guests
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`)
      .join('');

    const roomOptions = state.rooms
      .slice()
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
      .map((r) => {
        const suffix = r.status === 'maintenance' ? ' (maintenance)' : '';
        return `<option value="${r.id}">${escapeHtml(r.number)} — ${escapeHtml(capitalize(r.type))}${suffix}</option>`;
      })
      .join('');

    el.qbGuest.innerHTML = guestOptions || `<option value="" disabled selected>No guests yet</option>`;
    el.bookingGuest.innerHTML = guestOptions || `<option value="" disabled selected>No guests yet</option>`;

    el.qbRoom.innerHTML = roomOptions || `<option value="" disabled selected>No rooms yet</option>`;
    el.bookingRoom.innerHTML = roomOptions || `<option value="" disabled selected>No rooms yet</option>`;
  }

  function renderBookings() {
    const filter = el.bookingFilterStatus.value;
    const bookings = state.bookings
      .slice()
      .filter((b) => !filter || b.status === filter)
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn));

    el.bookingsTbody.innerHTML = bookings
      .map((b) => {
        const guest = state.guests.find((g) => g.id === b.guestId);
        const room = state.rooms.find((r) => r.id === b.roomId);

        const dates = `${escapeHtml(b.checkIn)} → ${escapeHtml(b.checkOut)}`;
        const total = bookingTotal(b);
        return `
          <tr>
            <td><strong>${escapeHtml(guest?.name || 'Unknown')}</strong></td>
            <td>${escapeHtml(room?.number || '—')}</td>
            <td>${dates}</td>
            <td>${pillForBookingStatus(b.status)}</td>
            <td>${escapeHtml(money(total))}</td>
            <td>
              <div class="actions">
                <button class="btn btn--ghost" type="button" data-action="edit-booking" data-id="${b.id}">Edit</button>
                ${bookingActionButtons(b)}
              </div>
            </td>
          </tr>
        `.trim();
      })
      .join('');

    el.bookingsTbody.querySelectorAll('[data-action="edit-booking"]').forEach((btn) => {
      btn.addEventListener('click', () => openBookingDialog(Number(btn.dataset.id)));
    });

    el.bookingsTbody.querySelectorAll('[data-action="checkin"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const b = state.bookings.find((x) => x.id === id);
        if (!b) return;
        const result = createOrUpdateBooking({ ...b, status: 'checked-in' });
        if (!result.ok) return toast(result.error, 'danger');
        toast('Checked in.');
        refreshAll();
      });
    });

    el.bookingsTbody.querySelectorAll('[data-action="checkout"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const b = state.bookings.find((x) => x.id === id);
        if (!b) return;
        const result = createOrUpdateBooking({ ...b, status: 'checked-out' });
        if (!result.ok) return toast(result.error, 'danger');
        toast('Checked out.');
        refreshAll();
      });
    });

    el.bookingsTbody.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const b = state.bookings.find((x) => x.id === id);
        if (!b) return;
        if (!confirm('Cancel this booking?')) return;
        const result = createOrUpdateBooking({ ...b, status: 'cancelled' });
        if (!result.ok) return toast(result.error, 'danger');
        toast('Cancelled.');
        refreshAll();
      });
    });

    el.bookingsTbody.querySelectorAll('[data-action="delete-booking"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        if (!confirm('Delete this booking record?')) return;
        deleteBooking(id);
        toast('Booking deleted.');
        refreshAll();
      });
    });
  }

  function bookingActionButtons(b) {
    const buttons = [];
    if (b.status === 'reserved') {
      buttons.push(`<button class="btn" type="button" data-action="checkin" data-id="${b.id}">Check-in</button>`);
      buttons.push(`<button class="btn btn--danger" type="button" data-action="cancel" data-id="${b.id}">Cancel</button>`);
    }
    if (b.status === 'checked-in') {
      buttons.push(`<button class="btn" type="button" data-action="checkout" data-id="${b.id}">Check-out</button>`);
    }
    if (b.status === 'checked-out' || b.status === 'cancelled') {
      buttons.push(`<button class="btn btn--danger" type="button" data-action="delete-booking" data-id="${b.id}">Delete</button>`);
    }
    return buttons.join('');
  }

  function openBookingDialog(bookingId = null) {
    const isEdit = bookingId != null;
    el.bookingDlgTitle.textContent = isEdit ? 'Edit Booking' : 'New Booking';

    fillBookingSelects();

    if (isEdit) {
      const b = state.bookings.find((x) => x.id === bookingId);
      if (!b) return;
      el.bookingId.value = String(b.id);
      el.bookingGuest.value = String(b.guestId);
      el.bookingRoom.value = String(b.roomId);
      el.bookingIn.value = b.checkIn;
      el.bookingOut.value = b.checkOut;
      el.bookingStatus.value = b.status;
    } else {
      el.bookingId.value = '';
      if (state.guests[0]) el.bookingGuest.value = String(state.guests[0].id);
      if (state.rooms[0]) el.bookingRoom.value = String(state.rooms[0].id);
      setDefaultFormDates(el.bookingIn, el.bookingOut);
      el.bookingStatus.value = 'reserved';
    }

    updateBookingCostHint();
    safeShowModal(el.dlgBooking);
  }

  function upsertBookingFromForm() {
    const idRaw = el.bookingId.value.trim();
    const isEdit = idRaw.length > 0;

    const id = isEdit ? Number(idRaw) : null;
    const guestId = Number(el.bookingGuest.value);
    const roomId = Number(el.bookingRoom.value);
    const checkIn = el.bookingIn.value;
    const checkOut = el.bookingOut.value;
    const status = el.bookingStatus.value;

    const result = createOrUpdateBooking({ id, guestId, roomId, checkIn, checkOut, status });
    if (!result.ok) {
      toast(result.error, 'danger');
      return;
    }

    el.dlgBooking.close('ok');
    toast(isEdit ? 'Booking updated.' : 'Booking created.');
    refreshAll();
    setView('bookings');
  }

  function createOrUpdateBooking(input) {
    // Validate
    if (!state.guests.some((g) => g.id === input.guestId)) {
      return { ok: false, error: 'Select a valid guest.' };
    }
    const room = state.rooms.find((r) => r.id === input.roomId);
    if (!room) return { ok: false, error: 'Select a valid room.' };
    if (room.status === 'maintenance') return { ok: false, error: 'Room is in maintenance.' };

    const inD = parseISODate(input.checkIn);
    const outD = parseISODate(input.checkOut);
    if (!inD || !outD) return { ok: false, error: 'Choose valid dates.' };
    if (outD <= inD) return { ok: false, error: 'Check-out must be after check-in.' };

    const status = input.status;
    const blocksAvailability = status === 'reserved' || status === 'checked-in';

    // Prevent overlap (ignore cancelled/checked-out; ignore self while editing)
    if (blocksAvailability) {
      const overlaps = state.bookings.some((b) => {
        if (b.roomId !== input.roomId) return false;
        if (b.status !== 'reserved' && b.status !== 'checked-in') return false;
        if (input.id != null && b.id === input.id) return false;
        return rangesOverlap(input.checkIn, input.checkOut, b.checkIn, b.checkOut);
      });

      if (overlaps) return { ok: false, error: 'Booking overlaps an existing booking for this room.' };
    }

    // Persist
    if (input.id == null) {
      addBooking({
        guestId: input.guestId,
        roomId: input.roomId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        status: input.status,
      });
    } else {
      updateBooking(input.id, {
        guestId: input.guestId,
        roomId: input.roomId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        status: input.status,
      });
    }

    normalizeDerivedRoomStatuses();
    saveState(state);
    return { ok: true };
  }

  function bookingTotal(b) {
    const room = state.rooms.find((r) => r.id === b.roomId);
    if (!room) return 0;
    const nights = diffNights(b.checkIn, b.checkOut);
    return roundMoney(nights * Number(room.price || 0));
  }

  function updateBookingCostHint() {
    const room = state.rooms.find((r) => r.id === Number(el.bookingRoom.value));
    const inV = el.bookingIn.value;
    const outV = el.bookingOut.value;

    if (!room || !inV || !outV) {
      el.bookingCostHint.textContent = 'Total: —';
      return;
    }

    const nights = diffNights(inV, outV);
    if (!Number.isFinite(nights) || nights <= 0) {
      el.bookingCostHint.textContent = 'Total: —';
      return;
    }

    el.bookingCostHint.textContent = `Total: ${money(roundMoney(nights * Number(room.price || 0)))} (${nights} night${nights === 1 ? '' : 's'})`;
  }

  function normalizeDerivedRoomStatuses() {
    // If there is any checked-in booking "today" for a room => occupied
    // else keep the user-defined status unless it was occupied due to derived status.
    const occupiedRoomIds = new Set(
      state.bookings
        .filter((b) => b.status === 'checked-in')
        .map((b) => b.roomId)
    );

    for (const room of state.rooms) {
      if (occupiedRoomIds.has(room.id)) {
        room.status = 'occupied';
      } else {
        // if room was set to occupied but no active check-in exists, flip to available
        if (room.status === 'occupied') room.status = 'available';
      }
    }
  }

  function isRoomOccupiedNow(roomId) {
    return state.bookings.some((b) => b.roomId === roomId && b.status === 'checked-in');
  }

  // -----------------
  // Dashboard
  // -----------------

  function renderDashboard() {
    const totalRooms = state.rooms.length;
    const available = state.rooms.filter((r) => r.status === 'available').length;
    const occupied = state.rooms.filter((r) => r.status === 'occupied').length;

    const today = isoDate(new Date());

    const activeBookings = state.bookings.filter((b) => b.status === 'reserved' || b.status === 'checked-in');
    const upcomingCheckins = state.bookings.filter((b) => b.status === 'reserved' && b.checkIn === today).length;

    const revenue = activeBookings.reduce((sum, b) => sum + bookingTotal(b), 0);

    const typeCounts = countBy(state.rooms, (r) => r.type);
    const typesMeta = Object.keys(typeCounts)
      .sort()
      .map((k) => `${capitalize(k)}: ${typeCounts[k]}`)
      .join(' • ');

    el.kpiTotalRooms.textContent = String(totalRooms);
    el.kpiRoomTypes.textContent = typesMeta || '—';

    el.kpiAvailable.textContent = String(available);
    el.kpiOccupied.textContent = `Occupied: ${occupied}`;

    el.kpiActiveBookings.textContent = String(activeBookings.length);
    el.kpiUpcoming.textContent = `Upcoming check-ins: ${upcomingCheckins}`;

    el.kpiGuests.textContent = String(state.guests.length);
    el.kpiRevenue.textContent = `Est. Revenue (active): ${money(revenue)}`;

    renderToday(today);
    renderAlerts();
  }

  function renderToday(todayIso) {
    const checkins = state.bookings
      .filter((b) => (b.status === 'reserved' || b.status === 'checked-in') && b.checkIn === todayIso)
      .map((b) => ({ kind: 'Check-in', booking: b }));

    const checkouts = state.bookings
      .filter((b) => (b.status === 'reserved' || b.status === 'checked-in') && b.checkOut === todayIso)
      .map((b) => ({ kind: 'Check-out', booking: b }));

    const items = [...checkins, ...checkouts].sort((a, b) => a.kind.localeCompare(b.kind));

    if (items.length === 0) {
      el.todayEmpty.hidden = false;
      el.todayList.hidden = true;
      el.todayList.innerHTML = '';
      return;
    }

    el.todayEmpty.hidden = true;
    el.todayList.hidden = false;

    el.todayList.innerHTML = items
      .map((it) => {
        const b = it.booking;
        const g = state.guests.find((x) => x.id === b.guestId);
        const r = state.rooms.find((x) => x.id === b.roomId);
        return `
          <div class="listItem">
            <div class="listItem__title">${escapeHtml(it.kind)}: ${escapeHtml(g?.name || 'Unknown')}</div>
            <div class="listItem__meta">Room ${escapeHtml(r?.number || '—')} • ${escapeHtml(b.checkIn)} → ${escapeHtml(b.checkOut)} • ${stripHtml(pillTextForBookingStatus(b.status))}</div>
          </div>
        `.trim();
      })
      .join('');
  }

  function renderAlerts() {
    const alerts = [];

    // missing entities referenced
    for (const b of state.bookings) {
      if (!state.rooms.some((r) => r.id === b.roomId)) alerts.push(`Booking #${b.id} references missing room.`);
      if (!state.guests.some((g) => g.id === b.guestId)) alerts.push(`Booking #${b.id} references missing guest.`);
    }

    // overlapping bookings per room (for reserved/checked-in)
    const relevant = state.bookings.filter((b) => b.status === 'reserved' || b.status === 'checked-in');
    const byRoom = groupBy(relevant, (b) => String(b.roomId));
    for (const roomId of Object.keys(byRoom)) {
      const list = byRoom[roomId].slice().sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      for (let i = 0; i < list.length - 1; i++) {
        const a = list[i];
        const c = list[i + 1];
        if (rangesOverlap(a.checkIn, a.checkOut, c.checkIn, c.checkOut)) {
          const room = state.rooms.find((r) => r.id === Number(roomId));
          alerts.push(`Overlap detected for room ${room?.number || roomId} (bookings #${a.id} and #${c.id}).`);
        }
      }
    }

    if (alerts.length === 0) {
      el.alertsEmpty.hidden = false;
      el.alertsList.hidden = true;
      el.alertsList.innerHTML = '';
      return;
    }

    el.alertsEmpty.hidden = true;
    el.alertsList.hidden = false;
    el.alertsList.innerHTML = alerts
      .slice(0, 8)
      .map((msg) => {
        return `
          <div class="listItem">
            <div class="listItem__title">Attention</div>
            <div class="listItem__meta">${escapeHtml(msg)}</div>
          </div>
        `.trim();
      })
      .join('');
  }

  // -----------------
  // Helpers
  // -----------------

  function setDefaultQuickDates() {
    if (!el.qbIn.value || !el.qbOut.value) setDefaultFormDates(el.qbIn, el.qbOut);
  }

  function setDefaultFormDates(inEl, outEl) {
    const today = new Date();
    inEl.value = isoDate(today);
    outEl.value = isoDate(addDays(today, 1));
  }

  function diffNights(checkInIso, checkOutIso) {
    const inD = parseISODate(checkInIso);
    const outD = parseISODate(checkOutIso);
    if (!inD || !outD) return NaN;
    const ms = outD.getTime() - inD.getTime();
    return Math.round(ms / (24 * 60 * 60 * 1000));
  }

  // Half-open intervals: [start, end)
  function rangesOverlap(startA, endA, startB, endB) {
    const a0 = parseISODate(startA);
    const a1 = parseISODate(endA);
    const b0 = parseISODate(startB);
    const b1 = parseISODate(endB);
    if (!a0 || !a1 || !b0 || !b1) return false;
    return a0 < b1 && b0 < a1;
  }

  function parseISODate(iso) {
    if (!iso || typeof iso !== 'string') return null;
    const m = /^\d{4}-\d{2}-\d{2}$/.test(iso);
    if (!m) return null;
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function isoDate(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function clampInt(val, min, max) {
    const n = Number.isFinite(val) ? Math.trunc(val) : min;
    return Math.max(min, Math.min(max, n));
  }

  function clampMoney(val) {
    const n = Number.isFinite(val) ? Number(val) : 0;
    return roundMoney(Math.max(0, n));
  }

  function roundMoney(val) {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
  }

  function money(val) {
    const n = Number(val || 0);
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function stripHtml(html) {
    return String(html).replace(/<[^>]*>/g, '');
  }

  function capitalize(s) {
    const v = String(s || '');
    return v ? v[0].toUpperCase() + v.slice(1) : v;
  }

  function pillForRoomStatus(status) {
    if (status === 'available') return `<span class="pill pill--ok">Available</span>`;
    if (status === 'occupied') return `<span class="pill pill--warn">Occupied</span>`;
    return `<span class="pill pill--danger">Maintenance</span>`;
  }

  function pillTextForBookingStatus(status) {
    if (status === 'reserved') return 'Reserved';
    if (status === 'checked-in') return 'Checked-in';
    if (status === 'checked-out') return 'Checked-out';
    return 'Cancelled';
  }

  function pillForBookingStatus(status) {
    if (status === 'reserved') return `<span class="pill pill--ok">Reserved</span>`;
    if (status === 'checked-in') return `<span class="pill pill--warn">Checked-in</span>`;
    if (status === 'checked-out') return `<span class="pill">Checked-out</span>`;
    return `<span class="pill pill--danger">Cancelled</span>`;
  }

  function toast(message, kind = 'default') {
    // kind is currently cosmetic only; keep a single toast UI.
    el.toastMsg.textContent = String(message);
    el.toast.hidden = false;
    if (kind === 'danger') {
      el.toast.style.borderColor = 'rgba(255,77,109,.35)';
    } else {
      el.toast.style.borderColor = 'rgba(255,255,255,.12)';
    }

    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.toast.hidden = true;
    }, 2600);
  }

  function safeShowModal(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
      return;
    }
    // fallback for older browsers
    dialog.setAttribute('open', '');
  }

  function groupBy(list, keyFn) {
    /** @type {Record<string, any[]>} */
    const out = {};
    for (const item of list) {
      const k = String(keyFn(item));
      (out[k] ||= []).push(item);
    }
    return out;
  }

  function countBy(list, keyFn) {
    /** @type {Record<string, number>} */
    const out = {};
    for (const item of list) {
      const k = String(keyFn(item));
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }

  // CSS.escape fallback
  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }
})();
