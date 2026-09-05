/* /Expenses only: all mutations go through authenticated MVC actions. */
(function () {
    "use strict";

    function init() {
        if (!document.getElementById("expense-dashboard")) return;
        try {
            const initial = JSON.parse(document.getElementById("dashboard-initial-data").textContent);
            const endpoints = JSON.parse(document.getElementById("dashboard-endpoints").textContent);
            const token = document.querySelector(
                '#dashboard-antiforgery input[name="__RequestVerificationToken"]').value;
            const store = new ExpenseApiStore(initial, endpoints, token);
            ExpenseDashboard.mount({
                store,
                initial,
                copy: {
                    ready: initial.Expenses.length
                        ? "Your expenses are up to date. Changes are saved to your account."
                        : "Your account is ready. Create your first expense or load samples with Regenerate sample data.",
                    created: "Expense saved to your account.",
                    edited: "Changes saved to your account.",
                    deleted: "Expense deleted from your account.",
                    deleteSuffix: " from your account?",
                    regenerateConfirm: "Replace ALL expenses in your account with fictional sample data? This cannot be undone.",
                    regenerated: "Sample expenses saved. Reloading your dashboard..."
                },
                // This branch's Regenerate action returns a success message.
                // Reload only after success to get its actual records/categories.
                onRegenerated: () => window.location.reload(),
                onError: error => {
                    if (error.requiresLogin) {
                        document.getElementById("dashboard-login").hidden = false;
                    }
                }
            });
        } catch (error) {
            const status = document.getElementById("demo-status");
            status.textContent = "Your expenses could not load. Please refresh the page.";
            status.classList.add("demo-error");
            console.error(error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
