/**
 * منطق جدول الكميات وإدارة حالة التطبيق
 * أمانة المنطقة الشرقية - الإدارة العامة للإشراف
 */

const BOQApp = (() => {

  const STORAGE_KEYS = {
    PROJECT: "EPM_BOQ_PROJECT_DATA_V1",
    CATALOG: "EPM_BOQ_CATALOG_DATA_V1",
    BOQ_ITEMS: "EPM_BOQ_ITEMS_LIST_V1",
    ROADS_CATALOG: "EPM_BOQ_ROADS_CATALOG_V1",
    ROADS_BOQ_ITEMS: "EPM_BOQ_ROADS_ITEMS_V1"
  };

  // State
  let projectInfo = {};
  let catalog = [];
  let boqItems = [];
  let currentActiveSectionFilter = "all";
  let allowedSector = "all";

  const DEPT_TITLES = {
    buildings: "إدارة الإشراف على المباني والمرافق البلدية",
    roads: "إدارة الإشراف على مشاريع الطرق",
    stormwater: "إدارة الإشراف على مشاريع تصريف مياه الأمطار",
    bridges: "إدارة الإشراف على مشاريع الجسور والأنفاق"
  };

  function init() {
    try {
      const rawSession = sessionStorage.getItem("EPM_BOQ_SESSION_V1");
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (parsed && parsed.allowedSector) {
          allowedSector = parsed.allowedSector;
        }
      }
    } catch (e) {}

    loadState();
    if (allowedSector && allowedSector !== "all" && projectInfo.sector !== allowedSector) {
      applySectorProjectDefaults(allowedSector);
      loadSectorCatalogAndItems(allowedSector);
    }
    bindEvents();
    renderAll();
  }

  function isRoadsSector(sec = projectInfo.sector) {
    return sec === "roads";
  }

  function loadSectorCatalogAndItems(sectorKey) {
    const isRoads = isRoadsSector(sectorKey);
    const BOQ_DATA_VERSION = "2026_PARKS_EMPTY_START_V2";
    const ROADS_DATA_VERSION = "2026_ROADS_EMPTY_START_V2";

    if (isRoads) {
      const currentRoadsVer = localStorage.getItem("EPM_ROADS_DATA_VERSION");
      const defaultRoadsCatalog = typeof ROADS_BOQ_CATALOG !== "undefined" ? ROADS_BOQ_CATALOG : DEFAULT_BOQ_CATALOG;

      const savedRoadsCat = localStorage.getItem(STORAGE_KEYS.ROADS_CATALOG);
      if (savedRoadsCat && currentRoadsVer === ROADS_DATA_VERSION) {
        try {
          catalog = JSON.parse(savedRoadsCat);
        } catch (e) {
          catalog = JSON.parse(JSON.stringify(defaultRoadsCatalog));
        }
      } else {
        catalog = JSON.parse(JSON.stringify(defaultRoadsCatalog));
        localStorage.setItem(STORAGE_KEYS.ROADS_CATALOG, JSON.stringify(catalog));
      }

      const savedRoadsBoq = localStorage.getItem(STORAGE_KEYS.ROADS_BOQ_ITEMS);
      if (savedRoadsBoq && currentRoadsVer === ROADS_DATA_VERSION) {
        try {
          boqItems = JSON.parse(savedRoadsBoq);
        } catch (e) {
          boqItems = [];
        }
      } else {
        boqItems = [];
        localStorage.setItem(STORAGE_KEYS.ROADS_BOQ_ITEMS, JSON.stringify(boqItems));
        localStorage.setItem("EPM_ROADS_DATA_VERSION", ROADS_DATA_VERSION);
      }
    } else {
      const currentVer = localStorage.getItem("EPM_BOQ_DATA_VERSION");

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

      const savedBoq = localStorage.getItem(STORAGE_KEYS.BOQ_ITEMS);
      if (savedBoq && currentVer === BOQ_DATA_VERSION) {
        try {
          boqItems = JSON.parse(savedBoq);
        } catch (e) {
          boqItems = [];
        }
      } else {
        boqItems = [];
        localStorage.setItem(STORAGE_KEYS.BOQ_ITEMS, JSON.stringify(boqItems));
        localStorage.setItem("EPM_BOQ_DATA_VERSION", BOQ_DATA_VERSION);
      }
    }
  }

  function getSectorDefaultProjectInfo(sectorKey) {
    if (sectorKey === "roads" && typeof ROADS_DEFAULT_PROJECT_INFO !== "undefined") {
      return ROADS_DEFAULT_PROJECT_INFO;
    }
    if (sectorKey === "stormwater" && typeof STORMWATER_DEFAULT_PROJECT_INFO !== "undefined") {
      return STORMWATER_DEFAULT_PROJECT_INFO;
    }
    if (sectorKey === "bridges" && typeof BRIDGES_DEFAULT_PROJECT_INFO !== "undefined") {
      return BRIDGES_DEFAULT_PROJECT_INFO;
    }
    return DEFAULT_PROJECT_INFO;
  }

  function applySectorProjectDefaults(sectorKey) {
    const targetSector = sectorKey || "buildings";
    const defaults = getSectorDefaultProjectInfo(targetSector);
    projectInfo = {
      ...projectInfo,
      ...defaults,
      sector: targetSector
    };
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectInfo));
  }

  function loadState() {
    // 1. Project Info
    const savedProject = localStorage.getItem(STORAGE_KEYS.PROJECT);
    if (savedProject) {
      try {
        projectInfo = JSON.parse(savedProject);
        const sec = projectInfo.sector || "buildings";
        const defaults = getSectorDefaultProjectInfo(sec);

        if (
          !projectInfo.projectName ||
          (sec === "roads" && !projectInfo.engineerName?.includes("فايز")) ||
          (sec === "stormwater" && !projectInfo.engineerName?.includes("مصطفى")) ||
          (sec === "bridges" && !projectInfo.engineerName?.includes("تركي")) ||
          (sec === "buildings" && !projectInfo.engineerName?.includes("سعيد")) ||
          projectInfo.municipality?.includes("بلدية شرق الدمام") ||
          projectInfo.district?.includes("الشاطئ")
        ) {
          projectInfo = { ...projectInfo, ...defaults, sector: sec };
        }
        localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectInfo));
      } catch (e) {
        projectInfo = { ...DEFAULT_PROJECT_INFO };
      }
    } else {
      projectInfo = { ...DEFAULT_PROJECT_INFO };
    }

    // 2. Load Catalog & BOQ Items based on active sector
    loadSectorCatalogAndItems(projectInfo.sector || "buildings");
  }

  function saveProjectInfo(newData) {
    projectInfo = { ...projectInfo, ...newData };
    localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectInfo));
    updateHeaderSummary();
  }

  function saveCatalog(newCatalog) {
    catalog = newCatalog;
    const key = isRoadsSector() ? STORAGE_KEYS.ROADS_CATALOG : STORAGE_KEYS.CATALOG;
    localStorage.setItem(key, JSON.stringify(catalog));
  }

  function resetCatalogToDefault() {
    if (isRoadsSector() && typeof ROADS_BOQ_CATALOG !== "undefined") {
      catalog = JSON.parse(JSON.stringify(ROADS_BOQ_CATALOG));
    } else {
      catalog = JSON.parse(JSON.stringify(DEFAULT_BOQ_CATALOG));
    }
    boqItems = [];
    saveBoqItems();
    saveCatalog(catalog);
    renderCatalogDrawer();
    renderSectionTabs();
    renderBoqTable();
  }

  function clearBoqTable() {
    boqItems = [];
    currentActiveSectionFilter = "all";
    saveBoqItems();
    renderCatalogDrawer();
    renderSectionTabs();
    renderBoqTable();
    showToast("تم تفريغ جدول الكميات لبدء تجربة بناء جديدة.");
  }

  function saveBoqItems() {
    const key = isRoadsSector() ? STORAGE_KEYS.ROADS_BOQ_ITEMS : STORAGE_KEYS.BOQ_ITEMS;
    localStorage.setItem(key, JSON.stringify(boqItems));
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

  function applySessionPermissions(session) {
    allowedSector = (session && session.allowedSector) ? session.allowedSector : "all";
    if (allowedSector !== "all") {
      selectSector(allowedSector, true);
    } else {
      updateSectorCardVisuals();
    }
  }

  function togglePriceConfidentiality() {
    const isMasked = document.body.classList.toggle("prices-masked");
    const btn = document.getElementById("togglePriceMaskBtn");
    const lbl = document.getElementById("togglePriceMaskLabel");
    if (btn) {
      btn.classList.toggle("active", isMasked);
      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = isMasked ? "fas fa-eye" : "fas fa-eye-slash";
      }
    }
    if (lbl) {
      lbl.textContent = isMasked
        ? "إظهار الأسعار التقديرية السرية"
        : "إخفاء الأسعار التقديرية (****)";
    }
    showToast(isMasked
      ? "🔒 تم تفعيل وضع السرية وإخفاء الأسعار التقديرية."
      : "🔓 تم إظهار الأسعار التقديرية للمختص المصرح له.");
  }

  function selectSector(sectorKey, forceAllow = false) {
    if (!forceAllow && allowedSector && allowedSector !== "all" && sectorKey !== allowedSector) {
      const authDept = DEPT_TITLES[allowedSector] || allowedSector;
      showToast(`⛔ غير مصرح: حسابك مخوّل فقط لـ (${authDept}). بيانات وأسعار القطاعات الأخرى سرية وفق نظام م/128.`);
      return;
    }

    const prevSector = projectInfo.sector;
    applySectorProjectDefaults(sectorKey);
    const hiddenInput = document.getElementById("proj_sector");
    if (hiddenInput) hiddenInput.value = sectorKey;
    fillProjectForm();
    updateHeaderSummary();

    // Load sector-specific BOQ Catalog and BOQ Items (Roads vs General)
    if (isRoadsSector(prevSector) !== isRoadsSector(sectorKey) || catalog.length === 0) {
      loadSectorCatalogAndItems(sectorKey);
      currentActiveSectionFilter = "all";
      renderCatalogDrawer();
      renderSectionTabs();
      renderBoqTable();
      calculateSummary();
      updateHeaderSummary();
      if (typeof AdminPanel !== "undefined" && AdminPanel.init) {
        AdminPanel.init();
      }
    }

    if (!forceAllow) {
      const titles = {
        roads: "مشاريع الطرق (نموذج تشغيل وصيانة الطرق - 5 تصنيفات)",
        buildings: "مشاريع المباني والمرافق البلدية (نموذج إنشاءات عامة)",
        stormwater: "مشاريع تصريف مياه الأمطار ودرء أخطار السيول",
        bridges: "مشاريع الجسور والأنفاق الإنشائية"
      };
      showToast(`تم تعيين قطاع المنافسة: ${titles[sectorKey] || sectorKey}`);
    }
  }

  function updateSectorCardVisuals() {
    const currentSector = projectInfo.sector || "buildings";
    document.querySelectorAll(".sector-card").forEach(card => {
      const sec = card.dataset.sector;
      const isLocked = Boolean(allowedSector && allowedSector !== "all" && sec !== allowedSector);
      card.classList.toggle("active", sec === currentSector);
      card.classList.toggle("locked-sector", isLocked);
    });

    // Update Sector Access Status Badge in Screen 1
    const accessBadge = document.getElementById("sectorAccessStatusBadge");
    if (accessBadge) {
      if (allowedSector === "all") {
        accessBadge.classList.add("executive");
        accessBadge.innerHTML = `<i class="fas fa-crown"></i> صلاحية شاملة — مسموح بالتنقل بين القطاعات الأربعة`;
      } else {
        accessBadge.classList.remove("executive");
        const deptName = DEPT_TITLES[currentSector] || "القطاع المحدد";
        accessBadge.innerHTML = `<i class="fas fa-lock"></i> مسار معزول أمنياً — مخصص لـ (${deptName})`;
      }
    }

    // Update Confidentiality Text in Screen 2
    const confTextEl = document.getElementById("boqConfidentialityText");
    if (confTextEl) {
      const deptName = DEPT_TITLES[currentSector] || "الإدارة المختصة";
      confTextEl.innerHTML = `الأسعار التقديرية في هذا الجدول سرية ومقيدة لمنسوبي <strong>${deptName}</strong> فقط وفق نظام المنافسات والمشتريات الحكومية (م/128).`;
    }

    const isRoads = isRoadsSector(currentSector);

    // Update RFP Header Title in Screen 1
    const rfpTitleTextEl = document.getElementById("rfpHeaderTitleText");
    if (rfpTitleTextEl) {
      rfpTitleTextEl.textContent = isRoads
        ? "إعداد وثائق كراسة الطرح (النموذج المعتمد - تشغيل وصيانة الطرق)"
        : "إعداد وثائق كراسة الطرح (النموذج المعتمد - إنشاءات عامة)";
    }

    // Update Official PDF Reference Link & Badge
    const rfpPdfLink = document.getElementById("rfpOfficialPdfLink");
    const rfpPdfLabel = document.getElementById("rfpOfficialPdfLabel");
    if (rfpPdfLink) {
      rfpPdfLink.href = isRoads
        ? "نموذج كراسة الشروط والمواصفات (تشغيل وصيانة الطرق) (1).pdf"
        : "نموذج كراسة الشروط والمواصفات (إنشاءات عامة).pdf";
    }
    if (rfpPdfLabel) {
      rfpPdfLabel.textContent = isRoads
        ? "نموذج الكراسة: تشغيل وصيانة الطرق"
        : "نموذج الكراسة: إنشاءات عامة";
    }

    // Update Catalog Drawer Header in Screen 2
    const catalogTitleEl = document.getElementById("catalogDrawerHeaderTitle");
    if (catalogTitleEl) {
      catalogTitleEl.innerHTML = isRoads
        ? '<i class="fas fa-road"></i> دليل بنود صيانة الطرق'
        : '<i class="fas fa-book-open"></i> دليل بنود الأنسنة';
    }
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
    const searchInput = document.getElementById("catalogSearchInput");
    const effectiveFilter = filterText !== "" ? filterText : (searchInput ? searchInput.value.trim() : "");
    const query = effectiveFilter.toLowerCase();

    catalog.forEach(sec => {
      if (currentActiveSectionFilter !== "all" && currentActiveSectionFilter !== sec.id && !query) {
        return;
      }

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
          ${filteredItems.map(item => {
            const isAdded = boqItems.some(
              b => b.catalogId === item.id || (item.code && b.itemNo === item.code && b.sectionId === sec.id)
            );
            return `
            <div class="catalog-item-card ${isAdded ? 'catalog-item-added' : ''}" onclick="BOQApp.addItemToBoq('${sec.id}', '${item.id}')" title="${isAdded ? 'تمت إضافة هذا البند من قبل في الجدول' : 'انقر لإضافة البند إلى جدول الكميات'}">
              <div class="catalog-item-header">
                <span class="catalog-item-code">${item.code}</span>
                <span class="catalog-item-price">${Number(item.estimatedPrice || 0).toLocaleString()} ر.س / ${item.unit}</span>
              </div>
              <div class="catalog-item-title">${item.name}</div>
              <div class="catalog-item-desc">${item.description || ""}</div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; font-size:0.74rem;">
                ${isAdded
                  ? `<span style="color:#b45309; font-weight:700;"><i class="fas fa-check-circle"></i> مُضاف بالجدول</span>`
                  : `<span style="color:#005a36; font-weight:700;"><i class="fas fa-plus-circle"></i> إضافة للجدول</span>`
                }
                <span style="color:#64748b; font-family:monospace;">${item.structuralCode || ''}</span>
              </div>
            </div>
          `;
          }).join("")}
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

    if (boqItems.length > 0) {
      html += `
        <button class="sec-tab-btn" onclick="BOQApp.clearBoqTable()" style="margin-right:auto; color:#dc2626; border-color:#fecaca; background:#fef2f2;" title="تفريغ الجدول والبدء من جديد">
          <i class="fas fa-trash-can"></i>
          <span>تفريغ الجدول</span>
        </button>
      `;
    }

    tabsContainer.innerHTML = html;
  }

  function filterSection(secId) {
    currentActiveSectionFilter = secId;
    renderCatalogDrawer();
    renderSectionTabs();
    renderBoqTable();
  }

  // Add Item to BOQ from Catalog
  function addItemToBoq(sectionId, itemId) {
    const sec = catalog.find(s => s.id === sectionId);
    if (!sec) return;
    const item = sec.items.find(i => i.id === itemId);
    if (!item) return;

    // التحقق من عدم إضافة نفس البند مرتين
    const existingItem = boqItems.find(
      b => b.catalogId === item.id || (item.code && b.itemNo === item.code && b.sectionId === sectionId)
    );
    if (existingItem) {
      showToast(`تنبيه: تمت إضافة هذا البند من قبل (${item.code} - ${item.name}) ولا يمكن تكراره في الجدول.`, "warning");
      const existingRow = document.querySelector(`tr[data-boq-id="${existingItem.id}"]`);
      if (existingRow) {
        existingRow.scrollIntoView({ behavior: "smooth", block: "center" });
        existingRow.classList.remove("boq-row-duplicate-flash");
        void existingRow.offsetWidth;
        existingRow.classList.add("boq-row-duplicate-flash");
        setTimeout(() => existingRow.classList.remove("boq-row-duplicate-flash"), 2400);
      }
      return;
    }

    // Preserve official item code linked to technical description
    const secItems = boqItems.filter(i => i.sectionId === sectionId);
    const secPrefix = sec.codePrefix || (catalog.indexOf(sec) + 1);
    const itemIndex = secItems.length + 1;
    const itemNo = item.code || `${secPrefix}-${itemIndex}`;

    const newBoqItem = {
      id: "boq-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      catalogId: item.id,
      sectionId: sec.id,
      itemNo: itemNo,
      name: item.name,
      description: item.description,
      templateDescription: item.description,
      placeholderValues: {},
      hasPlaceholders: Boolean(item.hasPlaceholders || (item.description && /\.{2,}/.test(item.description))),
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
    renderCatalogDrawer();
    renderSectionTabs();
    renderBoqTable();
    showToast(`تمت إضافة البند "${item.code} - ${item.name}" إلى جدول الكميات`);
  }

  function escapeHtmlAttr(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildInteractiveDescriptionHtml(item, catItem) {
    const templateDesc = item.templateDescription || catItem.description || item.description || "";
    const hasDots = Boolean(item.hasPlaceholders || /\.{2,}/.test(templateDesc));

    if (hasDots && !item.isManualFullEdit) {
      if (!item.templateDescription) item.templateDescription = templateDesc;
      if (!item.placeholderValues) item.placeholderValues = {};

      let matchIdx = 0;
      const htmlWithInputs = escapeHtmlAttr(templateDesc).replace(/\.{2,}(\s+\.{2,})*/g, () => {
        const idx = matchIdx++;
        const currentVal = item.placeholderValues[idx] || "";
        const filledClass = currentVal.trim() ? "filled" : "";
        return `<input type="text" class="inline-blank-input ${filledClass}" value="${escapeHtmlAttr(currentVal)}" placeholder="أدخل القيمة..." title="فراغ فني مخصص لتعبئة المهندس المشرف" oninput="BOQApp.updatePlaceholderValue('${item.id}', ${idx}, this.value, this)">`;
      });

      return htmlWithInputs.replace(/\n/g, "<br>");
    }

    return escapeHtmlAttr(item.description || "").replace(/\n/g, "<br>");
  }

  // Render The Interactive BOQ Table
  function renderBoqTable() {
    const tbody = document.getElementById("boqTableBody");
    if (!tbody) return;

    if (boqItems.length === 0 && currentActiveSectionFilter === "all") {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 3.5rem 1rem;">
            <div style="font-size: 2.4rem; color: #005a36; opacity: 0.35; margin-bottom: 0.75rem;"><i class="fas fa-clipboard-list"></i></div>
            <h4 style="color: #1e293b; font-size: 1.1rem; font-weight: 800; margin-bottom: 0.5rem;">جدول الكميات جاهز للإنشاء</h4>
            <p style="color: #64748b; font-size: 0.88rem;">اضغط على البند من الدليل الجانبي لإضافته مباشرة الى الجدول</p>
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
      if (secItems.length === 0 && currentActiveSectionFilter === "all") {
        return;
      }

      // Section Header Banner Row
      html += `
        <tr class="tr-section-header">
          <td colspan="10">
            <div class="section-banner">
              <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                <span class="badge-tag" style="background:#005a36; color:#fff; border:none;">تصنيف ${sec.codePrefix || (sIdx + 1)}</span>
                <span>${sec.name}</span>
                <span style="font-size: 0.82rem; color: #64748b; font-weight: normal;">(${secItems.length} بنود مدرجة)</span>
                ${sec.description && sec.description !== sec.name ? `<span style="font-size: 0.75rem; color: #475569; font-weight: 500; background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${sec.description}</span>` : ''}
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
        const templateDesc = item.templateDescription || catItem.description || item.description || "";
        const hasPlaceholders = Boolean(item.hasPlaceholders || catItem.hasPlaceholders || /\.{2,}/.test(templateDesc));
        const interactiveDescHtml = buildInteractiveDescriptionHtml(item, catItem);

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
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom: 4px; flex-wrap:wrap;">
                <div class="item-title-text">${item.name}</div>
                <div style="display:flex; gap:0.35rem; align-items:center;">
                  ${hasPlaceholders ? `
                    <span class="placeholder-notice-badge" title="يحتوي هذا البند على أقواس/نقاط فاضية لتعبئتها من قبل المهندس المشرف">
                      <i class="fas fa-pen-fancy"></i> قابل لتعبئة المهندس (...)
                    </span>
                  ` : ''}
                  <button type="button" class="desc-edit-toggle-btn" onclick="BOQApp.toggleFullDescEditor('${item.id}')" title="تعديل التوصيف الفني الكامل للبند">
                    <i class="fas fa-edit"></i> تعديل التوصيف
                  </button>
                </div>
              </div>

              <div id="descDisplay_${item.id}" style="font-size: 0.8rem; color: #475569; line-height: 1.65;">${interactiveDescHtml}</div>

              <!-- محرر النص الكامل للتوصيف الفني -->
              <div id="fullDescEditor_${item.id}" class="desc-full-editor" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:0.74rem; font-weight:700; color:var(--primary);">
                  <span><i class="fas fa-pen-to-square"></i> تعديل التوصيف الفني للبند (${item.itemNo}):</span>
                  ${hasPlaceholders ? `
                    <button type="button" class="desc-edit-toggle-btn" onclick="BOQApp.resetItemDescription('${item.id}')" style="font-size:0.7rem;">
                      <i class="fas fa-rotate-left"></i> استعادة حقول الفراغات (...)
                    </button>
                  ` : ''}
                </div>
                <textarea id="descTextarea_${item.id}" class="desc-full-textarea" 
                  oninput="BOQApp.updateFullDescription('${item.id}', this.value)">${item.description || ''}</textarea>
              </div>
              
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
                  <textarea class="custom-spec-area" placeholder="ملاحظات أو مواصفات فنية إضافية خاصة بالبند (اختياري)..." 
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

  function updatePlaceholderValue(itemId, placeholderIdx, value, inputEl) {
    const item = boqItems.find(i => i.id === itemId);
    if (!item) return;

    const sec = catalog.find(s => s.id === item.sectionId) || {};
    const catItem = (sec.items || []).find(ci => ci.id === item.catalogId) || {};
    const templateDesc = item.templateDescription || catItem.description || item.description || "";

    if (!item.templateDescription) item.templateDescription = templateDesc;
    if (!item.placeholderValues) item.placeholderValues = {};

    item.placeholderValues[placeholderIdx] = value;

    if (inputEl) {
      inputEl.classList.toggle("filled", Boolean(value && value.trim()));
    }

    let matchCounter = 0;
    item.description = templateDesc.replace(/\.{2,}(\s+\.{2,})*/g, (match) => {
      const idx = matchCounter++;
      const filledVal = item.placeholderValues[idx];
      return (filledVal && filledVal.trim()) ? filledVal.trim() : match;
    });

    const fullTextarea = document.getElementById(`descTextarea_${itemId}`);
    if (fullTextarea) {
      fullTextarea.value = item.description;
    }

    saveBoqItems();
  }

  function toggleFullDescEditor(itemId) {
    const editorEl = document.getElementById(`fullDescEditor_${itemId}`);
    if (!editorEl) return;
    const isHidden = editorEl.style.display === "none";
    editorEl.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      const ta = document.getElementById(`descTextarea_${itemId}`);
      if (ta) ta.focus();
    }
  }

  function updateFullDescription(itemId, newText) {
    const item = boqItems.find(i => i.id === itemId);
    if (!item) return;
    item.description = newText;
    item.isManualFullEdit = true;

    const displayEl = document.getElementById(`descDisplay_${itemId}`);
    if (displayEl) {
      displayEl.innerHTML = escapeHtmlAttr(newText).replace(/\n/g, "<br>");
    }

    saveBoqItems();
  }

  function resetItemDescription(itemId) {
    const item = boqItems.find(i => i.id === itemId);
    if (!item) return;
    const sec = catalog.find(s => s.id === item.sectionId) || {};
    const catItem = (sec.items || []).find(ci => ci.id === item.catalogId) || {};
    const templateDesc = item.templateDescription || catItem.description || item.description || "";

    item.description = templateDesc;
    item.templateDescription = templateDesc;
    item.placeholderValues = {};
    item.isManualFullEdit = false;

    saveBoqItems();
    renderBoqTable();
    showToast("تمت استعادة النص الأصلي وحقول الفراغات للبند.");
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
    renderCatalogDrawer();
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

  function showToast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const isWarning = type === "warning" || message.startsWith("تنبيه") || message.startsWith("⛔");
    const toast = document.createElement("div");
    toast.className = `toast ${isWarning ? "toast-warning" : ""}`;
    const iconHtml = isWarning
      ? `<i class="fas fa-triangle-exclamation" style="color:#f59e0b; font-size:1.15rem;"></i>`
      : `<i class="fas fa-check-circle" style="color:#10b981;"></i>`;
    toast.innerHTML = `${iconHtml} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(15px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, isWarning ? 4000 : 3200);
  }

  return {
    init,
    getProjectInfo: () => projectInfo,
    getCatalog: () => catalog,
    getBoqItems: () => boqItems,
    saveCatalog,
    resetCatalogToDefault,
    clearBoqTable,
    switchScreen,
    addItemToBoq,
    filterSection,
    handleSpecChange,
    updateItemField,
    updatePlaceholderValue,
    toggleFullDescEditor,
    updateFullDescription,
    resetItemDescription,
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
    applySessionPermissions,
    togglePriceConfidentiality,
    showToast
  };

})();
