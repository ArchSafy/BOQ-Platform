/**
 * لوحة التحكم وإدارة بنود وأقسام دليل الأنسنة (Admin Panel)
 * أمانة المنطقة الشرقية - الإدارة العامة للإشراف
 */

const AdminPanel = (() => {

  let editingItemId = null;
  let editingSectionId = null;

  function init() {
    renderAdminCatalogList();
    populateSectionSelects();
    attachEventListeners();
  }

  function attachEventListeners() {
    // Save Item Button
    const saveItemBtn = document.getElementById("adminSaveItemBtn");
    if (saveItemBtn) {
      saveItemBtn.addEventListener("click", saveCatalogItem);
    }

    // Save Section Button
    const saveSecBtn = document.getElementById("adminSaveSectionBtn");
    if (saveSecBtn) {
      saveSecBtn.addEventListener("click", saveSection);
    }

    // Reset Catalog Button
    const resetBtn = document.getElementById("adminResetCatalogBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("هل أنت متأكد من رغبتك في إعادة ضبط مكتبة البنود إلى الإعدادات الأولية الرسمية؟")) {
          BOQApp.resetCatalogToDefault();
          renderAdminCatalogList();
          populateSectionSelects();
          BOQApp.showToast("تمت استعادة مكتبة البنود الأولية بنجاح.");
        }
      });
    }

    // New Item / Section Modal Triggers
    const openNewItemBtn = document.getElementById("adminAddNewItemBtn");
    if (openNewItemBtn) {
      openNewItemBtn.addEventListener("click", () => openItemModal());
    }

    const openNewSecBtn = document.getElementById("adminAddNewSecBtn");
    if (openNewSecBtn) {
      openNewSecBtn.addEventListener("click", () => openSectionModal());
    }
  }

  function populateSectionSelects() {
    const catalog = BOQApp.getCatalog();
    const select = document.getElementById("adminItemSectionSelect");
    if (!select) return;

    select.innerHTML = '<option value="">-- اختر القسم التابع له --</option>';
    catalog.forEach(sec => {
      const opt = document.createElement("option");
      opt.value = sec.id;
      opt.textContent = `${sec.codePrefix ? sec.codePrefix + ' - ' : ''}${sec.name}`;
      select.appendChild(opt);
    });
  }

  function renderAdminCatalogList() {
    const container = document.getElementById("adminCatalogContainer");
    if (!container) return;

    const catalog = BOQApp.getCatalog();
    let html = "";

    if (catalog.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding: 2rem; text-align: center; color: #64748b;">لا توجد أقسام مسجلة. قم بإضافة قسم جديد.</div>`;
      return;
    }

    catalog.forEach(sec => {
      html += `
        <div class="card" style="margin-bottom: 1.25rem;">
          <div class="card-header" style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge-tag" style="background: #005a36; color: #fff; border: none; font-size: 0.8rem; padding: 3px 8px;">${sec.codePrefix || "قسم"}</span>
              <h3 style="font-size: 1.05rem; font-weight: 800; color: #005a36; margin: 0;">${sec.name}</h3>
              <span style="font-size: 0.8rem; color: #64748b;">(${sec.items.length} بنود)</span>
            </div>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="AdminPanel.editSection('${sec.id}')">
                <i class="fas fa-edit"></i> تعديل القسم
              </button>
              <button class="btn btn-danger btn-sm" onclick="AdminPanel.deleteSection('${sec.id}')">
                <i class="fas fa-trash-alt"></i> حذف
              </button>
            </div>
          </div>
          <div class="card-body" style="padding: 1rem 1.25rem;">
            ${sec.description ? `<p style="font-size: 0.84rem; color: #64748b; margin-bottom: 0.75rem;">${sec.description}</p>` : ""}
            
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.84rem;">
                <thead>
                  <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; text-align: right;">
                    <th style="padding: 8px 10px; width: 85px;">الكود</th>
                    <th style="padding: 8px 10px;">اسم ووصف البند</th>
                    <th style="padding: 8px 10px; width: 70px; text-align: center;">الوحدة</th>
                    <th style="padding: 8px 10px; width: 110px; text-align: center;">السعر التقديري</th>
                    <th style="padding: 8px 10px; width: 90px; text-align: center;">المصدر</th>
                    <th style="padding: 8px 10px; width: 100px; text-align: center;">الرمز الإنشائي</th>
                    <th style="padding: 8px 10px; width: 100px; text-align: center;">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${sec.items.map(item => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 8px 10px; font-weight: bold; color: #005a36; font-family: monospace;">${item.code}</td>
                      <td style="padding: 8px 10px;">
                        <div style="font-weight: 700; color: #1e293b;">${item.name}</div>
                        <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">${item.description || ""}</div>
                        ${item.specs && item.specs.length > 0 ? `
                          <div style="font-size: 0.74rem; color: #b88a44; margin-top: 3px;">
                            • خيارات المواصفة (${item.specs.length}): ${item.specs.slice(0, 2).join(" | ")}${item.specs.length > 2 ? '...' : ''}
                          </div>
                        ` : ''}
                      </td>
                      <td style="padding: 8px 10px; text-align: center; font-weight: 600;">${item.unit}</td>
                      <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: #005a36;">${Number(item.estimatedPrice || 0).toLocaleString()} ر.س</td>
                      <td style="padding: 8px 10px; text-align: center;">
                        <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; ${item.defaultSource === 'محلي' ? 'background:#ecfdf5; color:#065f46;' : 'background:#fff7ed; color:#9a3412;'}">${item.defaultSource || 'محلي'}</span>
                      </td>
                      <td style="padding: 8px 10px; text-align: center; font-family: monospace; font-size: 0.78rem; color: #64748b;">${item.structuralCode || "---"}</td>
                      <td style="padding: 8px 10px; text-align: center;">
                        <div style="display: flex; gap: 0.3rem; justify-content: center;">
                          <button class="btn btn-secondary btn-icon" title="تعديل" onclick="AdminPanel.editItem('${sec.id}', '${item.id}')" style="width: 28px; height: 28px; font-size: 0.75rem;">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-danger btn-icon" title="حذف" onclick="AdminPanel.deleteItem('${sec.id}', '${item.id}')" style="width: 28px; height: 28px; font-size: 0.75rem;">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                  ${sec.items.length === 0 ? `
                    <tr><td colspan="7" style="padding: 1rem; text-align: center; color: #94a3b8;">لا توجد بنود في هذا القسم بعد. اضغط "إضافة بند جديد".</td></tr>
                  ` : ""}
                </tbody>
              </table>
            </div>

            <div style="margin-top: 0.75rem; text-align: left;">
              <button class="btn btn-outline-primary btn-sm" onclick="AdminPanel.openItemModal('${sec.id}')">
                <i class="fas fa-plus"></i> إضافة بند داخل هذا القسم
              </button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // Item Modal & Form
  function openItemModal(targetSectionId = null) {
    editingItemId = null;
    document.getElementById("adminItemModalTitle").textContent = "إضافة بند جديد إلى الدليل المعتمد";
    document.getElementById("adminItemForm").reset();
    document.getElementById("adminItemId").value = "";

    if (targetSectionId) {
      document.getElementById("adminItemSectionSelect").value = targetSectionId;
    }

    document.getElementById("adminItemModal").classList.add("active");
  }

  function editItem(sectionId, itemId) {
    const catalog = BOQApp.getCatalog();
    const sec = catalog.find(s => s.id === sectionId);
    if (!sec) return;
    const item = sec.items.find(i => i.id === itemId);
    if (!item) return;

    editingItemId = itemId;
    document.getElementById("adminItemModalTitle").textContent = "تعديل بيانات البند المعتمد";
    document.getElementById("adminItemId").value = item.id;
    document.getElementById("adminItemSectionSelect").value = sec.id;
    document.getElementById("adminItemCode").value = item.code || "";
    document.getElementById("adminItemName").value = item.name || "";
    document.getElementById("adminItemDesc").value = item.description || "";
    document.getElementById("adminItemUnit").value = item.unit || "م2";
    document.getElementById("adminItemPrice").value = item.estimatedPrice || "";
    document.getElementById("adminItemSource").value = item.defaultSource || "محلي";
    document.getElementById("adminItemStructuralCode").value = item.structuralCode || "";
    document.getElementById("adminItemSpecs").value = (item.specs || []).join("\n");

    document.getElementById("adminItemModal").classList.add("active");
  }

  function closeItemModal() {
    document.getElementById("adminItemModal").classList.remove("active");
    editingItemId = null;
  }

  function saveCatalogItem(e) {
    if (e) e.preventDefault();

    const secId = document.getElementById("adminItemSectionSelect").value;
    const code = document.getElementById("adminItemCode").value.trim();
    const name = document.getElementById("adminItemName").value.trim();
    const desc = document.getElementById("adminItemDesc").value.trim();
    const unit = document.getElementById("adminItemUnit").value.trim();
    const price = parseFloat(document.getElementById("adminItemPrice").value) || 0;
    const source = document.getElementById("adminItemSource").value;
    const structuralCode = document.getElementById("adminItemStructuralCode").value.trim();
    const specsText = document.getElementById("adminItemSpecs").value.trim();
    const specs = specsText ? specsText.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];

    if (!secId) {
      alert("يرجى اختيار القسم التابع له البند.");
      return;
    }
    if (!name) {
      alert("يرجى كتابة اسم البند.");
      return;
    }

    const catalog = BOQApp.getCatalog();
    const sec = catalog.find(s => s.id === secId);
    if (!sec) return;

    if (editingItemId) {
      // Find and update item
      const item = sec.items.find(i => i.id === editingItemId);
      if (item) {
        item.code = code || item.code;
        item.name = name;
        item.description = desc;
        item.unit = unit;
        item.estimatedPrice = price;
        item.defaultSource = source;
        item.structuralCode = structuralCode;
        item.specs = specs;
      }
      BOQApp.showToast("تم تحديث بيانات البند بنجاح.");
    } else {
      // Add new item
      const newItem = {
        id: "item-" + Date.now(),
        code: code || `${sec.codePrefix || '01'}-${String(sec.items.length + 1).padStart(2, '0')}`,
        name: name,
        description: desc,
        unit: unit,
        estimatedPrice: price,
        defaultSource: source,
        structuralCode: structuralCode,
        specs: specs
      };
      sec.items.push(newItem);
      BOQApp.showToast("تمت إضافة البند الجديد إلى الدليل المعتمد بنجاح.");
    }

    BOQApp.saveCatalog(catalog);
    closeItemModal();
    renderAdminCatalogList();
    BOQApp.renderCatalogDrawer();
  }

  function deleteItem(sectionId, itemId) {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا البند من الدليل؟")) return;

    const catalog = BOQApp.getCatalog();
    const sec = catalog.find(s => s.id === sectionId);
    if (!sec) return;

    sec.items = sec.items.filter(i => i.id !== itemId);
    BOQApp.saveCatalog(catalog);
    renderAdminCatalogList();
    BOQApp.renderCatalogDrawer();
    BOQApp.showToast("تم حذف البند من الدليل.");
  }

  // Section Modal & Actions
  function openSectionModal() {
    editingSectionId = null;
    document.getElementById("adminSecModalTitle").textContent = "إضافة قسم رئيسي جديد";
    document.getElementById("adminSecForm").reset();
    document.getElementById("adminSecId").value = "";
    document.getElementById("adminSecModal").classList.add("active");
  }

  function editSection(sectionId) {
    const catalog = BOQApp.getCatalog();
    const sec = catalog.find(s => s.id === sectionId);
    if (!sec) return;

    editingSectionId = sectionId;
    document.getElementById("adminSecModalTitle").textContent = "تعديل القسم الرئيسي";
    document.getElementById("adminSecId").value = sec.id;
    document.getElementById("adminSecName").value = sec.name || "";
    document.getElementById("adminSecCodePrefix").value = sec.codePrefix || "";
    document.getElementById("adminSecDesc").value = sec.description || "";
    document.getElementById("adminSecModal").classList.add("active");
  }

  function closeSectionModal() {
    document.getElementById("adminSecModal").classList.remove("active");
    editingSectionId = null;
  }

  function saveSection(e) {
    if (e) e.preventDefault();

    const name = document.getElementById("adminSecName").value.trim();
    const prefix = document.getElementById("adminSecCodePrefix").value.trim();
    const desc = document.getElementById("adminSecDesc").value.trim();

    if (!name) {
      alert("يرجى كتابة اسم القسم.");
      return;
    }

    const catalog = BOQApp.getCatalog();

    if (editingSectionId) {
      const sec = catalog.find(s => s.id === editingSectionId);
      if (sec) {
        sec.name = name;
        sec.codePrefix = prefix;
        sec.description = desc;
      }
      BOQApp.showToast("تم تحديث القسم بنجاح.");
    } else {
      const newSec = {
        id: "sec-" + Date.now(),
        name: name,
        codePrefix: prefix || String(catalog.length + 1).padStart(2, '0'),
        description: desc,
        items: []
      };
      catalog.push(newSec);
      BOQApp.showToast("تمت إضافة القسم الجديد بنجاح.");
    }

    BOQApp.saveCatalog(catalog);
    closeSectionModal();
    renderAdminCatalogList();
    populateSectionSelects();
    BOQApp.renderCatalogDrawer();
    BOQApp.renderSectionTabs();
  }

  function deleteSection(sectionId) {
    if (!confirm("تحذير: هل أنت متأكد من حذف هذا القسم وكافة البنود المندرجة تحته؟")) return;

    let catalog = BOQApp.getCatalog();
    catalog = catalog.filter(s => s.id !== sectionId);
    BOQApp.saveCatalog(catalog);
    renderAdminCatalogList();
    populateSectionSelects();
    BOQApp.renderCatalogDrawer();
    BOQApp.renderSectionTabs();
    BOQApp.showToast("تم حذف القسم بنجاح.");
  }

  return {
    init,
    openItemModal,
    closeItemModal,
    editItem,
    deleteItem,
    openSectionModal,
    closeSectionModal,
    editSection,
    deleteSection,
    renderAdminCatalogList,
    populateSectionSelects
  };

})();
