// ==========================================
// GUARDIANAI
// HTML + CSS + JAVASCRIPT
// NO FIREBASE
// ==========================================


// ==========================================
// GLOBAL VARIABLES
// ==========================================

let currentUser = null;

let currentLocation = null;

let watchId = null;

let peer = null;

let peerConnection = null;

let remotePeerId = null;

let safeTimer = null;

let safeSeconds = 300;

let activeEmergency = null;


// ==========================================
// LOCAL STORAGE
// ==========================================

function getUsers() {

    return JSON.parse(
        localStorage.getItem("guardianUsers") || "[]"
    );
}


function saveUsers(users) {

    localStorage.setItem(
        "guardianUsers",
        JSON.stringify(users)
    );
}


function getContacts() {

    return JSON.parse(
        localStorage.getItem("guardianContacts") || "[]"
    );
}


function saveContacts(contacts) {

    localStorage.setItem(
        "guardianContacts",
        JSON.stringify(contacts)
    );
}


function getEmergencies() {

    return JSON.parse(
        localStorage.getItem("guardianEmergencies") || "[]"
    );
}


function saveEmergencies(data) {

    localStorage.setItem(
        "guardianEmergencies",
        JSON.stringify(data)
    );
}


// ==========================================
// AUTHENTICATION
// ==========================================

const loginTab =
    document.getElementById("login-tab");

const signupTab =
    document.getElementById("signup-tab");

const nameInput =
    document.getElementById("name");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const authButton =
    document.getElementById("auth-button");

const authMessage =
    document.getElementById("auth-message");


let authMode = "signup";


function showAuthMessage(message, success = false) {

    authMessage.textContent = message;

    authMessage.style.color =
        success ? "#16a34a" : "#dc2626";
}


function setAuthMode(mode) {

    authMode = mode;

    showAuthMessage("");

    if (mode === "login") {

        loginTab.classList.add("active");

        signupTab.classList.remove("active");

        nameInput.style.display = "none";

        nameInput.required = false;

        authButton.textContent =
            "🔐 Login";

    } else {

        signupTab.classList.add("active");

        loginTab.classList.remove("active");

        nameInput.style.display = "block";

        nameInput.required = true;

        authButton.textContent =
            "👤 Create Account";
    }
}


loginTab.addEventListener(
    "click",
    () => setAuthMode("login")
);


signupTab.addEventListener(
    "click",
    () => setAuthMode("signup")
);


authButton.addEventListener(
    "click",
    authenticate
);


function authenticate() {

    const name =
        nameInput.value.trim();

    const email =
        emailInput.value.trim().toLowerCase();

    const password =
        passwordInput.value.trim();


    if (!email || !password) {

        showAuthMessage(
            "Please enter email and password."
        );

        return;
    }


    if (authMode === "signup") {

        if (!name) {

            showAuthMessage(
                "Please enter your name."
            );

            return;
        }


        if (password.length < 6) {

            showAuthMessage(
                "Password must contain at least 6 characters."
            );

            return;
        }


        const users = getUsers();


        const exists = users.find(
            user => user.email === email
        );


        if (exists) {

            showAuthMessage(
                "Account already exists. Please login."
            );

            return;
        }


        const newUser = {

            id:
                "user_" +
                Date.now(),

            name,

            email,

            password

        };


        users.push(newUser);

        saveUsers(users);


        localStorage.setItem(
            "guardianCurrentUser",
            JSON.stringify(newUser)
        );


        showAuthMessage(
            "Account created successfully!",
            true
        );


        setTimeout(
            () => openDashboard(newUser),
            500
        );


    } else {

        const users = getUsers();


        const user = users.find(
            user =>
                user.email === email &&
                user.password === password
        );


        if (!user) {

            showAuthMessage(
                "Invalid email or password."
            );

            return;
        }


        localStorage.setItem(
            "guardianCurrentUser",
            JSON.stringify(user)
        );


        openDashboard(user);
    }
}


