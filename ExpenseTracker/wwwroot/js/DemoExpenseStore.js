/* Browser-only demo storage. No HTTP, cookies or persistent browser storage. */
(function () {
    "use strict";

    class DemoExpenseStore {
        #initial;
        #items;
        #categories;
        #nextId;

        constructor(initialExpenses, categories) {
            this.#categories = structuredClone(categories);
            const ids = new Set();
            this.#items = initialExpenses.map(item => {
                if (!Number.isSafeInteger(item.Id) || item.Id < 1 || ids.has(item.Id)) {
                    throw new Error("Demo data has an invalid or duplicate expense ID.");
                }
                ids.add(item.Id);
                return { Id: item.Id, ...this.#validate(item) };
            });
            this.#initial = structuredClone(this.#items);
            this.#resetNextId();
        }

        getAll() {
            return structuredClone(this.#items);
        }

        getCategories() {
            return structuredClone(this.#categories);
        }

        create(request) {
            const fields = this.#validate(request);
            if (!Number.isSafeInteger(this.#nextId)) {
                throw new Error("Refresh the demo before adding more expenses.");
            }
            const expense = { Id: this.#nextId++, ...fields };
            this.#items.push(expense);
            return structuredClone(expense);
        }

        edit(id, request) {
            const index = this.#findIndex(id);
            const fields = this.#validate(request);
            this.#items[index] = { Id: this.#items[index].Id, ...fields };
            return structuredClone(this.#items[index]);
        }

        delete(id) {
            this.#items.splice(this.#findIndex(id), 1);
        }

        regenerate() {
            this.#items = structuredClone(this.#initial);
            this.#resetNextId();
            return this.getAll();
        }

        #findIndex(id) {
            const expenseId = Number(id);
            const index = Number.isSafeInteger(expenseId)
                ? this.#items.findIndex(item => item.Id === expenseId)
                : -1;
            if (index < 0) throw new Error("Expense not found.");
            return index;
        }

        #resetNextId() {
            this.#nextId = this.#items.reduce((max, item) => Math.max(max, item.Id), 0) + 1;
        }

        #validate(request) {
            const description = typeof request.Description === "string" ? request.Description.trim() : "";
            if (!description || description.length > 200) {
                throw new Error("Enter a description between 1 and 200 characters.");
            }

            const amountText = String(request.Amount ?? "").trim();
            const amount = Number(amountText);
            if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount < 0.01 || amount > 999999.99) {
                throw new Error("Enter an amount from £0.01 to £999,999.99 with at most two decimal places.");
            }

            const dateText = String(request.Date ?? "");
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
                throw new Error("Enter a valid calendar date.");
            }

            const [year, month, day] = dateText.split("-").map(Number);
            const date = new Date(0);
            date.setUTCFullYear(year, month - 1, day);

            if (year < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
                throw new Error("Enter a valid calendar date.");
            }

            const categoryId = Number(request.CategoryId);
            const category = Number.isSafeInteger(categoryId) ? this.#categories.find(item => item.Id === categoryId) : null;
            if (!category) throw new Error("Select a valid category.");

            return {
                Description: description,
                Amount: Math.round(amount * 100) / 100,
                Date: dateText,
                CategoryId: category.Id,
                CategoryName: category.Name
            };
        }
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = DemoExpenseStore;
    } else {
        globalThis.DemoExpenseStore = DemoExpenseStore;
    }
})();
