 // ==========================================================================
// MOCK DATA: LOGISTICS DATABASES
// ==========================================================================

// EUR to CNY Exchange Rate (Mock fixed rate for prototype)
const EUR_TO_CNY = 7.8;

// Direction 1: China to Europe Consolidators (RMB priced)
const CHINA_TO_EUROPE_CARRIERS = [
    {
        id: "c2e-1",
        name: "极速食品特货专线 (Air Food)",
        type: "空运特货",
        baseWeight: 0.5,
        basePrice: 98, // First 0.5kg
        stepPrice: 35, // Every 0.5kg after
        volDivisor: 5000,
        days: "7-12",
        safety: 98,
        allowedTypes: ["normal", "food"],
        tag: "食品特货首选",
        tagClass: "tag-fastest"
    },
    {
        id: "c2e-2",
        name: "中欧双清空运包税线 (Air Tax-Free)",
        type: "空运包税",
        baseWeight: 0.5,
        basePrice: 85,
        stepPrice: 28,
        volDivisor: 5000,
        days: "10-15",
        safety: 99,
        allowedTypes: ["normal", "battery", "luxury"],
        tag: "清关免税最稳",
        tagClass: "tag-cheapest"
    },
    {
        id: "c2e-3",
        name: "中欧铁路快捷集运 (Rail Express)",
        type: "铁路专线",
        baseWeight: 1.0,
        basePrice: 45, // First 1kg
        stepPrice: 18, // Every 1kg after
        volDivisor: 6000,
        days: "25-35",
        safety: 95,
        allowedTypes: ["normal", "battery"],
        tag: "性价比最高",
        tagClass: "tag-cheapest"
    },
    {
        id: "c2e-4",
        name: "中欧海运大包线 (Sea Economy)",
        type: "海运专线",
        baseWeight: 5.0,
        basePrice: 120, // First 5kg
        stepPrice: 12, // Every 1kg after
        volDivisor: 6000,
        days: "45-60",
        safety: 93,
        allowedTypes: ["normal", "food", "battery"],
        tag: "超重包裹最划算",
        tagClass: ""
    }
];

// Direction 2: Europe to China Couriers (EUR priced)
// Simulates local Chinese courier companies and European official posts.
const EUROPE_TO_CHINA_CARRIERS = [
    {
        id: "e2c-1",
        name: "欧洲当地华邮免税线 (Euro-China Tax-Free)",
        type: "华人快递",
        baseWeight: 1.0,
        basePrice: 12.0, // EUR first 1kg
        stepPrice: 4.5, // EUR every 1kg after
        days: "10-18",
        safety: 99,
        maxPackageValue: 130, // 1000 RMB equivalent
        tag: "行邮包税专线",
        tagClass: "tag-cheapest"
    },
    {
        id: "e2c-2",
        name: "中欧特快航空专线 (Air Express)",
        type: "空运特快",
        baseWeight: 1.0,
        basePrice: 22.0,
        stepPrice: 7.0,
        days: "6-9",
        safety: 96,
        maxPackageValue: 130,
        tag: "紧急文件/礼品首选",
        tagClass: "tag-fastest"
    },
    {
        id: "e2c-3",
        name: "欧洲本地邮政航空小包 (Official Post)",
        type: "官方邮政",
        baseWeight: 1.0,
        basePrice: 32.0,
        stepPrice: 9.0,
        days: "12-25",
        safety: 90,
        maxPackageValue: 1000, // Post has higher limit but subject to tax
        tag: "官方直邮通道",
        tagClass: ""
    }
];

// Item tax catalog in China (行邮税率)
const CHINA_TAX_RATES = {
    supplements: 0.13, // 保健品 13%
    milkpowder: 0.13,  // 奶粉 13%
    cosmetics: 0.20,   // 普通化妆品 20%
    luxury: 0.20,      // 服饰皮具 20%
    electronics: 0.13  // 数码产品 13%
};

const CHINA_TAX_LABELS = {
    supplements: "保健品 (13%)",
    milkpowder: "婴儿奶粉 (13%)",
    cosmetics: "化妆品/护肤品 (20%)",
    luxury: "鞋帽服饰/轻奢 (20%)",
    electronics: "数码配件 (13%)"
};

// ==========================================================================
// STATE MANAGEMENT & INITIALIZATION
// ==========================================================================
let currentMode = 'c2e'; // 'c2e' or 'e2c'
let e2cItems = [];       // List of added items for Europe to China
let generatedRoutes = []; // Temporarily stores routes for sorting
let uploadIDImg = null;  // Stores uploaded ID Image object