// ==========================================
// DASHBOARD
// ==========================================

function openDashboard(user) {

    currentUser = user;


    document.getElementById(
        "auth-screen"
    ).style.display = "none";


    document.getElementById(
        "dashboard"
    ).style.display = "block";


    document.getElementById(
        "user-name"
    ).textContent = user.name;


    initializePeer();

    loadContacts();

    loadEmergencyHistory();

    updateStats();

    getCurrentLocation();

    calculateRisk();
}


function logout() {

    localStorage.removeItem(
        "guardianCurrentUser"
    );


    if (peer) {

        peer.destroy();

        peer = null;
    }


    currentUser = null;


    document.getElementById(
        "dashboard"
    ).style.display = "none";


    document.getElementById(
        "auth-screen"
    ).style.display = "flex";


    emailInput.value = "";

    passwordInput.value = "";

    setAuthMode("login");
}


document
    .getElementById("logout-button")
    .addEventListener(
        "click",
        logout
    );


// ==========================================
// CHECK LOGIN
// ==========================================

function checkLogin() {

    const saved =
        localStorage.getItem(
            "guardianCurrentUser"
        );


    if (saved) {

        try {

            const user =
                JSON.parse(saved);

            openDashboard(user);

        } catch {

            localStorage.removeItem(
                "guardianCurrentUser"
            );
        }

    } else {

        setAuthMode("signup");
    }
}


// ==========================================
// GPS
// ==========================================

function getCurrentLocation() {

    if (!navigator.geolocation) {

        updateLocationStatus(
            "GPS unavailable"
        );

        return;
    }


    updateLocationStatus(
        "Getting location..."
    );


    navigator.geolocation.getCurrentPosition(

        position => {

            updateLocation(
                position
            );

        },

        error => {

            console.error(error);

            updateLocationStatus(
                "Permission denied"
            );

        },

        {

            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 0

        }
    );
}


function updateLocation(position) {

    currentLocation = {

        latitude:
            position.coords.latitude,

        longitude:
            position.coords.longitude,

        accuracy:
            position.coords.accuracy

    };


    document.getElementById(
        "latitude"
    ).textContent =
        currentLocation.latitude
            .toFixed(6);


    document.getElementById(
        "longitude"
    ).textContent =
        currentLocation.longitude
            .toFixed(6);


    document.getElementById(
        "accuracy"
    ).textContent =
        Math.round(
            currentLocation.accuracy
        ) + " m";


    updateLocationStatus(
        "Active"
    );


    updateMapLink();


    sendLocationToPeer();
}


function updateLocationStatus(text) {

    document.getElementById(
        "location-status"
    ).textContent = text;
}


