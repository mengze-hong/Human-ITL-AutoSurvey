const prompts = {
    "summary": "[Role] Expert summarizer\n[Task] Summarize the following research paper content into a concise abstract (100-150 words).\n[Content]\nTitle: {title}\nAbstract: {abstract}\n\n[Instructions]\n1. Produce a clear, concise summary capturing the main points.\n2. Use an academic tone.\n3. If only a title is provided, infer a reasonable summary based on typical content for that title.\n4. Avoid adding fictitious details beyond reasonable inference.\n\n[Output Format]\n<Summary>",
    "outline": "[Role] Expert academic write\n[Paper Context]\nTitle: {title}\nType: {type}\nKeywords: {keywords}\nReference Sections: {supplementalContext}\n\n[Section Requirements]\nsectionHeading: {sectionHeading}\nMust Include:\n{keyPoints}\nLength: {length}\n\n[Instructions]\n1. Create a detailed outline for each paragraph in the section, based on the provided refernece {referneces}.\n2. Pay attention that the section is contained within a research paper, thus no introduction or conclusion is needed and only focus on the paragraphs serving for this section\n3. Output in concise and meaningful bullet point to guide paragraph writing. \n\n[Output Format]\n<Outline>",
    "allocateReferences": "[Role] Expert academic writer\n[Task] Allocate ALL provided references to the provided section outline based on relevance.\n[Outline]\n{outline}\n\n[References]\n{references}\n\n[Instructions]\n1. For each paragraph in outline, assign relevant references.\n2. Provide an extremely concise explanation for each allocation, including what content should be used.\n3. Strictly provide the citation format as provided in each refernece.\n4. ALL provided references must be used, and each reference can be repeated at most TWICE in the allocation.\n\n[Output Format]\n<Allocated References>\n- <Outline Paragraph>: <Reference Title> (<Explanation>) <Citation Format>\n...",
    "generateSection": "[Role] Expert academic writer composing a specific section for a research paper\n[Paper Context]\nTitle: {title}\nType: {type}\nKeywords: {keywords}\nPrevious Sections: {supplementalContext}\nStyle: {formalism} formalism for {audience}\n\n[Section Requirements]\nsectionHeading: {sectionHeading}\nMust Include:\n{keyPoints}\nLength: {length}\nOutline:\n{outline}\nAllocated References:\n{allocatedRefs}\n\n[Instructions]\n1. Write in {tone} academic tone\n2. Use {formalism} formalism\n3. Cite provided references with biblatex, using cite command. \n4. Follow the provided outline\n5. Structure content logically\n7. Include smooth transitions between paragraphs\n8. Strictly output {length} paragraphs\n9. Avoid using uncommon vocabularies or inappropriate structures\n10. Learn the writing style from {example}\n11. Make sure the references are cited within the writing, not at the end.\n\n[Output Format]\n<Section Heading>\n<Well-structured content>",
    "refineSection": "[Role] Expert academic writer\n[Paper Context]\nTitle: {title}\nType: {type}\nKeywords: {keywords}\nStyle: {formalism} formalism for {audience}\n\n[Section Requirements]\nsectionHeading: {sectionHeading}\nMust Include:\n{keyPoints}\nLength: {length}\n\n[Current Content]\n{currentContent}\n\n[User Comments]\n{comments}\n\n[Instructions]\n1. Revise the current content based on the user comments.\n2. Maintain the original structure and requirements.\n3. Use {tone} academic tone and {formalism} formalism.\n4. Cite sources as [Author, Year].\n\n[Output Format]\n<Section Heading>\n<Well-structured content>\n<Transition to next section>"
}

class SectionGenerator {
    constructor() {
        this.apiKey = '';
        this.prompts = prompts;
    }

