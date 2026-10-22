/**
 * منطق جدول الكميات وإدارة حالة التطبيق
 * أمانة المنطقة الشرقية - الإدارة العامة للإشراف
 */

const BOQApp = (() => {

  const STORAGE_KEYS = {
    PROJECT: "EPM_BOQ_PROJECT_DATA_V1",
    CATALOG: "EPM_BOQ_CATALOG_DATA_V1",
    BOQ_ITEMS: "EPM_BOQ_ITEMS_LIST_V1"
  };

  // State
  let projectInfo = {};
  let catalog = [];
  let boqItems = [];
  let currentActiveSectionFilter = "all";

  function init() {
    loadState();
    bindEvents();
    renderAll();
  }

  function loadState() {
    // 1. Project Info
    const savedProject = localStorage.getItem(STORAGE_KEYS.PROJECT);
    if (savedProject) {
      try {
        projectInfo = JSON.parse(savedProject);
        if (!projectInfo.projectName || 
            projectInfo.projectName.includes("تطوير وتحسين شبكة الطرق") ||
            projectInfo.projectName.includes("مشروع أنسنة وتطوير ممشى")) {
          projectInfo.projectName = DEFAULT_PROJECT_INFO.projectName;
        }
        if (!projectInfo.engineerName || projectInfo.engineerName.includes("عبد الله بن خالد")) {
          projectInfo.engineerName = DEFAULT_PROJECT_INFO.engineerName;
          projectInfo.engineerTitle = DEFAULT_PROJECT_INFO.engineerTitle;
        }
        if (!projectInfo.deliveryLocation || projectInfo.deliveryLocation.includes("الإدارة العامة للإشراف")) {
          projectInfo.deliveryLocation = DEFAULT_PROJECT_INFO.deliveryLocation;
        }
        if (!projectInfo.scopeOfWork || projectInfo.scopeOfWork.includes("شبكات الطرق")) {
          projectInfo.scopeOfWork = DEFAULT_PROJECT_INFO.scopeOfWork;
        }
        if (!projectInfo.excludedWork || projectInfo.excludedWork.includes("الجهد الفائق")) {
          projectInfo.excludedWork = DEFAULT_PROJECT_INFO.excludedWork;
        }
        localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectInfo));
      } catch (e) {
        projectInfo = { ...DEFAULT_PROJECT_INFO };
      }
    } else {
      projectInfo = { ...DEFAULT_PROJECT_INFO };
    }

    const BOQ_DATA_VERSION = "2026_PARKS_TENDER_V1";
    const currentVer = localStorage.getItem("EPM_BOQ_DATA_VERSION");

    // 2. Catalog
    const savedCatalog = localStorage.getItem(STORAGE_KEYS.CATALOG);
    if (savedCatalog && currentVer === BOQ_DATA_VERSION) {
      try {
        catalog = JSON.parse(savedCatalog);
      } catch (e) {
        catalog = JSON.parse(JSON.stringify(DEFAULT_BOQ_CATALOG));
      }
    } else {
      catalog = JSON.parse(JSON.stringify(DEFAULT_BOQ_CATALOG));
      localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalog));
    }

    // 3. BOQ Items
    const savedBoq = localStorage.getItem(STORAGE_KEYS.BOQ_ITEMS);
    if (savedBoq && currentVer === BOQ_DATA_VERSION) {
      try {
        boqItems = JSON.parse(savedBoq);
      } catch (e) {
        boqItems = JSON.parse(JSON.stringify(DEFAULT_INITIAL_BOQ));
      }
    } else {
      boqItems = JSON.parse(JSON.stringify(DEFAULT_INITIAL_BOQ));
      localStorage.setItem(STORAGE_KEYS.BOQ_ITEMS, JSON.stringify(boqItems));
      localStorage.setItem("EPM_BOQ_DATA_VERSION", BOQ_DATA_VERSION);
    }
  }

  function saveProjectInfo(newData) {
    projectInfo = { ...projectInfo, ...newData };
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectInfo));
    updateHeaderSummary();
  }

  function saveCatalog(newCatalog) {
    catalog = newCatalog;
    localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalog));
  }

  function resetCatalogToDefault() {
    catalog = JSON.parse(JSON.stringify(DEFAULT_BOQ_CATALOG));
    saveCatalog(catalog);
    renderCatalogDrawer();
    renderSectionTabs();
  }

  function saveBoqItems() {
    localStorage.setItem(STORAGE_KEYS.BOQ_ITEMS, JSON.stringify(boqItems));
    calculateSummary();
    updateHeaderSummary();
  }

  function bindEvents() {
    // Project Info Form Inputs
    const projectForm = document.getElementById("projectDetailsForm");
    if (projectForm) {
      projectForm.addEventListener("input", (e) => {
        const field = e.target.name;
        if (field) {
          projectInfo[field] = e.target.value;
          localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectInfo));
          updateHeaderSummary();
          if (field === "tenderCost") updateTenderCostHint();
        }
      });
    }

    // Catalog Search
    const searchInput = document.getElementById("catalogSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        renderCatalogDrawer(e.target.value.trim());
      });
    }

    // Navigation Stepper Tabs
    const stepButtons = document.querySelectorAll(".step-btn");
    stepButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetScreen = btn.dataset.screen;
        switchScreen(targetScreen);
      });
    });

    // Finish Project / Open Export Modal
    const finishBtns = document.querySelectorAll(".btn-finish-project");
    finishBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        openExportModal();
      });
    });

    // Close Export Modal
    const closeExportBtn = document.getElementById("closeExportModalBtn");
    if (closeExportBtn) {
      closeExportBtn.addEventListener("click", closeExportModal);
    }
  }

  function switchScreen(screenId) {
    document.querySelectorAll(".screen-panel").forEach(panel => {
      panel.classList.remove("active");
    });
    document.querySelectorAll(".step-btn").forEach(btn => {
      btn.classList.remove("active");
    });

    const activePanel = document.getElementById(screenId);
    if (activePanel) activePanel.classList.add("active");

    const activeBtn = document.querySelector(`.step-btn[data-screen="${screenId}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderAll() {
    fillProjectForm();
    renderCatalogDrawer();
    renderSectionTabs();
    renderBoqTable();
    calculateSummary();
    updateHeaderSummary();
  }

  function fillProjectForm() {
    const fields = [
      "sector", "projectName", "projectNumber", "versionNumber", "releaseDate", "releaseCity",
      "tenderCost", "paymentMethod", "municipality", "department",
      "region", "city", "district", "location", "coordinates", "durationMonths",
      "engineerName", "engineerTitle", "engineerPhone", "engineerEmail", "deliveryLocation",
      "dateConfirmParticipation", "dateInquiries", "dateInquiryResponse", "dateSiteVisit",
      "dateSubmission", "dateOpening", "dateAward", "dateCommencement",
      "bidBondPercent", "bidValidityDays", "finalBondPercent", "submissionMethod", "delayPenaltyMax",
      "scopeOfWork", "excludedWork", "vatRate"
    ];

    fields.forEach(field => {
      const el = document.getElementById(`proj_${field}`);
      if (el && projectInfo[field] !== undefined) {
        el.value = projectInfo[field];
      }
    });

    updateSectorCardVisuals();
    updateTenderCostHint();
  }

  function selectSector(sectorKey) {
    projectInfo.sector = sectorKey;
    const hiddenInput = document.getElementById("proj_sector");
    if (hiddenInput) hiddenInput.value = sectorKey;
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectInfo));
    updateSectorCardVisuals();
    
    const titles = {
      roads: "مشاريع الطرق والسلامة المرورية",
      buildings: "مشاريع المباني والمرافق البلدية",
      stormwater: "مشاريع تصريف مياه الأمطار ودرء أخطار السيول",
      bridges: "مشاريع الجسور والأنفاق الإنشائية"
    };
    showToast(`تم تعيين قطاع المنافسة: ${titles[sectorKey] || sectorKey}`);
  }

  function updateSectorCardVisuals() {
    const currentSector = projectInfo.sector || "roads";
    document.querySelectorAll(".sector-card").forEach(card => {
      const sec = card.dataset.sector;
      card.classList.toggle("active", sec === currentSector);
    });
  }

  function updateTenderCostHint() {
    const hint = document.getElementById("tenderCostTafqeetHint");
    if (!hint) return;
    const cost = Number(projectInfo.tenderCost || 0);
    if (cost <= 0) {
      hint.textContent = "مجاناً بدون مقابل مالي";
    } else if (typeof Tafqeet !== "undefined") {
      hint.textContent = Tafqeet.convertCurrency(cost);
    }
  }

  // Render Catalog Drawer Items
  function renderCatalogDrawer(filterText = "") {
    const listEl = document.getElementById("catalogDrawerList");
    if (!listEl) return;

    let html = "";
    const query = filterText.toLowerCase();

    catalog.forEach(sec => {
      const filteredItems = sec.items.filter(item => {
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          item.code.toLowerCase().includes(query)
        );
      });

      if (filteredItems.length === 0) return;

      html += `
        <div class="catalog-section-group">
          <div class="catalog-section-label">
            <span>${sec.name}</span>
            <span style="font-size:0.75rem;">${filteredItems.length}</span>
          </div>
          ${filteredItems.map(item => `
            <div class="catalog-item-card" onclick="BOQApp.addItemToBoq('${sec.id}', '${item.id}')" title="انقر لإضافة البند إلى جدول الكميات">
              <div class="catalog-item-header">
                <span class="catalog-item-code">${item.code}</span>
                <span class="catalog-item-price">${Number(item.estimatedPrice || 0).toLocaleString()} ر.س / ${item.unit}</span>
              </div>
              <div class="catalog-item-title">${item.name}</div>
              <div class="catalog-item-desc">${item.description || ""}</div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:0.74rem;">
                <span style="color:#005a36; font-weight:700;"><i class="fas fa-plus-circle"></i> إضافة للجدول</span>
                <span style="color:#64748b; font-family:monospace;">${item.structuralCode || ''}</span>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    });

    if (!html) {
      html = `<div style="text-align: center; color: #94a3b8; padding: 2rem 1rem; font-size: 0.88rem;">لا توجد بنود مطابقة للبحث</div>`;
    }

    listEl.innerHTML = html;
  }

  // Render Section Tabs
  function renderSectionTabs() {
    const tabsContainer = document.getElementById("boqSectionTabs");
    if (!tabsContainer) return;

    let html = `
      <button class="sec-tab-btn ${currentActiveSectionFilter === 'all' ? 'active' : ''}" onclick="BOQApp.filterSection('all')">
        <span>عرض كافة الأقسام</span>
        <span class="sec-count-badge">${boqItems.length}</span>
      </button>
    `;

    catalog.forEach(sec => {
      const count = boqItems.filter(i => i.sectionId === sec.id).length;
      html += `
        <button class="sec-tab-btn ${currentActiveSectionFilter === sec.id ? 'active' : ''}" onclick="BOQApp.filterSection('${sec.id}')">
          <span>${sec.name}</span>
          <span class="sec-count-badge">${count}</span>
        </button>
      `;
    });

    tabsContainer.innerHTML = html;
  }

  function filterSection(secId) {
    currentActiveSectionFilter = secId;
    renderSectionTabs();
    renderBoqTable();
  }

  // Add Item to BOQ from Catalog
  function addItemToBoq(sectionId, itemId) {
    const sec = catalog.find(s => s.id === sectionId);
    if (!sec) return;
    const item = sec.items.find(i => i.id === itemId);
    if (!item) return;

    // Determine hierarchical item number
    const secItems = boqItems.filter(i => i.sectionId === sectionId);
    const secPrefix = sec.codePrefix || (catalog.indexOf(sec) + 1);
    const itemIndex = secItems.length + 1;
    const itemNo = `${secPrefix}-${itemIndex}`;

    const newBoqItem = {
      id: "boq-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      catalogId: item.id,
      sectionId: sec.id,
      itemNo: itemNo,
      name: item.name,
      description: item.description,
      selectedSpec: (item.specs && item.specs.length > 0) ? item.specs[0] : "",
      customSpec: "",
      unit: item.unit,
      quantity: 1,
      unitPrice: item.estimatedPrice || 0,
      materialSource: item.defaultSource || "محلي",
      structuralCode: item.structuralCode || ""
    };

    boqItems.push(newBoqItem);
    saveBoqItems();
    renderSectionTabs();
    renderBoqTable();
    showToast(`تمت إضافة البند "${item.name}" إلى جدول الكميات`);
  }

  // Render The Interactive BOQ Table
  function renderBoqTable() {
    const tbody = document.getElementById("boqTableBody");
    if (!tbody) return;

    if (boqItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 3.5rem 1rem;">
            <div style="font-size: 2.2rem; color: #cbd5e1; margin-bottom: 0.75rem;"><i class="fas fa-clipboard-list"></i></div>
            <h4 style="color: #64748b; font-size: 1.1rem; margin-bottom: 0.5rem;">جدول الكميات فارغ حالياً</h4>
            <p style="color: #94a3b8; font-size: 0.88rem;">يمكنك اختيار وإضافة البنود المطلوبة من القائمة الجانبية المعتمدة على اليمين</p>
          </td>
        </tr>
      `;
      return;
    }

    let html = "";

    // Iterate through sections
    catalog.forEach((sec, sIdx) => {
      if (currentActiveSectionFilter !== "all" && currentActiveSectionFilter !== sec.id) {
        return;
      }

      const secItems = boqItems.filter(i => i.sectionId === sec.id);
      if (secItems.length === 0 && currentActiveSectionFilter !== "all") {
        return;
      }

      // Section Header Banner Row
      html += `
        <tr class="tr-section-header">
          <td colspan="10">
            <div class="section-banner">
              <div style="display:flex; align-items:center; gap:0.6rem;">
                <span class="badge-tag" style="background:#005a36; color:#fff; border:none;">قسم ${sec.codePrefix || (sIdx + 1)}</span>
                <span>${sec.name}</span>
                <span style="font-size: 0.82rem; color: #64748b; font-weight: normal;">(${secItems.length} بنود مدرجة)</span>
              </div>
              <button class="btn btn-outline-primary btn-sm" onclick="BOQApp.promptAddCustomItem('${sec.id}')" style="background:#fff;">
                <i class="fas fa-plus"></i> إضافة بند مخصص في هذا القسم
              </button>
            </div>
          </td>
        </tr>
      `;

      if (secItems.length === 0) {
        html += `
          <tr>
            <td colspan="10" style="text-align:center; padding: 1.25rem; color:#94a3b8; font-size:0.84rem;">
              لا توجد بنود مضافة في هذا القسم حتى الآن. اختر بنوداً من القائمة الجانبية أو اضغط "إضافة بند مخصص".
            </td>
          </tr>
        `;
        return;
      }

      secItems.forEach((item, itemIdx) => {
        const catItem = (sec.items || []).find(ci => ci.id === item.catalogId) || {};
        const availableSpecs = catItem.specs || [];
        const qty = Number(item.quantity || 0);
        const price = Number(item.unitPrice || 0);
        const total = qty * price;
        const tafqeet = Tafqeet.convertCurrency(total);

        html += `
          <tr data-boq-id="${item.id}">
            <!-- 1. رقم البند -->
            <td class="item-no-cell">
              <input type="text" class="form-control" style="padding: 0.3rem; text-align: center; font-weight: 800; font-size: 0.85rem;" 
                value="${item.itemNo || (sec.codePrefix + '-' + (itemIdx + 1))}" 
                onchange="BOQApp.updateItemField('${item.id}', 'itemNo', this.value)">
            </td>

            <!-- 2. وصف الأعمال والمواصفات -->
            <td class="item-desc-cell">
              <div class="item-title-text">${item.name}</div>
              <div style="font-size: 0.78rem; color: #64748b; line-height: 1.4;">${item.description || ''}</div>
              
              <div class="item-spec-box">
                <!-- Dropdown للمواصفات إن وجدت -->
                ${availableSpecs.length > 0 ? `
                  <select class="spec-selector" onchange="BOQApp.handleSpecChange('${item.id}', this.value)">
                    ${availableSpecs.map(spec => `
                      <option value="${spec}" ${item.selectedSpec === spec ? 'selected' : ''}>${spec}</option>
                    `).join("")}
                    <option value="__custom__" ${item.customSpec ? 'selected' : ''}>★ كتابة مواصفة فنية خاصة / إضافية...</option>
                  </select>
                ` : ''}

                <!-- Text Area للمواصفة الخاصة إذا كان مفعلاً أو لا توجد خيارات -->
                <div id="customSpecBox_${item.id}" style="${(item.customSpec || availableSpecs.length === 0) ? 'display:block;' : 'display:none;'}">
                  <textarea class="custom-spec-area" placeholder="اكتب المواصفة الفنية التفصيلية الخاصة هنا..." 
                    onchange="BOQApp.updateItemField('${item.id}', 'customSpec', this.value)">${item.customSpec || ''}</textarea>
                </div>
              </div>
            </td>

            <!-- 3. الوحدة -->
            <td class="unit-cell">
              <input type="text" class="form-control" style="padding: 0.3rem; text-align: center; font-size: 0.85rem;" 
                value="${item.unit}" 
                onchange="BOQApp.updateItemField('${item.id}', 'unit', this.value)">
            </td>

            <!-- 4. الكمية -->
            <td>
              <input type="number" min="0" step="any" class="qty-input" 
                value="${item.quantity}" 
                oninput="BOQApp.updateQtyPrice('${item.id}', this.value, null)">
            </td>

            <!-- 5. السعر: الإفرادي -->
            <td>
              <input type="number" min="0" step="any" class="price-input" 
                value="${item.unitPrice}" 
                oninput="BOQApp.updateQtyPrice('${item.id}', null, this.value)">
            </td>

            <!-- 5. السعر: الإجمالي -->
            <td class="total-cell" id="itemTotal_${item.id}">
              ${formatCurrency(total)}
            </td>

            <!-- 5. السعر: الإجمالي كتابةً (Tafqeet) -->
            <td class="tafqeet-cell" id="itemTafqeet_${item.id}">
              ${tafqeet}
            </td>

            <!-- 6. مصدر المواد -->
            <td>
              <select class="source-select ${item.materialSource === 'أجنبي' ? 'source-foreign' : 'source-local'}" 
                onchange="BOQApp.updateSource('${item.id}', this)">
                <option value="محلي" ${item.materialSource === 'محلي' ? 'selected' : ''}>محلي</option>
                <option value="أجنبي" ${item.materialSource === 'أجنبي' ? 'selected' : ''}>أجنبي</option>
              </select>
            </td>

            <!-- 7. الرمز الإنشائي -->
            <td class="code-cell">
              <input type="text" class="form-control" style="padding: 0.3rem; text-align: center; font-family: monospace; font-size: 0.8rem;" 
                value="${item.structuralCode || ''}" 
                onchange="BOQApp.updateItemField('${item.id}', 'structuralCode', this.value)">
            </td>

            <!-- إجراءات -->
            <td class="actions-cell">
              <div style="display:flex; gap:0.25rem; justify-content:center;">
                <button class="btn btn-secondary btn-icon" title="تكرار البند" onclick="BOQApp.duplicateBoqItem('${item.id}')" style="width:28px; height:28px; font-size:0.75rem;">
                  <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-danger btn-icon" title="حذف من جدول الكميات" onclick="BOQApp.removeBoqItem('${item.id}')" style="width:28px; height:28px; font-size:0.75rem;">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    });

    tbody.innerHTML = html;
  }

  function handleSpecChange(itemId, value) {
    const item = boqItems.find(i => i.id === itemId);
    if (!item) return;

    const customBox = document.getElementById(`customSpecBox_${itemId}`);
    if (value === "__custom__") {
      item.selectedSpec = "";
      if (customBox) customBox.style.display = "block";
    } else {
      item.selectedSpec = value;
      if (customBox) customBox.style.display = "none";
    }
    saveBoqItems();
  }

  function updateItemField(itemId, field, value) {
    const item = boqItems.find(i => i.id === itemId);
    if (!item) return;
    item[field] = value;
    saveBoqItems();
  }

  function updateSource(itemId, selectEl) {
    const item = boqItems.find(i => i.id === itemId);
    if (!item) return;
    item.materialSource = selectEl.value;
    selectEl.className = `source-select ${selectEl.value === 'أجنبي' ? 'source-foreign' : 'source-local'}`;
    saveBoqItems();
  }

  function updateQtyPrice(itemId, newQty, newPrice) {
    const item = boqItems.find(i => i.id === itemId);
    if (!item) return;

    if (newQty !== null) item.quantity = parseFloat(newQty) || 0;
    if (newPrice !== null) item.unitPrice = parseFloat(newPrice) || 0;

    const total = item.quantity * item.unitPrice;
    const tafqeet = Tafqeet.convertCurrency(total);

    const totalCell = document.getElementById(`itemTotal_${itemId}`);
    if (totalCell) totalCell.textContent = formatCurrency(total);

    const tafqeetCell = document.getElementById(`itemTafqeet_${itemId}`);
    if (tafqeetCell) tafqeetCell.textContent = tafqeet;

    saveBoqItems();
  }

  function duplicateBoqItem(itemId) {
    const item = boqItems.find(i => i.id === itemId);
    if (!item) return;

    const copy = {
      ...item,
      id: "boq-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      itemNo: item.itemNo + "-مكرر"
    };

    const index = boqItems.findIndex(i => i.id === itemId);
    boqItems.splice(index + 1, 0, copy);
    saveBoqItems();
    renderBoqTable();
    showToast("تم تكرار البند بنجاح.");
  }

  function removeBoqItem(itemId) {
    boqItems = boqItems.filter(i => i.id !== itemId);
    saveBoqItems();
    renderSectionTabs();
    renderBoqTable();
    showToast("تم حذف البند من جدول الكميات.");
  }

  function promptAddCustomItem(sectionId) {
    const title = prompt("أدخل اسم البند المخصص الجديد:");
    if (!title || !title.trim()) return;

    const unit = prompt("أدخل الوحدة (مثل: م2, م3, م.ط, عدد, مقطوعية):", "م2") || "م2";
    const qty = parseFloat(prompt("أدخل الكمية:", "100")) || 1;
    const price = parseFloat(prompt("أدخل السعر التقديري للإفرادي (ر.س):", "50")) || 0;

    const sec = catalog.find(s => s.id === sectionId);
    const secItems = boqItems.filter(i => i.sectionId === sectionId);
    const secPrefix = sec ? sec.codePrefix : "01";
    const itemNo = `${secPrefix}-${secItems.length + 1}`;

    const newItem = {
      id: "boq-custom-" + Date.now(),
      catalogId: null,
      sectionId: sectionId,
      itemNo: itemNo,
      name: title.trim(),
      description: "بند مخصص إضافي للمشروع وفق توجيهات مهندس الإشراف",
      selectedSpec: "",
      customSpec: "طبقاً لمواصفات العقد واعتماد المهندس المشرف",
      unit: unit.trim(),
      quantity: qty,
      unitPrice: price,
      materialSource: "محلي",
      structuralCode: "CSI-SPECIAL"
    };

    boqItems.push(newItem);
    saveBoqItems();
    renderSectionTabs();
    renderBoqTable();
    showToast("تمت إضافة البند المخصص إلى جدول الكميات بنجاح.");
  }

  // Summary Calculations
  function calculateSummary() {
    let subtotal = 0;
    let localCount = 0;
    let foreignCount = 0;
    let localAmount = 0;

    boqItems.forEach(item => {
      const q = Number(item.quantity || 0);
      const p = Number(item.unitPrice || 0);
      const rowTot = q * p;
      subtotal += rowTot;

      if (item.materialSource === "محلي") {
        localCount++;
        localAmount += rowTot;
      } else {
        foreignCount++;
      }
    });

    const vatRate = Number(projectInfo.vatRate || 15);
    const vatAmount = subtotal * (vatRate / 100);
    const grandTotal = subtotal + vatAmount;
    const tafqeetGrandTotal = Tafqeet.convertCurrency(grandTotal);

    const localRatio = subtotal > 0 ? Math.round((localAmount / subtotal) * 100) : 100;

    // Update DOM widgets
    const subtotalEl = document.getElementById("summarySubtotal");
    if (subtotalEl) subtotalEl.textContent = `${formatCurrency(subtotal)} ر.س`;

    const vatEl = document.getElementById("summaryVat");
    if (vatEl) vatEl.textContent = `${formatCurrency(vatAmount)} ر.س`;

    const grandTotalEl = document.getElementById("summaryGrandTotal");
    if (grandTotalEl) grandTotalEl.textContent = `${formatCurrency(grandTotal)} ر.س`;

    const tafqeetEl = document.getElementById("summaryTafqeetText");
    if (tafqeetEl) tafqeetEl.textContent = tafqeetGrandTotal;

    const itemsCountEl = document.getElementById("summaryItemsCount");
    if (itemsCountEl) itemsCountEl.textContent = boqItems.length;

    const localRatioEl = document.getElementById("summaryLocalRatio");
    if (localRatioEl) localRatioEl.textContent = `${localRatio}%`;

    return {
      subtotal,
      vatAmount,
      grandTotal,
      tafqeetGrandTotal,
      localRatio,
      itemsCount: boqItems.length
    };
  }

  function updateHeaderSummary() {
    const summary = calculateSummary();
    const titleEl = document.getElementById("headerProjectName");
    if (titleEl) titleEl.textContent = projectInfo.projectName || "مشروع جديد";

    const topTotalEl = document.getElementById("topBarTotal");
    if (topTotalEl) topTotalEl.textContent = `${formatCurrency(summary.grandTotal)} ر.س`;

    const topItemsEl = document.getElementById("topBarItemsCount");
    if (topItemsEl) topItemsEl.textContent = boqItems.length;
  }

  function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function openExportModal() {
    const summary = calculateSummary();
    document.getElementById("exportModalProjectTitle").textContent = projectInfo.projectName || "";
    document.getElementById("exportModalItemsSummary").textContent = `${boqItems.length} بنود مدرجة | القيمة الإجمالية: ${formatCurrency(summary.grandTotal)} ر.س`;
    document.getElementById("exportModal").classList.add("active");
  }

  function closeExportModal() {
    document.getElementById("exportModal").classList.remove("active");
  }

  function showToast(message) {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(15px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  return {
    init,
    getProjectInfo: () => projectInfo,
    getCatalog: () => catalog,
    getBoqItems: () => boqItems,
    saveCatalog,
    resetCatalogToDefault,
    switchScreen,
    addItemToBoq,
    filterSection,
    handleSpecChange,
    updateItemField,
    updateSource,
    updateQtyPrice,
    duplicateBoqItem,
    removeBoqItem,
    promptAddCustomItem,
    calculateSummary,
    renderCatalogDrawer,
    renderSectionTabs,
    renderBoqTable,
    openExportModal,
    closeExportModal,
    selectSector,
    showToast
  };

})();