document.addEventListener('DOMContentLoaded', () => {
    // ✅ 已删除测试物品，页面加载时物品列表为空，由用户自己添加
});

// ==========================================================================
// MODE TOGGLE
// ==========================================================================
function switchMode(mode) {
    currentMode = mode;
   
    // Toggle active tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-${mode}`).classList.add('active');
   
    // Toggle active forms
    document.querySelectorAll('.mode-form').forEach(form => form.classList.remove('active'));
    document.getElementById(`form-${mode}`).classList.add('active');
   
    // Reset/Clear Results Right Panel
    resetResultsPanel();
}

function resetResultsPanel() {
    generatedRoutes = [];
    document.getElementById('vol-weight-alert').classList.add('hide');
    document.getElementById('sort-controls-bar').classList.add('hide');
   
    const routesList = document.getElementById('routes-list');
    const subtitle = document.getElementById('results-subtitle');
   
    if (currentMode === 'c2e') {
        subtitle.textContent = "请点击左侧估价按钮生成路线数据";
        routesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-calculator"></i></div>
                <h3>中国 ➔ 欧洲比价</h3>
                <p>我们将比对中欧敏感货专线、铁路拼箱、空运免税线等，为您筛选出最划算和最稳妥的物流航线。</p>
            </div>
        `;
    } else {
        subtitle.textContent = "输入商品清单并执行智能分箱避税后查看比价";
        routesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                <h3>欧洲 ➔ 中国比价</h3>
                <p>点击左侧“一键双向比价与智能分箱避税”按钮，系统将自动进行分包优化，并给出最省钱的中国行邮税清关快递路线。</p>
            </div>
        `;
    }
}

// Country Names Mapping
const COUNTRY_NAMES = {
    DE: "德国", FR: "法国", GB: "英国", NL: "荷兰", BE: "比利时", CH: "瑞士", AT: "奥地利", IE: "爱尔兰",
    DK: "丹麦", SE: "瑞典", NO: "挪威", FI: "芬兰", IS: "冰岛",
    IT: "意大利", ES: "西班牙", PT: "葡萄牙", GR: "希腊",
    PL: "波兰", CZ: "捷克", HU: "匈牙利"
};

// Region Classifier Helper
function getRegionDetails(countryCode) {
    const northern = ['DK', 'SE', 'NO', 'FI', 'IS'];
    const southern = ['IT', 'ES', 'PT', 'GR'];
    const eastern = ['PL', 'CZ', 'HU'];
   
    if (northern.includes(countryCode)) {
        return { name: "北欧", priceFactor: 1.15, daysOffset: 3 };
    } else if (southern.includes(countryCode)) {
        return { name: "南欧", priceFactor: 1.00, daysOffset: 2 };
    } else if (eastern.includes(countryCode)) {
        return { name: "东欧", priceFactor: 0.95, daysOffset: 1 };
    } else {
        return { name: "中西欧", priceFactor: 1.00, daysOffset: 0 };
    }
}

