
"use strict";

/*
 * SKYBOOK — Flight Reservation Demonstration
 * All flight records are sample project data.
 * No real airline booking or payment is performed.
 */


const initialFlights = [
    {
        flightNo: 105,
        airline: "Air India",
        source: "Mumbai",
        destination: "Delhi",
        fare: 5200,
        seats: 12,
        capacity: 12,
        stops: 0
    },
    {
        flightNo: 102,
        airline: "IndiGo",
        source: "Pune",
        destination: "Bengaluru",
        fare: 3400,
        seats: 18,
        capacity: 18,
        stops: 0
    },
    {
        flightNo: 106,
        airline: "Akasa Air",
        source: "Delhi",
        destination: "Mumbai",
        fare: 4100,
        seats: 8,
        capacity: 8,
        stops: 0
    },
    {
        flightNo: 101,
        airline: "IndiGo",
        source: "Mumbai",
        destination: "Goa",
        fare: 2800,
        seats: 20,
        capacity: 20,
        stops: 0
    },
    {
        flightNo: 104,
        airline: "Air India",
        source: "Bengaluru",
        destination: "Hyderabad",
        fare: 3100,
        seats: 15,
        capacity: 15,
        stops: 0
    },
    {
        flightNo: 103,
        airline: "Akasa Air",
        source: "Pune",
        destination: "Delhi",
        fare: 4600,
        seats: 10,
        capacity: 10,
        stops: 0
    }
];


const destinationImages = {
    Mumbai: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=900&q=80",
    Delhi: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=900&q=80",
    Bengaluru: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=900&q=80",
    Goa: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80",
    Hyderabad: "https://images.unsplash.com/photo-1572445271230-a78b5944a659?auto=format&fit=crop&w=900&q=80",
    Pune: "https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=900&q=80"
};

let flights = initialFlights.map(flight => ({ ...flight }));
let activeRoute = null;
let selectedFlightNo = null;
let currentTripType = "one-way";
let toastTimer = null;
let previousFocus = null;
let lastBookingReference = null;

const $ = selector => document.querySelector(selector);

const header = $("#site-header");
const menuToggle = $("#menu-toggle");
const mainNav = $("#main-nav");

const flightList = $("#flight-list");
const searchForm = $("#flight-search-form");
const sourceSelect = $("#source");
const destinationSelect = $("#destination");
const departureDate = $("#departure-date");
const returnDate = $("#return-date");
const returnField = $("#return-field");
const travellersSelect = $("#travellers");
const travelClassSelect = $("#travel-class");
const nonstopCheckbox = $("#nonstop-only");
const sortSelect = $("#sort-by");
const resultsSummary = $("#results-summary");
const resultsCount = $("#results-count");
const swapButton = $("#swap-cities");
const resetButton = $("#reset-flights");
const searchError = $("#search-error");

const bookingModal = $("#booking-modal");
const modalClose = $("#modal-close");
const cancelBooking = $("#cancel-booking");
const confirmBooking = $("#confirm-booking");
const finishBooking = $("#finish-booking");
const modalError = $("#modal-error");

const tripTabs = document.querySelectorAll("[data-trip]");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function formatFare(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
    }).format(amount);
}

function getAirlineSymbol(airline) {
    if (airline === "Air India") return "A";
    if (airline === "IndiGo") return "i";
    return "✦";
}

function getSeatLabel(seats) {
    if (seats === 0) return "Sold out";
    if (seats <= 5) return "Few seats left";
    return "Seats available";
}

function getSeatBadgeClass(seats) {
    if (seats === 0) return "sold-out";
    if (seats <= 5) return "few-seats";
    return "";
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showToast(message, type = "success") {
    const region = $("#toast-region");
    if (!region) return;

    if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
    }

    region.replaceChildren();

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    region.appendChild(toast);

    toastTimer = setTimeout(() => {
        toast.remove();
        toastTimer = null;
    }, 3800);
}

