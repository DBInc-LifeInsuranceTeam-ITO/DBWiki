# 📝 MediaWiki 자동 업데이트 도구

이 저장소에는 **MediaWiki API**를 이용하여 내부 위키 페이지에  
변경 이력(Change Log)과 운영 이슈(Issue Log)를 자동으로 기록하는  
두 개의 Java 유틸리티 프로그램이 포함되어 있습니다.  

폐쇄망 환경에서도 동작 가능하며, `java.net.http.HttpClient`와 `Jackson`을 이용합니다.

---

## 📌 공통사항
- **API 엔드포인트**: `http://localhost/wiki/api.php`  
- **인증 방식**: MediaWiki `clientlogin → csrf token → edit`  
- **빌드 환경**: JDK 17 이상  
- **의존성 (classpath 포함 필요)**:
  - `jackson-core-2.17.2.jar`
  - `jackson-annotations-2.17.2.jar`
  - `jackson-databind-2.17.2.jar`

---

## 🔹 WikiChangeLogUpdater

### 기능
- MediaWiki 문서(호스트명 페이지)에 **변경 이력(Change Log)** 자동 추가  
- CSD 번호 기반으로 연도를 추출하고, 연도별 섹션이 없으면 새로 생성  
- 섹션 내 `<!-- [CHANGE_LOG_YYYY_INSERT_HERE] -->` 위치에 카드 삽입  

### 삽입되는 카드 예시

```html
<!-- [REQ_CARD_START] -->
<div style="margin:6px 0; padding:8px; border:1px solid #ddd; border-radius:6px; background:#fafafa;">
<b style="color:#005bac;">[시스템작업계획서]_신보험, 퇴직연금 운영계JOB 통합배치서버 이행 작업</b>
<span style="font-size:85%; color:#888;">(CSD231212000072)</span>

<span style="display:inline-block; font-weight:bold; color:#555; width:80px;">요청설명</span>
<pre style="margin:0; padding:0; white-space:pre; line-height:1.4; border:none; background:none; font-family:Pretendard; font-size:0.95rem;">
1. 작업명 : 신보험, 퇴직연금 운영계JOB 통합배치서버 이행 작업
...
7. 작업시 미치는 영향
   > 기존 운영계 배치JOB은 16일부터 신규 구성된 통합배치서버에서 실행
</pre><br/>
<span style="display:inline-block; font-weight:bold; color:#999; width:80px;">💬 코멘트</span>
추후 필요시 담당자가 작성
</div>
<!-- [REQ_CARD_END] -->
```

## 🔹 WikiIssueLogUpdater
### 기능
- MediaWiki 문서(호스트명 페이지)에 운영 이슈(Issue Log) 자동 추가
- CSD 번호가 있는 경우 → 번호에서 연도 추출
- CSD 번호가 없는 경우 → ISSUE_SUMMARY 본문에서 [YYYY.MM.DD] 패턴을 읽어 연도 추출
- 해당 연도 섹션이 없으면 자동 생성 후 <!-- [ISSUE_LOG_YYYY_INSERT_HERE] --> 위치에 카드 삽입

### 삽입되는 카드 예시

```html
<!-- [ISSUE_CARD_START] -->
<div style="border-left:3px solid #005bac; margin:12px 0; padding-left:12px;">
<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; width:100%; background:none;">
<span style="white-space:nowrap;">
<span style="background:#dc3545; color:white; padding:2px 6px; border-radius:4px; font-size:85%;">이슈</span>
<span style="background:#005bac; color:white; padding:2px 6px; border-radius:4px; font-size:85%;">MW</span>
<b style="color:#005bac; font-size:105%;">신보험 어플리케이션 재기동 오류</b>
<span style="color:#888; font-size:85%;">(-)</span>
</span>

<span style="background:#28a745; color:white; padding:2px 6px; border-radius:4px; font-size:85%;">완료</span>
</div>

Issue Owner: <b>정재근</b> <br/>

<b>📌 이슈내용</b><br/>
<pre style="margin:0; padding:0; white-space:pre; line-height:1.4; border:none; background:none; font-family:Pretendard; font-size:0.95rem;">
[2024.04.22]
- 대상 : 신보험 AP 1~4
...
중지된 WAS기동 후 전체 어플리케이션 기동상태 확인
</pre><br/>
</div>
<!-- [ISSUE_CARD_END] -->
 ```

## ⚙️ Spring Boot 변환 시 유의점
### 1. 프로젝트 구조
- 단일 main() 대신 Spring Boot Application 엔트리포인트 사용
- 기능 분리:
  - MediaWikiAuthService → 로그인/토큰 처리
  - ChangeLogService → 변경이력 추가
  - IssueLogService → 운영이슈 추가

### 2. HttpClient
- Java 기본 HttpClient 그대로 사용 가능
- Spring에서는 RestTemplate 또는 WebClient 권장
- 쿠키 관리 필요 시 WebClient에 ExchangeFilterFunction 설정

### 3. 설정 관리
- 계정 정보 및 API URL은 application.yml로 이동

```yaml
mediawiki:
  api-url: http://localhost/wiki/api.php
  username: ${USER}
  password: ${PASSWORD}
```

### 4. Jackson
- Spring Boot Starter Web에 기본 포함
- ObjectMapper를 직접 생성하지 않고 @Autowired로 주입받아 사용

### 5. 예외 처리
- 단일 실행 프로그램에서는 throw로 끝나지만
- Spring Boot에서는 @ControllerAdvice 등으로 처리해 REST 응답 변환

### 6. 실행 방식
- 배치성 → CommandLineRunner
- API 제공 → @RestController 엔드포인트 (예: /wiki/updateIssue)
- 정기 실행 → @Scheduled