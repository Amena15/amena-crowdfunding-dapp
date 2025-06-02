// Contract configuration
const CONTRACT_ADDRESS = "0x9e71aa744f0c11364fea4a3197f53c04be62327b";    //Change based your contract address 
const CONTRACT_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "_goal", "type": "uint256"},
            {"internalType": "uint256", "name": "_durationInMinutes", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [],
        "name": "contribute",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "checkBalance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "refund",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getDetails",
        "outputs": [
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
            {"internalType": "bool", "name": "", "type": "bool"},
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "", "type": "address"}],
        "name": "contributions",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getOwner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "contributor", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "FundReceived",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": false, "internalType": "uint256", "name": "totalAmount", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "GoalReached",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "contributor", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "Refunded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
            {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
            {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "FundsWithdrawn",
        "type": "event"
    }
];

// Application state
let provider = null;
let signer = null;
let contract = null;
let userAccount = null;
let contractOwner = null;
let eventListenersSetUp = false;

// DOM elements
const connectWalletBtn = document.getElementById('connectWallet');
const walletStatus = document.getElementById('walletStatus');
const walletAddress = document.getElementById('walletAddress');
const walletBalance = document.getElementById('walletBalance');
const contributeBtn = document.getElementById('contributeBtn');
const contributionAmount = document.getElementById('contributionAmount');
const withdrawBtn = document.getElementById('withdrawBtn');
const refundBtn = document.getElementById('refundBtn');
const ownerSection = document.getElementById('ownerSection');

// Initialize application
async function init() {
    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask detected');
        connectWalletBtn.addEventListener('click', connectWallet);
        contributeBtn.addEventListener('click', contribute);
        withdrawBtn.addEventListener('click', withdraw);
        refundBtn.addEventListener('click', requestRefund);
        
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await connectWallet();
            }
        } catch (error) {
            console.error('Initial connection check:', error);
            showError('Error checking wallet connection: ' + error.message);
        }
    } else {
        showError('MetaMask is not installed. Please install MetaMask to use this DApp.');
    }
}

// Connect wallet
async function connectWallet() {
    try {
        showInfo('Connecting to MetaMask...');
        
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAccount = accounts[0];

        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        walletAddress.textContent = `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`;
        const balance = await provider.getBalance(userAccount);
        walletBalance.textContent = parseFloat(ethers.formatEther(balance)).toFixed(4);

        walletStatus.style.display = 'flex';
        connectWalletBtn.style.display = 'none';
        contributeBtn.disabled = false;

        // Get contract owner once
        if (!contractOwner) {
            contractOwner = await contract.getOwner();
        }

        await loadContractData();
        
        if (!eventListenersSetUp) {
            setupEventListeners();
            eventListenersSetUp = true;
        }

        showSuccess('Wallet connected successfully!');
        hideAlert('info');

    } catch (error) {
        console.error('Error connecting wallet:', error);
        showError('Failed to connect wallet: ' + (error.message || error.reason || error));
    }
}

// Load contract data
async function loadContractData() {
    try {
        if (!contract) {
            throw new Error("Contract not initialized");
        }

        const details = await contract.getDetails();
        const userContrib = await contract.contributions(userAccount);
        
        // Check if user is owner
        if (userAccount.toLowerCase() === contractOwner.toLowerCase()) {
            ownerSection.style.display = 'block';
            withdrawBtn.disabled = false;
        } else {
            ownerSection.style.display = 'none';
        }

        // Extract contract details
        const goal = parseFloat(ethers.formatEther(details[0]));
        const deadline = parseInt(details[1]);
        const raised = parseFloat(ethers.formatEther(details[2]));
        const contributors = details[3].toString();
        const goalReached = details[4];
        const timeLeft = details[5];

        // Update UI
        document.getElementById('goalAmount').textContent = goal.toFixed(2) + ' ETH';
        document.getElementById('raisedAmount').textContent = raised.toFixed(4) + ' ETH';
        document.getElementById('contributorCount').textContent = contributors;
        document.getElementById('userContribution').textContent = parseFloat(ethers.formatEther(userContrib)).toFixed(4) + ' ETH';
        
        // Format time left
        const timeLeftNum = Number(timeLeft); // convert BigInt to Number

        if (timeLeftNum > 0) {
            const days = Math.floor(timeLeftNum / (60 * 60 * 24));
            const hours = Math.floor((timeLeftNum % (60 * 60 * 24)) / (60 * 60));
            const minutes = Math.floor((timeLeftNum % (60 * 60)) / 60);
            const seconds = timeLeftNum % 60;

            let timeString = '';
            if (days > 0) timeString += `${days}d `;
            if (hours > 0) timeString += `${hours}h `;
            if (minutes > 0) timeString += `${minutes}m `;
            timeString += `${seconds}s`;

            document.getElementById('timeLeft').textContent = timeString;
        } else {
            document.getElementById('timeLeft').textContent = 'Ended';
            refundBtn.disabled = !goalReached && userContrib > 0 ? false : true;
        }

        const refundInfo = document.getElementById('refundInfo');
        if (timeLeftNum <= 0 && !goalReached && userContrib > 0) {
            refundBtn.disabled = false;
            refundInfo.textContent = "You are eligible for a refund.";
        } else if (goalReached) {
            refundInfo.textContent = "Campaign goal reached. Refund not available.";
        } else if (timeLeftNum > 0) {
            refundInfo.textContent = "Refund available only after the deadline if goal is not met.";
        } else if (userContrib <= 0) {
            refundInfo.textContent = "You have not contributed, so no refund is available.";
        }


        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        const progressPercentage = document.getElementById('progressPercentage');
        const percentage = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
        progressFill.style.width = percentage + '%';
        progressPercentage.textContent = percentage.toFixed(1) + '%';

    } catch (error) {
        console.error('Error loading contract data:', error);
        showError('Failed to load contract data: ' + (error.reason || error.message));
    }
}

