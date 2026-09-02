// ============================================================
// 1. IMPORTS
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// ============================================================
// 2. YOUR CREDENTIALS
// ============================================================
const API_KEY = 'AIzaSyD0F_8pS2bQ-OehLBrET7lNQ_uPP3sAGzs';
const SPREADSHEET_ID = '15CS9uiUWXtgUnnEN7mbCCUUnozf8bSOxQpWGe7hTPB8';
const CLIENT_ID = '47598662292-g2hb0rafkns7d15f6t3a8t4rugq3gi9n.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

// ============================================================
// 3. STATE
// ============================================================
let peopleData = [];
let scene, camera, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };
let isAnimating = false;

// ============================================================
// 4. THREE.JS SETUP
// ============================================================
function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(0, 0, 2500);
    camera.lookAt(0, 0, 0);

    renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    document.getElementById('container').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 300;
    controls.maxDistance = 6000;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0);

    window.addEventListener('resize', onWindowResize);
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
// 5. CREATE A TILE
// ============================================================
function createTile(person) {
    let bgColor = '#dc3545';
    if (person.netWorth > 200000) bgColor = '#28a745';
    else if (person.netWorth >= 100000) bgColor = '#fd7e14';

    const el = document.createElement('div');
    el.className = 'element';
    el.style.backgroundColor = bgColor;

    const photoHTML = person.photo && person.photo.startsWith('http')
        ? `<img src="${person.photo}" alt="${person.name}" loading="lazy" />`
        : `<div style="width:50px;height:50px;border-radius:50%;background:#555;display:flex;align-items:center;justify-content:center;font-size:20px;">?</div>`;

    el.innerHTML = `
        ${photoHTML}
        <div class="name">${person.name}</div>
        <div class="detail">Age: ${person.age} · ${person.country}</div>
        <div class="detail">${person.interest}</div>
        <div class="networth">${person.netWorthString}</div>
    `;

    return new CSS3DObject(el);
}

// ============================================================
// 6. BUILD LAYOUT TARGETS (ALL LAYOUTS FIXED)
// ============================================================
function buildTargets() {
    const total = peopleData.length;
    if (total === 0) return;

    // --- TABLE: 20 columns × 10 rows (FLAT 2D) ---
    targets.table = [];
    const cols = 20;
    const rows = 10;
    const spacingX = 150;
    const spacingY = 150;
    const startX = -(cols - 1) * spacingX / 2;
    const startY = (rows - 1) * spacingY / 2;

    for (let i = 0; i < total && i < cols * rows; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const obj = new THREE.Object3D();
        obj.position.x = startX + col * spacingX;
        obj.position.y = startY - row * spacingY;
        obj.position.z = 0;
        obj.rotation.set(0, 0, 0);
        targets.table.push(obj);
    }

    // --- SPHERE ---
    targets.sphere = [];
    const radius = 800;
    for (let i = 0; i < total; i++) {
        const phi = Math.acos(-1 + (2 * i + 1) / total);
        const theta = Math.sqrt(total * Math.PI) * phi;
        const obj = new THREE.Object3D();
        obj.position.setFromSphericalCoords(radius, phi, theta);
        const look = obj.position.clone().multiplyScalar(2);
        obj.lookAt(look);
        targets.sphere.push(obj);
    }

    // --- DOUBLE HELIX (FIXED: Two alternating strands) ---
    targets.helix = [];
    const helixRadius = 700;
    const heightTotal = 900;
    const turns = 4;

    for (let i = 0; i < total; i++) {
        const t = i / total;
        const angle = t * Math.PI * 2 * turns;
        // Alternate between two strands
        const strandOffset = (i % 2 === 0) ? 0 : Math.PI;
        
        const obj = new THREE.Object3D();
        obj.position.set(
            helixRadius * Math.cos(angle + strandOffset),
            (t - 0.5) * heightTotal,
            helixRadius * Math.sin(angle + strandOffset)
        );
        
        // Make tile face outward from center
        const lookTarget = obj.position.clone();
        lookTarget.x = 0;
        lookTarget.z = 0;
        obj.lookAt(lookTarget);
        
        targets.helix.push(obj);
    }

    // --- GRID: 5 × 4 × 10 ---
    targets.grid = [];
    const gw = 5, gh = 4, gd = 10;
    const spacingGrid = 160;
    for (let i = 0; i < total; i++) {
        const w = i % gw;
        const h = Math.floor(i / gw) % gh;
        const d = Math.floor(i / (gw * gh));
        const obj = new THREE.Object3D();
        obj.position.set(
            (w - gw / 2) * spacingGrid,
            (h - gh / 2) * spacingGrid,
            (d - gd / 2) * spacingGrid
        );
        targets.grid.push(obj);
    }
}

