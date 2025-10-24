# 🧩 DBWiki XAMPP Setup (Linux Edition)

> 💡 리눅스 환경에서 XAMPP 기반으로 **MediaWiki + DBWiki 자동 구축/삭제**를 지원하는 통합 패키지입니다.  
> Apache, MariaDB, PHP, phpMyAdmin을 포함한 XAMPP 위에 `DBWiki`를 완전 자동으로 설치·제거할 수 있습니다.

---

## 🧱 1️⃣ 개요

이 패키지는 다음 기능을 제공합니다:

- ✅ XAMPP 환경 자동 감지 및 서비스 시작  
- ✅ MediaWiki(1.43.1) 자동 배포  
- ✅ DB 및 계정 자동 생성  
- ✅ LDAP/로컬 계정 동시 로그인 지원  
- ✅ 관리자 및 봇 계정 자동 생성  
- ✅ LocalSettings.php 외부 설정 구조  
- ✅ 완전 자동 삭제(`uninstall.sh`) 지원  

---

## 📦 2️⃣ 디렉토리 구조

```plaintext
dbwiki-setup/
├── xampp-linux-x64-8.2.12-0-installer.run    # xampp 설치 (자동 실행)
├── install.sh                                # 설치 스크립트
├── uninstall.sh                              # 제거 스크립트
├── README.md                                 # 설명 문서 (현재 파일)
├── packages/
│   └── dbwiki-1.0.tar.gz                     # ✅ DBWiki 본테
│
├── wiki/
│   └── LocalSettings.php                     # 외부 설정 로더 (1줄)
├── app/
|   ├── 1.app_start.sh                        # 기동 스크립트
|   ├── 2.app_stop.sh                         # 중지 스크립트
|   ├── collector-0.0.1-SNAPSHOT.jar          # 수집기 jar
|   └── log/
|       └── DBWikiAgent.out                   # 수집기 log
├── config/
|       ├── init.sh                           # 초기화 자동 실행 (DB 갱신, 계정/문서 등록)
|       └── init-accounts.php                 # 관리자 및 봇 계정 생성 스크립트
└── setup/
|       ├── init.sh                           # 초기화 자동 실행 (DB 갱신, 계정/문서 등록)
|       ├── init-accounts.php                 # 관리자 및 봇 계정 생성 스크립트
|       └── init-pages.php                    # 기본 페이지 자동 등록
└── wiki-config/
    ├── environment-prod.php                  # 주요 환경변수 및 LDAP/DB 설정
    ├── extensions.php                        # 확장 모듈 정의
    └── setup/
        ├── init.sh                           # 초기화 자동 실행 (DB 갱신, 계정/문서 등록)
        ├── init-accounts.php                 # 관리자 및 봇 계정 생성 스크립트
        └── init-pages.php                    # 기본 페이지 자동 등록
```

---

## 🚀 3️⃣ 설치 방법
(1) XAMPP 설치
```bash
tar -xzf dbwiki-xampp-setup.tar.gz
cd dbwiki-xampp-setup
chmod +x xampp-linux-x64-8.2.12-0-installer.run
sudo ./xampp-linux-x64-8.2.12-0-installer.run
```

설치 완료 후:
```bash
sudo /opt/lampp/lampp start
```

(2) DBWiki 설치

1️⃣ 패키지 압축 해제
```bash
tar -xzf dbwiki-xampp-setup.tar.gz
cd dbwiki-xampp-setup
```

2️⃣ 설치 실행
```bash
sudo bash install.sh
```

3️⃣ 설치 완료 후 메시지 예시:
```markdown
🎉 DBWiki 설치 완료!
--------------------------------------------------
접속 URL:  http://192.168.0.10/wiki
관리자 계정: wikiadmin / Admin123!
봇 계정:     wiki-bot / Bot123!
--------------------------------------------------
```


---