// ==========================================================================
// FORM 1: CHINA TO EUROPE (REVERSE HAITAO) CALCULATOR
// ==========================================================================
function calculateChinaToEurope() {
    const country = document.getElementById('c2e-country').value;
    const weight = parseFloat(document.getElementById('c2e-weight').value);
    const cargoType = document.getElementById('c2e-cargo-type').value;
   
    const length = parseFloat(document.getElementById('c2e-length').value) || 0;
    const width = parseFloat(document.getElementById('c2e-width').value) || 0;
    const height = parseFloat(document.getElementById('c2e-height').value) || 0;
   
    if (isNaN(weight) || weight <= 0) {
        alert("请输入合法的实际重量！");
        return;
    }
   
    // Calculate volumetric weight for standard divisor 5000 and 6000
    const volWeight5000 = (length * width * height) / 5000;
   
    // Show alert if volumetric weight exceeds actual weight
    const alertBox = document.getElementById('vol-weight-alert');
    const alertText = document.getElementById('vol-weight-alert-text');
   
    if (volWeight5000 > weight) {
        alertBox.classList.remove('hide');
        alertText.innerHTML = `<strong>体积重警示：</strong>根据箱子尺寸计算出的体积重为 <strong>${volWeight5000.toFixed(2)} kg</strong>，已大于实际重量 <strong>${weight.toFixed(2)} kg</strong>。计费将按体积重收费。建议尽量精简外包装！`;
    } else {
        alertBox.classList.add('hide');
    }
   
    // Get region details
    const region = getRegionDetails(country);
    const countryName = COUNTRY_NAMES[country] || country;
   
    // Filter and compute routes
    generatedRoutes = [];
   
    CHINA_TO_EUROPE_CARRIERS.forEach(carrier => {
        // Check if cargo type is allowed on this line
        if (!carrier.allowedTypes.includes(cargoType)) {
            return;
        }
       
        // Compute chargeable weight based on carrier's specific volumetric divisor
        const carrierVolWeight = (length * width * height) / carrier.volDivisor;
        const chargeableWeight = Math.max(weight, carrierVolWeight);
       
        // Calculate price in RMB with regional factor adjustments
        let finalPriceRMB = 0;
        const adjustedBase = carrier.basePrice * region.priceFactor;
        const adjustedStep = carrier.stepPrice * region.priceFactor;
       
        if (chargeableWeight <= carrier.baseWeight) {
            finalPriceRMB = adjustedBase;
        } else {
            const steps = Math.ceil((chargeableWeight - carrier.baseWeight) / carrier.baseWeight);
            finalPriceRMB = adjustedBase + (steps * adjustedStep);
        }
       
        // Convert to EUR for double-currency display
        const finalPriceEUR = finalPriceRMB / EUR_TO_CNY;
       
        // Adjust days range
        const dayRange = carrier.days.split('-');
        const minDays = parseInt(dayRange[0]) + region.daysOffset;
        const maxDays = parseInt(dayRange[1]) + region.daysOffset;
        const adjustedDays = `${minDays}-${maxDays}`;
       
        generatedRoutes.push({
            name: carrier.name,
            type: carrier.type,
            priceRMB: finalPriceRMB,
            priceEUR: finalPriceEUR,
            days: adjustedDays,
            safety: carrier.safety,
            chargeWeight: chargeableWeight,
            isVolumetric: carrierVolWeight > weight,
            tag: carrier.tag,
            tagClass: carrier.tagClass
        });
    });
   
    // Show sorting bar and render
    document.getElementById('sort-controls-bar').classList.remove('hide');
    document.getElementById('results-subtitle').textContent = `已为您匹配到 ${generatedRoutes.length} 条发往 ${countryName} (${region.name}地区) 的集运航线`;
    renderRoutesList();
}

// ==========================================================================
// FORM 2: EUROPE TO CHINA (SPLIT BOX & TAX OPTIMIZATION)
// ==========================================================================

// ✅ 修改后的 addItemRow：增加 weight 参数和重量输入框
function addItemRow(name = "", category = "supplements", qty = 1, price = "", weight = "") {
    const container = document.getElementById('items-container');
    const id = 'item-' + Date.now() + Math.random().toString(36).substr(2, 5);

    const card = document.createElement('div');
    card.className = 'item-card';
    card.id = id;

    let optionsHtml = '';
    for (const [key, label] of Object.entries(CHINA_TAX_LABELS)) {
        optionsHtml += `<option value="${key}" ${key === category ? 'selected' : ''}>${label}</option>`;
    }

    card.innerHTML = `
        <div class="card-row">
            <label>物品名</label>
            <input type="text" class="item-name" placeholder="如：保健品" value="${name}">
        </div>
        <div class="card-row">
            <label>类别</label>
            <select class="item-category" onchange="recalculateSummaryStats()">
                ${optionsHtml}
            </select>
        </div>
        <div class="card-row">
            <label>数量</label>
            <input type="number" class="item-qty" value="${qty}" min="1" oninput="recalculateSummaryStats()">
        </div>
        <div class="card-row">
            <label>单价(€)</label>
            <input type="number" class="item-price" value="${price}" min="0" step="0.01" placeholder="0.00" oninput="recalculateSummaryStats()">
        </div>
        <div class="card-row">
            <label>重量(kg)</label>
            <input type="number" class="item-weight" value="${weight}" min="0" step="0.1" placeholder="0.0" oninput="recalculateSummaryStats()">
        </div>
        <button class="btn-delete-row" onclick="removeItemRow('${id}')">
            <i class="fa-solid fa-trash-can"></i> 删除
        </button>
    `;

    container.appendChild(card);
    recalculateSummaryStats();
}
// ✅ 修复 removeItemRow：删除后重新计算
function removeItemRow(id) {
    const row = document.getElementById(id);
    if (row) {
        row.remove();
        recalculateSummaryStats();
    }
}

