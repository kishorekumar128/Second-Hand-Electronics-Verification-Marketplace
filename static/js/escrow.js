/**
 * Escrow & Trust Settlement Engine
 * Coordinates state transitions, escrow lock, buyer verification window,
 * and automated fund disbursement.
 */

const EscrowEngine = {
  stages: [
    { key: "FUNDS_LOCKED", label: "Deposit in Escrow", desc: "Buyer funds secured in trust vault" },
    { key: "SENT_TO_HUB", label: "Shipped to Lab", desc: "Insured transit to verification facility" },
    { key: "INSPECTION_PASSED", label: "Verified & Certified", desc: "40-point diagnostic tests complete" },
    { key: "BUYER_INSPECTION_WINDOW", label: "Buyer 48h Window", desc: "Buyer testing period" },
    { key: "COMPLETED_RELEASED", label: "Funds Released", desc: "Disbursed to seller & lab fee settled" }
  ],

  renderStepper(currentStatus) {
    let activeIdx = 0;
    if (currentStatus === 'FUNDS_LOCKED') activeIdx = 0;
    else if (currentStatus === 'SENT_TO_HUB' || currentStatus === 'UNDER_INSPECTION') activeIdx = 1;
    else if (currentStatus === 'INSPECTION_PASSED' || currentStatus === 'OUT_FOR_DELIVERY') activeIdx = 2;
    else if (currentStatus === 'BUYER_INSPECTION_WINDOW') activeIdx = 3;
    else if (currentStatus === 'COMPLETED_RELEASED') activeIdx = 4;
    else if (currentStatus === 'DISPUTED') activeIdx = 3;

    return `
      <div class="escrow-stepper">
        ${this.stages.map((stage, idx) => {
          let stateClass = "";
          if (idx < activeIdx) stateClass = "completed";
          else if (idx === activeIdx) stateClass = "active";
          return `
            <div class="step-item ${stateClass}">
              <div class="step-circle">${idx < activeIdx ? '✓' : idx + 1}</div>
              <div class="step-label">${stage.label}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  async transition(escrowId, nextStatus, comment = "") {
    try {
      const res = await fetch("/api/escrow/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escrow_id: escrowId,
          status: nextStatus,
          comment: comment
        })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Escrow transition error:", err);
      return null;
    }
  }
};

window.EscrowEngine = EscrowEngine;
