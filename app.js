// Gym Tracker Application
class GymTracker {
    constructor() {
        this.exercises = JSON.parse(localStorage.getItem('gym_exercises')) || [];
        this.mesocycles = JSON.parse(localStorage.getItem('gym_mesocycles')) || [];
        this.sessions = JSON.parse(localStorage.getItem('gym_sessions')) || [];
        this.currentSession = null;
        this.currentSetExercise = null;
        this.currentMesoDetail = null;
        this.selectedMesoExercises = new Set(); // Para mantener selecciones persistentes
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDateDisplay();
        this.renderExercises();
        this.renderMesocycles();
        this.updateStats();
        this.updateMesocycleSelect();
        this.updateStatsExerciseSelect();
        this.renderPersonalRecords();
        this.updateSplitInfo();
        this.checkForUpdates();
    }

    // Check for app updates and reload if necessary
    checkForUpdates() {
        // Check if we need to reload (set by service worker)
        if (localStorage.getItem('gym_app_updated') === 'true') {
            localStorage.removeItem('gym_app_updated');
            console.log('App updated, reloading...');
            window.location.reload();
        }
    }

    // ==================== UTILIDADES ====================
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    saveToStorage() {
        localStorage.setItem('gym_exercises', JSON.stringify(this.exercises));
        localStorage.setItem('gym_mesocycles', JSON.stringify(this.mesocycles));
        localStorage.setItem('gym_sessions', JSON.stringify(this.sessions));
    }