function updateMapLink() {

    if (!currentLocation) return;


    const url =
        `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;


    const link =
        document.getElementById(
            "map-link"
        );


    link.href = url;

    link.target = "_blank";
}


document
    .getElementById(
        "get-location-button"
    )
    .addEventListener(
        "click",
        getCurrentLocation
    );


// ==========================================
// LIVE GPS TRACKING
// ==========================================

function startLiveLocation() {

    if (!navigator.geolocation) {

        alert(
            "Geolocation is not supported."
        );

        return;
    }


    if (watchId !== null) {

        alert(
            "Live location is already active."
        );

        return;
    }


    watchId =
        navigator.geolocation.watchPosition(

            position => {

                updateLocation(
                    position
                );
            },


            error => {

                console.error(error);

                updateLocationStatus(
                    "GPS error"
                );

            },


            {

                enableHighAccuracy: true,

                maximumAge: 3000,

                timeout: 10000

            }
        );


    document.getElementById(
        "live-location-button"
    ).textContent =
        "⏹ Stop Live Location";
}


function stopLiveLocation() {

    if (watchId !== null) {

        navigator.geolocation.clearWatch(
            watchId
        );

        watchId = null;
    }


    updateLocationStatus(
        "Stopped"
    );


    document.getElementById(
        "live-location-button"
    ).textContent =
        "▶ Start Live Location";
}


document
    .getElementById(
        "live-location-button"
    )
    .addEventListener(

        "click",

        () => {

            if (watchId === null) {

                startLiveLocation();

            } else {

                stopLiveLocation();
            }
        }
    );


// ==========================================
// PEERJS REAL-TIME CONNECTION
// ==========================================

function initializePeer() {

    if (peer) return;


    peer =
        new Peer();


    peer.on(
        "open",
        id => {

            document.getElementById(
                "my-peer-id"
            ).value = id;


            document.getElementById(
                "peer-status"
            ).textContent =
                "Online";


            document.getElementById(
                "peer-status"
            ).style.color =
                "#15803d";


            setConnectionMessage(
                "Your device is ready. Share your Device ID with your trusted contact."
            );
        }
    );


    peer.on(
        "connection",
        connection => {

            setupConnection(
                connection
            );
        }
    );


    peer.on(
        "error",
        error => {

            console.error(
                "Peer error:",
                error
            );


            setConnectionMessage(
                "Connection error: " +
                error.type
            );
        }
    );


    peer.on(
        "disconnected",
        () => {

            document.getElementById(
                "peer-status"
            ).textContent =
                "Disconnected";
        }
    );
}


function connectToPeer() {

    const id =
        document.getElementById(
            "remote-peer-id"
        ).value.trim();


    if (!id) {

        alert(
            "Enter a Device ID."
        );

        return;
    }


    if (!peer) {

        alert(
            "Your device is not ready yet."
        );

        return;
    }


    setConnectionMessage(
        "Connecting..."
    );


    const connection =
        peer.connect(
            id,
            {
                reliable: true
            }
        );


    setupConnection(
        connection
    );
}


document
    .getElementById(
        "connect-peer"
    )
    .addEventListener(
        "click",
        connectToPeer
    );


function setupConnection(connection) {

    peerConnection =
        connection;


    remotePeerId =
        connection.peer;


    connection.on(
        "open",
        () => {

            setConnectionMessage(
                "🟢 Connected to trusted device."
            );


            document.getElementById(
                "remote-status"
            ).textContent =
                "Connected";


            document.getElementById(
                "remote-status"
            ).style.background =
                "#dcfce7";


            document.getElementById(
                "remote-status"
            ).style.color =
                "#15803d";


            // Send current location immediately

            sendLocationToPeer();
        }
    );


    connection.on(
        "data",
        data => {

            handlePeerData(
                data
            );
        }
    );


    connection.on(
        "close",
        () => {

            setConnectionMessage(
                "Connection closed."
            );


            document.getElementById(
                "remote-status"
            ).textContent =
                "Offline";
        }
    );


    connection.on(
        "error",
        error => {

            console.error(
                error
            );

            setConnectionMessage(
                "Connection failed."
            );
        }
    );
}


function sendLocationToPeer() {

    if (
        !peerConnection ||
        !peerConnection.open ||
        !currentLocation
    ) {

        return;
    }


    peerConnection.send({

        type:
            "LOCATION_UPDATE",

        name:
            currentUser?.name ||
            "GuardianAI User",

        latitude:
            currentLocation.latitude,

        longitude:
            currentLocation.longitude,

        accuracy:
            currentLocation.accuracy,

        timestamp:
            new Date().toISOString()

    });
}


function handlePeerData(data) {

    if (!data) return;


    if (
        data.type ===
        "LOCATION_UPDATE"
    ) {

        showRemoteLocation(
            data
        );

        return;
    }


    if (
        data.type ===
        "SOS_ALERT"
    ) {

        showRemoteSOS(
            data
        );

        return;
    }


    if (
        data.type ===
        "SOS_CANCELLED"
    ) {

        showConnectionMessage(
            "SOS alert cancelled by sender."
        );

        return;
    }
}


// ==========================================
// REMOTE LOCATION
// ==========================================

function showRemoteLocation(data) {

    const container =
        document.getElementById(
            "remote-location"
        );


    container.innerHTML = `

        <div style="padding:25px">

            <div style="font-size:40px">
                📍
            </div>

            <h4>
                ${escapeHTML(data.name)}
            </h4>

            <p>
                Latitude:
                ${Number(data.latitude).toFixed(6)}
            </p>

            <p>
                Longitude:
                ${Number(data.longitude).toFixed(6)}
            </p>

            <p>
                Accuracy:
                ${Math.round(data.accuracy)} m
            </p>

            <small>
                Last updated:
                ${new Date(data.timestamp).toLocaleTimeString()}
            </small>

        </div>
    `;


    const url =
        `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;


    const mapLink =
        document.getElementById(
            "remote-map-link"
        );


    mapLink.href = url;

    mapLink.style.display =
        "inline-block";
}