function updateHeader() {
    if (!header) return;

    header.classList.toggle("is-scrolled", window.scrollY > 24);
}

function closeMobileMenu() {
    if (!menuToggle || !mainNav) return;

    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
}

function setupNavigation() {
    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();

    menuToggle?.addEventListener("click", () => {
        const isOpen = mainNav.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation" : "Open navigation"
        );
    });

    mainNav?.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", closeMobileMenu);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMobileMenu();

            if (!bookingModal.hidden) {
                closeBookingModal();
            }
        }
    });
}

function setupDateInputs() {
    if (!departureDate || !returnDate) return;

    // Use the browser's local date, avoiding UTC date shifts.
    const now = new Date();
    const localDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");

    departureDate.min = localDate;
    returnDate.min = localDate;

    departureDate.addEventListener("change", () => {
        returnDate.min = departureDate.value || localDate;

        if (returnDate.value && departureDate.value &&
            returnDate.value < departureDate.value) {
            returnDate.value = departureDate.value;
        }
    });
}

function setTripType(type) {
    currentTripType = type;

    tripTabs.forEach(tab => {
        const active = tab.dataset.trip === type;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", String(active));
    });

    returnField.hidden = type !== "round-trip";
    returnDate.required = type === "round-trip";

    if (type === "one-way") {
        returnDate.value = "";
    }
}

function getVisibleFlights() {
    let visibleFlights = [...flights];

    if (activeRoute) {
        visibleFlights = visibleFlights.filter(flight =>
            flight.source === activeRoute.source &&
            flight.destination === activeRoute.destination
        );
    }

    // Every record in this small demonstration collection is treated
    // as a sample direct-route record; this is not live airline data.
    if (nonstopCheckbox.checked) {
        visibleFlights = visibleFlights.filter(flight => flight.seats >= 0);
    }

    const sortMode = sortSelect.value;

    if (sortMode === "fare-asc") {
        visibleFlights.sort((a, b) => a.fare - b.fare);
    } else if (sortMode === "fare-desc") {
        visibleFlights.sort((a, b) => b.fare - a.fare);
    } else if (sortMode === "seats-desc") {
        visibleFlights.sort((a, b) => b.seats - a.seats);
    } else if (sortMode === "flight-asc") {
        visibleFlights.sort((a, b) => a.flightNo - b.flightNo);
    }

    return visibleFlights;
}

