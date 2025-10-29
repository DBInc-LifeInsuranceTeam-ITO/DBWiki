#!/bin/bash

APP_NAME="DBWikiAgent"
JAR_FILE="/app/collector-0.0.1-SNAPSHOT.jar"
LOG_DIR="/app/log/"
PID_FILE="/var/run/$APP_NAME.pid"

# ANSI color codes
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"  # reset

# Spring Boot 설정 옵션
SPRING_OPTS=" \
--spring.config.location=file:./application.properties"

echo -e "${GREEN}>>> Starting $APP_NAME ...${NC}"
# Spring Boot 애플리케이션 실행
nohup java -jar $JAR_FILE $SPRING_OPTS > $LOG_DIR/$APP_NAME.out 2>&1 &

PID=$!
echo $PID > $PID_FILE
echo -e "${GREEN}>>> $APP_NAME started with PID $PID${NC}"
echo -e "${YELLOW}>>> Waiting for Spring Boot to start...${NC}"

SUCCESS_LOG="Starting CollectorApplication"

tail -f -n0 $LOG_DIR/$APP_NAME.out | tee /dev/stderr | grep -m1 "$SUCCESS_LOG" > /dev/null

echo -e "${GREEN}>>> $APP_NAME application has started successfully!${NC}"

