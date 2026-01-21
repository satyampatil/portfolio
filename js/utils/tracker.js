export async function initTracker() {
    const trackerContainer = document.querySelector('.tracker-container');
    const countElement = document.querySelector('.application-count');
    
    // --- CONFIGURATION ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6uu1-J7JEQISK7_KCFPh8P-m4HzJQV-hr5CERRbQHRMw6rLeTNkFqZmVWpFw_0wlS__C5w8xoUqDm/pub?output=csv';

    // 1. Render Mock Data Immediately (Instant Feedback / Fail-safe)
    // We process the mock data with the same logic so the preview looks correct immediately
    const mockJobs = getMockData();
    const processedMock = processAndSortJobs(mockJobs).slice(0, 6);
    renderTracker(processedMock, trackerContainer, countElement, 6);

    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        const text = await response.text();
        const allJobs = parseCSV(text);
        
        // 2. Process Real Data
        // Filter out rejected, sort by progress weight, then by date
        const sortedJobs = processAndSortJobs(allJobs);
        
        // 3. Slice Top 6
        const topJobs = sortedJobs.slice(0, 6);
        
        // Re-render with REAL data if fetch succeeded
        // Note: We pass 'allJobs.length' to show the total Count of all applications applied to
        renderTracker(topJobs, trackerContainer, countElement, allJobs.length);
    } catch (error) {
        console.warn("Tracker: Fetch failed, staying on mock data.", error);
        // No action needed, mock data is already visible
    }
}

// --- NEW SORTING & FILTERING LOGIC ---
function processAndSortJobs(jobs) {
    // 1. Filter out Rejected
    const activeJobs = jobs.filter(job => {
        const status = (job.status || '').toLowerCase();
        // Check for various rejection keywords
        return !(status.includes('reject') || status.includes('decline') || status.includes('not selected'));
    });

    // 2. Sort by Weight (Desc) -> Date (Desc)
    activeJobs.sort((a, b) => {
        const getWeight = (status) => {
            const s = (status || '').toLowerCase();
            // Higher number = Higher Priority (Shown at top)
            if (s.includes('hired') || s.includes('offer')) return 4;
            if (s.includes('hr') || s.includes('final') || s.includes('manager')) return 3;
            if (s.includes('technical') || s.includes('tech') || s.includes('code') || s.includes('assignment')) return 2;
            if (s.includes('telephone') || s.includes('phone') || s.includes('screen')) return 1;
            return 0; // Default: Application Submitted / Applied
        };

        const weightA = getWeight(a.status);
        const weightB = getWeight(b.status);

        // Primary Sort: Progress Level (High to Low)
        if (weightA !== weightB) {
            return weightB - weightA;
        }

        // Secondary Sort: Date (Newest to Oldest)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        // Handle potential invalid dates by treating them as old
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

        return timeB - timeA; 
    });

    return activeJobs;
}

