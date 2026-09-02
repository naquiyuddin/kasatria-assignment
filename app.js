// --- app.js ---

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// ============================================================
// 1. YOUR CREDENTIALS (Replace with your actual details)
// ============================================================
const API_KEY = 'AIzaSyD0F_8pS2bQ-OehLBrET7lNQ_uPP3sAGzs';
const SPREADSHEET_ID = '15CS9uiUWXtgUnnEN7mbCCUUnozf8bSOxQpWGe7hTPB8';
const CLIENT_ID = '47598662292-g2hb0rafkns7d15f6t3a8t4rugq3gi9n.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// ============================================================
// 2. GLOBAL STATE & DOM REFERENCES
// ============================================================
let peopleData = [];
let scene, camera, renderer, controls;
let objects = [];
const container = document.getElementById('container');
const loginContainer = document.getElementById('login-container');
const controlsDiv = document.getElementById('controls');
const loginStatus = document.getElementById('login-status');

// ============================================================
// 3. THREE.JS SCENE SETUP
// ============================================================
function initScene() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(30, 20, 50);
    camera.lookAt(0, 0, 0);

    renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0px';
    renderer.domElement.style.left = '0px';
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.rotateSpeed = 0.5;
    controls.target.set(0, 0, 0);

    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// ============================================================
// 4. CREATE A TILE (Requirement #4 and #5)
// ============================================================
function createTile(person, position) {
    // Determine background color based on Net Worth (Requirement #5)
    let bgColor = '#dc3545'; // Red for < 100k
    if (person.netWorth > 200000) {
        bgColor = '#28a745'; // Green for > 200k
    } else if (person.netWorth >= 100000) {
        bgColor = '#fd7e14'; // Orange for >=100k and <=200k
    }

    // Create the HTML content for the tile (Data Structure from Image B)
    const element = document.createElement('div');
    element.style.width = '130px';
    element.style.height = '180px';
    element.style.backgroundColor = bgColor;
    element.style.color = 'white';
    element.style.padding = '10px';
    element.style.borderRadius = '12px';
    element.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';
    element.style.textAlign = 'center';
    element.style.overflow = 'hidden';
    element.style.fontSize = '12px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.display = 'flex';
    element.style.flexDirection = 'column';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'center';
    element.style.transition = 'transform 0.2s';
    element.style.cursor = 'pointer';

    // Ensure photo URL is valid
    const photoHTML = person.photo && person.photo.startsWith('http') 
        ? `<img src="${person.photo}" style="width:60px; height:60px; border-radius:50%; object-fit:cover; margin-bottom:6px; border:2px solid white;" alt="${person.name}">` 
        : `<div style="width:60px; height:60px; border-radius:50%; background:#6c757d; margin-bottom:6px; display:flex; align-items:center; justify-content:center; font-size:24px; color:white;">?</div>`;

    element.innerHTML = `
        ${photoHTML}
        <div style="font-weight:bold; font-size:13px; margin-bottom:2px;">${person.name}</div>
        <div style="font-size:11px;">Age: ${person.age}</div>
        <div style="font-size:11px;">${person.country}</div>
        <div style="font-size:11px;">${person.interest}</div>
        <div style="font-weight:bold; font-size:12px; margin-top:4px; background:rgba(0,0,0,0.3); padding:2px 8px; border-radius:4px;">${person.netWorthString}</div>
    `;

    const tileObject = new CSS3DObject(element);
    tileObject.position.set(position.x, position.y, position.z);
    return tileObject;
}