function createFlightCard(flight, index) {
    const card = document.createElement("article");
    card.className = "flight-card";
    card.style.animationDelay = reducedMotion.matches ? "0ms" : `${index * 65}ms`;

    const image = document.createElement("div");
    image.className = "flight-image";

    const imageURL = destinationImages[flight.destination];
    if (imageURL) {
        image.style.backgroundImage =
            `linear-gradient(0deg, rgba(4,29,53,.16), rgba(4,29,53,.04)), url("${imageURL}")`;
    }

    const imageLabel = document.createElement("div");
    imageLabel.className = "destination-image-label";

    const destinationEyebrow = document.createElement("span");
    destinationEyebrow.textContent = "YOUR DESTINATION";

    const destinationTitle = document.createElement("strong");
    destinationTitle.textContent = flight.destination;

    imageLabel.append(destinationEyebrow, destinationTitle);
    image.appendChild(imageLabel);

    const content = document.createElement("div");
    content.className = "flight-card-content";

    const top = document.createElement("div");
    top.className = "flight-card-top";

    const airlineInfo = document.createElement("div");
    airlineInfo.className = "airline-info";

    const mark = document.createElement("span");
    mark.className = "airline-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = getAirlineSymbol(flight.airline);

    const airlineText = document.createElement("div");
    airlineText.className = "airline-text";

    const airlineName = document.createElement("strong");
    airlineName.className = "airline-name";
    airlineName.textContent = flight.airline;

    const flightNumber = document.createElement("span");
    flightNumber.className = "flight-number";
    flightNumber.textContent = `Sample flight SK ${flight.flightNo}`;

    airlineText.append(airlineName, flightNumber);
    airlineInfo.append(mark, airlineText);

    const badge = document.createElement("span");
    badge.className = `flight-badge ${getSeatBadgeClass(flight.seats)}`;
    badge.textContent = getSeatLabel(flight.seats);

    top.append(airlineInfo, badge);

    const route = document.createElement("div");
    route.className = "route-line";

    const origin = document.createElement("div");
    origin.className = "route-city";

    const originCode = document.createElement("strong");
    originCode.textContent = flight.source.slice(0, 3).toUpperCase();

    const originName = document.createElement("small");
    originName.textContent = flight.source;

    origin.append(originCode, originName);

    const connector = document.createElement("div");
    connector.className = "route-connector";
    connector.setAttribute("aria-label", "Sample route");

    const plane = document.createElement("span");
    plane.setAttribute("aria-hidden", "true");
    plane.textContent = "✈";
    connector.appendChild(plane);

    const destination = document.createElement("div");
    destination.className = "route-city";

    const destinationCode = document.createElement("strong");
    destinationCode.textContent = flight.destination.slice(0, 3).toUpperCase();

    const destinationName = document.createElement("small");
    destinationName.textContent = flight.destination;

    destination.append(destinationCode, destinationName);
    route.append(origin, connector, destination);

    const meta = document.createElement("div");
    meta.className = "flight-meta";

    const capacity = document.createElement("span");
    capacity.textContent = `Capacity: ${flight.capacity}`;

    const available = document.createElement("span");
    available.textContent = `Available: ${flight.seats}`;

    meta.append(capacity, available);

    const bottom = document.createElement("div");
    bottom.className = "flight-card-bottom";

    const fareBox = document.createElement("div");

    const fareLabel = document.createElement("span");
    fareLabel.className = "fare-label";
    fareLabel.textContent = "SAMPLE FARE / TRAVELLER";

    const fareAmount = document.createElement("strong");
    fareAmount.className = "fare-amount";
    fareAmount.textContent = formatFare(flight.fare);

    const fareNote = document.createElement("span");
    fareNote.className = "fare-note";
    fareNote.textContent = "Demonstration price";

    fareBox.append(fareLabel, fareAmount, fareNote);

    const actionBox = document.createElement("div");
    actionBox.className = "flight-action";

    const seatCount = document.createElement("div");
    seatCount.className = "seat-count";
    seatCount.textContent = `${flight.seats} of ${flight.capacity} seats available`;

    const detailsButton = document.createElement("button");
    detailsButton.className = "details-button";
    detailsButton.type = "button";
    detailsButton.textContent = "View details";
    detailsButton.setAttribute("aria-expanded", "false");

    const bookButton = document.createElement("button");
    bookButton.className = "book-button";
    bookButton.type = "button";
    bookButton.textContent = flight.seats === 0 ? "Sold out" : "Book demo";
    bookButton.disabled = flight.seats === 0;
    bookButton.addEventListener("click", () => openBookingModal(flight.flightNo));

    const details = document.createElement("div");
    details.className = "flight-details";
    details.hidden = true;

    const detailRoute = document.createElement("p");
    detailRoute.textContent = `Route: ${flight.source} to ${flight.destination}`;

    const detailFlight = document.createElement("p");
    detailFlight.textContent = `Sample flight number: SK ${flight.flightNo}`;

    const detailSeats = document.createElement("p");
    detailSeats.textContent = `Remaining seats: ${flight.seats} / ${flight.capacity}`;

    const detailFare = document.createElement("p");
    detailFare.textContent = `Sample fare per traveller: ${formatFare(flight.fare)}`;

    details.append(detailRoute, detailFlight, detailSeats, detailFare);

    detailsButton.addEventListener("click", () => {
        const willOpen = details.hidden;
        details.hidden = !willOpen;
        detailsButton.setAttribute("aria-expanded", String(willOpen));
        detailsButton.textContent = willOpen ? "Hide details" : "View details";
    });

    actionBox.append(seatCount, detailsButton, bookButton);
    bottom.append(fareBox, actionBox);
    content.append(top, route, meta, bottom);
    card.append(image, content, details);

    return card;
}