// ============================================================
// 7. ANIMATE TO LAYOUT
// ============================================================
function transform(targetArray, duration = 1500) {
    if (isAnimating || !objects.length || !targetArray.length) return;
    isAnimating = true;

    const startPos = objects.map(o => o.position.clone());
    const startRot = objects.map(o => o.rotation.clone());
    const startTime = performance.now();

    function step(time) {
        const elapsed = time - startTime;
        let progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5 ?
            4 * progress * progress * progress :
            1 - Math.pow(-2 * progress + 2, 3) / 2;

        for (let i = 0; i < objects.length && i < targetArray.length; i++) {
            const obj = objects[i];
            const tgt = targetArray[i];
            obj.position.lerpVectors(startPos[i], tgt.position, ease);
            obj.rotation.x = startRot[i].x + (tgt.rotation.x - startRot[i].x) * ease;
            obj.rotation.y = startRot[i].y + (tgt.rotation.y - startRot[i].y) * ease;
            obj.rotation.z = startRot[i].z + (tgt.rotation.z - startRot[i].z) * ease;
        }

        renderer.render(scene, camera);

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            isAnimating = false;
        }
    }

    requestAnimationFrame(step);
}

// ============================================================
// 8. CREATE ALL TILES
// ============================================================
function createTiles() {
    objects.forEach(o => scene.remove(o));
    objects.length = 0;

    for (const person of peopleData) {
        const tile = createTile(person);
        tile.position.set(
            (Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000
        );
        scene.add(tile);
        objects.push(tile);
    }

    buildTargets();
    document.getElementById('menu').style.display = 'flex';

    setTimeout(() => {
        transform(targets.table, 1800);
        setActiveButton('table');
    }, 400);
}

// ============================================================
// 9. BUTTON HANDLING
// ============================================================
function setActiveButton(layout) {
    document.querySelectorAll('#menu button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === layout);
    });
}

function setupButtons() {
    document.querySelectorAll('#menu button').forEach(btn => {
        btn.addEventListener('click', () => {
            const layout = btn.dataset.layout;
            if (layout && targets[layout]) {
                setActiveButton(layout);
                transform(targets[layout], 1500);
            }
        });
    });
}

// ============================================================
// 10. FETCH DATA FROM GOOGLE SHEETS
// ============================================================
function fetchSheetData(accessToken) {
    const status = document.getElementById('login-status');
    status.textContent = 'Loading data from Google Sheet...';

    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    })
        .then(() => {
            gapi.client.setToken({ access_token: accessToken });
            return gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Data Template!A2:F',
            });
        })
        .then((res) => {
            const rows = res.result.values;
            if (!rows || rows.length === 0) {
                status.textContent = 'No data found. Check sheet name and range.';
                return;
            }

            peopleData = rows.map(row => ({
                name: row[0] || 'Unknown',
                photo: row[1] || '',
                age: row[2] || 'N/A',
                country: row[3] || 'N/A',
                interest: row[4] || 'N/A',
                netWorthString: row[5] || '$0',
                netWorth: parseFloat(row[5] ? row[5].replace(/[$,]/g, '') : 0),
            }));

            document.getElementById('login-container').style.display = 'none';
            initScene();
            createTiles();
            setupButtons();
        })
        .catch((err) => {
            console.error('Error fetching data:', err);
            status.textContent = 'Error loading data. Check console (F12).';
        });
}

// ============================================================
// 11. GOOGLE SIGN-IN
// ============================================================
function initGoogleSignIn() {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
            if (resp.error) {
                document.getElementById('login-status').textContent = 'Login failed. Try again.';
                return;
            }
            fetchSheetData(resp.access_token);
        },
    });

    document.getElementById('g-signin2').innerHTML = `
        <button onclick="window.handleSignIn()">Sign In with Google</button>
    `;

    window.handleSignIn = () => client.requestAccessToken();
}

// ============================================================
// 12. START
// ============================================================
gapi.load('client', initGoogleSignIn);