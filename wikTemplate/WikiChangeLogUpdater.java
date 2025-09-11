import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class WikiChangeLogUpdater {

    // ✅ 환경 변수
    private static final String API_URL = "http://localhost/wiki/api.php";
    private static final String USERNAME = "192133";
    private static final String PASSWORD = "Mi59659398@";
    private static final String HOSTNAME = "ndbliap2";
    private static final String CSD_NO = "CSD231212000072";
    private static final String CSD_TITLE = "[시스템작업계획서]_신보험, 퇴직연금 운영계JOB 통합배치서버 이행 작업";
    private static final String description = """
1. 작업명 : 신보험, 퇴직연금 운영계JOB 통합배치서버 이행 작업
2. 시스템명 :
   - 통합배치 운영계마스터 서버
   - 신보험 AP2
   - 퇴직연금 컨트롤엠 서버
3. 작업자/전화번호 : 김소연/01023403212
4. 작업일시 : 2023년 12월 15일 19시 00분 ~ 2023년 12월 16일 24시 00분 (5시간)
5. 작업목적
   > 통합배치서버 신규 구성에 따른 신보험, 퇴직연금 운영계JOB 이행작업
6. 작업내용요약
   > 신보험, 퇴직연금 운영계 정기·수시 JOB을 추출하여 통합배치서버에 이행
7. 작업시 미치는 영향
   > 기존 운영계 배치JOB은 16일부터 신규 구성된 통합배치서버에서 실행
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
        
        String year = "20" + CSD_NO.substring(3, 5);
        String startMarker = "<!-- [CHANGE_LOG_" + year + "_START] -->";
        String insertMarker = "<!-- [CHANGE_LOG_" + year + "_INSERT_HERE] -->";
        String sectionStart = "<!-- [CHANGE_LOG_SECTION_START] -->";

        if (!pageText.contains(startMarker)) {
            String changeLogBlock = String.format("""
            <!-- [CHANGE_LOG_%1$s_START] -->
            {| class="mw-collapsible mw-collapsed wikitable" style="width:100%%; margin-bottom:20px;"
            ! style="background:#2E75B6; color:white;" | %1$s년 변경이력
            |-
            |
            <!-- [CHANGE_LOG_%1$s_INSERT_HERE] -->

            <!-- [CHANGE_LOG_%1$s_END] -->
            |}
            """, year);

            pageText = pageText.replace(sectionStart, sectionStart + "\n" + changeLogBlock);
        }

        // 6️⃣ REQ 카드 생성
        String card = String.format("""
<!-- [REQ_CARD_START] -->
<div style="margin:6px 0; padding:8px; border:1px solid #ddd; border-radius:6px; background:#fafafa;">
<b style="color:#005bac;">%s</b>
<span style="font-size:85%%; color:#888;">(%s)</span>

<span style="display:inline-block; font-weight:bold; color:#555; width:80px;">요청설명</span>
<pre style="margin:0; padding:0; white-space:pre;line-height:1.4;border:none;background:none;font-family:Pretendard;font-size:0.95rem;">
%s</pre><br/>
<span style="display:inline-block; font-weight:bold; color:#999; width:80px;">💬 코멘트</span>
추후 필요시 담당자가 작성
</div>
<!-- [REQ_CARD_END] -->
""", CSD_TITLE, CSD_NO, description);


        pageText = pageText.replace(insertMarker, insertMarker + "\n" + card);

        // 7️⃣ 문서 업데이트
        String editData = "action=edit" +
                "&title=" + URLEncoder.encode(HOSTNAME, StandardCharsets.UTF_8) +
                "&text=" + URLEncoder.encode(pageText, StandardCharsets.UTF_8) +
                "&token=" + URLEncoder.encode(csrfToken, StandardCharsets.UTF_8) +
                "&format=json" +
                "&summary=" + URLEncoder.encode("변경 이력 자동 업데이트", StandardCharsets.UTF_8);

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
