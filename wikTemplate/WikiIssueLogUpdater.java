import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class WikiIssueLogUpdater {
        // ✅ 환경 변수
        private static final String API_URL = "http://localhost/wiki/api.php";
        private static final String USERNAME = "192133";
        private static final String PASSWORD = "Mi59659398@";
        private static final String HOSTNAME = "ndbliap2";
        private static final String ISSUE_TYPE = "이슈";
        private static final String ISSUE_PART = "MW";
        private static final String ISSUE_TITLE = "신보험 어플리케이션 재기동 오류";
        private static final String ISSUE_CSD_NO = "-";
        private static final String ISSUE_STATUS = "완료";
        private static final String ISSUE_OWNER = "정재근";
        private static final String ISSUE_SUMMARY = """
[2024.04.22]
-대상 : 신보험 AP 1~4

- 이슈내용
비정기 이행중 신보험 재기동시 NE01_startup 어플리케이션 비정상 기동으로 인해 WAS 재기동 지연
신보험AP 1,2 18:35 ~ 19:35
신보험AP 3,4 19:20 ~ 19:35

- 해결방안
증상 확인 시 비정상 기동된 AP중지 후 LOG, CMD, STAT WAS 순차 재기동 및 노드 전체 재동기화
중지된 WAS기동 후 전제 어플리케이션 기동상태 확인
""";

    public static void main(String[] args) throws Exception {

        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();

        ObjectMapper mapper = new ObjectMapper();

        // 1️⃣ 로그인 토큰 가져오기
        HttpRequest request1 = HttpRequest.newBuilder()
                .uri(URI.create(API_URL + "?action=query&meta=tokens&type=login&format=json&formatversion=2"))
                .GET()
                .build();

        HttpResponse<String> response1 = client.send(request1, HttpResponse.BodyHandlers.ofString());
        String loginTokenJson = stripBom(response1.body());
        JsonNode json1 = mapper.readTree(loginTokenJson);
        String loginToken = json1.get("query").get("tokens").get("logintoken").asText();

        // 2️⃣ clientlogin
        String loginData = "action=clientlogin" +
                "&username=" + URLEncoder.encode(USERNAME, StandardCharsets.UTF_8) +
                "&password=" + URLEncoder.encode(PASSWORD, StandardCharsets.UTF_8) +
                "&logintoken=" + URLEncoder.encode(loginToken, StandardCharsets.UTF_8) +
                "&loginreturnurl=http://localhost/&format=json";

        HttpRequest request2 = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(BodyPublishers.ofString(loginData))
                .build();
        client.send(request2, HttpResponse.BodyHandlers.ofString());

        // 3️⃣ CSRF 토큰 가져오기
        HttpRequest request3 = HttpRequest.newBuilder()
                .uri(URI.create(API_URL + "?action=query&meta=tokens&format=json&formatversion=2"))
                .GET()
                .build();
        HttpResponse<String> response3 = client.send(request3, HttpResponse.BodyHandlers.ofString());
        String csrfJson = stripBom(response3.body());
        JsonNode json3 = mapper.readTree(csrfJson);
        String csrfToken = json3.get("query").get("tokens").get("csrftoken").asText();

        // 4️⃣ 기존 문서 가져오기

        HttpRequest request4 = HttpRequest.newBuilder()
                .uri(URI.create(API_URL + "?action=query&prop=revisions&rvprop=content&format=json&formatversion=2&titles="
                        + URLEncoder.encode(HOSTNAME, StandardCharsets.UTF_8)))
                .GET()
                .build();
        HttpResponse<String> response4 = client.send(request4, HttpResponse.BodyHandlers.ofString());
        JsonNode json4 = mapper.readTree(stripBom(response4.body()));
        String pageText = json4.get("query").get("pages").get(0).get("revisions").get(0).get("content").asText();

        // 5️⃣ 연도별 섹션 체크
        String year;
        if (!ISSUE_CSD_NO.equals("-")) {
        // CSD 번호에서 연도 추출
        year = "20" + ISSUE_CSD_NO.substring(3, 5);
        } else {
        // SUMMARY에서 [YYYY.MM.DD] 패턴 찾기
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\[(\\d{4})\\.\\d{2}\\.\\d{2}\\]");
        java.util.regex.Matcher matcher = pattern.matcher(ISSUE_SUMMARY);
        if (matcher.find()) {
                year = matcher.group(1); // 2024 같은 연도 추출
        } else {
                // fallback: 현재 연도
                year = java.time.LocalDate.now().getYear() + "";
        }
        }
        String startMarker = "<!-- [ISSUE_LOG_" + year + "_START] -->";
        String insertMarker = "<!-- [ISSUE_LOG_" + year + "_INSERT_HERE] -->";
        String sectionStart = "<!-- [ISSUE_LOG_SECTION_START] -->";

        if (!pageText.contains(startMarker)) {
            String issueLogBlock = String.format("""
            <!-- [ISSUE_LOG_%1$s_START] -->
            {| class="mw-collapsible mw-collapsed wikitable" style="width:100%%; margin-bottom:20px;"
            ! style="background:#E67E22; color:white;" | %1$s년 운영이슈
            |-
            |
            <!-- [ISSUE_LOG_%1$s_INSERT_HERE] -->

            <!-- [ISSUE_LOG_%1$s_END] -->
            |}
            """, year);

            pageText = pageText.replace(sectionStart, sectionStart + "\n" + issueLogBlock);
        }

        // 6️⃣ REQ 카드 생성
        String card = String.format("""
<!-- [ISSUE_CARD_START] -->
<div style="border-left:3px solid #005bac; margin:12px 0; padding-left:12px;">
<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; width:100%%; background:none;">
<span style="white-space:nowrap;">
<span style="background:#dc3545; color:white; padding:2px 6px; border-radius:4px; font-size:85%%;"><!-- [ISSUETYPE_START] -->%s<!-- [ISSUETYPE_END] --></span>
<span style="background:#005bac; color:white; padding:2px 6px; border-radius:4px; font-size:85%%;"><!-- [ISSUEPART_START] -->%s<!-- [ISSUEPART_END] --></span>
<b style="color:#005bac; font-size:105%%;"><!-- [ISSUETITLE_START] -->%s<!-- [ISSUETITLE_END] --></b>
<span style="color:#888; font-size:85%%;">(<!-- [ISSUECSDNO_START] -->%s<!-- [ISSUECSDNO_END] -->)</span>
</span>

<span style="background:#28a745; color:white; padding:2px 6px; border-radius:4px; font-size:85%%;"><!-- [ISSUESTATUS_START] -->%s<!-- [ISSUESTATUS_END] --></span>
</div>

Issue Owner: <b><!-- [ISSUEOWNER_START] -->%s<!-- [ISSUEOWNER_END] --></b> <br/>

<b>📌 이슈내용</b><br/>
<!-- [ISSUESUMMARY_START] --><pre style="margin:0; padding:0; white-space:pre;line-height:1.4;border:none;background:none;font-family:Pretendard;font-size:0.95rem;">
%s</pre><br/><!-- [ISSUESUMMARY_END] -->
</div>
<!-- [ISSUE_CARD_END] -->
""",ISSUE_TYPE, ISSUE_PART, ISSUE_TITLE, ISSUE_CSD_NO, ISSUE_STATUS, ISSUE_OWNER, ISSUE_SUMMARY);


        pageText = pageText.replace(insertMarker, insertMarker + "\n" + card);

        // 7️⃣ 문서 업데이트
        String editData = "action=edit" +
                "&title=" + URLEncoder.encode(HOSTNAME, StandardCharsets.UTF_8) +
                "&text=" + URLEncoder.encode(pageText, StandardCharsets.UTF_8) +
                "&token=" + URLEncoder.encode(csrfToken, StandardCharsets.UTF_8) +
                "&format=json" +
                "&summary=" + URLEncoder.encode("운영 이슈  이력 자동 업데이트", StandardCharsets.UTF_8);

        HttpRequest request5 = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(BodyPublishers.ofString(editData))
                .build();

        HttpResponse<String> response5 = client.send(request5, HttpResponse.BodyHandlers.ofString());
        System.out.println("✅ Edit Response: " + stripBom(response5.body()));
    }

    // BOM 제거
    private static String stripBom(String input) {
        if (input != null && input.startsWith("\uFEFF")) {
            return input.substring(1);
        }
        return input;
    }
}
