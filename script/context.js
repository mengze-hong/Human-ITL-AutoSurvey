// Get current context data from form fields
function getContextData() {
    return {
        title: document.getElementById('paperTitle').value,
        abstract: document.getElementById('abstract').value,
        keywords: document.getElementById('keywords').value.split(',').map(k => k.trim()).filter(k => k),
        paperType: document.getElementById('paperType').value,
        style: {
            formalism: document.getElementById('formalism').value,
            audience: document.getElementById('audience').value,
            tone: document.getElementById('tone').value,
            example: document.getElementById('writingExample').value
        },
        apiKey: document.getElementById('apiKey').value,
        timestamp: new Date().toISOString()
    };
}

// Save to localStorage via parent window
function saveToLocalStorage() {
    const config = getContextData();
    window.parent.postMessage({
        action: 'saveState',
        page: 'context',
        data: config
    }, '*');
}

// Save to local JSON file
function saveToJsonFile() {
    const config = getContextData();
    const jsonContent = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research_context_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Save and continue handler
function saveAndContinue() {
    saveToLocalStorage();  // Save to localStorage
    saveToJsonFile();      // Download JSON file
    window.parent.postMessage({ action: 'navigate', page: 'section' }, '*');
}

// Load context data into fields
function loadContextData(data) {
    document.getElementById('paperTitle').value = data.title || '';
    document.getElementById('abstract').value = data.abstract || '';
    document.getElementById('keywords').value = Array.isArray(data.keywords) ? data.keywords.join(', ') : '';
    document.getElementById('paperType').value = data.paperType || 'survey';
    document.getElementById('apiKey').value = data.apiKey || '';
    
    if (data.style) {
        document.getElementById('formalism').value = data.style.formalism || 'medium';
        document.getElementById('audience').value = data.style.audience || 'researchers';
        document.getElementById('tone').value = data.style.tone || 'neutral';
        document.getElementById('writingExample').value = data.style.example || '';
    }
}

function loadConfigFromFile(event) {
    const file = event.target.files[0];
    if (!file) {
        alert("Please select a JSON file to load.");
        return;
    }

    // Check if the file is a JSON file
    if (!file.name.endsWith('.json')) {
        alert("Please select a valid JSON file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedConfig = JSON.parse(e.target.result);

            // Validate the loaded config (basic check for required fields)
            if (!loadedConfig.meta || !loadedConfig.context || !loadedConfig.sections) {
                alert("Invalid JSON file: Missing required fields (meta, context, sections).");
                return;
            }

            // Update the current config and section ID
            config = loadedConfig;
            currentSectionId = loadedConfig.meta.currentSectionId;

            // Update localStorage
            localStorage.setItem('surveyConfig', JSON.stringify(config));


            console.log(config.sections)


            window.parent.postMessage({
                action: 'saveState',
                page: 'sections',
                data: config.sections
            }, '*');

            window.parent.postMessage({
                action: 'saveState',
                page: 'context',
                data: config.context
            }, '*');

            // Reload the section data to reflect the loaded config
            loadContextData(config.context)

            alert("Data successfully loaded from file!");
        } catch (error) {
            alert("Error parsing JSON file: " + error.message);
        }
    };
    reader.onerror = () => {
        alert("Error reading the file.");
    };
    reader.readAsText(file);

    // Reset the file input
    event.target.value = '';
}

// Wait for DOM to load, then listen for data
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for file input
    const fileInput = document.getElementById('loadConfigFile');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => this.loadConfigFromFile(event));
    }

    document.querySelectorAll('input, textarea, select').forEach(element => {
        element.addEventListener('change', saveToLocalStorage);
    });

    window.addEventListener('message', (event) => {
        if (event.data.action === 'loadContextData') {
            loadContextData(event.data.data.context);
        }
    });
});