    updateDateDisplay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', options);
    }

    // ==================== EJERCICIOS ====================
    setupEventListeners() {
        // Navegación por tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabBtn = e.currentTarget;
                this.switchTab(tabBtn.dataset.tab);
            });
        });

        // Formulario de ejercicios
        document.getElementById('exercise-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExercise();
        });

        // Formulario de edición
        document.getElementById('edit-exercise-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateExercise();
        });

        // Búsqueda y filtros de ejercicios
        document.getElementById('exercise-search').addEventListener('input', () => this.renderExercises());
        document.getElementById('exercise-filter').addEventListener('change', () => this.renderExercises());

        // Formulario de mesociclos
        document.getElementById('mesocycle-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMesocycle();
        });

        // Búsqueda de ejercicios en mesociclo
        document.getElementById('meso-exercise-search').addEventListener('input', () => this.renderMesoExercisesList());

        // Filtro por categoría/zona muscular en mesociclo
        document.getElementById('meso-exercise-filter').addEventListener('change', () => this.renderMesoExercisesList());

        // Cambio de modo de división
        document.getElementById('meso-split').addEventListener('change', () => this.updateSplitInfo());

        // Select de estadísticas
        document.getElementById('stats-exercise-select').addEventListener('change', (e) => {
            this.renderExerciseChart(e.target.value);
        });

        // Cálculo de peso en modal de set
        document.getElementById('set-percentage').addEventListener('input', () => this.updateCalculatedWeight());

        // Cerrar modales al hacer click fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Prevent default en cualquier submit no manejado para evitar recargas
        document.addEventListener('submit', (e) => {
            const form = e.target;
            // Solo prevenir si el formulario no tiene handler específico
            if (!form.hasAttribute('data-has-handler')) {
                e.preventDefault();
                console.warn('Submit no manejado detectado y prevenido:', form);
            }
        }, true);

        // Cambio de mesociclo activo - limpiar sesión actual
        document.getElementById('active-mesocycle').addEventListener('change', () => {
            if (this.currentSession) {
                this.currentSession = null;
                localStorage.removeItem('gym_current_session');
                this.renderSession();
            }
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');

        // Actualizar datos específicos del tab
        if (tabId === 'exercises') {
            this.renderExercises();
        } else if (tabId === 'mesocycles') {
            this.renderMesoExercisesList();
        } else if (tabId === 'session') {
            this.updateMesocycleSelect();
            // Cargar sesión anterior automáticamente si existe
            const savedSession = localStorage.getItem('gym_current_session');
            if (savedSession) {
                this.loadPreviousSession();
            }
        } else if (tabId === 'stats') {
            this.updateStats();
            this.updateStatsExerciseSelect();
            this.renderPersonalRecords();
            this.updateSessionHistoryFilters();
            this.renderSessionsHistory();
        } else if (tabId === 'backup') {
            this.updateBackupStats();
        }
    }

    addExercise() {
        const name = document.getElementById('exercise-name').value.trim();
        const categories = Array.from(document.querySelectorAll('input[name="exercise-category"]:checked')).map(cb => cb.value);
        const rm = parseFloat(document.getElementById('exercise-rm').value);
        const favorite = document.getElementById('exercise-favorite').checked;

        if (categories.length === 0) {
            this.showNotification('Selecciona al menos una categoría', 'warning');
            return;
        }

        const exercise = {
            id: this.generateId(),
            name,
            categories,
            rm,
            favorite,
            createdAt: new Date().toISOString()
        };

        this.exercises.push(exercise);
        this.saveToStorage();
        
        document.getElementById('exercise-form').reset();
        this.renderExercises();
        this.renderMesoExercisesList();
        this.updateStats();
        this.updateStatsExerciseSelect();

        this.showNotification('Ejercicio guardado correctamente', 'success');
    }

    renderExercises() {
        const searchTerm = document.getElementById('exercise-search').value.toLowerCase();
        const filter = document.getElementById('exercise-filter').value;
        
        // Migrar datos antiguos si es necesario
        this.migrateExercisesData();
        
        let filtered = this.exercises.filter(ex => {
            const matchesSearch = ex.name.toLowerCase().includes(searchTerm);
            const matchesFilter = filter === 'all' || 
                                 (filter === 'favorites' && ex.favorite) ||
                                 (ex.categories && ex.categories.includes(filter)) ||
                                 (ex.category === filter); // Compatibilidad hacia atrás
            return matchesSearch && matchesFilter;
        });

        const container = document.getElementById('exercises-list');
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron ejercicios</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(ex => `
            <div class="exercise-card ${ex.favorite ? 'favorite' : ''}">
                <button type="button" class="favorite-btn ${ex.favorite ? 'active' : ''}" onclick="gymTracker.toggleFavorite('${ex.id}')">
                    <i class="fas fa-star"></i>
                </button>
                <div class="exercise-header">
                    <h4>${ex.name}</h4>
                </div>
                <span class="category-badge">${this.getCategoryNames(ex.categories || [ex.category])}</span>
                <div class="rm-value">
                    ${ex.rm} <span>kg 1RM</span>
                </div>
                <div class="exercise-actions">
                    <button type="button" class="btn-icon" onclick="gymTracker.editExercise('${ex.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn-icon" onclick="gymTracker.deleteExercise('${ex.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    migrateExercisesData() {
        let needsMigration = false;
        this.exercises.forEach(ex => {
            if (ex.category && !ex.categories) {
                ex.categories = [ex.category];
                delete ex.category;
                needsMigration = true;
            }
        });
        if (needsMigration) {
            this.saveToStorage();
        }
    }

    getCategoryName(category) {
        const categories = {
            pecho: 'Pecho',
            espalda: 'Espalda',
            hombros: 'Hombros',
            brazos: 'Brazos',
            piernas: 'Piernas',
            core: 'Core',
            otros: 'Otros',
            tiron: 'Tirón',
            empuje: 'Empuje'
        };
        return categories[category] || category;
    }

    getCategoryNames(categories) {
        if (!categories || categories.length === 0) return '';
        return categories.map(cat => this.getCategoryName(cat)).join(', ');
    }

    toggleFavorite(id) {
        const exercise = this.exercises.find(e => e.id === id);
        if (exercise) {
            exercise.favorite = !exercise.favorite;
            this.saveToStorage();
            this.renderExercises();
        }
    }

    editExercise(id) {
        const exercise = this.exercises.find(e => e.id === id);
        if (!exercise) return;

        // Migrar datos antiguos si es necesario
        if (exercise.category && !exercise.categories) {
            exercise.categories = [exercise.category];
            delete exercise.category;
            this.saveToStorage();
        }

        document.getElementById('edit-exercise-id').value = exercise.id;
        document.getElementById('edit-exercise-name').value = exercise.name;
        document.getElementById('edit-exercise-rm').value = exercise.rm;
        document.getElementById('edit-exercise-favorite').checked = exercise.favorite;

        // Configurar checkboxes de categorías
        const checkboxes = document.querySelectorAll('input[name="edit-exercise-category"]');
        checkboxes.forEach(cb => {
            cb.checked = exercise.categories && exercise.categories.includes(cb.value);
        });

        document.getElementById('edit-modal').classList.add('active');
    }

    updateExercise() {
        const id = document.getElementById('edit-exercise-id').value;
        const exercise = this.exercises.find(e => e.id === id);
        
        if (exercise) {
            const newName = document.getElementById('edit-exercise-name').value.trim();
            const newCategories = Array.from(document.querySelectorAll('input[name="edit-exercise-category"]:checked')).map(cb => cb.value);
            const newRM = parseFloat(document.getElementById('edit-exercise-rm').value);
            const newFavorite = document.getElementById('edit-exercise-favorite').checked;

            if (newCategories.length === 0) {
                this.showNotification('Selecciona al menos una categoría', 'warning');
                return;
            }
            
            exercise.name = newName;
            exercise.categories = newCategories;
            exercise.rm = newRM;
            exercise.favorite = newFavorite;
            delete exercise.category; // Eliminar campo antiguo si existe
            
            // Actualizar el 1RM en todos los mesociclos que contienen este ejercicio
            this.mesocycles.forEach(meso => {
                meso.exercises.forEach(mesoEx => {
                    if (mesoEx.exerciseId === id || mesoEx.id === id) {
                        mesoEx.name = newName;
                        mesoEx.categories = [...newCategories];
                        mesoEx.rm = newRM;
                        delete mesoEx.category;
                    }
                });
            });
            
            // Actualizar el 1RM en todas las sesiones completadas que contienen este ejercicio
            this.sessions.forEach(session => {
                session.exercises.forEach(sessionEx => {
                    if (sessionEx.exerciseId === id || sessionEx.id === id) {
                        sessionEx.name = newName;
                        sessionEx.categories = [...newCategories];
                        sessionEx.rm = newRM;
                        delete sessionEx.category;
                    }
                });
            });
            
            // Actualizar el 1RM en la sesión actualmente cargada (si existe)
            if (this.currentSession) {
                this.currentSession.exercises.forEach(sessionEx => {
                    if (sessionEx.exerciseId === id || sessionEx.id === id) {
                        sessionEx.name = newName;
                        sessionEx.categories = [...newCategories];
                        sessionEx.rm = newRM;
                        delete sessionEx.category;
                        
                        // Recalcular el peso sugerido de cada serie basado en el nuevo 1RM
                        sessionEx.sets.forEach(set => {
                            if (set.percentage) {
                                set.suggestedWeight = Math.round(newRM * (set.percentage / 100));
                                // Solo actualizar el peso si no ha sido modificado manualmente (si coincide con el peso sugerido anterior)
                                const oldSuggestedWeight = Math.round(exercise.rm * (set.percentage / 100));
                                if (set.weight === oldSuggestedWeight || !set.weight) {
                                    set.weight = set.suggestedWeight;
                                }
                            }
                        });
                    }
                });
                // Guardar la sesión actual en localStorage
                localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
            }
            
            this.saveToStorage();
            this.renderExercises();
            this.renderMesoExercisesList();
            this.closeModal('edit-modal');
            this.showNotification('Ejercicio actualizado', 'success');
        }
    }

    deleteExercise(id) {
        if (confirm('¿Estás seguro de eliminar este ejercicio?')) {
            this.exercises = this.exercises.filter(e => e.id !== id);
            this.saveToStorage();
            this.renderExercises();
            this.renderMesoExercisesList();
            this.updateStats();
            this.updateStatsExerciseSelect();
            this.showNotification('Ejercicio eliminado', 'success');
        }
    }

    // ==================== CALCULADORA 1RM ====================
    calculateRM() {
        const weight = parseFloat(document.getElementById('calc-weight').value);
        const reps = parseInt(document.getElementById('calc-reps').value);

        if (!weight || !reps) {
            this.showNotification('Ingresa peso y repeticiones', 'warning');
            return;
        }

        // Fórmula de Brzycki
        const rm = Math.round(weight / (1.0278 - 0.0278 * reps));

        document.getElementById('rm-value').textContent = rm;
        document.getElementById('rm-95').textContent = Math.round(rm * 0.95);
        document.getElementById('rm-90').textContent = Math.round(rm * 0.90);
        document.getElementById('rm-85').textContent = Math.round(rm * 0.85);
        document.getElementById('rm-80').textContent = Math.round(rm * 0.80);
        document.getElementById('rm-75').textContent = Math.round(rm * 0.75);
        document.getElementById('rm-70').textContent = Math.round(rm * 0.70);

        document.getElementById('rm-result').classList.remove('hidden');
    }

    // ==================== CONFIGURACIÓN DE MODOS DE DIVISIÓN ====================
    getSplitConfig() {
        return {
            fullbody: {
                name: 'Full Body',
                description: 'Trabaja todo el cuerpo en cada sesión. Ideal para principiantes o entrenamiento frecuente.',
                sessions: [
                    { name: 'Full Body', categories: ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core'] }
                ]
            },
            'torso-pierna': {
                name: 'Torso / Pierna',
                description: 'Alterna entre sesiones de torso (pecho, espalda, hombros, brazos) y piernas.',
                sessions: [
                    { name: 'Torso', categories: ['pecho', 'espalda', 'hombros', 'brazos'] },
                    { name: 'Pierna', categories: ['piernas', 'core'] }
                ]
            },
            'tir-emp-pie': {
                name: 'Tirón / Empuje / Pierna',
                description: 'Divide en tres grupos: Tirón (espalda, bíceps), Empuje (pecho, hombros, tríceps), Pierna.',
                sessions: [
                    { name: 'Tirón', categories: ['tiron'] },
                    { name: 'Empuje', categories: ['empuje'] },
                    { name: 'Pierna', categories: ['piernas'] }
                ]
            },
            'tir-emp-pie-brazos': {
                name: 'Tirón / Empuje / Pierna / Brazos',
                description: 'Añade un día específico para brazos al clásico PPL.',
                sessions: [
                    { name: 'Tirón', categories: ['espalda'] },
                    { name: 'Empuje', categories: ['pecho', 'hombros'] },
                    { name: 'Pierna', categories: ['piernas', 'core'] },
                    { name: 'Brazos', categories: ['brazos'] }
                ]
            },
            'weider-5': {
                name: 'Weider 5 días',
                description: 'División clásica: Pecho, Espalda, Hombros, Piernas, Brazos.',
                sessions: [
                    { name: 'Pecho', categories: ['pecho'] },
                    { name: 'Espalda', categories: ['espalda'] },
                    { name: 'Hombros', categories: ['hombros'] },
                    { name: 'Piernas', categories: ['piernas', 'core'] },
                    { name: 'Brazos', categories: ['brazos'] }
                ]
            },
            'weider-6': {
                name: 'Weider 6 días',
                description: 'División intensiva: Pecho, Espalda, Hombros, Piernas, Brazos, Full Body o Descarga.',
                sessions: [
                    { name: 'Pecho', categories: ['pecho'] },
                    { name: 'Espalda', categories: ['espalda'] },
                    { name: 'Hombros', categories: ['hombros'] },
                    { name: 'Piernas', categories: ['piernas'] },
                    { name: 'Brazos', categories: ['brazos'] },
                    { name: 'Full Body', categories: ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core'] }
                ]
            },
            'personalizado': {
                name: 'Personalizado',
                description: 'Selecciona manualmente los ejercicios para cada sesión.',
                sessions: []
            }
        };
    }

    getSessionNameForSplit(split, sessionNumber) {
        const config = this.getSplitConfig()[split];
        if (!config || config.sessions.length === 0) return `Sesión ${sessionNumber}`;
        
        // Ciclar según el número de sesiones configuradas
        const sessionIndex = (sessionNumber - 1) % config.sessions.length;
        return config.sessions[sessionIndex].name;
    }

    getCategoriesForSplit(split, sessionNumber) {
        const config = this.getSplitConfig()[split];
        if (!config || config.sessions.length === 0) return null;
        
        // Ciclar según el número de sesiones configuradas
        const sessionIndex = (sessionNumber - 1) % config.sessions.length;
        return config.sessions[sessionIndex].categories;
    }

    getSessionsPerWeek(split) {
        const config = this.getSplitConfig()[split];
        if (!config || config.sessions.length === 0) return 1;
        return config.sessions.length;
    }

    // Genera un orden aleatorio de ejercicios para todo el mesociclo
    getMesocycleExerciseOrder(mesoId, exercises, seed) {
        const storageKey = `gym_meso_order_${mesoId}`;
        const savedOrder = localStorage.getItem(storageKey);
        
        if (savedOrder) {
            const order = JSON.parse(savedOrder);
            // Reconstruir el array de ejercicios en el orden guardado
            const orderedExercises = order.map(id => exercises.find(ex => ex.exerciseId === id || ex.id === id)).filter(Boolean);
            
            // Añadir ejercicios nuevos que no estaban en el orden guardado
            const orderedIds = new Set(order);
            const newExercises = exercises.filter(ex => !orderedIds.has(ex.exerciseId) && !orderedIds.has(ex.id));
            
            if (newExercises.length > 0) {
                // Mezclar los nuevos ejercicios aleatoriamente
                const random = this.seededRandom(Date.now());
                for (let i = newExercises.length - 1; i > 0; i--) {
                    const j = Math.floor(random() * (i + 1));
                    [newExercises[i], newExercises[j]] = [newExercises[j], newExercises[i]];
                }
                // Añadir al final y actualizar el orden guardado
                orderedExercises.push(...newExercises);
                const updatedOrderIds = orderedExercises.map(ex => ex.exerciseId || ex.id);
                localStorage.setItem(storageKey, JSON.stringify(updatedOrderIds));
            }
            
            return orderedExercises;
        }
        
        // Si no hay orden guardado, generar uno aleatorio
        const shuffled = [...exercises];
        // Fisher-Yates shuffle con seed
        const random = this.seededRandom(seed ? seed.split('').reduce((a,b)=>a+b.charCodeAt(0),0) : Date.now());
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Guardar el orden
        const orderIds = shuffled.map(ex => ex.exerciseId || ex.id);
        localStorage.setItem(storageKey, JSON.stringify(orderIds));
        
        return shuffled;
    }

    seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    // Calcula el número de semana real basado en sessionsPerWeek
    getWeekNumber(sessionNumber, sessionsPerWeek) {
        return Math.ceil(sessionNumber / sessionsPerWeek);
    }

    // Obtiene el tipo de semana (Acumulación, Intensificación, etc.) basado en la semana real
    getWeekType(weekNumber) {
        const cyclePosition = ((weekNumber - 1) % 4) + 1;
        switch(cyclePosition) {
            case 1: return 'Acumulación';
            case 2: return 'Intensificación';
            case 3: return 'Realización';
            case 4: return 'Descarga';
            default: return `Semana ${weekNumber}`;
        }
    }

    // ==================== MESOCICLOS ====================
    renderMesoExercisesList() {
        const searchTerm = document.getElementById('meso-exercise-search').value.toLowerCase();
        const categoryFilter = document.getElementById('meso-exercise-filter').value;
        const container = document.getElementById('meso-exercises-list');
        
        let filtered = this.exercises.filter(ex => {
            const matchesSearch = ex.name.toLowerCase().includes(searchTerm);
            
            // Manejar filtro de favoritos
            if (categoryFilter === 'favorites') {
                return matchesSearch && ex.favorite;
            }
            
            const categories = ex.categories || (ex.category ? [ex.category] : []);
            const matchesCategory = categoryFilter === 'all' || categories.includes(categoryFilter);
            return matchesSearch && matchesCategory;
        });

        if (filtered.length === 0) {
            let message = 'No hay ejercicios disponibles';
            if (categoryFilter === 'favorites') {
                message = 'No tienes ejercicios favoritos';
            } else if (categoryFilter !== 'all') {
                message = `No hay ejercicios en la categoría "${this.getCategoryName(categoryFilter)}"`;
            }
            container.innerHTML = `<p class="text-center" style="color: var(--text-secondary); padding: 20px;">${message}</p>`;
            this.updateMesoSelectedCount();
            return;
        }

        container.innerHTML = filtered.map(ex => {
            const isSelected = this.selectedMesoExercises.has(ex.id);
            const categories = ex.categories || (ex.category ? [ex.category] : []);
            const categoryStr = categories.join(',');
            return `
            <label class="checkbox-exercise-item">
                <input type="checkbox" value="${ex.id}" data-name="${ex.name}" data-rm="${ex.rm}" data-category="${categoryStr}" 
                       ${isSelected ? 'checked' : ''} onchange="gymTracker.toggleMesoExerciseSelection(this)">
                <div class="exercise-info">
                    <div class="exercise-name">${ex.name} ${ex.favorite ? '⭐' : ''}</div>
                    <div class="exercise-rm">1RM: ${ex.rm}kg - ${this.getCategoryNames(categories)}</div>
                </div>
            </label>
        `}).join('');
        
        this.updateMesoSelectedCount();
    }
    
    toggleMesoExerciseSelection(checkbox) {
        const exerciseId = checkbox.value;
        if (checkbox.checked) {
            this.selectedMesoExercises.add(exerciseId);
        } else {
            this.selectedMesoExercises.delete(exerciseId);
        }
        this.updateMesoSelectedCount();
    }
    
    updateMesoSelectedCount() {
        const count = this.selectedMesoExercises.size;
        const countEl = document.getElementById('meso-selected-count');
        if (countEl) {
            countEl.textContent = `(${count} seleccionados)`;
        }
    }
    
    selectAllMesoExercises() {
        const checkboxes = document.querySelectorAll('#meso-exercises-list input[type="checkbox"]');
        checkboxes.forEach(cb => {
            if (!cb.checked) {
                cb.checked = true;
                this.selectedMesoExercises.add(cb.value);
            }
        });
        this.updateMesoSelectedCount();
        this.showNotification(`${checkboxes.length} ejercicios seleccionados`, 'success');
    }
    
    deselectAllMesoExercises() {
        const checkboxes = document.querySelectorAll('#meso-exercises-list input[type="checkbox"]:checked');
        checkboxes.forEach(cb => {
            cb.checked = false;
            this.selectedMesoExercises.delete(cb.value);
        });
        this.updateMesoSelectedCount();
        this.showNotification(`${checkboxes.length} ejercicios deseleccionados`, 'info');
    }
    
    clearAllMesoSelections() {
        if (this.selectedMesoExercises.size === 0) {
            this.showNotification('No hay ejercicios seleccionados', 'info');
            return;
        }
        
        const count = this.selectedMesoExercises.size;
        this.selectedMesoExercises.clear();
        
        // Actualizar todos los checkboxes visibles
        const checkboxes = document.querySelectorAll('#meso-exercises-list input[type="checkbox"]:checked');
        checkboxes.forEach(cb => cb.checked = false);
        
        this.updateMesoSelectedCount();
        this.showNotification(`${count} selecciones eliminadas`, 'success');
    }

    addMesocycle() {
        const name = document.getElementById('meso-name').value.trim();
        const duration = parseInt(document.getElementById('meso-duration').value);
        const description = document.getElementById('meso-description').value.trim();
        const split = document.getElementById('meso-split').value;
        const objective = document.getElementById('meso-objetivo').value;
        const maxExercisesPerSession = parseInt(document.getElementById('meso-max-exercises').value) || 6;
        const sessionsPerWeek = parseInt(document.getElementById('meso-sessions-per-week').value) || 3;
        
        // Obtener ejercicios seleccionados desde el Set persistente
        const selectedExercises = [];
        this.selectedMesoExercises.forEach(exerciseId => {
            const exercise = this.exercises.find(e => e.id === exerciseId);
            if (exercise) {
                // Migrar datos antiguos si es necesario
                if (exercise.category && !exercise.categories) {
                    exercise.categories = [exercise.category];
                    delete exercise.category;
                }
                selectedExercises.push({
                    exerciseId: exercise.id,
                    name: exercise.name,
                    rm: exercise.rm,
                    categories: exercise.categories || [],
                    sets: []
                });
            }
        });

        if (selectedExercises.length === 0) {
            this.showNotification('Selecciona al menos un ejercicio', 'warning');
            return;
        }

        const mesocycle = {
            id: this.generateId(),
            name,
            duration,
            description,
            split,
            objective,
            maxExercisesPerSession,
            sessionsPerWeek,
            exercises: selectedExercises,
            createdAt: new Date().toISOString(),
            completedSessions: 0,
            status: 'active'
        };

        this.mesocycles.push(mesocycle);
        this.saveToStorage();
        
        // Limpiar selecciones
        this.selectedMesoExercises.clear();
        
        document.getElementById('mesocycle-form').reset();
        this.updateSplitInfo();
        this.renderMesoExercisesList();
        this.renderMesocycles();
        this.updateStats();
        this.updateMesocycleSelect();

        this.showNotification('Mesociclo creado correctamente', 'success');
    }

    renderMesocycles() {
        const container = document.getElementById('mesocycles-list');
        
        if (this.mesocycles.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-folder-open"></i>
                    <p>No tienes mesociclos creados</p>
                </div>
            `;
            return;
        }

        const splitConfig = this.getSplitConfig();

        container.innerHTML = this.mesocycles.map(meso => {
            const splitInfo = splitConfig[meso.split] || { name: 'Personalizado' };
            const objectiveNames = {
                strength: 'Fuerza',
                hypertrophy: 'Hipertrofia',
                endurance: 'Resistencia',
                power: 'Potencia',
                mixed: 'Mixto'
            };
            
            const maxExText = meso.maxExercisesPerSession 
                ? `<span style="background: var(--warning-color); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;"><i class="fas fa-layer-group"></i> Máx ${meso.maxExercisesPerSession}/sesión</span>`
                : '';
            
            const statusBadge = meso.status === 'completed' 
                ? `<span style="background: var(--success-color); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Completado</span>`
                : '';
            
            return `
            <div class="mesocycle-card ${meso.status === 'completed' ? 'completed' : ''}" onclick="gymTracker.showMesocycleDetail('${meso.id}')">
                <h4>${meso.name}</h4>
                <div class="meso-meta">
                    <span><i class="fas fa-calendar"></i> ${meso.duration} semanas</span>
                    <span><i class="fas fa-dumbbell"></i> ${meso.exercises.length} ejercicios</span>
                </div>
                <div style="margin: 10px 0; display: flex; gap: 8px; flex-wrap: wrap;">
                    <span style="background: var(--primary-color); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;">
                        ${splitInfo.name}
                    </span>
                    <span style="background: var(--secondary-color); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;">
                        ${objectiveNames[meso.objective] || 'Mixto'}
                    </span>
                    ${maxExText}
                    ${statusBadge}
                </div>
                <p class="meso-description">${meso.description || 'Sin descripción'}</p>
            </div>
        `}).join('');
    }

    showMesocycleDetail(id) {
        const meso = this.mesocycles.find(m => m.id === id);
        if (!meso) return;

        this.currentMesoDetail = id;
        document.getElementById('meso-detail-title').textContent = meso.name;

        const splitConfig = this.getSplitConfig();
        const splitInfo = splitConfig[meso.split] || { name: 'Personalizado', description: '', sessions: [] };
        const objectiveNames = {
            strength: 'Fuerza',
            hypertrophy: 'Hipertrofia',
            endurance: 'Resistencia',
            power: 'Potencia',
            mixed: 'Mixto'
        };

        const content = document.getElementById('meso-detail-content');
        const totalSessionsNeeded = meso.duration * (meso.sessionsPerWeek || 3);
        const isCompleted = meso.status === 'completed' || meso.completedSessions >= totalSessionsNeeded;
        
        content.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <span style="background: var(--primary-color); color: white; padding: 5px 12px; border-radius: 15px; font-size: 0.9rem;">
                        ${splitInfo.name}
                    </span>
                    <span style="background: var(--secondary-color); color: white; padding: 5px 12px; border-radius: 15px; font-size: 0.9rem;">
                        ${objectiveNames[meso.objective] || 'Mixto'}
                    </span>
                    ${isCompleted ? `
                    <span style="background: var(--success-color); color: white; padding: 5px 12px; border-radius: 15px; font-size: 0.9rem;">
                        <i class="fas fa-check-circle"></i> Completado
                    </span>` : ''}
                </div>
                <strong>Duración:</strong> ${meso.duration} semanas<br>
                <strong>Ejercicios:</strong> ${meso.exercises.length}<br>
                <strong>Sesiones completadas:</strong> ${meso.completedSessions || 0} / ${totalSessionsNeeded}<br>
                <strong>Sesiones por semana:</strong> ${meso.sessionsPerWeek || 3}<br>
                <strong>Máx. ejercicios por sesión:</strong> ${meso.maxExercisesPerSession || 'Todos'}<br>
                ${meso.maxExercisesPerSession && meso.exercises.length > meso.maxExercisesPerSession ? 
                    `<span style="color: var(--warning-color);"><i class="fas fa-sync-alt"></i> Rotación de ejercicios activada</span>` : ''}
                ${isCompleted ? 
                    `<div style="margin-top: 15px; padding: 15px; background: rgba(34, 197, 94, 0.1); border: 1px solid var(--success-color); border-radius: 8px; color: var(--success-color);">
                        <i class="fas fa-trophy"></i> <strong>¡Mesociclo completado!</strong><br>
                        <span style="font-size: 0.9rem;">Has completado todas las sesiones programadas. Puedes seguir usando este mesociclo o crear uno nuevo.</span>
                    </div>` : ''}
                ${meso.maxExercisesPerSession && meso.exercises.length > meso.maxExercisesPerSession ? 
                    `<span style="color: var(--warning-color);"><i class="fas fa-sync-alt"></i> Rotación de ejercicios activada</span>` : ''}
            </div>
            
            ${splitInfo.sessions.length > 0 ? `
            <div class="split-info">
                <h4><i class="fas fa-layer-group"></i> Estructura de entrenamiento</h4>
                <p>${splitInfo.description}</p>
                <div style="margin-top: 10px;">
                    ${splitInfo.sessions.map((session, idx) => `
                        <span class="split-day">Día ${idx + 1}: ${session.name}</span>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <h4 style="margin-bottom: 15px; color: var(--primary-light);">Ejercicios incluidos:</h4>
            ${meso.exercises.map(ex => `
                <div class="meso-exercise-detail">
                    <h5>${ex.name} (1RM: ${ex.rm}kg) <span style="font-weight: normal; color: var(--text-secondary); font-size: 0.85rem;">- ${this.getCategoryNames(ex.categories || (ex.category ? [ex.category] : []))}</span></h5>
                    ${ex.sets && ex.sets.length > 0 ? `
                        <div class="sets-preview">
                            ${ex.sets.map((set, i) => `
                                <span class="set-preview-item">Serie ${i+1}: ${set.percentage}% - ${set.reps} reps</span>
                            `).join('')}
                        </div>
                    ` : '<span style="color: var(--text-secondary); font-size: 0.9rem;">Sin series configuradas</span>'}
                </div>
            `).join('')}
        `;

        document.getElementById('meso-detail-modal').classList.add('active');
    }

    deleteCurrentMesocycle() {
        if (!this.currentMesoDetail) return;

        if (confirm('¿Estás seguro de eliminar este mesociclo? Se perderán todos los datos asociados.')) {
            this.mesocycles = this.mesocycles.filter(m => m.id !== this.currentMesoDetail);
            this.sessions = this.sessions.filter(s => s.mesocycleId !== this.currentMesoDetail);

            // Limpiar orden aleatorio guardado para este mesociclo
            localStorage.removeItem(`gym_meso_order_${this.currentMesoDetail}`);

            this.saveToStorage();
            this.renderMesocycles();
            this.updateStats();
            this.updateMesocycleSelect();
            this.closeModal('meso-detail-modal');
            this.showNotification('Mesociclo eliminado', 'success');
        }
    }

    // ==================== SESIONES ====================
    updateMesocycleSelect() {
        const select = document.getElementById('active-mesocycle');
        select.innerHTML = '<option value="">Seleccionar mesociclo...</option>' +
            this.mesocycles.map(m => {
                const totalSessionsNeeded = m.duration * (m.sessionsPerWeek || 3);
                const isCompleted = m.status === 'completed' || m.completedSessions >= totalSessionsNeeded;
                const statusText = isCompleted ? ' ✓' : '';
                return `<option value="${m.id}">${m.name}${statusText}</option>`;
            }).join('');

        // Restaurar sesión si hay una guardada
        const savedSession = localStorage.getItem('gym_current_session');
        if (savedSession) {
            const session = JSON.parse(savedSession);
            select.value = session.mesocycleId;
        }
    }

    startNewSession() {
        const mesoId = document.getElementById('active-mesocycle').value;
        if (!mesoId) {
            this.showNotification('Selecciona un mesociclo primero', 'warning');
            return;
        }

        const meso = this.mesocycles.find(m => m.id === mesoId);
        if (!meso) return;

        // Calcular número de sesión dentro del mesociclo (1-based)
        const sessionsInMesocycle = this.sessions.filter(s => s.mesocycleId === mesoId && s.completed).length;
        const sessionNumber = sessionsInMesocycle + 1;

        // Si el modo es personalizado, mostrar el modal de selección
        if (meso.split === 'personalizado') {
            this.pendingSessionMesoId = mesoId;
            this.renderSessionExercisesList(meso);
            document.getElementById('session-exercises-modal').classList.add('active');
            return;
        }

        // Obtener las categorías que corresponden a esta sesión según el modo
        const targetCategories = this.getCategoriesForSplit(meso.split, sessionNumber);
        const sessionName = this.getSessionNameForSplit(meso.split, sessionNumber);

        if (!targetCategories) {
            this.showNotification('Error al determinar las categorías de la sesión', 'error');
            return;
        }

        // Migrar ejercicios del mesociclo si es necesario
        meso.exercises.forEach(ex => {
            if (ex.category && !ex.categories) {
                ex.categories = [ex.category];
                delete ex.category;
            }
        });
        this.saveToStorage();

        // Filtrar ejercicios que coincidan con las categorías del día
        let filteredExercises = meso.exercises.filter(ex => {
            const categories = ex.categories || (ex.category ? [ex.category] : []);
            return categories.some(cat => targetCategories.includes(cat));
        });

        if (filteredExercises.length === 0) {
            this.showNotification(`No hay ejercicios de ${sessionName} en este mesociclo. Verifica las categorías de los ejercicios.`, 'warning');
            return;
        }

        // Aplicar límite máximo de ejercicios por sesión con rotación aleatoria semanal
        const maxExercises = meso.maxExercisesPerSession || filteredExercises.length;
        let selectedExercises;
        
        if (filteredExercises.length <= maxExercises) {
            // Si hay menos ejercicios que el máximo, usarlos todos
            selectedExercises = filteredExercises;
        } else {
            // Obtener orden aleatorio de ejercicios para todo el mesociclo
            const mesoOrder = this.getMesocycleExerciseOrder(meso.id, filteredExercises, meso.createdAt);
            
            // Calcular qué ejercicios tocan en esta sesión (ciclando por todos los ejercicios)
            const totalExercises = mesoOrder.length;
            const sessionsNeeded = Math.ceil(totalExercises / maxExercises);
            const blockIndex = ((sessionNumber - 1) % sessionsNeeded);
            
            const startIndex = blockIndex * maxExercises;
            const endIndex = Math.min(startIndex + maxExercises, totalExercises);
            
            selectedExercises = mesoOrder.slice(startIndex, endIndex);
            
            // Si llegamos al final y quedan ejercicios sueltos, los mostramos en la siguiente sesión
            if (selectedExercises.length === 0 && totalExercises > 0) {
                selectedExercises = mesoOrder.slice(0, maxExercises);
            }
        }

        // Crear la sesión con los ejercicios seleccionados
        this.currentSession = {
            id: this.generateId(),
            mesocycleId: mesoId,
            mesocycleName: meso.name,
            sessionNumber: sessionNumber,
            sessionName: sessionName,
            split: meso.split,
            date: new Date().toISOString(),
            exercises: selectedExercises.map(ex => ({
                exerciseId: ex.exerciseId,
                name: ex.name,
                rm: ex.rm,
                categories: ex.categories || (ex.category ? [ex.category] : []),
                sets: []
            })),
            completed: false
        };

        localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
        this.renderSession();
        
        const totalInCategory = filteredExercises.length;
        const showingText = totalInCategory > maxExercises
            ? `(${selectedExercises.length} de ${totalInCategory} - orden aleatorio)`
            : `(${selectedExercises.length} ejercicios)`;
        this.showNotification(`Sesión ${sessionNumber}: ${sessionName} ${showingText}`, 'success');
    }

    renderSessionExercisesList(meso) {
        const container = document.getElementById('session-exercises-list');
        const searchTerm = document.getElementById('session-exercise-search').value.toLowerCase();
        
        let filteredExercises = meso.exercises;
        if (searchTerm) {
            filteredExercises = meso.exercises.filter(ex => 
                ex.name.toLowerCase().includes(searchTerm)
            );
        }

        if (filteredExercises.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay ejercicios disponibles</p>';
            this.updateSelectedCount();
            return;
        }

        container.innerHTML = filteredExercises.map((ex, index) => `
            <label class="checkbox-exercise-item" style="cursor: pointer;">
                <input type="checkbox" value="${ex.exerciseId}" data-name="${ex.name}" data-rm="${ex.rm}" 
                       onchange="gymTracker.updateSelectedCount()" checked
                       style="width: 20px; height: 20px; margin-right: 12px; accent-color: var(--primary-color);">
                <div class="exercise-info" style="flex: 1;">
                    <div class="exercise-name" style="font-weight: 500; color: var(--text-primary);">${ex.name}</div>
                    <div class="exercise-rm" style="font-size: 0.85rem; color: var(--text-secondary);">1RM: ${ex.rm}kg</div>
                </div>
            </label>
        `).join('');

        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('#session-exercises-list input[type="checkbox"]:checked');
        document.getElementById('session-selected-count').textContent = checkboxes.length;
    }

    filterSessionExercises() {
        const meso = this.mesocycles.find(m => m.id === this.pendingSessionMesoId);
        if (meso) {
            this.renderSessionExercisesList(meso);
        }
    }

    selectAllSessionExercises() {
        document.querySelectorAll('#session-exercises-list input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
        });
        this.updateSelectedCount();
    }

    deselectAllSessionExercises() {
        document.querySelectorAll('#session-exercises-list input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        this.updateSelectedCount();
    }

    confirmSessionExercises() {
        const selectedCheckboxes = document.querySelectorAll('#session-exercises-list input[type="checkbox"]:checked');
        
        if (selectedCheckboxes.length === 0) {
            this.showNotification('Selecciona al menos un ejercicio', 'warning');
            return;
        }

        const mesoId = this.pendingSessionMesoId;
        const meso = this.mesocycles.find(m => m.id === mesoId);
        if (!meso) return;

        // Calcular número de sesión dentro del mesociclo (1-based)
        const sessionsInMesocycle = this.sessions.filter(s => s.mesocycleId === mesoId && s.completed).length;
        const sessionNumber = sessionsInMesocycle + 1;

        // Obtener el nombre de la sesión según el modo
        const sessionName = this.getSessionNameForSplit(meso.split, sessionNumber);

        // Crear array de ejercicios seleccionados
        const selectedExercises = Array.from(selectedCheckboxes).map(cb => ({
            exerciseId: cb.value,
            name: cb.dataset.name,
            rm: parseFloat(cb.dataset.rm),
            sets: []
        }));

        this.currentSession = {
            id: this.generateId(),
            mesocycleId: mesoId,
            mesocycleName: meso.name,
            sessionNumber: sessionNumber,
            sessionName: sessionName,
            split: meso.split,
            date: new Date().toISOString(),
            exercises: selectedExercises,
            completed: false
        };

        localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
        this.closeModal('session-exercises-modal');
        this.renderSession();
        this.showNotification(`Sesión ${sessionNumber}${sessionName ? ': ' + sessionName : ''} - ${selectedExercises.length} ejercicios`, 'success');
    }

    loadPreviousSession() {
        const savedSession = localStorage.getItem('gym_current_session');
        if (savedSession) {
            this.currentSession = JSON.parse(savedSession);
            document.getElementById('active-mesocycle').value = this.currentSession.mesocycleId;
            // Si la sesión no tiene sessionName, intentar obtenerlo del modo
            if (!this.currentSession.sessionName && this.currentSession.split) {
                this.currentSession.sessionName = this.getSessionNameForSplit(
                    this.currentSession.split, 
                    this.currentSession.sessionNumber || 1
                );
            }
            this.renderSession();
        } else {
            this.showNotification('No hay sesión anterior guardada', 'warning');
        }
    }

    renderSession() {
        const container = document.getElementById('session-content');
        
        if (!this.currentSession) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-dumbbell"></i>
                    <p>Selecciona un mesociclo para comenzar tu sesión de entrenamiento</p>
                </div>
            `;
            return;
        }

        const sessionNumber = this.currentSession.sessionNumber || 1;
        const sessionName = this.currentSession.sessionName;
        
        // Obtener mesociclo para calcular la semana correcta
        const meso = this.mesocycles.find(m => m.id === this.currentSession.mesocycleId);
        const sessionsPerWeek = meso ? (meso.sessionsPerWeek || 3) : 3;
        const weekNumber = this.getWeekNumber(sessionNumber, sessionsPerWeek);
        const weekType = this.getWeekType(weekNumber);

        container.innerHTML = `
            <div class="session-info-banner" style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; color: white; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <strong style="font-size: 1.1rem;">📅 Semana ${weekNumber} - Sesión ${sessionNumber}${sessionName ? ': ' + sessionName : ''}</strong>
                    <span style="opacity: 0.9; margin-left: 10px;">${weekType}</span>
                </div>
                <div style="font-size: 0.9rem; opacity: 0.9;">
                    Porcentajes: ${this.getProgressivePercentage(weekNumber, 0)}% → ${this.getProgressivePercentage(weekNumber, 3)}%
                </div>
            </div>
            <div class="session-exercises">
                ${this.currentSession.exercises.map((ex, exIndex) => `
                    <div class="session-exercise">
                        <div class="session-exercise-header">
                            <div class="session-exercise-info">
                                <h4>${ex.name}</h4>
                                <div class="exercise-rm">1RM: ${ex.rm}kg</div>
                            </div>
                        </div>
                        <div class="sets-container">
                            ${ex.sets.length > 0 ? ex.sets.map((set, setIndex) => `
                                <div class="set-row">
                                    <div class="set-number">${setIndex + 1}${set.note ? ` <span style="font-size: 0.7rem; color: var(--primary-light); display: block;">${set.note}</span>` : ''}</div>
                                    <div class="set-field">
                                        <label>Peso (kg)</label>
                                        <input type="number" value="${set.weight || ''}" 
                                               onchange="gymTracker.updateSet('${ex.exerciseId}', ${setIndex}, 'weight', this.value)"
                                               placeholder="${set.suggestedWeight || ''}">
                                    </div>
                                    <div class="set-field">
                                        <label>% 1RM</label>
                                        <input type="number" value="${set.percentage || ''}" 
                                               onchange="gymTracker.updateSetPercentage('${ex.exerciseId}', ${setIndex}, this.value)"
                                               placeholder="%" style="background: var(--card-bg-hover); color: var(--text-secondary);">
                                    </div>
                                    <div class="set-field">
                                        <label>Reps</label>
                                        <input type="number" value="${set.targetReps || ''}" 
                                               onchange="gymTracker.updateSet('${ex.exerciseId}', ${setIndex}, 'targetReps', this.value)"
                                               readonly style="background: var(--card-bg-hover); color: var(--text-secondary);">
                                    </div>
                                    <div class="set-completed">
                                        <input type="checkbox" ${set.completed ? 'checked' : ''} 
                                               onchange="gymTracker.toggleSetComplete('${ex.exerciseId}', ${setIndex})"
                                               title="Marcar como completada">
                                    </div>
                                    <button type="button" class="set-remove-btn" onclick="gymTracker.removeSet('${ex.exerciseId}', ${setIndex})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `).join('') : '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Aún no hay series. Añade una serie para comenzar.</p>'}
                            
                            <button type="button" class="add-set-btn" onclick="gymTracker.openSetModal('${ex.exerciseId}', ${exIndex})">
                                <i class="fas fa-plus"></i> Añadir serie
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="card" style="margin-top: 20px;">
                <button type="button" class="btn btn-success" style="width: 100%;" onclick="gymTracker.finishSession()">
                    <i class="fas fa-check-circle"></i> Finalizar Sesión
                </button>
            </div>
        `;
    }

    getProgressivePercentage(weekNumber, setIndex, mesocycleDuration = 4) {
        // Factores de progresión según la semana del mesociclo
        // Semana 1: 0.95 (volumen alto, intensidad moderada)
        // Semana 2: 1.00 (volumen moderado, intensidad alta)
        // Semana 3: 1.05 (intensidad máxima)
        // Semana 4: 0.90 (descarga/deload)
        const weekMultipliers = {
            1: 0.95,  // Semana 1: Acumulación
            2: 1.00,  // Semana 2: Intensificación
            3: 1.05,  // Semana 3: Realización/Intensidad máxima
            4: 0.90   // Semana 4: Descarga
        };

        // Para mesociclos más largos, extender el patrón
        const cyclePosition = ((weekNumber - 1) % 4) + 1;
        let weekMultiplier = weekMultipliers[cyclePosition] || 1.00;

        // Escalera ascendente dentro de la sesión
        // Serie 1: 70%, Serie 2: 75%, Serie 3: 80%, Serie 4: 85%
        const setPercentages = [70, 75, 80, 85, 85, 85, 85, 85];
        const basePercentage = setPercentages[Math.min(setIndex, setPercentages.length - 1)];

        // Aplicar multiplicador de semana
        const adjustedPercentage = Math.round(basePercentage * weekMultiplier);

        // Limitar entre 50% y 95%
        return Math.max(50, Math.min(95, adjustedPercentage));
    }

    openSetModal(exerciseId, exerciseIndex) {
        this.currentSetExercise = { exerciseId, exerciseIndex };

        const exercise = this.currentSession.exercises[exerciseIndex];
        const currentSetsCount = exercise.sets.length;
        const sessionNumber = this.currentSession.sessionNumber || 1;

        // Calcular semana real
        const meso = this.mesocycles.find(m => m.id === this.currentSession.mesocycleId);
        const sessionsPerWeek = meso ? (meso.sessionsPerWeek || 3) : 3;
        const weekNumber = this.getWeekNumber(sessionNumber, sessionsPerWeek);

        // Obtener porcentaje progresivo basado en semana y serie
        const defaultPercentage = this.getProgressivePercentage(weekNumber, currentSetsCount);

        // Sugerir reps basadas en el porcentaje
        const suggestedReps = defaultPercentage >= 85 ? 5 : (defaultPercentage >= 80 ? 8 : 10);

        document.getElementById('set-percentage').value = defaultPercentage;
        document.getElementById('set-reps').value = suggestedReps;

        // Actualizar el título del modal para mostrar qué serie es
        const modalTitle = document.querySelector('#set-modal .modal-header h3');
        modalTitle.textContent = `Configurar Serie ${currentSetsCount + 1}`;

        // Actualizar información del esquema
        const schemeInfo = document.getElementById('set-scheme-info');
        const weekType = this.getWeekType(weekNumber);

        schemeInfo.innerHTML = `💡 <strong>${weekType}</strong> - Semana ${weekNumber} del mesociclo. `;
        schemeInfo.innerHTML += `Esta serie al ${defaultPercentage}% del 1RM.`;

        this.updateCalculatedWeight();
        document.getElementById('set-modal').classList.add('active');
    }

    updateCalculatedWeight() {
        if (!this.currentSetExercise) return;
        
        const percentage = parseFloat(document.getElementById('set-percentage').value);
        const exercise = this.currentSession.exercises[this.currentSetExercise.exerciseIndex];
        const weight = Math.round(exercise.rm * (percentage / 100));
        
        document.getElementById('calculated-weight').textContent = weight + ' kg';
    }

    saveSetConfig() {
        if (!this.currentSetExercise) return;

        const percentage = parseFloat(document.getElementById('set-percentage').value);
        const reps = parseInt(document.getElementById('set-reps').value);
        
        const exercise = this.currentSession.exercises[this.currentSetExercise.exerciseIndex];
        const suggestedWeight = Math.round(exercise.rm * (percentage / 100));

        const newSet = {
            targetReps: reps,
            suggestedWeight: suggestedWeight,
            percentage: percentage,
            weight: suggestedWeight,
            completed: false
        };

        exercise.sets.push(newSet);
        
        localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
        this.closeModal('set-modal');
        this.renderSession();
    }

    updateSet(exerciseId, setIndex, field, value) {
        const exercise = this.currentSession.exercises.find(e => e.exerciseId === exerciseId);
        if (exercise && exercise.sets[setIndex]) {
            exercise.sets[setIndex][field] = value === '' ? '' : parseFloat(value);
            localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
        }
    }

    updateSetPercentage(exerciseId, setIndex, percentage) {
        const exercise = this.currentSession.exercises.find(e => e.exerciseId === exerciseId);
        if (exercise && exercise.sets[setIndex]) {
            const newPercentage = percentage === '' ? '' : parseFloat(percentage);
            exercise.sets[setIndex].percentage = newPercentage;
            
            // Recalcular peso sugerido basado en el nuevo porcentaje
            if (newPercentage && !isNaN(newPercentage)) {
                exercise.sets[setIndex].suggestedWeight = Math.round(exercise.rm * (newPercentage / 100));
            }
            
            localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
            this.renderSession();
        }
    }

    toggleSetComplete(exerciseId, setIndex) {
        const exercise = this.currentSession.exercises.find(e => e.exerciseId === exerciseId);
        if (exercise && exercise.sets[setIndex]) {
            exercise.sets[setIndex].completed = !exercise.sets[setIndex].completed;
            localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
        }
    }

    removeSet(exerciseId, setIndex) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta serie?')) {
            return;
        }
        
        const exercise = this.currentSession.exercises.find(e => e.exerciseId === exerciseId);
        if (exercise) {
            exercise.sets.splice(setIndex, 1);
            localStorage.setItem('gym_current_session', JSON.stringify(this.currentSession));
            this.renderSession();
        }
    }

    finishSession() {
        if (!this.currentSession) return;

        // Verificar que haya al menos una serie
        const totalSets = this.currentSession.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        if (totalSets === 0) {
            this.showNotification('Añade al menos una serie antes de finalizar', 'warning');
            return;
        }

        this.currentSession.completed = true;
        this.currentSession.endDate = new Date().toISOString();
        
        // Actualizar 1RM de los ejercicios basado en las series completadas
        this.currentSession.exercises.forEach(sessionEx => {
            const exercise = this.exercises.find(e => e.id === sessionEx.exerciseId);
            if (exercise) {
                // Buscar la serie con mayor estimación de 1RM usando la fórmula de Brzycki
                let maxEstimatedRM = exercise.rm;
                
                sessionEx.sets.forEach(set => {
                    if (set.completed && set.weight && set.weight > 0) {
                        const reps = set.targetReps || 1;
                        // Fórmula de Brzycki: 1RM = peso / (1.0278 - 0.0278 * reps)
                        const estimatedRM = Math.round(set.weight / (1.0278 - 0.0278 * reps));
                        if (estimatedRM > maxEstimatedRM) {
                            maxEstimatedRM = estimatedRM;
                        }
                    }
                });
                
                // Actualizar el 1RM si se ha estimado uno mayor
                if (maxEstimatedRM > exercise.rm) {
                    exercise.rm = maxEstimatedRM;
                    // Actualizar también el RM en la sesión
                    sessionEx.rm = maxEstimatedRM;
                }
            }
        });
        
        // Guardar sesión
        this.sessions.push(this.currentSession);
        
        // Actualizar contador de sesiones completadas del mesociclo
        const meso = this.mesocycles.find(m => m.id === this.currentSession.mesocycleId);
        let isMesocycleCompleted = false;
        if (meso) {
            meso.completedSessions = (meso.completedSessions || 0) + 1;
            
            // Verificar si el mesociclo se ha completado
            const totalSessionsNeeded = meso.duration * (meso.sessionsPerWeek || 3);
            if (meso.completedSessions >= totalSessionsNeeded && meso.status === 'active') {
                meso.status = 'completed';
                isMesocycleCompleted = true;
            }
        }
        
        this.saveToStorage();
        
        // Limpiar sesión actual
        localStorage.removeItem('gym_current_session');
        this.currentSession = null;
        
        this.renderSession();
        this.updateStats();
        
        if (isMesocycleCompleted) {
            this.showNotification('🎉 ¡Mesociclo completado! Has terminado todas las sesiones programadas.', 'success');
            setTimeout(() => {
                this.showNotification('Puedes seguir usando este mesociclo o crear uno nuevo.', 'info');
            }, 3500);
        } else {
            this.showNotification('¡Sesión finalizada correctamente!', 'success');
        }
    }

    // ==================== ESTADÍSTICAS ====================
    updateStats() {
        document.getElementById('stat-total-exercises').textContent = this.exercises.length;
        document.getElementById('stat-total-sessions').textContent = this.sessions.length;
        document.getElementById('stat-total-mesocycles').textContent = this.mesocycles.length;
        
        const totalSets = this.sessions.reduce((sum, session) => {
            return sum + session.exercises.reduce((exSum, ex) => exSum + ex.sets.length, 0);
        }, 0);
        document.getElementById('stat-total-sets').textContent = totalSets;
    }

    updateStatsExerciseSelect() {
        const select = document.getElementById('stats-exercise-select');
        select.innerHTML = '<option value="">Selecciona un ejercicio...</option>' +
            this.exercises.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    }

    updateSplitInfo() {
        const split = document.getElementById('meso-split').value;
        const container = document.getElementById('split-info-container');
        const nameEl = document.getElementById('split-info-name');
        const descEl = document.getElementById('split-info-description');
        const sessionsEl = document.getElementById('split-info-sessions');

        if (!split || split === 'personalizado') {
            container.style.display = 'none';
            return;
        }

        const config = this.getSplitConfig()[split];
        if (!config) return;

        container.style.display = 'block';
        nameEl.textContent = config.name;
        descEl.textContent = config.description;
        
        if (config.sessions.length > 0) {
            sessionsEl.innerHTML = config.sessions.map((session, idx) => 
                `<span class="split-day">Día ${idx + 1}: ${session.name}</span>`
            ).join('');
        } else {
            sessionsEl.innerHTML = '';
        }
    }

    renderExerciseChart(exerciseId) {
        const container = document.getElementById('exercise-chart');
        const detailContainer = document.getElementById('exercise-stats-detail');
        
        if (!exerciseId) {
            container.innerHTML = '';
            detailContainer.classList.add('hidden');
            return;
        }

        const exercise = this.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        // Obtener datos de todas las sesiones para este ejercicio
        const exerciseData = [];
        this.sessions.forEach(session => {
            session.exercises.forEach(ex => {
                if (ex.exerciseId === exerciseId) {
                    ex.sets.forEach(set => {
                        if (set.completed && set.weight && set.targetReps) {
                            exerciseData.push({
                                date: new Date(session.date).toLocaleDateString('es-ES'),
                                weight: set.weight,
                                reps: set.targetReps,
                                volume: set.weight * set.targetReps
                            });
                        }
                    });
                }
            });
        });

        if (exerciseData.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No hay datos disponibles para este ejercicio</p>';
            detailContainer.classList.add('hidden');
            return;
        }

        // Crear gráfico
        const ctx = document.getElementById('progressChart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: exerciseData.map((d, i) => `Entreno ${i + 1}`),
                datasets: [{
                    label: 'Peso (kg)',
                    data: exerciseData.map(d => d.weight),
                    borderColor: '#059669',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Volumen (kg x reps)',
                    data: exerciseData.map(d => d.volume),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            color: '#10b981'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#f1f5f9'
                        }
                    }
                }
            }
        });

        // Mostrar detalles
        const maxWeight = Math.max(...exerciseData.map(d => d.weight));
        const maxVolume = Math.max(...exerciseData.map(d => d.volume));
        const avgWeight = (exerciseData.reduce((sum, d) => sum + d.weight, 0) / exerciseData.length).toFixed(1);
        
        detailContainer.innerHTML = `
            <div class="stats-detail-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 5px;">Peso máximo</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-light);">${maxWeight} kg</div>
                </div>
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 5px;">Peso promedio</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--secondary-color);">${avgWeight} kg</div>
                </div>
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 5px;">Volumen máximo</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--warning-color);">${maxVolume} kg</div>
                </div>
                <div style="background: var(--bg-color); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 5px;">Total entrenos</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: var(--text-primary);">${exerciseData.length}</div>
                </div>
            </div>
        `;
        detailContainer.classList.remove('hidden');
    }

    renderPersonalRecords() {
        const container = document.getElementById('personal-records');
        const records = [];

        this.exercises.forEach(exercise => {
            let maxWeight = 0;
            let maxDate = null;

            this.sessions.forEach(session => {
                session.exercises.forEach(ex => {
                    if (ex.exerciseId === exercise.id) {
                        ex.sets.forEach(set => {
                            if (set.completed && set.weight > maxWeight) {
                                maxWeight = set.weight;
                                maxDate = session.date;
                            }
                        });
                    }
                });
            });

            if (maxWeight > 0) {
                records.push({
                    exercise: exercise.name,
                    weight: maxWeight,
                    date: maxDate
                });
            }
        });

        // Ordenar por peso descendente
        records.sort((a, b) => b.weight - a.weight);

        if (records.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">Aún no tienes records personales. ¡Completa algunas sesiones!</p>';
            return;
        }

        container.innerHTML = records.slice(0, 6).map(record => `
            <div class="record-item">
                <div class="record-info">
                    <h4>${record.exercise}</h4>
                    <div class="record-date">${new Date(record.date).toLocaleDateString('es-ES')}</div>
                </div>
                <div class="record-value">${record.weight} kg</div>
            </div>
        `).join('');
    }

    // ==================== HISTORIAL DE SESIONES ====================
    renderSessionsHistory() {
        const container = document.getElementById('sessions-history-list');
        const mesocycleFilter = document.getElementById('session-filter-mesocycle').value;
        const sortOrder = document.getElementById('session-filter-sort').value;
        
        let filteredSessions = [...this.sessions];
        
        // Filtrar por mesociclo
        if (mesocycleFilter !== 'all') {
            filteredSessions = filteredSessions.filter(s => s.mesocycleId === mesocycleFilter);
        }
        
        // Ordenar
        filteredSessions.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
        
        if (filteredSessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px;">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <p>No hay sesiones completadas todavía</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">¡Completa tu primera sesión para ver tu historial!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredSessions.map(session => {
            const date = new Date(session.date);
            const formattedDate = date.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            const formattedTime = date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
            const completedSets = session.exercises.reduce((sum, ex) => 
                sum + ex.sets.filter(s => s.completed).length, 0
            );
            
            return `
                <div class="session-history-item" onclick="gymTracker.showSessionDetail('${session.id}')">
                    <div class="session-history-header">
                        <div class="session-history-title">
                            <i class="fas fa-dumbbell" style="color: var(--primary-color); margin-right: 8px;"></i>
                            ${session.mesocycleName} - Sesión ${session.sessionNumber}
                            ${session.sessionName ? `<span style="color: var(--text-secondary); font-weight: normal;">(${session.sessionName})</span>` : ''}
                        </div>
                        <div class="session-history-date">
                            <i class="fas fa-calendar"></i>
                            ${formattedDate} a las ${formattedTime}
                        </div>
                    </div>
                    <div class="session-history-meta">
                        <span><i class="fas fa-dumbbell"></i> ${session.exercises.length} ejercicios</span>
                        <span><i class="fas fa-layer-group"></i> ${totalSets} series</span>
                        <span><i class="fas fa-check-circle"></i> ${completedSets} completadas</span>
                    </div>
                    <div class="session-history-exercises">
                        ${session.exercises.slice(0, 4).map(ex => `
                            <div class="session-history-exercise">${ex.name}</div>
                        `).join('')}
                        ${session.exercises.length > 4 ? `
                            <div class="session-history-exercise" style="background: var(--primary-color); color: white;">
                                +${session.exercises.length - 4} más
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateSessionHistoryFilters() {
        const select = document.getElementById('session-filter-mesocycle');
        const currentValue = select.value;
        
        select.innerHTML = '<option value="all">Todos los mesociclos</option>' +
            this.mesocycles.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        
        // Restaurar valor seleccionado si aún existe
        if (currentValue !== 'all' && this.mesocycles.find(m => m.id === currentValue)) {
            select.value = currentValue;
        }
    }
    
    showSessionDetail(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;
        
        const modal = document.getElementById('session-detail-modal');
        const content = document.getElementById('session-detail-content');
        
        const date = new Date(session.date);
        const formattedDate = date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const totalVolume = session.exercises.reduce((total, ex) => {
            return total + ex.sets.reduce((exTotal, set) => {
                if (set.completed && set.weight && set.targetReps) {
                    return exTotal + (set.weight * set.targetReps);
                }
                return exTotal;
            }, 0);
        }, 0);
        
        content.innerHTML = `
            <div style="background: var(--bg-color); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                    <h3 style="color: var(--primary-light); margin: 0;">
                        <i class="fas fa-dumbbell"></i> ${session.mesocycleName}
                    </h3>
                    <span style="background: var(--primary-color); color: white; padding: 5px 12px; border-radius: 15px; font-size: 0.9rem;">
                        Sesión ${session.sessionNumber}${session.sessionName ? ': ' + session.sessionName : ''}
                    </span>
                </div>
                <div style="color: var(--text-secondary); margin-bottom: 10px;">
                    <i class="fas fa-calendar"></i> ${formattedDate}
                </div>
                <div style="display: flex; gap: 15px; flex-wrap: wrap; color: var(--text-secondary);">
                    <span><i class="fas fa-dumbbell"></i> ${session.exercises.length} ejercicios</span>
                    <span><i class="fas fa-fire"></i> ${totalVolume.toLocaleString()} kg de volumen</span>
                </div>
            </div>
            
            <h4 style="color: var(--text-primary); margin-bottom: 15px;">Ejercicios realizados</h4>
            
            ${session.exercises.map(ex => {
                const completedSets = ex.sets.filter(s => s.completed).length;
                const exerciseVolume = ex.sets.reduce((sum, set) => {
                    if (set.completed && set.weight && set.targetReps) {
                        return sum + (set.weight * set.targetReps);
                    }
                    return sum;
                }, 0);
                
                return `
                    <div class="exercise-detail">
                        <h4>
                            ${ex.name}
                            <span style="color: var(--text-secondary); font-weight: normal; font-size: 0.9rem;">
                                (1RM: ${ex.rm}kg)
                            </span>
                        </h4>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                            <span style="background: var(--card-bg-hover); padding: 3px 10px; border-radius: 12px; font-size: 0.85rem; color: var(--text-secondary);">
                                ${ex.sets.length} series
                            </span>
                            <span style="background: var(--success-color); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.85rem;">
                                ${completedSets} completadas
                            </span>
                            ${exerciseVolume > 0 ? `
                                <span style="background: var(--warning-color); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.85rem;">
                                    ${exerciseVolume.toLocaleString()} kg volumen
                                </span>
                            ` : ''}
                        </div>
                        <div class="sets-detail">
                            ${ex.sets.map((set, idx) => `
                                <div class="set-detail-item ${set.completed ? 'completed' : ''}">
                                    <div style="font-weight: 600; color: var(--text-primary);">Serie ${idx + 1}</div>
                                    <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 5px;">
                                        ${set.weight ? set.weight + ' kg' : '-'} × ${set.targetReps || '-'} reps
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        `;
        
        modal.classList.add('active');
    }

    // ==================== UTILIDADES UI ====================
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#059669'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ==================== IMPORT/EXPORT ====================
    updateBackupStats() {
        document.getElementById('export-exercise-count').textContent = this.exercises.length;
        document.getElementById('export-mesocycle-count').textContent = this.mesocycles.length;
        document.getElementById('export-session-count').textContent = this.sessions.length;
        document.getElementById('export-date').textContent = new Date().toLocaleString('es-ES');
    }

    exportData() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            type: 'complete',
            exercises: this.exercises,
            mesocycles: this.mesocycles,
            sessions: this.sessions
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `leafstrength-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('Backup completo descargado correctamente', 'success');
    }

    exportExercisesOnly() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            type: 'exercises',
            exercises: this.exercises,
            mesocycles: [],
            sessions: []
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `leafstrength-ejercicios-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification(`${this.exercises.length} ejercicios exportados correctamente`, 'success');
    }

    exportMesocyclesOnly() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            type: 'mesocycles',
            exercises: [],
            mesocycles: this.mesocycles,
            sessions: []
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `leafstrength-mesociclos-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification(`${this.mesocycles.length} mesociclos exportados correctamente`, 'success');
    }
}

// Variable global para almacenar datos de importación temporal
let pendingImportData = null;

// Funciones globales para onclick
function calculateRM() {
    gymTracker.calculateRM();
}

function closeModal(modalId) {
    gymTracker.closeModal(modalId);
}

function saveSetConfig() {
    gymTracker.saveSetConfig();
}

function startNewSession() {
    gymTracker.startNewSession();
}

function loadPreviousSession() {
    gymTracker.loadPreviousSession();
}

function deleteCurrentMesocycle() {
    gymTracker.deleteCurrentMesocycle();
}

function exportData() {
    gymTracker.exportData();
}

function exportExercisesOnly() {
    gymTracker.exportExercisesOnly();
}

function exportMesocyclesOnly() {
    gymTracker.exportMesocyclesOnly();
}

function filterSessionHistory() {
    gymTracker.renderSessionsHistory();
}

function selectAllMesoExercises() {
    gymTracker.selectAllMesoExercises();
}

function deselectAllMesoExercises() {
    gymTracker.deselectAllMesoExercises();
}

function clearAllMesoSelections() {
    gymTracker.clearAllMesoSelections();
}

function previewImportFile() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validar estructura
            if (!data.version || !data.exercises || !data.mesocycles || !data.sessions) {
                showImportError('El archivo no tiene el formato correcto');
                return;
            }
            
            pendingImportData = data;
            
            // Mostrar vista previa
            document.getElementById('preview-exercises').textContent = data.exercises.length;
            document.getElementById('preview-mesocycles').textContent = data.mesocycles.length;
            document.getElementById('preview-sessions').textContent = data.sessions.length;
            document.getElementById('preview-date').textContent = new Date(data.exportDate).toLocaleString('es-ES');
            
            document.getElementById('import-preview').classList.remove('hidden');
            document.getElementById('import-error').classList.add('hidden');
            
        } catch (error) {
            showImportError('Error al leer el archivo: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function showImportError(message) {
    document.getElementById('import-error-message').textContent = message;
    document.getElementById('import-error').classList.remove('hidden');
    document.getElementById('import-preview').classList.add('hidden');
    pendingImportData = null;
}

function importData() {
    if (!pendingImportData) return;
    
    const mode = document.querySelector('input[name="import-mode"]:checked').value;
    
    // Actualizar modal de confirmación
    document.getElementById('confirm-import-mode').textContent = mode === 'merge' ? 'fusionar' : 'reemplazar';
    document.getElementById('confirm-exercises').textContent = pendingImportData.exercises.length;
    document.getElementById('confirm-mesocycles').textContent = pendingImportData.mesocycles.length;
    document.getElementById('confirm-sessions').textContent = pendingImportData.sessions.length;
    
    if (mode === 'replace') {
        document.getElementById('import-replace-warning').classList.remove('hidden');
    } else {
        document.getElementById('import-replace-warning').classList.add('hidden');
    }
    
    document.getElementById('import-confirm-modal').classList.add('active');
}

function confirmImport() {
    if (!pendingImportData) return;
    
    const mode = document.querySelector('input[name="import-mode"]:checked').value;
    
    if (mode === 'replace') {
        // Reemplazar todo
        gymTracker.exercises = pendingImportData.exercises;
        gymTracker.mesocycles = pendingImportData.mesocycles;
        gymTracker.sessions = pendingImportData.sessions;
    } else {
        // Fusionar - evitar duplicados por ID
        const existingExerciseIds = new Set(gymTracker.exercises.map(e => e.id));
        const existingMesoIds = new Set(gymTracker.mesocycles.map(m => m.id));
        const existingSessionIds = new Set(gymTracker.sessions.map(s => s.id));
        
        pendingImportData.exercises.forEach(ex => {
            if (!existingExerciseIds.has(ex.id)) {
                gymTracker.exercises.push(ex);
            }
        });
        
        pendingImportData.mesocycles.forEach(meso => {
            if (!existingMesoIds.has(meso.id)) {
                gymTracker.mesocycles.push(meso);
            }
        });
        
        pendingImportData.sessions.forEach(session => {
            if (!existingSessionIds.has(session.id)) {
                gymTracker.sessions.push(session);
            }
        });
    }
    
    gymTracker.saveToStorage();
    gymTracker.init();
    
    // Limpiar
    pendingImportData = null;
    document.getElementById('import-file').value = '';
    document.getElementById('import-preview').classList.add('hidden');
    closeModal('import-confirm-modal');
    
    gymTracker.showNotification(`Datos importados correctamente (${mode === 'merge' ? 'fusionados' : 'reemplazados'})`, 'success');
}

function clearAllData() {
    if (confirm('¿Estás seguro de que quieres borrar TODOS los datos? Esta acción no se puede deshacer.\n\nRecomendación: Exporta un backup primero.')) {
        if (confirm('Última advertencia: ¿Realmente quieres eliminar todos tus ejercicios, mesociclos y sesiones?')) {
            gymTracker.exercises = [];
            gymTracker.mesocycles = [];
            gymTracker.sessions = [];
            gymTracker.currentSession = null;
            localStorage.removeItem('gym_current_session');

            // Limpiar todos los órdenes aleatorios de mesociclos
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('gym_meso_order_')) {
                    localStorage.removeItem(key);
                }
            }

            gymTracker.saveToStorage();
            gymTracker.init();
            gymTracker.showNotification('Todos los datos han sido eliminados', 'success');
        }
    }
}

