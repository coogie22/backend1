#include <WiFi.h>
#include <HTTPClient.h>

// Wi-Fi 정보
const char* ssid = "KT_GiGA_C2A6";       // Wi-Fi 이름
const char* password = "fd58ff8549";     // Wi-Fi 비밀번호

const char* serverName = "http://35.193.77.253:5000/humidity"; // Node.js 서버 주소

const int sensorPin = 34; // 센서가 연결된 GPIO 핀

bool isServerRunning = true; // 서버가 실행 중인지 확인하는 변수

// 필터링을 위한 변수 설정
const int numReadings = 10; // 이동 평균을 위한 샘플 수
int readings[numReadings];  // 센서 값 저장 배열
int readIndex = 0;          // 배열 인덱스
int total = 0;              // 값의 총합
int average = 0;            // 평균값

void setup() {
  Serial.begin(9600);  // 시리얼 모니터 초기화

  // Wi-Fi 연결
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWi-Fi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // 센서 초기화: 이동 평균 배열 초기화
  for (int i = 0; i < numReadings; i++) {
    readings[i] = 0;
  }
}

void loop() {
  // 시리얼 모니터에서 "stop" 또는 "start" 명령을 받으면 서버 전송을 제어
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');  // 시리얼 입력을 읽음
    input.trim(); // 앞뒤 공백 제거
    if (input == "stop") {
      isServerRunning = false;  // 서버 중단
      Serial.println("Server stopped.");
    } else if (input == "start") {
      isServerRunning = true;   // 서버 시작
      Serial.println("Server started.");
    }
  }

  if (isServerRunning) {  // 서버가 실행 중일 때만 데이터 전송
    if (WiFi.status() == WL_CONNECTED) { // Wi-Fi 연결 확인
      int sensorValue = analogRead(sensorPin); // 센서 값 읽기

      // 이동 평균 계산
      total -= readings[readIndex];
      readings[readIndex] = sensorValue;
      total += readings[readIndex];
      readIndex = (readIndex + 1) % numReadings;
      average = total / numReadings;

      // 습도 계산: 값이 낮을수록 습함 (센서 값이 0일 때 100%, 4095일 때 0%)
      // 값에 여유를 주기 위한 보정 식 추가
      float humidity = map(average, 0, 4095, 100, 0); // 0~4095 범위에서 100~0%로 매핑

      // 디버깅용 출력
      Serial.print("Raw Sensor Value: ");
      Serial.println(sensorValue);
      Serial.print("Filtered Sensor Value: ");
      Serial.println(average);
      Serial.print("Calculated Humidity: ");
      Serial.print(humidity);
      Serial.println(" %");

      // JSON 데이터 생성
      String jsonData = "{\"humidity\":" + String(humidity) + "}";

      // HTTP 요청 전송
      HTTPClient http;
      http.begin(serverName); // 서버 주소 설정
      http.addHeader("Content-Type", "application/json"); // JSON 형식 요청

      int httpResponseCode = http.POST(jsonData); // POST 요청 전송

      // 응답 확인
      if (httpResponseCode > 0) {
        String response = http.getString(); // 서버 응답 읽기
        Serial.print("HTTP Response code: ");
        Serial.println(httpResponseCode);
        Serial.println("Server response: " + response);
      } else {
        // 오류 출력
        Serial.print("Error on sending POST: ");
        Serial.println(httpResponseCode);
        Serial.print("Error message: ");
        Serial.println(http.errorToString(httpResponseCode).c_str());
      }

      http.end(); // 요청 종료
    } else {
      // Wi-Fi 연결이 끊겼을 경우
      Serial.println("Wi-Fi Disconnected");
    }

    delay(1000); // 1초 간격으로 데이터 전송
  } else {
    // 서버가 중단된 상태에서 1초 대기
    delay(1000);
  }
}