## 🌍 4️⃣ 접속 정보
| 항목         | 경로 / 내용                                                           |
| :--------- | :---------------------------------------------------------------- |
| **접속 URL** | [http://서버IP/wiki](http://서버IP/wiki)                              |
| **DB명**    | `dbwiki`                                                          |
| **DB 계정**  | `wikiuser` / `securepass!`                                        |
| **관리자 계정** | `wikiadmin` / `Admin123!`                                         |
| **봇 계정**   | `wiki-bot` / `Bot123!`                                            |
| **설정 파일**  | `/opt/lampp/mediawiki-config/environment-prod.php`                |
| **로그 경로**  | `/opt/lampp/logs/LDAP*.log`, `/opt/lampp/logs/PluggableAuth.log`* |

---

## ⚙️ 5️⃣ 설정 관리
모든 환경 변수는 외부 설정 파일(environment-prod.php)로 분리되어 있습니다.
따라서 MediaWiki를 재배포하거나 IP, 계정, LDAP 도메인 등이 바뀌어도 재설치 없이 설정만 수정 가능합니다.

```php
$wgSitename = "DBWiki";
$wgServer = "http://172.20.14.244/wiki";
$wgDBuser = "wikiuser";
$wgDBpassword = "securepass!";
$ldapDomain = "EXAMPLELIFE.BIZ";
$ldapServer = "EXLI-AD1.EXAMPLELIFE.BIZ";
```

수정 후 적용:

```bash
sudo /opt/lampp/lampp restart
```
---

## 🧩 6️⃣ 주요 기능 요약
| 기능         | 설명                                                           |
| :--------- | :---------------------------------------------------------------- |
| **🔧 자동 DB 초기화** | install.sh 실행 시 DB 자동 생성 및 권한 부여                              |
| **👤 계정 자동 등록**    | init-accounts.php에서 wikiadmin, wiki-bot 자동 등록                      |
| **📄 문서 자동 업로드** | 	init-pages.php에서 초기 위키 문서 자동 등록                                         |
| **🧠 LDAP 연동**   | LDAPAuthentication2 기반 AD 인증 지원                                   |
| **🔒 로컬 예외 계정**  | wikiadmin, wiki-bot 은 LDAP 무관하게 로컬 로그인 허용          |
| **🎨 스킨 구성**  | Liberty / Vector 등 기본 스킨 포함 |
| **📚 확장 기능**  | CommentStreams, ParserFunctions, WikiEditor, VisualEditor 기본 내장 |
| **🧾 로그 경로**  | /opt/lampp/logs/ 내 LDAP 관련 디버그 로그 생성 |
| **🧱 완전 외부 설정**  | LocalSettings.php는 단 한 줄로 외부 설정 로드|

---

## 🧹 7️⃣ 제거 방법
```bash
sudo bash uninstall.sh
```

제거 내용

/opt/lampp/htdocs/wiki 삭제

/opt/lampp/mediawiki-config 삭제

DB (dbwiki) 및 사용자 (wikiuser) 삭제

LDAP 로그 정리

XAMPP 자체는 유지됨

실행 예시
```
🛑 XAMPP 서비스 중지...
🗑 MediaWiki 디렉토리 삭제...
🧩 DB 및 계정 제거...
🧽 로그 삭제 완료
✅ 모든 관련 구성 삭제 완료!
```
---

## 🧠 8️⃣ 설치 후 관리 팁
| 작업                    | 명령어                                                         |
| :-------------------- | :---------------------------------------------------------- |
| **XAMPP 서비스 시작**      | `sudo /opt/lampp/lampp start`                               |
| **XAMPP 서비스 중지**      | `sudo /opt/lampp/lampp stop`                                |
| **Apache 재시작**        | `sudo /opt/lampp/lampp restartapache`                       |
| **DB 접속**             | `/opt/lampp/bin/mysql -u wikiuser -p dbwiki`                |
| **MediaWiki 수동 업데이트** | `/opt/lampp/bin/php /opt/lampp/htdocs/wiki/maintenance/update.php --quick` |

---

## 💾 9️⃣ 백업 / 복구
백업
```bash
sudo tar -czf dbwiki-backup-$(date +%Y%m%d).tar.gz /opt/lampp/htdocs/wiki /opt/lampp/mediawiki-config
sudo mysqldump -u wikiuser -p dbwiki > dbwiki-$(date +%Y%m%d).sql
```

복구
```bash
sudo tar -xzf dbwiki-backup-20251020.tar.gz -C /
```
