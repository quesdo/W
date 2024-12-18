const OPTIONS_IMPACT = {
    amr: { quality: -0.6, capacity: +5.3, delivery: +0.7 },
    ar: { quality: -0.6, capacity: +6.3, delivery: +0.7 },
    kitting: { quality: -0.6, capacity: +3.3, delivery: +0.7 },
    assembly: { quality: -0.6, capacity: +3.3, delivery: +0.7 },
    mes: { quality: -0.6, capacity: +3.3, delivery: +0.7 },
    pick: { quality: -0.6, capacity: +3.6, delivery: +0.7 },
    line: { quality: -0.5, capacity: +0, delivery: +0.8 }
};

const ACRONYM_DEFINITIONS = {
    amr: "Autonomous Mobile Robot",
    ar: "Augmented Reality",
    kitting: "Kit Preparation Process",
    assembly: "Assembly Line Optimization",
    mes: "Manufacturing Execution System",
    pick: "Pick-to-Light System",
    line: "Production Line Balancing"
};

class DashboardSync {
    constructor(supabase) {
        this.supabase = supabase;
        this.switchStates = {
            amr: false,
            ar: false,
            kitting: false,
            assembly: false,
            mes: false,
            pick: false,
            line: false
        };

        this.metrics = {
            quality: 4.0,
            capacity: 37,
            delivery: 93
        };

        this.initializeSupabase();
        this.initializeEventListeners();
        this.initializeDisplay();
    }

