const sectionModal = new bootstrap.Modal('#sectionModal');
let currentParentId = '';
let sectionCount = 1;
let currentStage = 'context';

// Save config to localStorage
function saveConfig() {
    window.surveyConfig.meta.lastModified = new Date().toISOString();
    localStorage.setItem('surveyConfig', JSON.stringify(window.surveyConfig));
}

// Update progress bar styling based on current stage
function updateProgress() {
    const circles = document.querySelectorAll('.progress-circle');
    const connectors = document.querySelectorAll('.progress-connector');
    
    circles.forEach(circle => circle.classList.remove('bg-success', 'active'));
    connectors.forEach(connector => connector.classList.remove('bg-success'));
    
    if (currentStage === 'context') {
        circles[0].classList.add('bg-success', 'active');
    } else if (currentStage === 'section') {
        const activeSectionId = window.surveyConfig.meta.currentSectionId;
        const activeCircle = document.querySelector(`#section-${activeSectionId}`);
        if (activeCircle) {
            circles.forEach((circle, index) => {
                if (index <= Array.from(circles).indexOf(activeCircle)) {
                    circle.classList.add('bg-success');
                }
                if (circle === activeCircle) {
                    circle.classList.add('active');
                }
            });
            connectors.forEach((connector, index) => {
                if (index < Array.from(circles).indexOf(activeCircle)) {
                    connector.classList.add('bg-success');
                }
            });
        }
    } else if (currentStage === 'review') {
        circles.forEach(circle => circle.classList.add('bg-success'));
        connectors.forEach(connector => connector.classList.add('bg-success'));
        circles[circles.length - 1].classList.add('active');
    }
}

// Show modal for adding a section
function showAddModal(e, parentId) {
    e.stopPropagation();
    currentParentId = parentId;
    sectionModal.show();
}

// Load configuration from localStorage and rebuild progress bar
function loadConfig() {
    const savedConfig = localStorage.getItem('surveyConfig');
    window.surveyConfig = savedConfig ? JSON.parse(savedConfig) : {
        meta: {
            currentStage: 'context',
            currentSectionId: 1,
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
        },
        context: {},
        sections: { 1: { name: 'Section 1' } },
        review: {}
    };
    currentStage = window.surveyConfig.meta.currentStage;
    sectionCount = Object.keys(window.surveyConfig.sections).length;

    rebuildProgressBar();
}

// Rebuild the progress bar entirely
function rebuildProgressBar() {
    const container = document.getElementById('progress-container');
    container.innerHTML = ''; // Clear existing content

    // Add Context circle
    const contextCircle = document.createElement('div');
    contextCircle.className = 'progress-circle bg-secondary text-white';
    contextCircle.textContent = 'C';
    contextCircle.onclick = () => navigateTo('context');
    container.appendChild(contextCircle);

    // Add sections
    const sections = Object.entries(window.surveyConfig.sections).sort(([a], [b]) => a - b);
    sections.forEach(([id, section]) => {
        const connector = document.createElement('div');
        connector.className = 'progress-connector bg-secondary';
        container.appendChild(connector);

        const sectionCircle = document.createElement('div');
        sectionCircle.className = 'progress-circle bg-secondary text-white';
        sectionCircle.id = `section-${id}`;
        sectionCircle.textContent = `S${id}`;

        const addButton = document.createElement('div');
        addButton.className = 'add-section';
        addButton.innerHTML = '<i class="bi bi-plus"></i>';
        addButton.onclick = (e) => showAddModal(e, sectionCircle.id);
        sectionCircle.appendChild(addButton);

        const removeButton = document.createElement('div');
        removeButton.className = 'remove-section';
        removeButton.innerHTML = '<i class="bi bi-trash"></i>';
        removeButton.onclick = (e) => removeSection(e, id);
        sectionCircle.appendChild(removeButton);

        sectionCircle.onclick = () => navigateTo('section', id);
        container.appendChild(sectionCircle);
    });

    // Add connector and Review circle
    const reviewConnector = document.createElement('div');
    reviewConnector.className = 'progress-connector bg-secondary';
    container.appendChild(reviewConnector);

    const reviewCircle = document.createElement('div');
    reviewCircle.className = 'progress-circle bg-secondary text-white';
    reviewCircle.textContent = 'R';
    reviewCircle.onclick = () => navigateTo('review');
    container.appendChild(reviewCircle);

    updateProgress(); // Apply styling after rebuilding
}

