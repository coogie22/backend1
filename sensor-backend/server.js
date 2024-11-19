const express = require('express');
const bodyParser = require('body-parser');
const { SerialPort } = require('serialport'); // 최신 API 구조에 맞게 수정
const { ReadlineParser } = require('@serialport/parser-readline'); // 최신 ReadlineParser 가져오기
const admin = require('firebase-admin');
require('dotenv').config(); // 환경 변수 로드

// Firebase 서비스 계정 키 파일 경로
const serviceAccount = require('./smartfarm-project-7214a-firebase-adminsdk-aimsp-262c0fbae0.json');

// Firebase 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://smartfarm-project-7214a-default-rtdb.firebaseio.com/',
});

// Firebase Realtime Database 인스턴스
const db = admin.database();

// Express 애플리케이션 생성
const app = express();
app.use(bodyParser.json());

// 블루투스 포트 설정 (아두이노 블루투스 모듈의 포트 확인)
const PORT_NAME = process.env.BLUETOOTH_PORT || 'COM3'; // 기본값 COM3
const baudRate = 9600; // 블루투스 통신 속도

let port;
try {
  port = new SerialPort({
    path: PORT_NAME,
    baudRate: baudRate,
  });
  console.log(`블루투스 포트 ${PORT_NAME}가 성공적으로 열렸습니다.`);
} catch (err) {
  console.error(`블루투스 포트를 열 수 없습니다: ${err.message}`);
  process.exit(1);
}

// 데이터 읽기 설정
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// 블루투스 데이터 읽기
parser.on('data', (data) => {
  try {
    const [temperature, humidity] = data.trim().split(',');

    if (temperature && humidity) {
      console.log(`온도: ${temperature}, 습도: ${humidity}`);

      // Firebase에 데이터 저장
      db.ref('sensorData').push({
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        timestamp: Date.now(),
      });

      console.log('Firebase에 데이터 저장 완료');
    } else {
      console.warn('잘못된 데이터 형식: ', data);
    }
  } catch (err) {
    console.error('데이터 처리 중 오류 발생: ', err.message);
  }
});

// 상태 확인 엔드포인트
app.get('/', (req, res) => {
  res.send('Sensor Data Backend is running!');
});

// 서버 실행
const SERVER_PORT = process.env.SERVER_PORT || 3000;
app.listen(SERVER_PORT, () => {
  console.log(`서버가 http://localhost:${SERVER_PORT} 에서 실행 중입니다.`);
});

// 블루투스 연결 오류 처리
port.on('error', (err) => {
  console.error(`블루투스 포트 오류: ${err.message}`);
});

// 더미 데이터를 Firebase에 저장하는 함수
function pushDummyData() {
    const temperature = (Math.random() * 10 + 20).toFixed(2); // 20~30°C 범위의 랜덤 온도
    const humidity = (Math.random() * 20 + 40).toFixed(2);    // 40~60% 범위의 랜덤 습도
  
    // Firebase Realtime Database에 데이터 저장
    db.ref('sensorData').push({
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      timestamp: Date.now(), // 현재 시간 타임스탬프
    });
  
    console.log(`더미 데이터 저장: 온도 ${temperature}, 습도 ${humidity}`);
  }
  
  // 일정 시간 간격으로 더미 데이터 저장
  setInterval(pushDummyData, 5000); // 5초마다 데이터 저장

  // 테스트용 엔드포인트
app.get('/test', (req, res) => {
    const temperature = (Math.random() * 10 + 20).toFixed(2); // 20~30°C 범위
    const humidity = (Math.random() * 20 + 40).toFixed(2);    // 40~60% 범위
  
    // Firebase에 데이터 저장
    db.ref('sensorData').push({
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      timestamp: Date.now(),
    });
  
    console.log(`테스트 데이터 저장: 온도 ${temperature}, 습도 ${humidity}`);
    res.send('테스트 데이터가 Firebase에 저장되었습니다.');
  });
  