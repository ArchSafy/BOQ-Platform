/**
 * نظام التصدير والمخرجات - جداول الكميات وكراسة الشروط
 * أمانة المنطقة الشرقية - الإدارة العامة للإشراف
 */

const ExportSystem = (() => {

  // Helper to format currency
  function formatMoney(amount) {
    return Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // 1. Export Excel (Priced & Unpriced) using SheetJS
  function exportExcel(isPriced = true) {
    if (typeof XLSX === "undefined") {
      alert("مكتبة SheetJS قيد التحميل، يرجى المحاولة بعد لحظات.");
      return;
    }

    const project = BOQApp.getProjectInfo();
    const items = BOQApp.getBoqItems();
    const sections = BOQApp.getCatalog();

    // Prepare Worksheet Data
    const wsData = [
      ["المملكة العربية السعودية"],
      ["وزارة البلديات والإسكان"],
      ["أمانة المنطقة الشرقية - الإدارة العامة للإشراف"],
      ["إدارة مشاريع الأنسنة"],
      [],
      ["جدول الكميات والمواصفات" + (isPriced ? " (النسخة التقديرية المسعرة)" : " (نسخة الطرح والمنافسة - غير مسعرة)")],
      ["اسم المشروع:", project.projectName || ""],
      ["رقم المشروع / المنافسة:", project.projectNumber || ""],
      ["الموقع والبلدية:", (project.municipality || "") + " - " + (project.location || "")],
      ["مدة التنفيذ:", (project.durationMonths || "") + " أشهر"],
      ["تاريخ الإعداد:", project.date || ""],
      ["المهندس المشرف:", project.engineerName || ""],
      [],
      [
        "رقم البند",
        "وصف الأعمال والمواصفات الفنية",
        "الوحدة",
        "الكمية",
        isPriced ? "السعر الإفرادي (ر.س)" : "السعر الإفرادي المقترح من المقاول",
        isPriced ? "السعر الإجمالي (ر.س)" : "السعر الإجمالي المقترح",
        isPriced ? "الإجمالي كتابةً" : "الإجمالي كتابةً للمقاول",
        "مصدر المواد",
        "الرمز الإنشائي"
      ]
    ];

    let rowCount = wsData.length;
    let sectionRowIndices = [];

    // Group items by section
    sections.forEach(sec => {
      const secItems = items.filter(it => it.sectionId === sec.id);
      if (secItems.length === 0) return;

      // Section Header Row
      wsData.push([
        sec.codePrefix || "",
        sec.name,
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]);
      sectionRowIndices.push(wsData.length);

      secItems.forEach(item => {
        const qty = Number(item.quantity || 0);
        const price = Number(item.unitPrice || 0);
        const total = qty * price;
        const tafqeet = Tafqeet.convertCurrency(total);
        const fullDesc = item.name + "\n" + (item.description || "") + 
          (item.customSpec ? ("\n• مواصفة خاصة: " + item.customSpec) : (item.selectedSpec ? ("\n• المواصفة: " + item.selectedSpec) : ""));

        wsData.push([
          item.itemNo || "",
          fullDesc,
          item.unit || "",
          qty,
          isPriced ? price : "",
          isPriced ? total : "",
          isPriced ? tafqeet : "",
          item.materialSource || "محلي",
          item.structuralCode || ""
        ]);
      });
    });

    // Summary Rows for Priced BOQ
    if (isPriced) {
      const summary = BOQApp.calculateSummary();
      wsData.push([]);
      wsData.push(["", "المجموع الكلي قبل الضريبة (SAR):", "", "", "", summary.subtotal, Tafqeet.convertCurrency(summary.subtotal), "", ""]);
      wsData.push(["", `ضريبة القيمة المضافة (${project.vatRate}%):`, "", "", "", summary.vatAmount, Tafqeet.convertCurrency(summary.vatAmount), "", ""]);
      wsData.push(["", "المجموع النهائي الإجمالي شاملاً الضريبة (SAR):", "", "", "", summary.grandTotal, Tafqeet.convertCurrency(summary.grandTotal), "", ""]);
    } else {
      wsData.push([]);
      wsData.push(["", "إجمالي العطاء المقدم من المقاول غير شامل الضريبة:", "", "", "", "", "", "", ""]);
      wsData.push(["", "ضريبة القيمة المضافة (15%):", "", "", "", "", "", "", ""]);
      wsData.push(["", "الإجمالي النهائي للعطاء شاملاً الضريبة:", "", "", "", "", "", "", ""]);
      wsData.push(["", "الإجمالي النهائي كتابةً:", "", "", "", "", "", "", ""]);
      wsData.push(["", "ختم وتوقيع المقاول المتقدم بالعطاء:", "", "", "", "", "", "", ""]);
    }

    // Create workbook & worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, // رقم البند
      { wch: 55 }, // الوصف
      { wch: 10 }, // الوحدة
      { wch: 12 }, // الكمية
      { wch: 18 }, // الإفرادي
      { wch: 18 }, // الإجمالي
      { wch: 40 }, // كتابةً
      { wch: 14 }, // مصدر المواد
      { wch: 16 }  // الرمز الإنشائي
    ];

    // RTL sheet view setting
    if (!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ rightToLeft: true });

    XLSX.utils.book_append_sheet(wb, ws, isPriced ? "BOQ_Priced" : "BOQ_Tender");

    const cleanName = (project.projectName || "BOQ_Project").replace(/[/\\?%*:|"<>]/g, '-');
    const filename = `${cleanName}_${isPriced ? "جدول_كميات_مسعر" : "جدول_كميات_طرح_غير_مسعر"}.xlsx`;
    XLSX.writeFile(wb, filename);

    BOQApp.showToast(`تم تصدير ملف الإكسل ${isPriced ? "المسعر" : "غير المسعر"} بنجاح!`);
  }

  // 2. Build HTML Element for BOQ PDF Printing
  function buildBoqHtmlForPdf(isPriced = true) {
    const project = BOQApp.getProjectInfo();
    const items = BOQApp.getBoqItems();
    const sections = BOQApp.getCatalog();
    const summary = BOQApp.calculateSummary();

    let rowsHtml = "";

    sections.forEach(sec => {
      const secItems = items.filter(it => it.sectionId === sec.id);
      if (secItems.length === 0) return;

      rowsHtml += `
        <tr style="background-color: #eaf3ee; font-weight: bold; color: #005a36;">
          <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1;">${sec.codePrefix || ""}</td>
          <td colspan="8" style="padding: 6px 10px; border: 1px solid #cbd5e1;">${sec.name}</td>
        </tr>
      `;

      secItems.forEach(item => {
        const qty = Number(item.quantity || 0);
        const price = Number(item.unitPrice || 0);
        const total = qty * price;
        const tafqeet = Tafqeet.convertCurrency(total);
        const specText = item.customSpec ? item.customSpec : (item.selectedSpec || "");

        rowsHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #005a36;">${item.itemNo}</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1; line-height: 1.4;">
              <div style="font-weight: bold; color: #1e293b; margin-bottom: 3px;">${item.name}</div>
              <div style="color: #475569; font-size: 10px;">${item.description || ""}</div>
              ${specText ? `<div style="color: #92400e; font-size: 9.5px; margin-top: 3px;">• المواصفة: ${specText}</div>` : ""}
            </td>
            <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-weight: 600;">${item.unit}</td>
            <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${qty.toLocaleString("en-US")}</td>
            <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #005a36;">${isPriced ? formatMoney(price) : "---"}</td>
            <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #005a36;">${isPriced ? formatMoney(total) : "---"}</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1; font-size: 9.5px; color: #475569; background: #fafafa;">${isPriced ? tafqeet : "يُعبأ من قِبل المتنافس"}</td>
            <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-size: 10px;">
              <span style="display:inline-block; padding: 2px 5px; border-radius: 4px; font-weight: bold; ${item.materialSource === 'محلي' ? 'background:#ecfdf5; color:#065f46;' : 'background:#fff7ed; color:#9a3412;'}">${item.materialSource}</span>
            </td>
            <td style="text-align: center; padding: 6px; border: 1px solid #cbd5e1; font-size: 10px; font-family: monospace; color: #64748b;">${item.structuralCode || "---"}</td>
          </tr>
        `;
      });
    });

    const container = document.createElement("div");
    container.style.direction = "rtl";
    container.style.fontFamily = "'Tajawal', sans-serif";
    container.style.padding = "20px";
    container.style.color = "#1e293b";
    container.style.backgroundColor = "#ffffff";

    container.innerHTML = `
      <div style="border-bottom: 2px solid #005a36; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 14px; font-weight: bold; color: #005a36;">المملكة العربية السعودية</div>
          <div style="font-size: 12px; color: #475569;">وزارة البلديات والإسكان - أمانة المنطقة الشرقية</div>
          <div style="font-size: 12px; font-weight: bold; color: #b88a44;">الإدارة العامة للإشراف - إدارة مشاريع الأنسنة</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 18px; font-weight: 800; color: #005a36;">جدول الكميات والمواصفات (BOQ)</div>
          <div style="font-size: 12px; font-weight: 600; color: ${isPriced ? '#005a36' : '#d97706'}; background: ${isPriced ? '#e8f5ee' : '#fef3c7'}; padding: 2px 10px; border-radius: 12px; display: inline-block; margin-top: 4px;">
            ${isPriced ? "النسخة التقديرية المعتمدة (مسعرة)" : "نسخة الطرح والمنافسة (غير مسعرة)"}
          </div>
        </div>
        <div style="text-align: left; font-size: 11px; color: #64748b;">
          <div>التاريخ: ${project.date || ""}</div>
          <div>رقم المشروع: ${project.projectNumber || ""}</div>
        </div>
      </div>

      <!-- Project Quick Info Box -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; border: 1px solid #cbd5e1; background: #f8fafc;">
        <tr>
          <td style="padding: 6px 10px; font-weight: bold; width: 15%; background: #edf2f7; border: 1px solid #cbd5e1;">اسم المشروع:</td>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #005a36;" colspan="3">${project.projectName || ""}</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; font-weight: bold; background: #edf2f7; border: 1px solid #cbd5e1;">البلدية والموقع:</td>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${project.municipality || ""} - ${project.location || ""}</td>
          <td style="padding: 6px 10px; font-weight: bold; width: 15%; background: #edf2f7; border: 1px solid #cbd5e1;">مدة التنفيذ:</td>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: bold;">${project.durationMonths || ""} أشهر تقويمية</td>
        </tr>
        <tr>
          <td style="padding: 6px 10px; font-weight: bold; background: #edf2f7; border: 1px solid #cbd5e1;">المهندس المشرف:</td>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${project.engineerName || ""}</td>
          <td style="padding: 6px 10px; font-weight: bold; background: #edf2f7; border: 1px solid #cbd5e1;">نطاق العمل:</td>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 10px;">${project.scopeOfWork || ""}</td>
        </tr>
      </table>

      <!-- Main BOQ Table -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 11px;">
        <thead>
          <tr style="background-color: #005a36; color: #ffffff;">
            <th rowspan="2" style="padding: 8px 4px; border: 1px solid #cbd5e1; width: 50px;">رقم البند</th>
            <th rowspan="2" style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: right; min-width: 250px;">وصف الأعمال والمواصفات</th>
            <th rowspan="2" style="padding: 8px 4px; border: 1px solid #cbd5e1; width: 55px;">الوحدة</th>
            <th rowspan="2" style="padding: 8px 4px; border: 1px solid #cbd5e1; width: 65px;">الكمية</th>
            <th colspan="3" style="padding: 4px; border: 1px solid #cbd5e1; background: #004529;">السعر (ريال سعودي)</th>
            <th rowspan="2" style="padding: 8px 4px; border: 1px solid #cbd5e1; width: 75px;">مصدر المواد</th>
            <th rowspan="2" style="padding: 8px 4px; border: 1px solid #cbd5e1; width: 75px;">الرمز الإنشائي</th>
          </tr>
          <tr style="background-color: #05663f; color: #ffffff; font-size: 10px;">
            <th style="padding: 5px; border: 1px solid #cbd5e1; width: 80px;">الإفرادي</th>
            <th style="padding: 5px; border: 1px solid #cbd5e1; width: 85px;">الإجمالي</th>
            <th style="padding: 5px; border: 1px solid #cbd5e1; width: 140px;">الإجمالي كتابةً</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Totals & Summary -->
      ${isPriced ? `
        <div style="margin-top: 15px; border: 1.5px solid #005a36; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 12px; font-weight: bold; width: 60%;">إجمالي القيمة التقديرية للأعمال (غير شامل الضريبة):</td>
              <td style="padding: 8px 12px; text-align: left; font-weight: bold; color: #005a36; font-size: 13px;">${formatMoney(summary.subtotal)} ر.س</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 12px; font-weight: bold;">ضريبة القيمة المضافة (${project.vatRate}%):</td>
              <td style="padding: 8px 12px; text-align: left; font-weight: bold; color: #b88a44; font-size: 13px;">${formatMoney(summary.vatAmount)} ر.س</td>
            </tr>
            <tr style="background-color: #005a36; color: #ffffff;">
              <td style="padding: 10px 12px; font-weight: 800; font-size: 14px;">المجموع الإجمالي النهائي شاملاً ضريبة القيمة المضافة:</td>
              <td style="padding: 10px 12px; text-align: left; font-weight: 900; font-size: 16px;">${formatMoney(summary.grandTotal)} ر.س</td>
            </tr>
            <tr style="background-color: #fefce8; color: #854d0e;">
              <td colspan="2" style="padding: 8px 12px; font-weight: bold; font-size: 11.5px;">
                الإجمالي كتابةً: ${Tafqeet.convertCurrency(summary.grandTotal)}
              </td>
            </tr>
          </table>
        </div>
      ` : `
        <div style="margin-top: 15px; border: 1.5px dashed #64748b; border-radius: 8px; padding: 12px; background: #f8fafc; page-break-inside: avoid;">
          <div style="font-weight: bold; font-size: 12px; color: #1e293b; margin-bottom: 8px;">تعهد وإقرار المتنافس:</div>
          <p style="font-size: 10px; color: #475569; line-height: 1.5;">
            يقر المتنافس بأنه قام بدراسة جميع المخططات والمواصفات الفنية وموقع العمل دراسة تامة ونافية للجهالة، وأن الأسعار المدونة بعاليه تشمل التوريد، التركيب، العمالة، المعدات، الاختبارات وجميع ما يلزم لإتمام الأعمال طبقاً للشروط والمواصفات المعتمدة من أمانة المنطقة الشرقية.
          </p>
          <div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
            <div>اسم الشركة / المؤسسة: ............................................</div>
            <div>رقم السجل التجاري: ............................</div>
            <div>التوقيع والختم الرسمي: ............................</div>
          </div>
        </div>
      `}

      <!-- Official Signatures Box -->
      <div style="margin-top: 25px; display: flex; justify-content: space-between; text-align: center; font-size: 11.5px; page-break-inside: avoid;">
        <div style="width: 30%;">
          <div style="font-weight: bold; color: #005a36;">مهندس المشروع</div>
          <div style="margin-top: 6px; color: #1e293b;">${project.engineerName || "م. مهندس الإشراف"}</div>
          <div style="margin-top: 35px; border-bottom: 1px dotted #94a3b8; width: 80%; margin-inline: auto;">التوقيع: </div>
        </div>
        <div style="width: 30%;">
          <div style="font-weight: bold; color: #005a36;">مدير إدارة مشاريع الأنسنة</div>
          <div style="margin-top: 6px; color: #1e293b;">م. محمد بن أحمد الغامدي</div>
          <div style="margin-top: 35px; border-bottom: 1px dotted #94a3b8; width: 80%; margin-inline: auto;">التوقيع: </div>
        </div>
        <div style="width: 30%;">
          <div style="font-weight: bold; color: #005a36;">مدير عام الإدارة العامة للإشراف</div>
          <div style="margin-top: 6px; color: #1e293b;">م. فهد بن ناصر القحطاني</div>
          <div style="margin-top: 35px; border-bottom: 1px dotted #94a3b8; width: 80%; margin-inline: auto;">الاعتماد والختم الرسمي</div>
        </div>
      </div>
    `;

    return container;
  }

  // 3. Export PDF (Priced & Unpriced)
  function exportPdf(isPriced = true) {
    if (typeof html2pdf === "undefined") {
      alert("مكتبة html2pdf قيد التحميل، يرجى الانتظار ثانية والمحاولة ثانية.");
      return;
    }

    const project = BOQApp.getProjectInfo();
    const element = buildBoqHtmlForPdf(isPriced);
    const cleanName = (project.projectName || "BOQ_Project").replace(/[/\\?%*:|"<>]/g, '-');
    const filename = `${cleanName}_${isPriced ? "جدول_كميات_مسعر" : "جدول_كميات_طرح_غير_مسعر"}.pdf`;

    const opt = {
      margin: [10, 8, 10, 8],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    BOQApp.showToast("جاري إعداد ملف الـ PDF وتنسيق الصفحات الرسمية...");
    html2pdf().set(opt).from(element).save().then(() => {
      BOQApp.showToast(`تم تصدير ملف PDF ${isPriced ? "المسعر" : "غير المسعر"} بنجاح!`);
    });
  }

  // 4. Generate Tender Specification Document Text (كراسة الشروط والمواصفات)
  function generateTenderDocumentData() {
    const p = BOQApp.getProjectInfo();
    const items = BOQApp.getBoqItems();
    const sections = BOQApp.getCatalog();
    const summary = BOQApp.calculateSummary();

    return {
      title: `كراسة الشروط والمواصفات الفنية العامة والخاصة`,
      projectName: p.projectName || "مشروع أنسنة وتطوير ممشى وحديقة",
      projectNumber: p.projectNumber || "EPM-HUM-2026-084",
      municipality: p.municipality || "أمانة المنطقة الشرقية",
      department: p.department || "الإدارة العامة للإشراف - إدارة مشاريع الأنسنة",
      location: p.location || "المنطقة الشرقية",
      duration: `${p.durationMonths || 6} أشهر`,
      engineerName: p.engineerName || "مهندس الإشراف المعتمد",
      date: p.date || "2026-10-15",
      scopeOfWork: p.scopeOfWork || "تطوير مسارات المشاة، التشجير، الإنارة الذكية والفرش الحضري وفق معايير الأنسنة المعتمدة.",
      grandTotal: formatMoney(summary.grandTotal),
      grandTotalWords: Tafqeet.convertCurrency(summary.grandTotal),
      sectionsCount: sections.length,
      itemsCount: items.length
    };
  }

  // 5. Export Tender Document as Word (.docx)
  function exportTenderDocx() {
    const data = generateTenderDocumentData();
    const project = BOQApp.getProjectInfo();
    const items = BOQApp.getBoqItems();
    const sections = BOQApp.getCatalog();
    const summary = BOQApp.calculateSummary();

    // Check if docx library is loaded
    if (typeof docx !== "undefined") {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = docx;

      const doc = new Document({
        styles: {
          default: {
            document: {
              run: {
                font: "Arial",
                size: 22,
                color: "1e293b",
                rightToLeft: true
              },
              paragraph: {
                alignment: AlignmentType.RIGHT,
                rightToLeft: true,
                spacing: { line: 360, before: 120, after: 120 }
              }
            }
          }
        },
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "المملكة العربية السعودية", bold: true, size: 28, color: "005a36" }),
                new TextRun({ text: "\nوزارة البلديات والإسكان - أمانة المنطقة الشرقية", bold: true, size: 24, color: "005a36" }),
                new TextRun({ text: "\nالإدارة العامة للإشراف - إدارة مشاريع الأنسنة", bold: true, size: 22, color: "b88a44" }),
                new TextRun({ text: "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", color: "cbd5e1" }),
                new TextRun({ text: "كراسة الشروط والمواصفات الفنية الكاملة", bold: true, size: 36, color: "005a36" }),
                new TextRun({ text: `\n${data.projectName}`, bold: true, size: 30, color: "1e293b" }),
                new TextRun({ text: `\nرقم المنافسة / المشروع: ${data.projectNumber}`, size: 24, color: "64748b" }),
                new TextRun({ text: `\nتاريخ الإصدار: ${data.date}`, size: 22, color: "64748b" }),
                new TextRun({ text: "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n", color: "cbd5e1" })
              ]
            }),

            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: "الباب الأول: الشروط العامة والتعليمات للمتنافسين", bold: true, size: 26, color: "005a36" })]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `1. موضوع المنافسة: `, bold: true }),
                new TextRun({ text: `طرح وتنفيذ ${data.projectName} التابع لـ ${data.municipality} وفقاً لنطاق العمل والبنود الموضحة بجداول الكميات.` })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `2. مدة تنفيذ المشروع: `, bold: true }),
                new TextRun({ text: `تحدد مدة التنفيذ بـ (${data.duration}) تقويمية تبدأ من تاريخ استلام الموقع بموجب محضر استلام موقع رسمي.` })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `3. غرامات التأخير: `, bold: true }),
                new TextRun({ text: `تطبق أحكام نظام المنافسات والمشتريات الحكومية ولائحته التنفيذية، وتُفرض غرامة تأخير بنسبة لا تتجاوز 10% من إجمالي قيمة العقد.` })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `4. متطلبات الجودة والمحتوى المحلي: `, bold: true }),
                new TextRun({ text: `يلتزم المقاول بإعطاء الأولوية القصوى للمنتجات والمواد المصنعة محلياً في المملكة العربية السعودية، وتقديم شهادات المطابقة والمنشأ سارية المفعول.` })
              ]
            }),

            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: "الباب الثاني: نطاق العمل والمواصفات الهندسية", bold: true, size: 26, color: "005a36" })]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `نطاق العمل المعتمد:\n`, bold: true }),
                new TextRun({ text: data.scopeOfWork })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `المعايير الفنية للأنسنة:\n`, bold: true }),
                new TextRun({ text: `• متطلبات الوصول الشامل للأشخاص ذوي الإعاقة (Universal Accessibility) وفق كود البناء السعودي.\n` }),
                new TextRun({ text: `• اشتراطات السلامة ومقاومة الانزلاق لأرضيات الإنترلوك ومسارات الدراجات.\n` }),
                new TextRun({ text: `• ترشيد استهلاك المياه باستخدام شبكات الري الذكية وتفضيل الأشجار والنباتات المحلية المتأقلمة.\n` }),
                new TextRun({ text: `• استخدام إنارة LED موفرة للطاقة ومقاومة للعوامل الجوية والرطوبة العالية في المنطقة الشرقية.` })
              ]
            }),

            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: "الباب الثالث: ملخص جدول الكميات والاعتماد المالي", bold: true, size: 26, color: "005a36" })]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `• القيمة التقديرية الإجمالية للمشروع: `, bold: true }),
                new TextRun({ text: `${data.grandTotal} ريال سعودي شاملاً ضريبة القيمة المضافة.\n` }),
                new TextRun({ text: `• الإجمالي كتابةً: `, bold: true }),
                new TextRun({ text: `${data.grandTotalWords}\n` }),
                new TextRun({ text: `• المهندس المشرف المسؤول: `, bold: true }),
                new TextRun({ text: `${data.engineerName}` })
              ]
            }),

            new Paragraph({
              children: [
                new TextRun({ text: "\n\nاعتمد من:\n", bold: true, size: 24, color: "005a36" }),
                new TextRun({ text: "مدير عام الإدارة العامة للإشراف بأمانة المنطقة الشرقية\nم. فهد بن ناصر القحطاني\n(الختم الرسمي)", bold: true })
              ]
            })
          ]
        }]
      });

      Packer.toBlob(doc).then(blob => {
        const link = document.createElement("a");
        const cleanName = (project.projectName || "Tender_Document").replace(/[/\\?%*:|"<>]/g, '-');
        link.href = URL.createObjectURL(blob);
        link.download = `${cleanName}_كراسة_الشروط_والمواصفات.docx`;
        link.click();
        BOQApp.showToast("تم تصدير كراسة الشروط والمواصفات (Word docx) بنجاح!");
      });
      return;
    }

    // Fallback: Generate HTML-compatible Word .doc
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>كراسة الشروط والمواصفات</title>
        <style>
          body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; line-height: 1.8; color: #1e293b; padding: 40px; }
          h1 { color: #005a36; border-bottom: 2px solid #005a36; padding-bottom: 8px; margin-top: 30px; font-size: 20px; }
          .header-box { text-align: center; border: 2px solid #005a36; padding: 25px; margin-bottom: 30px; background: #f8fafc; }
          .title { font-size: 24px; font-weight: bold; color: #005a36; margin: 15px 0; }
          .sub { font-size: 14px; color: #64748b; }
          .section-title { font-size: 16px; font-weight: bold; color: #005a36; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 13px; }
          th { background: #005a36; color: #ffffff; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div style="font-size: 16px; font-weight: bold; color: #005a36;">المملكة العربية السعودية - أمانة المنطقة الشرقية</div>
          <div style="font-size: 14px; color: #b88a44; font-weight: bold;">الإدارة العامة للإشراف - إدارة مشاريع الأنسنة</div>
          <div class="title">${data.title}</div>
          <div style="font-size: 18px; font-weight: bold; color: #1e293b;">${data.projectName}</div>
          <div class="sub">رقم المنافسة: ${data.projectNumber} | التاريخ: ${data.date}</div>
        </div>

        <h1>الباب الأول: الشروط العامة والتعليمات للمتنافسين</h1>
        <p><strong>1. الغرض من المشروع:</strong> تنفيذ أعمال الأنسنة والتطوير لـ (${data.projectName}) وفقاً للشروط والمواصفات الفنية ومخططات الطرح المعتمدة.</p>
        <p><strong>2. مدة تنفيذ المشروع:</strong> المدة المحددة لإنجاز كافة الأعمال هي (${data.duration}) تبدأ من تاريخ استلام الموقع.</p>
        <p><strong>3. متطلبات الجودة والمحتوى المحلي:</strong> يلتزم المقاول بنسبة المحتوى المحلي المعتمدة وإعطاء الأولوية للصناعات الوطنية المطابقة للمواصفات السعودية (SASO).</p>

        <h1>الباب الثاني: نطاق العمل والمواصفات الخاصة</h1>
        <p><strong>نطاق العمل:</strong> ${data.scopeOfWork}</p>

        <h1>الباب الثالث: القيمة التقديرية وجداول الكميات</h1>
        <p><strong>القيمة التقديرية الإجمالية للمشروع:</strong> ${data.grandTotal} ريال سعودي شاملاً ضريبة القيمة المضافة.</p>
        <p><strong>الإجمالي كتابةً:</strong> ${data.grandTotalWords}</p>
        <p><strong>المهندس المشرف:</strong> ${data.engineerName}</p>

        <div style="margin-top: 50px; text-align: center;">
          <p><strong>الاعتماد الرسمي:</strong></p>
          <p>مدير عام الإدارة العامة للإشراف بأمانة المنطقة الشرقية</p>
          <p>م. فهد بن ناصر القحطاني</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement("a");
    const cleanName = (project.projectName || "Tender_Document").replace(/[/\\?%*:|"<>]/g, '-');
    link.href = URL.createObjectURL(blob);
    link.download = `${cleanName}_كراسة_الشروط_والمواصفات.doc`;
    link.click();
    BOQApp.showToast("تم تصدير كراسة الشروط والمواصفات (Word) بنجاح!");
  }

  // 6. Export Tender Document as PDF
  function exportTenderPdf() {
    if (typeof html2pdf === "undefined") {
      alert("مكتبة html2pdf قيد التحميل، يرجى المحاولة بعد قليل.");
      return;
    }

    const data = generateTenderDocumentData();
    const project = BOQApp.getProjectInfo();
    const items = BOQApp.getBoqItems();
    const sections = BOQApp.getCatalog();
    const summary = BOQApp.calculateSummary();

    const element = document.createElement("div");
    element.style.direction = "rtl";
    element.style.fontFamily = "'Tajawal', sans-serif";
    element.style.padding = "30px";
    element.style.color = "#1e293b";
    element.style.backgroundColor = "#ffffff";

    element.innerHTML = `
      <div style="border: 2.5px solid #005a36; border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center; background: #fbfdfc;">
        <div style="font-size: 15px; font-weight: bold; color: #005a36;">المملكة العربية السعودية - أمانة المنطقة الشرقية</div>
        <div style="font-size: 13px; color: #b88a44; font-weight: bold; margin-top: 4px;">الإدارة العامة للإشراف - إدارة مشاريع الأنسنة</div>
        <div style="font-size: 22px; font-weight: 900; color: #005a36; margin: 15px 0 5px 0;">كراسة الشروط والمواصفات الفنية للمشروع</div>
        <div style="font-size: 16px; font-weight: 800; color: #1e293b;">${data.projectName}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
          رقم المنافسة: <strong>${data.projectNumber}</strong> | مدة التنفيذ: <strong>${data.duration}</strong> | التاريخ: <strong>${data.date}</strong>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; color: #005a36; border-bottom: 2px solid #005a36; padding-bottom: 6px; margin-bottom: 10px;">الباب الأول: الشروط العامة والتعليمات</h3>
        <p style="font-size: 11.5px; line-height: 1.7; color: #334155;">
          <strong>1. نطاق وأهداف المشروع:</strong> يهدف هذا المشروع إلى تحسين المشهد الحضري ورفع جودة الحياة من خلال ${data.scopeOfWork}.<br>
          <strong>2. مدة التنفيذ:</strong> يلتزم المقاول بإنهاء وتسليم المشروع تسليماً ابتدائياً خلال مدة (${data.duration}) من تاريخ استلام الموقع.<br>
          <strong>3. الالتزام بالمعايير الهندسية:</strong> يجب أن تكون كافة الأعمال مطابقة لمواصفات وزارة البلديات والإسكان، وكود البناء السعودي، ومعايير أمانة المنطقة الشرقية الخاصة بمشاريع الأنسنة.
        </p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; color: #005a36; border-bottom: 2px solid #005a36; padding-bottom: 6px; margin-bottom: 10px;">الباب الثاني: المتطلبات الفنية والمحتوى المحلي</h3>
        <p style="font-size: 11.5px; line-height: 1.7; color: #334155;">
          • إعطاء الأولوية لجميع المواد والمنتجات الوطنية المطابقة للمواصفات القياسية السعودية (SASO).<br>
          • تقديم عينات واعتمادات المواد لجميع عناصر الإنترلوك، شبكات الري، والأعمدة الديكورية والفرش الحضري لمهندس الإشراف قبل بدء التوريد.<br>
          • تحقيق شروط الوصول الشامل وتوفير مسارات إرشادية آمنة للمشاة وذوي الإعاقة.
        </p>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; color: #005a36; border-bottom: 2px solid #005a36; padding-bottom: 6px; margin-bottom: 10px;">الباب الثالث: البيانات المالية والاعتماد التقديري</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #cbd5e1; margin-top: 8px;">
          <tr style="background: #f8fafc;">
            <td style="padding: 7px 10px; font-weight: bold; width: 40%; border: 1px solid #cbd5e1;">القيمة التقديرية الإجمالية:</td>
            <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: 800; color: #005a36;">${data.grandTotal} ريال سعودي</td>
          </tr>
          <tr>
            <td style="padding: 7px 10px; font-weight: bold; border: 1px solid #cbd5e1;">المبلغ كتابةً:</td>
            <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #b88a44;">${data.grandTotalWords}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 7px 10px; font-weight: bold; border: 1px solid #cbd5e1;">مهندس المشروع المُعِد:</td>
            <td style="padding: 7px 10px; border: 1px solid #cbd5e1;">${data.engineerName}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 40px; display: flex; justify-content: space-between; text-align: center; font-size: 12px;">
        <div>
          <div style="font-weight: bold; color: #005a36;">إعداد مهندس الإشراف</div>
          <div style="margin-top: 5px;">${data.engineerName}</div>
          <div style="margin-top: 30px; border-bottom: 1px dotted #94a3b8; width: 140px;">التوقيع: </div>
        </div>
        <div>
          <div style="font-weight: bold; color: #005a36;">اعتماد مدير عام الإشراف</div>
          <div style="margin-top: 5px;">م. فهد بن ناصر القحطاني</div>
          <div style="margin-top: 30px; border-bottom: 1px dotted #94a3b8; width: 140px;">الختم الرسمي: </div>
        </div>
      </div>
    `;

    const cleanName = (project.projectName || "Tender_Document").replace(/[/\\?%*:|"<>]/g, '-');
    const opt = {
      margin: [15, 12, 15, 12],
      filename: `${cleanName}_كراسة_الشروط_والمواصفات.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    BOQApp.showToast("جاري إعداد وتصدير كراسة الشروط والمواصفات (PDF)...");
    html2pdf().set(opt).from(element).save().then(() => {
      BOQApp.showToast("تم تصدير كراسة الشروط والمواصفات (PDF) بنجاح!");
    });
  }

  return {
    exportExcel,
    exportPdf,
    exportTenderDocx,
    exportTenderPdf
  };

})();