function clearSessionsOnly() {
    if (confirm('¿Estás seguro de que quieres borrar solo las sesiones completadas? Los ejercicios y mesociclos se mantendrán.')) {
        gymTracker.sessions = [];
        gymTracker.mesocycles.forEach(m => m.completedSessions = 0);
        gymTracker.saveToStorage();
        gymTracker.updateStats();
        gymTracker.renderPersonalRecords();
        gymTracker.showNotification('Sesiones eliminadas correctamente', 'success');
    }
}

function clearMesocyclesOnly() {
    if (confirm('¿Estás seguro de que quieres borrar todos los mesociclos? Los ejercicios y sesiones completadas se mantendrán.')) {
        if (confirm('Última advertencia: ¿Realmente quieres eliminar todos los mesociclos?')) {
            gymTracker.mesocycles = [];
            gymTracker.saveToStorage();
            gymTracker.updateStats();
            gymTracker.updateMesocycleSelect();
            gymTracker.renderMesocycles();
            gymTracker.showNotification('Mesociclos eliminados correctamente', 'success');
        }
    }
}

function clearExercisesOnly() {
    if (confirm('¿Estás seguro de que quieres borrar todos los ejercicios? Los mesociclos y sesiones completadas se mantendrán, pero los ejercicios en ellos quedarán sin referencia.')) {
        if (confirm('Última advertencia: ¿Realmente quieres eliminar todos los ejercicios?')) {
            gymTracker.exercises = [];
            gymTracker.saveToStorage();
            gymTracker.updateStats();
            gymTracker.updateStatsExerciseSelect();
            gymTracker.renderExercises();
            gymTracker.renderPersonalRecords();
            gymTracker.showNotification('Ejercicios eliminados correctamente', 'success');
        }
    }
}