// ==========================================
// COPY DEVICE ID
// ==========================================

document
    .getElementById(
        "copy-peer-id"
    )
    .addEventListener(
        "click",
        async () => {

            const id =
                document.getElementById(
                    "my-peer-id"
                ).value;


            if (!id) return;


            try {

                await navigator.clipboard.writeText(
                    id
                );

                alert(
                    "Device ID copied."
                );

            } catch {

                alert(
                    "Copy failed. Copy the ID manually."
                );
            }
        }
    );


// ==========================================
// CONNECTION MESSAGE
// ==========================================

function setConnectionMessage(
    message
) {

    document.getElementById(
        "connection-message"
    ).textContent =
        message;
}


function showConnectionMessage(
    message
) {

    setConnectionMessage(
        message
    );
}


// ==========================================
// TRUSTED CONTACTS
// ==========================================

document
    .getElementById(
        "add-contact-button"
    )
    .addEventListener(
        "click",
        addContact
    );


function addContact() {

    const name =
        document.getElementById(
            "contact-name"
        ).value.trim();


    const phone =
        document.getElementById(
            "contact-phone"
        ).value.trim();


    const relation =
        document.getElementById(
            "contact-relation"
        ).value.trim();


    if (!name || !phone) {

        alert(
            "Enter contact name and phone number."
        );

        return;
    }


    const contacts =
        getContacts();


    contacts.push({

        id:
            Date.now(),

        name,

        phone,

        relation:
            relation ||
            "Trusted Contact"

    });


    saveContacts(
        contacts
    );


    document.getElementById(
        "contact-name"
    ).value = "";


    document.getElementById(
        "contact-phone"
    ).value = "";


    document.getElementById(
        "contact-relation"
    ).value = "";


    loadContacts();

    updateStats();
}


