const sectionModal = new bootstrap.Modal('#sectionModal');   //创建一个 Bootstrap 模态框对象，绑定 ID 为 #sectionModal 的元素，用来添加节（section）时弹出窗口。
let currentParentId = '';   //记录当前在哪个 section 后面添加新的 section。
let sectionCount = 1;  //初始化节的数量为1，后续添加节会+1。
let currentStage = 'context';   //当前所处的阶段，比如 'context'、'section'、'review'，用于控制流程。

// Save config to localStorage  把配置对象 surveyConfig 保存到浏览器本地存储 localStorage，并更新最后修改时间。
function saveConfig() {
    window.surveyConfig.meta.lastModified = new Date().toISOString();
    localStorage.setItem('surveyConfig', JSON.stringify(window.surveyConfig));
}

// Update progress bar styling based on current stage 更新进度条的显示样式
function updateProgress() {
    // 更新圆圈（阶段标志）和连接线的样式，表示当前进度。
    const circles = document.querySelectorAll('.progress-circle');
    // console.log("circles", circles)
    const connectors = document.querySelectorAll('.progress-connector');
    // console.log("connectors", connectors)
    
    // 清空所有圆圈和连线的高亮样式。
    circles.forEach(circle => circle.classList.remove('bg-success', 'active'));
    connectors.forEach(connector => connector.classList.remove('bg-success'));
    
    // 1.如果当前阶段是 context（背景信息），就高亮第一个圆圈。
    if (currentStage === 'context') {
        circles[0].classList.add('bg-success', 'active');
    } else if (currentStage === 'section') {
        // 2.如果是节阶段，则找到当前节的 DOM 元素。
        const activeSectionId = window.surveyConfig.meta.currentSectionId;
        const activeCircle = document.querySelector(`#section-${activeSectionId}`);
        if (activeCircle) {   //2.2将当前节及之前的圆圈设置为“已完成”，当前节为“激活”状态。
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
    } else if (currentStage === 'review') {   //如果是最后的复查阶段，所有圆圈都高亮，最后一个圆圈为激活状态。
        circles.forEach(circle => circle.classList.add('bg-success'));
        connectors.forEach(connector => connector.classList.add('bg-success'));
        circles[circles.length - 1].classList.add('active');
    }
}

// Show modal for adding a section  显示添加节的模态框   点击加号时弹出模态框，并记录它是在哪个节后面添加的。
function showAddModal(e, parentId) {
    e.stopPropagation();
    currentParentId = parentId;
    sectionModal.show();
}

// Load configuration from localStorage and rebuild progress bar
function loadConfig() {
    // 从本地读取之前保存的配置。
    const savedConfig = localStorage.getItem('surveyConfig');
    // 如果没有保存过，就用默认值初始化。
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

// Rebuild the progress bar entirely    重新生成进度条。
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

// Add a new section   添加节的逻辑
function addSection() {
    //  提交模态框后添加节：
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

// Remove a section 删除节的逻辑
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

// Navigate to a page or section  // 导航切换不同页面或节 跳转页面，比如 context.html、section.html 等。
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

// Handle messages from iframe  iframe 的通信监听器
window.addEventListener('message', (event) => {
    // 接收子页面（iframe）传来的数据进行保存。
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

// Initialize - Force loading context iframe on startup  页面加载时自动启动  默认打开当前 section 页面。
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    navigateTo('section', window.surveyConfig.meta.currentSectionId);
});