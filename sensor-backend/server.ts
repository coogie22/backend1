import fs from 'fs';
import https from 'https';
import WebSocket from 'ws';
import express from 'express';
import admin from 'firebase-admin';
import cors from 'cors';
import dotenv from 'dotenv';

// 환경변수 설정
dotenv.config();

// Firebase 서비스 계정 키 파일 경로
import serviceAccount from './smartfarm-project-7214a-firebase-adminsdk-aimsp-4b27ec7a55.json';

// Firebase 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: 'https://smartfarm-project-7214a-default-rtdb.firebaseio.com/',
});

// Firebase Realtime Database 인스턴스
const db = admin.database();

// Express 설정
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTPS 인증서 파일 경로 설정
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/leejaewon.store/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/leejaewon.store/fullchain.pem'),
};

// HTTPS 서버 생성
const server = https.createServer(options, app);

// WebSocket 서버 설정
const wss = new WebSocket.Server({ server });

// WebSocket 클라이언트 관리
const clients = new Set<WebSocket>();

wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  clients.add(ws);
  console.log(`✅ WebSocket 클라이언트 연결 성공: ${clientIP}`);

  ws.on('message', (message: string) => {
    console.log(`📩 수신된 메시지 (${clientIP}): ${message}`);
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`🔌 WebSocket 연결 종료: ${clientIP}`);
  });

  ws.onerror = (error: Error) => {
    console.error(`⚠️ WebSocket 오류 (${clientIP}):`, error);
  });
});

// 더미 데이터 생성 함수
function generateDummyData(): void {
  const data = {
    temperature: parseFloat((Math.random() * 10 + 20).toFixed(2)),
    humidity: parseFloat((Math.random() * 20 + 40).toFixed(2)),
    soilMoisture: parseFloat((Math.random() * 50 + 50).toFixed(2)),
    timestamp: Date.now(),
  };

  db.ref('sensorData').push(data, (error: Error | null) => {
    if (error) {
      console.error('❌ Firebase 데이터 저장 오류:', error);
    } else {
      console.log('✅ Firebase 데이터 저장 성공:', data);
    }
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  console.log(`📤 데이터 생성 및 전송: ${JSON.stringify(data)}`);
}

// 1초마다 데이터 생성
setInterval(generateDummyData, 1000);

app.get('/', (req, res) => {
  res.status(200).send('🌐 HTTPS 및 WebSocket 서버가 실행 중입니다.');
});

const PORT = process.env.PORT || 443;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HTTPS 서버가 https://leejaewon.store:${PORT} 에서 실행 중입니다.`);
});
