    // =========================================================================
    // 1. 검증된 스마트 컨트랙트 주소 설정
    // =========================================================================
    const RAW_CONTRACT_ADDRESS = "0xaC37068a04e3302e0da084F1D9da75FD89de5bCD"; 
    const RAW_HAECHI_ADDRESS   = "0x49060066135e5c07ee0A70f85474419641F484b1";
    const RAW_USDT_ADDRESS     = "0x55d398326f99059fF775485246999027B3197955";
    const BSC_CHAIN_ID         = 56;

    function cleanAddr(addr) {
        if (!addr || typeof addr !== 'string') return ethers.constants.AddressZero;
        const trimmed = addr.trim();
        if (!ethers.utils.isAddress(trimmed)) return ethers.constants.AddressZero;
        return ethers.utils.getAddress(trimmed.toLowerCase());
    }

    const CONTRACT_ADDRESS = cleanAddr(RAW_CONTRACT_ADDRESS);
    const USDT_ADDRESS     = cleanAddr(RAW_USDT_ADDRESS);
    const HAECHI_ADDRESS   = cleanAddr(RAW_HAECHI_ADDRESS);

    const UNIFIED_ABI = [
        "function nodeSaleActive() view returns (bool)",
        "function stakingEnabled() view returns (bool)",
        "function nodeClaimTime() view returns (uint256)",
        "function nodeTokenPriceUsdt() view returns (uint256)",
        "function minNodeBuyHaechi() view returns (uint256)",
        "function minNodeQualifyUsdt() view returns (uint256)",
        "function dailyRewardRateBps() view returns (uint256)",
        "function tokenPriceUsd() view returns (uint256)",
        "function bindSponsor(address _referrer) external",
        "function buyNode(uint256 _haechiAmount, uint8 _rewardType, uint8 _giftChoice) external",
        "function claimNodeTokens() external",
        "function claimNodeAndStake() external",
        "function stake(uint256 _amount) external",
        "function claimRewards() external",
        "function earlyUnstake() external",
        "function getUnifiedDashboard(address _userAddr) external view returns (tuple(address referrer, bool isRegistered, uint256 directDownlineCount, uint256 nodeUsdtSpent, uint256 nodeBaseBought, uint256 nodeBonusToken, uint256 claimableNodeToken, uint256 claimedNodeToken, uint256 nodeRefBonusUsdt, bool isNodeQualified, bool isWhitelisted, bool isStakingActive, uint8 currentRank, uint16 directRebaseRateBps, uint256 stakedFromNode, uint256 stakedFromWallet, uint256 activePrincipalToken, uint256 activePrincipalUsd, uint256 maxPayoutCapToken, uint256 totalEarnedToken, uint256 totalClaimedToken, uint256 remainingQuotaToken, uint256 claimableRoiToken, uint256 claimableNetworkToken, uint256 totalTeamVolumeUsd, uint256 bigLegVolumeUsd, uint256 smallLegsVolumeUsd))",
        "function getUserNodeHistory(address _user) external view returns (tuple(uint256 baseHaechi, uint256 extraHaechi, uint256 usdtPaid, uint40 timestamp, uint8 rewardType, uint8 giftChoice)[])",
        "function getDirectDownlinesPaginated(address _user, uint256 _cursor, uint256 _limit) external view returns (address[] downlines, uint256[] nodeVolumesHaechi, uint256[] stakingLegVolumesUsd, uint256 totalCount)"
    ];

    const ERC20_ABI = [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function balanceOf(address account) view returns (uint256)"
    ];

    const RANK_NAMES = ["No Rank", "H1 (6%)", "H2 (9%)", "H3 (12%)", "H4 (15%)", "H5 (17%)", "H6 (20%)", "H7 (23%)", "H8 (26%)", "H9 (30%)"];
    const GIFT_NAMES = ["Voucher", "NFT", "Account"];

    let currentLang = 'en';
    let currentMenu = 'node';
    let userAddress = null;
    let isUserBound = false;
    let claimDateMs = 0;
    let isStakingOpenGlobal = false;
    let nodePriceUsdtGlobal = 0.1;
    let minNodeBuyGlobal = 100;
    let minQualifyUsdtGlobal = 100;
    let stakingPriceUsdGlobal = 0.1;
    let countdownInterval;

    // =========================================================================
    // 2. 스플래시 화면 & 5개 메뉴 하단 내비게이션
    // =========================================================================
    window.addEventListener('DOMContentLoaded', () => {
        const splashVideo = document.getElementById('splashVideo');
        if (splashVideo) splashVideo.onended = () => hideSplash();
        setTimeout(() => hideSplash(), 6000);

        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref');
        if (refParam && ethers.utils.isAddress(refParam.trim())) {
            document.getElementById('bindSponsorInput').value = cleanAddr(refParam);
        }

        initGlobalContractData();
    });

    function hideSplash() {
        const s = document.getElementById('splashScreen');
        if (s && s.style.display !== 'none') {
            s.style.opacity = '0';
            setTimeout(() => { s.style.display = 'none'; }, 500);
        }
    }

    function navigateBottom(menu) {
        currentMenu = menu;

        document.getElementById('navHome').classList.toggle('active', menu === 'home');
        document.getElementById('navNode').classList.toggle('active', menu === 'node');
        document.getElementById('navStake').classList.toggle('active', menu === 'stake');
        document.getElementById('navEcosystem').classList.toggle('active', menu === 'ecosystem');
        document.getElementById('navTrade').classList.toggle('active', menu === 'trade');

        const pageHome = document.getElementById('pageHome');
        const pageEcosystem = document.getElementById('pageEcosystem');
        const pageTrade = document.getElementById('pageTrade');
        const dappArea = document.getElementById('dappArea');
        const heroTitle = document.getElementById('mainHeroTitle');

        pageHome.classList.add('hidden');
        pageEcosystem.classList.add('hidden');
        pageTrade.classList.add('hidden');
        dappArea.classList.add('hidden');

        if (menu === 'home') {
            pageHome.classList.remove('hidden');
            heroTitle.setAttribute('data-en', 'About Haechi Protocol');
            heroTitle.setAttribute('data-ko', '해치 프로토콜 소개');
        } else if (menu === 'node') {
            dappArea.classList.remove('hidden');
            document.getElementById('tabContentNode').classList.remove('hidden');
            document.getElementById('tabContentStaking').classList.add('hidden');
            heroTitle.setAttribute('data-en', 'Haechi Protocol Node Presale');
            heroTitle.setAttribute('data-ko', '해치 프로토콜 노드 프리세일');
        } else if (menu === 'stake') {
            dappArea.classList.remove('hidden');
            document.getElementById('tabContentNode').classList.add('hidden');
            document.getElementById('tabContentStaking').classList.remove('hidden');
            heroTitle.setAttribute('data-en', 'Haechi Protocol Staking');
            heroTitle.setAttribute('data-ko', '해치 프로토콜 스테이킹');
        } else if (menu === 'ecosystem') {
            pageEcosystem.classList.remove('hidden');
            heroTitle.setAttribute('data-en', 'Haechi Ecosystem Hub');
            heroTitle.setAttribute('data-ko', '해치 생태계 허브');
        } else if (menu === 'trade') {
            pageTrade.classList.remove('hidden');
            heroTitle.setAttribute('data-en', 'Haechi Trade & Market');
            heroTitle.setAttribute('data-ko', '해치 트레이딩 & 마켓');
        }

        heroTitle.innerText = heroTitle.getAttribute(`data-${currentLang}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function notifyComingSoon(featureName) {
        showModal(
            `${featureName} is currently under development and will launch soon!`,
            `${featureName} 기능은 현재 준비 중이며 곧 출시됩니다!`
        );
    }

    function showModal(msgEn, msgKo) {
        document.getElementById('modalTitle').innerText = currentLang === 'en' ? "Notification" : "알림";
        document.getElementById('modalMessage').innerText = currentLang === 'en' ? msgEn : msgKo;
        document.getElementById('customModal').classList.add('active');
    }

    function closeModal() { document.getElementById('customModal').classList.remove('active'); }
    function openHistoryModal() { document.getElementById('historyModal').classList.add('active'); }
    function closeHistoryModal() { document.getElementById('historyModal').classList.remove('active'); }
    function openTncModal() { document.getElementById('tncModal').classList.add('active'); }
    function closeTncModal() { document.getElementById('tncModal').classList.remove('active'); }

    function toggleLanguage() {
        currentLang = currentLang === 'en' ? 'ko' : 'en';
        document.getElementById('langBtn').innerText = currentLang === 'en' ? 'KO' : 'EN';
        document.querySelectorAll('[data-en]').forEach(el => {
            el.innerText = el.getAttribute(`data-${currentLang}`);
        });
    }

    function calculateUSDT() {
        const amount = parseFloat(document.getElementById('haechiAmount').value) || 0;
        document.getElementById('usdtAmount').value = amount > 0 ? (amount * nodePriceUsdtGlobal).toFixed(2) + " USDT" : "0.00 USDT";
    }

    function calculateStakeUSD() {
        const amount = parseFloat(document.getElementById('stakeAmount').value) || 0;
        document.getElementById('stakeUsdValue').value = amount > 0 ? "$" + (amount * stakingPriceUsdGlobal).toFixed(2) + " USD" : "$0.00 USD";
    }

    function toggleGiftSelect() {
        const isGift = document.querySelector('input[name="rewardType"]:checked').value === "2";
        document.getElementById('giftSelectGroup').classList.toggle('hidden', !isGift);
    }

    function copyRef() {
        const copyText = document.getElementById("refLink");
        copyText.select();
        document.execCommand("copy");
        showModal("Referral link copied!", "추천 링크가 복사되었습니다!");
    }

    // =========================================================================
    // 3. 블록체인에서 데이터 읽기
    // =========================================================================
    function getReadProvider() {
        if (typeof window.ethereum !== 'undefined') {
            return new ethers.providers.Web3Provider(window.ethereum);
        }
        return new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    }

    async function initGlobalContractData() {
        if (CONTRACT_ADDRESS === ethers.constants.AddressZero) {
            document.getElementById("countdown").innerText = "INVALID CONTRACT ADDR";
            return;
        }

        try {
            const provider = getReadProvider();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, UNIFIED_ABI, provider);

            const claimUnix = await contract.nodeClaimTime();
            claimDateMs = claimUnix.toNumber() * 1000;
            startCountdown();

            const [stakingOpen, nodePriceWei, minBuyWei, minQualifyWei, stakePriceWei, rateBps] = await Promise.all([
                contract.stakingEnabled(),
                contract.nodeTokenPriceUsdt(),
                contract.minNodeBuyHaechi(),
                contract.minNodeQualifyUsdt(),
                contract.tokenPriceUsd(),
                contract.dailyRewardRateBps()
            ]);

            isStakingOpenGlobal = stakingOpen;
            nodePriceUsdtGlobal = parseFloat(ethers.utils.formatUnits(nodePriceWei, 18));
            minNodeBuyGlobal = parseFloat(ethers.utils.formatUnits(minBuyWei, 18));
            minQualifyUsdtGlobal = parseFloat(ethers.utils.formatUnits(minQualifyWei, 18));
            stakingPriceUsdGlobal = parseFloat(ethers.utils.formatUnits(stakePriceWei, 18));

            document.getElementById('haechiAmount').placeholder = `Min ${minNodeBuyGlobal}`;
            document.getElementById('nodePriceLabel').innerText = `$${nodePriceUsdtGlobal.toFixed(2)} / HAECHI`;
            document.getElementById('dailyRateDisplay').innerText = (rateBps.toNumber() / 100).toFixed(2) + "%";
            
            const sysBadge = document.getElementById('stakingSystemBadge');
            if (isStakingOpenGlobal) {
                sysBadge.className = "badge badge-success";
                sysBadge.innerText = currentLang === 'en' ? "Staking Open" : "스테이킹 오픈";
            } else {
                sysBadge.className = "badge badge-danger";
                sysBadge.innerText = currentLang === 'en' ? "Opens After Node Sale" : "노드 판매 후 오픈";
            }
        } catch (e) {
            console.error("Gagal membaca data global kontrak:", e);
            document.getElementById("countdown").innerText = "CHECK CONTRACT / NETWORK";
        }
    }

    function startCountdown() {
        if (countdownInterval) clearInterval(countdownInterval);
        const updateTimer = () => {
            const now = Date.now();
            const distance = claimDateMs - now;
            if (distance <= 0) {
                document.getElementById("countdown").innerText = currentLang === 'en' ? "CLAIM OPEN!" : "청구 가능!";
                clearInterval(countdownInterval);
                return;
            }
            const d = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);
            document.getElementById("countdown").innerText = `${d}d ${h}h ${m}m ${s}s`;
        };
        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);
    }

    async function fetchUserData() {
        const validUser = cleanAddr(userAddress);
        if (validUser === ethers.constants.AddressZero || CONTRACT_ADDRESS === ethers.constants.AddressZero) return;

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, UNIFIED_ABI, provider);
            const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
            const haechiContract = new ethers.Contract(HAECHI_ADDRESS, ERC20_ABI, provider);

            const [usdtBalWei, haechiBalWei] = await Promise.all([
                usdtContract.balanceOf(validUser),
                haechiContract.balanceOf(validUser)
            ]);

            document.getElementById('userUsdtBalance').innerText = parseFloat(ethers.utils.formatUnits(usdtBalWei, 18)).toFixed(2);
            document.getElementById('userHaechiBalance').innerText = parseFloat(ethers.utils.formatUnits(haechiBalWei, 18)).toFixed(2);

            const [dash, nodeHist, downlinePage] = await Promise.all([
                contract.getUnifiedDashboard(validUser),
                contract.getUserNodeHistory(validUser),
                contract.getDirectDownlinesPaginated(validUser, 0, 50)
            ]);

            isUserBound = dash.isRegistered;
            const bindCard = document.getElementById('bindSponsorCard');
            const sponsorDisplay = document.getElementById('sponsorDisplay');
            const buyBtn = document.getElementById('btnBuy');
            const stakeWalletBtn = document.getElementById('btnStakeWallet');

            if (!isUserBound) {
                bindCard.classList.remove('hidden');
                sponsorDisplay.classList.add('hidden');

                const urlParams = new URLSearchParams(window.location.search);
                const refParam = urlParams.get('ref');
                const bindInput = document.getElementById('bindSponsorInput');
                if (refParam && ethers.utils.isAddress(refParam.trim()) && refParam.trim().toLowerCase() !== validUser.toLowerCase()) {
                    bindInput.value = cleanAddr(refParam);
                }

                buyBtn.disabled = true;
                buyBtn.innerText = currentLang === 'en' ? "Bind Sponsor First (Above)" : "먼저 위에서 추천인을 등록하세요";
            } else {
                bindCard.classList.add('hidden');
                buyBtn.disabled = false;
                buyBtn.innerText = currentLang === 'en' ? "Approve USDT & Buy Node" : "USDT 승인 및 노드 구매";

                if (dash.referrer !== ethers.constants.AddressZero) {
                    const cleanRef = cleanAddr(dash.referrer);
                    const shortSponsor = `${cleanRef.substring(0,6)}...${cleanRef.substring(38)}`;
                    const sponsorLinkElem = document.getElementById('sponsorLink');
                    sponsorLinkElem.innerText = shortSponsor;
                    sponsorLinkElem.href = `https://bscscan.com/address/${cleanRef}`;
                    sponsorDisplay.classList.remove('hidden');
                }
            }

            // --- UPDATE TAB 1: NODE PRESALE ---
            const qBadge = document.getElementById('nodeQualifyBadge');
            if (dash.isWhitelisted) {
                qBadge.className = "badge badge-gold";
                qBadge.innerText = currentLang === 'en' ? "Whitelisted (Bonus Active)" : "화이트리스트 (보너스 활성)";
            } else if (dash.isNodeQualified) {
                qBadge.className = "badge badge-success";
                qBadge.innerText = currentLang === 'en' ? `Bonus Qualified (≥$${minQualifyUsdtGlobal})` : `보너스 충족 (≥$${minQualifyUsdtGlobal})`;
            } else {
                qBadge.className = "badge badge-danger";
                qBadge.innerText = currentLang === 'en' ? `Need $${minQualifyUsdtGlobal} for Ref Bonus` : `추천 보너스 $${minQualifyUsdtGlobal} 필요`;
            }

            const baseBought = parseFloat(ethers.utils.formatUnits(dash.nodeBaseBought, 18));
            const bonusTok = parseFloat(ethers.utils.formatUnits(dash.nodeBonusToken, 18));
            const claimableNode = parseFloat(ethers.utils.formatUnits(dash.claimableNodeToken, 18));
            const nodeRefUsdt = parseFloat(ethers.utils.formatUnits(dash.nodeRefBonusUsdt, 18));

            document.getElementById('nodeBaseBought').innerText = `${baseBought.toFixed(2)} HAECHI`;
            document.getElementById('nodeExtraToken').innerText = `+${bonusTok.toFixed(2)} HAECHI`;
            document.getElementById('claimableNodeToken').innerText = `${claimableNode.toFixed(2)} HAECHI`;
            document.getElementById('nodeRefBonusUsdt').innerText = `${nodeRefUsdt.toFixed(2)} USDT`;

            const canClaimNodeNow = Date.now() >= claimDateMs && claimableNode > 0;
            document.getElementById('btnClaimNodeWallet').disabled = !canClaimNodeNow;
            document.getElementById('btnClaimNodeStake').disabled = !(canClaimNodeNow && isStakingOpenGlobal && isUserBound);

            let histHTML = "";
            if (!nodeHist || nodeHist.length === 0) {
                histHTML = `<div style="text-align:center; color:gray;">No purchases found</div>`;
            } else {
                [...nodeHist].reverse().forEach(item => {
                    const bAmt = parseFloat(ethers.utils.formatUnits(item.baseHaechi, 18)).toFixed(0);
                    const dateStr = new Date(Number(item.timestamp) * 1000).toLocaleDateString();
                    const tag = item.rewardType === 1 ? "+20% Token" : `Gift: ${GIFT_NAMES[item.giftChoice]}`;
                    histHTML += `
                        <div class="history-item">
                            <span style="font-size:12px; color:gray;">${dateStr} (${tag})</span>
                            <span style="font-weight:bold; color:var(--gold);">${bAmt} HAECHI</span>
                        </div>`;
                });
            }
            document.getElementById('historyContent').innerHTML = histHTML;

            // --- UPDATE TAB 2: STAKING & TEAM ---
            const sNode = parseFloat(ethers.utils.formatUnits(dash.stakedFromNode, 18));
            const sWallet = parseFloat(ethers.utils.formatUnits(dash.stakedFromWallet, 18));
            const actPrin = parseFloat(ethers.utils.formatUnits(dash.activePrincipalToken, 18));
            const actUsd = parseFloat(ethers.utils.formatUnits(dash.activePrincipalUsd, 18));
            const maxCap = parseFloat(ethers.utils.formatUnits(dash.maxPayoutCapToken, 18));
            const earned = parseFloat(ethers.utils.formatUnits(dash.totalEarnedToken, 18));
            const remQuota = parseFloat(ethers.utils.formatUnits(dash.remainingQuotaToken, 18));
            const cRoi = parseFloat(ethers.utils.formatUnits(dash.claimableRoiToken, 18));
            const cNet = parseFloat(ethers.utils.formatUnits(dash.claimableNetworkToken, 18));
            const totClaimable = cRoi + cNet;

            let pct = maxCap > 0 ? Math.min(100, (earned / maxCap) * 100) : 0;
            document.getElementById('capPercentText').innerText = `${(pct * 3).toFixed(2)}% / 300%`;
            document.getElementById('capProgressBar').style.width = `${pct}%`;

            document.getElementById('stakedFromNode').innerText = `${sNode.toFixed(2)} HAECHI`;
            document.getElementById('stakedFromWallet').innerText = `${sWallet.toFixed(2)} HAECHI`;
            document.getElementById('activePrincipal').innerText = `${actPrin.toFixed(2)} ($${actUsd.toFixed(2)})`;
            
            const directRatePct = (dash.directRebaseRateBps / 100).toFixed(0);
            document.getElementById('directRebaseTierText').innerText = directRatePct > 0
                ? `${directRatePct}% Active`
                : (currentLang === 'en' ? "0% (Need ≥$100 Active Stake)" : "0% ($100 이상 활성 스테이킹 필요)");

            document.getElementById('remainingQuota').innerText = `${remQuota.toFixed(4)} HAECHI`;
            document.getElementById('claimableRoi').innerText = `${cRoi.toFixed(4)} HAECHI`;
            document.getElementById('claimableNetwork').innerText = `${cNet.toFixed(4)} HAECHI`;
            document.getElementById('totalClaimableBtn').innerText = `${totClaimable.toFixed(4)} HAECHI`;

            document.getElementById('userRankBadge').innerText = RANK_NAMES[dash.currentRank] || "No Rank";
            document.getElementById('totalTeamVol').innerText = `$${parseFloat(ethers.utils.formatUnits(dash.totalTeamVolumeUsd, 18)).toFixed(2)} USD`;
            document.getElementById('bigLegVol').innerText = `$${parseFloat(ethers.utils.formatUnits(dash.bigLegVolumeUsd, 18)).toFixed(2)} USD`;
            document.getElementById('smallLegVol').innerText = `$${parseFloat(ethers.utils.formatUnits(dash.smallLegsVolumeUsd, 18)).toFixed(2)} USD`;

            stakeWalletBtn.disabled = !(isStakingOpenGlobal && isUserBound);
            document.getElementById('btnClaimStaking').disabled = totClaimable <= 0;
            document.getElementById('btnEarlyUnstake').disabled = !dash.isStakingActive || actPrin <= 0;

            // --- UPDATE SHARED REFERRAL LIST ---
            document.getElementById('directCount').innerText = `${dash.directDownlineCount.toString()} Users`;
            const downlines = downlinePage.downlines;
            const nodeVols = downlinePage.nodeVolumesHaechi;
            const stakeVols = downlinePage.stakingLegVolumesUsd;

            let totalDirectNodeHaechi = 0;
            let downlineHTML = "";
            if (!downlines || downlines.length === 0) {
                downlineHTML = `<div style="text-align:center; font-size:12px; color:gray;">No downlines yet</div>`;
            } else {
                for (let i = 0; i < downlines.length; i++) {
                    const addr = downlines[i];
                    const nVol = parseFloat(ethers.utils.formatUnits(nodeVols[i], 18));
                    const sVol = parseFloat(ethers.utils.formatUnits(stakeVols[i], 18));
                    totalDirectNodeHaechi += nVol;
                    const shortAddr = `${addr.substring(0,6)}...${addr.substring(38)}`;
                    downlineHTML += `
                        <div class="stat-row" style="border-bottom: 1px solid #e0e0e0; margin-bottom: 5px;">
                            <span><a href="https://bscscan.com/address/${addr}" target="_blank" class="sponsor-link">${shortAddr}</a></span>
                            <span class="stat-value" style="font-size: 11.5px;">${nVol.toFixed(0)} HAECHI | $${sVol.toFixed(0)}</span>
                        </div>`;
                }
            }
            document.getElementById('directNodeVol').innerText = `${totalDirectNodeHaechi.toFixed(2)} HAECHI`;
            document.getElementById('downlineList').innerHTML = downlineHTML;

        } catch (err) {
            console.error("Error loading user data:", err);
        }
    }

    // =========================================================================
    // 4. WALLET CONNECTION, BIND SPONSOR & TRANSACTIONS
    // =========================================================================
    async function connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            showModal("Please install MetaMask or TokenPocket!", "메타마스크 또는 토큰포켓을 설치해주세요!");
            return;
        }
        try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (parseInt(chainId, 16) !== BSC_CHAIN_ID) {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }],
                });
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            const signer = provider.getSigner();
            const rawAddr = await signer.getAddress();
            userAddress = cleanAddr(rawAddr);

            const message = `Welcome to Haechi Protocol!\n\nPlease sign this message to authenticate your wallet.\nAddress: ${userAddress}`;
            await signer.signMessage(message);

            document.getElementById('connectBtn').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            document.getElementById('disconnectBtn').classList.remove('hidden');
            document.getElementById('walletAddress').innerText = `${userAddress.substring(0,6)}...${userAddress.substring(38)}`;

            const baseUrl = window.location.origin + window.location.pathname;
            document.getElementById('refLink').value = `${baseUrl}?ref=${userAddress}`;

            await initGlobalContractData();
            await fetchUserData();
        } catch (error) {
            console.error(error);
            showModal("Connection or signature rejected.", "연결 또는 서명이 거부되었습니다.");
        }
    }

    function disconnectWallet() {
        userAddress = null;
        isUserBound = false;
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('disconnectBtn').classList.add('hidden');
        document.getElementById('connectBtn').classList.remove('hidden');
        document.getElementById('walletAddress').innerText = '';
        document.getElementById('sponsorDisplay').classList.add('hidden');
        showModal("Wallet disconnected.", "지갑 연결이 해제되었습니다.");
    }

    async function executeBindSponsor() {
        if (!userAddress) return;
        const rawRef = document.getElementById('bindSponsorInput').value;
        const cleanRef = cleanAddr(rawRef);

        if (cleanRef === ethers.constants.AddressZero || cleanRef.toLowerCase() === userAddress.toLowerCase()) {
            showModal(
                "Please enter a valid Sponsor wallet address (cannot be your own wallet).",
                "유효한 추천인 지갑 주소를 입력하세요 (본인 지갑 불가)."
            );
            return;
        }

        const btn = document.getElementById('btnBindSponsor');
        btn.disabled = true;
        btn.innerText = currentLang === 'en' ? "Binding Sponsor..." : "추천인 등록 중...";

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, UNIFIED_ABI, provider.getSigner());

            const tx = await contract.bindSponsor(cleanRef);
            await tx.wait();

            showModal("Sponsor bound permanently!", "추천인이 영구적으로 등록되었습니다!");
            await fetchUserData();
        } catch (err) {
            console.error(err);
            showModal(err.reason || "Bind sponsor failed or cancelled.", "추천인 등록에 실패했습니다.");
            btn.disabled = false;
            btn.innerText = currentLang === 'en' ? "🔗 Bind Sponsor Permanently" : "🔗 추천인 영구 등록하기";
        }
    }

    async function buyNode() {
        if (!userAddress) return;
        if (!isUserBound) {
            showModal("Please bind your sponsor first!", "먼저 추천인을 등록해주세요!");
            return;
        }

        const haechiInput = parseFloat(document.getElementById('haechiAmount').value);
        if (!haechiInput || haechiInput < minNodeBuyGlobal) {
            showModal(
                `Minimum purchase is ${minNodeBuyGlobal} Haechi.`,
                `최소 구매 수량은 ${minNodeBuyGlobal} 해치입니다.`
            );
            return;
        }

        const buyBtn = document.getElementById('btnBuy');
        buyBtn.disabled = true;
        buyBtn.innerText = currentLang === 'en' ? "Processing..." : "처리 중...";

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();

            const haechiAmountWei = ethers.utils.parseUnits(haechiInput.toString(), 18);
            const usdtCostStr = (haechiInput * nodePriceUsdtGlobal).toFixed(6);
            const usdtCostWei = ethers.utils.parseUnits(usdtCostStr, 18);

            const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
            const unifiedContract = new ethers.Contract(CONTRACT_ADDRESS, UNIFIED_ABI, signer);

            const bal = await usdtContract.balanceOf(userAddress);
            if (bal.lt(usdtCostWei)) {
                showModal("Insufficient USDT balance.", "USDT 잔액이 부족합니다.");
                buyBtn.disabled = false;
                buyBtn.innerText = currentLang === 'en' ? "Approve USDT & Buy Node" : "USDT 승인 및 노드 구매";
                return;
            }

            const allowance = await usdtContract.allowance(userAddress, CONTRACT_ADDRESS);
            if (allowance.lt(usdtCostWei)) {
                showModal("Step 1: Approve USDT in your wallet.", "1단계: 지갑에서 USDT를 승인해주세요.");
                const appTx = await usdtContract.approve(CONTRACT_ADDRESS, usdtCostWei);
                await appTx.wait();
            }

            const rewardType = parseInt(document.querySelector('input[name="rewardType"]:checked').value);
            const giftChoice = rewardType === 2 ? parseInt(document.getElementById('giftSelect').value) : 0;

            showModal("Step 2: Confirm Node purchase in your wallet.", "2단계: 지갑에서 노드 구매를 확인해주세요.");
            const tx = await unifiedContract.buyNode(haechiAmountWei, rewardType, giftChoice);
            await tx.wait();

            showModal("Node Purchase Successful!", "노드 구매가 완료되었습니다!");
            document.getElementById('haechiAmount').value = '';
            document.getElementById('usdtAmount').value = '';
            await fetchUserData();
        } catch (err) {
            console.error(err);
            showModal(err.reason || "Transaction cancelled or failed.", "거래가 취소되었거나 실패했습니다.");
        }
        buyBtn.disabled = false;
        buyBtn.innerText = currentLang === 'en' ? "Approve USDT & Buy Node" : "USDT 승인 및 노드 구매";
    }

    async function claimNodeToWallet() {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, UNIFIED_ABI, provider.getSigner());
            const tx = await contract.claimNodeTokens();
            await tx.wait();
            showModal("Node tokens claimed to your wallet!", "노드 토큰이 지갑으로 청구되었습니다!");
            await fetchUserData();
        } catch (err) {
            showModal(err.reason || "Claim failed.", "청구 실패.");
        }
    }

    async function claimNodeAndDirectStake() {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, UNIFIED_ABI, provider.getSigner());
            const tx = await contract.claimNodeAndStake();
            await tx.wait();
            showModal("Node tokens claimed and staked directly!", "노드 토큰 청구 및 스테이킹이 완료되었습니다!");
            navigateBottom('stake');
            await fetchUserData();
        } catch (err) {
            showModal(err.reason || "Claim & Stake failed.", "청구 및 스테이킹 실패.");
        }
    }

    async function stakeFromWallet() {
        if (!isUserBound) {
            showModal("Please bind your sponsor first!", "먼저 추천인을 등록해주세요!");
            return;
        }
        if (!isStakingOpenGlobal) {
            showModal("Staking will open after the Node Presale ends.", "스테이킹은 노드 프리세일 종료 후 오픈됩니다.");
            return;
        }
        const amt = parseFloat(document.getElementById('stakeAmount').value);
        if (!amt || amt <= 0) return;

        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const amtWei = ethers.utils.parseUnits(amt.toString(), 18);

            const haechiContract = new ethers.Contract(HAECHI_ADDRESS, ERC20_ABI, signer);
            const unifiedContract = new ethers.Contract(CONTRACT_ADDRESS, UNIFIED_ABI, signer);

            const allowance = await haechiContract.allowance(userAddress, CONTRACT_ADDRESS);
            if (allowance.lt(amtWei)) {
                const appTx = await haechiContract.approve(CONTRACT_ADDRESS, amtWei);
                await appTx.wait();
            }

            const tx = await unifiedContract.stake(amtWei);
            await tx.wait();

            showModal("Wallet Staking Successful!", "지갑 스테이킹이 완료되었습니다!");
            document.getElementById('stakeAmount').value = '';
            document.getElementById('stakeUsdValue').value = '';
            await fetchUserData();
        } catch (err) {
            showModal(err.reason || "Staking failed.", "스테이킹 실패.");
        }
    }

    async function claimStakingRewards() {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, UNIFIED_ABI, provider.getSigner());
            const tx = await contract.claimRewards();
            await tx.wait();
            showModal("Staking rewards claimed!", "스테이킹 보상이 청구되었습니다!");
            await fetchUserData();
        } catch (err) {
            showModal(err.reason || "Claim failed.", "청구 실패.");
        }
    }

    async function earlyUnstakeTokens() {
        if (!confirm(currentLang === 'en' ? "Confirm Early Unstake with 40% Penalty (Receive 60% Principal)?" : "40% 페널티를 감수하고 조기 언스테이킹(원금의 60% 수령) 하시겠습니까?")) return;
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, UNIFIED_ABI, provider.getSigner());
            const tx = await contract.earlyUnstake();
            await tx.wait();
            showModal("Early Unstake completed (60% returned).", "조기 언스테이킹 완료 (60% 반환).");
            await fetchUserData();
        } catch (err) {
            showModal(err.reason || "Unstake failed.", "언스테이킹 실패.");
        }
    }