// data/impact.js

/**
 * DOTS Environmental Impact Data Model
 * Scientific Integrity Guardrail: Ensure all calculations use defensible assumptions.
 */

const sources = [
    {
        id: "bdj_tubes",
        label: "Toothpaste Tube Waste Estimate (UK)",
        value: "300 million tubes/year",
        source: "British Dental Journal",
        url: "https://doi.org/10.1038/s41415-021-2926-y",
        type: "reported estimate",
        context: "Used as a baseline visualization for packaging accumulation."
    },
    {
        id: "lca_tablets",
        label: "Comparative LCA (Tablets vs Cream)",
        source: "Sustainable Production and Consumption",
        url: "https://doi.org/10.1016/j.spc.2021.10.021",
        type: "peer-reviewed",
        context: "The format changes the equation; actual outcomes depend heavily on formulation, ingredients, and use-phase behaviors."
    },
    {
        id: "dots_model",
        label: "DOTS Internal Illustrative Model",
        type: "internal model",
        context: "Assumes standard 100g plastic tube (approx 15g empty weight) vs DOTS refill packaging. Shipment mass reduction estimates removal of 30-50% water content."
    }
];

// Baseline Assumptions for 1 person for 1 year (approx 6 tubes / 365 tablets)
const ASSUMPTIONS = {
    tubePlasticMassGrams: 15, // Empty plastic tube + cap weight
    tubesPerYearPerPerson: 6,
    dotsRefillPlasticMassGrams: 2, // Minimal pouch lining
    pasteWaterWeightKg: 0.05, // 50g of water per tube
};

function renderSources() {
    const container = document.getElementById('sources-content');
    if (!container) return;
    
    container.innerHTML = sources.map(s => `
        <div class="border-b border-saviere-black/10 pb-4">
            <h4 class="font-medium mb-1">${s.label}</h4>
            <p class="text-saviere-grey text-xs mb-2">${s.type} ${s.value ? `| ${s.value}` : ''}</p>
            <p class="mb-2 text-xs leading-relaxed">${s.context}</p>
            ${s.url ? `<a href="${s.url}" target="_blank" class="text-saviere-gold hover:underline text-xs">View Source →</a>` : ''}
        </div>
    `).join('');
}

function updateCalculator() {
    const people = parseInt(document.getElementById('input-people').value);
    const years = parseInt(document.getElementById('input-years').value);
    
    // Update labels
    document.getElementById('val-people').innerText = people;
    document.getElementById('val-years').innerText = years;

    // Calculations
    const totalTubes = people * years * ASSUMPTIONS.tubesPerYearPerPerson;
    
    // Plastic Avoided: (Traditional Tube plastic) - (DOTS packaging plastic)
    const traditionalPlastic = totalTubes * ASSUMPTIONS.tubePlasticMassGrams;
    const dotsPlastic = (people * years) * ASSUMPTIONS.dotsRefillPlasticMassGrams; // simplified 1 bulk refill per year per person
    const plasticAvoided = traditionalPlastic - dotsPlastic;

    // Mass Avoided (Water weight removed)
    const massAvoidedKg = totalTubes * ASSUMPTIONS.pasteWaterWeightKg;

    // Animate DOM updates
    animateValue('out-plastic', plasticAvoided);
    animateValue('out-mass', parseFloat(massAvoidedKg.toFixed(1)));

    // Update Visual Bars
    const maxPlastic = 10 * 10 * ASSUMPTIONS.tubesPerYearPerPerson * ASSUMPTIONS.tubePlasticMassGrams; // max slider values
    const plasticPercent = (plasticAvoided / maxPlastic) * 100;
    document.getElementById('bar-plastic').style.width = `${Math.max(5, plasticPercent)}%`;

    const maxMass = 10 * 10 * ASSUMPTIONS.tubesPerYearPerPerson * ASSUMPTIONS.pasteWaterWeightKg;
    const massPercent = (massAvoidedKg / maxMass) * 100;
    document.getElementById('bar-mass').style.width = `${Math.max(5, massPercent)}%`;
}

function animateValue(id, endValue) {
    const obj = document.getElementById(id);
    if(!obj) return;
    const current = parseFloat(obj.innerText) || 0;
    gsap.to(obj, { innerHTML: endValue, duration: 0.5, snap: { innerHTML: 0.1 }, ease: "power1.out" });
}

// Bind Events
document.addEventListener('DOMContentLoaded', () => {
    const inputs = ['input-people', 'input-years'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', updateCalculator);
    });
    
    // Sources Panel Toggle
    const panel = document.getElementById('sources-panel');
    document.getElementById('btn-sources')?.addEventListener('click', () => {
        panel.classList.remove('translate-x-full');
    });
    document.getElementById('close-sources')?.addEventListener('click', () => {
        panel.classList.add('translate-x-full');
    });

    renderSources();
    updateCalculator(); // init
});