function renderEmptyState() {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("div");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "⌕";
    icon.style.fontSize = "38px";
    icon.style.color = "#2697df";

    const heading = document.createElement("h3");
    heading.textContent = "No matching sample flights";

    const message = document.createElement("p");
    message.textContent =
        "Try another route or reset your filters to see the full collection.";

    const reset = document.createElement("button");
    reset.className = "button button-primary";
    reset.type = "button";
    reset.textContent = "Show all sample flights";
    reset.addEventListener("click", resetFlightFilters);

    empty.append(icon, heading, message, reset);
    flightList.appendChild(empty);
}

function renderFlights() {
    const visibleFlights = getVisibleFlights();
    flightList.replaceChildren();

    if (activeRoute) {
        resultsSummary.textContent =
            `${visibleFlights.length} sample flight(s) for ${activeRoute.source} to ${activeRoute.destination}.`;
    } else {
        resultsSummary.textContent =
            `Browse ${visibleFlights.length} sample flight(s) from the demonstration collection.`;
    }

    resultsCount.innerHTML =
        `${String(visibleFlights.length).padStart(2, "0")} <span>sample flight${visibleFlights.length === 1 ? "" : "s"}</span>`;

    if (visibleFlights.length === 0) {
        renderEmptyState();
        return;
    }

    visibleFlights.forEach((flight, index) => {
        flightList.appendChild(createFlightCard(flight, index));
    });
}

function setSearchError(message) {
    searchError.textContent = message;
    searchError.hidden = !message;
}

function searchFlights(event) {
    event.preventDefault();
    setSearchError("");

    const source = sourceSelect.value;
    const destination = destinationSelect.value;

    if (!source || !destination) {
        setSearchError("Please choose both your departure and destination.");
        showToast("Choose both cities before searching.", "error");
        return;
    }

    if (source === destination) {
        setSearchError("Departure and destination must be different.");
        showToast("Choose two different cities.", "error");
        return;
    }

    if (!departureDate.value) {
        setSearchError("Please choose a departure date.");
        departureDate.focus();
        return;
    }

    if (departureDate.value < departureDate.min) {
    setSearchError("Departure date cannot be in the past.");
    departureDate.focus();
    return;
}

    if (currentTripType === "round-trip") {
        if (!returnDate.value) {
            setSearchError("Please choose your return date.");
            returnDate.focus();
            return;
        }

        if (returnDate.value < departureDate.value) {
            setSearchError("The return date cannot be before the departure date.");
            returnDate.focus();
            return;
        }
    }

    activeRoute = { source, destination };
    sortSelect.value = "default";
    renderFlights();

    const flightsSection = $("#flights");
    flightsSection.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "start"
    });
}

function swapCities() {
    const previousSource = sourceSelect.value;
    sourceSelect.value = destinationSelect.value;
    destinationSelect.value = previousSource;

    swapButton.classList.remove("swap-flash");
    void swapButton.offsetWidth;
    swapButton.classList.add("swap-flash");

    setTimeout(() => swapButton.classList.remove("swap-flash"), 350);
}

function resetFlightFilters() {
    activeRoute = null;
    sourceSelect.value = "";
    destinationSelect.value = "";
    nonstopCheckbox.checked = false;
    sortSelect.value = "default";
    setSearchError("");
    renderFlights();
}

function getRequestedSeatCount() {
    const count = Number(travellersSelect.value);

    if (!Number.isInteger(count) || count < 1 || count > 6) {
        return null;
    }

    return count;
}

/* BOOKING MODAL */

