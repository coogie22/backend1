const express = require('express');
const http = require('http'); // HTTP 서버
const WebSocket = require('ws'); // WebSocket 라이브러리
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

// HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 서버 설정
const wss = new WebSocket.Server({ server });

// WebSocket 클라이언트 관리
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('WebSocket 클라이언트 연결');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket 클라이언트 연결 종료');
  });
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

  // WebSocket으로 클라이언트에게 데이터 전송
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  console.log(`데이터 생성 및 전송: ${JSON.stringify(data)}`);
}

// 1초마다 데이터 생성
setInterval(generateDummyData, 1000);

// HTTP 서버 시작
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
