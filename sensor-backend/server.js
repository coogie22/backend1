const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

// Firebase 서비스 계정 키 파일 경로
const serviceAccount = require('./smartfarm-project-7214a-firebase-adminsdk-aimsp-4b27ec7a55.json');

// Firebase 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://smartfarm-project-7214a-default-rtdb.firebaseio.com/',
});

// Firebase Realtime Database 인스턴스
const db = admin.database();

// Express 설정
const app = express();
app.use(cors());
app.use(express.json());

// HTTPS 인증서 파일 경로
const options = {
  key: fs.readFileSync('/home/leejaewon6463/key.pem'), // 개인 키
  cert: fs.readFileSync('/home/leejaewon6463/cert.pem'), // 인증서
};

// HTTPS 서버 생성
const server = https.createServer(options, app);

// WebSocket 서버 설정
const wss = new WebSocket.Server({ server });

// WebSocket 클라이언트 관리
const clients = new Set();

wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress; // 클라이언트 IP 확인
  clients.add(ws);
  console.log(`WebSocket 클라이언트 연결 성공: ${clientIP}`);

  // 메시지 수신
  ws.on('message', (message) => {
    console.log(`수신된 메시지 (${clientIP}):`, message);
  });

  // 연결 종료
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`WebSocket 연결 종료: ${clientIP}`);
  });

  // WebSocket 오류 처리
  ws.onerror = (error) => {
    console.error(`WebSocket 오류 (${clientIP}):`, error);
  };
});

// 더미 데이터 생성 함수
function generateDummyData() {
  const data = {
    temperature: parseFloat((Math.random() * 10 + 20).toFixed(2)), // 20~30°C 범위
    humidity: parseFloat((Math.random() * 20 + 40).toFixed(2)), // 40~60% 범위
    soilMoisture: parseFloat((Math.random() * 50 + 50).toFixed(2)), // 50~100 범위
    timestamp: Date.now(),
  };

  // Firebase에 저장
  db.ref('sensorData').push(data);

  // WebSocket 클라이언트에게 데이터 전송
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  console.log(`데이터 생성 및 전송: ${JSON.stringify(data)}`);
}

// 1초마다 데이터 생성
setInterval(generateDummyData, 1000);

// HTTPS 서버 시작
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS 서버가 https://0.0.0.0:${PORT} 에서 실행 중입니다.`);
});

// Express 라우트 예제 (테스트용)
app.get('/', (req, res) => {
  res.send('SmartFarm HTTPS 서버가 실행 중입니다!');
});

app.get('/sensor-data', async (req, res) => {
  try {
    const snapshot = await db.ref('sensorData').limitToLast(10).once('value');
    const data = snapshot.val();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '데이터를 가져오는 중 오류가 발생했습니다.' });
  }
});
