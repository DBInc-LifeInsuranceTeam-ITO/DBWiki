import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class MediaWikiEdit {

    // ✅ 변수 (수시로 변경 가능)
    private static final String API_URL = "http://localhost/wiki/api.php";
    private static final String USERNAME = "192133";
    private static final String PASSWORD = "Mi59659398@";
    private static final String PAGE_TITLE = "ndbliap1";
    private static final String TASK_TITLE = "CSD250512000027 컨트롤엠 에이전트 재기동작업";
    private static final String MANAGER = "김소연";
    private static final String PURPOSE = "기존에 개인계정을 통해 에전트를 기동해왔으나, 해당 계정 삭제 시 AIX 서버에서는 에이전트가 비정상적으로 작동하여 Job이 정상적으로 실행되지 않음. 따라서 사전에 컨트롤엠 에이전트 재기동작업 수행";
    private static final String COMMENT = "";

    public static void main(String[] args) throws Exception {

        HttpClient client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();

        ObjectMapper mapper = new ObjectMapper();

        // 1️⃣ 로그인 토큰
        HttpRequest request1 = HttpRequest.newBuilder()
                .uri(URI.create(API_URL + "?action=query&meta=tokens&type=login&format=json&formatversion=2"))
                .GET()
                .build();

        HttpResponse<String> response1 = client.send(request1, HttpResponse.BodyHandlers.ofString());
        String loginTokenJson = stripBom(response1.body());
        JsonNode json1 = mapper.readTree(loginTokenJson);
        String loginToken = json1.get("query").get("tokens").get("logintoken").asText();

        // 2️⃣ 로그인
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

        // 3️⃣ CSRF 토큰
        HttpRequest request3 = HttpRequest.newBuilder()
                .uri(URI.create(API_URL + "?action=query&meta=tokens&format=json&formatversion=2"))
                .GET()
                .build();
        HttpResponse<String> response3 = client.send(request3, HttpResponse.BodyHandlers.ofString());
        String csrfJson = stripBom(response3.body());
        JsonNode json3 = mapper.readTree(csrfJson);
        String csrfToken = json3.get("query").get("tokens").get("csrftoken").asText();

        // 4️⃣ 문서 업데이트
        String appendText = String.format("\n\n===== %s =====\n'''담당자:''' %s\n\n'''작업 목적:''' %s\n\n'''코멘트:''' %s\n\n----\n",
                TASK_TITLE, MANAGER, PURPOSE, COMMENT);

        String editData = "action=edit" +
                "&title=" + URLEncoder.encode(PAGE_TITLE, StandardCharsets.UTF_8) +
                "&appendtext=" + URLEncoder.encode(appendText, StandardCharsets.UTF_8) +
                "&token=" + URLEncoder.encode(csrfToken, StandardCharsets.UTF_8) +
                "&format=json" +
                "&summary=" + URLEncoder.encode("ITSM 변경 이력 추가", StandardCharsets.UTF_8);

        HttpRequest request4 = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(BodyPublishers.ofString(editData))
                .build();

        HttpResponse<String> response4 = client.send(request4, HttpResponse.BodyHandlers.ofString());
        System.out.println("Edit Response: " + stripBom(response4.body()));
    }

    // ✅ BOM 제거 함수
    private static String stripBom(String input) {
        if (input != null && input.startsWith("\uFEFF")) {
            return input.substring(1);
        }
        return input;
    }
}
