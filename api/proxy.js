// api/proxy.js

export default async function handler(req, res) {
    // 1. CORS 허용 설정 (내 웹사이트에서만 접속 가능하게 하려면 * 대신 주소 입력)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. 브라우저가 "보내도 돼?" 하고 물어보는 예비 요청(OPTIONS) 처리
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. TMAP API 키 (여기다 적으면 남들은 절대 볼 수 없습니다!)
    // 따옴표 안에 곰돌이님의 TMAP 키를 넣으세요.
    const TMAP_APP_KEY = 'vLTl0sk5ou1ba0TVgrpFM3Es6MWimZqo1xSDt3ti'; 

    try {
        // 4. 클라이언트(HTML)에서 보낸 좌표 데이터 받기
        const { startX, startY, endX, endY } = req.body;

        const tmapUrl = "https://apis.openapi.sk.com/transit/routes";
        
        const payload = {
            startX: startX, startY: startY,
            endX: endX, endY: endY,
            count: 1, format: "json"
        };

        // 5. TMAP 서버로 진짜 요청 보내기
        const response = await fetch(tmapUrl, {
            method: "POST",
            headers: { 
                "appKey": TMAP_APP_KEY, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 6. 결과를 내 앱으로 돌려주기
        res.status(200).json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
}
