class BottomSheet extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <div class="bottom-sheet collapsed" id="bottomSheet">
            <div class="sheet-header" onclick="toggleSheet()">
                <div class="handle-bar"></div>
            </div>

            <div class="sheet-content">
                <div class="search-bar" onclick="expandSheet()">
                    <span style="font-size: 18px;">🔍</span>
                    <span class="placeholder">어디로 갈까요?</span>
                </div>

                <div class="search-form">
                    <div class="input-row">
                        <div class="dot start"></div>
                        <input type="text" id="startInput" class="input-text" placeholder="출발지 (현위치)">
                    </div>
                    <div class="input-row">
                        <div class="dot end"></div>
                        <input type="text" id="endInput" class="input-text" placeholder="도착지 검색">
                    </div>
                    
                    <div style="display:flex; gap:8px; margin:10px 0; overflow-x:auto;">
                        <button class="pill-btn" style="font-size:13px; padding:8px 14px;" onclick="fillSearch('현위치', '집')">🏠 집으로</button>
                        <button class="pill-btn" style="font-size:13px; padding:8px 14px;" onclick="fillSearch('현위치', '회사')">🏢 회사로</button>
                    </div>

                    <button class="btn-search" onclick="findPath()">경로 검색</button>
                </div>

                <div id="resultCard" class="result-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="time-info">24분</div>
                        <button class="pill-btn" style="padding:6px 12px; font-size:12px;" onclick="resetSearch()">다시 검색</button>
                    </div>
                    <div class="sub-info">오후 1:30 도착 예정 • 도보 5분</div>

                    <div class="timeline">
                        <div class="t-item">
                            <div class="t-dot"></div>
                            <div class="t-text" id="resStart">출발지</div>
                        </div>
                        <div class="t-item">
                            <div class="t-dot" style="background:#eee; border:none; width:6px; height:6px; left:-17px;"></div>
                            <div class="t-text" style="color:#3182F6;">33번 버스 이동</div>
                        </div>
                        <div class="t-item">
                            <div class="t-dot end"></div>
                            <div class="t-text" id="resEnd">도착지</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
}

// <bottom-sheet> 태그를 브라우저에 등록
customElements.define('bottom-sheet', BottomSheet);
