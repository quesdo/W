let lastCheckedRadio = null;
let lastCheckedCheckbox = null;
let isPointCloudOn = false;

function toggleVisibility(actorName, visible) {
    window.parent.postMessage(JSON.stringify({ action: "toggleVisibility", actor: actorName, visible: visible }), "*");
}

// Fonction pour obtenir la visibilité d'un acteur
function getActorVisibility(actorName) {
    return new Promise((resolve) => {
        window.parent.postMessage(JSON.stringify({ 
            action: "getVisibility", 
            actor: actorName 
        }), "*");

        function handleVisibilityResponse(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.action === "visibilityResponse" && data.actor === actorName) {
                    window.removeEventListener('message', handleVisibilityResponse);
                    resolve(data.visible);
                }
            } catch (error) {
                console.log("Error processing visibility response:", error);
            }
        }

        window.addEventListener('message', handleVisibilityResponse);
    });
}

// Fonction pour synchroniser l'état des indicateurs
async function syncIndicatorStates() {
    const checkboxes = document.querySelectorAll('.single-checkbox');
    for (const checkbox of checkboxes) {
        const actorName = checkbox.id;
        try {
            const isVisible = await getActorVisibility(actorName);
            
            // Mettre à jour le checkbox
            checkbox.checked = isVisible;
            
            // Mettre à jour l'indicateur de plateforme
            const platformIndicator = document.querySelector(`.platform-indicator[data-product="${actorName}"]`);
            if (platformIndicator) {
                platformIndicator.checked = isVisible;
            }
            
            // Gérer le lastCheckedCheckbox
            if (isVisible && checkbox.classList.contains('single-checkbox')) {
                if (lastCheckedCheckbox && lastCheckedCheckbox !== checkbox) {
                    lastCheckedCheckbox.checked = false;
                }
                lastCheckedCheckbox = checkbox;
            }
        } catch (error) {
            console.log(`Error syncing state for ${actorName}:`, error);
        }
    }
}

// Synchroniser périodiquement les états
const SYNC_INTERVAL = 1000; // 1 seconde
setInterval(syncIndicatorStates, SYNC_INTERVAL);

function playAnimation(actorName, animation) {
    window.parent.postMessage(JSON.stringify({ action: "playAnimation", actor: actorName, animation: animation }), "*");
}

function stopAnimation(actorName, animation) {
    window.parent.postMessage(JSON.stringify({ action: "stopAnimation", actor: actorName, animation: animation }), "*");
}

function teleport(actorName) {
    window.parent.postMessage(JSON.stringify({ action: "teleport", actor: actorName }), "*");
}

function saveCheckboxState() {
    document.querySelectorAll('.single-checkbox').forEach(checkbox => {
        localStorage.setItem(checkbox.id, checkbox.checked);
    });
}

function loadCheckboxState() {
    document.querySelectorAll('.single-checkbox').forEach(async checkbox => {
        const actorName = checkbox.id;
        try {
            const isVisible = await getActorVisibility(actorName);
            checkbox.checked = isVisible;
            
            // Mettre à jour l'indicateur de plateforme
            const platformIndicator = document.querySelector(`.platform-indicator[data-product="${actorName}"]`);
            if (platformIndicator) {
                platformIndicator.checked = isVisible;
            }
            
            if (isVisible && checkbox.classList.contains('single-checkbox')) {
                if (!document.getElementById('multi-checkbox-page')) {
                    lastCheckedCheckbox = checkbox;
                }
            }
        } catch (error) {
            console.log(`Error loading state for ${actorName}:`, error);
        }
    });
}

// Gestionnaires d'événements pour les checkboxes
document.querySelectorAll('.single-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        let actorName = this.id;
        if (this.checked) {
            toggleVisibility(actorName, true);
            if (lastCheckedCheckbox && lastCheckedCheckbox !== this && !document.getElementById('multi-checkbox-page')) {
                let previousActorName = lastCheckedCheckbox.id;
                lastCheckedCheckbox.checked = false;
                toggleVisibility(previousActorName, false);
                
                // Mettre à jour l'indicateur précédent
                const prevIndicator = document.querySelector(`.platform-indicator[data-product="${previousActorName}"]`);
                if (prevIndicator) {
                    prevIndicator.checked = false;
                }
            }
            if (!document.getElementById('multi-checkbox-page')) {
                lastCheckedCheckbox = this;
            }
        } else {
            toggleVisibility(actorName, false);
            if (lastCheckedCheckbox === this && !document.getElementById('multi-checkbox-page')) {
                lastCheckedCheckbox = null;
            }
        }
        
        // Mettre à jour l'indicateur correspondant
        const platformIndicator = document.querySelector(`.platform-indicator[data-product="${actorName}"]`);
        if (platformIndicator) {
            platformIndicator.checked = this.checked;
        }
        
        saveCheckboxState();
    });
});

