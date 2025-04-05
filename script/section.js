const SectionManager = {
    config: null,
    currentSectionId: null,
    comments: [],
    generator: null,
    currentReferenceIndex: 0,

    init() {
        this.generator = new SectionGenerator();
        this.setupEventListeners();
        window.addEventListener('message', (event) => {
            if (event.data.action === 'loadContextData') {
                this.config = event.data.data;
                this.currentSectionId = event.data.sectionId;
                this.generator.apiKey = this.config.context.apiKey || '';
                this.loadSectionData();
            }
        });
    },

    loadSectionData() {
        const sectionData = this.config.sections[this.currentSectionId] || {};
        document.getElementById('sectionName').textContent = sectionData.name || `Section ${this.currentSectionId}`;
        document.getElementById('sectionContext').value = sectionData.sectionContext || '';
        document.getElementById('keyPoints').value = Array.isArray(sectionData.keyPoints) ? sectionData.keyPoints.join('\n') : '';
        document.getElementById('sectionLength').value = sectionData.length || 'medium';
        document.getElementById('generatedOutline').value = sectionData.outline || '';
        document.getElementById('allocatedReferences').textContent = sectionData.allocatedReferences || '';
        document.getElementById('generatedContent').textContent = sectionData.generatedContent || '';

        const refContainer = document.getElementById('referencePapersContainer').querySelector('.carousel');
        refContainer.innerHTML = '';
        if (sectionData.references?.length > 0) {
            sectionData.references.forEach((ref, index) => this.addReference(ref, index));
            this.currentReferenceIndex = 0;
            this.showReference(this.currentReferenceIndex);
        } else {
            this.addReference();
        }

        this.comments = sectionData.comments || [];
        this.renderComments();
        this.populateContextSections(sectionData.contextSections || []);
    },

    populateContextSections(selectedSections = []) {
        const contextSections = document.getElementById('contextSections');
        contextSections.innerHTML = '';
        Object.keys(this.config.sections).forEach(sectionId => {
            if (sectionId !== this.currentSectionId) {
                const option = document.createElement('option');
                option.value = sectionId;
                option.textContent = this.config.sections[sectionId].name || `Section ${sectionId}`;
                if (selectedSections.includes(sectionId)) {
                    option.selected = true;
                }
                contextSections.appendChild(option);
            }
        });
    },

    editSectionName() {
        const currentName = document.getElementById('sectionName').textContent;
        const newName = prompt("Enter new section name:", currentName);
        if (newName && newName !== currentName) {
            document.getElementById('sectionName').textContent = newName;
            this.saveSectionData();
        }
    },

    getSectionData() {
        const contextSections = Array.from(document.getElementById('contextSections').selectedOptions).map(option => option.value);
        return {
            name: document.getElementById('sectionName').textContent,
            sectionContext: document.getElementById('sectionContext').value,
            keyPoints: document.getElementById('keyPoints').value.split('\n').filter(p => p.trim()),
            length: document.getElementById('sectionLength').value,
            contextSections: contextSections,
            references: this.getReferences(),
            outline: document.getElementById('generatedOutline').value,
            allocatedReferences: document.getElementById('allocatedReferences').textContent,
            generatedContent: document.getElementById('generatedContent').textContent,
            comments: this.comments,
            timestamp: new Date().toISOString()
        };
    },

    getSupplementalContext() {
        const contextSections = Array.from(document.getElementById('contextSections').selectedOptions).map(option => option.value);
        let supplementalContent = '';
        contextSections.forEach(sectionId => {
            const section = this.config.sections[sectionId];
            if (section) {
                supplementalContent += `\n\n Title: ${section.name || `Section ${sectionId}`}\n`;
                if (section.generatedContent) {
                    supplementalContent += `Outline:\n${section.outline}\n`;
                }
            }
        });
        return supplementalContent.trim();
    },

    saveSectionData() {
        const sectionData = this.getSectionData();
        window.parent.postMessage({
            action: 'saveState',
            page: 'section',
            sectionId: this.currentSectionId,
            data: sectionData
        }, '*');
    },

    saveAndContinue() {
        this.saveSectionData();
        window.parent.postMessage({ action: 'navigate', page: 'section', sectionId: parseInt(this.currentSectionId) + 1 }, '*');

        const jsonContent = JSON.stringify(this.config, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `research_context_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    getReferences() {
        return Array.from(document.querySelectorAll('.reference-paper')).map(ref => ({
            title: ref.querySelector('.reference-title').value,
            citation: ref.querySelector('.reference-citation').value,
            abstract: ref.querySelector('.reference-abstract').value
        }));
    },

    addBulkReferences() {
        const input = document.getElementById('bulkReferenceInput').value.trim();
        if (!input) {
            alert("Please enter at least one reference.");
            return;
        }

        // Split input into paragraphs (each paragraph is a reference)
        const referenceEntries = input.split(/\n\s*\n/).filter(entry => entry.trim() !== '');

        // Parse each entry
        const references = referenceEntries.map(entry => {
            // Match the citation (e.g., \cite{t101})
            const citationMatch = entry.match(/\\cite\{([^}]+)\}/);
            if (!citationMatch) return null;

            const citation = citationMatch[0]; // e.g., \cite{t101}
            console.log(citation)
            const afterCitation = entry.slice(citationMatch.index - 1 + citationMatch[0].length); // Everything after \cite{t101}

            // Find the title, which is between the } of \cite and the next }
            const titleStart = afterCitation.indexOf('}') + 1; // Start after the first } (from \textcolor{red}{...})
            const titleEnd = afterCitation.indexOf('}', titleStart); // Find the next }

            console.log(titleStart, titleEnd)

            const title = afterCitation.slice(1, titleEnd).trim(); // e.g., CraftAssist instruction parsing: Semantic parsing for a voxel-world assistant
            const abstract = afterCitation.slice(titleEnd + 1).trim(); // Everything after the title's closing }

            return { citation, title, abstract };
        }).filter(ref => ref !== null); // Filter out invalid entries

        if (references.length === 0) {
            alert("No valid references found. Please use the format: \\textcolor{red}{\\cite{key}Title}Abstract...");
            return;
        }

        // Add each parsed reference
        references.forEach(ref => {
            this.addReference({
                title: ref.title,
                citation: ref.citation,
                abstract: ref.abstract
            });
        });

        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('bulkReferenceModal'));
        modal.hide();

        // Clear the textarea
        document.getElementById('bulkReferenceInput').value = '';
    },

    addReference(refData = {}, index = null) {
        const refContainer = document.getElementById('referencePapersContainer').querySelector('.carousel');
        const refCount = refContainer.querySelectorAll('.reference-paper').length + 1;
        const newIndex = index !== null ? index : refCount - 1;
 
        const refHTML = `
            <div class="reference-paper" style="display: none;" data-index="${newIndex}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6>Reference Paper #${newIndex+1}</h6>
                    <i class="bi bi-trash text-danger" style="cursor: pointer;" onclick="SectionManager.removeReference(this)"></i>
                </div>
                <div class="mb-3">
                    <label class="form-label">Title</label>
                    <input type="text" class="form-control reference-title" placeholder="Paper title" value="${refData.title || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Citation</label>
                    <input type="text" class="form-control reference-citation" placeholder="Citation format" value="${refData.citation || ''}">
                </div>
                <div class="mb-3">
                    <label class="form-label">Abstract</label>
                    <textarea class="form-control reference-abstract" rows="3" placeholder="Paper abstract">${refData.abstract || ''}</textarea>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <i class="bi bi-paperclip upload-btn me-2" title="Upload PDF"></i>
                        <small class="text-muted">PDF upload coming soon</small>
                    </div>
                    <button class="btn btn-outline-info btn-sm summarize-btn" onclick="SectionManager.summarizeReference(this)">
                        <i class="bi bi-file-text me-1"></i> Summarize
                        <span class="spinner-border spinner-border-sm ms-1" role="status" style="display: none;"></span>
                    </button>
                </div>
            </div>
        `;
        document.getElementById('referenceCarousel').insertAdjacentHTML('beforeend', refHTML);
        document.getElementById("total").textContent = `Total: ${refCount}`;
        this.updateReferenceDisplay();
        this.saveSectionData();

        // Update navigation arrows visibility
        this.updateNavigationArrows();

        // Automatically switch to the new reference
        this.currentReferenceIndex = newIndex;
        this.showReference(this.currentReferenceIndex);

    },

    removeReference(element) {
        const refContainer = document.getElementById('referencePapersContainer').querySelector('.carousel');
        const refItems = refContainer.querySelectorAll('.reference-paper');
        if (refItems.length > 1) {
            const item = element.closest('.reference-paper');
            const removedIndex = parseInt(item.dataset.index);
            item.remove();

            // Reindex remaining references
            refItems.forEach((ref, index) => {
                ref.dataset.index = index;
                ref.querySelector('h6').textContent = `Reference Paper #${index + 1}`;
            });

            // Adjust current index
            if (this.currentReferenceIndex >= refItems.length - 1) {
                this.currentReferenceIndex = refItems.length - 2;
            }
            if (this.currentReferenceIndex === removedIndex) {
                this.currentReferenceIndex = Math.min(this.currentReferenceIndex, refItems.length - 2);
            }
            if (this.currentReferenceIndex < 0) {
                this.currentReferenceIndex = 0;
            }

            this.showReference(this.currentReferenceIndex);
            this.updateNavigationArrows();
            this.saveSectionData();
        } else {
            alert("You must have at least one reference paper.");
        }

        const refCount = refContainer.querySelectorAll('.reference-paper').length - 1;

        document.getElementById("total").textContent = `Total: ${refCount}`;
    },

    renumberReferences() {
        document.querySelectorAll('.reference-paper h6').forEach((header, index) => {
            header.textContent = `Reference Paper #${index + 1}`;
        });
    },

    showReference(index) {
        const refContainer = document.getElementById('referencePapersContainer').querySelector('.carousel');
        const references = refContainer.querySelectorAll('.reference-paper');
        references.forEach((ref, i) => {
            ref.style.display = i === index ? 'block' : 'none';
        });
        this.currentReferenceIndex = index;
        this.updateNavigationArrows();
    },

    prevReference() {
        if (this.currentReferenceIndex > 0) {
            this.currentReferenceIndex--;
            this.showReference(this.currentReferenceIndex);
        }
    },

    nextReference() {
        const refContainer = document.getElementById('referencePapersContainer').querySelector('.carousel');
        const refCount = refContainer.querySelectorAll('.reference-paper').length;
        if (this.currentReferenceIndex < refCount - 1) {
            this.currentReferenceIndex++;
            this.showReference(this.currentReferenceIndex);
        }
    },

    updateNavigationArrows() {
        const refContainer = document.getElementById('referencePapersContainer').querySelector('.carousel');
        const refCount = refContainer.querySelectorAll('.reference-paper').length;
        const prevButton = document.getElementById('prevReference');
        const nextButton = document.getElementById('nextReference');

        // Show/hide arrows based on the number of references and current index
        if (refCount <= 1) {
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
        } else {
            prevButton.style.display = this.currentReferenceIndex === 0 ? 'none' : 'block';
            nextButton.style.display = this.currentReferenceIndex === refCount - 1 ? 'none' : 'block';
        }
    },

    updateReferenceDisplay() {
        const references = document.querySelectorAll('.reference-paper');
        const prevBtn = document.getElementById('prevReference');
        const nextBtn = document.getElementById('nextReference');

        references.forEach(ref => {
            ref.style.display = 'none';
        });

        if (references.length > 0) {
            const currentRef = references[this.currentReferenceIndex];
            currentRef.style.display = 'block';            
            prevBtn.style.display = this.currentReferenceIndex > 0 ? 'block' : 'none';
            nextBtn.style.display = this.currentReferenceIndex < references.length - 1 ? 'block' : 'none';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }
    },

    async summarizeReference(button) {
        const referencePaper = button.closest('.reference-paper');
        const abstractField = referencePaper.querySelector('.reference-abstract');
        const titleField = referencePaper.querySelector('.reference-title').value;
        const currentAbstract = abstractField.value;

        if (!titleField && !currentAbstract) {
            alert("Please provide at least a title or abstract to summarize.");
            return;
        }

        const spinner = button.querySelector('.spinner-border');
        spinner.style.display = 'inline-block';
        button.disabled = true;

        try {
            const prompt = await this.generator.buildSummaryPrompt(titleField, currentAbstract);
            const summary = await this.generator.callLLMAPI(prompt);
            abstractField.value = summary;
            this.saveSectionData();
        } catch (error) {
            console.error("Summarization error:", error);
            abstractField.value = `Error: ${error.message}`;
        } finally {
            spinner.style.display = 'none';
            button.disabled = false;
        }
    },

    async generateOutline() {
        const outlineBtn = document.querySelector('#outlineText').parentElement;
        const outlineText = document.getElementById('outlineText');
        const outlineSpinner = document.getElementById('outlineSpinner');

        outlineText.textContent = 'Generating Outline...';
        outlineSpinner.style.display = 'inline-block';
        outlineBtn.disabled = true;

        try {
            const sectionData = this.getSectionData();
            sectionData.supplementalContext = this.getSupplementalContext();
            const outline = await this.generator.generateOutline(sectionData, this.config.context, this.getReferences());
            document.getElementById('generatedOutline').value = outline;
            this.saveSectionData();
        } catch (error) {
            console.error("Outline generation error:", error);
            document.getElementById('generatedOutline').value = `Error: ${error.message}`;
        } finally {
            outlineText.textContent = 'Generate Outline';
            outlineSpinner.style.display = 'none';
            outlineBtn.disabled = false;
        }
    },

    async allocateReferences() {
        const allocateBtn = document.querySelector('#allocateText').parentElement;
        const allocateText = document.getElementById('allocateText');
        const allocateSpinner = document.getElementById('allocateSpinner');

        allocateText.textContent = 'Allocating References...';
        allocateSpinner.style.display = 'inline-block';
        allocateBtn.disabled = true;

        try {
            const outline = document.getElementById('generatedOutline').value;
            if (!outline || outline.startsWith('Error:')) {
                throw new Error("Please generate a valid outline first.");
            }
            const sectionData = this.getSectionData();
            sectionData.supplementalContext = this.getSupplementalContext();
            const allocatedRefs = await this.generator.allocateReferences(outline, this.getReferences(), sectionData);
            document.getElementById('allocatedReferences').textContent = allocatedRefs;
            this.saveSectionData();
        } catch (error) {
            console.error("Reference allocation error:", error);
            document.getElementById('allocatedReferences').textContent = `Error: ${error.message}`;
        } finally {
            allocateText.textContent = 'Allocate References';
            allocateSpinner.style.display = 'none';
            allocateBtn.disabled = false;
        }
    },

    async generateSection() {
        const generateBtn = document.querySelector('#generateText').parentElement;
        const generateText = document.getElementById('generateText');
        const loadingSpinner = document.getElementById('loadingSpinner');

        generateText.textContent = 'Generating...';
        loadingSpinner.style.display = 'inline-block';
        generateBtn.disabled = true;

        try {
            const outline = document.getElementById('generatedOutline').value;
            const allocatedRefs = document.getElementById('allocatedReferences').textContent;
            if (!outline || outline.startsWith('Error:')) {
                throw new Error("Please generate a valid outline first.");
            }
            if (!allocatedRefs || allocatedRefs.startsWith('Error:')) {
                throw new Error("Please allocate references first.");
            }
            const sectionData = this.getSectionData();
            sectionData.supplementalContext = this.getSupplementalContext();
            const generatedContent = await this.generator.generateSection(outline, allocatedRefs, sectionData, this.config.context);
            document.getElementById('generatedContent').textContent = generatedContent;
            this.saveSectionData();
        } catch (error) {
            console.error("Generation error:", error);
            document.getElementById('generatedContent').innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        } finally {
            generateText.textContent = 'Generate Section';
            loadingSpinner.style.display = 'none';
            generateBtn.disabled = false;
        }
    },

    addComment() {
        const generatedContent = document.getElementById('generatedContent');
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && selection.toString().trim()) {
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString();
            const commentText = prompt("Enter your comment for the highlighted text:", "");
            if (commentText) {
                const span = document.createElement('span');
                span.className = 'highlighted';
                span.dataset.commentId = this.comments.length;
                range.surroundContents(span);

                this.comments.push({
                    id: this.comments.length,
                    text: selectedText,
                    comment: commentText,
                    timestamp: new Date().toISOString()
                });

                this.renderComments();
                this.saveSectionData();
            }
        } else {
            alert("Please highlight some text to comment on.");
        }
    },

    renderComments() {
        const commentContainer = document.getElementById('commentContainer');
        commentContainer.innerHTML = '';
        this.comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment';
            commentDiv.innerHTML = `
                <strong>Highlighted Text:</strong> "${comment.text}"<br>
                <strong>Comment:</strong> ${comment.comment}<br>
                <small>${new Date(comment.timestamp).toLocaleString()}</small>
            `;
            commentContainer.appendChild(commentDiv);
        });
    },

    async regenerateWithComments() {
        const generateBtn = document.querySelector('#generateText').parentElement;
        const generateText = document.getElementById('generateText');
        const loadingSpinner = document.getElementById('loadingSpinner');

        generateText.textContent = 'Regenerating...';
        loadingSpinner.style.display = 'inline-block';
        generateBtn.disabled = true;

        try {
            const sectionData = this.getSectionData();
            sectionData.supplementalContext = this.getSupplementalContext();
            const refinedContent = await this.generator.refineSection(
                document.getElementById('generatedContent').textContent,
                this.comments,
                sectionData,
                this.config.context
            );
            document.getElementById('generatedContent').innerHTML = refinedContent;
            this.comments = [];
            this.renderComments();
            this.saveSectionData();
        } catch (error) {
            console.error("Regeneration error:", error);
            document.getElementById('generatedContent').innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        } finally {
            generateText.textContent = 'Generate Section';
            loadingSpinner.style.display = 'none';
            generateBtn.disabled = false;
        }
    },

    setupEventListeners() {
        document.getElementById('sectionName').addEventListener('input', () => this.saveSectionData());
        document.getElementById('sectionContext').addEventListener('input', () => this.saveSectionData());
        document.getElementById('keyPoints').addEventListener('input', () => this.saveSectionData());
        document.getElementById('sectionLength').addEventListener('change', () => this.saveSectionData());
        document.getElementById('contextSections').addEventListener('change', () => this.saveSectionData());
        document.getElementById('generatedOutline').addEventListener('input', () => this.saveSectionData());
        document.getElementById('generatedContent').addEventListener('input', () => this.saveSectionData());
        document.getElementById('referencePapersContainer').addEventListener('input', (e) => {
            if (e.target.classList.contains('reference-title') || 
                e.target.classList.contains('reference-citation') || 
                e.target.classList.contains('reference-abstract')) {
                this.saveSectionData();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => SectionManager.init());