// ✅ 修改后的 recalculateSummaryStats：计算总金额和总重量
function recalculateSummaryStats() {
    let totalEUR = 0;
    let totalWeight = 0;
    const rows = document.querySelectorAll('.item-row');
   
    rows.forEach(row => {
        const qty = parseInt(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const weight = parseFloat(row.querySelector('.item-weight').value) || 0;
        totalEUR += qty * price;
        totalWeight += qty * weight;
    });
   
    const totalCNY = totalEUR * EUR_TO_CNY;
   
    document.getElementById('total-val-display').textContent = `${totalEUR.toFixed(2)} EUR`;
    document.getElementById('total-cny-display').textContent = `${totalCNY.toFixed(2)} RMB`;
   
    // 如果有显示总重量的元素，更新它
    const weightDisplay = document.getElementById('total-weight-display');
    if (weightDisplay) {
        weightDisplay.textContent = `${totalWeight.toFixed(2)} kg`;
    }
}

// Split-Box Optimization Algorithm (智能分箱算法) - ✅ 使用用户输入的重量
function optimizeSplitBox() {
    // Read all items from dynamic rows
    const rows = document.querySelectorAll('.item-row');
    const items = [];
   
    rows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim() || "未命名物品";
        const category = row.querySelector('.item-category').value;
        const qty = parseInt(row.querySelector('.item-qty').value) || 1;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const weightPerItem = parseFloat(row.querySelector('.item-weight').value) || 0.4; // 读取用户输入的重量，无输入时默认0.4kg
       
        // Flatten list by individual quantity
        for (let i = 0; i < qty; i++) {
            items.push({
                name: name,
                category: category,
                priceEUR: price,
                priceCNY: price * EUR_TO_CNY,
                weight: weightPerItem  // 记录单件重量
            });
        }
    });
   
    if (items.length === 0) {
        alert("请输入要邮寄的物品！");
        return;
    }
   
    // Max package value limit set to 1000 RMB (approx 128 EUR)
    const VALUE_LIMIT_RMB = 1000;
    const packages = [];
   
    // Sort items by value descending (First-Fit Decreasing algorithm style)
    items.sort((a, b) => b.priceCNY - a.priceCNY);
   
    items.forEach(item => {
        let placed = false;
       
        for (let pkg of packages) {
            const currentTotalVal = pkg.items.reduce((sum, it) => sum + it.priceCNY, 0);
           
            if (currentTotalVal + item.priceCNY <= VALUE_LIMIT_RMB) {
                pkg.items.push(item);
                placed = true;
                break;
            }
        }
       
        if (!placed) {
            packages.push({
                id: packages.length + 1,
                items: [item]
            });
        }
    });
   
    // Render package split details
    const resultWrapper = document.getElementById('split-box-result-wrapper');
    const packagesContainer = document.getElementById('split-packages-container');
   
    packagesContainer.innerHTML = '';
    resultWrapper.classList.remove('hide');
   
    let totalEstTaxEUR = 0;
    let totalWeightEst = 0;
   
    packages.forEach(pkg => {
        const pkgValCNY = pkg.items.reduce((sum, it) => sum + it.priceCNY, 0);
        const pkgValEUR = pkg.items.reduce((sum, it) => sum + it.priceEUR, 0);
       
        // ✅ 使用用户输入的重量计算，如果没有则用0.4kg估算
        let pkgWeight = 0.3; // 包装箱重量
        pkg.items.forEach(it => {
            pkgWeight += it.weight || 0.4;
        });
        totalWeightEst += pkgWeight;
       
        // Calculate tax for this package
        let packageTaxCNY = 0;
       
        pkg.items.forEach(it => {
            const rate = CHINA_TAX_RATES[it.category] || 0.13;
            packageTaxCNY += it.priceCNY * rate;
        });
       
        let isTaxWaived = false;
        if (packageTaxCNY <= 50) {
            isTaxWaived = true;
            packageTaxCNY = 0;
        }
       
        const packageTaxEUR = packageTaxCNY / EUR_TO_CNY;
        totalEstTaxEUR += packageTaxEUR;
       
        const itemLinesHtml = pkg.items.map(it =>
            `<li>${it.name} - ${it.priceEUR.toFixed(2)} € (${CHINA_TAX_LABELS[it.category]})</li>`
        ).join('');
       
        const pkgCard = document.createElement('div');
        pkgCard.className = 'package-card';
        pkgCard.innerHTML = `
            <div class="package-title">
                <span>包裹 #${pkg.id} (行邮税专用包)</span>
                <span>价值: ${pkgValEUR.toFixed(2)} € (约 ${pkgValCNY.toFixed(0)} RMB)</span>
            </div>
            <ul class="package-items-list">
                ${itemLinesHtml}
            </ul>
            <div class="package-footer">
                <span>预估重量: ~${pkgWeight.toFixed(1)} kg</span>
                <span class="${isTaxWaived ? 'tax-free' : 'tax-indicator'}">
                    ${isTaxWaived ? '<i class="fa-solid fa-circle-check"></i> 税金低于50元起征点 (免税)' : `<i class="fa-solid fa-circle-dollar-to-slot"></i> 行邮税: ¥${packageTaxCNY.toFixed(2)} (~${packageTaxEUR.toFixed(2)} €)`}
                </span>
            </div>
        `;
        packagesContainer.appendChild(pkgCard);
    });
   
    // Now trigger bilateral comparison based on the optimized split packages
    calculateEuropeToChina(totalWeightEst, totalEstTaxEUR, packages.length);
}

