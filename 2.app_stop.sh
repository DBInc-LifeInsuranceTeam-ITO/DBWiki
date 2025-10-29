#!/bin/bash

APP_NAME="DBWikiAgent"
PID_FILE="/var/run/$APP_NAME.pid"

# ANSI color codes
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"  # reset

if [ ! -f $PID_FILE ]; then
    echo -e "${RED}>>> No PID file found. Is $APP_NAME running?${NC}"
    exit 1
fi

PID=$(cat $PID_FILE)

if ps -p $PID > /dev/null 2>&1; then
    echo -e "${YELLOW}>>> Stopping $APP_NAME with PID $PID ...${NC}"
    kill $PID

    # 종료될 때까지 대기
    for i in {1..10}; do
        if ps -p $PID > /dev/null 2>&1; then
            sleep 1
        else
            break
        fi
    done

    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${RED}>>> $APP_NAME did not stop gracefully. Killing...${NC}"
        kill -9 $PID
    fi

    rm -f $PID_FILE
    echo -e "${GREEN}>>> $APP_NAME stopped successfully.${NC}"
else
    echo -e "${RED}>>> Process $PID not found. Removing stale PID file.${NC}"
    rm -f $PID_FILE
fi