// ==================== AUTOMATRÓN ====================

// Configuraciones de objetivos de entrenamiento
const autoConfigs = {
    strength: {
        name: 'Fuerza Máxima',
        setsRange: [3, 5],
        repsRange: [1, 5],
        percentageRange: [85, 95],
        restTime: '3-5 min',
        progression: 'Lineal (aumento de peso semanal)',
        periodization: [
            { week: 1, percentage: 85, sets: 5, reps: 5 },
            { week: 2, percentage: 87.5, sets: 5, reps: 3 },
            { week: 3, percentage: 90, sets: 3, reps: 3 },
            { week: 4, percentage: 92.5, sets: 2, reps: 2 }
        ]
    },
    hypertrophy: {
        name: 'Hipertrofia',
        setsRange: [3, 4],
        repsRange: [8, 12],
        percentageRange: [65, 80],
        restTime: '60-90 seg',
        progression: 'Doble progresión (reps → peso)',
        periodization: [
            { week: 1, percentage: 70, sets: 4, reps: 12 },
            { week: 2, percentage: 72.5, sets: 4, reps: 10 },
            { week: 3, percentage: 75, sets: 3, reps: 8 },
            { week: 4, percentage: 77.5, sets: 3, reps: 8 }
        ]
    },
    endurance: {
        name: 'Resistencia Muscular',
        setsRange: [2, 3],
        repsRange: [15, 20],
        percentageRange: [50, 65],
        restTime: '30-60 seg',
        progression: 'Aumento de volumen',
        periodization: [
            { week: 1, percentage: 55, sets: 3, reps: 20 },
            { week: 2, percentage: 57.5, sets: 3, reps: 18 },
            { week: 3, percentage: 60, sets: 3, reps: 15 },
            { week: 4, percentage: 62.5, sets: 2, reps: 15 }
        ]
    },
    power: {
        name: 'Potencia',
        setsRange: [3, 5],
        repsRange: [3, 5],
        percentageRange: [60, 75],
        restTime: '2-3 min',
        progression: 'Movimientos explosivos',
        periodization: [
            { week: 1, percentage: 60, sets: 5, reps: 5 },
            { week: 2, percentage: 65, sets: 5, reps: 4 },
            { week: 3, percentage: 70, sets: 4, reps: 3 },
            { week: 4, percentage: 75, sets: 3, reps: 3 }
        ]
    },
    mixed: {
        name: 'Mixto',
        setsRange: [3, 4],
        repsRange: [6, 10],
        percentageRange: [70, 85],
        restTime: '90 seg - 2 min',
        progression: 'Periodización undulante',
        periodization: [
            { week: 1, percentage: 70, sets: 4, reps: 10 },
            { week: 2, percentage: 77.5, sets: 4, reps: 6 },
            { week: 3, percentage: 82.5, sets: 3, reps: 5 },
            { week: 4, percentage: 85, sets: 3, reps: 4 }
        ]
    }
};

