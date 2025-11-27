(function () {

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
    const categoryOrder = Object.keys(categoryColors);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const getMonthKey = d => {
        const dt = new Date(d);
        return isNaN(dt) ? null : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    };

    const escapeHtml = str =>
        String(str ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    const sortCategories = (labels, values, colors) => {
        const zipped = labels.map((l, i) => ({
            label: l,
            value: values[i],
            color: colors[i],
            order: categoryOrder.indexOf(l)
        })).sort((a, b) => a.order - b.order);

        return {
            labels: zipped.map(z => z.label),
            values: zipped.map(z => z.value),
            colors: zipped.map(z => z.color)
        };
    };

    const itemsByMonth = {};
    const currentMonth = getMonthKey(new Date());
    let currentSelectedMonthKey = currentMonth;

    window.data.forEach(e => {
        const m = getMonthKey(e.Date);
        if (!m) return;
        (itemsByMonth[m] ||= []).push(e);
    });

    const rightPanel = document.getElementById("rightPane");
    const originalRightPaneHtml = rightPanel.innerHTML;

    let PieCharts = {};
    let currentMonthChart = null;
    let avgChart = null;


    function createPieChart(canvas, labels, values, colors, title = null, hideLegend = false) {
        return new Chart(canvas.getContext("2d"), {
            type: "pie",
            data: { labels, datasets: [{ backgroundColor: colors, data: values }] },
            options: {
                legend: { display: !hideLegend },
                title: title ? { display: true, text: title } : undefined
            }
        });
    }

    function GenerateCurrentMonthPieChart() {
        currentMonthChart = createPieChart(
            document.getElementById("currentMonthChart"),
            [], [], [],
            "Current Month"
        );
    }

    function GenerateAveragePieChart() {
        const categoryTotals = {};

        Object.entries(itemsByMonth).forEach(([m, items]) => {
            items.forEach(e => {
                const c = e.CategoryName;
                (categoryTotals[c] ??= { total: 0, months: new Set() });
                categoryTotals[c].total += +e.Amount;
                categoryTotals[c].months.add(m);
            });
        });

        const labels = Object.keys(categoryTotals);
        const values = labels.map(c => (categoryTotals[c].total / categoryTotals[c].months.size).toFixed(2));
        const colors = labels.map(l => categoryColors[l] ?? "#000");

        const sorted = sortCategories(labels, values, colors);

        avgChart = createPieChart(
            document.getElementById("avgChart"),
            sorted.labels, sorted.values, sorted.colors,
            "Average Monthly Expenses per Category"
        );
    }

    function GenerateOtherMonthPieCharts() {
        const container = document.getElementById("monthsContainer");

        Object.keys(itemsByMonth)
            .sort().reverse()
            .filter(m => m !== currentMonth)
            .forEach(monthKey => {

                const wrapper = document.createElement("div");
                wrapper.className = "month-card";

                const [y, mm] = monthKey.split("-");
                wrapper.innerHTML = `<h4>${monthNames[mm - 1]} ${y}</h4>`;

                const canvas = document.createElement("canvas");
                wrapper.appendChild(canvas);

                const grouping = {};
                itemsByMonth[monthKey].forEach(e => {
                    grouping[e.CategoryName] = (grouping[e.CategoryName] || 0) + +e.Amount;
                });

                const labels = Object.keys(grouping);
                const vals = labels.map(c => grouping[c].toFixed(2));
                const colors = labels.map(l => categoryColors[l] ?? "#000");

                const sorted = sortCategories(labels, vals, colors);

                PieCharts[monthKey] = createPieChart(canvas, sorted.labels, sorted.values, sorted.colors, null, true);

                const btn = document.createElement("button");
                btn.textContent = "Edit Month";
                btn.className = "edit-month-btn";
                btn.onclick = () => showMonthDetails(monthKey);

                wrapper.appendChild(btn);
                container.appendChild(wrapper);
            });
    }

    /*Functions for dealing with chartts update*/

    function UpdateAllCharts() {
        // rebuild month groups
        for (const k in itemsByMonth) delete itemsByMonth[k];
        window.data.forEach(e => {
            const m = getMonthKey(e.Date);
            if (!m) return;
            (itemsByMonth[m] ||= []).push(e);
        });

        updateLeftPieChartForMonth(currentSelectedMonthKey);

        Object.entries(PieCharts).forEach(([m, chart]) => {
            const group = {};
            (itemsByMonth[m] || []).forEach(e => {
                group[e.CategoryName] = (group[e.CategoryName] || 0) + +e.Amount;
            });

            const labels = Object.keys(group);
            const vals = labels.map(l => group[l].toFixed(2));
            const colors = labels.map(l => categoryColors[l] ?? "#000");

            const sorted = sortCategories(labels, vals, colors);

            chart.data.labels = sorted.labels;
            chart.data.datasets[0].data = sorted.values;
            chart.data.datasets[0].backgroundColor = sorted.colors;
            chart.update();
        });

        GenerateAveragePieChart();
    }

    function updateLeftPieChartForMonth(monthKey) {
        const items = itemsByMonth[monthKey] || [];

        const grouped = {};
        items.forEach(e => {
            grouped[e.CategoryName] = (grouped[e.CategoryName] || 0) + +e.Amount;
        });

        const labels = Object.keys(grouped);
        const values = labels.map(l => grouped[l].toFixed(2));
        const colors = labels.map(l => categoryColors[l] ?? "#000");

        const sorted = sortCategories(labels, values, colors);

        const [y, m] = monthKey.split("-");
        const label = `${monthNames[m - 1]} ${y}`;

        document.getElementById("LeftPieMonthTitle").textContent = label;

        currentMonthChart.data.labels = sorted.labels;
        currentMonthChart.data.datasets[0].data = sorted.values;
        currentMonthChart.data.datasets[0].backgroundColor = sorted.colors;
        currentMonthChart.options.title.text = "Expense for " + label;
        currentMonthChart.update();
    }

    /*Update top right panel - Monthly entries */
    function showMonthDetails(monthKey) {
        currentSelectedMonthKey = monthKey;
        updateLeftPieChartForMonth(monthKey);

        const items = itemsByMonth[monthKey] || [];
        const [y, m] = monthKey.split("-");
        const label = `${monthNames[m - 1]} ${y}`;

        const container = document.createElement("div");
        container.className = "month-edit-container";

        container.innerHTML = `<h3>Editing expenses for ${label}</h3>`;

        const scrollWrap = document.createElement("div");
        scrollWrap.className = "month-edit-scroll";

        const table = document.createElement("table");
        table.className = "table table-overflow";
        table.innerHTML = `
            <thead>
                <tr><th>Description</th><th>Amount</th><th>Date</th><th>Category</th><th></th></tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector("tbody");

        if (!items.length) {
            tbody.innerHTML = `<tr><td colspan="5"><em>No transactions for this month</em></td></tr>`;
        } else {
            const token = document.querySelector('#anti-forgery-token input[name="__RequestVerificationToken"]')?.value ?? "";
            const deleteUrl = window.deleteExpenseUrl;

            items.sort((a, b) => new Date(b.Date) - new Date(a.Date));

            items.forEach(item => {
                const tr = document.createElement("tr");
                tr.id = `row+${item.Id}`;
                tr.innerHTML = `
                    <td>${escapeHtml(item.Description)}</td>
                    <td>${(+item.Amount).toFixed(2)}</td>
                    <td>${new Date(item.Date).toLocaleDateString()}</td>
                    <td>${escapeHtml(item.CategoryName)}</td>
                    <td class="actions-cell">
                        <button id="edit+${item.Id}" class="btn btn-sm btn-edit"
                                onclick='SwapToEdit(${JSON.stringify(item)})'>Edit</button>

                        <form id="deleteForm+${item.Id}" action="${deleteUrl}/${item.Id}" method="post" style="display:inline;">
                            <input name="__RequestVerificationToken" type="hidden" value="${token}" />
                            <input type="hidden" name="formMonthSelected" value="${monthKey}" />
                            <button type="button" id="delete+${item.Id}"
                                    class="btn btn-sm btn-delete"
                                    onclick="SwapToConfirm(${item.Id})">Delete</button>
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
            const ret = document.createElement("button");
            ret.className = "btn btn-primary";
            ret.textContent = "Return";
            ret.onclick = () => {
                rightPanel.innerHTML = originalRightPaneHtml;
                showMonthDetails(currentMonth);
            };
            footer.appendChild(ret);
        }

        const createBtn = document.createElement("button");
        createBtn.textContent = "Create New";
        createBtn.className = "btn btn-primary";
        createBtn.onclick = SwapToCreate;

        footer.appendChild(createBtn);
        container.appendChild(footer);

        rightPanel.innerHTML = "";
        rightPanel.appendChild(container);
    }

    /*Entries functionality*/

    window.SwapToCreate = function () {
        const token = document.querySelector('#anti-forgery-token input[name="__RequestVerificationToken"]')?.value ?? "";
        const createUrl = window.createExpenseUrl;

        rightPanel.innerHTML = `
            <div class="create-panel-container">
                <h3>Create New Expense</h3>
                <form id="createForm" action="${createUrl}" method="post">
                    <input name="__RequestVerificationToken" type="hidden" value="${token}" />

                    <div class="form-field">
                        <label>Description</label>
                        <input type="text" name="Description" class="input-box" required />
                    </div>

                    <div class="form-field">
                        <label>Amount</label>
                        <input type="number" name="Amount" step="0.01" class="input-box" required />
                    </div>

                    <div class="form-field">
                        <label>Date</label>
                        <input type="date" name="Date" class="input-box" required />
                    </div>

                    <div class="form-field">
                        <label>Category</label>
                        <select name="CategoryId" class="input-box" required>
                            ${window.categoriesList.map(c => `<option value="${c.Id}">${escapeHtml(c.Name)}</option>`).join("")}
                        </select>
                    </div>

                    <div class="form-buttons">
                        <button type="button" class="btn btn-primary" id="createSubmitBtn">Create</button>
                        <button type="button" class="btn" id="createCancelBtn">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById("createCancelBtn").onclick = () => {
            rightPanel.innerHTML = originalRightPaneHtml;
            showMonthDetails(currentSelectedMonthKey);
        };
        document.getElementById("createSubmitBtn").onclick = SubmitCreateForm;
    };


    window.SubmitCreateForm = function () {
        const form = document.getElementById("createForm");
        const data = new FormData(form);

        fetch(form.action, { method: "POST", body: data, headers: { "X-Requested-With": "XMLHttpRequest" } })
            .then(r => r.json())
            .then(expense => {
                const normalized = {
                    Description: expense.description,
                    Amount: expense.amount,
                    Date: expense.date,
                    UserId: expense.userId,
                    Id: expense.id,
                    CategoryName: expense.categoryName
                };

                window.data.push(normalized);
                UpdateAllCharts();
                showMonthDetails(currentSelectedMonthKey);
            });
    };


    window.SwapToEdit = function (expense) {
        if (!expense.CategoryId) {
            const found = window.categoriesList.find(c => c.Name === expense.CategoryName);
            if (found) expense.CategoryId = found.Id;
        }

        const token = document.querySelector('#anti-forgery-token input[name="__RequestVerificationToken"]')?.value ?? "";
        const url = window.editExpenseUrl.replace("{id}", expense.Id);

        rightPanel.innerHTML = `
            <div class="create-panel-container">
                <h3>Edit Expense</h3>

                <form id="editForm" action="${url}" method="post">
                    <input name="__RequestVerificationToken" type="hidden" value="${token}" />
                    <input type="hidden" name="Id" value="${expense.Id}" />
                    <input type="hidden" name="UserId" value="${expense.UserId}" />

                    <div class="form-field">
                        <label>Description</label>
                        <input type="text" name="Description" class="input-box" value="${escapeHtml(expense.Description)}" required />
                    </div>

                    <div class="form-field">
                        <label>Amount</label>
                        <input type="number" name="Amount" class="input-box" step="0.01" value="${expense.Amount}" required />
                    </div>

                    <div class="form-field">
                        <label>Date</label>
                        <input type="date" name="Date" class="input-box" value="${expense.Date.substring(0, 10)}" required />
                    </div>

                    <div class="form-field">
                        <label>Category</label>
                        <select name="CategoryId" class="input-box" required>
                            ${window.categoriesList.map(c => `
                                <option value="${c.Id}" ${c.Id == expense.CategoryId ? "selected" : ""}>
                                    ${escapeHtml(c.Name)}
                                </option>`).join("")}
                        </select>
                    </div>

                    <div class="form-buttons">
                        <button type="button" class="btn btn-primary" id="editSubmitBtn">Save</button>
                        <button type="button" class="btn" id="editCancelBtn">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById("editCancelBtn").onclick = () => {
            rightPanel.innerHTML = originalRightPaneHtml;
            showMonthDetails(currentSelectedMonthKey);
        };
        document.getElementById("editSubmitBtn").onclick = SubmitEditForm;
    };


    window.SubmitEditForm = function () {
        const form = document.getElementById("editForm");
        const data = new FormData(form);

        fetch(form.action, { method: "POST", body: data, headers: { "X-Requested-With": "XMLHttpRequest" } })
            .then(r => r.json())
            .then(updated => {
                const normalized = {
                    Description: updated.description,
                    Amount: updated.amount,
                    Date: updated.date,
                    UserId: updated.userId,
                    Id: updated.id,
                    CategoryName: updated.categoryName,
                    CategoryId: updated.categoryId
                };

                const idx = window.data.findIndex(x => x.Id === normalized.Id);
                if (idx >= 0) window.data[idx] = normalized;

                UpdateAllCharts();
                showMonthDetails(currentSelectedMonthKey);
            });
    };


    window.SwapToConfirm = function (id) {
        const deleteBtn = document.getElementById("delete+" + id);
        const editBtn = document.getElementById("edit+" + id);
        const form = document.getElementById("deleteForm+" + id);
        const row = document.getElementById("row+" + id);

        if (deleteBtn.dataset.state !== "confirm") {
            deleteBtn.dataset.state = "confirm";
            deleteBtn.textContent = "Confirm Delete";
            deleteBtn.style.background = "red";
            editBtn.style.display = "none";

            setTimeout(() => {
                if (deleteBtn.dataset.state === "confirm") {
                    deleteBtn.dataset.state = "";
                    deleteBtn.textContent = "Delete";
                    deleteBtn.style.background = "";
                    editBtn.style.display = "inline-block";
                }
            }, 3000);
            return;
        }

        fetch(form.action, { method: "POST", body: new FormData(form) })
            .then(r => r.json().catch(() => ({})))
            .then(() => {
                row?.remove();
                window.data = window.data.filter(x => x.Id !== id);
                UpdateAllCharts();
            });
    };


    /*First load - Generate charts and details */
    document.addEventListener("DOMContentLoaded", () => {
        GenerateCurrentMonthPieChart();
        GenerateAveragePieChart();
        GenerateOtherMonthPieCharts();
        showMonthDetails(currentMonth);
    });

})();
