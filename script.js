// 전역 변수
const myServerUrl = "https://assist-jxup4d30i-notiks-projects.vercel.app/api/proxy";
const mapContainer = document.getElementById('map');
const bottomSheet = document.getElementById('bottomSheet');
const resultsContainer = document.getElementById('resultsContainer');
const recentSearches = document.getElementById('recentSearches');
const recentList = document.getElementById('recentList');
const mapOptions = {
    center: new kakao.maps.LatLng(37.566826, 126.9786567),
    level: 5
};
const map = new kakao.maps.Map(mapContainer, mapOptions);
const ps = new kakao.maps.services.Places(map);
const geocoder = new kakao.maps.services.Geocoder();
const markers = [];
let polyline = null;
let recent = JSON.parse(localStorage.getItem('recentSearches')) || []; // 최근 검색 저장

// 시트 토글
function toggleSheet() {
    bottomSheet.classList.toggle('expanded');
    if (bottomSheet.classList.contains('expanded')) {
        showRecentSearches();
    }
}

function expandSheet() {
    if (!bottomSheet.classList.contains('expanded')) {
        toggleSheet();
    }
}

// 최근 검색 표시
function showRecentSearches() {
    if (recent.length > 0) {
        recentSearches.classList.add('show');
        recentList.innerHTML = recent.map(item => `
            <div class="recent-item" onclick="loadRecent('${item.start}', '${item.end}')">
                ${item.start} → ${item.end}
            </div>
        `).join('');
    }
}

function saveRecent(start, end) {
    recent.unshift({ start, end });
    if (recent.length > 5) recent.pop();
    localStorage.setItem('recentSearches', JSON.stringify(recent));
}

function loadRecent(start, end) {
    document.getElementById('startInput').value = start;
    document.getElementById('endInput').value = end;
    runHybridSearch();
}

// 실시간 검색
function searchPlace(inputElement, resultContainer) {
    const keyword = inputElement.value.trim();
    if (keyword.length < 2) {
        resultContainer.style.display = 'none';
        return;
    }
    ps.keywordSearch(keyword, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
            renderResults(data, inputElement, resultContainer);
        } else {
            resultContainer.style.display = 'none';
        }
    }, { size: 5 });
}

