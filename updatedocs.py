import requests

S = requests.Session()
URL = "http://localhost/wiki/api.php"

# 1. 로그인 토큰 얻기
r1 = S.get(URL, params={
    "action": "query",
    "meta": "tokens",
    "type": "login",
    "format": "json"
})
login_token = r1.json()["query"]["tokens"]["logintoken"]

# 2. 로그인
S.post(URL, data={
    "action": "clientlogin",
    "username": "192133",
    "password": "Mi59659398@",
    "logintoken": login_token,
    "loginreturnurl": "http://localhost/",
    "format": "json"
})

# 3. CSRF 토큰
r2 = S.get(URL, params={
    "action": "query",
    "meta": "tokens",
    "format": "json"
})
csrf_token = r2.json()["query"]["tokens"]["csrftoken"]

# 4. 문서 업데이트
S.post(URL, data={
    "action": "edit",
    "title": "ndbliap1",  # 문서 제목
    "appendtext": """

===== CSD250512000027 컨트롤엠 에이전트 재기동작업 =====
'''담당자:''' 김소연 프로

'''작업 목적:''' 기존에 개인계정을 통해 에전트를 기동해왔으나, 해당 계정 삭제 시 AIX 서버에서는 에이전트가 비정상적으로 작동하여 Job이 정상적으로 실행되지 않음. 따라서 사전에 컨트롤엠 에이전트 재기동작업 수행

'''코멘트:''' 

----
""",
    "token": csrf_token,
    "format": "json",
    "summary": "ITSM 변경 이력 추가"
})