    async initializeSupabase() {
        try {
            // Récupérer l'état initial
            const { data, error } = await this.supabase
                .from('dashboard_state')
                .select('*')
                .single();

            if (error) throw error;

            if (data) {
                this.switchStates = data.levers;
                this.calculateMetrics();
            }

            // Configurer les écouteurs en temps réel
            this.supabase
                .channel('dashboard_changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'dashboard_state'
                    },
                    (payload) => {
                        console.log('Received real-time update:', payload);
                        this.switchStates = payload.new.levers;
                        this.calculateMetrics();
                        this.updateDisplay();
                    }
                )
                .subscribe();

            // Cacher l'écran de chargement
            document.getElementById('loading').style.display = 'none';
            this.updateDisplay();
        } catch (error) {
            console.error('Error initializing Supabase:', error);
            alert('Error loading dashboard state. Please refresh the page.');
        }
    }

    initializeDisplay() {
        const indicators = ['quality', 'capacity', 'delivery'];
        const indicatorsContainer = document.getElementById('indicators');
        
        indicators.forEach(key => {
            const progressDiv = this.createProgressBar(key);
            indicatorsContainer.appendChild(progressDiv);
        });

        this.updateDisplay();
    }

    createProgressBar(key) {
        const config = this.getIndicatorConfig(key);
        const div = document.createElement('div');
        div.className = 'text-center px-8';
        div.innerHTML = `
            <h3 class="indicator-title">${config.title}</h3>
            <div class="vertical-progress">
                <div class="vertical-fill" data-metric="${key}" style="height: ${config.initialHeight}%; background-color: #005386;">
                    ${this.metrics[key].toFixed(1)}${config.unit}
                </div>
                <div class="target-line" style="bottom: ${config.targetLine}%">
                    <span class="target-label">Target: ${config.target}${config.unit}</span>
                </div>
            </div>
            <div class="base-value">Base: ${config.base}${config.unit}</div>
        `;
        return div;
    }

    getIndicatorConfig(key) {
        const configs = {
            quality: {
                title: 'Quality',
                target: 0.1,
                base: 4.0,
                unit: ' scrap/day',
                initialHeight: (4.0 / 4.0) * 100,
                targetLine: 97.5
            },
            capacity: {
                title: 'Capacity',
                target: 60,
                base: 37,
                unit: '/h',
                initialHeight: (37 / 70) * 100,
                targetLine: 85.7
            },
            delivery: {
                title: 'Delivery',
                target: 98,
                base: 93,
                unit: '%',
                initialHeight: 93,
                targetLine: 98
            }
        };
        return configs[key];
    }

    initializeEventListeners() {
        const leversContainer = document.getElementById('levers');
        Object.keys(this.switchStates).forEach(lever => {
            const button = this.createLeverButton(lever);
            leversContainer.appendChild(button);
        });
    }

    createLeverButton(lever) {
        const button = document.createElement('div');
        button.className = 'lever-button flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer relative';
        button.innerHTML = `
            <div class="relative">
                <span class="text-base font-medium text-gray-700">${lever.toUpperCase()}</span>
            </div>
            <div class="w-12 h-6 rounded-full p-1 ${this.switchStates[lever] ? 'bg-[#005386]' : 'bg-gray-300'}" data-switch="${lever}">
                <div class="w-4 h-4 bg-white rounded-full transform transition-transform ${this.switchStates[lever] ? 'translate-x-6' : ''}"></div>
            </div>
            <div class="tooltip">
                ${ACRONYM_DEFINITIONS[lever]}
            </div>
        `;
        
        button.addEventListener('click', () => this.handleLeverClick(lever));
        return button;
    }

    async handleLeverClick(lever) {
        try {
            const newState = !this.switchStates[lever];
            console.log("[WebView] Lever clicked:", lever, "New state:", newState);

            const updatedLevers = {
                ...this.switchStates,
                [lever]: newState
            };

            // Mettre à jour Supabase
            const { error } = await this.supabase
                .from('dashboard_state')
                .update({
                    levers: updatedLevers
                })
                .eq('id', 1);

            if (error) throw error;

            // L'interface sera mise à jour via le listener en temps réel
        } catch (error) {
            console.error('Error updating lever state:', error);
            alert('Error updating dashboard. Please try again.');
        }
    }

    calculateMetrics() {
        let newMetrics = {
            quality: 4.0,
            capacity: 37,
            delivery: 93
        };

        Object.entries(this.switchStates).forEach(([lever, isActive]) => {
            if (isActive) {
                const impact = OPTIONS_IMPACT[lever];
                newMetrics.quality = Math.max(0.1, newMetrics.quality + impact.quality);
                newMetrics.capacity = Math.min(70, newMetrics.capacity + impact.capacity);
                newMetrics.delivery = Math.min(98, newMetrics.delivery + impact.delivery);
            }
        });

        this.metrics = newMetrics;
    }

    updateDisplay() {
        // Mettre à jour les indicateurs
        Object.entries(this.metrics).forEach(([key, value]) => {
            const progressElement = document.querySelector(`[data-metric="${key}"]`);
            if (progressElement) {
                const config = this.updateDisplay() {
        // Mettre à jour les indicateurs
        Object.entries(this.metrics).forEach(([key, value]) => {
            const progressElement = document.querySelector(`[data-metric="${key}"]`);
            if (progressElement) {
                const config = this.getIndicatorConfig(key);
                const maxValue = key === 'quality' ? 4.0 : key === 'capacity' ? 70 : 100;
                const height = (value / maxValue) * 100;
                const isTargetReached = key === 'quality' ? 
                    value <= config.target : 
                    value >= config.target;
                const color = isTargetReached ? '#6EBE44' : '#005386';
                
                progressElement.style.height = `${height}%`;
                progressElement.style.backgroundColor = color;
                progressElement.textContent = value.toFixed(1) + config.unit;
            }
        });

        // Mettre à jour les boutons des leviers
        Object.entries(this.switchStates).forEach(([lever, state]) => {
            const switchElement = document.querySelector(`[data-switch="${lever}"]`);
            if (switchElement) {
                switchElement.className = `w-12 h-6 rounded-full p-1 ${state ? 'bg-[#005386]' : 'bg-gray-300'}`;
                const toggleElement = switchElement.querySelector('div');
                toggleElement.className = `w-4 h-4 bg-white rounded-full transform transition-transform ${state ? 'translate-x-6' : ''}`;
            }
        });
    }

    getProgressColor(current, target, isQuality = false) {
        const isTargetReached = isQuality ? current <= target : current >= target;
        return isTargetReached ? '#6EBE44' : '#005386';
    }
}

// Initialisation globale
window.initializeDashboard = (supabase) => {
    console.log("[WebView] Initializing dashboard with Supabase");
    window.dashboardSync = new DashboardSync(supabase);
};