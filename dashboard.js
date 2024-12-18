const OPTIONS_IMPACT = {
    amr: { quality: -0.6, capacity: +5.3, delivery: +0.7 },
    ar: { quality: -0.6, capacity: +6.3, delivery: +0.7 },
    kitting: { quality: -0.6, capacity: +3.3, delivery: +0.7 },
    assembly: { quality: -0.6, capacity: +3.3, delivery: +0.7 },
    mes: { quality: -0.6, capacity: +3.3, delivery: +0.7 },
    pick: { quality: -0.6, capacity: +3.6, delivery: +0.7 },
    line: { quality: -0.5, capacity: +0, delivery: +0.8 }
};

let switchStates = {
    amr: false,
    ar: false,
    kitting: false,
    assembly: false,
    mes: false,
    pick: false,
    line: false
};

let metrics = {
    quality: 4.0,
    capacity: 37,
    delivery: 93
};

// Sauvegarder l'état dans Supabase
async function saveStateToSupabase() {
    const { error } = await supabase
        .from('dashboard_state')
        .upsert([{ id: 1, switchStates }]);
    if (error) console.error('Erreur lors de la sauvegarde :', error);
}

// Charger l'état depuis Supabase
async function loadStateFromSupabase() {
    const { data, error } = await supabase
        .from('dashboard_state')
        .select('switchStates')
        .eq('id', 1)
        .single();
    if (data) {
        switchStates = data.switchStates;
        updateDisplay();
    } else if (error) console.error('Erreur lors du chargement :', error);
}

// Gérer les clics sur les leviers
function handleLeverClick(lever) {
    switchStates[lever] = !switchStates[lever];
    calculateMetrics();
    updateDisplay();
    saveStateToSupabase();
}

// Mettre à jour les métriques
function calculateMetrics() {
    metrics = {
        quality: 4.0,
        capacity: 37,
        delivery: 93
    };

    Object.keys(switchStates).forEach(lever => {
        if (switchStates[lever]) {
            metrics.quality += OPTIONS_IMPACT[lever].quality;
            metrics.capacity += OPTIONS_IMPACT[lever].capacity;
            metrics.delivery += OPTIONS_IMPACT[lever].delivery;
        }
    });
}

// Mettre à jour l'affichage
function updateDisplay() {
    document.getElementById('indicators').innerHTML = '';
    Object.keys(metrics).forEach(key => {
        const div = document.createElement('div');
        div.textContent = `${key.toUpperCase()}: ${metrics[key].toFixed(1)}`;
        document.getElementById('indicators').appendChild(div);
    });

    const leversContainer = document.getElementById('levers');
    leversContainer.innerHTML = '';
    Object.keys(switchStates).forEach(lever => {
        const button = document.createElement('button');
        button.textContent = lever.toUpperCase();
        button.onclick = () => handleLeverClick(lever);
        leversContainer.appendChild(button);
    });
}

// Charger l'état au démarrage
document.addEventListener('DOMContentLoaded', loadStateFromSupabase);