function renderResults(places, inputElement, resultContainer) {
    let html = '<ul>';
    places.forEach(place => {
        const placeName = place.place_name.replace(/'/g, "\\'");
        html += `<li onclick="selectResult('${inputElement.id}', '${placeName}', '${resultContainer.id}')">
            ${place.place_name}
            <span class="search-address">${place.address_name || place.road_address_name}</span>
        </li>`;
    });
    html += '</ul>';
    resultContainer.innerHTML = html;
    const inputRow = inputElement.closest('.input-row');
    const inputRowRect = inputRow.getBoundingClientRect();
    const sheetRect = bottomSheet.getBoundingClientRect();
    resultContainer.style.top = `${inputRowRect.bottom - sheetRect.top + 5}px`;
    resultContainer.style.display = 'block';
}

function selectResult(inputId, placeName, resultContainerId) {
    document.getElementById(inputId).value = placeName;
    document.getElementById(resultContainerId).style.display = 'none';
    expandSheet();
}

// 경로 검색
async function runHybridSearch() {
    const startName = document.getElementById('startInput').value.trim();
    const endName = document.getElementById('endInput').value.trim();
    if (!startName || !endName) {
        resultsContainer.innerHTML = '<div class="error-msg">출발지와 도착지를 입력해주세요.</div>';
        return;
    }
    resultsContainer.innerHTML = '<div class="loading">검색 중...</div>';
    expandSheet();
    clearMap();

    try {
        const start = await geocode(startName);
        const end = await geocode(endName);
        saveRecent(startName, endName);
        await fetchTmapDataAndRender(start, end);
    } catch (error) {
        resultsContainer.innerHTML = `<div class="error-msg">오류: ${error.message}</div>`;
    }
}

function geocode(placeName) {
    return new Promise((resolve, reject) => {
        ps.keywordSearch(placeName, (data, status) => {
            if (status === kakao.maps.services.Status.OK) {
                resolve({ x: data[0].x, y: data[0].y, name: data[0].place_name });
            } else {
                reject(new Error(`${placeName} 검색 실패`));
            }
        }, { size: 1 });
    });
}

async function fetchTmapDataAndRender(start, end) {
    const payload = { startX: start.x, startY: start.y, endX: end.x, endY: end.y };
    try {
        const response = await fetch(myServerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('서버 오류');
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        renderRoutes(data.routes);
    } catch (error) {
        resultsContainer.innerHTML = `<div class="error-msg">경로 검색 실패: ${error.message}</div>`;
    }
}

function renderRoutes(routes) {
    resultsContainer.innerHTML = '<h4>추천 경로</h4>';
    routes.forEach((route, index) => {
        const totalTime = Math.ceil(route.totalTime / 60);
        const totalFare = route.totalFare.toLocaleString();
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'route-summary';
        summaryDiv.innerHTML = `
            <div class="time-info">
                <svg class="transit-icon" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83M2 12h4M18 12h4M12 6V2"/></svg>
                ${totalTime}분 소요
            </div>
            <div class="transit-info">
                <svg class="transit-icon" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83M2 12h4M18 12h4M12 6V2"/></svg>
                요금: ${totalFare}원
            </div>
        `;
        summaryDiv.onclick = () => drawRoute(route);
        resultsContainer.appendChild(summaryDiv);
        if (index === 0) drawRoute(route);
    });
}

function drawRoute(route) {
    clearMap();
    const points = [];
    route.legs.forEach(leg => {
        leg.steps.forEach(step => {
            if (step.route) {
                step.route.linestring.split(' ').forEach(coordStr => {
                    const [lon, lat] = coordStr.split(',');
                    points.push(new kakao.maps.LatLng(lat, lon));
                });
            }
        });
    });
    if (points.length === 0) return;

    polyline = new kakao.maps.Polyline({
        path: points,
        strokeWeight: 5,
        strokeColor: var(--primary),
        strokeOpacity: 0.8,
        strokeStyle: 'solid'
    });
    polyline.setMap(map);

    const startPos = points[0];
    const endPos = points[points.length - 1];
    const startMarker = new kakao.maps.Marker({ position: startPos, title: '출발' });
    const endMarker = new kakao.maps.Marker({ position: endPos, title: '도착' });
    startMarker.setMap(map);
    endMarker.setMap(map);
    markers.push(startMarker, endMarker);

    const bounds = new kakao.maps.LatLngBounds();
    points.forEach(p => bounds.extend(p));
    map.setBounds(bounds);
}

function clearMap() {
    markers.forEach(m => m.setMap(null));
    markers.length = 0;
    if (polyline) polyline.setMap(null);
}

// 현재 위치 버튼
document.getElementById('currentLocationBtn').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            map.setCenter(new kakao.maps.LatLng(lat, lon));
            document.getElementById('startInput').value = '현재 위치';
        }, () => alert('위치 권한을 허용해주세요.'));
    }
});

// 테마 토글
document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const body = document.body;
    body.dataset.theme = body.dataset.theme === 'light' ? 'dark' : 'light';
    // Kakao Map 테마 변경 (커스텀 오버레이 필요 시 추가)
});

// 이벤트 리스너
document.getElementById('startInput').addEventListener('input', () => searchPlace(document.getElementById('startInput'), document.getElementById('search-results-start')));
document.getElementById('endInput').addEventListener('input', () => searchPlace(document.getElementById('endInput'), document.getElementById('search-results-end')));
document.addEventListener('click', (e) => {
    if (!document.getElementById('startInput').contains(e.target) && !document.getElementById('search-results-start').contains(e.target)) {
        document.getElementById('search-results-start').style.display = 'none';
    }
    if (!document.getElementById('endInput').contains(e.target) && !document.getElementById('search-results-end').contains(e.target)) {
        document.getElementById('search-results-end').style.display = 'none';
    }
});

// 초기 로드
showRecentSearches();
