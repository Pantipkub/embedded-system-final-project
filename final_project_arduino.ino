#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

#include "time.h"

#define WIFI_SSID "test"
#define WIFI_PASSWORD "12345678"

// ---- IMPORTANT ----
// ใส่ DATABASE SECRET (ไม่ใช่ API KEY)
#define DATABASE_SECRET "3foJInBrxflfO3NiGj3KggiConYUZ6rbhwKySsjq"

// Firebase Objects
FirebaseData fbdo;
FirebaseConfig config;

Servo servoMotor;

String uartBuffer = "";

#define HUMID_HIGH 70       // ความชื้นสูงกว่า 70%
#define TEMP_LOW 25        // อุณหภูมิต่ำกว่า 25°C
#define LDR_DARK 800       // ค่า LDR น้อยกว่า 3 = มืด
#define WATER_LEVEL 1600

void setup() {
  Serial.begin(115200);

  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");

  Serial.println("Syncing time...");
  delay(2000);  // รอให้ sync (สำคัญมาก!)

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println("\nWiFi Connected!");

  // ---- Firebase Legacy Auth ----
  config.database_url = "https://agentic-clothesline-default-rtdb.asia-southeast1.firebasedatabase.app/";
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, nullptr);
  Firebase.reconnectNetwork(true);

  servoMotor.setPeriodHertz(50);  // 50Hz สำหรับ servo
  servoMotor.attach(18, 500, 2400);  
}

void loop() {

  // Read UART line-by-line (ending with '\n')
  while (Serial.available()) {
    char c = Serial.read();
    Serial.write(c);

    if (c == '\n') {
      processUART(uartBuffer);
      uartBuffer = "";
    } else {
      uartBuffer += c;
    }
  }
}

void processUART(String data) {
  Serial.print("Received JSON: ");
  Serial.println(data);

  StaticJsonDocument<256> doc;
  auto error = deserializeJson(doc, data);

  if (error) {
    Serial.print("JSON Error: ");
    Serial.println(error.c_str());
    return;
  }

  // ---- READ JSON ----
  float temperature = doc["temperature"];
  int humidity = doc["humidity"];
  int ldr = doc["ldr"];
  int water = doc["water"];

    // --------------------------
  // SERVO CONTROL AUTONOMIC
  // --------------------------
  String clothesline_status = controlServo(temperature, humidity, ldr, water);

  // ESP32 Extra Status (default if missing)
  String motor_status      = doc["motor_status"]      | "STOPPED";
  String system_status     = doc["system_status"]     | "Active";

  // ---- BUILD JSON SEND TO FIREBASE ----
  FirebaseJson json;
  json.set("temperature", temperature);
  json.set("humidity", humidity);
  json.set("ldr", ldr);
  json.set("water", water);

  json.set("clothesline_status", clothesline_status);
  json.set("motor_status", motor_status);
  json.set("system_status", system_status);

  json.set("led_indicator", "Connected");
  json.set("timestamp", getTimestampUTC());

  // Path in Firebase
  String path = "/clothesline/status";

  if (Firebase.RTDB.setJSON(&fbdo, path, &json)) {
    Serial.println("Firebase updated!");
  } else {
    Serial.println(fbdo.errorReason());
  }
}


// ---- ISO Timestamp ----
String getTimestampUTC() {
  time_t now = time(nullptr);

  // ถ้ายัง = 0 แสดงว่ายังไม่ sync เวลา
  if (now < 100000) {
    return "1970-01-01T00:00:00Z";
  }

  struct tm *t = gmtime(&now);

  char buf[40];
  sprintf(buf, "%04d-%02d-%02dT%02d:%02d:%02dZ",
          t->tm_year + 1900, t->tm_mon + 1, t->tm_mday,
          t->tm_hour, t->tm_min, t->tm_sec);

  return String(buf);
}

String controlServo(float temperature, int humidity, int ldr, int water) {

  if (humidity > HUMID_HIGH && temperature < TEMP_LOW && ldr > LDR_DARK && water > WATER_LEVEL) {
    Serial.println("➡ Condition met: RETRACT clothesline");
    servoMotor.write(180);  // ดึงเข้า
    return "RETRACTED";
  } else {
    Serial.println("➡ Normal condition: EXTEND clothesline");
    servoMotor.write(0);    // ปล่อยออก
    return "EXTENDED";
  }
}