function openBookingModal(flightNo) {
    const flight = flights.find(item => item.flightNo === flightNo);

    if (!flight) {
        showToast("Sample flight not found.", "error");
        return;
    }

    if (flight.seats === 0) {
        showToast("This sample flight is sold out.", "error");
        return;
    }

    selectedFlightNo = flightNo;
    previousFocus = document.activeElement;

    $("#ticket-confirmation").hidden = true;
    $("#modal-actions").hidden = false;
    $("#booking-flight-details").hidden = false;
    $("#modal-error").hidden = true;
    $("#modal-error").textContent = "";

    const details = $("#booking-flight-details");
    details.replaceChildren();

    const airline = document.createElement("div");
    airline.className = "booking-airline";

    const mark = document.createElement("span");
    mark.className = "airline-mark";
    mark.textContent = getAirlineSymbol(flight.airline);

    const airlineLabel = document.createElement("span");
    airlineLabel.textContent = `${flight.airline} · Sample flight SK ${flight.flightNo}`;

    airline.append(mark, airlineLabel);

    const route = document.createElement("div");
    route.className = "booking-route";

    const from = document.createElement("div");
    const fromCode = document.createElement("strong");
    fromCode.textContent = flight.source.slice(0, 3).toUpperCase();
    const fromName = document.createElement("span");
    fromName.textContent = flight.source;
    from.append(fromCode, fromName);

    const plane = document.createElement("div");
    plane.className = "booking-plane";
    plane.setAttribute("aria-hidden", "true");
    plane.textContent = "✈";

    const to = document.createElement("div");
    const toCode = document.createElement("strong");
    toCode.textContent = flight.destination.slice(0, 3).toUpperCase();
    const toName = document.createElement("span");
    toName.textContent = flight.destination;
    to.append(toCode, toName);

    route.append(from, plane, to);
    details.append(airline, route);

    updateBookingSummary();

    bookingModal.hidden = false;
    document.body.classList.add("modal-open");
    modalClose.focus();
}

function updateBookingSummary() {
    const flight = flights.find(item => item.flightNo === selectedFlightNo);
    if (!flight) return;

    const travellers = getRequestedSeatCount();
    const validCount = travellers !== null;

    $("#modal-travellers").textContent = validCount ? String(travellers) : "Invalid";
    $("#modal-class").textContent = travelClassSelect.value;

    $("#modal-total").textContent = validCount
        ? formatFare(flight.fare * travellers)
        : "—";

    modalError.hidden = true;
}

function closeBookingModal() {
    bookingModal.hidden = true;
    document.body.classList.remove("modal-open");
    selectedFlightNo = null;

    if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
    }
}

function confirmDemoBooking() {
    const flight = flights.find(item => item.flightNo === selectedFlightNo);

    if (!flight) {
        modalError.textContent = "The selected sample flight could not be found.";
        modalError.hidden = false;
        return;
    }

    const requestedSeats = getRequestedSeatCount();

    if (requestedSeats === null) {
        modalError.textContent = "Please choose between 1 and 6 travellers.";
        modalError.hidden = false;
        return;
    }

    if (flight.seats < requestedSeats) {
        modalError.textContent =
            `Only ${flight.seats} seat(s) remain on this sample flight.`;
        modalError.hidden = false;
        return;
    }

    // Update only the local demonstration data.
    flight.seats -= requestedSeats;

    lastBookingReference = `DEMO-${flight.flightNo}-${Math.random()
        .toString(36).slice(2, 7).toUpperCase()}`;

    renderFlights();

    $("#ticket-message").textContent =
        `${requestedSeats} sample seat(s) for ${flight.source} to ${flight.destination}. ` +
        `Sample total: ${formatFare(flight.fare * requestedSeats)}. No real reservation was made.`;

    $("#ticket-reference").textContent = lastBookingReference;

    $("#booking-flight-details").hidden = true;
    $(".booking-modal > .eyebrow").hidden = true;
    $("#booking-title").hidden = true;
    $("#booking-description").hidden = true;
    $(".modal-top-icon").hidden = true;
    $(".booking-summary").hidden = true;
    $(".modal-disclaimer").hidden = true;
    $("#modal-actions").hidden = true;
    $("#modal-error").hidden = true;
    $("#ticket-confirmation").hidden = false;

    showToast("Demo booking confirmed. No real reservation was made.", "success");
    finishBooking.focus();
}