// La aplicación se inicializa en el HTML cuando el DOM está listo

// ==================== GENERADOR AUTOMÁTICO DE SERIES ====================

function openAutoSetsModal() {
    if (!gymTracker.currentSession) {
        document.getElementById('auto-sets-no-session').classList.remove('hidden');
        document.getElementById('auto-sets-content').classList.add('hidden');
    } else {
        document.getElementById('auto-sets-no-session').classList.add('hidden');
        document.getElementById('auto-sets-content').classList.remove('hidden');
        renderAutoSetsPreview();
    }
    document.getElementById('auto-sets-modal').classList.add('active');
}

function filterSessionExercises() {
    gymTracker.filterSessionExercises();
}

function selectAllSessionExercises() {
    gymTracker.selectAllSessionExercises();
}

function deselectAllSessionExercises() {
    gymTracker.deselectAllSessionExercises();
}

function confirmSessionExercises() {
    gymTracker.confirmSessionExercises();
}

function updateSplitInfo() {
    gymTracker.updateSplitInfo();
}

function renderAutoSetsPreview() {
    if (!gymTracker.currentSession) return;
    
    const container = document.getElementById('auto-sets-exercises-list');
    const exercises = gymTracker.currentSession.exercises;
    
    if (exercises.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay ejercicios en la sesión actual</p>';
        return;
    }
    
    container.innerHTML = exercises.map((ex, index) => `
        <div style="padding: 15px; margin-bottom: 10px; background: var(--card-bg); border-radius: 8px; border-left: 3px solid var(--primary-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: var(--text-primary);">${ex.name}</strong>
                <span style="color: var(--text-secondary); font-size: 0.9rem;">1RM: ${ex.rm}kg</span>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;" id="auto-preview-${index}">
                <span style="color: var(--text-secondary); font-size: 0.85rem;">
                    <i class="fas fa-info-circle"></i> Se generarán series inteligentes basadas en tu historial
                </span>
            </div>
        </div>
    `).join('');
}