function parseCSV(csvText) {
    const rows = csvText.split('\n').map(row => row.split(','));
    // Clean headers: remove quotes, trim, lowercase
    const headers = rows[0].map(h => h.replace(/"/g, '').trim().toLowerCase()); 
    
    // Identify Column Indices directly to avoid ambiguity
    // 1. Company
    const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('organization'));
    
    // 2. Role
    const roleIdx = headers.findIndex(h => h.includes('role') || h.includes('title') || h.includes('position'));
    
    // 3. Status (Priority Logic)
    let statusIdx = headers.indexOf('status');
    if (statusIdx === -1) {
        statusIdx = headers.findIndex(h => h.includes('status') && !h.includes('process'));
    }
    if (statusIdx === -1) {
        statusIdx = headers.findIndex(h => h.includes('status') || h.includes('stage') || h.includes('step'));
    }

    // 4. Date
    const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('applied'));

    return rows.slice(1).map(row => {
        const job = {};
        const getVal = (idx) => (idx !== -1 && row[idx]) ? row[idx].replace(/"/g, '').trim() : '';

        job.company = getVal(companyIdx);
        job.role = getVal(roleIdx);
        job.status = getVal(statusIdx);
        job.date = getVal(dateIdx);

        return job;
    }).filter(job => job.company); // Filter out empty rows
}

function renderTracker(jobs, container, countEl, totalCount) {
    if(countEl) animateCount(countEl, totalCount || jobs.length);
    if(!container) return;

    container.innerHTML = '';

    const stages = [
        "Application Submitted", 
        "Telephone Interview", 
        "Technical Interview", 
        "HR Round", 
        "Hired"
    ];
    
    jobs.forEach((job, index) => {
        let status = job.status || "Application Submitted";
        const statusLower = status.toLowerCase();
        
        // Check for Rejection (Should be filtered out by processAndSortJobs, but fail-safe here)
        const isRejected = statusLower.includes('reject') || statusLower.includes('decline') || statusLower.includes('not selected');

        let progressIndex = stages.findIndex(s => s.toLowerCase() === statusLower);
        
        // Fuzzy matching to map CSV status to UI stages
        if (progressIndex === -1) {
            if (statusLower.includes('hired') || statusLower.includes('offer')) progressIndex = 4;
            else if (statusLower.includes('hr') || statusLower.includes('final') || statusLower.includes('manager')) progressIndex = 3;
            else if (statusLower.includes('tech') || statusLower.includes('code') || statusLower.includes('assignment')) progressIndex = 2;
            else if (statusLower.includes('tele') || statusLower.includes('phone') || statusLower.includes('screen')) progressIndex = 1;
            else progressIndex = 0; 
        }

        let cardClass = '';
        let statusColor = '#7c59f0'; // Default purple-ish fallback

        if (progressIndex === 4) {
            cardClass = 'is-hired';
            statusColor = '#00ff88';
        } else if (isRejected) {
            cardClass = 'is-rejected';
            statusColor = '#ff4444';
        }
        
        const progressPercent = ((progressIndex + 0.5) / (stages.length - 0.5)) * 100;
        
        const card = document.createElement('div');
        card.className = `job-tracker-card reveal-up ${cardClass}`;
        card.style.animationDelay = `${index * 0.1}s`; 
        
        let stepsHTML = '';
        stages.forEach((stage, i) => {
            const activeClass = i <= progressIndex ? 'active' : '';
            const currentClass = i === progressIndex ? 'current' : '';
            const titleAttr = activeClass ? `title="${stage}"` : '';
            stepsHTML += `<div class="tracker-dot ${activeClass} ${currentClass}" ${titleAttr}></div>`;
        });

        card.innerHTML = `
            <div class="tracker-header">
                <h4 class="t-company">${job.company || 'Unknown'}</h4>
                <span class="t-role">${job.role || 'Applicant'}</span>
            </div>
            
            <div class="tracker-progress-wrapper">
                <div class="tracker-bar-bg">
                    <div class="tracker-bar-fill" style="width: ${progressPercent}%; background: ${statusColor}; box-shadow: 0 0 10px ${statusColor};"></div>
                </div>
                <div class="tracker-dots-container">
                    ${stepsHTML}
                </div>
            </div>
            
            <div class="tracker-footer">
                <span class="t-status" style="color: ${statusColor}">${status}</span>
                <span class="t-date">${job.date || ''}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function animateCount(element, target) {
    if(!element) return;
    let current = 0;
    const interval = setInterval(() => {
        if(current >= target) {
            element.innerText = target;
            clearInterval(interval);
        } else {
            // Speed up counting if target is large
            const increment = Math.ceil((target - current) / 10);
            current += increment;
            element.innerText = current;
        }
    }, 30);
}

function getMockData() {
    return [
        { company: "Spotify", role: "Creative Dev", status: "HR Round", date: "2023-10-15" },
        { company: "Google", role: "UX Engineer", status: "Technical Interview", date: "2023-10-01" },
        { company: "Netflix", role: "UI Design", status: "Hired", date: "2023-10-20" },
        { company: "Apple", role: "Frontend Dev", status: "Rejected", date: "2023-10-10" },
        { company: "Airbnb", role: "Design Systems", status: "Telephone Interview", date: "2023-10-12" },
    ];
}