function resetModalAppearance() {
    $(".booking-modal > .eyebrow").hidden = false;
    $("#booking-title").hidden = false;
    $("#booking-description").hidden = false;
    $(".modal-top-icon").hidden = false;
    $(".booking-summary").hidden = false;
    $(".modal-disclaimer").hidden = false;
}

function setupBooking() {
    confirmBooking.addEventListener("click", confirmDemoBooking);

    cancelBooking.addEventListener("click", closeBookingModal);
    modalClose.addEventListener("click", closeBookingModal);
    finishBooking.addEventListener("click", () => {
        resetModalAppearance();
        closeBookingModal();
    });

    bookingModal.addEventListener("click", event => {
        if (event.target === bookingModal) {
            resetModalAppearance();
            closeBookingModal();
        }
    });

    travellersSelect.addEventListener("change", () => {
        if (!bookingModal.hidden && selectedFlightNo !== null) {
            updateBookingSummary();
        }
    });

    travelClassSelect.addEventListener("change", () => {
        if (!bookingModal.hidden && selectedFlightNo !== null) {
            updateBookingSummary();
        }
    });
}

/* DSA LAB */

function runLab() {
    const routeValue = $("#lab-route").value;
    const sortMode = $("#lab-sort").value;

    let matches = [...flights];

    if (routeValue) {
        const [source, destination] = routeValue.split("|");

        // Linear search through the demonstration flight records.
        matches = matches.filter(flight =>
            flight.source === source &&
            flight.destination === destination
        );
    }

    // Sort the matching records using the selected comparison rule.
    if (sortMode === "fare-asc") {
        matches.sort((a, b) => a.fare - b.fare);
    } else if (sortMode === "fare-desc") {
        matches.sort((a, b) => b.fare - a.fare);
    } else if (sortMode === "seats-desc") {
        matches.sort((a, b) => b.seats - a.seats);
    } else if (sortMode === "flight-asc") {
        matches.sort((a, b) => a.flightNo - b.flightNo);
    }

    $("#lab-total").textContent = String(flights.length);
    $("#lab-matches").textContent = String(matches.length);
    $("#lab-status").textContent = "Completed";

    const output = $("#lab-results");
    output.replaceChildren();

    if (matches.length === 0) {
        output.textContent = "No sample records match this route.";
        return;
    }

    matches.forEach(flight => {
        const row = document.createElement("div");
        row.className = "lab-result-row";

        const route = document.createElement("span");
        route.textContent = `${flight.source} → ${flight.destination}`;

        const fare = document.createElement("strong");
        fare.textContent = formatFare(flight.fare);

        row.append(route, fare);
        output.appendChild(row);
    });
}

function setupDSALab() {
    $("#lab-run").addEventListener("click", runLab);

    $("#lab-sort").addEventListener("change", runLab);
    $("#lab-route").addEventListener("change", runLab);
}

/* INITIALIZATION */

function initializeSkybook() {
    setupNavigation();
    setupDateInputs();
    setupBooking();
    setupDSALab();

    tripTabs.forEach(tab => {
        tab.addEventListener("click", () => setTripType(tab.dataset.trip));
    });

    searchForm.addEventListener("submit", searchFlights);
    swapButton.addEventListener("click", swapCities);
    sortSelect.addEventListener("change", renderFlights);
    resetButton.addEventListener("click", resetFlightFilters);

    renderFlights();
    runLab();
}

initializeSkybook();