function generateAutoSets() {
    if (!gymTracker.currentSession) {
        gymTracker.showNotification('No hay una sesión activa', 'warning');
        return;
    }

    const objective = document.getElementById('auto-sets-objective').value;
    const intensity = document.getElementById('auto-sets-intensity').value;
    const numSets = parseInt(document.getElementById('auto-sets-count').value);
    const sessionNumber = gymTracker.currentSession.sessionNumber || 1;

    // Calcular semana real para los porcentajes
    const meso = gymTracker.mesocycles.find(m => m.id === gymTracker.currentSession.mesocycleId);
    const sessionsPerWeek = meso ? (meso.sessionsPerWeek || 3) : 3;
    const weekNumber = gymTracker.getWeekNumber(sessionNumber, sessionsPerWeek);

    // Detectar objetivo del mesociclo si está en modo automático
    let targetObjective = objective;
    if (objective === 'auto' && gymTracker.currentSession.mesocycleId) {
        if (meso && meso.objective) {
            targetObjective = meso.objective;
        } else {
            targetObjective = 'mixed';
        }
    } else if (objective === 'auto') {
        targetObjective = 'mixed';
    }

    // Configuraciones base por objetivo (solo reps y RPE objetivo)
    const baseConfigs = {
        strength: { reps: 5, rpeTarget: 8 },
        hypertrophy: { reps: 10, rpeTarget: 8 },
        endurance: { reps: 15, rpeTarget: 9 },
        power: { reps: 3, rpeTarget: 7 },
        deload: { reps: 10, rpeTarget: 5 },
        mixed: { reps: 8, rpeTarget: 8 }
    };

    // Para test1rm no usamos baseConfigs, tiene su propia lógica
    const config = targetObjective === 'test1rm' ? null : baseConfigs[targetObjective];

    // Ajustar por intensidad seleccionada
    const intensityMultipliers = {
        conservative: { percentage: 0.95, reps: 1.2 },
        moderate: { percentage: 1.0, reps: 1.0 },
        aggressive: { percentage: 1.05, reps: 0.9 }
    };

    const mult = intensityMultipliers[intensity];

    gymTracker.currentSession.exercises.forEach((ex, exIndex) => {
        // Analizar historial del ejercicio
        const exerciseHistory = gymTracker.sessions.flatMap(s =>
            s.exercises.filter(e => e.exerciseId === ex.exerciseId)
                .flatMap(e => e.sets.filter(set => set.completed && set.weight > 0)
                    .map(set => ({ weight: set.weight, reps: set.targetReps })))
        );

        // Calcular peso base de referencia (última serie/working set) sin ajuste de progresión de sesión
        let referenceWeight = Math.round(ex.rm * (85 / 100) * mult.percentage);

        // Si hay historial, ajustar basado en el último rendimiento
        if (exerciseHistory.length > 0) {
            const recentPerformances = exerciseHistory.slice(-3);
            const avgWeight = recentPerformances.reduce((sum, p) => sum + p.weight, 0) / recentPerformances.length;

            // Aplicar progresión gradual
            if (intensity === 'aggressive') {
                referenceWeight = Math.round(avgWeight * 1.025); // +2.5%
            } else if (intensity === 'moderate') {
                referenceWeight = Math.round(avgWeight * 1.01); // +1%
            } else {
                referenceWeight = Math.round(avgWeight * 0.98); // -2% (conservador)
            }
        }

        // Generar series usando porcentajes progresivos
        ex.sets = [];
        
        // CASO ESPECIAL: Test de 1RM
        if (targetObjective === 'test1rm') {
            // Configuración dinámica según número de series solicitadas
            // Ajustar porcentajes según intensidad seleccionada
            const intensityAdjustment = {
                conservative: -2.5,
                moderate: 0,
                aggressive: 2.5
            };
            const adjustment = intensityAdjustment[intensity] || 0;
            
            // Construir series dinámicamente según numSets
            let testSets = [];
            
            // Calcular porcentaje del 1RM según intensidad (para superar el actual)
            const targetRMPercentage = {
                conservative: 102,
                moderate: 105,
                aggressive: 108
            }[intensity] || 105;
            
            if (numSets === 3) {
                // Mínimo: Calentamiento + Aproximación + 1RM
                testSets = [
                    { percentage: 60, reps: 10, note: 'Calentamiento' },
                    { percentage: 85, reps: 3, note: 'Aproximación' },
                    { percentage: targetRMPercentage, reps: 1, note: `¡1RM! (${targetRMPercentage}%)` }
                ];
            } else if (numSets === 4) {
                // Calentamiento + 2 Aproximaciones + 1RM
                testSets = [
                    { percentage: 60, reps: 10, note: 'Calentamiento' },
                    { percentage: 80, reps: 3, note: 'Aproximación' },
                    { percentage: 90, reps: 1, note: 'Aproximación' },
                    { percentage: targetRMPercentage, reps: 1, note: `¡1RM! (${targetRMPercentage}%)` }
                ];
            } else {
                // 5+ series: Calentamiento + 3 Aproximaciones + 1RM + Backoffs
                testSets = [
                    { percentage: 60, reps: 10, note: 'Calentamiento' },
                    { percentage: 75, reps: 5, note: 'Aproximación' },
                    { percentage: 85, reps: 3, note: 'Aproximación' },
                    { percentage: 93, reps: 1, note: 'Aproximación' },
                    { percentage: targetRMPercentage, reps: 1, note: `¡1RM! (${targetRMPercentage}%)` }
                ];
                
                // Añadir backoffs para series adicionales
                for (let i = 5; i < numSets; i++) {
                    testSets.push({ percentage: 75, reps: 5, note: 'Backoff' });
                }
            }
            
            testSets.forEach((testSet, idx) => {
                let adjustedPercentage = Math.round(testSet.percentage + adjustment);
                // Permitir hasta 110% para el test de 1RM
                adjustedPercentage = Math.max(50, Math.min(110, adjustedPercentage));
                
                let setWeight = Math.round(ex.rm * (adjustedPercentage / 100));
                
                ex.sets.push({
                    targetReps: testSet.reps,
                    suggestedWeight: setWeight,
                    percentage: adjustedPercentage,
                    weight: setWeight,
                    completed: false,
                    note: testSet.note
                });
            });
        } else {
            // Generación normal de series para otros objetivos
            let baseReps = Math.round(config.reps * mult.reps);
            
            for (let i = 0; i < numSets; i++) {
                // Usar la función getProgressivePercentage que considera la semana del mesociclo
                let setPercentage = gymTracker.getProgressivePercentage(weekNumber, i);
                let setReps = baseReps;

                // Aplicar ajuste de intensidad al porcentaje
                setPercentage = Math.round(setPercentage * mult.percentage);
                setPercentage = Math.max(50, Math.min(95, setPercentage));

                // Calcular peso
                let setWeight = Math.round(ex.rm * (setPercentage / 100));

                // Ajustar según el objetivo
                if (targetObjective === 'strength' || targetObjective === 'power') {
                    // Para fuerza/potencia: menos reps en series más pesadas
                    if (setPercentage >= 85) {
                        setReps = Math.max(1, baseReps - 2);
                    } else if (setPercentage >= 80) {
                        setReps = Math.max(3, baseReps - 1);
                    }
                } else if (targetObjective === 'hypertrophy') {
                    // Para hipertrofia: más reps en series más ligeras
                    if (setPercentage <= 75) {
                        setReps = baseReps + 2;
                    }
                } else if (targetObjective === 'endurance') {
                    // Para resistencia: más reps en series ligeras
                    if (setPercentage <= 75) {
                        setReps = baseReps + 5;
                    }
                } else if (targetObjective === 'deload') {
                    // Para descarga: porcentajes más bajos
                    setPercentage = Math.max(50, setPercentage - 20);
                }
                
                // Ajustar para que la última serie coincida con el peso de trabajo calculado
                if (i === numSets - 1) {
                    setWeight = referenceWeight;
                }
                
                ex.sets.push({
                    targetReps: setReps,
                    suggestedWeight: setWeight,
                    percentage: setPercentage,
                    weight: setWeight,
                    completed: false
                });
            }
        }
    });
    
    // Guardar y actualizar
    localStorage.setItem('gym_current_session', JSON.stringify(gymTracker.currentSession));
    gymTracker.renderSession();
    closeModal('auto-sets-modal');
    
    const objectiveNames = {
        strength: 'Fuerza',
        hypertrophy: 'Hipertrofia',
        endurance: 'Resistencia',
        power: 'Potencia',
        deload: 'Descarga',
        mixed: 'Mixto',
        test1rm: 'Test 1RM'
    };

    const weekType = gymTracker.getWeekType(weekNumber);

    gymTracker.showNotification(`Series generadas: ${objectiveNames[targetObjective]} - ${weekType}`, 'success');
}

// Agregar estilos de animación para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Auto-guardar sesión cada 30 segundos
setInterval(() => {
    if (gymTracker.currentSession) {
        localStorage.setItem('gym_current_session', JSON.stringify(gymTracker.currentSession));
    }
}, 30000);

// Function to clear all caches and reload
function clearCacheAndReload() {
    if (confirm('Esto limpiará toda la caché y recargará la página. ¿Continuar?')) {
        // Clear all caches
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                // Unregister service worker
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                        return Promise.all(
                            registrations.map(registration => registration.unregister())
                        );
                    }).then(() => {
                        // Clear localStorage app update flag
                        localStorage.removeItem('gym_app_updated');
                        // Reload page
                        window.location.reload(true);
                    });
                } else {
                    window.location.reload(true);
                }
            });
        } else {
            window.location.reload(true);
        }
    }
}