function calculateEuropeToChina(totalWeight, totalTaxEUR, packageCount) {
    const origin = document.getElementById('e2c-origin').value;
    const region = getRegionDetails(origin);
    const originName = COUNTRY_NAMES[origin] || origin;
   
    generatedRoutes = [];
   
    EUROPE_TO_CHINA_CARRIERS.forEach(carrier => {
        let finalPriceEUR = 0;
       
        const adjustedBase = carrier.basePrice * region.priceFactor;
        const adjustedStep = carrier.stepPrice * region.priceFactor;
       
        if (carrier.type === "华人快递" || carrier.type === "空运特快") {
            const weightPerPkg = totalWeight / packageCount;
            let pricePerPkg = 0;
           
            if (weightPerPkg <= carrier.baseWeight) {
                pricePerPkg = adjustedBase;
            } else {
                const steps = Math.ceil((weightPerPkg - carrier.baseWeight) / carrier.baseWeight);
                pricePerPkg = adjustedBase + (steps * adjustedStep);
            }
           
            finalPriceEUR = pricePerPkg * packageCount;
           
            if (carrier.type === "华人快递") {
                finalPriceEUR += 0;
            } else {
                finalPriceEUR += totalTaxEUR;
            }
        } else {
            if (totalWeight <= carrier.baseWeight) {
                finalPriceEUR = adjustedBase;
            } else {
                const steps = Math.ceil((totalWeight - carrier.baseWeight) / carrier.baseWeight);
                finalPriceEUR = adjustedBase + (steps * adjustedStep);
            }
            finalPriceEUR += totalTaxEUR;
        }
       
        const finalPriceRMB = finalPriceEUR * EUR_TO_CNY;
       
        const dayRange = carrier.days.split('-');
        const minDays = parseInt(dayRange[0]) + region.daysOffset;
        const maxDays = parseInt(dayRange[1]) + region.daysOffset;
        const adjustedDays = `${minDays}-${maxDays}`;
       
        generatedRoutes.push({
            name: carrier.name.replace("欧洲", originName),
            type: carrier.type,
            priceRMB: finalPriceRMB,
            priceEUR: finalPriceEUR,
            days: adjustedDays,
            safety: carrier.type === "官方邮政" ? 85 : carrier.safety,
            chargeWeight: totalWeight,
            isVolumetric: false,
            tag: carrier.type === "华人快递" ? `${carrier.tag} (包含分箱关税)` : carrier.tag,
            tagClass: carrier.tagClass
        });
    });
   
    document.getElementById('sort-controls-bar').classList.remove('hide');
    document.getElementById('results-subtitle').textContent = `已为您从 ${originName} (${region.name}地区) 匹配到 ${generatedRoutes.length} 条发往中国的快递渠道（已计入关税与分箱优化）`;
    renderRoutesList();
}