// Contribution function
async function contribute() {
    try {
        const amount = contributionAmount.value;
        if (!amount || parseFloat(amount) < 0.01) {
            showError('Please enter a valid amount (minimum 0.01 ETH)');
            return;
        }
        
        showLoading('contributeLoader', 'Contributing...');
        contributeBtn.disabled = true;
        
        const tx = await contract.contribute({
            value: ethers.parseEther(amount)
        });
        
        showInfo(`Transaction submitted: ${tx.hash.slice(0, 10)}...`);
        await tx.wait();
        
        showSuccess(`Successfully contributed ${amount} ETH!`);
        contributionAmount.value = '';
        
        await loadContractData();
        await updateWalletBalance();
        
    } catch (error) {
        console.error('Contribution error:', error);
        showError('Contribution failed: ' + (error.reason || error.message));
    } finally {
        hideLoading('contributeLoader', 'Contribute to Campaign');
        contributeBtn.disabled = false;
    }
}

// Withdraw function 
async function withdraw() {
    try {
        showLoading('withdrawLoader', 'withdrawBtn', 'Processing...');
        
        const tx = await contract.withdraw();
        showInfo(`Withdrawal transaction submitted: ${tx.hash.slice(0, 10)}...`);
        
        await tx.wait();
        showSuccess('Funds withdrawn successfully!');
        
        await loadContractData();
        await updateWalletBalance();
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        showError('Withdrawal failed: ' + (error.reason || error.message || error));
    } finally {
        hideLoading('withdrawLoader', 'withdrawBtn', 'Withdraw Funds');
    }
}

// Refund function
async function requestRefund() {
    try {
        showLoading('refundLoader', 'Processing refund...');
        refundBtn.disabled = true;
        
        const tx = await contract.refund();
        showInfo(`Refund transaction submitted: ${tx.hash.slice(0, 10)}...`);
        
        await tx.wait();
        showSuccess('Refund processed successfully!');
        
        await loadContractData();
        await updateWalletBalance();
        
    } catch (error) {
        console.error('Refund error:', error);
        showError('Refund failed: ' + (error.reason || error.message));
    } finally {
        hideLoading('refundLoader', 'Request Refund');
        refundBtn.disabled = false;
    }
}

