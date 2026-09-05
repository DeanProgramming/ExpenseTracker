/* /Demo only: there are no network operations or account stores here. */
(function () {
    "use strict";

    function init() {
        if (!document.getElementById("expense-dashboard")) return;
        try {
            const initial = JSON.parse(document.getElementById("dashboard-initial-data").textContent);
            const store = new DemoExpenseStore(initial.Expenses, initial.Categories);
            ExpenseDashboard.mount({
                store,
                initial,
                copy: {
                    ready: "Ready. Changes stay in this tab only and reset on refresh.",
                    created: "Expense created in this tab only.",
                    edited: "Expense updated in this tab only.",
                    deleted: "Expense deleted from this tab only.",
                    deleteSuffix: " from this demo?",
                    regenerateConfirm: "Discard all changes in this demo tab and restore the starting data?",
                    regenerated: "Original demo data restored. Nothing was saved to your account."
                }
            });
        } catch (error) {
            const status = document.getElementById("demo-status");
            status.textContent = "The demo could not load. Please refresh the page.";
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
