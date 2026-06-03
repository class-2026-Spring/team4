const svg = document.getElementById("korea-map");
const selectedName = document.getElementById("selected-name");
const selectedRate = document.getElementById("selected-rate");
const selectedSales = document.getElementById("selected-sales");
const selectedWaste = document.getElementById("selected-waste");
const selectedFormula = document.getElementById("selected-formula");
const rankingList = document.getElementById("ranking-list");

const mapNameToProvince = {
  Seoul: "서울",
  Busan: "부산",
  Daegu: "대구",
  Incheon: "인천",
  Gwangju: "광주",
  Daejeon: "대전",
  Ulsan: "울산",
  Sejong: "세종",
  Gyeonggi: "경기",
  Gangwon: "강원",
  "North Chungcheong": "충북",
  "South Chungcheong": "충남",
  "North Jeolla": "전북",
  "South Jeolla": "전남",
  "North Gyeongsang": "경북",
  "South Gyeongsang": "경남",
  Jeju: "제주",
};

const fmt = new Intl.NumberFormat("ko-KR");
const fmtOne = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

let regionData = new Map();
let selectedId = "Gyeonggi";

Promise.all([
  fetch("data/korea-adm1.geojson").then((response) => response.json()),
  fetch("data/recycling-rates.json").then((response) => response.json()),
]).then(([geojson, recycling]) => {
  regionData = new Map(recycling.regions.map((region) => [region.id, region]));
  drawMap(geojson);
  drawRanking(recycling.regions);
  selectRegion(selectedId);
});

function drawMap(geojson) {
  const width = 760;
  const height = 900;
  const features = geojson.features;
  const bounds = getBounds(features);
  const padding = 28;
  const scale = Math.min(
    (width - padding * 2) / (bounds.maxX - bounds.minX),
    (height - padding * 2) / (bounds.maxY - bounds.minY)
  );
  const offsetX = (width - (bounds.maxX - bounds.minX) * scale) / 2;
  const offsetY = (height - (bounds.maxY - bounds.minY) * scale) / 2;

  svg.innerHTML = "";

  for (const feature of features) {
    const id = feature.properties.shapeName;
    const region = regionData.get(id);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", geometryToPath(feature.geometry, bounds, scale, offsetX, offsetY));
    path.setAttribute("class", "region");
    path.setAttribute("fill", colorForRate(region?.recyclingRate ?? 0));
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.setAttribute("aria-label", `${mapNameToProvince[id] ?? id} 재활용 판매 비율 보기`);
    path.dataset.id = id;
    path.addEventListener("click", () => selectRegion(id, { openJejuPage: id === "Jeju" }));
    path.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectRegion(id, { openJejuPage: id === "Jeju" });
      }
    });
    svg.appendChild(path);
  }

  for (const feature of features) {
    const id = feature.properties.shapeName;
    const region = regionData.get(id);
    const labelPoint = centroid(feature.geometry, bounds, scale, offsetX, offsetY);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", labelPoint.x);
    text.setAttribute("y", labelPoint.y);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "map-label");
    text.textContent = region?.province ?? mapNameToProvince[id] ?? id;
    svg.appendChild(text);
  }
}

function selectRegion(id, options = {}) {
  selectedId = id;
  const region = regionData.get(id);
  if (!region) return;

  for (const path of svg.querySelectorAll(".region")) {
    path.classList.toggle("is-selected", path.dataset.id === id);
  }
  for (const item of rankingList.querySelectorAll(".rank-item")) {
    item.classList.toggle("is-selected", item.dataset.id === id);
  }

  selectedName.textContent = region.name;
  selectedRate.textContent = `${fmtOne.format(region.recyclingRate)}%`;
  selectedSales.textContent = `${fmt.format(Math.round(region.recyclingSalesTons))} 톤`;
  selectedWaste.textContent = `${fmt.format(region.wasteGenerationTons)} 톤 (${fmt.format(region.wasteGenerationManTon)} 만톤/년)`;
  selectedFormula.textContent = `${fmt.format(Math.round(region.recyclingSalesTons))} / ${fmt.format(region.wasteGenerationTons)} 톤`;

  if (options.openJejuPage) {
    window.location.href = "jeju.html";
  }
}

function drawRanking(regions) {
  rankingList.innerHTML = "";
  regions.slice(0, 8).forEach((region, index) => {
    const item = document.createElement("li");
    item.className = "rank-item";
    item.dataset.id = region.id;
    item.innerHTML = `
      <span class="rank-no">${index + 1}</span>
      <span class="rank-name">${region.name}</span>
      <span class="rank-rate">${fmtOne.format(region.recyclingRate)}%</span>
    `;
    item.addEventListener("click", () => selectRegion(region.id));
    rankingList.appendChild(item);
  });
}

function colorForRate(rate) {
  if (rate >= 100) return "#244f83";
  if (rate >= 60) return "#1f8a57";
  if (rate >= 35) return "#54b876";
  if (rate >= 20) return "#96d3a9";
  if (rate >= 10) return "#cfe9d8";
  return "#e8efe9";
}

function project([lon, lat]) {
  return [lon, -lat];
}

function getBounds(features) {
  const points = [];
  for (const feature of features) {
    walkCoordinates(feature.geometry.coordinates, (coord) => points.push(project(coord)));
  }
  return {
    minX: Math.min(...points.map((point) => point[0])),
    maxX: Math.max(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
}

function screenPoint(coord, bounds, scale, offsetX, offsetY) {
  const [x, y] = project(coord);
  return {
    x: (x - bounds.minX) * scale + offsetX,
    y: (y - bounds.minY) * scale + offsetY,
  };
}

function geometryToPath(geometry, bounds, scale, offsetX, offsetY) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .map((polygon) =>
      polygon
        .map((ring) =>
          ring
            .map((coord, index) => {
              const point = screenPoint(coord, bounds, scale, offsetX, offsetY);
              return `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
            })
            .join(" ") + " Z"
        )
        .join(" ")
    )
    .join(" ");
}

function centroid(geometry, bounds, scale, offsetX, offsetY) {
  const points = [];
  walkCoordinates(geometry.coordinates, (coord) => {
    points.push(screenPoint(coord, bounds, scale, offsetX, offsetY));
  });
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function walkCoordinates(coords, visit) {
  if (typeof coords[0] === "number") {
    visit(coords);
    return;
  }
  coords.forEach((child) => walkCoordinates(child, visit));
}
