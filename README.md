# 📌 MediaWiki 문서 자동 업로드 스크립트

**MediaWiki API**를 활용하여 특정 문서에 자동으로 내용을 추가하는 Java 스크립트 예제입니다.  
로그인 → CSRF 토큰 발급 → 문서 편집까지 자동화할 수 있습니다.

---

## 📂 파일 구성

| 파일명 | 설명 |
|--------|------|
| `MediaWikiEdit.java` | MediaWiki API를 이용한 자동 업로드 Java 코드 |
| `MediaWikiEdit.class` | 컴파일된 클래스 파일 |
| `jackson-annotations-2.17.2.jar` | Jackson 라이브러리 (JSON 처리) |
| `jackson-core-2.17.2.jar` | Jackson 라이브러리 (코어 모듈) |
| `jackson-databind-2.17.2.jar` | Jackson 라이브러리 (ObjectMapper 포함) |

---

## ⚙️ 사전 준비

1. **Java 11 이상** 설치
2. MediaWiki 서버(API) 접근 가능 상태  
   - 예: `http://10.90.40.231/wiki/api.php`
3. 필요한 라이브러리(`.jar`) 파일을 `./lib` 폴더 또는 동일 경로에 배치

---

## 🛠️ 컴파일

```bash
javac -encoding UTF-8 -cp ".;jackson-annotations-2.17.2.jar;jackson-core-2.17.2.jar;jackson-databind-2.17.2.jar" MediaWikiEdit.java
