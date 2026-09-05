/* Used only by the authorized /Expenses view. Never loaded by /Demo. */
(function () {
    "use strict";

    const field = (value, name) => value[name] ?? value[name[0].toLowerCase() + name.slice(1)];

    class ExpenseApiStore {
        #items;
        #categories;
        #endpoints;
        #token;
        #fetch;

        constructor(initial, endpoints, token, fetchRequest = globalThis.fetch.bind(globalThis))
        {
            if (!token) throw new Error("Refresh the page before changing expenses.");
            this.#token = token;
            this.#fetch = fetchRequest;
            this.#endpoints = {};
            for (const action of ["Create", "Edit", "Delete", "Regenerate"])
            {
                const url = endpoints[action];
                if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//") || url.includes("\\"))
                {
                    throw new Error("Expense actions must use this application's URLs.");
                }
                this.#endpoints[action] = url;
            }
            this.#replaceDashboard(initial);
        }

        getAll() {
            return structuredClone(this.#items);
        }

        getCategories() {
            return structuredClone(this.#categories);
        }

        async create(request) {
            const result = await this.#post("Create", this.#fields(request));
            const expense = this.#readExpense(result, this.#categories);
            this.#items.push(expense);
            return structuredClone(expense);
        }

        async edit(id, request) {
            const index = this.#findIndex(id);
            const result = await this.#post("Edit", this.#fields(request), this.#items[index].Id);
            const expense = this.#readExpense(result, this.#categories);
            if (expense.Id !== this.#items[index].Id)
            {
                throw new Error("The response did not match this expense. Refresh the page.");
            }
            this.#items[index] = expense;
            return structuredClone(expense);
        }

        async delete(id) {
            const index = this.#findIndex(id);
            await this.#post("Delete", undefined, this.#items[index].Id);
            this.#items.splice(index, 1);
        }

        async regenerate() {
            const result = await this.#post("Regenerate");
            if (result?.success !== true)
            {
                throw new Error("Unexpected regeneration response. Refresh the page to check your expenses.");
            }

            return result;
        }

        #findIndex(id) {
            const expenseId = Number(id);
            const index = Number.isSafeInteger(expenseId) ? this.#items.findIndex(item => item.Id === expenseId) : -1;
            if (index < 0) throw new Error("Expense not found. Refresh the page and try again.");
            return index;
        }

        #fields(request) {
            return new URLSearchParams({
                Description: request.Description,
                Amount: request.Amount,
                Date: request.Date,
                CategoryId: request.CategoryId
            });
        }

        #replaceDashboard(data) {
            const sourceCategories = field(data, "Categories");
            const sourceExpenses = field(data, "Expenses");
            if (!Array.isArray(sourceCategories) || !Array.isArray(sourceExpenses)) {
                throw new Error("Unexpected dashboard data. Refresh the page.");
            }
            const categories = sourceCategories.map(category => ({
                Id: Number(field(category, "Id")),
                Name: field(category, "Name")
            }));

            const categoryIds = new Set();
            for (const category of categories) {
                if (!Number.isSafeInteger(category.Id) || category.Id < 1 || categoryIds.has(category.Id) ||
                    typeof category.Name !== "string") {
                    throw new Error("Unexpected category data. Refresh the page.");
                }
                categoryIds.add(category.Id);
            }

            const expenses = sourceExpenses.map(item => this.#readExpense(item, categories));
            if (new Set(expenses.map(item => item.Id)).size !== expenses.length) {
                throw new Error("Unexpected duplicate expenses. Refresh the page.");
            }

            this.#categories = categories;
            this.#items = expenses;
        }

        #readExpense(item, categories) {
            if (!item || typeof item !== "object") {
                throw new Error("Unexpected expense response. Refresh the page.");
            }

            const id = Number(field(item, "Id"));
            const categoryId = Number(field(item, "CategoryId"));
            const category = categories.find(value => value.Id === categoryId);
            const amount = Number(field(item, "Amount"));
            const description = field(item, "Description");

            const date = String(field(item, "Date") ?? "").slice(0, 10);

            if (!Number.isSafeInteger(id) || id < 1 || !category || !Number.isFinite(amount) || amount <= 0 || typeof description !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                throw new Error("Unexpected expense response. Refresh the page.");
            }
            return {
                Id: id, Description: description, Amount: amount,
                Date: date, CategoryId: category.Id, CategoryName: category.Name
            };
        }

        async #post(action, body, id) {
            let url = this.#endpoints[action];
            if (id !== undefined) url += (url.includes("?") ? "&" : "?") + "id=" + encodeURIComponent(id);

            let response;
            try {
                response = await this.#fetch(url, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "RequestVerificationToken": this.#token,
                        "X-Requested-With": "XMLHttpRequest",
                        "Accept": "application/json"
                    },
                    body
                });
            } catch {
                // Never automatically retry a write: it may already have saved.
                throw new Error("The request could not finish. Refresh to check your expenses before retrying.");
            }

            if (response.redirected || response.status === 401) {
                const error = new Error("Your session has ended. Log in again to save changes.");
                error.requiresLogin = true;
                throw error;
            }
            const isJson = (response.headers.get("Content-Type") || "").includes("json");
            const result = isJson ? await response.json().catch(() => null) : null;
            if (!response.ok) {
                const validation = result?.errors ? Object.values(result.errors).flat().filter(value => typeof value === "string").join(" ") : "";
                const messages = {
                    400: "This request was rejected. Check your entries or refresh the page and try again.",
                    403: "You do not have permission to change this expense.",
                    404: "This expense is no longer available. Refresh the page.",
                    429: "Please wait before regenerating your sample data again."
                };
                throw new Error(validation || result?.message || messages[response.status] ||
                    "The server could not finish the request. Refresh to check your expenses before retrying.");
            }
            if (action === "Delete" && response.status === 204) return null;
            if (!isJson || result === null) {
                throw new Error("Unexpected server response. Refresh to check your expenses before retrying.");
            }
            return result;
        }
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = ExpenseApiStore;
    } else {
        globalThis.ExpenseApiStore = ExpenseApiStore;
    }
})();