    async callLLMAPI(prompt) {
        if (!this.apiKey) throw new Error("Please enter your API key in the Context page");

        const response = await fetch('https://api.xty.app/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        return (await response.json()).choices[0].message.content;
    }

    async buildSummaryPrompt(title, abstract) {
        const template = this.prompts.summary;
        return template
            .replace('{title}', title || 'Untitled')
            .replace('{abstract}', abstract || 'No abstract provided');
    }

    async generateOutline(sectionData, context, references) {
        const refsText = references.map(ref => `- ${ref.title} (${ref.citation})\n  ${ref.abstract.substring(0, 150)}...`).join('\n\n');

        const lengthMap = { short: "1-2 paragraphs", medium: "3-5 paragraphs", long: "6+ paragraphs" };
        const template = this.prompts.outline;
        const prompt = template
            .replace('{title}', context.title || 'Untitled')
            .replace('{type}', context.paperType || 'survey paper')
            .replace('{keywords}', context.keywords?.join(', ') || 'none')
            .replace('{formalism}', context.style?.formalism || 'Medium')
            .replace('{audience}', context.style?.audience || 'researchers')
            .replace('{sectionHeading}', sectionData.sectionContext)
            .replace('{keyPoints}', sectionData.keyPoints.map(p => `• ${p}`).join('\n'))
            .replace('{length}', lengthMap[sectionData.length])
            .replace('{supplementalContext}', sectionData.supplementalContext || 'None')
            .replace('{references}', refsText);

        console.log("Outline prompt:", prompt);
        return await this.callLLMAPI(prompt);
    }

    async allocateReferences(outline, references) {
        const refsText = references.map(ref => `- ${ref.title} (${ref.citation})\n  ${ref.abstract.substring(0, 150)}...`).join('\n\n');
        const template = this.prompts.allocateReferences
        const prompt = template
            .replace('{outline}', outline)
            .replace('{references}', refsText);
        return await this.callLLMAPI(prompt);
    }

    async generateSection(outline, allocatedRefs, sectionData, context) {
        const lengthMap = { short: "1-2 paragraphs", medium: "3-5 paragraphs", long: "6+ paragraphs" };
        const template = this.prompts.generateSection;
        const prompt = template
            .replace('{title}', context.title || 'Untitled')
            .replace('{type}', context.paperType || 'survey paper')
            .replace('{keywords}', context.keywords?.join(', ') || 'none')
            .replace('{formalism}', context.style?.formalism || 'Medium')
            .replace('{audience}', context.style?.audience || 'researchers')
            .replace('{sectionHeading}', sectionData.sectionContext)
            .replace('{keyPoints}', sectionData.keyPoints.map(p => `• ${p}`).join('\n'))
            .replace('{length}', lengthMap[sectionData.length])
            .replace('{outline}', outline)
            .replace('{allocatedRefs}', allocatedRefs)
            .replace('{tone}', context.style?.tone || 'neutral')
            .replace('{supplementalContext}', sectionData.supplementalContext || 'None')
            .replace('{example}', context.style?.example || 'none');
        console.log("Generate section prompt:", prompt);
        return await this.callLLMAPI(prompt);
    }

    async refineSection(currentContent, comments, sectionData, context) {
        const lengthMap = { short: "1-2 paragraphs", medium: "3-5 paragraphs", long: "6+ paragraphs" };
        const template = this.prompts.refineSection;
        const prompt = template
            .replace('{title}', context.title || 'Untitled')
            .replace('{type}', context.paperType || 'survey paper')
            .replace('{keywords}', context.keywords?.join(', ') || 'none')
            .replace('{formalism}', context.style?.formalism || 'Medium')
            .replace('{audience}', context.style?.audience || 'researchers')
            .replace('{sectionHeading}', sectionData.sectionContext)
            .replace('{keyPoints}', sectionData.keyPoints.map(p => `• ${p}`).join('\n'))
            .replace('{length}', lengthMap[sectionData.length])
            .replace('{currentContent}', currentContent)
            .replace('{comments}', comments.map(c => `- "${c.text}": ${c.comment}`).join('\n'))
            .replace('{tone}', context.style?.tone || 'neutral');
        return await this.callLLMAPI(prompt);
    }
}

document.addEventListener('DOMContentLoaded', () => SectionManager.init());