function loadContacts() {

    const contacts =
        getContacts();


    const container =
        document.getElementById(
            "contacts-list"
        );


    container.innerHTML = "";


    if (
        contacts.length === 0
    ) {

        container.innerHTML =
            "<p>No trusted contacts added yet.</p>";

        return;
    }


    contacts.forEach(
        contact => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "contact-item";


            div.innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(contact.name)}
                    </strong>

                    <small>
                        ${escapeHTML(contact.relation)}
                    </small>

                    <small>
                        ${escapeHTML(contact.phone)}
                    </small>

                </div>

                <button
                    onclick="deleteContact(${contact.id})">

                    Delete

                </button>

            `;


            container.appendChild(
                div
            );
        }
    );
}


function deleteContact(id) {

    const contacts =
        getContacts().filter(
            contact =>
                contact.id !== id
        );


    saveContacts(
        contacts
    );


    loadContacts();

    updateStats();
}


window.deleteContact =
    deleteContact;


// ==========================================
// SOS
// ==========================================

document
    .getElementById(
        "sos-button"
    )
    .addEventListener(
        "click",
        activateSOS
    );


async function activateSOS() {

    const confirmed =
        confirm(
            "Are you sure you want to activate SOS?"
        );


    if (!confirmed) return;


    getCurrentLocation();


    await new Promise(
        resolve =>
            setTimeout(
                resolve,
                1000
            )
    );


    const contacts =
        getContacts();


    const emergency = {

        id:
            "SOS-" +
            Date.now(),

        user:
            currentUser?.name ||
            "User",

        latitude:
            currentLocation?.latitude ||
            null,

        longitude:
            currentLocation?.longitude ||
            null,

        status:
            "ACTIVE",

        createdAt:
            new Date().toISOString()

    };


    activeEmergency =
        emergency;


    const emergencies =
        getEmergencies();


    emergencies.unshift(
        emergency
    );


    saveEmergencies(
        emergencies
    );


    updateStats();

    loadEmergencyHistory();


    showSOSStatus();


    // Send to connected trusted device

    if (
        peerConnection &&
        peerConnection.open
    ) {

        peerConnection.send({

            type:
                "SOS_ALERT",

            name:
                emergency.user,

            latitude:
                emergency.latitude,

            longitude:
                emergency.longitude,

            timestamp:
                emergency.createdAt
        });
    }


    prepareSMS(
        emergency,
        contacts
    );


    alert(
        "🚨 GuardianAI SOS activated."
    );
}


// ==========================================
// SOS RECEIVER
// ==========================================

function showRemoteSOS(data) {

    const map =
        data.latitude &&
        data.longitude
            ? `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
            : "#";


    alert(
        `🚨 SOS ALERT\n\n` +
        `${data.name} activated an emergency alert.\n\n` +
        `Location:\n${map}`
    );
}


// ==========================================
// SMS
// ==========================================

function prepareSMS(
    emergency,
    contacts
) {

    if (
        contacts.length === 0
    ) {

        return;
    }


    let location =
        "Location unavailable.";


    if (
        emergency.latitude !== null &&
        emergency.longitude !== null
    ) {

        location =
            `https://www.google.com/maps?q=${emergency.latitude},${emergency.longitude}`;
    }


    const message =
        `🚨 GUARDIANAI SOS ALERT 🚨\n\n` +

        `${emergency.user} has activated an emergency alert.\n\n` +

        `Current location:\n${location}\n\n` +

        `Please contact them immediately.`;


    const contact =
        contacts[0];


    const smsURL =
        `sms:${contact.phone}?body=${encodeURIComponent(message)}`;


    const button =
        document.getElementById(
            "send-sms-button"
        );


    button.href =
        smsURL;


    button.style.display =
        "inline-flex";
}


// ==========================================
// CANCEL SOS
// ==========================================

function showSOSStatus() {

    const status =
        document.getElementById(
            "sos-status"
        );


    status.style.display =
        "block";


    status.innerHTML = `

        <strong>
            🚨 SOS ACTIVE
        </strong>

        <p>
            Emergency alert is currently active.
        </p>

        <button
            id="cancel-sos"
            class="secondary-btn">

            Cancel SOS

        </button>
    `;


    document
        .getElementById(
            "cancel-sos"
        )
        .addEventListener(
            "click",
            cancelSOS
        );
}


function cancelSOS() {

    if (!activeEmergency)
        return;


    activeEmergency.status =
        "CANCELLED";


    const emergencies =
        getEmergencies();


    const index =
        emergencies.findIndex(
            e =>
                e.id ===
                activeEmergency.id
        );


    if (index !== -1) {

        emergencies[index] =
            activeEmergency;

        saveEmergencies(
            emergencies
        );
    }


    if (
        peerConnection &&
        peerConnection.open
    ) {

        peerConnection.send({

            type:
                "SOS_CANCELLED"
        });
    }


    activeEmergency =
        null;


    document.getElementById(
        "sos-status"
    ).style.display =
        "none";


    updateStats();

    loadEmergencyHistory();
}


// ==========================================
// EMERGENCY HISTORY
// ==========================================

