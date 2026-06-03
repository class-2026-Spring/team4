const jejuChart = document.getElementById("jeju-chart");
const jejuAverageRate = document.getElementById("jeju-average-rate");
const jejuTopItem = document.getElementById("jeju-top-item");
const jejuTopRate = document.getElementById("jeju-top-rate");

const fmt = new Intl.NumberFormat("ko-KR");
const fmtOne = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

fetch("data/jeju-waste-recycling.json")
  .then((response) => response.json())
  .then((jejuWaste) => drawJejuWaste(jejuWaste.items));

function drawJejuWaste(items) {
  const enrichedItems = items
    .map((item) => ({
      ...item,
      rate: item.generatedTons > 0 ? (item.recycledTons / item.generatedTons) * 100 : 0,
    }))
    .sort((a, b) => b.rate - a.rate);
  const totalRecycled = enrichedItems.reduce((sum, item) => sum + item.recycledTons, 0);
  const totalGenerated = enrichedItems.reduce((sum, item) => sum + item.generatedTons, 0);
  const averageRate = totalGenerated > 0 ? (totalRecycled / totalGenerated) * 100 : 0;
  const topItem = enrichedItems[0];

  jejuAverageRate.textContent = `${fmtOne.format(averageRate)}%`;
  jejuTopItem.textContent = topItem.name;
  jejuTopRate.textContent = `${fmtOne.format(topItem.rate)}%`;
  jejuChart.innerHTML = "";

  enrichedItems.forEach((item) => {
    const row = document.createElement("article");
    const displayRate = Math.min(item.rate, 100);
    row.className = `bar-row${item.rate > 100 ? " is-over" : ""}`;
    row.innerHTML = `
      <div class="bar-meta">
        <strong>${item.name}</strong>
        <span>${fmt.format(Math.round(item.recycledTons))} / ${fmt.format(Math.round(item.generatedTons))} 톤</span>
      </div>
      <div class="bar-track" aria-hidden="true">
        <span style="width: ${displayRate}%"></span>
      </div>
      <strong class="bar-rate">${fmtOne.format(item.rate)}%</strong>
      <p class="bar-source">${item.matchedRows}</p>
    `;
    jejuChart.appendChild(row);
  });
}
