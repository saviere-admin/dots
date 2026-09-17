// impact.js

document.addEventListener('DOMContentLoaded', () => {
    // Verified Corporate Assumptions
    const ASSUMPTIONS = { 
        tubePlasticGrams: 15, 
        pasteWaterKg: 0.05,   
        tubesPerYear: 6       
    };
    
    const updateCalculator = () => {
        const peopleEl = document.getElementById('input-people');
        const yearsEl = document.getElementById('input-years');
        
        if (!peopleEl || !yearsEl) return;

        const people = parseInt(peopleEl.value);
        const years = parseInt(yearsEl.value);
        
        document.getElementById('val-people').innerText = people;
        document.getElementById('val-years').innerText = years;
        
        const totalTubes = people * years * ASSUMPTIONS.tubesPerYear;
        const plasticAvoided = totalTubes * ASSUMPTIONS.tubePlasticGrams;
        const massAvoided = totalTubes * ASSUMPTIONS.pasteWaterKg;

        // GSAP Smooth Number Rolling
        if(window.gsap) {
            gsap.to('#out-plastic', { 
                innerHTML: plasticAvoided, 
                duration: 0.8, 
                snap: { innerHTML: 1 }, 
                ease: "power2.out" 
            });
            gsap.to('#out-mass', { 
                innerHTML: massAvoided, 
                duration: 0.8, 
                snap: { innerHTML: 0.1 }, 
                ease: "power2.out" 
            });
        }

        // Maximum values for 10 people over 10 years
        const maxPlastic = 10 * 10 * ASSUMPTIONS.tubesPerYear * ASSUMPTIONS.tubePlasticGrams;
        const maxMass = 10 * 10 * ASSUMPTIONS.tubesPerYear * ASSUMPTIONS.pasteWaterKg;
        
        const barPlastic = document.getElementById('bar-plastic');
        const barMass = document.getElementById('bar-mass');
        
        if(barPlastic) barPlastic.style.width = `${Math.max(2, (plasticAvoided/maxPlastic)*100)}%`;
        if(barMass) barMass.style.width = `${Math.max(2, (massAvoided/maxMass)*100)}%`;
    };

    const inputs = document.querySelectorAll('.range-slider');
    inputs.forEach(input => {
        input.addEventListener('input', updateCalculator);
    });
    
    updateCalculator();
});