// Add a new section
function addSection() {
    const type = document.getElementById('sectionType').value;
    const name = document.getElementById('sectionName').value.trim();
    
    if (type === 'section' && name) {
        sectionCount++;
        const newSectionId = sectionCount;
        const parentId = currentParentId ? parseInt(currentParentId.replace('section-', '')) : 0;

        // Update surveyConfig first
        const newSections = {};
        const sections = Object.entries(window.surveyConfig.sections).sort(([a], [b]) => a - b);
        let inserted = false;
        let newIndex = 1;

        for (let [id, section] of sections) {
            if (!inserted && parseInt(id) === parentId) {
                newSections[newIndex++] = section;
                newSections[newIndex++] = { name }; // Insert new section after parent
                inserted = true;
            } else {
                newSections[newIndex++] = section;
            }
        }
        if (!inserted) { // If no parent found or parent is context, append
            newSections[newIndex] = { name };
        }
        window.surveyConfig.sections = newSections;

        // Rebuild the progress bar to reflect the updated config
        rebuildProgressBar();

        // Navigate to the new section
        navigateTo('section', newSectionId);

        saveConfig();
    }
    
    sectionModal.hide();
    document.getElementById('sectionName').value = '';
}

// Remove a section
function removeSection(e, sectionId) {
    e.stopPropagation(); // Prevent triggering the section navigation

    // Show confirmation pop-up
    const confirmation = confirm(`Are you sure you want to delete Section S${sectionId}? This action cannot be undone.`);
    if (!confirmation) {
        return; // Exit if user cancels
    }

    // Prevent removal if only one section remains
    if (Object.keys(window.surveyConfig.sections).length <= 1) {
        alert("Cannot remove the last section.");
        return;
    }

    // Remove the section from surveyConfig
    delete window.surveyConfig.sections[sectionId];

    // Renumber remaining sections
    const newSections = {};
    let newIndex = 1;
    for (let id in window.surveyConfig.sections) {
        newSections[newIndex++] = window.surveyConfig.sections[id];
    }
    window.surveyConfig.sections = newSections;
    sectionCount = Object.keys(newSections).length;

    // Adjust currentSectionId if it was the removed section or higher
    if (window.surveyConfig.meta.currentSectionId == sectionId) {
        window.surveyConfig.meta.currentSectionId = Math.min(sectionId, sectionCount);
    } else if (window.surveyConfig.meta.currentSectionId > sectionId) {
        window.surveyConfig.meta.currentSectionId--;
    }

    // Rebuild the progress bar and update state
    rebuildProgressBar();
    saveConfig();

    // Navigate to the current stage with updated section ID
    navigateTo(currentStage, window.surveyConfig.meta.currentSectionId);
}

// Navigate to a page or section
function navigateTo(page, sectionId = null) {
    currentStage = page;
    window.surveyConfig.meta.currentStage = page;
    if (sectionId) {
        window.surveyConfig.meta.currentSectionId = sectionId;
    }
    saveConfig();
    updateProgress();

    const iframe = document.getElementById('content-iframe');
    iframe.src = `${page}.html`;
    iframe.onload = () => {
        const config = JSON.parse(localStorage.getItem('surveyConfig'));
        iframe.contentWindow.postMessage({
            action: 'loadContextData',
            data: config,
            sectionId: sectionId || config.meta.currentSectionId
        }, '*');
    };
}

// Handle messages from iframe
window.addEventListener('message', (event) => {
    if (event.data.action === 'saveState') {
        if (event.data.page === 'context') {
            window.surveyConfig.context = event.data.data;
        } else if (event.data.page === 'section') {
            const sectionId = event.data.sectionId || window.surveyConfig.meta.currentSectionId;
            window.surveyConfig.sections[sectionId] = event.data.data;
        }else if (event.data.page === 'sections') {
            window.surveyConfig.sections = event.data.data;
        } else if (event.data.page === 'review') {
            window.surveyConfig.review = event.data.data;
        }
        saveConfig();
        rebuildProgressBar(); // Ensure progress bar reflects any name changes
    } else if (event.data.action === 'navigate') {
        navigateTo(event.data.page, event.data.sectionId);
    }
});

// Initialize - Force loading context iframe on startup
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    navigateTo('section', window.surveyConfig.meta.currentSectionId);
});