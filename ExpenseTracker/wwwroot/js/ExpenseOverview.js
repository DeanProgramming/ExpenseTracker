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
     
    const categoryColors = {
        "Rent": "#b91d47",
        "Transport": "#00aba9",
        "Food": "#2b5797",
        "Groceries": "#e8c3b9",
        "Coffee": "#1e7145",
        "Utilities": "#ff9900",
        "Entertainment": "#ffcc00",
        "Subscriptions": "#66ccff",
        "Shopping": "#cc66ff",
        "Education": "#99ff99",
        "Misc": "#ff6666"  
    };


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
    const backgroundColors = avgLabels.map(label =>
        categoryColors[label] ?? "#000000"
    );

    const avgChart = new Chart(document.getElementById("avgChart").getContext('2d'), {
        type: "pie",
        data: {
            labels: avgLabels,
            datasets: [{ backgroundColor: backgroundColors, data: avgData }]
        },
        options: { title: { display: true, text: "Average Monthly Expenses per Category" } }
    });

    // Bottom right pie charts of each past month with option to edit data
    const monthsContainer = document.getElementById("monthsContainer");

    const monthsAgg = {};
    window.data.forEach(e => {
        const m = getMonth(e.Date);
        if (!m) return;

        monthsAgg[m] = monthsAgg[m] || {};
        monthsAgg[m][e.CategoryName] = (monthsAgg[m][e.CategoryName] || 0) + Number(e.Amount);
    });

    const monthKeys = Object.keys(monthsAgg).sort().reverse();
    const rightPane = document.getElementById("rightPane");
    const originalRightPaneHtml = rightPane.innerHTML;

    monthKeys.forEach(mk => {
        const m = getMonth(mk);
        if (m === currentMonth) return;

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
        const monthColours = cats.map(label =>
            categoryColors[label] ?? "#000000"
        );

        new Chart(canvas.getContext("2d"), {
            type: "pie",
            data: { labels: cats, datasets: [{ data: vals, backgroundColor: monthColours }] },
            options: { legend: { display: false } }
        });

        const btn = document.createElement("button");
        btn.textContent = "Edit Month";
        btn.className = "edit-month-btn";
        btn.addEventListener("click", () => showMonthDetails(mk));

        wrap.appendChild(btn);
        monthsContainer.appendChild(wrap);
    });


    let currentMonthChart = null;
    const leftCanvas = document.getElementById("currentMonthChart").getContext("2d");

    currentMonthChart = new Chart(leftCanvas, {
        type: "pie",
        data: {
            datasets: [{ }]
        },
        options: {
            title: { display: true, text: "Expense for Current Month "}
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

        document.getElementById("LeftPieMonthTitle").textContent = label;
        if (document.getElementById("ExpenseTableTitle") != null)
        {
            document.getElementById("ExpenseTableTitle").textContent = "Editing expenses for " + label;
        }

        const monthColours = labels.map(label =>
            categoryColors[label] ?? "#000000"
        );

        currentMonthChart.data.labels = labels;
        currentMonthChart.data.datasets[0].data = values;
        currentMonthChart.data.datasets[0].backgroundColor = monthColours;
        currentMonthChart.options.title.text = "Expense for " + label;
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
        table.className = "table table-overflow ";

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
            const deleteUrlBase = window.deleteExpenseUrl; // yields '/Expenses/Delete'

            items.forEach(item => {
                const tokenInput = document.querySelector('#anti-forgery-token input[name="__RequestVerificationToken"]');
                const tokenValue = tokenInput ? tokenInput.value : '';

                const tr = document.createElement("tr");
                tr.id = `row+${item.Id}`; 

                tr.innerHTML = `
                    <td>${escapeHtml(item.Description)}</td>
                    <td>${Number(item.Amount).toFixed(2)}</td>
                    <td>${escapeHtml(formatDateStr(item.Date))}</td>
                    <td>${escapeHtml(item.CategoryName)}</td> 
                    <td class="actions-cell"> 
                        <button id="edit+${item.Id}" onclick="swapToConfirm(${item.Id})" class="btn btn-sm btn-edit">Edit</button>
                        <form id="deleteForm+${item.Id}" action="${deleteUrlBase}/${item.Id}" method="post" style="display:inline;">
                            <input type="hidden" name="id" value="${item.Id}" />
                            <input name="__RequestVerificationToken" type="hidden" value="${tokenValue}" />  
                            <button type="button" id="delete+${item.Id}" class="btn btn-sm btn-delete" onclick="swapToConfirm(${item.Id})">Delete</button>
                        </form>
                    </td>
                `;

                tbody.appendChild(tr);
            });
        }

        scrollWrap.appendChild(table);
        container.appendChild(scrollWrap);

        const footer = document.createElement("div");
        footer.className = "sticky-footer";


        if (monthKey !== currentMonth) {
            const returnBtn = document.createElement("button");
            returnBtn.textContent = "Return";
            returnBtn.className = "btn btn-primary";
            returnBtn.addEventListener("click", () => {
                rightPane.innerHTML = originalRightPaneHtml;
                updateLeftPieChartForMonth(currentMonth);
                showMonthDetails(currentMonth);
            });
            footer.appendChild(returnBtn);
        }

        const createBtn = document.createElement("a");
        createBtn.href = "/Expenses/Create";
        createBtn.className = "btn btn-primary";
        createBtn.textContent = "Create New";

        footer.appendChild(createBtn);

        container.appendChild(footer);

        rightPane.innerHTML = "";
        rightPane.appendChild(container);
    }

    document.addEventListener("DOMContentLoaded", function () {
        const selectedMonthInput = document.getElementById("currentSelectedMonth");
        const currentSelectedMonth = selectedMonthInput ? selectedMonthInput.value : null;

        const monthToUse = currentSelectedMonth && currentSelectedMonth !== ""
            ? currentSelectedMonth
            : currentMonth;

        if (typeof itemsByMonth === "undefined" || !monthToUse) {
            console.warn("itemsByMonth or monthToUse missing; right pane will be empty.");
            return;
        }

        showMonthDetails(monthToUse);
    });

    window.swapToConfirm = swapToConfirm;
    function swapToConfirm(id) {
        const deleteBtn = document.getElementById("delete+" + id);
        const editBtn = document.getElementById("edit+" + id);
        const form = document.getElementById("deleteForm+" + id);

        if (deleteBtn.dataset.state !== "confirm") {
            deleteBtn.dataset.state = "confirm";
            deleteBtn.textContent = "Confirm Delete";
            deleteBtn.style.background = "red";

            editBtn.style.display = 'none';

            setTimeout(() => {
                if (deleteBtn.dataset.state === "confirm") {
                    deleteBtn.dataset.state = "";
                    deleteBtn.textContent = "Delete";
                    deleteBtn.style.background = "";
                    editBtn.style.display = 'inline-block';
                }
            }, 3000);

        } else {
            form.submit();
        }
    }
})();