// ============================================================
// 5. LAYOUT FUNCTIONS (Requirements #6, #7, #8, #9)
// ============================================================
function createTiles(layoutType) {
    // Remove old objects from the scene
    objects.forEach(obj => scene.remove(obj));
    objects = [];

    if (peopleData.length === 0) {
        console.warn('No data to display');
        return;
    }

    let positions = [];

    switch (layoutType) {
        case 'table': {
            // 20x10 Table (Requirement #7)
            const cols = 20;
            const rows = 10;
            const spacingX = 14;
            const spacingZ = 14;
            peopleData.forEach((person, index) => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                if (row < rows) {
                    const x = (col - cols / 2) * spacingX;
                    const z = (row - rows / 2) * spacingZ;
                    positions.push({ x, y: 0, z });
                }
            });
            break;
        }

        case 'sphere': {
            // Sphere layout (Requirement #6)
            const radius = 35;
            const total = peopleData.length;
            peopleData.forEach((person, index) => {
                const phi = Math.acos(-1 + (2 * index + 1) / total);
                const theta = Math.sqrt(total * Math.PI) * phi;
                const x = radius * Math.cos(theta) * Math.sin(phi);
                const y = radius * Math.sin(theta) * Math.sin(phi);
                const z = radius * Math.cos(phi);
                positions.push({ x, y, z });
            });
            break;
        }

        case 'helix': {
            // Double Helix (Requirement #8)
            const helixRadius = 22;
            const heightTotal = 70;
            const turns = 4;
            peopleData.forEach((person, index) => {
                const t = index / peopleData.length;
                const angle = t * Math.PI * 2 * turns;
                // Offset by PI for the second strand
                const strandOffset = (index % 2 === 0) ? 0 : Math.PI;
                const x = helixRadius * Math.cos(angle + strandOffset);
                const z = helixRadius * Math.sin(angle + strandOffset);
                const y = (t - 0.5) * heightTotal;
                positions.push({ x, y, z });
            });
            break;
        }

        case 'grid': {
            // 5x4x10 Grid (Requirement #9)
            const gridW = 5;
            const gridH = 4;
            const gridD = 10;
            const spacingGrid = 14;
            peopleData.forEach((person, index) => {
                const w = index % gridW;
                const h = Math.floor(index / gridW) % gridH;
                const d = Math.floor(index / (gridW * gridH));
                if (d < gridD) {
                    const x = (w - gridW/2) * spacingGrid;
                    const y = (h - gridH/2) * spacingGrid;
                    const z = (d - gridD/2) * spacingGrid;
                    positions.push({ x, y, z });
                }
            });
            break;
        }

        default:
            console.warn('Unknown layout type:', layoutType);
            return;
    }

    // Create a tile for each person
    const count = Math.min(peopleData.length, positions.length);
    for (let i = 0; i < count; i++) {
        const tile = createTile(peopleData[i], positions[i]);
        scene.add(tile);
        objects.push(tile);
    }

    // Center the camera target
    controls.target.set(0, 0, 0);
}

// ============================================================
// 6. FETCH DATA FROM GOOGLE SHEETS (Requirement #3)
// ============================================================
function fetchSheetData(accessToken) {
    loginStatus.innerText = 'Loading data from Google Sheet...';
    
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    }).then(() => {
        gapi.client.setToken({ access_token: accessToken });
        return gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Data Template!A2:F', // Adjust if your sheet name is different
        });
    }).then((response) => {
        const rows = response.result.values;
        if (rows && rows.length > 0) {
            peopleData = rows.map(row => ({
                name: row[0] || 'Unknown',
                photo: row[1] || '',
                age: row[2] || 'N/A',
                country: row[3] || 'N/A',
                interest: row[4] || 'N/A',
                netWorthString: row[5] || '$0',
                netWorth: parseFloat(row[5] ? row[5].replace(/[$,]/g, '') : 0),
            }));
            
            // Hide login, show controls
            loginContainer.style.display = 'none';
            controlsDiv.style.display = 'flex';
            
            // Initialize 3D scene and create default layout
            initScene();
            createTiles('table');
        } else {
            loginStatus.innerText = 'No data found in the sheet. Please check the range.';
        }
    }).catch((error) => {
        console.error('Error fetching data:', error);
        loginStatus.innerText = 'Error loading data. See console for details.';
    });
}

// ============================================================
// 7. GOOGLE SIGN-IN (Requirement #2)
// ============================================================
function initGoogleSignIn() {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse.error) {
                console.error('Sign-in error:', tokenResponse);
                loginStatus.innerText = 'Login failed. Please try again.';
                return;
            }
            loginStatus.innerText = 'Login successful! Loading data...';
            fetchSheetData(tokenResponse.access_token);
        },
    });

    // Attach sign-in to button
    const signInButton = document.getElementById('g-signin2');
    signInButton.innerHTML = `
        <button onclick="window.handleSignIn()" style="padding:12px 24px; font-size:16px; background:#4285f4; color:white; border:none; border-radius:4px; cursor:pointer;">
            Sign In with Google
        </button>
    `;
    
    // Expose sign-in function globally
    window.handleSignIn = function() {
        client.requestAccessToken();
    };
}

// ============================================================
// 8. LAYOUT CHANGE HANDLER (For buttons)
// ============================================================
window.changeLayout = function(layoutType) {
    if (scene) {
        createTiles(layoutType);
    }
};

// ============================================================
// 9. START THE APPLICATION
// ============================================================
// Load the Google API client library and start the sign-in flow
gapi.load('client', initGoogleSignIn);