// Event listeners setup
function setupEventListeners() {
    if (!contract) return;
    
    contract.on("FundReceived", (contributor, amount, timestamp) => {
    const ethAmount = parseFloat(ethers.formatEther(amount)).toFixed(4);
    addTransactionToHistory(
        `${contributor.slice(0, 6)}...${contributor.slice(-4)} contributed ${ethAmount} ETH`,
        'contribution',
        timestamp
    );
});
    
    contract.on("GoalReached", (totalAmount, timestamp) => {
        const ethAmount = parseFloat(ethers.formatEther(totalAmount)).toFixed(4);
        addTransactionToHistory(`🎯 Campaign goal reached! Total: ${ethAmount} ETH`, 'goal');
        showSuccess(`🎉 Congratulations! Campaign goal has been reached with ${ethAmount} ETH!`);
        loadContractData();
    });
    
    contract.on("Refunded", (contributor, amount, timestamp) => {
        const ethAmount = parseFloat(ethers.formatEther(amount)).toFixed(4);
        addTransactionToHistory(`↩️ ${contributor.slice(0, 6)}...${contributor.slice(-4)} received refund of ${ethAmount} ETH`, 'refund');
        if (contributor.toLowerCase() === userAccount.toLowerCase()) {
            showSuccess(`Your refund of ${ethAmount} ETH was processed!`);
        }
        loadContractData();
    });
    
    contract.on("FundsWithdrawn", (owner, amount, timestamp) => {
        const ethAmount = parseFloat(ethers.formatEther(amount)).toFixed(4);
        addTransactionToHistory(`💸 Owner withdrew ${ethAmount} ETH`, 'withdrawal');
        if (owner.toLowerCase() === userAccount.toLowerCase()) {
            showSuccess(`You withdrew ${ethAmount} ETH from the campaign!`);
        }
        loadContractData();
    });
}

// Add transaction to history
function addTransactionToHistory(message, type, timestamp = null) {
    const transactionHistory = document.getElementById('transactionHistory');
    const noTxMessage = transactionHistory.querySelector('p');
    
    if (noTxMessage && noTxMessage.textContent.includes('No transactions')) {
        transactionHistory.removeChild(noTxMessage);
    }

    const transactionItem = document.createElement('div');
    transactionItem.className = 'transaction-item';

    // Add timestamp
    let timeStr = '';
    if (timestamp) {
        const date = new Date(Number(timestamp) * 1000);
        timeStr = ` (${date.toLocaleString()})`;
    }

    transactionItem.textContent = message + timeStr;

    transactionHistory.insertBefore(transactionItem, transactionHistory.firstChild);
}


// Update wallet balance
async function updateWalletBalance() {
    if (provider && userAccount) {
        const balance = await provider.getBalance(userAccount);
        walletBalance.textContent = parseFloat(ethers.formatEther(balance)).toFixed(4);
    }
}

// Utility functions for UI feedback
function showError(message) {
    hideAllAlerts();
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.textContent = message;
    errorAlert.style.display = 'block';
    setTimeout(() => hideAlert('error'), 5000);
}

function showSuccess(message) {
    hideAllAlerts();
    const successAlert = document.getElementById('successAlert');
    successAlert.textContent = message;
    successAlert.style.display = 'block';
    setTimeout(() => hideAlert('success'), 5000);
}

function showInfo(message) {
    hideAllAlerts();
    const infoAlert = document.getElementById('infoAlert');
    infoAlert.textContent = message;
    infoAlert.style.display = 'block';
}

function hideAlert(type) {
    document.getElementById(type + 'Alert').style.display = 'none';
}

function hideAllAlerts() {
    hideAlert('error');
    hideAlert('success');
    hideAlert('info');
}

function showLoading(loaderId, buttonId, message) {
    const loader = document.getElementById(loaderId);
    const button = document.getElementById(buttonId);
    
    if (loader && button) {
        loader.style.display = 'inline-block';
        button.innerHTML = `<span id="${loaderId}" class="loading"></span>${message}`;
    }
}

function hideLoading(loaderId, buttonId, originalText) {
    const loader = document.getElementById(loaderId);
    const button = document.getElementById(buttonId);
    
    if (loader && button) {
        loader.style.display = 'none';
        button.textContent = originalText;
    }
}

// Handle account changes
window.ethereum.on('accountsChanged', async (accounts) => {
    if (accounts.length === 0) {
        location.reload();
    } else {
        userAccount = accounts[0];
        await connectWallet();  // reconnect
        await loadContractData();  // reload all relevant data
    }
});


window.ethereum.on('chainChanged', async (chainId) => {
    userAccount = null;
    contractOwner = null;
    await connectWallet();
    await loadContractData();
});


// Auto-refresh contract data every 30 seconds
setInterval(async () => {
    if (contract) {
        await loadContractData();
    }
}, 30000);

// Initialize the application when page loads
window.addEventListener('load', init);

// Handle form submission with Enter key
contributionAmount.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        contribute();
    }
});

// Real-time input validation
contributionAmount.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    const isValid = value >= 0.01;
    
    if (e.target.value && !isValid) {
        e.target.style.borderColor = '#f56565';
        contributeBtn.disabled = true;
    } else {
        e.target.style.borderColor = '#e2e8f0';
        contributeBtn.disabled = !contract || !e.target.value;
    }
});