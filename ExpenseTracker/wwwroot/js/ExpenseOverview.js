(function () {

    // Helpers
    function getMonth(dateStr) {
        const d = new Date(dateStr);
        if (isNaN(d)) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function formatDateStr(dateStr) {
        const d = new Date(dateStr);
        return isNaN(d) ? dateStr : d.toLocaleDateString();
    }

    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    if (!window.data || !Array.isArray(window.data)) return;

    const barColors = [
        "#b91d47", "#00aba9", "#2b5797", "#e8c3b9", "#1e7145",
        "#ff9900", "#ffcc00", "#66ccff", "#cc66ff", "#99ff99"
    ];

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const currentMonth = getMonth(new Date());

    // Sorting months data
    const itemsByMonth = {};
    const currentMonthItems = [];

    window.data.forEach(e => {
        const month = getMonth(e.Date);
        if (!month) return;

        if (month === currentMonth) {
            currentMonthItems.push(e);
            return;
        }

        if (!itemsByMonth[month]) itemsByMonth[month] = [];
        itemsByMonth[month].push(e);
    });

    // Bottom Left Total average of all months NOT including current month
    let categories = {};
    Object.keys(itemsByMonth).forEach(m => {
        itemsByMonth[m].forEach(e => {
            const cat = e.CategoryName;
            if (!categories[cat]) {
                categories[cat] = { total: 0, months: new Set() };
            }
            categories[cat].total += Number(e.Amount || 0);
            categories[cat].months.add(m);
        });
    });

    const avgLabels = Object.keys(categories);
    const avgData = avgLabels.map(c => (categories[c].total / categories[c].months.size).toFixed(2));

    const avgChart = new Chart(document.getElementById("avgChart").getContext('2d'), {
        type: "pie",
        data: {
            labels: avgLabels,
            datasets: [{ backgroundColor: barColors, data: avgData }]
        },
        options: { title: { display: true, text: "Average Monthly Expenses per Category" } }
    });

    // Bottom right pie charts of each past month with option to edit data
    const monthsContainer = document.getElementById("monthsContainer");

    const monthsAgg = {};
    window.data.forEach(e => {
        const m = getMonth(e.Date);
        if (!m || m === currentMonth) return;

        monthsAgg[m] = monthsAgg[m] || {};
        monthsAgg[m][e.CategoryName] = (monthsAgg[m][e.CategoryName] || 0) + Number(e.Amount);
    });

    const monthKeys = Object.keys(monthsAgg).sort().reverse();
    const rightPane = document.getElementById("rightPane");
    const originalRightPaneHtml = rightPane.innerHTML;

    monthKeys.forEach(mk => {
        const wrap = document.createElement('div');
        wrap.className = "month-card";

        const [year, mm] = mk.split("-");
        const label = `${monthNames[Number(mm) - 1]} ${year}`;

        const title = document.createElement('h4');
        title.textContent = label;
        wrap.appendChild(title);

        const canvas = document.createElement('canvas');
        canvas.className = "month-chart";
        wrap.appendChild(canvas);

        const cats = Object.keys(monthsAgg[mk]);
        const vals = cats.map(c => (monthsAgg[mk][c].toFixed(2)));

        new Chart(canvas.getContext("2d"), {
            type: "pie",
            data: { labels: cats, datasets: [{ data: vals, backgroundColor: barColors }] },
            options: { legend: { display: false } }
        });

        const btn = document.createElement("button");
        btn.textContent = "Edit Month";
        btn.className = "edit-month-btn";
        btn.addEventListener("click", () => showMonthDetails(mk));

        wrap.appendChild(btn);
        monthsContainer.appendChild(wrap);
    });

    // Top left current month pie chart
    const currentMonthData = {};
    currentMonthItems.forEach(e => {
        currentMonthData[e.CategoryName] =
            (currentMonthData[e.CategoryName] || 0) + Number(e.Amount);
    });

    let currentMonthChart = null;
    const leftCanvas = document.getElementById("currentMonthChart").getContext("2d");

    const catsCur = Object.keys(currentMonthData);
    const valsCur = catsCur.map(c => (currentMonthData[c].toFixed(2)));

    let currentMonthLabel = monthNames[new Date().getMonth()];

    currentMonthChart = new Chart(leftCanvas, {
        type: "pie",
        data: {
            labels: catsCur,
            datasets: [{ backgroundColor: barColors, data: valsCur }]
        },
        options: {
            title: { display: true, text: "Expense for Current Month " + currentMonthLabel }
        }
    });

    // Set of functions to control top left current month chart
    function updateLeftPieChartForMonth(monthKey) {
        const items = itemsByMonth[monthKey] || [];
        const grouped = {};

        items.forEach(e => {
            grouped[e.CategoryName] =
                (grouped[e.CategoryName] || 0) + Number(e.Amount || 0);
        });

        const labels = Object.keys(grouped);
        const values = labels.map(l => (grouped[l].toFixed(2)));

        const [y, m] = monthKey.split("-");
        const label = `${monthNames[Number(m) - 1]} ${y}`;

        currentMonthChart.data.labels = labels;
        currentMonthChart.data.datasets[0].data = values;
        currentMonthChart.options.title.text = "Expense for " + label;
        currentMonthChart.update();
    }

    function restoreLeftChart() {
        const labels = Object.keys(currentMonthData);
        const values = labels.map(c => (currentMonthData[c].toFixed(2)));

        currentMonthChart.data.labels = labels;
        currentMonthChart.data.datasets[0].data = values;
        currentMonthChart.options.title.text = "Expense for Current Month " + currentMonthLabel;
        currentMonthChart.update();
    }

    // Update top right information for currently selected month
    function showMonthDetails(monthKey) {
        updateLeftPieChartForMonth(monthKey);

        const items = itemsByMonth[monthKey] || [];
        const [y, m] = monthKey.split("-");
        const label = `${monthNames[Number(m) - 1]} ${y}`;

        const container = document.createElement("div");
        container.className = "month-edit-container";

        const h = document.createElement("h3");
        h.textContent = "Editing expenses for " + label;
        container.appendChild(h);

        const scrollWrap = document.createElement("div");
        scrollWrap.className = "month-edit-scroll";

        const table = document.createElement("table");
        table.className = "table";

        table.innerHTML = `
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th></th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector("tbody");

        if (items.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="5"><em>No transactions for this month</em></td>`;
            tbody.appendChild(tr);
        } else {
            items.forEach(item => {
                const tr = document.createElement("tr");

                const editUrl = `/Expenses/Edit/${item.Id}`;
                const deleteUrl = `/Expenses/Delete/${item.Id}`;

                tr.innerHTML = `
                    <td>${escapeHtml(item.Description)}</td>
                    <td>${Number(item.Amount).toFixed(2)}</td>
                    <td>${escapeHtml(formatDateStr(item.Date))}</td>
                    <td>${escapeHtml(item.CategoryName)}</td>
                    <td>
                        <a href="${editUrl}">Edit</a>
                        &nbsp;
                        <a href="${deleteUrl}">Delete</a>
                    </td>
                `;

                tbody.appendChild(tr);
            });
        }

        scrollWrap.appendChild(table);
        container.appendChild(scrollWrap);

        const footer = document.createElement("div");
        footer.className = "sticky-footer";

        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = "Confirm (Reload)";
        confirmBtn.className = "btn btn-primary";
        confirmBtn.addEventListener("click", () => location.reload());

        const returnBtn = document.createElement("button");
        returnBtn.textContent = "Return";
        returnBtn.className = "btn btn-secondary";
        returnBtn.addEventListener("click", () => {
            rightPane.innerHTML = originalRightPaneHtml;
            restoreLeftChart();
        });

        const createBtn = document.createElement("a");
        createBtn.href = "/Expenses/Create";
        createBtn.className = "btn btn-link";
        createBtn.textContent = "Create New";

        footer.appendChild(confirmBtn);
        footer.appendChild(returnBtn);
        footer.appendChild(createBtn);

        container.appendChild(footer);

        rightPane.innerHTML = "";
        rightPane.appendChild(container);
    }

})();