// ==========================================================================
// SECURE ID WATERMARK CANVAS ENGINE
// ==========================================================================
function handleIDUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
   
    document.getElementById('file-info-text').textContent = `${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
   
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadIDImg = new Image();
        uploadIDImg.onload = function() {
            document.getElementById('watermark-controls').classList.remove('hide');
            drawWatermark();
        };
        uploadIDImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawWatermark() {
    if (!uploadIDImg) return;
   
    const canvas = document.getElementById('watermark-canvas');
    const ctx = canvas.getContext('2d');
   
    canvas.width = uploadIDImg.naturalWidth || 800;
    canvas.height = uploadIDImg.naturalHeight || 500;
   
    ctx.drawImage(uploadIDImg, 0, 0, canvas.width, canvas.height);
   
    const text = document.getElementById('watermark-text').value || "仅限中国海关个人进境申报使用";
    ctx.font = `bold ${Math.max(16, Math.floor(canvas.width / 35))}px "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = "rgba(239, 68, 68, 0.28)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
   
    ctx.save();
    ctx.rotate(-20 * Math.PI / 180);
   
    const xSpacing = canvas.width / 2.2;
    const ySpacing = canvas.height / 3.5;
   
    for (let x = -canvas.width; x < canvas.width * 2; x += xSpacing) {
        for (let y = -canvas.height; y < canvas.height * 2; y += ySpacing) {
            ctx.fillText(text, x, y);
        }
    }
   
    ctx.restore();
}

function downloadWatermarkedImage() {
    const canvas = document.getElementById('watermark-canvas');
    const imageURL = canvas.toDataURL("image/png");
   
    const link = document.createElement('a');
    link.href = imageURL;
    link.download = "id_card_watermarked.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================================================
// ROUTE RENDERER & SORTING
// ==========================================================================
function renderRoutesList() {
    const container = document.getElementById('routes-list');
    container.innerHTML = '';
   
    if (generatedRoutes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fa-solid fa-calculator"></i></div>
                <h3>无匹配渠道</h3>
                <p>该货物参数或物品类型暂无合适转运线路。</p>
            </div>
        `;
        return;
    }
   
    generatedRoutes.forEach(route => {
        const card = document.createElement('div');
        card.className = `route-card`;
       
        if (route.tagClass === 'tag-cheapest') card.classList.add('cheapest');
        if (route.tagClass === 'tag-fastest') card.classList.add('fastest');
       
        const priceMain = currentMode === 'c2e'
            ? `¥${route.priceRMB.toFixed(0)}`
            : `${route.priceEUR.toFixed(2)} €`;
           
        const priceSub = currentMode === 'c2e'
            ? `${route.priceEUR.toFixed(1)} €`
            : `约 ¥${route.priceRMB.toFixed(0)}`;
           
        card.innerHTML = `
            ${route.tag ? `<div class="route-tag ${route.tagClass}">${route.tag}</div>` : ''}
           
            <div class="route-main-info">
                <div class="carrier-name">
                    ${route.name}
                    <span class="route-type-badge">${route.type}</span>
                </div>
                <div class="route-meta">
                    <span><i class="fa-solid fa-weight-hanging"></i> 计费重: ${route.chargeWeight.toFixed(2)} kg ${route.isVolumetric ? '(体积重)' : '(实重)'}</span>
                    <span class="route-safety-badge ${route.safety < 95 ? 'warning' : ''}">
                        <i class="fa-solid fa-shield-halved"></i> 清关成功率: ${route.safety}%
                    </span>
                </div>
            </div>
           
            <div class="route-timing-info">
                <div class="delivery-days">${route.days}</div>
                <div class="delivery-days-label">工作日送达</div>
            </div>
           
            <div class="route-pricing-info">
                <div class="route-price">${priceMain}</div>
                <div class="route-price-details">${priceSub}</div>
            </div>
        `;
       
        container.appendChild(card);
    });
}

function sortRoutes(criteria) {
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
   
    if (criteria === 'price') {
        document.getElementById('sort-price').classList.add('active');
        generatedRoutes.sort((a, b) => a.priceRMB - b.priceRMB);
    } else if (criteria === 'time') {
        document.getElementById('sort-time').classList.add('active');
        generatedRoutes.sort((a, b) => {
            const daysA = parseInt(a.days.split('-')[0]) || 999;
            const daysB = parseInt(b.days.split('-')[0]) || 999;
            return daysA - daysB;
        });
    } else if (criteria === 'safety') {
        document.getElementById('sort-safety').classList.add('active');
        generatedRoutes.sort((a, b) => b.safety - a.safety);
    }
   
    renderRoutesList();
} 
