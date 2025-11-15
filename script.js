let parsed = [];

/* -------------------------------
   Toast message
-------------------------------- */
function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerHTML = msg;
    t.style.opacity = 1;

    setTimeout(() => {
        t.style.opacity = 0;
    }, 2000);
}

/* -------------------------------
   Sample CSV Download
-------------------------------- */
document.getElementById("downloadTemplate").onclick = () => {
    const sample = `from_name,from_address,from_phone,to_name,to_address,to_phone,ship_date,weight,tracking
Adnan,Kochi,99999,Rahul,Bangalore,88888,2025-02-01,1kg,TRK001`;

    const blob = new Blob([sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "sample.csv";
    a.click();
};

/* -------------------------------
   Drag & Drop + Upload
-------------------------------- */
const dropZone = document.getElementById("dropZone");
const csvInput = document.getElementById("csvInput");
const statusBox = document.getElementById("csvStatus");
const countBox = document.getElementById("labelCount");

dropZone.onclick = () => csvInput.click();

dropZone.ondragover = e => {
    e.preventDefault();
    dropZone.style.background = "#eee";
};

dropZone.ondragleave = () => {
    dropZone.style.background = "#f9f9f9";
};

dropZone.ondrop = e => {
    e.preventDefault();
    csvInput.files = e.dataTransfer.files;
    processCSV(e.dataTransfer.files[0]);
};

csvInput.onchange = e => processCSV(e.target.files[0]);

/* -------------------------------
   PROCESS CSV WITH UX FEEDBACK
-------------------------------- */
function processCSV(file) {
    // visual update
    dropZone.classList.add("drop-success");
    dropZone.querySelector("p").innerHTML = `Loaded: ${file.name}`;

    showToast("CSV Loaded Successfully ✔");

    statusBox.innerHTML = "Processing CSV…";

    // delay for UX smoothness
    setTimeout(() => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: res => {
                parsed = res.data;
                validateCSV(parsed);

                // auto scroll preview into view
                document.getElementById("preview").scrollIntoView({
                    behavior: "smooth"
                });
            }
        });
    }, 300);
}

/* -------------------------------
   CSV VALIDATION
-------------------------------- */
function validateCSV(rows) {
    const required = [
        "from_name", "from_address", "from_phone",
        "to_name", "to_address", "to_phone",
        "ship_date", "weight", "tracking"
    ];

    const cols = Object.keys(rows[0] || {});
    const missing = required.filter(r => !cols.includes(r));

    if (missing.length > 0) {
        statusBox.innerHTML = `<span style="color:red">Missing columns: ${missing.join(", ")}</span>`;
        return;
    }

    // duplicates
    const seen = new Set();
    rows.forEach(r => {
        if (seen.has(r.tracking)) r.__duplicate = true;
        seen.add(r.tracking);
    });

    // missing fields
    rows.forEach(r => {
        r.__error = required.some(k => !r[k] || r[k].trim() === "");
    });

    statusBox.innerHTML = `<span style="color:green">CSV OK ✔</span>`;

    showPreview();
}

/* -------------------------------
   PREVIEW
-------------------------------- */
function showPreview() {
    const container = document.getElementById("preview");
    container.innerHTML = "";

    // count animation
    countBox.innerHTML = `${parsed.length} Labels Loaded`;
    countBox.classList.add("count-pop");
    setTimeout(() => countBox.classList.remove("count-pop"), 500);

    parsed.forEach((row, i) => {
        const card = document.createElement("div");
        card.className = "preview-card";

        if (row.__error || row.__duplicate) {
            card.classList.add("error");
        }

        const bc = document.createElement("canvas");
        JsBarcode(bc, row.tracking || "-", { width: 1, height: 35, displayValue: false });

        card.innerHTML = `
            <div class="preview-title">Label ${i + 1}</div>
            <div class="preview-small"><b>FROM:</b> ${row.from_name}</div>
            <div class="preview-small">${row.from_address}</div>
            <br>
            <div class="preview-small"><b>TO:</b> ${row.to_name}</div>
            <div class="preview-small">${row.to_address}</div>
            <br>
            <div class="preview-small"><b>Tracking:</b> ${row.tracking}</div>
        `;

        card.appendChild(bc);
        container.appendChild(card);
    });
}

/* -------------------------------
   PDF GENERATION (ALL LABELS)
-------------------------------- */
function downloadPDF() {
    const { jsPDF } = window.jspdf;

    const format = document.getElementById("formatSelect").value;
    let pdf;

    if (format === "4x6") {
        pdf = new jsPDF({ unit: "mm", format: [101.6, 152.4] });
    } else if (format === "a4-4") {
        pdf = new jsPDF({ unit: "mm", format: "a4" });
    } else {
        pdf = new jsPDF({ unit: "mm", format: "a6" });
    }

    let first = true;
    parsed.forEach(row => {
        if (!first) pdf.addPage();
        drawLabel(pdf, row, 10, 10);
        first = false;
    });

    pdf.save("labels.pdf");
}

/* -------------------------------
   LABEL DRAWER
-------------------------------- */
function drawLabel(pdf, row, x, y) {
    pdf.setLineWidth(1);
    pdf.rect(x, y, 80, 130);

    pdf.setFontSize(11);
    pdf.text("FROM:", x + 4, y + 8);

    pdf.text(pdf.splitTextToSize(
        `${row.from_name}\n${row.from_address}\n${row.from_phone}`, 70
    ), x + 4, y + 16);

    const c = document.createElement("canvas");
    JsBarcode(c, row.tracking, { width: 1, height: 35, displayValue: false });
    pdf.addImage(c.toDataURL(), "PNG", x + 32, y + 36, 45, 12);

    pdf.setFontSize(14);
    pdf.text("TO:", x + 4, y + 56);
    pdf.setFontSize(12);

    pdf.text(pdf.splitTextToSize(
        `${row.to_name}\n${row.to_address}\n${row.to_phone}`, 70
    ), x + 4, y + 66);
}
