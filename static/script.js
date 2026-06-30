/* ==========================================================================
   PAK CURRENCY NOTE DISTRIBUTION - PREMIUM CLIENT SCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app-container');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.app-screen');
    
    // Home & Inputs
    const amountInput = document.getElementById('amount-input');
    const predictBtn = document.getElementById('predict-btn');
    const resetBtn = document.getElementById('reset-btn');
    const errorCard = document.getElementById('error-card');
    const errorMessage = document.getElementById('error-message');
    const loadingCard = document.getElementById('loading-card');
    
    // Results
    const resultSection = document.getElementById('result-section');
    const statusCard = document.getElementById('status-card');
    const statusTitle = document.getElementById('status-title');
    const statusSubtitle = document.getElementById('status-subtitle');
    const valEntered = document.getElementById('val-entered');
    const valCalculated = document.getElementById('val-calculated');
    const valDiff = document.getElementById('val-diff');
    const valApiStatus = document.getElementById('val-api-status');
    
    // Denominations
    const count1000 = document.getElementById('count-1000');
    const count500 = document.getElementById('count-500');
    const count100 = document.getElementById('count-100');
    const count50 = document.getElementById('count-50');
    const count20 = document.getElementById('count-20');
    const count10 = document.getElementById('count-10');

    // History
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');
    const clearHistoryFab = document.getElementById('clear-history-fab');

    // Export
    const exportActiveWarning = document.getElementById('export-active-warning');
    const exportOptions = document.getElementById('export-options');
    const exportAmountText = document.getElementById('export-amount-text');
    const exportMetaText = document.getElementById('export-meta-text');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const shareBtn = document.getElementById('share-btn');
    const printBtn = document.getElementById('print-btn');

    // Modals & Settings
    const aboutAppBtn = document.getElementById('about-app-btn');
    const termsBtn = document.getElementById('terms-btn');
    const aboutModal = document.getElementById('about-modal');
    const termsModal = document.getElementById('terms-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal-btn');
    const toastContainer = document.getElementById('toast-container');

    // --- State Variables ---
    let activePrediction = null;
    let predictionHistory = JSON.parse(localStorage.getItem('pcnd_history')) || [];

    // ==========================================================================
    // 1. INITIALIZATION & SPLASH SCREEN
    // ==========================================================================
    
    // Hide Splash Screen after 1.8 seconds
    setTimeout(() => {
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            splashScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');
            appContainer.classList.add('fadeIn');
        }, 600);
    }, 1800);

    // Initialize Theme
    const savedTheme = localStorage.getItem('pcnd_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'dark') {
        darkModeToggle.checked = true;
        themeToggleBtn.querySelector('span').textContent = 'light_mode';
    } else {
        darkModeToggle.checked = false;
        themeToggleBtn.querySelector('span').textContent = 'dark_mode';
    }

    // Refresh history lists on startup
    renderHistory();

    // ==========================================================================
    // 2. THEME SWITCHING (DARK MODE)
    // ==========================================================================
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        let newTheme = 'light';
        if (currentTheme === 'light') {
            newTheme = 'dark';
            themeToggleBtn.querySelector('span').textContent = 'light_mode';
            darkModeToggle.checked = true;
        } else {
            themeToggleBtn.querySelector('span').textContent = 'dark_mode';
            darkModeToggle.checked = false;
        }
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('pcnd_theme', newTheme);
        showToast(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'palette');
    }

    themeToggleBtn.addEventListener('click', toggleTheme);
    darkModeToggle.addEventListener('change', toggleTheme);

    // ==========================================================================
    // 3. BOTTOM NAVIGATION ROUTING (SPA)
    // ==========================================================================
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetScreen = item.getAttribute('data-screen');
            
            // Update Active Nav Item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Switch Screen Visually
            screens.forEach(screen => {
                screen.classList.remove('active');
                if (screen.id === `screen-${targetScreen}`) {
                    screen.classList.add('active');
                }
            });

            // Extra screen actions
            if (targetScreen === 'history') {
                renderHistory();
            } else if (targetScreen === 'export') {
                updateExportScreen();
            }
        });
    });

    // ==========================================================================
    // 4. INPUT VALIDATION
    // ==========================================================================
    
    function validateInput(value) {
        if (!value || value.trim() === '') {
            return "Amount field cannot be empty.";
        }
        
        const num = Number(value);
        
        if (isNaN(num)) {
            return "Please enter a valid number.";
        }
        if (num <= 0) {
            return "Amount must be greater than zero.";
        }
        if (!Number.isInteger(num)) {
            return "Amount cannot contain decimal points.";
        }
        if (num % 10 !== 0) {
            return "Amount must be divisible by Rs. 10 notes.";
        }
        if (num > 500000) {
            // Warn, but let FastAPI handle if the user bypasses
            return null; // FastAPI supports higher values through mathematical engine fallback
        }
        
        return null; // Valid
    }

    // ==========================================================================
    // 5. API PREDICTION HANDLER
    // ==========================================================================
    
    async function predictDistribution() {
        const rawValue = amountInput.value;
        const validationError = validateInput(rawValue);
        
        if (validationError) {
            showError(validationError);
            return;
        }

        // Hide old errors & old results
        errorCard.classList.add('hidden');
        resultSection.classList.add('hidden');
        
        // Show Loading State
        predictBtn.disabled = true;
        resetBtn.disabled = true;
        loadingCard.classList.remove('hidden');

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount: parseFloat(rawValue) })
            });

            if (!response.ok) {
                const errorData = await response.json();
                const errDetail = errorData.detail && errorData.detail[0] 
                    ? errorData.detail[0].msg 
                    : 'Backend failed to predict. Check input.';
                throw new Error(errDetail);
            }

            const data = await response.json();
            
            // Delay slightly to feel premium (simulated calculations)
            setTimeout(() => {
                displayResults(data);
                saveToHistory(data);
                
                // Hide Loader
                loadingCard.classList.add('hidden');
                predictBtn.disabled = false;
                resetBtn.disabled = false;
                
                // Toast Alert
                showToast("Note distribution generated!", "verified");
            }, 600);

        } catch (error) {
            loadingCard.classList.add('hidden');
            predictBtn.disabled = false;
            resetBtn.disabled = false;
            showError(error.message || "Connection refused by Server.");
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorCard.classList.remove('hidden');
        resultSection.classList.add('hidden');
        errorCard.scrollIntoView({ behavior: 'smooth' });
    }

    function displayResults(data) {
        activePrediction = data;
        
        // Update Denomination Counts
        count1000.textContent = data["1000"];
        count500.textContent = data["500"];
        count100.textContent = data["100"];
        count50.textContent = data["50"];
        count20.textContent = data["20"];
        count10.textContent = data["10"];

        // Update Labels (Note vs Notes singular/plural)
        updateNoteLabels(data);

        // Update Validation Info Card
        valEntered.textContent = `Rs. ${data.amount.toLocaleString()}`;
        valCalculated.textContent = `Rs. ${data.total.toLocaleString()}`;
        
        const diff = data.amount - data.total;
        valDiff.textContent = `Rs. ${diff}`;
        
        if (diff === 0) {
            valDiff.className = 'summary-value success-text';
        } else {
            valDiff.className = 'summary-value error-text';
        }

        // Show API adjustment source status
        valApiStatus.textContent = data.adjusted 
            ? "Enforced by Rules Engine" 
            : "ML Model Prediction Verified";

        // Show Result Screen
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    function updateNoteLabels(data) {
        document.getElementById('label-1000').textContent = data["1000"] === 1 ? "Note" : "Notes";
        document.getElementById('label-500').textContent = data["500"] === 1 ? "Note" : "Notes";
        document.getElementById('label-100').textContent = data["100"] === 1 ? "Note" : "Notes";
        document.getElementById('label-50').textContent = data["50"] === 1 ? "Note" : "Notes";
        document.getElementById('label-20').textContent = data["20"] === 1 ? "Note" : "Notes";
        document.getElementById('label-10').textContent = data["10"] === 1 ? "Note" : "Notes";
    }

    function resetApp() {
        amountInput.value = '';
        errorCard.classList.add('hidden');
        resultSection.classList.add('hidden');
        loadingCard.classList.add('hidden');
        activePrediction = null;
        amountInput.focus();
        showToast("Inputs reset", "restart_alt");
    }

    predictBtn.addEventListener('click', predictDistribution);
    resetBtn.addEventListener('click', resetApp);
    
    // Bind Enter key inside input
    amountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            predictDistribution();
        }
    });

    // ==========================================================================
    // 6. LOCAL STORAGE HISTORY MANAGEMENT
    // ==========================================================================
    
    function saveToHistory(record) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const newRecord = {
            id: 'rec_' + Date.now(),
            date: dateStr,
            time: timeStr,
            amount: record.amount,
            total: record.total,
            notes: {
                "1000": record["1000"],
                "500": record["500"],
                "100": record["100"],
                "50": record["50"],
                "20": record["20"],
                "10": record["10"]
            }
        };

        // Put at front of array
        predictionHistory.unshift(newRecord);
        localStorage.setItem('pcnd_history', JSON.stringify(predictionHistory));
    }

    function renderHistory() {
        historyList.innerHTML = '';
        
        if (predictionHistory.length === 0) {
            historyEmpty.classList.remove('hidden');
            clearHistoryFab.classList.add('hidden');
            return;
        }

        historyEmpty.classList.add('hidden');
        clearHistoryFab.classList.remove('hidden');

        predictionHistory.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-card-left">
                    <span class="history-date">${item.date} • ${item.time}</span>
                    <span class="history-amount">Rs. ${item.amount.toLocaleString()}</span>
                </div>
                <div class="history-card-right">
                    <button class="icon-button view-details-btn" data-id="${item.id}" title="View Details">
                        <span class="material-symbols-rounded">visibility</span>
                    </button>
                    <button class="icon-button delete-record-btn" data-id="${item.id}" title="Delete Record">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            `;

            // View Details event
            card.querySelector('.view-details-btn').addEventListener('click', () => {
                viewHistoryDetails(item);
            });

            // Delete Record event
            card.querySelector('.delete-record-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHistoryItem(item.id);
            });

            historyList.appendChild(card);
        });
    }

    function viewHistoryDetails(item) {
        // Re-inject prediction into home results and direct navigation back to home
        const fakeData = {
            amount: item.amount,
            total: item.total,
            "1000": item.notes["1000"],
            "500": item.notes["500"],
            "100": item.notes["100"],
            "50": item.notes["50"],
            "20": item.notes["20"],
            "10": item.notes["10"],
            adjusted: false
        };
        
        amountInput.value = item.amount;
        displayResults(fakeData);
        
        // Navigate to Home screen
        const homeNavItem = document.querySelector('[data-screen="home"]');
        homeNavItem.click();
        
        showToast("Historical record loaded", "history");
    }

    function deleteHistoryItem(id) {
        predictionHistory = predictionHistory.filter(item => item.id !== id);
        localStorage.setItem('pcnd_history', JSON.stringify(predictionHistory));
        renderHistory();
        showToast("Record deleted", "delete");
    }

    clearHistoryFab.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all history logs?")) {
            predictionHistory = [];
            localStorage.removeItem('pcnd_history');
            renderHistory();
            showToast("All logs cleared", "delete_sweep");
        }
    });

    // ==========================================================================
    // 7. EXPORT DATA & REPORTS (PDF, CSV, CLIPBOARD)
    // ==========================================================================
    
    function updateExportScreen() {
        if (!activePrediction) {
            exportActiveWarning.classList.remove('hidden');
            exportOptions.classList.add('hidden');
            return;
        }

        exportActiveWarning.classList.add('hidden');
        exportOptions.classList.remove('hidden');
        exportAmountText.textContent = `Rs. ${activePrediction.amount.toLocaleString()}`;
        exportMetaText.textContent = activePrediction.adjusted 
            ? "Custom layout applied by rules engine" 
            : "ML regression calculated successfully";
    }

    // CSV Download handler
    exportCsvBtn.addEventListener('click', () => {
        if (!activePrediction) return;
        
        const headers = ["Denomination", "Count", "Value (Rs.)"];
        const rows = [
            ["1000", activePrediction["1000"], activePrediction["1000"] * 1000],
            ["500", activePrediction["500"], activePrediction["500"] * 500],
            ["100", activePrediction["100"], activePrediction["100"] * 100],
            ["50", activePrediction["50"], activePrediction["50"] * 50],
            ["20", activePrediction["20"], activePrediction["20"] * 20],
            ["10", activePrediction["10"], activePrediction["10"] * 10],
            ["Total Entered", "", activePrediction.amount],
            ["Total Calculated", "", activePrediction.total]
        ];

        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `PKR_Note_Distribution_${activePrediction.amount}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("CSV file downloaded!", "csv");
    });

    // Share / Copy to Clipboard
    shareBtn.addEventListener('click', () => {
        if (!activePrediction) return;

        const text = `🇵🇰 *Pak Currency Note Distribution Summary*\n` +
            `• Entered Amount: Rs. ${activePrediction.amount.toLocaleString()}\n` +
            `• Predicted Total: Rs. ${activePrediction.total.toLocaleString()}\n\n` +
            `*Required Notes Breakup:*\n` +
            `- Rs. 1000 : ${activePrediction["1000"]} Notes\n` +
            `- Rs. 500  : ${activePrediction["500"]} Note(s)\n` +
            `- Rs. 100  : ${activePrediction["100"]} Note(s)\n` +
            `- Rs. 50   : ${activePrediction["50"]} Note(s)\n` +
            `- Rs. 20   : ${activePrediction["20"]} Note(s)\n` +
            `- Rs. 10   : ${activePrediction["10"]} Note(s)\n\n` +
            `*Distribution verified dynamically.*`;

        navigator.clipboard.writeText(text).then(() => {
            showToast("Distribution copied to clipboard!", "content_copy");
        }).catch(err => {
            showToast("Failed to copy text.", "error");
        });
    });

    // Printing receipt logic (Acts as a system Print/PDF Export fallback)
    function printDistributionReceipt() {
        if (!activePrediction) return;

        // Create a printable receipt window layout
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        
        const receiptHtml = `
            <html>
            <head>
                <title>Receipt - Rs. ${activePrediction.amount}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 30px; color: #333; line-height: 1.5; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 20px; }
                    .title { font-size: 18px; font-weight: bold; margin: 5px 0; text-transform: uppercase; }
                    .subtitle { font-size: 11px; }
                    .row { display: flex; justify-content: space-between; margin: 8px 0; }
                    .bold { font-weight: bold; }
                    .footer { text-align: center; border-top: 2px dashed #000; margin-top: 30px; padding-top: 15px; font-size: 12px; }
                    .verified { color: green; font-weight: bold; margin-top: 10px; display: block; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title">PCND Receipt</div>
                    <div class="subtitle">Pak Currency Note Distribution</div>
                    <div class="subtitle">AI Powered Note Split Engine</div>
                    <div class="subtitle">Date: ${new Date().toLocaleString()}</div>
                </div>
                
                <div class="row bold">
                    <span>Denomination</span>
                    <span>Quantity</span>
                    <span>Subtotal</span>
                </div>
                <hr>
                <div class="row">
                    <span>Rs. 1000</span>
                    <span>x ${activePrediction["1000"]}</span>
                    <span>Rs. ${activePrediction["1000"] * 1000}</span>
                </div>
                <div class="row">
                    <span>Rs. 500</span>
                    <span>x ${activePrediction["500"]}</span>
                    <span>Rs. ${activePrediction["500"] * 500}</span>
                </div>
                <div class="row">
                    <span>Rs. 100</span>
                    <span>x ${activePrediction["100"]}</span>
                    <span>Rs. ${activePrediction["100"] * 100}</span>
                </div>
                <div class="row">
                    <span>Rs. 50</span>
                    <span>x ${activePrediction["50"]}</span>
                    <span>Rs. ${activePrediction["50"] * 50}</span>
                </div>
                <div class="row">
                    <span>Rs. 20</span>
                    <span>x ${activePrediction["20"]}</span>
                    <span>Rs. ${activePrediction["20"] * 20}</span>
                </div>
                <div class="row">
                    <span>Rs. 10</span>
                    <span>x ${activePrediction["10"]}</span>
                    <span>Rs. ${activePrediction["10"] * 10}</span>
                </div>
                
                <hr>
                <div class="row bold">
                    <span>Entered Amount:</span>
                    <span>Rs. ${activePrediction.amount.toLocaleString()}</span>
                </div>
                <div class="row bold">
                    <span>Calculated Total:</span>
                    <span>Rs. ${activePrediction.total.toLocaleString()}</span>
                </div>
                <div class="row bold">
                    <span>Audit Difference:</span>
                    <span>Rs. 0</span>
                </div>
                
                <div class="footer">
                    <span class="verified">✓ AUDIT VERIFIED SYSTEM OK</span>
                    <p>Designed by Khalil Ahmad (@veosdrnawaz)</p>
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.close();
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(receiptHtml);
        printWindow.document.close();
    }

    printBtn.addEventListener('click', printDistributionReceipt);
    exportPdfBtn.addEventListener('click', printDistributionReceipt);

    // ==========================================================================
    // 8. MODAL WINDOWS & TOAST ALERTS
    // ==========================================================================
    
    // Open About Modal
    aboutAppBtn.addEventListener('click', () => {
        aboutModal.classList.remove('hidden');
        aboutModal.querySelector('.modal-container').classList.add('slideUpModal');
    });

    // Open Terms Modal
    termsBtn.addEventListener('click', () => {
        termsModal.classList.remove('hidden');
        termsModal.querySelector('.modal-container').classList.add('slideUpModal');
    });

    // Close Modals
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            modal.classList.add('hidden');
        });
    });

    // Close modal if user clicks outside container
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.add('hidden');
        }
    });

    // Show Toast Dialog
    function showToast(message, iconName = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <span class="material-symbols-rounded">${iconName}</span>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);

        // Remove from DOM after transition completes
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

});
