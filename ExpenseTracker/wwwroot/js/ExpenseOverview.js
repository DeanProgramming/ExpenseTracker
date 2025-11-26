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

    function sortCategories(labels, values, colors) {
        const zipped = labels.map((label, i) => ({
            label,
            value: values[i],
            color: colors[i],
            order: categoryOrder.indexOf(label)
        }));

        zipped.sort((a, b) => a.order - b.order);

        return {
            labels: zipped.map(z => z.label),
            values: zipped.map(z => z.value),
            colors: zipped.map(z => z.color)
        };
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
    const categoryOrder = Object.keys(categoryColors);


    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const currentMonth = getMonth(new Date());

    let currentSelectedMonthKey = getMonth(new Date());

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

    const rightPanel = document.getElementById("rightPane");
    const originalRightPaneHtml = rightPanel.innerHTML;

    //Bottom right Pie Chart
    let PieCharts = {};
    GenerateOtherMonthPieCharts();

    //Top Left Pie Chart
    let currentMonthChart = null;
    GenerateCurrentMonthPieChart();
     
    // Bottom Left Total average of all months NOT including current month
    let avgChart = null;
    GenerateAveragePieChart();

    function UpdateAllCharts() {
        // Get all new data 
        for (let k in itemsByMonth) delete itemsByMonth[k];

        let currentSelectedMonthItems = [];

        window.data.forEach(e => {
            const month = getMonth(e.Date);
            if (!month) return;

            if (month === currentSelectedMonthKey) {
                currentSelectedMonthItems.push(e);
            }

            if (!itemsByMonth[month]) itemsByMonth[month] = [];
            itemsByMonth[month].push(e);
        });

        //Update left pie charte
        let curAgg = {};
        currentSelectedMonthItems.forEach(e => {
            curAgg[e.CategoryName] = (curAgg[e.CategoryName] || 0) + Number(e.Amount);
        });

        const curLabels = Object.keys(curAgg);
        const curVals = curLabels.map(l => curAgg[l].toFixed(2));
        const curColors = curLabels.map(l => categoryColors[l] ?? "#000000");

        const sorted = sortCategories(curLabels, curVals, curColors);

        currentMonthChart.data.labels = sorted.labels;
        currentMonthChart.data.datasets[0].data = sorted.values;
        currentMonthChart.data.datasets[0].backgroundColor = sorted.colors;
        currentMonthChart.update();

         
        // Update other pie charts
        for (const mk in PieCharts) {
            const items = itemsByMonth[mk] || [];
            let agg = {};
            items.forEach(e => {
                agg[e.CategoryName] = (agg[e.CategoryName] || 0) + Number(e.Amount);
            });

            const labels = Object.keys(agg);
            const vals = labels.map(c => agg[c].toFixed(2));
            const colors = labels.map(l => categoryColors[l] ?? "#000000");

            const sortedOthers = sortCategories(labels, vals, colors);

            PieCharts[mk].data.labels = sortedOthers.labels;
            PieCharts[mk].data.datasets[0].data = sortedOthers.values;
            PieCharts[mk].data.datasets[0].backgroundColor = sortedOthers.colors;
            PieCharts[mk].update();
        }


        // Update average
        let categories = {};
        Object.keys(itemsByMonth).forEach(m => {
            itemsByMonth[m].forEach(e => {
                const cat = e.CategoryName;
                if (!categories[cat]) {
                    categories[cat] = { total: 0, months: new Set() };
                }
                categories[cat].total += Number(e.Amount);
                categories[cat].months.add(m);
            });
        });

        const avgLabels = Object.keys(categories);
        const avgVals = avgLabels.map(c => (categories[c].total / categories[c].months.size).toFixed(2));
        const avgColors = avgLabels.map(l => categoryColors[l] ?? "#000000");

        const sortedAverage = sortCategories(avgLabels, avgVals, avgColors);

        avgChart.data.labels = sortedAverage.labels;
        avgChart.data.datasets[0].data = sortedAverage.values;
        avgChart.data.datasets[0].backgroundColor = sortedAverage.colors;
        avgChart.update();
    }

    function GenerateAveragePieChart() {
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

        const sorted = sortCategories(avgLabels, avgData, backgroundColors);

        avgChart = new Chart(document.getElementById("avgChart").getContext('2d'), {
            type: "pie",
            data: {
                labels: sorted.labels,
                datasets: [{
                    backgroundColor: sorted.colors,
                    data: sorted.values
                }]
            },
            options: { title: { display: true, text: "Average Monthly Expenses per Category" } }
        });
    }
     
    function GenerateCurrentMonthPieChart() {
        const leftCanvas = document.getElementById("currentMonthChart").getContext("2d");

        currentMonthChart = new Chart(leftCanvas, {
            type: "pie",
            data: {
                datasets: [{}]
            },
            options: {
                title: { display: true, text: "Expense for Current Month " }
            }
        }); 
    }

    function GenerateOtherMonthPieCharts() {
        const monthsContainer = document.getElementById("monthsContainer");
        const monthsAgg = {};
        window.data.forEach(e => {
            const m = getMonth(e.Date);
            if (!m) return;

            monthsAgg[m] = monthsAgg[m] || {};
            monthsAgg[m][e.CategoryName] = (monthsAgg[m][e.CategoryName] || 0) + Number(e.Amount);
        });

        const monthKeys = Object.keys(monthsAgg).sort().reverse();

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

            const sorted = sortCategories(cats, vals, monthColours);

            PieCharts[mk] = new Chart(canvas.getContext("2d"), {
                type: "pie",
                data: {
                    labels: sorted.labels,
                    datasets: [{
                        backgroundColor: sorted.colors,
                        data: sorted.values
                    }]
                },
                options: { legend: { display: false } }
            });

            const btn = document.createElement("button");
            btn.textContent = "Edit Month";
            btn.className = "edit-month-btn";
            btn.addEventListener("click", () => showMonthDetails(mk));

            wrap.appendChild(btn);
            monthsContainer.appendChild(wrap);
        });
    }


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
         
        const sorted = sortCategories(labels, values, monthColours);

        currentMonthChart.data.labels = sorted.labels;
        currentMonthChart.data.datasets[0].data = sorted.values;
        currentMonthChart.data.datasets[0].backgroundColor = sorted.colors;
        currentMonthChart.options.title.text = "Expense for " + label;
        currentMonthChart.update();
    }

    // Update top right information for currently selected month
    function showMonthDetails(monthKey) {
        currentSelectedMonthKey = monthKey;

        updateLeftPieChartForMonth(currentSelectedMonthKey);

        const items = itemsByMonth[currentSelectedMonthKey] || [];
        const [y, m] = currentSelectedMonthKey.split("-");
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
            const editUrlBase = window.editExpenseUrl; // yields '/Expenses/Delete'

            items.sort((a, b) => new Date(b.Date) - new Date(a.Date));

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
                        <button id="edit+${item.Id}" type="button"
                                class="btn btn-sm btn-edit"
                                onclick='SwapToEdit(${JSON.stringify(item)})'>
                            Edit
                        </button>

                        <form id="deleteForm+${item.Id}" action="${deleteUrlBase}/${item.Id}" method="post" style="display:inline;">
                            <input type="hidden" name="id" value="${item.Id}" />
                            <input name="__RequestVerificationToken" type="hidden" value="${tokenValue}" />  
                            <input type="hidden"  id="formMonthSelected+${item.Id}" name="formMonthSelected" value="${monthKey}" />
                            <button type="button" id="delete+${item.Id}" class="btn btn-sm btn-delete" onclick="SwapToConfirm(${item.Id})">Delete</button>
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


        if (currentSelectedMonthKey !== currentMonth) {
            const returnBtn = document.createElement("button");
            returnBtn.textContent = "Return";
            returnBtn.className = "btn btn-primary";
            returnBtn.addEventListener("click", () => {
                rightPanel.innerHTML = originalRightPaneHtml;
                updateLeftPieChartForMonth(currentMonth);
                showMonthDetails(currentMonth);
            });
            footer.appendChild(returnBtn);
        }

        const createBtn = document.createElement("a");
        createBtn.onclick = SwapToCreate;
        createBtn.className = "btn btn-primary";
        createBtn.textContent = "Create New";

        footer.appendChild(createBtn);

        container.appendChild(footer); 

        rightPanel.innerHTML = "";
        rightPanel.appendChild(container);
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (typeof itemsByMonth === "undefined" || !currentMonth) {
            console.warn("itemsByMonth or currentMonthKey missing; right pane will be empty."); 
            return;
        }

        showMonthDetails(currentMonth);
    });


    window.SwapToCreate = SwapToCreate; 
    function SwapToCreate() {
        const tokenInput = document.querySelector('#anti-forgery-token input[name="__RequestVerificationToken"]');
        const tokenValue = tokenInput ? tokenInput.value : '';
        const createUrlBase = window.createExpenseUrl;

        const container = document.createElement("div");
        container.className = "create-panel-container";

        container.innerHTML = `
        <h3>Create New Expense</h3>

        <form id="createForm" action="${createUrlBase}" method="post">

            <input name="__RequestVerificationToken" type="hidden" value="${tokenValue}" />

            <div class="form-field">
                <label>Description</label>
                <input type="text" name="Description" class="input-box" required />
            </div>

            <div class="form-field">
                <label>Amount</label>
                <input type="number" name="Amount" class="input-box" step="0.01" required />
            </div>

            <div class="form-field">
                <label>Date</label>
                <input type="date" name="Date" class="input-box" required />
            </div>

            <div class="form-field">
                <label>Category</label>
                <select name="CategoryId" class="input-box" required>
                    ${window.categoriesList
                .map(c => `<option value="${c.Id}">${escapeHtml(c.Name)}</option>`)
                .join("")}
                </select>
            </div>

            <div class="form-buttons">
                <button type="button" class="btn btn-primary" id="createSubmitBtn">Create</button>
                <button type="button" class="btn" id="createCancelBtn">Cancel</button>
            </div>
        </form>
    `;

        rightPanel.innerHTML = "";
        rightPanel.appendChild(container);

        document.getElementById("createCancelBtn").onclick = () => {
            rightPanel.innerHTML = originalRightPaneHtml;
            showMonthDetails(currentSelectedMonthKey);
        };

        document.getElementById("createSubmitBtn").onclick = SubmitCreateForm;
    }

     
    window.SubmitCreateForm = SubmitCreateForm; 
    function SubmitCreateForm() {
        const form = document.getElementById("createForm");
        const data = new FormData(form);

        fetch(form.action, {
            method: "POST",
            body: data,
            headers: {
                "X-Requested-With": "XMLHttpRequest" // ← IMPORTANT!
            }
        })
            .then(response => {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.json();
            })
            .then(expense => {
                console.log("Created expense:", expense);

                const normalized = { /* camel Case and Pascal Case mismatching */
                    Description: expense.description,
                    Amount: expense.amount,
                    Date: expense.date,
                    UserId: expense.userId,
                    Id: expense.id,
                    CategoryName: expense.categoryName
                };


                // Ensure window.data exists
                window.data = window.data || [];

                window.data.push(normalized);

                UpdateAllCharts();
                showMonthDetails(currentSelectedMonthKey);
            })
            .catch(err => console.error("Create failed:", err));
    } 


    window.SwapToEdit = SwapToEdit;
    function SwapToEdit(expense) {
        const tokenInput = document.querySelector('#anti-forgery-token input[name="__RequestVerificationToken"]');
        const tokenValue = tokenInput ? tokenInput.value : '';

        const editUrl = window.editExpenseUrl.replace("{id}", expense.Id);

        const container = document.createElement("div");
        container.className = "create-panel-container";

        container.innerHTML = `
        <h3>Edit Expense</h3>

        <form id="editForm" action="${editUrl}" method="post">

            <input name="__RequestVerificationToken" type="hidden" value="${tokenValue}" />

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
                    ${window.categoriesList
                .map(c =>
                    `<option value="${c.Id}" ${c.Id === expense.CategoryId ? "selected" : ""}>
                                ${escapeHtml(c.Name)}
                            </option>`
                ).join("")}
                </select>
            </div>

            <div class="form-buttons">
                <button type="button" class="btn btn-primary" id="editSubmitBtn">Save</button>
                <button type="button" class="btn" id="editCancelBtn">Cancel</button>
            </div>
        </form>
    `;

        rightPanel.innerHTML = "";
        rightPanel.appendChild(container);

        document.getElementById("editCancelBtn").onclick = () => {
            rightPanel.innerHTML = originalRightPaneHtml;
            showMonthDetails(currentSelectedMonthKey);
        };

        document.getElementById("editSubmitBtn").onclick = SubmitEditForm;
    }


    window.SubmitEditForm = SubmitEditForm;
    function SubmitEditForm() {
        const form = document.getElementById("editForm");
        const data = new FormData(form);

        fetch(form.action, {
            method: "POST",
            body: data,
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        })
            .then(response => {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.json();
            })
            .then(updated => {
                console.log("Updated expense:", updated);

                // Normalize casing (your current frontend format)
                const normalized = {
                    Description: updated.description,
                    Amount: updated.amount,
                    Date: updated.date,
                    UserId: updated.userId,
                    Id: updated.id,
                    CategoryName: updated.categoryName,
                    CategoryId: updated.categoryId
                };

                // Update in window.data
                window.data = window.data || [];
                const index = window.data.findIndex(x => x.Id === normalized.Id);
                if (index >= 0) {
                    window.data[index] = normalized;
                }

                UpdateAllCharts();
                showMonthDetails(currentSelectedMonthKey); 
            })
            .catch(err => console.error("Edit failed:", err));
    }


    window.SwapToConfirm = SwapToConfirm;
    function SwapToConfirm(id) {
        const deleteBtn = document.getElementById("delete+" + id);
        const editBtn = document.getElementById("edit+" + id);
        const form = document.getElementById("deleteForm+" + id);
        const row = document.getElementById("row+" + id);
        const selectedMonth = document.getElementById("formMonthSelected+" + id);

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
            const data = new FormData(form);

            fetch(form.action, {
                method: "POST",
                body: data
            })
            .then(response => {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.json().catch(() => ({})); // fallback if no JSON returned
            })
            .then(() => { 
                if (row) row.remove();
                 
                window.data = window.data.filter(x => x.Id !== id); 
                UpdateAllCharts();
            })
            .catch(err => console.error("Delete failed:", err));
        }
    }
})();
