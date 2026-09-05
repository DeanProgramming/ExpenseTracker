(function () {
    "use strict";

    function mount({ store, initial, copy, onError = () => { }, onRegenerated }) {
        const root = document.getElementById("expense-dashboard");
        if (!root) return;
        const byId = id => document.getElementById(id);
        const status = byId("demo-status");
        const styles = getComputedStyle(root);
        const colourFor = name => {
            const key = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
            return styles.getPropertyValue("--color-" + key).trim()
                || styles.getPropertyValue("--color-misc").trim();
        };

        const displayCategories = () => store.getCategories().map(category => ({
            ...category, Color: colourFor(category.Name)
        }));

        let categories = displayCategories();
        let busy = false;
        const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
        const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
        const dateFormat = new Intl.DateTimeFormat("en-GB");
        // Treat ISO dates as local calendar dates, not UTC timestamps.
        const dateLabel = date => dateFormat.format(new Date(date + "T12:00:00"));
        const monthLabel = month => monthFormat.format(new Date(month + "-01T12:00:00"));
        const currentMonth = initial.CurrentMonth;
        let selectedMonth = currentMonth;
        let editingId = null;
        const charts = [];
        const monthSelect = byId("demo-month");
        const dialog = byId("demo-expense-dialog");
        const form = byId("demo-expense-form");
        const formError = byId("demo-form-error");
        const descriptionInput = byId("demo-description");
        const amountInput = byId("demo-amount");
        const dateInput = byId("demo-date");
        const categoryInput = byId("demo-category");

        const element = (tag, text, className) => {
            const result = document.createElement(tag);
            if (text !== undefined) result.textContent = text;
            if (className) result.className = className;
            return result;
        };

        const button = (text, onClick, className = "demo-button demo-button-secondary") => {
            const result = element("button", text, className);
            result.type = "button";
            result.addEventListener("click", onClick);
            return result;
        };

        const pennies = items => items.reduce((total, item) => total + Math.round(item.Amount * 100), 0);

        const categoryTotals = items => {
            const totals = new Map(categories.map(category => [category.Id, 0]));
            for (const item of items) {
                totals.set(item.CategoryId, totals.get(item.CategoryId) + Math.round(item.Amount * 100));
            }
            return categories.map(category => ({ ...category, Pennies: totals.get(category.Id) }))
                .filter(category => category.Pennies > 0);
        };

        function announce(message) {
            status.textContent = message;
            status.classList.remove("demo-error");
        }

        function reportError(error) {
            status.textContent = error.message || "Unable to complete this action. Please try again.";
            status.classList.add("demo-error");
            onError(error);
        }

        function setBusy(value) {
            busy = value;
            root.setAttribute("aria-busy", String(value));
            root.querySelectorAll("button, input, select").forEach(control => {
                control.disabled = value;
            });
            if (!value && categories.length === 0) {
                byId("demo-create").disabled = true;
                byId("demo-save").disabled = true;
                categoryInput.disabled = true;
            }
        }

        function drawPie(canvas, totals, divisor = 1) {
            if (typeof Chart !== "function") {
                byId("demo-chart-warning").hidden = false;
                canvas.hidden = true;
                return;
            }
            try {
                charts.push(new Chart(canvas.getContext("2d"), {
                    type: "pie",
                    data: {
                        labels: totals.map(category => category.Name),
                        datasets: [{
                            data: totals.map(category => Number((category.Pennies / 100 / divisor).toFixed(2))),
                            backgroundColor: totals.map(category => category.Color)
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 0 },
                        legend: { display: false },
                        tooltips: {
                            callbacks: {
                                label: (item, data) =>
                                    data.labels[item.index] + ": " + money.format(data.datasets[0].data[item.index])
                            }
                        }
                    }
                }));
            } catch (error) {
                byId("demo-chart-warning").hidden = false;
                canvas.hidden = true;
                console.error(error);
            }
        }

        function openForm(expense = null) {
            if (busy || categories.length === 0) return;
            editingId = expense ? expense.Id : null;
            form.reset();
            formError.hidden = true;
            byId("demo-form-title").textContent = expense ? "Edit expense" : "Create expense";
            byId("demo-save").textContent = expense ? "Save changes" : "Create expense";
            descriptionInput.value = expense ? expense.Description : "";
            amountInput.value = expense ? expense.Amount.toFixed(2) : "";
            dateInput.value = expense ? expense.Date : selectedMonth + "-01";
            categoryInput.value = expense ? expense.CategoryId : categories[0].Id;
            dialog.showModal();
            descriptionInput.focus();
        }

        async function removeExpense(item) {
            if (busy || !window.confirm('Delete "' + item.Description + '"' + copy.deleteSuffix)) return;

            setBusy(true);

            try {
                await store.delete(item.Id);
                render();
                announce(copy.deleted);
            } catch (error) {
                reportError(error);
            } finally {
                setBusy(false);
            }
        }

        function renderRows(items) {

            const body = byId("demo-expense-rows");
            body.replaceChildren();
            if (items.length === 0) {
                const row = element("tr");



                const cell = element("td", "No transactions for this month. Try creating one.");
                cell.colSpan = 5;
                row.appendChild(cell);
                body.appendChild(row);
                return;
            }
            for (const item of [...items].sort((a, b) => b.Date.localeCompare(a.Date) || b.Id - a.Id)) {
                const row = element("tr");
                row.dataset.expenseId = item.Id;
                row.append(
                    element("td", item.Description),
                    element("td", money.format(item.Amount)),
                    element("td", dateLabel(item.Date)),
                    element("td", item.CategoryName)
                );
                const actions = element("td");
                const group = element("div", undefined, "demo-row-actions");
                const edit = button("Edit", () => openForm(item));
                edit.dataset.action = "edit";
                edit.setAttribute("aria-label", "Edit " + item.Description);
                const remove = button("Delete", () => removeExpense(item), "demo-button demo-button-danger");
                remove.dataset.action = "delete";
                remove.setAttribute("aria-label", "Delete " + item.Description);
                group.append(edit, remove);
                actions.appendChild(group);
                row.appendChild(actions);
                body.appendChild(row);
            }
        }

        function render() {

            for (const chart of charts)
            {
                chart.destroy()
            };

            charts.length = 0;
            const items = store.getAll();
            categories = displayCategories();
            categoryInput.replaceChildren();

            for (const category of categories)
            {
                const option = element("option", category.Name);
                option.value = category.Id;
                categoryInput.appendChild(option);
            }

            const groups = new Map();
            for (const item of items)
            {
                const month = item.Date.slice(0, 7);
                if (!groups.has(month)) groups.set(month, []);
                groups.get(month).push(item);
            }

            const months = [...new Set([currentMonth, ...groups.keys()])].sort().reverse();

            if (!months.includes(selectedMonth)) selectedMonth = currentMonth;

            monthSelect.replaceChildren();

            for (const month of months) {
                const option = element("option", monthLabel(month));
                option.value = month;
                monthSelect.appendChild(option);
            }

            monthSelect.value = selectedMonth;
            const selectedItems = groups.get(selectedMonth) || [];
            const totals = categoryTotals(selectedItems);
            byId("demo-month-title").textContent = monthLabel(selectedMonth);
            byId("demo-table-title").textContent = "Expenses / " + monthLabel(selectedMonth);
            byId("demo-month-total").textContent = money.format(pennies(selectedItems) / 100);
            renderRows(selectedItems);
            drawPie(byId("demo-month-chart"), totals);

            const legend = byId("demo-category-totals");
            legend.replaceChildren();
            for (const category of totals) {
                const item = element("li");
                const swatch = element("span", "", "demo-swatch");
                swatch.style.backgroundColor = category.Color;
                swatch.setAttribute("aria-hidden", "true");
                item.append(swatch, element("span", category.Name), element("strong", money.format(category.Pennies / 100)));
                legend.appendChild(item);
            }

            const divisor = groups.size || 1;
            byId("demo-average-note").textContent = groups.size ? "Across " + groups.size + " months containing expenses" : "Add an expense to see monthly averages.";
            drawPie(byId("demo-average-chart"), categoryTotals(items), divisor);

            const history = byId("demo-months");
            history.replaceChildren();

            for (const month of months.filter(value => value !== selectedMonth)) {
                const monthItems = groups.get(month) || [];
                const card = element("article", undefined, "demo-month-card");
                card.append(element("h3", monthLabel(month)), element("p", money.format(pennies(monthItems) / 100)));
                const chartWrapper = element("div", undefined, "demo-mini-chart");
                const canvas = element("canvas");
                canvas.setAttribute("role", "img");
                canvas.setAttribute("aria-label", "Spending by category for " + monthLabel(month));
                chartWrapper.appendChild(canvas);
                card.appendChild(chartWrapper);
                card.appendChild(button("View month", () => {
                    selectedMonth = month;
                    render();
                    monthSelect.focus();
                }));
                history.appendChild(card);
                drawPie(canvas, categoryTotals(monthItems));
            }
        }

        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (busy || !form.reportValidity())
            {
                return;
            }

            const request = Object.fromEntries(new FormData(form));
            const wasEditing = editingId !== null;
            formError.hidden = true;
            setBusy(true);

            try {
                const saved = wasEditing ? await store.edit(editingId, request) : await store.create(request);
                selectedMonth = saved.Date.slice(0, 7);
                dialog.close();
                render();
                announce(wasEditing ? copy.edited : copy.created);

            } catch (error) {
                formError.textContent = error.message || "Unable to save this expense.";
                formError.hidden = false;
                reportError(error);
            } finally {
                setBusy(false);
            }
        });

        byId("demo-cancel").addEventListener("click", () => {
            if (!busy) dialog.close();
        });

        dialog.addEventListener("cancel", event => {
            if (busy) event.preventDefault();
        });

        byId("demo-create").addEventListener("click", () => openForm());

        byId("demo-regenerate").addEventListener("click", async () => {
            if (busy || !window.confirm(copy.regenerateConfirm)) return;
            setBusy(true);
            announce("Regenerating expenses...");
            try {
                await store.regenerate();
                if (onRegenerated) {
                    announce(copy.regenerated);
                    onRegenerated();
                    return;
                }

                selectedMonth = currentMonth;
                render();
                announce(copy.regenerated);
            } catch (error) {
                reportError(error);
            } finally {
                setBusy(false);
            }
        });
        monthSelect.addEventListener("change", () => {
            if (busy) return;
            selectedMonth = monthSelect.value;
            render();
        });

        render();
        setBusy(false);
        announce(copy.ready);
    }

    globalThis.ExpenseDashboard = { mount };
})();
