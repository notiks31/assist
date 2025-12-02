/* [1] 지도 초기화 */
const mapContainer = document.getElementById('map');
const mapOption = { center: new kakao.maps.LatLng(37.566826, 126.9786567), level: 5 };
const map = new kakao.maps.Map(mapContainer, mapOption);
const ps = new kakao.maps.services.Places();

let markers = [];
let polylines = [];
let isTrafficOn = false;

// 시작 시 내 위치로 이동
window.onload = () => moveToCurrentLocation();

/* [2] 플로팅 메뉴 토글 로직 */
function toggleMenu() {
    const menu = document.getElementById('floatingMenu');
    menu.classList.toggle('open');
}

/* [3] 내 위치 & 편의점 검색 로직 */
function moveToCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const loc = new kakao.maps.LatLng(lat, lng);
            
            // 내 위치 마커 (파란 점)
            const content = `<div style="width:18px; height:18px; background:#3182F6; border:3px solid white; border-radius:50%; box-shadow:0 4px 10px rgba(0,0,0,0.3);"></div>`;
            const overlay = new kakao.maps.CustomOverlay({ position: loc, content: content });
            overlay.setMap(map);
            map.panTo(loc);
        });
    }
}

function toggleAmenities() {
    markers.forEach(m => m.setMap(null)); markers = [];

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const loc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            map.setCenter(loc);

            ps.categorySearch('CS2', (data, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    data.forEach(place => {
                        const marker = new kakao.maps.Marker({
                            map: map,
                            position: new kakao.maps.LatLng(place.y, place.x)
                        });
                        markers.push(marker);
                    });
                    alert(`내 주변에 ${data.length}개의 편의점을 찾았습니다.`);
                }
            }, { location: loc, radius: 1000 });
        });
    }
}

function toggleTraffic() {
    if (isTrafficOn) {
        map.removeOverlayMapTypeId(kakao.maps.MapTypeId.TRAFFIC);
        isTrafficOn = false;
    } else {
        map.addOverlayMapTypeId(kakao.maps.MapTypeId.TRAFFIC);
        isTrafficOn = true;
    }
}

/* [4] 경로 검색 및 시트 로직 */
// 컴포넌트가 로드된 후 요소를 찾아야 함으로, 함수 내부에서 getElementById 호출
function getSheetElements() {
    return {
        sheet: document.getElementById('bottomSheet'),
        resultCard: document.getElementById('resultCard'),
        searchForm: document.querySelector('.search-form')
    };
}

function toggleSheet() {
    const { sheet } = getSheetElements();
    if(sheet.classList.contains('collapsed')) expandSheet();
    else collapseSheet();
}
function expandSheet() {
    const { sheet } = getSheetElements();
    sheet.classList.remove('collapsed');
    sheet.classList.add('expanded');
}
function collapseSheet() {
    const { sheet } = getSheetElements();
    sheet.classList.remove('expanded');
    sheet.classList.add('collapsed');
    document.getElementById('startInput').blur();
}

function fillSearch(s, e) {
    document.getElementById('startInput').value = s;
    document.getElementById('endInput').value = e;
    expandSheet();
}

async function findPath() {
    const sVal = document.getElementById('startInput').value;
    const eVal = document.getElementById('endInput').value;
    if(!sVal || !eVal) return alert('출발/도착지를 입력하세요');

    const sCoord = await getCoords(sVal);
    const eCoord = await getCoords(eVal);
    
    if(sCoord && eCoord) {
        drawPath(sCoord, eCoord);
        const { resultCard, searchForm } = getSheetElements();
        searchForm.style.display = 'none';
        resultCard.classList.add('active');
        document.getElementById('resStart').innerText = sVal;
        document.getElementById('resEnd').innerText = eVal;
    }
}

function resetSearch() {
    polylines.forEach(p => p.setMap(null)); polylines = [];
    markers.forEach(m => m.setMap(null)); markers = [];
    
    const { resultCard, searchForm } = getSheetElements();
    resultCard.classList.remove('active');
    searchForm.style.display = 'block';
    collapseSheet();
}

function getCoords(keyword) {
    return new Promise(resolve => {
        if(keyword.includes("현위치")) {
            navigator.geolocation.getCurrentPosition(pos => resolve(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)));
        } else {
            ps.keywordSearch(keyword, (data, status) => {
                if(status === kakao.maps.services.Status.OK) resolve(new kakao.maps.LatLng(data[0].y, data[0].x));
                else resolve(null);
            });
        }
    });
}

function drawPath(s, e) {
    const mid = new kakao.maps.LatLng(s.getLat(), e.getLng());
    const path = [s, mid, e];
    const line = new kakao.maps.Polyline({
        path: path, strokeWeight: 6, strokeColor: '#3182F6', strokeOpacity: 0.9
    });
    line.setMap(map);
    polylines.push(line);
    
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(s); bounds.extend(e); bounds.extend(mid);
    map.setBounds(bounds);
    
    new kakao.maps.Marker({map:map, position:s});
    new kakao.maps.Marker({map:map, position:e});
}

// 전역 함수로 등록 (HTML onclick에서 접근 가능하도록)
window.toggleSheet = toggleSheet;
window.expandSheet = expandSheet;
window.fillSearch = fillSearch;
window.findPath = findPath;
window.resetSearch = resetSearch;