document.querySelectorAll('.multi-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        let actorName = this.id;
        toggleVisibility(actorName, this.checked);
        saveCheckboxState();
    });
});

document.querySelectorAll('.location-button').forEach(radio => {
    radio.addEventListener('change', function() {
        if (this.checked) {
            if (lastCheckedRadio && lastCheckedRadio !== this) {
                lastCheckedRadio.checked = false;
            }
            lastCheckedRadio = this;
        }
    });
});

// Point Cloud functions
function togglePointCloud() {
    const button = document.getElementById('toggle-button');
    isPointCloudOn = !isPointCloudOn;
    
    if (isPointCloudOn) {
        button.value = 'Point Cloud ON';
        button.classList.add('on');
        button.classList.remove('off');
        showPointCloud();
    } else {
        button.value = 'Point Cloud OFF';
        button.classList.add('off');
        button.classList.remove('on');
        hidePointCloud();
    }
}

function showPointCloud() {
    toggleVisibility("3DFactory 3D Model", false);
    toggleVisibility("3DFactory Point Cloud Model", true);
}

function hidePointCloud() {
    toggleVisibility("3DFactory Point Cloud Model", false);
    toggleVisibility("3DFactory 3D Model", true);
}

function toggleDHPointCloud() {
    const button = document.getElementById('toggle-button');
    isPointCloudOn = !isPointCloudOn;
    
    if (isPointCloudOn) {
        button.value = 'Point Cloud ON';
        button.classList.add('on');
        button.classList.remove('off');
        showDHPointCloud();
    } else {
        button.value = 'Point Cloud OFF';
        button.classList.add('off');
        button.classList.remove('on');
        hideDHPointCloud();
    }
}

function showDHPointCloud() {
    toggleVisibility("Dollhouse 3D Model", false);
    toggleVisibility("Dollhouse Point Cloud Model", true);
}

function hideDHPointCloud() {
    toggleVisibility("Dollhouse Point Cloud Model", false);
    toggleVisibility("Dollhouse 3D Model", true);
}

function initializePointCloudState() {
    const button = document.getElementById('toggle-button');
    const currentFileName = window.location.pathname.split('/').pop();
    if (currentFileName === 'dh_menu.html') {
        button.value = 'Point Cloud ON';
        button.classList.add('on');
        showDHPointCloud();
    } else {
        button.value = 'Point Cloud OFF';
        button.classList.add('off');
        hidePointCloud();
    }
}

// Navigation functions
function openASISMenu() {
    window.location.href = "asis_menu.html";
}

function openQSMenu() {
    window.location.href = "qs_menu.html";
}

function openMain() {
    window.location.href = "main_test.html";
}

function openTOBEMenu() {
    window.location.href = "tobe_menu.html";
}

function openOptionsMenu() {
    window.location.href = "options_menu.html";
}

function openDHMenu() {
    window.location.href = "dh_menu.html";
}

function openTVMenu() {
    window.location.href = "tv_menu.html";
}

function openMapMenu() {
    window.location.href = "map_menu.html";
}

// Simulation functions
function playSimulation() {
    var selectedSimulation = document.getElementById('simulation-select').value;
    var animationName = document.getElementById('simulation-select').value + ' Animation';
    playAnimation(selectedSimulation, animationName);
}

function stopSimulation() {
    var selectedSimulation = document.getElementById('simulation-select').value;
    var animationName = document.getElementById('simulation-select').value + ' Animation';
    stopAnimation(selectedSimulation, animationName);
}

function confirmTeleport() {
    if (lastCheckedRadio) {
        teleport(lastCheckedRadio.value);
        openMain();
    } else {
        alert("Please select a location first!");
    }
}

// Initialize on load
window.addEventListener('load', () => {
    loadCheckboxState();
    initializePointCloudState();
});