function loadEmergencyHistory() {

    const container =
        document.getElementById(
            "emergency-history"
        );


    const emergencies =
        getEmergencies();


    container.innerHTML = "";


    if (
        emergencies.length === 0
    ) {

        container.innerHTML =
            "<p>No emergency events yet.</p>";

        return;
    }


    emergencies
        .slice(0, 10)
        .forEach(
            emergency => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "history-item";


                div.innerHTML = `

                    <strong>
                        🚨 ${escapeHTML(emergency.id)}
                    </strong>

                    <span>
                        ${escapeHTML(emergency.status)}
                    </span>

                    <small>
                        ${new Date(
                            emergency.createdAt
                        ).toLocaleString()}
                    </small>
                `;


                container.appendChild(
                    div
                );
            }
        );
}


// ==========================================
// STATISTICS
// ==========================================

function updateStats() {

    document.getElementById(
        "total-sos"
    ).textContent =
        getEmergencies().length;


    document.getElementById(
        "contact-count"
    ).textContent =
        getContacts().length;
}


// ==========================================
// SAFE ARRIVAL
// ==========================================

document
    .getElementById(
        "start-safe-timer"
    )
    .addEventListener(
        "click",
        startSafeTimer
    );


document
    .getElementById(
        "stop-safe-timer"
    )
    .addEventListener(
        "click",
        stopSafeTimer
    );


function startSafeTimer() {

    if (safeTimer) {

        clearInterval(
            safeTimer
        );
    }


    safeSeconds =
        300;


    updateTimer();


    safeTimer =
        setInterval(
            () => {

                safeSeconds--;

                updateTimer();


                if (
                    safeSeconds <= 0
                ) {

                    clearInterval(
                        safeTimer
                    );

                    safeTimer =
                        null;


                    alert(
                        "⏰ Safe-arrival timer finished. Please confirm that you are safe."
                    );
                }

            },
            1000
        );
}


function stopSafeTimer() {

    if (safeTimer) {

        clearInterval(
            safeTimer
        );

        safeTimer =
            null;
    }


    safeSeconds =
        300;


    updateTimer();
}


function updateTimer() {

    const minutes =
        Math.floor(
            safeSeconds / 60
        )
        .toString()
        .padStart(
            2,
            "0"
        );


    const seconds =
        (
            safeSeconds % 60
        )
        .toString()
        .padStart(
            2,
            "0"
        );


    document.getElementById(
        "safe-timer"
    ).textContent =
        `${minutes}:${seconds}`;
}


// ==========================================
// AI SAFETY ENGINE
// ==========================================

document
    .getElementById(
        "check-risk-button"
    )
    .addEventListener(
        "click",
        calculateRisk
    );


function calculateRisk() {

    let score =
        0;


    // GPS unavailable

    if (!currentLocation) {

        score += 20;
    }


    // No trusted contacts

    if (
        getContacts().length === 0
    ) {

        score += 30;
    }


    // Live location active

    if (
        watchId !== null
    ) {

        score -= 20;
    }


    // Peer connection

    if (
        peerConnection &&
        peerConnection.open
    ) {

        score -= 10;
    }


    score =
        Math.max(
            0,
            score
        );


    let level =
        "LOW";


    if (
        score >= 50
    ) {

        level =
            "HIGH";

    } else if (
        score >= 25
    ) {

        level =
            "MEDIUM";
    }


    const risk =
        document.getElementById(
            "risk-level"
        );


    const scoreText =
        document.getElementById(
            "risk-score"
        );


    risk.textContent =
        level;


    scoreText.textContent =
        `Risk score: ${score}`;


    if (
        level === "HIGH"
    ) {

        risk.style.color =
            "#dc2626";

    } else if (
        level === "MEDIUM"
    ) {

        risk.style.color =
            "#d97706";

    } else {

        risk.style.color =
            "#16a34a";
    }
}


// ==========================================
// SECURITY HELPER
// ==========================================

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


// ==========================================
// START
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        checkLogin();

    }
);